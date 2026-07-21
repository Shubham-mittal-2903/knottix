import type { SessionUser } from '@/types';
import type { IntelligenceContext } from '@/lib/intelligence';
import type { KnottixSystem } from '@/lib/system/bootstrap';
import { db } from '@/lib/db/prisma';
import { listRepositories } from '@/lib/github/service';
// Direct path (not the `@/lib/goal-engine` barrel) — that barrel also exports `engine.ts`'s
// `collectContext`-consuming functions, and importing it here would create a module cycle
// (context-engine → goal-engine barrel → goal-engine/engine.ts → context-engine). `skill-index.ts`
// itself has no dependency back on `goal-engine/engine.ts`, so this path is cycle-free.
import { getSkillIndex } from '@/lib/goal-engine/skill-index';
import { getSkillStats } from '@/lib/db/queries/skill-stats';
import { listTaskSessionsForOrganization } from '@/lib/db/queries/task-session';
import { clipboardRead } from '@/lib/desktop-runtime/clipboard';
import { getOpenPageHandles, getOrCreatePage } from '@/lib/desktop-runtime/browser/session';
import { listServerInfos, readMCPResource } from '@/lib/mcp/manager';
import type { MCPResourceDescriptor } from '@/lib/mcp/types';
import { logger } from '@/lib/logger';
import { scoreFreshness, scoreRelevance, scoreTrust, computeTotalScore } from './ranking';
import type { ContextItem, ContextSourceType } from './types';

function makeItem(
  source: ContextSourceType,
  id: string,
  title: string,
  summary: string,
  sourceRef: string,
  itemTimestamp: number | null,
  query: string,
  now: number,
): ContextItem {
  const relevanceScore = scoreRelevance(query, title, summary);
  const freshnessScore = scoreFreshness(itemTimestamp, now);
  const trustScore = scoreTrust(source);
  return {
    id,
    source,
    title,
    summary: summary.slice(0, 400),
    sourceRef,
    relevanceScore,
    freshnessScore,
    trustScore,
    totalScore: computeTotalScore(relevanceScore, freshnessScore, trustScore),
    reasonSelected: `Matched "${query}" in ${source}`,
    collectedAt: now,
    itemTimestamp,
  };
}

/** Every collector below reads from a real, already-existing data source — the Memory Engine,
 *  Prisma models, the GitHub service, the Skill Registry's real stats, real `TaskSession` rows,
 *  or the actual Desktop Runtime browser/clipboard state. None of them invent data; a source with
 *  nothing relevant returns an empty array, honestly. */
export interface Collector {
  source: ContextSourceType;
  run(query: string, deps: { system: KnottixSystem; context: IntelligenceContext; user: SessionUser; now: number }): Promise<ContextItem[]>;
}

const memoryCollector: Collector = {
  source: 'memory',
  async run(query, { system, context, user, now }) {
    const scope = user.workspaceId ? { namespace: 'workspace' as const, scopeId: user.workspaceId } : { namespace: 'organization' as const, scopeId: user.organizationId };
    const page = await system.memoryEngine.query(context.memory, { namespace: scope.namespace, scopeId: scope.scopeId, search: query || undefined }, 1, 10);
    return page.entries.map((e) => makeItem('memory', e.id, e.title, e.summary ?? e.content, `memory:${e.id}`, e.updatedAt, query, now));
  },
};

const knowledgeCollector: Collector = {
  source: 'knowledge',
  async run(query, { system, context, user, now }) {
    const scopeId = user.workspaceId ?? user.organizationId;
    const page = await system.memoryEngine.query(context.memory, { namespace: 'knowledge', scopeId, search: query || undefined }, 1, 10);
    return page.entries.map((e) => makeItem('knowledge', e.id, e.title, e.summary ?? e.content, `memory:${e.id}`, e.updatedAt, query, now));
  },
};

