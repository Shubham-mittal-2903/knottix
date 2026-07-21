import type { SystemRole } from '@/types';

export const SYSTEM_ROLES: Record<
  SystemRole,
  { label: string; level: number; description: string }
> = {
  FOUNDER: {
    label: 'Founder',
    level: 100,
    description: 'Unrestricted access to every module, record, and setting.',
  },
  ADMINISTRATOR: {
    label: 'Administrator',
    level: 90,
    description: 'Full management access. Cannot modify founder-level settings.',
  },
  CREATIVE_HEAD: {
    label: 'Creative Head',
    level: 80,
    description: 'Manages creative pipeline, reviews, and client communication.',
  },
  DESIGNER: {
    label: 'Designer',
    level: 50,
    description: 'Works on assigned projects. Uploads and manages design assets.',
  },
  DEVELOPER: {
    label: 'Developer',
    level: 50,
    description: 'Works on assigned projects. Access to system and agent config.',
  },
  INTERN: {
    label: 'Intern',
    level: 20,
    description: 'View and contribute to assigned tasks only.',
  },
  GUEST: {
    label: 'Guest',
    level: 10,
    description: 'Read-only access to explicitly shared resources.',
  },
} as const;

export const ALL_SYSTEM_ROLES: SystemRole[] = Object.keys(SYSTEM_ROLES) as SystemRole[];
