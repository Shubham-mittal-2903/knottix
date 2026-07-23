import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { verifyPassword } from './password';
import { findUserByEmail, resolveMemberSession, updateLastLogin } from '@/lib/db/queries/auth';
import { authConfig } from './auth.config';

/** Google only ever authenticates against an EXISTING, already-seeded Knottix `User` row (matched
 *  by email) — it never auto-provisions an account for an arbitrary Google sign-in. Knottix has no
 *  self-serve signup; every real member is created deliberately (via db:seed / an invite flow), so
 *  Google is just an alternate credential for people already on the team, not a new front door. */
export const fullAuthConfig = {
  ...authConfig,
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
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
    /** Gates Google sign-in to emails that already have a real, active Knottix `User` row —
     *  denies everyone else outright rather than silently creating an account. Mutates `user.id`
     *  to our internal id (Google's own `sub` isn't a Knottix id) so the `jwt` callback below can
     *  treat both providers identically. */
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true;
      const email = user.email;
      if (!email) return false;

      const existing = await findUserByEmail(email);
      if (!existing || existing.status === 'SUSPENDED' || existing.status === 'DEACTIVATED') return false;

      user.id = existing.id;
      await updateLastLogin(existing.id);
      return true;
    },
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
