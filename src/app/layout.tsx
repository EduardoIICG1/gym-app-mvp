import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primary Performance",
  description: "Gestión de clases y reservas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-white min-h-screen antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
