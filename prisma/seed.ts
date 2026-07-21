import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' });
const db = new PrismaClient({ adapter });

const PERMISSION_DEFINITIONS: { resource: string; actions: string[] }[] = [
  { resource: 'command', actions: ['read'] },
  { resource: 'projects', actions: ['read', 'create', 'update', 'delete', 'manage', 'export'] },
  { resource: 'clients', actions: ['read', 'create', 'update', 'delete', 'manage', 'export'] },
  { resource: 'creative', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'finance', actions: ['read', 'create', 'update', 'delete', 'manage', 'export'] },
  { resource: 'team', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'memory', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'agents', actions: ['read', 'create', 'update', 'delete', 'execute', 'manage'] },
  { resource: 'settings', actions: ['read', 'update', 'manage'] },
  { resource: 'audit', actions: ['read', 'export'] },
  { resource: 'integrations', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'automations', actions: ['read', 'create', 'update', 'delete', 'execute'] },
  { resource: 'workflows', actions: ['read', 'create', 'update', 'delete', 'execute'] },
  { resource: 'api_keys', actions: ['read', 'create', 'delete', 'manage'] },
  { resource: 'billing', actions: ['read', 'manage'] },
  { resource: 'desktop', actions: ['execute', 'manage'] },
];

function allPermissionKeys(): string[] {
  return PERMISSION_DEFINITIONS.flatMap((d) => d.actions.map((a) => `${d.resource}:${a}`));
}

const ROLE_SEEDS = [
  {
    name: 'Founder',
    slug: 'founder',
    systemRole: 'FOUNDER' as const,
    isFounder: true,
    isDefault: false,
    level: 100,
    description: 'Unrestricted access to every module, record, and setting.',
    permissions: allPermissionKeys(),
  },
  {
    name: 'Administrator',
    slug: 'administrator',
    systemRole: 'ADMINISTRATOR' as const,
    isFounder: false,
    isDefault: false,
    level: 90,
    description: 'Full management access. Cannot modify founder-level settings.',
    permissions: allPermissionKeys().filter(
      (k) => !k.startsWith('billing:manage') && k !== 'settings:manage',
    ),
  },
  {
    name: 'Creative Head',
    slug: 'creative-head',
    systemRole: 'CREATIVE_HEAD' as const,
    isFounder: false,
    isDefault: false,
    level: 80,
    description: 'Manages creative pipeline, reviews, and client communication.',
    permissions: [
      'command:read',
      'projects:read',
      'projects:create',
      'projects:update',
      'projects:manage',
      'clients:read',
      'clients:create',
      'clients:update',
      'creative:read',
      'creative:create',
      'creative:update',
      'creative:delete',
      'creative:manage',
      'finance:read',
      'team:read',
      'memory:read',
      'memory:create',
      'memory:update',
      'agents:read',
      'agents:execute',
      'settings:read',
    ],
  },
  {
    name: 'Designer',
    slug: 'designer',
    systemRole: 'DESIGNER' as const,
    isFounder: false,
    isDefault: false,
    level: 50,
    description: 'Works on assigned projects. Uploads and manages design assets.',
    permissions: [
      'command:read',
      'projects:read',
      'projects:update',
      'creative:read',
      'creative:create',
      'creative:update',
      'memory:read',
      'agents:read',
      'agents:execute',
    ],
  },
  {
    name: 'Developer',
    slug: 'developer',
    systemRole: 'DEVELOPER' as const,
    isFounder: false,
    isDefault: false,
    level: 50,
    description: 'Works on assigned projects. Access to system and agent config.',
    permissions: [
      'command:read',
      'projects:read',
      'projects:update',
      'memory:read',
      'memory:create',
      'memory:update',
      'agents:read',
      'agents:execute',
      'agents:manage',
      'settings:read',
      'integrations:read',
      'automations:read',
      'automations:create',
      'automations:update',
      'automations:execute',
      'workflows:read',
      'workflows:create',
      'workflows:update',
      'workflows:execute',
      'desktop:execute',
      'desktop:manage',
    ],
  },
  {
    name: 'Intern',
    slug: 'intern',
    systemRole: 'INTERN' as const,
    isFounder: false,
    isDefault: true,
    level: 20,
    description: 'View and contribute to assigned tasks only.',
    permissions: ['command:read', 'projects:read', 'creative:read', 'memory:read'],
  },
  {
    name: 'Guest',
    slug: 'guest',
    systemRole: 'GUEST' as const,
    isFounder: false,
    isDefault: false,
    level: 10,
    description: 'Read-only access to explicitly shared resources.',
    permissions: ['command:read'],
  },
];

async function main() {
  console.log('Seeding Knottix database...');

  // 1. Upsert permissions
  const permissionMap = new Map<string, string>();
  for (const def of PERMISSION_DEFINITIONS) {
    for (const action of def.actions) {
      const key = `${def.resource}:${action}`;
      const perm = await db.permission.upsert({
        where: { key },
        update: {},
        create: {
          key,
          resource: def.resource,
          action,
          description: `${action} access for ${def.resource}`,
        },
      });
      permissionMap.set(key, perm.id);
    }
  }
  console.log(`  ${permissionMap.size} permissions seeded.`);

  // 2. Upsert default organization
  const org = await db.organization.upsert({
    where: { slug: '4-knotts' },
    update: {},
    create: {
      name: '4 Knotts',
      slug: '4-knotts',
      description: '4 Knotts — Design, Code, Create.',
      status: 'ACTIVE',
    },
  });
  console.log(`  Organization: ${org.name} (${org.id})`);

  // 3. Upsert default workspace
  const workspace = await db.workspace.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'main' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Main',
      slug: 'main',
      description: 'Primary workspace',
      status: 'ACTIVE',
    },
  });
  console.log(`  Workspace: ${workspace.name} (${workspace.id})`);

  // 4. Upsert roles and assign permissions
  for (const roleSeed of ROLE_SEEDS) {
    const role = await db.role.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug: roleSeed.slug } },
      update: {
        name: roleSeed.name,
        description: roleSeed.description,
        level: roleSeed.level,
        isFounder: roleSeed.isFounder,
        isDefault: roleSeed.isDefault,
      },
      create: {
        organizationId: org.id,
        name: roleSeed.name,
        slug: roleSeed.slug,
        systemRole: roleSeed.systemRole,
        isFounder: roleSeed.isFounder,
        isDefault: roleSeed.isDefault,
        level: roleSeed.level,
        description: roleSeed.description,
      },
    });

    for (const permKey of roleSeed.permissions) {
      const permId = permissionMap.get(permKey);
      if (!permId) continue;

      await db.rolePermission.upsert({
        where: {
          roleId_permissionId_scope_scopeId: {
            roleId: role.id,
            permissionId: permId,
            scope: 'ORGANIZATION',
            scopeId: org.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permId,
          scope: 'ORGANIZATION',
          scopeId: org.id,
        },
      });
    }

    console.log(`  Role: ${roleSeed.name} — ${roleSeed.permissions.length} permissions`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
