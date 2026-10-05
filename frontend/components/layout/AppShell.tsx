"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

/**
 * Client shell wrapping Sidebar + Header + main.
 * Owns the mobile drawer state: sidebar slides in over a backdrop below lg,
 * and stays a static column from lg up.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock page scroll while the drawer is open (mobile only).
  useEffect(() => {
    if (!sidebarOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <>
      {/* Backdrop — mobile only */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {/* key remounts on route change so the fade-up transition replays */}
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
