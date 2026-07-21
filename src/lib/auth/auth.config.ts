import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isLoginPage = pathname === '/login';

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL('/command', request.nextUrl));
        return true;
      }

      return isLoggedIn;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  providers: [],
} satisfies NextAuthConfig;
