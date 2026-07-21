import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verifyPassword } from './password';
import { findUserByEmail, resolveMemberSession, updateLastLogin } from '@/lib/db/queries/auth';
import { authConfig } from './auth.config';

export const fullAuthConfig = {
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user || !user.passwordHash) return null;

        if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        await updateLastLogin(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        const memberSession = await resolveMemberSession(user.id);
        if (!memberSession) {
          throw new Error('NoActiveMembership');
        }
        token.id = user.id as string;
        token.memberId = memberSession.memberId;
        token.organizationId = memberSession.organizationId;
        token.organizationSlug = memberSession.organizationSlug;
        token.workspaceId = memberSession.workspaceId;
        token.roleId = memberSession.roleId;
        token.systemRole = memberSession.systemRole as import('@/types').SystemRole | null;
        token.isFounder = memberSession.isFounder;
        token.permissions = memberSession.permissions;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.memberId = token.memberId;
      session.user.organizationId = token.organizationId;
      session.user.organizationSlug = token.organizationSlug;
      session.user.workspaceId = token.workspaceId;
      session.user.roleId = token.roleId;
      session.user.systemRole = token.systemRole;
      session.user.isFounder = token.isFounder;
      session.user.permissions = token.permissions;
      return session;
    },
  },
} satisfies NextAuthConfig;
