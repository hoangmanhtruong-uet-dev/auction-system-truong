/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient, UserRole } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@autobid.vn").trim().toLowerCase();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  await prisma.profile.updateMany({
    where: {
      role: UserRole.SUPER_ADMIN,
      email: { not: SUPER_ADMIN_EMAIL },
    },
    data: {
      role: UserRole.USER,
    },
  });

  const admin = await prisma.profile.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      fullName: "Admin System",
      phone: "0900000000",
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
      deletedAt: null,
      sessionVersion: 0,
      passwordHash,
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash,
      emailVerified: true,
      fullName: "Admin System",
      phone: "0900000000",
      role: UserRole.SUPER_ADMIN,
      sessionVersion: 0,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
  });

  console.log("Seeded super admin:", admin.email);
  console.log("Password: password123");
}

main()
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
