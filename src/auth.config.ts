import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" as const },
} satisfies NextAuthConfig;
