const raw = process.env.DATABASE_URL;
if (!raw) throw new Error("DATABASE_URL is required for integration tests");

const url = new URL(raw);
const database = url.pathname.replace(/^\//, "");
if (!database.endsWith("_test")) {
  throw new Error("Integration DATABASE_URL must use a database whose name ends with _test");
}

const dangerous = `${url.hostname}/${database}`.toLowerCase();
if (/prod|production|primary|master/.test(dangerous)) {
  throw new Error("Refusing to run integration tests against a production-looking database URL");
}

if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required for integration tests");
