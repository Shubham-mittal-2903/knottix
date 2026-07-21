import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { PromptRegistry } from '../registry/prompt-registry';
import type {
  CreatePromptTemplateInput,
  PromptTemplate,
  PromptTemplateRevision,
  PromptVariableDefinition,
  UpdatePromptTemplateInput,
} from '../types';
import { fireAndForget } from '@/lib/db/persist';
import { logger } from '@/lib/logger';

export interface PersistedPromptRegistry extends PromptRegistry {
  hydrate(): Promise<number>;
}

function toRow(template: PromptTemplate) {
  return {
    id: template.id,
    organizationId: template.organizationId,
    name: template.name,
    slug: template.key,
    description: template.description,
    content: template.template,
    variables: template.variables as unknown as Prisma.InputJsonValue,
    category: template.category,
    version: template.version,
    isActive: template.isActive,
    createdBy: template.createdBy,
    updatedBy: template.updatedBy,
  };
}

export function createPersistedPromptRegistry(base: PromptRegistry, db: PrismaClient): PersistedPromptRegistry {
  function persist(template: PromptTemplate): void {
    fireAndForget(`prompt:${template.key}`, async () => {
      const row = toRow(template);
      await db.promptTemplate.upsert({ where: { id: template.id }, create: row, update: row });

      const revisions = base.getRevisions(template.id);
      const latest = revisions[revisions.length - 1];
      if (latest) {
        await db.promptTemplateRevision.upsert({
          where: { templateId_version: { templateId: latest.templateId, version: latest.version } },
          create: {
            templateId: latest.templateId,
            version: latest.version,
            content: latest.template,
            variables: latest.variables as unknown as Prisma.InputJsonValue,
            changedBy: latest.changedBy,
            changeReason: latest.changeReason,
          },
          update: {},
        });
      }
    });
  }

  return {
    ...base,

    create(input: CreatePromptTemplateInput): PromptTemplate {
      const template = base.create(input);
      persist(template);
      return template;
    },

    update(templateId: string, input: UpdatePromptTemplateInput): PromptTemplate {
      const template = base.update(templateId, input);
      persist(template);
      return template;
    },

    deactivate(templateId: string): void {
      base.deactivate(templateId);
      persist(base.getById(templateId));
    },

    async hydrate(): Promise<number> {
      const rows = await db.promptTemplate.findMany({
        include: { revisions: { orderBy: { version: 'asc' } } },
      });

      for (const row of rows) {
        const template: PromptTemplate = {
          id: row.id,
          key: row.slug,
          name: row.name,
          description: row.description ?? '',
          category: (row.category as PromptTemplate['category']) ?? 'general',
          template: row.content,
          variables: (row.variables as PromptVariableDefinition[] | null) ?? [],
          version: row.version,
          organizationId: row.organizationId,
          createdBy: row.createdBy,
          updatedBy: row.updatedBy,
          createdAt: row.createdAt.getTime(),
          updatedAt: row.updatedAt.getTime(),
          isActive: row.isActive,
        };

        const revisions: PromptTemplateRevision[] = row.revisions.map((r) => ({
          id: r.id,
          templateId: r.templateId,
          version: r.version,
          template: r.content,
          variables: (r.variables as PromptVariableDefinition[] | null) ?? [],
          changedBy: r.changedBy,
          changedAt: r.changedAt.getTime(),
          changeReason: r.changeReason,
        }));

        base.seed(template, revisions);
      }

      logger.info('prompt.persistence', `Hydrated ${rows.length} prompt templates from database`);
      return rows.length;
    },
  };
}
