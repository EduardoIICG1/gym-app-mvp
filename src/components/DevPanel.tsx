"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrentUser, type EditableRole } from "@/lib/useCurrentUser";

const ROLES: EditableRole[] = ["admin", "coach", "member"];

const ROLE_LABELS: Record<EditableRole, string> = {
  admin: "Admin",
  coach: "Coach",
  member: "Miembro",
};

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const user = useCurrentUser();

  // Shift+D toggles the panel — only access point, no visible trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "D") {
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside closes the panel
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Nothing rendered when closed — zero DOM presence
  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-4 right-4 z-50 rounded-xl p-4 shadow-2xl w-48"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
        Dev — Rol
      </p>
      <div className="flex gap-1">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => user.changeRole(r)}
            className="flex-1 text-[10px] py-1.5 rounded font-medium transition-colors"
            style={
              user.role === r
                ? { background: "var(--card-border)", color: "var(--text-primary)" }
                : { color: "var(--text-secondary)" }
            }
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  );
}
