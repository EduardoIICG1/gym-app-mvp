"use client";

import { useState, useEffect } from "react";
import { currentUser, mockMembers } from "./mock-data";
import type { User, MemberRole } from "./types";

const STORAGE_KEY = "pp_dev_role";
export type EditableRole = "admin" | "coach" | "member";

export function useCurrentUser(): User & {
  roles: MemberRole[];
  hasRole: (r: MemberRole) => boolean;
  changeRole: (r: EditableRole) => void;
} {
  const [role, setRole] = useState<EditableRole>(currentUser.role as EditableRole);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as EditableRole | null;
    if (stored && ["admin", "coach", "member"].includes(stored)) {
      setRole(stored);
    }

    const handler = (e: Event) => {
      setRole((e as CustomEvent<EditableRole>).detail);
    };
    window.addEventListener("pp:roleChange", handler);
    return () => window.removeEventListener("pp:roleChange", handler);
  }, []);

  const changeRole = (r: EditableRole) => {
    localStorage.setItem(STORAGE_KEY, r);
    setRole(r);
    window.dispatchEvent(new CustomEvent<EditableRole>("pp:roleChange", { detail: r }));
  };

  // Derive all roles from the member record
  const member = mockMembers.find(m => m.id === currentUser.id);
  const baseRoles: MemberRole[] = member ? member.roles : [currentUser.role as MemberRole];

  // When DevPanel switches primary role:
  // - If it's one of the user's real roles, show all real roles
  // - If simulating a different persona, show only that role
  const roles: MemberRole[] = baseRoles.includes(role) ? baseRoles : [role];

  const hasRole = (r: MemberRole): boolean => roles.includes(r);

  return { ...currentUser, role, roles, hasRole, changeRole };
}
