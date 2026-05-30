"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import type { User, MemberRole } from "./types";

const STORAGE_KEY = "pp_dev_role";
export type EditableRole = "admin" | "coach" | "member" | "kinesiologist";

// Map DB Role enum values to frontend lowercase role strings
const DB_ROLE_MAP: Record<string, EditableRole> = {
  ADMIN: "admin",
  COACH: "coach",
  MEMBER: "member",
  KINESIOLOGIST: "kinesiologist",
};

export function useCurrentUser(): User & {
  roles: MemberRole[];
  hasRole: (r: MemberRole) => boolean;
  changeRole: (r: EditableRole) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
} {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  // Real role from NextAuth session, mapped to frontend convention
  const sessionRole: EditableRole = session?.user?.role
    ? (DB_ROLE_MAP[session.user.role] ?? "member")
    : "member";

  const isDev = process.env.NODE_ENV === "development";

  // DevPanel role override via localStorage — dev only
  const [roleOverride, setRoleOverride] = useState<EditableRole | null>(null);

  useEffect(() => {
    if (!isDev) return;
    const stored = localStorage.getItem(STORAGE_KEY) as EditableRole | null;
    if (stored && ["admin", "coach", "member", "kinesiologist"].includes(stored)) {
      setRoleOverride(stored);
    }
    const handler = (e: Event) => {
      setRoleOverride((e as CustomEvent<EditableRole>).detail);
    };
    window.addEventListener("pp:roleChange", handler);
    return () => window.removeEventListener("pp:roleChange", handler);
  }, [isDev]);

  const changeRole = (r: EditableRole) => {
    if (!isDev) return;
    localStorage.setItem(STORAGE_KEY, r);
    setRoleOverride(r);
    window.dispatchEvent(new CustomEvent<EditableRole>("pp:roleChange", { detail: r }));
  };

  // In production roleOverride is always null; role comes exclusively from session
  const role = (isDev ? roleOverride : null) ?? sessionRole;
  const roles: MemberRole[] = [role];
  const hasRole = (r: MemberRole): boolean => roles.includes(r);

  return {
    id:    session?.user?.id    ?? "",
    name:  session?.user?.name  ?? "",
    email: session?.user?.email ?? "",
    role,
    roles,
    hasRole,
    changeRole,
    isLoading,
    isAuthenticated,
  };
}
