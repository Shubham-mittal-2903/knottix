import type { IntelligencePlatform } from '@/lib/intelligence';
import type { IntelligenceContext } from '@/lib/intelligence/types';
import type { AIRuntime } from '@/lib/ai';
import type { ToolAccessContext, ToolExecutionContext } from '@/lib/tools';
import type { AgentAccessContext } from '@/lib/agents';
import type { WorkflowContext, WorkflowStepDefinition } from './types';
import { WorkflowConfirmationRequired, confirmationVariableKey } from './execution/workflow-executor';
import { logger } from '@/lib/logger';

export interface ToolStepConfig {
  toolName: string;
  params?: Record<string, unknown>;
}

export interface AgentStepConfig {
  agentKey: string;
  /** Literal input text, used when `inputFromVariable` isn't set. */
  input?: string;
  /** Reads `context.variables[inputFromVariable]` as the agent's input instead — lets an earlier
   *  step's output (or a repair prompt's diagnosis) feed directly into the next agent call. */
  inputFromVariable?: string;
}

export interface PromptStepConfig {
  promptKey: string;
  variables?: Record<string, unknown>;
  model: string;
  /** When set, the model's raw text response is also written to `context.variables[outputVariable]`
   *  so a later 'condition'/'transform' step can branch on it. */
  outputVariable?: string;
  maxTokens?: number;
  temperature?: number;
}

function buildAccessContext(context: WorkflowContext): { userId: string; organizationId: string; workspaceId: string | null; isFounder: boolean; permissions: string[] } {
  return {
    userId: context.userId,
    organizationId: context.organizationId,
    workspaceId: context.workspaceId,
    isFounder: context.accessContext?.isFounder ?? false,
    permissions: context.accessContext?.permissions ?? [],
  };
}

/**
 * Registers the generic 'tool' / 'agent' / 'prompt' Workflow step handlers against a real
 * Intelligence Platform + AI Runtime — closing IDEA-036 ("the Workflow Engine has zero
 * tool/agent/prompt step handlers registered anywhere in the codebase"). These handlers are
 * deliberately business-logic-free plumbing: a step's `config` names a real tool/agent/prompt
 * key, and this file calls the exact same `toolEngine.execute()` / `agentEngine.execute()` /
 * `promptEngine.render()` + `aiRuntime.complete()` every other part of Knottix already calls —
 * no new invocation mechanism, no duplicated execution path. The Goal Execution Engine is the
 * first real consumer, but any future feature that registers a `WorkflowDefinition` gets these
 * step types for free.
 */
export function registerCoreWorkflowStepHandlers(platform: IntelligencePlatform, aiRuntime: AIRuntime): void {
  platform.workflows.registerStepHandler('tool', async (step: WorkflowStepDefinition, context: WorkflowContext) => {
    const config = step.config as unknown as ToolStepConfig;
    if (!config.toolName) throw new Error(`Step "${step.name}" (type=tool) is missing config.toolName`);

    const tool = platform.tools.get(config.toolName);
    if (tool.metadata?.requiresConfirmation && !context.variables[confirmationVariableKey(step.id)]) {
      throw new WorkflowConfirmationRequired(step.id, `"${tool.name}" requires confirmation before it can run.`);
    }

    const accessContext: ToolAccessContext = buildAccessContext(context);
    const executionContext: ToolExecutionContext = {
      requestId: context.requestId,
      organizationId: context.organizationId,
      workspaceId: context.workspaceId,
      userId: context.userId,
      module: 'goal-engine',
      signal: context.signal,
    };

    const result = await platform.tools.execute(config.toolName, config.params ?? {}, accessContext, executionContext);
    if (!result.success) throw new Error(result.error ?? `Tool "${config.toolName}" failed`);
    return result.output;
  });

  platform.workflows.registerStepHandler('agent', async (step: WorkflowStepDefinition, context: WorkflowContext) => {
    const config = step.config as unknown as AgentStepConfig;
    if (!config.agentKey) throw new Error(`Step "${step.name}" (type=agent) is missing config.agentKey`);

    const input = config.inputFromVariable ? String(context.variables[config.inputFromVariable] ?? '') : (config.input ?? '');
    if (!input) throw new Error(`Step "${step.name}" (type=agent) has no input to send ${config.agentKey}.`);

    if (!context.intelligenceContext) {
      throw new Error('Agent steps require an IntelligenceContext on the workflow context — none was provided to this execution.');
    }

    const accessContext: AgentAccessContext = buildAccessContext(context);
    const result = await platform.agents.execute(
      { agentKey: config.agentKey, organizationId: context.organizationId, input },
      accessContext,
      context.intelligenceContext as IntelligenceContext,
    );

    if (result.status === 'failed') throw new Error(result.error ?? `${config.agentKey} did not respond.`);
    return { content: result.content, agentKey: config.agentKey };
  });

  platform.workflows.registerStepHandler('prompt', async (step: WorkflowStepDefinition, context: WorkflowContext) => {
    const config = step.config as unknown as PromptStepConfig;
    if (!config.promptKey) throw new Error(`Step "${step.name}" (type=prompt) is missing config.promptKey`);
    if (!config.model) throw new Error(`Step "${step.name}" (type=prompt) is missing config.model`);

    const rendered = platform.prompts.render({ key: config.promptKey, variables: config.variables ?? {} });
    const response = await aiRuntime.complete({
      model: config.model,
      messages: [{ role: 'user', content: rendered.content }],
      temperature: config.temperature ?? 0.3,
      maxTokens: config.maxTokens ?? 500,
      organizationId: context.organizationId,
      userId: context.userId,
      module: 'goal-engine',
    });

    if (config.outputVariable) context.variables[config.outputVariable] = response.content;
    return { content: response.content };
  });

  logger.info('workflow.step-handlers', 'Core tool/agent/prompt step handlers registered');
}
