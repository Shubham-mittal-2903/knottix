import type {
  CreatePromptTemplateInput,
  PromptContextBlock,
  PromptFilter,
  PromptTemplate,
  PromptTemplateRevision,
  RenderedPrompt,
  RenderPromptInput,
  UpdatePromptTemplateInput,
} from '../types';
import type { PromptRegistry } from '../registry/prompt-registry';
import type { PromptValidator } from '../validation/prompt-validator';
import type { PromptRenderer } from '../rendering/prompt-renderer';
import type { ContextInjector } from '../context/context-injector';
import { PromptError } from '../errors';
import { logger } from '@/lib/logger';

export interface PromptEngine {
  createTemplate(input: CreatePromptTemplateInput): PromptTemplate;
  updateTemplate(templateId: string, input: UpdatePromptTemplateInput): PromptTemplate;
  getTemplate(templateId: string): PromptTemplate;
  getTemplateByKey(key: string, organizationId?: string | null): PromptTemplate;
  findTemplates(filter: PromptFilter): PromptTemplate[];
  deactivateTemplate(templateId: string): void;
  getHistory(templateId: string): PromptTemplateRevision[];
  getVersion(templateId: string, version: number): PromptTemplateRevision;
  render(input: RenderPromptInput): RenderedPrompt;
}

export function createPromptEngine(deps: {
  registry: PromptRegistry;
  validator: PromptValidator;
  renderer: PromptRenderer;
  contextInjector: ContextInjector;
}): PromptEngine {
  return {
    createTemplate(input: CreatePromptTemplateInput): PromptTemplate {
      const errors = deps.validator.validateDefinition(input.template, input.variables ?? []);
      if (errors.length > 0) {
        throw PromptError.validationFailed('Prompt template definition is invalid', errors);
      }

      const template = deps.registry.create(input);
      logger.info('prompt.engine', `Template created: ${template.key} (${template.id})`);
      return template;
    },

    updateTemplate(templateId: string, input: UpdatePromptTemplateInput): PromptTemplate {
      if (input.template !== undefined || input.variables !== undefined) {
        const existing = deps.registry.getById(templateId);
        const nextTemplate = input.template ?? existing.template;
        const nextVariables = input.variables ?? existing.variables;
        const errors = deps.validator.validateDefinition(nextTemplate, nextVariables);
        if (errors.length > 0) {
          throw PromptError.validationFailed('Prompt template definition is invalid', errors);
        }
      }

      const template = deps.registry.update(templateId, input);
      logger.info('prompt.engine', `Template updated: ${template.key} (v${template.version})`);
      return template;
    },

    getTemplate(templateId: string): PromptTemplate {
      return deps.registry.getById(templateId);
    },

    getTemplateByKey(key: string, organizationId?: string | null): PromptTemplate {
      return deps.registry.getByKey(key, organizationId);
    },

    findTemplates(filter: PromptFilter): PromptTemplate[] {
      return deps.registry.find(filter);
    },

    deactivateTemplate(templateId: string): void {
      deps.registry.deactivate(templateId);
      logger.info('prompt.engine', `Template deactivated: ${templateId}`);
    },

    getHistory(templateId: string): PromptTemplateRevision[] {
      return deps.registry.getRevisions(templateId);
    },

    getVersion(templateId: string, version: number): PromptTemplateRevision {
      return deps.registry.getRevision(templateId, version);
    },

    render(input: RenderPromptInput): RenderedPrompt {
      const template = deps.registry.getByKey(input.key, input.organizationId ?? null);

      const validation = deps.validator.validateVariables(template, input.variables);
      if (!validation.valid) {
        throw PromptError.validationFailed(
          `Missing required variables for "${input.key}": ${validation.missingVariables.join(', ')}`,
          [...validation.errors, ...validation.missingVariables.map((v) => `Missing: ${v}`)],
        );
      }

      let content = deps.renderer.render(template, input.variables);

      const contextInjected = Boolean(input.contextBlocks && input.contextBlocks.length > 0);
      if (contextInjected) {
        content = deps.contextInjector.inject(content, input.contextBlocks as PromptContextBlock[], input.maxContextTokens);
      }

      return {
        templateId: template.id,
        templateKey: template.key,
        version: template.version,
        content,
        variablesUsed: template.variables.map((v) => v.name),
        contextInjected,
      };
    },
  };
}
