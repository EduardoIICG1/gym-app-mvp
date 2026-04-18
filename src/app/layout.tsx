import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { DevPanel } from "@/components/DevPanel";
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
    <html lang="es" className={`${sora.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('pp_theme');if(t!=='light')document.documentElement.classList.add('dark');})()`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased overflow-x-hidden" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <Navbar />
        <div className="flex">
          <Sidebar />
          <div className="flex-1 min-w-0 overflow-x-hidden pb-16 lg:pb-0">
            {children}
          </div>
        </div>
        <DevPanel />
      </body>
    </html>
  );
}
