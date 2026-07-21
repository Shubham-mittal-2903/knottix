import type { RegisterSkillInput } from '../types';
import { step } from './shared';

/**
 * Business skills — each delegates to a real, already-registered AI Employee via an 'agent' step.
 * "Proposal"/"Report"/"Meeting Summary" from the mission map to Sales AI, Project Manager AI, and
 * Project Manager AI respectively — all real employees with real prompts, no new AI.
 */
export function createBusinessSkills(): RegisterSkillInput[] {
  return [
    {
      key: 'project-status-report',
      name: 'Project Status Report',
      description: 'Asks Project Manager AI for a status/risk report across projects, tasks, or a sprint.',
      category: 'business',
      requiredTools: [],
      requiredPermission: 'agents:execute',
      inputs: [{ name: 'goal', type: 'string', description: 'What to report on', required: true }],
      outputs: "Project Manager AI's written report.",
      verificationMethod: 'Fails the skill if the agent step itself fails.',
      keywords: ['status report', 'project status', 'risk scan', 'sprint planning', 'progress report', 'meeting summary'],
      buildPlan: (goalText) => ({ startStepId: 's1', steps: [step('s1', 'Ask Project Manager AI', 'agent', { agentKey: 'project-manager-ai', input: goalText })] }),
    },
    {
      key: 'proposal-draft',
      name: 'Proposal Draft',
      description: 'Asks Sales AI to draft a client proposal or briefing.',
      category: 'business',
      requiredTools: [],
      requiredPermission: 'agents:execute',
      inputs: [{ name: 'goal', type: 'string', description: 'Who the proposal is for and what it should cover', required: true }],
      outputs: "Sales AI's written draft.",
      verificationMethod: 'Fails the skill if the agent step itself fails.',
      keywords: ['proposal', 'client briefing', 'pitch', 'lead qualification'],
      buildPlan: (goalText) => ({ startStepId: 's1', steps: [step('s1', 'Ask Sales AI', 'agent', { agentKey: 'sales-ai', input: goalText })] }),
    },
    {
      key: 'content-draft',
      name: 'Content Draft',
      description: 'Asks Content AI to draft a blog post, caption, or other written copy.',
      category: 'business',
      requiredTools: [],
      requiredPermission: 'agents:execute',
      inputs: [{ name: 'goal', type: 'string', description: 'What to write', required: true }],
      outputs: "Content AI's written draft.",
      verificationMethod: 'Fails the skill if the agent step itself fails.',
      keywords: ['blog', 'write a', 'draft a', 'caption', 'copy for', 'newsletter'],
      buildPlan: (goalText) => ({ startStepId: 's1', steps: [step('s1', 'Ask Content AI', 'agent', { agentKey: 'content-ai', input: goalText })] }),
    },
    {
      key: 'website-plan',
      name: 'Website / Product Plan',
      description: 'Gets a technical setup plan, a visual design direction, and homepage copy for a new site or product — three independent expert takes, not a hand-off pipeline.',
      category: 'business',
      requiredTools: [],
      requiredPermission: 'agents:execute',
      inputs: [{ name: 'goal', type: 'string', description: 'What is being built', required: true }],
      outputs: 'Three written outputs: a technical plan (Developer AI), a design direction (Designer AI), and homepage copy (Content AI).',
      verificationMethod: 'Fails the skill at whichever step fails; the other steps still complete since they don\'t depend on each other\'s output.',
      keywords: ['website', 'portfolio', 'landing page', 'dashboard', 'saas', 'agency site', 'law firm site', 'build a site'],
      buildPlan: (goalText) => ({
        startStepId: 's1',
        steps: [
          step(
            's1',
            'Technical setup plan (Developer AI)',
            'agent',
            { agentKey: 'developer-ai', input: `Produce a concrete technical setup plan for this goal: "${goalText}". Include recommended stack, folder structure, and the first implementation steps. Be explicit that this is a written plan, not a live deployment.` },
            's2',
          ),
          step(
            's2',
            'Design direction (Designer AI)',
            'agent',
            { agentKey: 'designer-ai', input: `Given this goal: "${goalText}", propose a visual design direction — palette, typography, layout approach, and reference feel.` },
            's3',
          ),
          step(
            's3',
            'Copy draft (Content AI)',
            'agent',
            { agentKey: 'content-ai', input: `Given this goal: "${goalText}", draft homepage copy — a headline, subheadline, and 3 section blurbs.` },
          ),
        ],
      }),
    },
  ];
}
