import type { NavItem, CommandAction } from '@/config/navigation';
import { AI_EMPLOYEES } from '@/config/ai-employees';
import type { CommandIntent, CommandPlan, CommandStep } from './types';

/** Matches `FOUNDER_ASSISTANT_KEY` in `src/lib/agents/founder-assistant/register.ts` — duplicated
 *  as a literal (not imported) because that module pulls in server-only Prisma code and this
 *  router must stay client-safe. See DEC-035. */
const DEFAULT_EMPLOYEE_KEY = 'founder-executive-assistant';

/**
 * Client-safe intent router — no server-only imports, so both the Command Center UI (for
 * instant optimistic feedback while typing) and the API route (as the deterministic fallback
 * beneath AI classification, see `classify.ts`) share this single implementation. "No duplicate
 * routing logic" per the mission means this file, not two.
 */

interface ToolKeywordEntry {
  toolName: string;
  label: string;
  keywords: string[];
  /** Returns the tool's input params, or null if a required param couldn't be found — a null result means this tool is NOT considered a match, so the router falls through to other intents instead of calling a tool with missing arguments. */
  extractParams?: (query: string) => Record<string, unknown> | null;
}

function extractQuoted(query: string): string | null {
  const m = query.match(/["“]([^"”]+)["”]/) ?? query.match(/'([^']+)'/);
  return m ? m[1].trim() : null;
}

function extractUrl(query: string): string | null {
  const m = query.match(/https?:\/\/\S+/i);
  return m ? m[0] : null;
}

function extractAfterKeyword(query: string, keywords: string[]): string | null {
  const pattern = new RegExp(`\\b(?:${keywords.join('|')})\\s+(.+)$`, 'i');
  const m = query.match(pattern);
  if (!m) return null;
  return m[1].trim().replace(/^["']|["']$/g, '') || null;
}

function extractPath(query: string): string | null {
  const quoted = extractQuoted(query);
  if (quoted) return quoted;
  const m = query.match(/[a-zA-Z]:\\[^\s"]+/) ?? query.match(/(?:\.{1,2}[\\/])[^\s"]+/);
  return m ? m[0] : null;
}

const TOOL_KEYWORDS: ToolKeywordEntry[] = [
  { toolName: 'list_projects', label: 'Projects', keywords: ['project', 'projects'] },
  { toolName: 'list_tasks', label: 'Tasks', keywords: ['task', 'tasks', 'todo', 'overdue'] },
  { toolName: 'list_meetings', label: 'Meetings', keywords: ['meeting', 'meetings', 'schedule', 'calendar'] },
  { toolName: 'github_list_repositories', label: 'GitHub Repositories', keywords: ['github', 'repo', 'repos', 'repository', 'repositories'] },
  { toolName: 'read_organization_memory', label: 'Knowledge', keywords: ['knowledge', 'notes', 'decisions'] },

  // Context Engine — "What do you know about ACCD?", "Why did you choose this context?", "What
  // information are you using?" (DEC-0XX). Checked before the generic Information-intent
  // fallback (which would otherwise swallow "what..." questions as a conversational AI Employee
  // query) so these are always answered from real collected context, not a guess.
  {
    toolName: 'context:explain',
    label: 'Explain Context',
    keywords: ['what do you know about', 'why did you choose this context', 'what information are you using', 'what context are you using', 'what do you know'],
    extractParams: (q) => {
      const subject = extractAfterKeyword(q, ['what do you know about', 'what do you know']);
      return { query: subject ?? q };
    },
  },

  // Task Sessions — "Continue my website", "Resume ACCD", "Show active work", "Pause current
  // session" (DEC-0XX). Resolution to a real session ID happens server-side in
  // `command-center/engine.ts` (needs a database lookup); the router only ever extracts the raw
  // keyword text.
  {
    toolName: 'task_session:list',
    label: 'Active Work',
    keywords: ['show active work', 'active sessions', 'my active work', 'show my sessions', 'active work'],
  },
  {
    toolName: 'task_session:continue',
    label: 'Continue Session',
    keywords: ['continue my', 'continue the', 'resume my', 'resume the', 'resume '],
    extractParams: (q) => {
      const name = extractAfterKeyword(q, ['continue my', 'continue the', 'resume my', 'resume the', 'continue', 'resume']);
      return { keyword: name ?? '' };
    },
  },
  {
    toolName: 'task_session:cancel',
    label: 'Pause Session',
    keywords: ['pause current session', 'pause my session', 'pause session', 'pause the session'],
    extractParams: (q) => {
      const name = extractAfterKeyword(q, ['pause current session', 'pause my session', 'pause the session', 'pause session']);
      return { keyword: name && name !== 'current' ? name : '' };
    },
  },

  // MCP — "Show connected MCP servers", "Refresh MCP servers", "What tools are available?", "Use
  // the Figma MCP", "Why did you choose this MCP tool?" (DEC-0XX). Checked before the generic
  // Information-intent fallback so these are always answered from the real MCP Client Manager,
  // never a guess. Resolution to a real server/tool happens server-side in `engine.ts`.
  // `mcp:refresh` is checked before `mcp:list` and neither uses the bare "mcp servers" substring
  // as a keyword — "refresh mcp servers" would otherwise also satisfy a looser "mcp servers"
  // keyword on `mcp:list` and, being earlier in this array, silently win over the intended refresh.
  {
    toolName: 'mcp:refresh',
    label: 'Refresh MCP Servers',
    keywords: ['refresh mcp servers', 'reconnect mcp servers', 'refresh mcp'],
  },
  {
    toolName: 'mcp:list',
    label: 'Connected MCP Servers',
    keywords: ['show connected mcp servers', 'connected mcp servers', 'show mcp servers', 'list mcp servers'],
  },
  {
    toolName: 'mcp:tools',
    label: 'Available MCP Tools',
    keywords: ['what tools are available', 'available mcp tools', 'mcp tools', 'list mcp tools'],
  },
  {
    toolName: 'mcp:explain',
    label: 'Explain MCP Tool Choice',
    keywords: ['why did you choose this mcp tool', 'why this mcp tool', 'why did you use this mcp tool'],
  },
  {
    // Substring-only matching can't express "use ... AND mcp" directly, so this keyword is
    // deliberately specific enough not to collide with unrelated "use the X" commands, and
    // `extractParams` still double-checks `mcp` is present before treating it as a match.
    toolName: 'mcp:use',
    label: 'Use MCP Server',
    keywords: ['use the', ' mcp'],
    extractParams: (q) => {
      if (!q.includes('mcp')) return null;
      const name = extractAfterKeyword(q, ['use the', 'use']);
      if (!name) return null;
      return { serverName: name.replace(/\bmcp\b/gi, '').trim() || name };
    },
  },

  // Desktop Runtime — apps
  { toolName: 'open_chrome', label: 'Open Chrome', keywords: ['open chrome', 'launch chrome', 'start chrome'] },
  { toolName: 'open_edge', label: 'Open Edge', keywords: ['open edge', 'launch edge', 'microsoft edge'] },
  { toolName: 'open_vscode', label: 'Open VS Code', keywords: ['vs code', 'vscode', 'visual studio code'] },
  { toolName: 'open_cursor', label: 'Open Cursor', keywords: ['open cursor', 'launch cursor', 'cursor editor'] },
  { toolName: 'open_file_explorer', label: 'Open File Explorer', keywords: ['file explorer', 'open explorer'] },
  { toolName: 'open_terminal', label: 'Open Terminal', keywords: ['open terminal', 'launch terminal', 'command prompt'] },
  {
    toolName: 'close_app',
    label: 'Close App',
    keywords: ['close ', 'quit ', 'exit '],
    extractParams: (q) => {
      const name = extractAfterKeyword(q, ['close', 'quit', 'exit']);
      return name ? { processName: name } : null;
    },
  },
  {
    toolName: 'focus_window',
    label: 'Focus Window',
    keywords: ['focus on', 'switch to', 'bring up'],
    extractParams: (q) => {
      const name = extractAfterKeyword(q, ['focus on', 'focus', 'switch to', 'bring up']);
      return name ? { processName: name } : null;
    },
  },

  // Desktop Runtime — files, folders, urls, search
  {
    toolName: 'open_url',
    label: 'Open URL',
    keywords: ['open url', 'open website', 'go to website', 'http'],
    extractParams: (q) => {
      const url = extractUrl(q);
      return url ? { url } : null;
    },
  },
  {
    toolName: 'open_folder',
    label: 'Open Folder',
    keywords: ['open folder'],
    extractParams: (q) => {
      const path = extractPath(q) ?? extractAfterKeyword(q, ['open folder']);
      return path ? { path } : null;
    },
  },
  {
    toolName: 'open_file',
    label: 'Open File',
    keywords: ['open file'],
    extractParams: (q) => {
      const path = extractPath(q) ?? extractAfterKeyword(q, ['open file']);
      return path ? { path } : null;
    },
  },
  {
    toolName: 'google_search',
    label: 'Google Search',
    keywords: ['google search', 'search google for', 'google for', 'google '],
    extractParams: (q) => {
      const query = extractAfterKeyword(q, ['search google for', 'google search for', 'google for', 'google search', 'google']);
      return query ? { query } : null;
    },
  },
  {
    toolName: 'youtube_search',
    label: 'YouTube Search',
    keywords: ['youtube search', 'search youtube for', 'youtube for', 'youtube '],
    extractParams: (q) => {
      const query = extractAfterKeyword(q, ['search youtube for', 'youtube search for', 'youtube for', 'youtube search', 'youtube']);
      return query ? { query } : null;
    },
  },

  // Desktop Runtime — clipboard, screenshot
  { toolName: 'take_screenshot', label: 'Take Screenshot', keywords: ['screenshot', 'capture screen', 'capture my screen'] },
  { toolName: 'clipboard_read', label: 'Read Clipboard', keywords: ['read clipboard', "what's on my clipboard", 'clipboard contents'] },
  {
    toolName: 'clipboard_write',
    label: 'Copy to Clipboard',
    keywords: ['copy to clipboard', 'copy this'],
    extractParams: (q) => {
      const text = extractQuoted(q) ?? extractAfterKeyword(q, ['copy to clipboard', 'copy']);
      return text ? { text } : null;
    },
  },

  // Browser automation
  { toolName: 'browser_list_tabs', label: 'List Tabs', keywords: ['list tabs', 'show my tabs', 'open tabs'] },
  { toolName: 'instagram_open', label: 'Open Instagram', keywords: ['open instagram', 'instagram'] },
  { toolName: 'instagram_open_reels', label: 'Open Reels', keywords: ['reels', 'instagram reels'] },
];

const EMPLOYEE_KEYWORDS: Record<string, string[]> = {
  'developer-ai': ['developer', 'dev', 'code', 'bug', 'architecture', 'deploy', 'repo', 'github', 'engineering'],
  'designer-ai': ['design', 'ux', 'ui', 'figma', 'component', 'visual', 'brand'],
  'marketing-ai': ['marketing', 'campaign', 'growth', 'competitor', 'ad', 'ads'],
  'project-manager-ai': ['sprint', 'risk', 'planning', 'roadmap', 'progress', 'project manager'],
  'content-ai': ['blog', 'caption', 'content', 'copy', 'seo', 'write', 'draft'],
  'sales-ai': ['sales', 'proposal', 'lead', 'client briefing', 'pitch'],
};

const WRITE_VERBS = ['create', 'add', 'assign', 'delete', 'remove', 'update', 'invite', 'restart', 'shutdown'];

/** Small, deliberately-duplicated overlap with the Skill Registry catalog's own keyword lists
 *  (`src/lib/skills/catalog/`) — `goal-engine` already imports FROM this router
 *  (`resolveEmployeeForQuery`), so this file can't import back from `goal-engine`/`skills` without
 *  a cycle. This only decides whether a command reads as goal-shaped; the actual skill discovery
 *  and plan composition happens once, for real, in `goal-engine/planner.ts` after navigation. */
const GOAL_VERBS = ['build', 'deploy', 'create', 'generate', 'draft', 'write'];
const GOAL_NOUNS = ['website', 'portfolio', 'landing page', 'dashboard', 'saas', 'agency site', 'law firm site', 'logo', 'invoice', 'presentation', 'blog', 'my project'];

/** "Build a website for ACCD" / "Deploy my project at ..." / "Write a blog about ..." — routed to
 *  the Goal Execution Engine's own page (`/goals?goal=...`) via the EXISTING navigation intent,
 *  not a new Command Center execution path. `/goals` reads the query param and starts the goal
 *  through the real `POST /api/goals` route — see DEC-039. */
function detectGoalCommand(query: string): NavigationMatch | null {
  const q = query.toLowerCase().trim();
  const hasVerb = GOAL_VERBS.some((v) => q.startsWith(`${v} `));
  const hasNoun = GOAL_NOUNS.some((n) => q.includes(n));
  if (!hasVerb || !hasNoun) return null;
  return { href: `/goals?goal=${encodeURIComponent(query.trim())}`, label: 'Goal Execution' };
}

/**
 * Mirrors each tool's own `metadata.requiresConfirmation` (`close_app`, `git_commit`,
 * `git_push`, `whatsapp_send_message`) as a client-safe constant, so the confirmation gate holds
 * identically in Demo Mode and real mode. This is the PRIMARY enforcement — `engine.ts` also
 * checks the real Tool Registry's metadata server-side in real mode as a second, authoritative
 * layer, but that check is skipped in Demo Mode (which never touches the Tool Registry's
 * DB-backed hydration), so it alone isn't enough. See DEC-038.
 *
 * Exported (not module-private) so the Goal Execution Engine (`src/lib/goal-engine/`) can reuse
 * the exact same set for its own Demo Mode pause simulation and up-front `GoalPlan.requiresConfirmation`
 * flag, instead of hand-maintaining a second copy — see IDEA-040, which already tracks this class
 * of drift risk.
 */
export const CONFIRMATION_REQUIRED_TOOLS = new Set(['close_app', 'git_commit', 'git_push', 'whatsapp_send_message', 'task_session:cancel']);

function stepsRequireConfirmation(steps: CommandStep[]): boolean {
  return steps.some((step) => CONFIRMATION_REQUIRED_TOOLS.has(step.toolName));
}

const INFORMATION_STARTS = ['what', 'who', 'when', 'where', 'why', 'how', 'summarize', 'explain', 'is ', 'are ', 'does '];

export interface ResolvedEmployee {
  key: string;
  name: string;
}

/** One routing function, reused for both Tool-intent's suggested owner and Conversation/Information intent's target — no duplicate routing logic. */
export function resolveEmployeeForQuery(query: string): ResolvedEmployee {
  const q = query.toLowerCase();
  let bestKey = DEFAULT_EMPLOYEE_KEY;
  let bestScore = 0;

  for (const [key, keywords] of Object.entries(EMPLOYEE_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => (q.includes(kw) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  const profile = AI_EMPLOYEES.find((e) => e.key === bestKey);
  return { key: bestKey, name: profile?.name ?? 'Founder Executive Assistant' };
}

/** "Send <message> to <Name>" — the WhatsApp flow gets dedicated multi-step detection rather than
 *  generic keyword matching, since it's a fixed 4-tool sequence (open → find contact → draft →
 *  send) where only the last step is a mutation. The send step's own `metadata.requiresConfirmation`
 *  is what actually gates it (checked server-side in `engine.ts`) — this function just assembles
 *  the sequence. */
function detectWhatsAppSend(query: string): CommandStep[] | null {
  const match = query.match(/\bsend\s+(?:the\s+message\s+)?["“]?([^"”]+?)["”]?\s+to\s+([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*)/i);
  if (!match) return null;
  const [, message, contact] = match;
  const text = message.trim();
  const name = contact.trim();
  if (!text || !name) return null;

  return [
    { toolName: 'whatsapp_open', label: 'Open WhatsApp Web' },
    { toolName: 'whatsapp_find_contact', label: `Find "${name}"`, params: { name } },
    { toolName: 'whatsapp_type_message', label: 'Draft message', params: { text } },
    { toolName: 'whatsapp_send_message', label: `Send to ${name}` },
  ];
}

function resolveTool(clause: string): CommandStep | null {
  for (const entry of TOOL_KEYWORDS) {
    if (!entry.keywords.some((kw) => clause.includes(kw))) continue;
    if (!entry.extractParams) return { toolName: entry.toolName, label: entry.label };
    const params = entry.extractParams(clause);
    if (params) return { toolName: entry.toolName, label: entry.label, params };
    // Keyword matched but a required param couldn't be extracted — don't treat as resolved.
    return null;
  }
  return null;
}

function resolveTools(query: string): CommandStep[] {
  const whatsapp = detectWhatsAppSend(query);
  if (whatsapp) return whatsapp;

  const q = query.toLowerCase();
  const clauses = q.split(/\band\b|,|;/i).map((c) => c.trim()).filter(Boolean);
  const source = clauses.length > 1 ? clauses : [q];

  const seen = new Set<string>();
  const steps: CommandStep[] = [];
  for (const clause of source) {
    const step = resolveTool(clause);
    if (step && !seen.has(step.toolName)) {
      seen.add(step.toolName);
      steps.push(step);
    }
  }
  return steps;
}

function looksLikeWrite(query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  return WRITE_VERBS.some((verb) => trimmed === verb || trimmed.startsWith(`${verb} `));
}

function looksLikeInformation(query: string): boolean {
  const q = query.trim().toLowerCase();
  return q.endsWith('?') || INFORMATION_STARTS.some((s) => q.startsWith(s));
}

function looksLikeSearch(query: string): { matched: boolean; searchQuery: string } {
  const match = query.trim().match(/^(?:search|find|look up|look for)\s+(?:for\s+)?(.*)$/i);
  if (!match) return { matched: false, searchQuery: '' };
  const rest = match[1]?.trim() ?? '';
  if (/^(google|youtube)\b/i.test(rest)) return { matched: false, searchQuery: '' };
  // "Find overdue tasks" / "search github repositories" should resolve as Tool commands, not a knowledge search.
  if (resolveTool(rest.toLowerCase())) return { matched: false, searchQuery: '' };
  return { matched: true, searchQuery: rest };
}

/** Extracts simple named entities ("ACCD", "Shubham") for the confirmation card's "Affected resources" — best-effort display only, never load-bearing. */
function extractEntities(query: string): string[] {
  const entities = new Set<string>();
  const prepositionMatches = query.matchAll(/\b(?:for|to|with)\s+([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*)/g);
  for (const m of prepositionMatches) {
    if (m[1]) entities.add(m[1].trim());
  }
  const capitalizedWords = query.match(/\b[A-Z]{2,}\b|\b[A-Z][a-z]+\b/g) ?? [];
  const firstWord = query.trim().split(/\s+/)[0];
  for (const word of capitalizedWords) {
    if (word !== firstWord) entities.add(word);
  }
  return Array.from(entities).slice(0, 5);
}

function matchesNavOrCommand(label: string, keywords: string[] | undefined, query: string): boolean {
  const haystack = [label, ...(keywords ?? [])].join(' ').toLowerCase();
  return haystack.includes(query.toLowerCase()) || query.toLowerCase().includes(label.toLowerCase());
}

export interface NavigationMatch {
  href: string;
  label: string;
}

/** Resolves an explicit "open X" style command against nav items, static commands, and AI Employees. */
export function resolveNavigation(query: string, navItems: NavItem[], staticCommands: CommandAction[]): NavigationMatch | null {
  const trimmed = query.trim();
  const openMatch = trimmed.match(/^(?:open|go to|show)\s+(.+)$/i);
  const target = (openMatch ? openMatch[1] : trimmed).trim();
  if (!target) return null;

  const employee = AI_EMPLOYEES.find((e) => target.toLowerCase().includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(target.toLowerCase()));
  if (employee && (openMatch || target.length > 3)) {
    return { href: `/agents/${employee.key}`, label: employee.name };
  }

  if (openMatch) {
    const navMatch = navItems.find((item) => matchesNavOrCommand(item.label, undefined, target));
    if (navMatch) return { href: navMatch.href, label: navMatch.label };

    const commandMatch = staticCommands.find((c) => matchesNavOrCommand(c.label.replace(/^Open\s+/i, ''), c.keywords, target));
    if (commandMatch?.href) return { href: commandMatch.href, label: commandMatch.label };
  }

  return null;
}

/**
 * Deterministic fallback classifier — always available, works offline, and is the ONLY
 * classifier ever used in Demo Mode (never calls a real AI provider while demoing).
 */
export function heuristicClassify(query: string, navItems: NavItem[], staticCommands: CommandAction[]): CommandPlan {
  const trimmed = query.trim();
  const base: Omit<CommandPlan, 'intent' | 'reasoning' | 'steps' | 'navigationHref' | 'navigationLabel' | 'searchQuery' | 'requiresConfirmation'> = {
    query: trimmed,
    employeeKey: null,
    employeeName: null,
    affectedResources: extractEntities(trimmed),
    classifiedBy: 'heuristic',
  };

  const navigation = resolveNavigation(trimmed, navItems, staticCommands);
  // "MCP" is a short, generic nav label, so an "open/show ..." command that's really asking for a
  // specific MCP action ("Show connected MCP servers") loosely matches it via
  // `matchesNavOrCommand`'s substring check too. When a real `mcp:*` tool ALSO resolves for this
  // exact query, prefer the more specific tool over the generic nav match — narrowly scoped to
  // `/mcp` so no other module's existing "open X" navigation behavior changes.
  const mcpToolOverride = navigation?.href === '/mcp' ? resolveTools(trimmed).find((s) => s.toolName.startsWith('mcp:')) : undefined;
  if (navigation && !mcpToolOverride) {
    return {
      ...base,
      intent: 'navigation',
      reasoning: `"${trimmed}" reads as a direct request to open ${navigation.label}.`,
      steps: [],
      navigationHref: navigation.href,
      navigationLabel: navigation.label,
      searchQuery: null,
      requiresConfirmation: false,
    };
  }

  const goalMatch = detectGoalCommand(trimmed);
  if (goalMatch) {
    return {
      ...base,
      intent: 'navigation',
      reasoning: `"${trimmed}" reads as a goal — routed to the Goal Execution Engine.`,
      steps: [],
      navigationHref: goalMatch.href,
      navigationLabel: goalMatch.label,
      searchQuery: null,
      requiresConfirmation: false,
    };
  }

  const search = looksLikeSearch(trimmed);
  if (search.matched) {
    return {
      ...base,
      intent: 'search',
      reasoning: `"${trimmed}" reads as a knowledge search.`,
      steps: [{ toolName: 'read_organization_memory', label: 'Knowledge' }],
      navigationHref: null,
      navigationLabel: null,
      searchQuery: search.searchQuery,
      requiresConfirmation: false,
    };
  }

  const steps = resolveTools(trimmed);
  if (steps.length > 0) {
    const requiresConfirmation = stepsRequireConfirmation(steps);
    return {
      ...base,
      intent: steps.length > 1 ? 'workflow' : 'tool',
      reasoning:
        steps.length > 1
          ? `"${trimmed}" needs ${steps.length} tools chained together.`
          : `"${trimmed}" matches the ${steps[0].label} tool.`,
      steps,
      navigationHref: null,
      navigationLabel: null,
      searchQuery: null,
      requiresConfirmation,
    };
  }

  if (looksLikeWrite(trimmed)) {
    const employee = resolveEmployeeForQuery(trimmed);
    return {
      ...base,
      intent: 'tool',
      reasoning: `"${trimmed}" would modify data — no tool is registered for this action yet, so it requires confirmation.`,
      employeeKey: employee.key,
      employeeName: employee.name,
      steps: [],
      navigationHref: null,
      navigationLabel: null,
      searchQuery: null,
      requiresConfirmation: true,
    };
  }

  const employee = resolveEmployeeForQuery(trimmed);
  const intent: CommandIntent = looksLikeInformation(trimmed) ? 'information' : 'conversation';
  return {
    ...base,
    intent,
    reasoning: `"${trimmed}" reads as a question best answered by ${employee.name}.`,
    employeeKey: employee.key,
    employeeName: employee.name,
    steps: [],
    navigationHref: null,
    navigationLabel: null,
    searchQuery: null,
    requiresConfirmation: false,
  };
}
