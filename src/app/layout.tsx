import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
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

export const metadata: Metadata = {
  title: "Primary Performance",
  description: "Gestión de clases y reservas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${sora.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(localStorage.getItem('pp_theme')==='light')document.documentElement.classList.remove('dark');var fs=localStorage.getItem('pp_font_size');if(fs&&fs!=='normal')document.documentElement.setAttribute('data-font-size',fs);})()`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased overflow-x-hidden" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
