"use client";

import { useState, useEffect } from "react";
import { currentUser } from "./mock-data";
import type { User } from "./types";

const STORAGE_KEY = "pp_dev_role";
export type EditableRole = "admin" | "coach" | "member";

/**
 * Hook que retorna el usuario actual con rol reactivo.
 * El rol puede cambiarse en tiempo de ejecución vía localStorage
 * para probar diferentes vistas sin tocar código.
 */
export function useCurrentUser(): User & { changeRole: (r: EditableRole) => void } {
  // Inicializar con el rol estático — evita mismatch de hidratación
  const [role, setRole] = useState<EditableRole>(currentUser.role as EditableRole);

  useEffect(() => {
    // Leer localStorage solo en cliente, después del primer render
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

  return { ...currentUser, role, changeRole };
}
