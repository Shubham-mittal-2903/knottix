import { Bot, Code2, Megaphone, PenLine, ShieldCheck, TrendingUp, Palette, type LucideIcon } from 'lucide-react';

/**
 * Directory / UI presentation metadata for each AI Employee. This is app-level config, not
 * part of the Agent Framework — the framework only knows about `AgentDefinition` (registered
 * via `registerAllAIEmployees`). This file adds the product-facing identity, recommended
 * model, memory scope description, and conversation starters shown in the AI Directory.
 *
 * Keys are literal strings, not imported from `src/lib/agents/employees/*.ts` — those files
 * pull in Tool Engine tools (e.g. `developer.ts` → `github-tools.ts` → Prisma) and must stay
 * server-only. This file is imported by the client-side Command Center router, so it has to be
 * safely bundleable into client code; the key strings themselves are the one thing worth
 * duplicating to keep that boundary intact (see DEC-035). Keep these in sync with the
 * `*_KEY` constants in each employee definition file if either ever changes.
 */
export interface AIEmployeeProfile {
  key: string;
  name: string;
  role: string;
  icon: LucideIcon;
  description: string;
  responsibilities: string[];
  defaultWorkspace: string;
  memoryScope: string;
  accessibleTools: string[];
  permission: string;
  recommendedModel: string;
  conversationStarter: string;
  suggestedWorkflows: string[];
}

