import { headers } from 'next/headers';

export async function getRequestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  return {
    ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null,
    userAgent: h.get('user-agent'),
  };
}
