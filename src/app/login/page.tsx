import { signIn } from "@/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { BRAND } from "@/lib/brand";
import { getBranding, DEFAULT_BRANDING } from "@/lib/branding";

function SportCurve() {
  return (
    <svg width="160" height="64" viewBox="0 0 160 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 54 C28 14, 56 40, 80 28 C104 16, 132 46, 152 10"
        stroke="rgba(74,159,213,0.35)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M8 62 C28 22, 56 48, 80 36 C104 24, 132 54, 152 18"
        stroke="rgba(74,159,213,0.15)" strokeWidth="1" fill="none" strokeLinecap="round" />
      <circle cx="80" cy="28" r="3.5" fill="rgba(74,159,213,0.55)" />
      <circle cx="152" cy="10" r="2.5" fill="rgba(74,159,213,0.3)" />
      <circle cx="8" cy="54" r="2" fill="rgba(74,159,213,0.25)" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;
  const branding = await getBranding();
  const loginTitle = branding.gymName === DEFAULT_BRANDING.gymName
    ? BRAND.loginTitle
    : `Bienvenido a ${branding.gymName}`;

  return (
    <div
      className="relative min-h-screen w-full flex flex-col overflow-hidden sm:items-center sm:justify-center"
      style={{ background: BRAND.backgroundGradient }}
    >
      {/* Subtle diagonal line texture */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="diag-login" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="48" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diag-login)" />
      </svg>

      {/* Bottom-right blue glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -60,
          right: -60,
          width: 360,
          height: 360,
          background: "radial-gradient(circle, rgba(74,159,213,0.2) 0%, transparent 70%)",
        }}
      />

      {/* Top-right geometric accent — desktop only */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none hidden sm:block" xmlns="http://www.w3.org/2000/svg">
        <polygon points="90%,0 100%,0 100%,20%" fill="rgba(74,159,213,0.04)" />
        <polygon points="90%,0 100%,0 100%,20%" fill="none" stroke="rgba(74,159,213,0.18)" strokeWidth="1" />
      </svg>

      {/* Logo + sport curve */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-8 pt-16 pb-7 sm:pt-0 sm:pb-7 sm:gap-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={branding.logoUrl ?? BRAND.logoSrc}
          alt={branding.gymName}
          className="w-[190px] sm:w-[260px] h-auto"
        />
        <SportCurve />
      </div>

      {/* Card */}
      <div
        className="relative z-10 flex-1 sm:flex-none flex flex-col gap-4.5 sm:gap-6 px-7 pt-7 pb-9 sm:px-12 sm:py-11 w-full sm:max-w-[460px] rounded-t-[28px] sm:rounded-[20px] border border-b-0 sm:border-b border-[rgba(74,159,213,0.22)]"
        style={{
          background: "rgba(5,12,26,0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Top shimmer edge */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-[55%] sm:w-[65%]"
          style={{ background: "linear-gradient(to right, transparent, rgba(74,159,213,0.65), transparent)" }}
        />

        {/* Drag handle — mobile only */}
        <div className="flex justify-center sm:hidden">
          <div className="w-9 h-[3px] rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />
        </div>

        <div className="text-center">
          <p className="text-[19px] sm:text-[22px] font-semibold mb-2 sm:mb-2.5 text-white tracking-tight">
            {loginTitle}
          </p>
          <p className="text-[13px] sm:text-sm leading-relaxed" style={{ color: "#7e8fa4" }}>
            {BRAND.loginSubtitle}
          </p>
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-center text-[13px] sm:text-sm"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
          >
            No pudimos completar el inicio de sesión. Inténtalo nuevamente.
          </div>
        )}

        <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.08)" }} />

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl || "/" });
          }}
        >
          <GoogleSignInButton label="Ingresar con Google" />
        </form>

        <p className="text-[11px] sm:text-xs text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.2)" }}>
          {BRAND.loginFooter}
        </p>
      </div>
    </div>
  );
}
