import type { IntelligencePlatform } from '@/lib/intelligence';
import { isPromptError } from '@/lib/prompt';

export const COMMAND_CENTER_INTENT_PROMPT_KEY = 'command-center-intent';

const ALLOWED_INTENTS = ['navigation', 'search', 'tool', 'workflow', 'conversation', 'information'] as const;
const ALLOWED_EMPLOYEES = [
  'founder-executive-assistant',
  'developer-ai',
  'designer-ai',
  'project-manager-ai',
  'marketing-ai',
  'content-ai',
  'sales-ai',
  'none',
] as const;

/**
 * Registered once (idempotent, same DUPLICATE_KEY-swallowing pattern `registerAIEmployee` uses)
 * so the Command Center's AI classification path reuses the exact same Prompt Engine every AI
 * Employee's system prompt goes through — no second prompt-rendering mechanism.
 */
export function registerCommandCenterPrompt(platform: IntelligencePlatform): void {
  try {
    platform.prompts.createTemplate({
      key: COMMAND_CENTER_INTENT_PROMPT_KEY,
      name: 'Command Center — Intent Classifier',
      description: 'Classifies a free-text Command Center query into an intent and a suggested AI Employee.',
      category: 'system',
      organizationId: null,
      template: `You are the intent classifier for Knottix's Command Center. Given one user command, respond with EXACTLY one line and nothing else, in this exact pipe-delimited format:

INTENT|EMPLOYEE|REASONING

Rules:
- INTENT must be exactly one of: navigation, search, tool, workflow, conversation, information
- EMPLOYEE must be exactly one of: founder-executive-assistant, developer-ai, designer-ai, project-manager-ai, marketing-ai, content-ai, sales-ai, none
- navigation = the user wants to open a specific screen or AI Employee
- search = the user wants to search organizational knowledge/memory
- tool = the user wants a single piece of real data (a list of projects, tasks, meetings, repositories, etc.)
- workflow = the user's request needs more than one of those lists combined
- conversation = the user wants to talk to an AI Employee about something open-ended
- information = the user is asking a direct factual question best answered by reasoning over existing data
- REASONING is under 12 words, no punctuation beyond a period.
- Never include extra lines, quotes, or explanation outside the single pipe-delimited line.

Command: {{query}}`,
      variables: [{ name: 'query', type: 'string', description: 'The raw user command', required: true }],
    });
  } catch (error) {
    if (!(isPromptError(error) && error.code === 'DUPLICATE_KEY')) throw error;
  }
}

export interface AIClassification {
  intent: (typeof ALLOWED_INTENTS)[number];
  employeeKey: string | null;
  reasoning: string;
}

/** Parses the classifier's pipe-delimited line; returns null on any malformed response so the caller falls back to the heuristic classifier. */
export function parseClassification(raw: string): AIClassification | null {
  const line = raw.trim().split('\n')[0]?.trim() ?? '';
  const parts = line.split('|').map((p) => p.trim());
  if (parts.length < 2) return null;

  const [intentRaw, employeeRaw, ...reasoningParts] = parts;
  const intent = intentRaw.toLowerCase() as AIClassification['intent'];
  const employee = employeeRaw.toLowerCase();

  if (!ALLOWED_INTENTS.includes(intent)) return null;
  if (!ALLOWED_EMPLOYEES.includes(employee as (typeof ALLOWED_EMPLOYEES)[number])) return null;

  return {
    intent,
    employeeKey: employee === 'none' ? null : employee,
    reasoning: reasoningParts.join('|').trim() || 'Classified by AI.',
  };
}