const projectCollector: Collector = {
  source: 'project',
  async run(query, { user, now }) {
    const rows = await db.project.findMany({
      where: { workspace: { organizationId: user.organizationId }, deletedAt: null },
      select: { id: true, title: true, description: true, status: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 25,
    });
    return rows.map((r) => makeItem('project', r.id, r.title, `${r.status}${r.description ? ` — ${r.description}` : ''}`, `project:${r.id}`, r.updatedAt.getTime(), query, now));
  },
};

const taskCollector: Collector = {
  source: 'task',
  async run(query, { user, now }) {
    const rows = await db.task.findMany({
      where: { project: { workspace: { organizationId: user.organizationId } }, deletedAt: null, status: { notIn: ['DONE', 'CANCELLED'] } },
      select: { id: true, title: true, status: true, priority: true, updatedAt: true, project: { select: { title: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 25,
    });
    return rows.map((r) => makeItem('task', r.id, r.title, `${r.status} · ${r.priority}${r.project ? ` · ${r.project.title}` : ''}`, `task:${r.id}`, r.updatedAt.getTime(), query, now));
  },
};

const meetingCollector: Collector = {
  source: 'meeting',
  async run(query, { user, now }) {
    const rows = await db.meeting.findMany({
      where: { workspace: { organizationId: user.organizationId }, deletedAt: null },
      select: { id: true, title: true, summary: true, startTime: true, updatedAt: true },
      orderBy: { startTime: 'desc' },
      take: 20,
    });
    return rows.map((r) => makeItem('meeting', r.id, r.title, r.summary ?? `Scheduled ${r.startTime.toISOString().slice(0, 10)}`, `meeting:${r.id}`, r.updatedAt.getTime(), query, now));
  },
};

const documentCollector: Collector = {
  source: 'document',
  async run(query, { user, now }) {
    if (!user.workspaceId) return [];
    const rows = await db.file.findMany({
      where: { project: { workspaceId: user.workspaceId }, deletedAt: null },
      select: { id: true, filename: true, originalName: true, mimeType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return rows.map((r) => makeItem('document', r.id, r.originalName ?? r.filename, r.mimeType ?? 'file', `file:${r.id}`, r.createdAt.getTime(), query, now));
  },
};

const githubCollector: Collector = {
  source: 'github',
  async run(query, { user, now }) {
    const result = await listRepositories(user.organizationId, 20);
    if (!result.connected || !result.data) return [];
    return result.data.map((r) =>
      makeItem('github', String(r.id), r.fullName, r.description ?? `${r.language ?? 'repository'} · default branch ${r.defaultBranch}`, r.htmlUrl, new Date(r.updatedAt).getTime(), query, now),
    );
  },
};

const taskSessionCollector: Collector = {
  source: 'task-session',
  async run(query, { user, now }) {
    const sessions = await listTaskSessionsForOrganization(user.organizationId, undefined, 20);
    return sessions.map((s) =>
      makeItem(
        'task-session',
        s.id,
        s.objective,
        `${s.status} · ${s.workflowExecutionIds.length} round(s) · ${s.artifacts.length} artifact(s)${s.lastError ? ` · ${s.lastError}` : ''}`,
        `task-session:${s.id}`,
        s.updatedAt,
        query,
        now,
      ),
    );
  },
};

const workflowHistoryCollector: Collector = {
  source: 'workflow-history',
  async run(query, { system, user, now }) {
    const executions = system.workflowHistoryStore.listByOrganization(user.organizationId, 20);
    return executions.map((e) =>
      makeItem('workflow-history', e.executionId, e.workflowKey, `${e.status} · ${e.stepResults.length} step(s)${e.error ? ` · ${e.error}` : ''}`, `workflow-execution:${e.executionId}`, e.startedAt, query, now),
    );
  },
};

const skillHistoryCollector: Collector = {
  source: 'skill-history',
  async run(query, { user, now }) {
    // Only fetches real stats for skills whose own name/description/keywords already matched the
    // query — bounds this to a handful of DB queries instead of one per registered skill.
    const matches = getSkillIndex().discover(query);
    const top = matches.slice(0, 5);
    const items: ContextItem[] = [];
    for (const { skill } of top) {
      const stats = await getSkillStats(skill.key, user.organizationId);
      if (stats.usageCount === 0) continue;
      items.push(
        makeItem(
          'skill-history',
          skill.key,
          skill.name,
          `Used ${stats.usageCount}× · ${Math.round((stats.successRate ?? 0) * 100)}% success${stats.lastExecutedAt ? ` · last run ${new Date(stats.lastExecutedAt).toISOString().slice(0, 10)}` : ''}`,
          `skill:${skill.key}`,
          stats.lastExecutedAt,
          query,
          now,
        ),
      );
    }
    return items;
  },
};

const artifactCollector: Collector = {
  source: 'artifact',
  async run(query, { user, now }) {
    const sessions = await listTaskSessionsForOrganization(user.organizationId, undefined, 30);
    const items: ContextItem[] = [];
    for (const s of sessions) {
      for (const a of s.artifacts) {
        items.push(makeItem('artifact', `${s.id}:${a.value}`, `${a.type}: ${a.label}`, `From "${s.objective}" — ${a.value}`, a.value, a.producedAt, query, now));
      }
    }
    return items;
  },
};

/** Real, but only ever reports what's ACTUALLY open in the Knottix-controlled browser right now —
 *  never fabricates a tab that doesn't exist. Returns nothing if no browser session is open, which
 *  is the honest common case for most goals. */
const browserCollector: Collector = {
  source: 'browser',
  async run(query, { now }) {
    const handles = getOpenPageHandles();
    if (handles.length === 0) return [];
    const items: ContextItem[] = [];
    for (const handle of handles.slice(0, 5)) {
      try {
        const page = await getOrCreatePage(handle);
        items.push(makeItem('browser', `tab:${handle}`, page.url(), `Open browser tab "${handle}"`, page.url(), now, query, now));
      } catch (error) {
        logger.warn('context-engine.collectors', 'Failed to read browser tab state', { error: error instanceof Error ? error.message : String(error) });
      }
    }
    return items;
  },
};

/** Knottix has no tool that enumerates running applications or window state — the closest real,
 *  honest "desktop state" signal available is the system clipboard. Deliberately not fabricated
 *  beyond that; see IDEA (Session 22) for the acknowledged gap against the mission's broader
 *  "Desktop State" example. */
const desktopCollector: Collector = {
  source: 'desktop',
  async run(query, { now }) {
    try {
      const text = await clipboardRead();
      if (!text.trim()) return [];
      return [makeItem('desktop', 'clipboard', 'Clipboard contents', text, 'clipboard', now, query, now)];
    } catch {
      return [];
    }
  },
};

function extractResourceText(result: unknown): string {
  const contents = (result as { contents?: { text?: string; uri?: string; mimeType?: string }[] } | null)?.contents;
  if (!Array.isArray(contents)) return '';
  return contents
    .map((c) => c.text)
    .filter((t): t is string => typeof t === 'string')
    .join('\n');
}

/** "The Context Engine should be able to retrieve context from MCP Resources when available. Every
 *  retrieved resource must remain traceable to its originating server." Listing is free (resource
 *  descriptors are already cached from the connect-time handshake in `manager.ts`'s live connection
 *  map — no network call), so every connected server's resources are scored against the query first;
 *  only the handful that actually rank as relevant are fetched for real (mirrors
 *  `skillHistoryCollector`'s "only query what already matched" bound) — reading every resource on
 *  every goal would be unbounded, real network cost for content that's rejected 95% of the time.
 *  `sourceRef` always includes the originating server's name and the resource's own URI. */
const mcpResourceCollector: Collector = {
  source: 'mcp-resource',
  async run(query, { user, now }) {
    const serverInfos = await listServerInfos(user.organizationId);
    const candidates: { serverId: string; serverName: string; resource: MCPResourceDescriptor }[] = [];
    for (const info of serverInfos) {
      if (info.server.status !== 'CONNECTED') continue;
      for (const resource of info.resources) {
        candidates.push({ serverId: info.server.id, serverName: info.server.name, resource });
      }
    }

    const scored = candidates
      .map((c) => ({ ...c, relevance: scoreRelevance(query, c.resource.name, c.resource.description ?? '') }))
      .filter((c) => c.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);

    const items: ContextItem[] = [];
    for (const c of scored) {
      try {
        const result = await readMCPResource(c.serverId, c.resource.uri, user.id);
        const text = extractResourceText(result) || c.resource.description || c.resource.name;
        items.push(
          makeItem(
            'mcp-resource',
            `${c.serverId}:${c.resource.uri}`,
            `${c.resource.name} (${c.serverName})`,
            text,
            `mcp:${c.serverName}:${c.resource.uri}`,
            null,
            query,
            now,
          ),
        );
      } catch (error) {
        logger.warn('context-engine.collectors', 'Failed to read MCP resource', {
          server: c.serverName,
          uri: c.resource.uri,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return items;
  },
};

export const ALL_COLLECTORS: Collector[] = [
  memoryCollector,
  knowledgeCollector,
  projectCollector,
  taskCollector,
  meetingCollector,
  documentCollector,
  githubCollector,
  taskSessionCollector,
  workflowHistoryCollector,
  skillHistoryCollector,
  artifactCollector,
  browserCollector,
  desktopCollector,
  mcpResourceCollector,
];
