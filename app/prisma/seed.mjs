import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error("Demo seed is disabled. Set ALLOW_DEMO_SEED=true only in development/test.");
}

const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD;
if (!email || !password || password.length < 12) {
  throw new Error("SEED_ADMIN_EMAIL and a 12+ character SEED_ADMIN_PASSWORD are required.");
}

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    console.log("Bootstrap admin already exists; seed made no credential or role changes.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.profile.create({
    data: {
      email,
      passwordHash,
      emailVerified: true,
      fullName: process.env.SEED_ADMIN_NAME?.trim() || "Bootstrap Admin",
      role: UserRole.SUPER_ADMIN,
      mustChangePassword: true,
    },
  });
  console.log("Created one bootstrap administrator; rotate bootstrap credentials at first login.");
}

main()
  .catch((error) => {
    console.error("Seed failed", error instanceof Error ? error.name : "unknown");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
