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
      <div className="rounded-xl p-6 border text-center" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          No pudimos cargar tu perfil
        </p>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Intenta de nuevo en unos segundos. Si el problema continúa, vuelve a iniciar sesión.
        </p>
        <button
          onClick={reset}
          className="text-xs px-4 py-2 rounded-lg font-semibold"
          style={{ background: "#4fc3f720", color: "#4fc3f7" }}
        >
          Reintentar
        </button>
        <details className="mt-4 text-left">
          <summary className="text-xs cursor-pointer" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
            Detalles técnicos
          </summary>
          <p className="text-xs font-mono mt-2 mb-2" style={{ color: "var(--text-secondary)" }}>
            {error.message || "Error desconocido"}
          </p>
          {error.stack && (
            <pre className="text-xs overflow-auto p-3 rounded mb-2" style={{ background: "rgba(0,0,0,0.3)", color: "#f87171", maxHeight: "300px" }}>
              {error.stack}
            </pre>
          )}
          {error.digest && (
            <p className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
              digest: {error.digest}
            </p>
          )}
        </details>
      </div>
    </div>
  );
}
