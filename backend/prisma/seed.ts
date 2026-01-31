/**
 * Database seed script
 * Creates the initial admin user for first-time setup
 *
 * Usage: npx ts-node prisma/seed.ts
 * Or via package.json: npm run db:seed
 */

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });

  if (existingAdmin) {
    console.log(`Admin user already exists: ${existingAdmin.email}`);
    return;
  }

  // Create initial admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@health.qld.gov.au';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      firstName: 'Admin',
      surname: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`Created admin user: ${admin.email} (ID: ${admin.id})`);
  console.log('IMPORTANT: Change the admin password after first login!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
