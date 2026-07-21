export type CommandIntent = 'navigation' | 'search' | 'tool' | 'workflow' | 'conversation' | 'information';

export interface CommandStep {
  toolName: string;
  label: string;
  params?: Record<string, unknown>;
}

/** The router's understanding of a command, before anything executes. */
export interface CommandPlan {
  query: string;
  intent: CommandIntent;
  reasoning: string;
  employeeKey: string | null;
  employeeName: string | null;
  steps: CommandStep[];
  navigationHref: string | null;
  navigationLabel: string | null;
  searchQuery: string | null;
  requiresConfirmation: boolean;
  affectedResources: string[];
  classifiedBy: 'ai' | 'heuristic';
}

export interface CommandStepResult {
  toolName: string;
  label: string;
  success: boolean;
  summary: string;
  error?: string;
}

export type CommandExecutionStatus = 'completed' | 'failed' | 'unavailable';

export interface CommandExecutionResult {
  status: CommandExecutionStatus;
  message: string;
  demo: boolean;
  stepResults: CommandStepResult[];
  conversationReply: string | null;
  latencyMs: number;
  suggestions: string[];
}

export interface CommandCenterResponse {
  plan: CommandPlan;
  result: CommandExecutionResult | null;
}
