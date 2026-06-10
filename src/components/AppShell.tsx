"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { DevPanel } from "@/components/DevPanel";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 min-w-0 overflow-x-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>
      </div>
      {process.env.NODE_ENV === "development" && <DevPanel />}
    </>
  );
}
