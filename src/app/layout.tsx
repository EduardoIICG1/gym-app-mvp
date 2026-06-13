import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import { BrandingProvider } from "@/components/BrandingProvider";
import { getBranding } from "@/lib/branding";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: branding.gymName,
    description: "Gestión de clases y reservas",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();
  // appearanceMode SYSTEM defaults to dark for SSR; the inline script below
  // corrects it on the client before paint based on matchMedia / pp_theme.
  const initialDark = branding.appearanceMode !== "LIGHT";

  return (
    <html
      lang="es"
      className={`${initialDark ? "dark " : ""}${sora.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--brand-primary:${branding.primaryColor};--brand-accent:${branding.accentColor};}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var t=localStorage.getItem('pp_theme');
  var mode=${JSON.stringify(branding.appearanceMode)};
  var dark;
  if(t==='light'||t==='dark'){dark=t==='dark';}
  else if(mode==='SYSTEM'){dark=window.matchMedia('(prefers-color-scheme: dark)').matches;}
  else{dark=mode!=='LIGHT';}
  document.documentElement.classList.toggle('dark',dark);
  var fs=localStorage.getItem('pp_font_size');if(fs&&fs!=='normal')document.documentElement.setAttribute('data-font-size',fs);
})()`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased overflow-x-hidden" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <Providers>
          <BrandingProvider branding={branding}>
            <AppShell>{children}</AppShell>
          </BrandingProvider>
        </Providers>
      </body>
    </html>
  );
}