export const AI_EMPLOYEES: AIEmployeeProfile[] = [
  {
    key: 'founder-executive-assistant',
    name: 'Founder Executive Assistant',
    role: 'Executive Assistant',
    icon: Bot,
    description:
      "Reads organizational memory, projects, tasks, and meetings to answer the Founder's questions and generate executive summaries.",
    responsibilities: [
      'Answer questions about the organization',
      'Generate executive summaries',
      'Surface relevant organizational memory',
      'Cross-reference projects, tasks, and meetings',
    ],
    defaultWorkspace: 'Organization-wide (Mission Control)',
    memoryScope: 'Organization memory (all namespaces the Founder can read)',
    accessibleTools: ['read_organization_memory', 'list_projects', 'list_tasks', 'list_meetings'],
    permission: 'agents:execute',
    recommendedModel: 'Claude Sonnet 4 — broad reasoning across the whole organization',
    conversationStarter: 'Give me an executive summary of what changed this week.',
    suggestedWorkflows: ['Weekly executive summary', 'Ask before a leadership meeting', 'Cross-project status check'],
  },
  {
    key: 'developer-ai',
    name: 'Developer AI',
    role: 'Software Engineer',
    icon: Code2,
    description:
      'Repository-aware reasoning, code explanation, architecture discussion, bug investigation, PR/issue/release summaries, and deployment guidance — grounded in connected GitHub repositories.',
    responsibilities: [
      'Repository analysis (live, via connected GitHub repositories)',
      'Code explanation',
      'Architecture discussions',
      'Bug investigation',
      'Pull request summaries',
      'Weekly engineering summaries',
      'Release summaries',
      'Deployment assistance',
    ],
    defaultWorkspace: 'Engineering projects',
    memoryScope: 'Organization memory + active projects, tasks, and connected GitHub repositories',
    accessibleTools: [
      'read_organization_memory',
      'list_projects',
      'list_tasks',
      'github_list_repositories',
      'github_get_repository',
      'github_list_commits',
      'github_list_pull_requests',
      'github_list_issues',
      'github_get_release',
      'github_get_contributors',
      'github_list_branches',
    ],
    permission: 'agents:execute',
    recommendedModel: 'Claude Sonnet 4 — strongest reasoning for code and architecture',
    conversationStarter: "Give me this week's engineering summary from our connected repository.",
    suggestedWorkflows: ['Weekly engineering summary', 'Release summary', 'Detect inactive repositories', 'Pre-deploy checklist review'],
  },
  {
    key: 'designer-ai',
    name: 'Designer AI',
    role: 'Product Designer',
    icon: Palette,
    description: 'Design review, component consistency, design-system guidance, UX feedback, and Figma-ready recommendations.',
    responsibilities: [
      'Design review',
      'Component consistency checks',
      'Design system guidance',
      'UX feedback',
      'Figma-ready recommendations',
    ],
    defaultWorkspace: 'Creative projects',
    memoryScope: 'Organization memory + recent project files',
    accessibleTools: ['read_organization_memory', 'list_recent_files', 'list_projects'],
    permission: 'agents:execute',
    recommendedModel: 'Claude Sonnet 4 — nuanced, structured creative feedback',
    conversationStarter: 'Review our latest design files for consistency issues.',
    suggestedWorkflows: ['Structured design critique', 'Design-system audit note', 'UX feedback pass before handoff'],
  },
  {
    key: 'project-manager-ai',
    name: 'Project Manager AI',
    role: 'Project Manager',
    icon: ShieldCheck,
    description: 'Sprint planning, meeting summaries, task prioritization, risk detection, and progress reporting.',
    responsibilities: ['Sprint planning', 'Meeting summaries', 'Task prioritization', 'Risk detection', 'Progress reporting'],
    defaultWorkspace: 'Organization-wide projects',
    memoryScope: 'Organization memory + all projects, tasks, and meetings',
    accessibleTools: ['read_organization_memory', 'list_projects', 'list_tasks', 'list_meetings'],
    permission: 'agents:execute',
    recommendedModel: 'Claude Sonnet 4 — reliable structured planning and risk reasoning',
    conversationStarter: "What's at risk of slipping this sprint?",
    suggestedWorkflows: ['Weekly risk scan', 'Sprint planning draft', 'Meeting notes to action items'],
  },
  {
    key: 'marketing-ai',
    name: 'Marketing AI',
    role: 'Marketing Strategist',
    icon: TrendingUp,
    description: 'Campaign planning, analytics summaries, growth suggestions, competitor analysis, and marketing strategy.',
    responsibilities: ['Campaign planning', 'Analytics summaries', 'Growth suggestions', 'Competitor analysis', 'Marketing strategy'],
    defaultWorkspace: 'Marketing & client accounts',
    memoryScope: 'Organization memory + client roster',
    accessibleTools: ['read_organization_memory', 'list_clients'],
    permission: 'agents:execute',
    recommendedModel: 'Claude Haiku 4.5 — fast iteration for campaign ideation',
    conversationStarter: 'Suggest three growth angles based on our current client mix.',
    suggestedWorkflows: ['Campaign brief draft', 'Positioning reasoning session', 'Client-mix growth review'],
  },
  {
    key: 'content-ai',
    name: 'Content AI',
    role: 'Content Writer',
    icon: PenLine,
    description: 'Blog writing, social captions, email drafts, SEO optimization, and website copy.',
    responsibilities: ['Blog writing', 'Social captions', 'Email drafts', 'SEO optimization', 'Website copy'],
    defaultWorkspace: 'Content & brand',
    memoryScope: 'Organization memory (brand voice, prior content)',
    accessibleTools: ['read_organization_memory'],
    permission: 'agents:execute',
    recommendedModel: 'Claude Haiku 4.5 — fast, high-volume drafting',
    conversationStarter: 'Draft a LinkedIn caption announcing our latest project.',
    suggestedWorkflows: ['Blog post first draft', 'Social caption batch', 'SEO pass on existing copy'],
  },
  {
    key: 'sales-ai',
    name: 'Sales AI',
    role: 'Sales & Client Success',
    icon: Megaphone,
    description: 'Proposal drafting, lead qualification, follow-up preparation, client briefing, and CRM summaries.',
    responsibilities: ['Proposal drafting', 'Lead qualification', 'Follow-up preparation', 'Client briefing', 'CRM summaries'],
    defaultWorkspace: 'Client accounts',
    memoryScope: 'Organization memory + client roster',
    accessibleTools: ['read_organization_memory', 'list_clients'],
    permission: 'agents:execute',
    recommendedModel: 'Claude Sonnet 4 — careful, client-safe drafting',
    conversationStarter: 'Brief me on our client roster before my calls today.',
    suggestedWorkflows: ['Pre-call client briefing', 'Proposal first draft', 'Follow-up email after a meeting'],
  },
];

export function findAIEmployee(key: string): AIEmployeeProfile | undefined {
  return AI_EMPLOYEES.find((e) => e.key === key);
}
