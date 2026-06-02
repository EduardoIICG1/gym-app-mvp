"use client";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="rounded-xl p-6 border" style={{ background: "var(--card)", borderColor: "#ef444430" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#ef4444" }}>
          Error cargando perfil — diagnóstico UAT
        </p>
        <p className="text-sm font-mono mb-4" style={{ color: "var(--text-primary)" }}>
          {error.message || "Error desconocido"}
        </p>
        {error.stack && (
          <pre className="text-xs overflow-auto p-3 rounded mb-4" style={{ background: "rgba(0,0,0,0.3)", color: "#f87171", maxHeight: "300px" }}>
            {error.stack}
          </pre>
        )}
        {error.digest && (
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            digest: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="text-xs px-4 py-2 rounded-lg font-semibold"
          style={{ background: "#4fc3f720", color: "#4fc3f7" }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
