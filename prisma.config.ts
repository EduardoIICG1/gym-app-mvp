import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

const { combinedEnv } = loadEnvConfig(process.cwd());

export default defineConfig({
  datasource: {
    url: combinedEnv["DIRECT_URL"]!,
  },
  migrations: {
    seed: "cross-env NODE_TLS_REJECT_UNAUTHORIZED=0 tsx prisma/seed.ts",
  },
});
