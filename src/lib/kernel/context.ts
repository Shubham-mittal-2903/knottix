import type { AppContext, OrganizationContext, RequestContext, SessionContext, WorkspaceContext } from './types';

export function createAppContext(name: string, version: string, environment: string): AppContext {
  return { name, version, environment };
}

export function createRequestContext(
  app: AppContext,
  session: SessionContext,
  organization: OrganizationContext,
  workspace: WorkspaceContext | null,
): RequestContext {
  return { app, organization, workspace, session };
}
