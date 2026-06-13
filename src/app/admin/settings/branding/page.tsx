"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useBranding, useUpdateBranding } from "@/components/BrandingProvider";
import { isValidHex, hasLowContrast } from "@/lib/colorUtils";
import { MAX_GYM_NAME_LENGTH, DEFAULT_BRANDING, type BrandingConfig } from "@/lib/brandingShared";
import type { AppearanceMode } from "@prisma/client";
import { Loader2, Upload, RotateCcw } from "lucide-react";

const APPEARANCE_OPTIONS: { value: AppearanceMode; label: string }[] = [
  { value: "LIGHT", label: "Claro" },
  { value: "DARK", label: "Oscuro" },
  { value: "SYSTEM", label: "Automático (sistema)" },
];

export default function BrandingSettingsPage() {
  const activeUser = useCurrentUser();
  const currentBranding = useBranding();
  const updateBranding = useUpdateBranding();

  const [form, setForm] = useState<BrandingConfig>(currentBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => r.json())
      .then((data: BrandingConfig) => setForm(data))
      .finally(() => setLoading(false));
  }, []);

  if (activeUser.isLoading) return null;
  if (!activeUser.hasRole("admin")) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">Sin acceso a este módulo.</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gymName: form.gymName,
          primaryColor: form.primaryColor,
          accentColor: form.accentColor,
          appearanceMode: form.appearanceMode,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Error al guardar", false);
        return;
      }
      const updated = await res.json();
      setForm((prev) => ({ ...prev, ...updated }));
      updateBranding(updated);
      showToast("Cambios guardados");
    } catch {
      showToast("Error al guardar", false);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/branding/logo", { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Error al subir el logo", false);
        return;
      }
      const data = await res.json();
      setForm((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      updateBranding({ logoUrl: data.logoUrl });
      showToast("Logo actualizado");
    } catch {
      showToast("Error al subir el logo", false);
    } finally {
      setUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    setUploading(true);
    try {
      const res = await fetch("/api/branding/logo", { method: "DELETE" });
      if (!res.ok) {
        showToast("Error al quitar el logo", false);
        return;
      }
      const data = await res.json();
      setForm((prev) => ({ ...prev, logoUrl: data.logoUrl }));
      updateBranding({ logoUrl: data.logoUrl });
      showToast("Logo quitado");
    } catch {
      showToast("Error al quitar el logo", false);
    } finally {
      setUploading(false);
    }
  };

  const handleRestoreDefaults = async () => {
    setRestoring(true);
    try {
      const res = await fetch("/api/branding", { method: "DELETE" });
      if (!res.ok) {
        showToast("Error al restaurar valores predeterminados", false);
        return;
      }
      const data = await res.json();
      setForm(data);
      updateBranding(data);
      showToast("Valores predeterminados restaurados");
    } catch {
      showToast("Error al restaurar valores predeterminados", false);
    } finally {
      setRestoring(false);
      setConfirmRestore(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  const gymNameValid = form.gymName.trim().length > 0 && form.gymName.length <= MAX_GYM_NAME_LENGTH;
  const primaryValid = isValidHex(form.primaryColor);
  const accentValid = isValidHex(form.accentColor);
  const canSave = gymNameValid && primaryValid && accentValid;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Apariencia</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Personaliza el nombre, logo y colores del gimnasio.
        </p>
      </div>

      {/* Logo */}
      <section className="rounded-2xl border p-4 sm:p-6 space-y-4" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Logo</h2>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border"
            style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
          >
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logoUrl} alt={form.gymName} className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Sin logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50"
                style={{ borderColor: "var(--card-border)", color: "var(--text-primary)" }}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Subiendo..." : "Subir logo"}
              </button>
              {form.logoUrl !== DEFAULT_BRANDING.logoUrl && (
                <button
                  onClick={handleLogoRemove}
                  disabled={uploading}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                >
                  Quitar logo
                </button>
              )}
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              PNG, JPG o WebP. Máximo 2MB.
            </p>
          </div>
        </div>
      </section>

      {/* Gym name */}
      <section className="rounded-2xl border p-4 sm:p-6 space-y-3" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Nombre del gimnasio</h2>
        <input
          type="text"
          value={form.gymName}
          onChange={(e) => setForm((prev) => ({ ...prev, gymName: e.target.value }))}
          maxLength={MAX_GYM_NAME_LENGTH}
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{ background: "var(--background)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
        />
        <p className="text-xs" style={{ color: gymNameValid ? "var(--text-muted)" : "var(--color-error)" }}>
          {form.gymName.length}/{MAX_GYM_NAME_LENGTH} caracteres
        </p>
      </section>

      {/* Colors */}
      <section className="rounded-2xl border p-4 sm:p-6 space-y-4" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Colores de marca</h2>

        <ColorField
          label="Color primario"
          value={form.primaryColor}
          onChange={(v) => setForm((prev) => ({ ...prev, primaryColor: v }))}
        />
        <ColorField
          label="Color de acento"
          value={form.accentColor}
          onChange={(v) => setForm((prev) => ({ ...prev, accentColor: v }))}
        />
      </section>

      {/* Appearance mode */}
      <section className="rounded-2xl border p-4 sm:p-6 space-y-3" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Modo de apariencia</h2>
        <div className="flex flex-wrap gap-2">
          {APPEARANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setForm((prev) => ({ ...prev, appearanceMode: opt.value }))}
              className="px-4 py-2 rounded-lg text-sm font-semibold border transition-colors"
              style={
                form.appearanceMode === opt.value
                  ? { background: "var(--brand-primary)", borderColor: "var(--brand-primary)", color: "#000" }
                  : { borderColor: "var(--card-border)", color: "var(--text-secondary)" }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setConfirmRestore(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors"
          style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
        >
          <RotateCcw className="w-4 h-4" />
          Restaurar valores predeterminados
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ background: "var(--brand-primary)", color: "#000" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Guardar cambios
        </button>
      </div>

      {/* Restore confirmation */}
      <AnimatePresence>
        {confirmRestore && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setConfirmRestore(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border p-5 space-y-4"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Restaurar valores predeterminados</h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Esto restaurará el nombre, logo, colores y modo de apariencia a los valores de Primary Performance. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmRestore(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRestoreDefaults}
                  disabled={restoring}
                  className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--color-error)", color: "#fff" }}
                >
                  {restoring ? "Restaurando..." : "Restaurar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-semibold z-50 shadow-2xl"
            style={toast.ok ? { background: "#22c55e", color: "#fff" } : { background: "#ef4444", color: "#fff" }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = isValidHex(value);
  const lowContrast = valid && hasLowContrast(value);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border cursor-pointer shrink-0"
          style={{ borderColor: "var(--card-border)", background: "transparent" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-2 rounded-lg border text-sm font-mono"
          style={{
            background: "var(--background)",
            borderColor: valid ? "var(--card-border)" : "var(--color-error)",
            color: "var(--text-primary)",
          }}
        />
      </div>
      {!valid && (
        <p className="text-xs" style={{ color: "var(--color-error)" }}>
          Debe ser un color hexadecimal válido (ej: #4fc3f7)
        </p>
      )}
      {lowContrast && (
        <p className="text-xs" style={{ color: "var(--color-warning)" }}>
          Este color tiene bajo contraste y puede ser difícil de leer.
        </p>
      )}
    </div>
  );
}
