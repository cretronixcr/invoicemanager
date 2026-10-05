"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Menu } from "lucide-react";

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/invoices?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur border-b border-neutral-200 flex items-center gap-3 px-4 sm:px-6 shrink-0 z-10">
      {/* Mobile menu toggle */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="lg:hidden p-2 -ml-1 rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Global Search Bar */}
      <form onSubmit={handleSearch} className="relative flex-1 min-w-0 max-w-md">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search invoices, clients, items..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 placeholder:text-neutral-400 transition-all focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
        />
      </form>

      {/* Right User Bar */}
      <div className="flex items-center gap-3 ml-auto pl-3 border-l border-neutral-200">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm shadow-indigo-600/30 flex items-center justify-center text-white text-xs font-bold tracking-tight">
            AU
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-xs font-semibold text-neutral-800">Admin User</p>
            <p className="text-[10px] text-neutral-500 font-medium">
              DANI BROTHERS
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
