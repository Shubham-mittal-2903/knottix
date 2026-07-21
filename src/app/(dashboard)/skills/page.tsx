import type { Metadata } from 'next';
import { Code2, Globe, Monitor, Briefcase, Sparkles, Plug } from 'lucide-react';
import { requirePermission } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/demo';
import { getSystem, ensureOrganizationReady } from '@/lib/system/bootstrap';
import { getSkillIndex } from '@/lib/goal-engine';
import { getSkillStats } from '@/lib/db/queries/skill-stats';
import type { SkillDefinition, SkillStats } from '@/lib/skills';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/modules/shared/PageHeader';
import { RevealGroup, RevealItem } from '@/components/modules/shared/Reveal';

export const metadata: Metadata = { title: 'Skills' };

const CATEGORY_META: Record<SkillDefinition['category'], { label: string; icon: typeof Code2 }> = {
  development: { label: 'Development', icon: Code2 },
  browser: { label: 'Browser', icon: Globe },
  desktop: { label: 'Desktop', icon: Monitor },
  business: { label: 'Business', icon: Briefcase },
  intelligence: { label: 'Intelligence', icon: Sparkles },
  mcp: { label: 'MCP', icon: Plug },
};

const EMPTY_STATS: SkillStats = {
  usageCount: 0,
  successCount: 0,
  failureCount: 0,
  successRate: null,
  avgDurationMs: null,
  avgRetries: null,
  lastExecutedAt: null,
  commonFailures: [],
};

function formatLastRun(ts: number | null): string {
  if (!ts) return 'Never run';
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function SkillsPage() {
  const user = await requirePermission('workflows:read');
  const demo = isDemoMode();

  let skills: SkillDefinition[];
  const statsBySkill = new Map<string, SkillStats>();

  if (demo) {
    skills = getSkillIndex().find({ isActive: true });
  } else {
    const system = await getSystem();
    await ensureOrganizationReady(system, user.organizationId);
    skills = system.skillEngine.find({ isActive: true, organizationId: user.organizationId });
    await Promise.all(
      skills.map(async (skill) => {
        statsBySkill.set(skill.key, await getSkillStats(skill.key, user.organizationId));
      }),
    );
  }

  const byCategory = skills.reduce<Record<string, SkillDefinition[]>>((acc, skill) => {
    (acc[skill.category] ??= []).push(skill);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <PageHeader
        title="Skills"
        description="Every capability the Goal Execution Engine can discover and compose into a plan — real tools, real permissions, real self-evaluation."
      />

      {demo && (
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          Demo Mode — usage/success stats require a real database and aren't shown here.
        </p>
      )}

      {Object.entries(byCategory).map(([category, categorySkills]) => {
        const meta = CATEGORY_META[category as SkillDefinition['category']];
        const Icon = meta.icon;
        return (
          <div key={category} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              <Icon className="size-4 text-primary" />
              {meta.label}
            </h2>
            <RevealGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {categorySkills.map((skill) => {
                const stats = statsBySkill.get(skill.key) ?? EMPTY_STATS;
                return (
                  <RevealItem key={skill.key}>
                    <Card className="card-hover h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle>{skill.name}</CardTitle>
                          {!demo && stats.usageCount > 0 && (
                            <Badge variant={stats.successRate !== null && stats.successRate >= 0.8 ? 'success' : stats.successRate !== null && stats.successRate < 0.5 ? 'error' : 'warning'}>
                              {Math.round((stats.successRate ?? 0) * 100)}% success
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <p className="text-sm text-muted-foreground">{skill.description}</p>

                        <div className="flex flex-wrap gap-1.5">
                          {skill.requiredTools.length === 0 ? (
                            <span className="text-xs text-muted-foreground/70">No tool dependencies — reasons via an AI Employee.</span>
                          ) : (
                            skill.requiredTools.map((tool) => (
                              <Badge key={tool} variant="outline">
                                {tool}
                              </Badge>
                            ))
                          )}
                        </div>

                        {!demo && (
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between"><dt>Used</dt><dd className="font-medium text-foreground">{stats.usageCount}×</dd></div>
                            <div className="flex justify-between"><dt>Last run</dt><dd className="font-medium text-foreground">{formatLastRun(stats.lastExecutedAt)}</dd></div>
                            <div className="flex justify-between"><dt>Avg duration</dt><dd className="font-medium text-foreground">{stats.avgDurationMs ? `${Math.round(stats.avgDurationMs / 1000)}s` : '—'}</dd></div>
                            <div className="flex justify-between"><dt>Avg retries</dt><dd className="font-medium text-foreground">{stats.avgRetries ?? '—'}</dd></div>
                          </dl>
                        )}

                        {!demo && stats.commonFailures.length > 0 && (
                          <div className="rounded-md border border-knottix-error/20 bg-knottix-error/5 px-2.5 py-2 text-xs text-knottix-error">
                            Most common failure: {stats.commonFailures[0].error} ({stats.commonFailures[0].count}×)
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </div>
        );
      })}
    </div>
  );
}
