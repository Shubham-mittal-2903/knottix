import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/auth.config';
import { getRequiredPermissionForPath, hasPermission } from '@/lib/auth/permissions';

const { auth } = NextAuth(authConfig);

const NO_PERMISSION_CHECK = new Set(['/', '/unauthorized']);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!session?.user) {
    return NextResponse.next();
  }

  if (NO_PERMISSION_CHECK.has(pathname)) {
    return NextResponse.next();
  }

  const required = getRequiredPermissionForPath(pathname);
  if (required) {
    const { isFounder, permissions } = session.user;
    if (!hasPermission(permissions, isFounder, required)) {
      return NextResponse.redirect(new URL('/unauthorized', req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)'],
};
