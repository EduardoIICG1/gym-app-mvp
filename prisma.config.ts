import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Load from .env.local (Next.js convention) instead of .env
const { combinedEnv } = loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: combinedEnv["DATABASE_URL"]!,
    // directUrl is used by Prisma Migrate to bypass PgBouncer
    ...(combinedEnv["DIRECT_URL"] ? { directUrl: combinedEnv["DIRECT_URL"] } : {}),
  },
});
