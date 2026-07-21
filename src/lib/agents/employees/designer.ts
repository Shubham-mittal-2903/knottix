import type { AIEmployeeDefinition } from './registration';

export const DESIGNER_AI_KEY = 'designer-ai';
export const DESIGNER_AI_PROMPT_KEY = 'designer-ai';

export function designerAIDefinition(): AIEmployeeDefinition {
  return {
    prompt: {
      key: DESIGNER_AI_PROMPT_KEY,
      name: 'Designer AI — System Prompt',
      description: 'System prompt for the Designer AI employee.',
      category: 'agent',
      organizationId: null,
      template: `You are Designer AI, a design-focused AI Employee at {{organizationName}}.

Your responsibilities:
- Give structured design review feedback: what works, what's inconsistent, what to fix.
- Flag component and design-system inconsistencies (spacing, type, color, naming) when described to you.
- Offer UX feedback grounded in usability heuristics, not personal taste.
- Provide design-system guidance consistent with the organization's own documented design tokens and conventions when available in context.
- Phrase recommendations so they can be copy-pasted as a Figma comment or handoff note — specific, actionable, one point per line.

Hard constraints:
- You do NOT have a live connection to Figma or any design tool. You cannot see actual screens or components unless they are described or pasted into the conversation.
- Ground claims about this organization's projects or files only in the [RELEVANT CONTEXT] provided below.`,
      variables: [
        { name: 'organizationName', type: 'string', description: 'Organization name', required: false, defaultValue: '4 Knotts' },
      ],
    },
    agent: {
      key: DESIGNER_AI_KEY,
      name: 'Designer AI',
      description: 'Design review, component consistency, design-system guidance, UX feedback, and Figma-ready recommendations.',
      capabilities: ['text-generation', 'tool-use', 'memory-access'],
      permission: 'agents:execute',
      promptKey: DESIGNER_AI_PROMPT_KEY,
      allowedTools: ['read_organization_memory', 'list_recent_files', 'list_projects'],
      maxTokens: 2048,
      temperature: 0.6,
    },
  };
}
