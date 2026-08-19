import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const prisma = new PrismaClient();
try {
  const migrations = await prisma.$queryRawUnsafe(
    "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name = ?",
    "20260721090000_add_transactional_outbox",
  );
  const tables = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS count_value FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'outbox_events'",
  );
  const indexes = await prisma.$queryRawUnsafe(
    "SELECT DISTINCT index_name AS indexName, non_unique AS nonUnique FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'outbox_events' ORDER BY index_name",
  );
  const failed = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS count_value FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL",
  );

  console.log(JSON.stringify({
    migrationPresent: migrations.length === 1,
    migrationFinished: Boolean(migrations[0]?.finished_at),
    migrationRolledBack: Boolean(migrations[0]?.rolled_back_at),
    tablePresent: Number(tables[0]?.count_value) === 1,
    indexes: indexes.map((index) => ({ name: index.indexName, unique: Number(index.nonUnique) === 0 })),
    failedMigrations: Number(failed[0]?.count_value),
  }));
} finally {
  await prisma.$disconnect();
}
