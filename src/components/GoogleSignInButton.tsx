"use client";

import { useFormStatus } from "react-dom";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
      <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 3-4.33 3-7.32z" fill="#4285F4" />
      <path d="M10 20c2.7 0 4.96-.9 6.62-2.44l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.12H1.08v2.58A9.99 9.99 0 0 0 10 20z" fill="#34A853" />
      <path d="M4.41 11.9A6.01 6.01 0 0 1 4.1 10c0-.66.11-1.3.31-1.9V5.52H1.08A9.99 9.99 0 0 0 0 10c0 1.61.39 3.14 1.08 4.48L4.41 11.9z" fill="#FBBC05" />
      <path d="M10 3.98c1.46 0 2.77.5 3.8 1.49l2.85-2.85C14.95.99 12.7 0 10 0A9.99 9.99 0 0 0 1.08 5.52l3.33 2.58C5.2 5.73 7.4 3.98 10 3.98z" fill="#EA4335" />
    </svg>
  );
}

export function GoogleSignInButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-3 px-7 py-3.5 rounded-[10px] text-[15px] font-semibold transition-all duration-150 ease-out hover:-translate-y-px active:translate-y-0 disabled:opacity-70 disabled:cursor-wait"
      style={{
        background: "#ffffff",
        color: "#121820",
        border: "1.5px solid #dde2ea",
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
      onMouseEnter={(e) => {
        if (pending) return;
        e.currentTarget.style.background = "#f5f9ff";
        e.currentTarget.style.borderColor = "#4a9fd5";
        e.currentTarget.style.boxShadow = "0 6px 24px rgba(74,159,213,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#ffffff";
        e.currentTarget.style.borderColor = "#dde2ea";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
      }}
    >
      <GoogleIcon />
      {pending ? "Conectando..." : label}
    </button>
  );
}
