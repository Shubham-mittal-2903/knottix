import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' });
const db = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4];

  if (!email || !password || !name) {
    console.error('Usage: npx tsx prisma/create-founder.ts <email> <password> <name>');
    process.exit(1);
  }

  const org = await db.organization.findUnique({ where: { slug: '4-knotts' } });
  if (!org) {
    console.error('Organization "4-knotts" not found. Run seed first: npm run db:seed');
    process.exit(1);
  }

  const founderRole = await db.role.findFirst({
    where: { organizationId: org.id, systemRole: 'FOUNDER' },
  });
  if (!founderRole) {
    console.error('Founder role not found. Run seed first: npm run db:seed');
    process.exit(1);
  }

  const workspace = await db.workspace.findFirst({
    where: { organizationId: org.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.upsert({
    where: { email },
    update: { name, passwordHash, status: 'ACTIVE' },
    create: {
      email,
      passwordHash,
      name,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  const member = await db.member.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: { roleId: founderRole.id, status: 'ACTIVE' },
    create: {
      userId: user.id,
      organizationId: org.id,
      roleId: founderRole.id,
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });

  if (workspace) {
    await db.workspace.update({
      where: { id: workspace.id },
      data: { members: { connect: { id: member.id } } },
    });
  }

  console.log(`Founder created: ${name} <${email}>`);
  console.log(`  User ID: ${user.id}`);
  console.log(`  Member ID: ${member.id}`);
  console.log(`  Organization: ${org.name}`);
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
