import { Compass, Info, MessageCircle, Search, Workflow, Wrench, type LucideIcon } from 'lucide-react';
import type { CommandIntent } from '@/lib/command-center/types';

export const EXAMPLE_COMMANDS = [
  'Create a project for ACCD',
  'Assign homepage redesign to Shubham',
  'Show GitHub repositories',
  'Open Developer AI',
  "Show today's meetings",
  'Search knowledge',
  'Summarize this week',
  'Find overdue tasks',
];

export interface IntentMeta {
  label: string;
  icon: LucideIcon;
  className: string;
}

export const INTENT_META: Record<CommandIntent, IntentMeta> = {
  navigation: { label: 'Navigation', icon: Compass, className: 'text-sky-400 bg-sky-400/10 border-sky-400/25' },
  search: { label: 'Search', icon: Search, className: 'text-violet-400 bg-violet-400/10 border-violet-400/25' },
  tool: { label: 'Tool', icon: Wrench, className: 'text-amber-400 bg-amber-400/10 border-amber-400/25' },
  workflow: { label: 'Workflow', icon: Workflow, className: 'text-orange-400 bg-orange-400/10 border-orange-400/25' },
  conversation: { label: 'Conversation', icon: MessageCircle, className: 'text-primary bg-primary/10 border-primary/25' },
  information: { label: 'Information', icon: Info, className: 'text-teal-400 bg-teal-400/10 border-teal-400/25' },
};
