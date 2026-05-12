import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

const { combinedEnv } = loadEnvConfig(process.cwd());

export default defineConfig({
  datasource: {
    url: combinedEnv["DIRECT_URL"]!,
  },
});
