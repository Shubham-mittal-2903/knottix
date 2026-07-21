import type { MemorySourceType } from '@/types/database';

export interface DemoMemoryEntry {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  sourceType: MemorySourceType;
  createdAt: number;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => Date.now() - ms;

export const DEMO_MEMORY_ENTRIES: DemoMemoryEntry[] = [
  {
    id: 'demo-memory-1',
    title: 'Brand voice guidelines — 4 Knotts',
    summary: 'Direct, confident, no filler. Premium without being corporate. Never oversell.',
    content:
      'Direct, confident, no filler. Premium without being corporate. Never oversell — let the work speak. Prefer active voice and concrete nouns over abstractions.',
    sourceType: 'DOCUMENT',
    createdAt: ago(20 * DAY),
  },
  {
    id: 'demo-memory-2',
    title: 'ACCD Jubilee — client kickoff notes',
    summary: 'Client wants a bold, celebratory feel with a live radar globe centerpiece and sponsor visibility.',
    content:
      'Client wants a bold, celebratory feel for the 75th anniversary. Radar globe as the interactive centerpiece. Sponsor logos must rotate visibly above the fold. Navy + gold palette locked in.',
    sourceType: 'CLIENT',
    createdAt: ago(15 * DAY),
  },
  {
    id: 'demo-memory-3',
    title: 'Decision: Knottix ships dark-mode only',
    summary: 'Founder decision — no light theme for the internal OS, at least through v1.',
    content:
      'Founder decision (DEC-005): Knottix is dark-mode only through v1. Internal tool, single audience, no need to support light mode preference switching yet.',
    sourceType: 'MANUAL',
    createdAt: ago(9 * DAY),
  },
  {
    id: 'demo-memory-4',
    title: 'Judge scoring engine — rounding bug root cause',
    summary: 'Aggregate scores were truncating instead of rounding when combining judge weights.',
    content:
      'Root cause: the aggregate scoring function truncated decimal weights instead of rounding, causing a systematic downward bias on combined scores. Fix: round at the final aggregation step, not per-judge.',
    sourceType: 'AGENT',
    createdAt: ago(3 * DAY),
  },
  {
    id: 'demo-memory-5',
    title: 'Weekly executive summary — this week',
    summary: '6 active projects, 24 open tasks, ACCD Jubilee on track for launch, Judge blocked on a scoring bug.',
    content:
      '6 active projects across Client Delivery, Product, and Internal Tools workspaces. 24 open tasks. ACCD Jubilee Website on track for launch next week. Judge by 4 Knotts is blocked on a scoring aggregation bug, in review. Knottix demo prep is the top priority this week.',
    sourceType: 'AGENT',
    createdAt: ago(6 * HOUR),
  },
  {
    id: 'demo-memory-6',
    title: 'Kreativ Website — SEO baseline audit',
    summary: 'Core Web Vitals pass on mobile; metadata and alt text need a pass before relaunch.',
    content:
      'Core Web Vitals pass on mobile (LCP 2.1s). Missing meta descriptions on 6 pages, alt text incomplete on the case studies grid. Fix before relaunch announcement.',
    sourceType: 'PROJECT',
    createdAt: ago(2 * DAY),
  },
  {
    id: 'demo-memory-7',
    title: 'CoverHub — on-hold rationale',
    summary: 'Client requested a pause pending internal budget approval; resume call scheduled.',
    content:
      'Client requested a pause on CoverHub pending internal budget approval on their side. No work should proceed until the resumption call. Keep design system audit findings on file for when work resumes.',
    sourceType: 'CLIENT',
    createdAt: ago(5 * DAY),
  },
  {
    id: 'demo-memory-8',
    title: 'Company wiki — engagement process',
    summary: 'Standard 4 Knotts client engagement: discovery call, proposal, kickoff, weekly check-ins, handoff.',
    content:
      'Standard engagement: (1) discovery call, (2) proposal + scope, (3) kickoff with brand/brief, (4) weekly async check-ins plus one live sync, (5) staged handoff with a 2-week support window.',
    sourceType: 'DOCUMENT',
    createdAt: ago(30 * DAY),
  },
];
