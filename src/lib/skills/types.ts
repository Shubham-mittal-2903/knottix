import type { WorkflowStepDefinition } from '@/lib/workflows';

export type SkillCategory = 'development' | 'browser' | 'desktop' | 'business' | 'intelligence' | 'mcp';

export type SkillParameterType = 'string' | 'number' | 'boolean';

export interface SkillParameterDefinition {
  name: string;
  type: SkillParameterType;
  description: string;
  required: boolean;
}

/** The result of trying to turn one goal (or goal clause) into a runnable step graph for this
 *  skill. `null` means the skill's keywords matched but a required input couldn't be extracted
 *  from the text (e.g. "deploy my project" with no path) — the caller must report this honestly,
 *  never execute a graph built from a guessed/empty parameter. */
export interface SkillPlan {
  steps: WorkflowStepDefinition[];
  startStepId: string;
}

export type SkillPlanBuilder = (goalText: string) => SkillPlan | null;

export interface SkillDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  category: SkillCategory;
  /** Real Tool Engine tool names (and/or AI Employee keys for 'agent' steps) this skill's plan
   *  will call — declared up front so the Skills page can show real dependencies, and so the
   *  planner can reject a skill outright if a required tool is missing from the Tool Registry. */
  requiredTools: string[];
  requiredPermission: string;
  inputs: SkillParameterDefinition[];
  outputs: string;
  verificationMethod: string;
  /** Substrings matched (case-insensitive) against goal text during discovery — distinct from
   *  `requiredTools`, which is about execution dependencies, not search ranking. */
  keywords: string[];
  buildPlan: SkillPlanBuilder;
  organizationId: string | null;
  isActive: boolean;
  version: string;
  registeredAt: number;
}

export interface RegisterSkillInput {
  key: string;
  name: string;
  description: string;
  category: SkillCategory;
  requiredTools: string[];
  requiredPermission: string;
  inputs: SkillParameterDefinition[];
  outputs: string;
  verificationMethod: string;
  keywords: string[];
  buildPlan: SkillPlanBuilder;
  organizationId?: string | null;
  version?: string;
}

export interface SkillFilter {
  organizationId?: string | null;
  category?: SkillCategory;
  isActive?: boolean;
  search?: string;
}

/** One scored discovery result — `score` is keyword-match count, used to rank and to break ties
 *  by preferring the skill whose name/keywords more precisely matched the query. */
export interface SkillMatch {
  skill: SkillDefinition;
  score: number;
}

export interface SkillFailureBucket {
  error: string;
  count: number;
}

/** Real, derived from persisted `WorkflowExecution` rows (see `src/lib/db/queries/skill-stats.ts`)
 *  — never a separate hand-maintained counter that could drift from what actually ran. */
export interface SkillStats {
  usageCount: number;
  successCount: number;
  failureCount: number;
  successRate: number | null;
  avgDurationMs: number | null;
  avgRetries: number | null;
  lastExecutedAt: number | null;
  commonFailures: SkillFailureBucket[];
}
