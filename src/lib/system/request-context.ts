import { findOrganizationById } from '@/lib/db/queries/organization';
import { findWorkspaceById } from '@/lib/db/queries/workspace';
import { getSystem, ensureOrganizationReady, type KnottixSystem } from './bootstrap';
import { AppError } from '@/lib/errors';
import type { SessionUser } from '@/types';
import type { IntelligenceContext } from '@/lib/intelligence';

/**
 * Builds the `IntelligenceContext` every server-side AI/Tool/Workflow entry point needs —
 * extracted from `api/agents/[key]/route.ts` so the Command Center's route can reuse the exact
 * same organization/workspace lookup + `kernel.createRequestContext` + `intelligence.context.build`
 * glue instead of a second copy of it.
 */
export async function buildIntelligenceContext(
  user: SessionUser,
  module: string,
  conversationId?: string,
): Promise<{ system: KnottixSystem; context: IntelligenceContext }> {
  const organization = await findOrganizationById(user.organizationId);
  if (!organization) throw AppError.notFound('Organization', user.organizationId);

  const workspace = user.workspaceId ? await findWorkspaceById(user.workspaceId) : null;

  const system = await getSystem();
  await ensureOrganizationReady(system, organization.id);

  const requestContext = system.kernel.createRequestContext(
    {
      userId: user.id,
      memberId: user.memberId,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      isFounder: user.isFounder,
      permissions: user.permissions,
    },
    { id: organization.id, slug: organization.slug, name: organization.name },
    workspace ? { id: workspace.id, slug: workspace.slug, name: workspace.name, organizationId: workspace.organizationId } : null,
  );

  const context = system.intelligence.context.build({ request: requestContext, module, conversationId });
  return { system, context };
}
