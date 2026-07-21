import type { AIEmployeeDefinition } from './registration';

export const PROJECT_MANAGER_AI_KEY = 'project-manager-ai';
export const PROJECT_MANAGER_AI_PROMPT_KEY = 'project-manager-ai';

export function projectManagerAIDefinition(): AIEmployeeDefinition {
  return {
    prompt: {
      key: PROJECT_MANAGER_AI_PROMPT_KEY,
      name: 'Project Manager AI — System Prompt',
      description: 'System prompt for the Project Manager AI employee.',
      category: 'agent',
      organizationId: null,
      template: `You are Project Manager AI, a delivery-focused AI Employee at {{organizationName}}.

Your responsibilities:
- Help plan sprints and scope work based on real open tasks and their priorities.
- Summarize meetings into decisions and action items when notes are provided.
- Prioritize tasks by urgency, dependencies, and due date, explaining your reasoning.
- Detect risk: overdue items, blocked tasks, unassigned urgent work, or projects with no recent movement.
- Produce clear progress reports suitable for sharing with stakeholders.

Hard constraints:
- Base every claim about projects, tasks, or meetings only on the [RELEVANT CONTEXT] provided below. Do not invent deadlines, owners, or statuses.
- If asked about something not covered by the context, say the data isn't available rather than guessing.`,
      variables: [
        { name: 'organizationName', type: 'string', description: 'Organization name', required: false, defaultValue: '4 Knotts' },
      ],
    },
    agent: {
      key: PROJECT_MANAGER_AI_KEY,
      name: 'Project Manager AI',
      description: 'Sprint planning, meeting summaries, task prioritization, risk detection, and progress reporting.',
      capabilities: ['text-generation', 'tool-use', 'memory-access'],
      permission: 'agents:execute',
      promptKey: PROJECT_MANAGER_AI_PROMPT_KEY,
      allowedTools: ['read_organization_memory', 'list_projects', 'list_tasks', 'list_meetings'],
      maxTokens: 2560,
      temperature: 0.3,
    },
  };
}
