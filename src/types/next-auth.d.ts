import type { DefaultSession } from 'next-auth';
import type { SystemRole } from '@/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      memberId: string;
      organizationId: string;
      organizationSlug: string;
      workspaceId: string | null;
      roleId: string;
      systemRole: SystemRole | null;
      isFounder: boolean;
      permissions: string[];
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    status: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    memberId: string;
    organizationId: string;
    organizationSlug: string;
    workspaceId: string | null;
    roleId: string;
    systemRole: SystemRole | null;
    isFounder: boolean;
    permissions: string[];
  }
}
