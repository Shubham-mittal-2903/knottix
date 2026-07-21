import type { SessionUser } from '@/types';

export const DEMO_ORGANIZATION = { id: 'demo-org', name: '4 Knotts' };

export const DEMO_WORKSPACES = [{ id: 'demo-workspace', name: 'Main' }];

/**
 * The identity used when Demo Mode is on and no real Auth.js session exists — lets a
 * presentation run end-to-end with no database, no seeded user, and no password to type
 * in front of an audience. `getCurrentUser()` only falls back to this after a real session
 * lookup comes back empty, so a live database + real login still takes priority whenever one
 * is available.
 */
export const DEMO_SESSION_USER: SessionUser = {
  id: 'demo-member-1',
  email: 'shubham@4knotts.com',
  name: 'Shubham Mittal',
  avatarUrl: null,
  memberId: 'demo-member-1',
  organizationId: 'demo-org',
  organizationSlug: '4-knotts',
  workspaceId: 'demo-workspace',
  roleId: 'demo-role-founder',
  systemRole: 'FOUNDER',
  isFounder: true,
  permissions: [],
};
