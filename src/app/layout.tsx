import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { DevPanel } from "@/components/DevPanel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primary Performance",
  description: "Gestión de clases y reservas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Flash-prevention: runs before React hydrates — no dark→light flicker on reload */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('pp_theme');if(t!=='light')document.documentElement.classList.add('dark');})()`,
          }}
        />
      </head>
      <body className="bg-zinc-950 text-white min-h-screen antialiased overflow-x-hidden">
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
