import type {
  CreatePromptTemplateInput,
  PromptFilter,
  PromptTemplate,
  PromptTemplateRevision,
  UpdatePromptTemplateInput,
} from '../types';
import { PromptError } from '../errors';

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

export interface PromptRegistry {
  create(input: CreatePromptTemplateInput): PromptTemplate;
  update(templateId: string, input: UpdatePromptTemplateInput): PromptTemplate;
  getById(templateId: string): PromptTemplate;
  getByKey(key: string, organizationId?: string | null): PromptTemplate;
  find(filter: PromptFilter): PromptTemplate[];
  deactivate(templateId: string): void;
  getRevisions(templateId: string): PromptTemplateRevision[];
  getRevision(templateId: string, version: number): PromptTemplateRevision;
  exists(key: string, organizationId?: string | null): boolean;
  seed(template: PromptTemplate, revisions?: PromptTemplateRevision[]): void;
}

export function createPromptRegistry(): PromptRegistry {
  const templatesById = new Map<string, PromptTemplate>();
  const templatesByKey = new Map<string, string>();
  const revisions = new Map<string, PromptTemplateRevision[]>();

  function scopedKey(key: string, organizationId?: string | null): string {
    return `${organizationId ?? 'global'}::${key}`;
  }

  function pushRevision(template: PromptTemplate, changedBy: string | null, changeReason: string | null): void {
    const revision: PromptTemplateRevision = {
      id: generateId('promptrev'),
      templateId: template.id,
      version: template.version,
      template: template.template,
      variables: [...template.variables],
      changedBy,
      changedAt: Date.now(),
      changeReason,
    };
    const list = revisions.get(template.id) ?? [];
    list.push(revision);
    revisions.set(template.id, list);
  }

  return {
    create(input: CreatePromptTemplateInput): PromptTemplate {
      const sk = scopedKey(input.key, input.organizationId ?? null);
      if (templatesByKey.has(sk)) {
        throw PromptError.duplicateKey(input.key);
      }

      const now = Date.now();
      const template: PromptTemplate = {
        id: generateId('prompt'),
        key: input.key,
        name: input.name,
        description: input.description,
        category: input.category,
        template: input.template,
        variables: input.variables ?? [],
        version: 1,
        organizationId: input.organizationId ?? null,
        createdBy: input.createdBy ?? null,
        updatedBy: input.createdBy ?? null,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      };

      templatesById.set(template.id, template);
      templatesByKey.set(sk, template.id);
      pushRevision(template, template.createdBy, 'Created');

      return { ...template };
    },

    update(templateId: string, input: UpdatePromptTemplateInput): PromptTemplate {
      const template = templatesById.get(templateId);
      if (!template) throw PromptError.templateNotFound(templateId);

      if (input.name !== undefined) template.name = input.name;
      if (input.description !== undefined) template.description = input.description;
      if (input.template !== undefined) template.template = input.template;
      if (input.variables !== undefined) template.variables = input.variables;
      if (input.isActive !== undefined) template.isActive = input.isActive;

      template.updatedBy = input.updatedBy ?? null;
      template.updatedAt = Date.now();
      template.version += 1;

      pushRevision(template, input.updatedBy ?? null, input.changeReason ?? null);

      return { ...template };
    },

    getById(templateId: string): PromptTemplate {
      const template = templatesById.get(templateId);
      if (!template) throw PromptError.templateNotFound(templateId);
      return { ...template };
    },

    getByKey(key: string, organizationId?: string | null): PromptTemplate {
      const sk = scopedKey(key, organizationId ?? null);
      let id = templatesByKey.get(sk);

      if (!id && organizationId) {
        id = templatesByKey.get(scopedKey(key, null));
      }

      if (!id) throw PromptError.templateNotFound(key);

      const template = templatesById.get(id);
      if (!template) throw PromptError.templateNotFound(key);
      if (!template.isActive) throw PromptError.templateInactive(key);

      return { ...template };
    },

    find(filter: PromptFilter): PromptTemplate[] {
      return Array.from(templatesById.values())
        .filter((t) => {
          if (filter.category && t.category !== filter.category) return false;
          if (filter.organizationId !== undefined && t.organizationId !== filter.organizationId) return false;
          if (filter.isActive !== undefined && t.isActive !== filter.isActive) return false;
          if (filter.search) {
            const lower = filter.search.toLowerCase();
            if (!t.name.toLowerCase().includes(lower) && !t.key.toLowerCase().includes(lower)) return false;
          }
          return true;
        })
        .map((t) => ({ ...t }));
    },

    deactivate(templateId: string): void {
      const template = templatesById.get(templateId);
      if (!template) throw PromptError.templateNotFound(templateId);
      template.isActive = false;
      template.updatedAt = Date.now();
    },

    getRevisions(templateId: string): PromptTemplateRevision[] {
      if (!templatesById.has(templateId)) throw PromptError.templateNotFound(templateId);
      return (revisions.get(templateId) ?? []).map((r) => ({ ...r }));
    },

    getRevision(templateId: string, version: number): PromptTemplateRevision {
      const list = revisions.get(templateId) ?? [];
      const found = list.find((r) => r.version === version);
      if (!found) throw PromptError.versionNotFound(templateId, version);
      return { ...found };
    },

    exists(key: string, organizationId?: string | null): boolean {
      return templatesByKey.has(scopedKey(key, organizationId ?? null));
    },

    seed(template: PromptTemplate, seededRevisions: PromptTemplateRevision[] = []): void {
      templatesById.set(template.id, { ...template });
      templatesByKey.set(scopedKey(template.key, template.organizationId), template.id);
      if (seededRevisions.length > 0) {
        revisions.set(template.id, seededRevisions.map((r) => ({ ...r })));
      }
    },
  };
}
