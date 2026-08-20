import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed process...');

  // 1. Clean up database
  console.log('Cleaning up existing data...');
  await prisma.notification.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.deliveryRecord.deleteMany({});
  await prisma.deliveryAssignment.deleteMany({});
  await prisma.packingRecord.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.prescription.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

  // 2. Seed Roles
  console.log('Seeding roles...');
  const adminRole = await prisma.role.create({
    data: { name: 'ADMIN', description: 'System Administrator with full access' },
  });
  const receiverRole = await prisma.role.create({
    data: { name: 'CALL_RECEIVER', description: 'Staff logging customer details and prescriptions' },
  });
  const billerRole = await prisma.role.create({
    data: { name: 'BILLER', description: 'Staff generating bills and uploading proofs' },
  });
  const packerRole = await prisma.role.create({
    data: { name: 'PACKER', description: 'Staff packaging orders and uploading proofs' },
  });
  const teamRole = await prisma.role.create({
    data: { name: 'DELIVERY_TEAM', description: 'Staff managing dispatching and assignments' },
  });
  const riderRole = await prisma.role.create({
    data: { name: 'DELIVERY_BOY', description: 'Riders executing deliveries' },
  });

  // 3. Seed Users
  console.log('Seeding users...');
  
  const usersToSeed = [
    {
      username: 'admin',
      email: 'admin@pharmacy.com',
      password: 'admin',
      fullName: 'Dr. Arthur Pendelton',
      roleId: adminRole.id,
    },
    {
      username: 'receiver',
      email: 'receiver@pharmacy.com',
      password: 'receiver',
      fullName: 'Clara Oswald',
      roleId: receiverRole.id,
    },
    {
      username: 'biller',
      email: 'biller@pharmacy.com',
      password: 'biller',
      fullName: 'Bill Potts',
      roleId: billerRole.id,
    },
    {
      username: 'packer',
      email: 'packer@pharmacy.com',
      password: 'packer',
      fullName: 'Rose Tyler',
      roleId: packerRole.id,
    },
    {
      username: 'team',
      email: 'team@pharmacy.com',
      password: 'team',
      fullName: 'Martha Jones',
      roleId: teamRole.id,
    },
    {
      username: 'rider',
      email: 'rider@pharmacy.com',
      password: 'rider',
      fullName: 'Jack Harkness',
      roleId: riderRole.id,
    },
  ];

  for (const u of usersToSeed) {
    const passwordHash = bcrypt.hashSync(u.password, 10);
    const user = await prisma.user.create({
      data: {
        username: u.username,
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        roleId: u.roleId,
      },
    });
    console.log(`Created user: ${user.username} with role ${u.username.toUpperCase()}`);
  }

  console.log('Seed process completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
