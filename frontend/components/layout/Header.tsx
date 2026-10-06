"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Menu, LogOut, Receipt, Users, Package } from "lucide-react";
import { logout } from "@/app/actions/auth";

type SearchResults = {
  invoices?: { id: string; invoiceNumber: string; customer?: { name: string } | null }[];
  customers?: { id: string; name: string; customerCode: string }[];
  products?: { id: string; name: string }[];
};

export function Header({
  onMenuToggle,
  userName,
}: {
  onMenuToggle: () => void;
  userName?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({});
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const displayName = userName || "Admin User";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  // Debounced lookup against /api/search as the user types.
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults({});
      setOpen(false);
    }
  };

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success) {
          const r = Array.isArray(data.results) ? {} : data.results;
          setResults(r);
          setOpen(true);
        }
      } catch {
        /* ignore search failures */
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const closeAndGo = () => {
    setOpen(false);
    setQuery("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const first = results.invoices?.[0];
    setOpen(false);
    if (first) {
      setQuery("");
      router.push(`/invoices/${first.id}`);
    } else {
      router.push(`/invoices?search=${encodeURIComponent(q)}`);
    }
  };

  const hasResults =
    (results.invoices?.length || 0) +
      (results.customers?.length || 0) +
      (results.products?.length || 0) >
    0;

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

      {/* Global Search Bar + results dropdown */}
      <form
        onSubmit={handleSearch}
        className="relative flex-1 min-w-0 max-w-md"
        onBlur={() => {
          // Let link clicks register before closing.
          setTimeout(() => setOpen(false), 150);
        }}
      >
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search invoices, clients, items..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 placeholder:text-neutral-400 transition-all focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
        />

        {open && hasResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden z-50 max-h-80 overflow-y-auto">
            {results.invoices && results.invoices.length > 0 && (
              <div className="p-1.5">
                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Invoices
                </p>
                {results.invoices.slice(0, 4).map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    onMouseDown={closeAndGo}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-indigo-50 transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="font-mono font-bold text-neutral-800">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-neutral-500 truncate">
                      {inv.customer?.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {results.customers && results.customers.length > 0 && (
              <div className="p-1.5 border-t border-neutral-100">
                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Customers
                </p>
                {results.customers.slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    href={`/customers?search=${encodeURIComponent(query.trim())}`}
                    onMouseDown={closeAndGo}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-indigo-50 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-neutral-800">
                      {c.name}
                    </span>
                    <span className="text-neutral-400 font-mono text-[10px]">
                      {c.customerCode}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {results.products && results.products.length > 0 && (
              <div className="p-1.5 border-t border-neutral-100">
                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Products
                </p>
                {results.products.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    href={`/products?search=${encodeURIComponent(query.trim())}`}
                    onMouseDown={closeAndGo}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-indigo-50 transition-colors"
                  >
                    <Package className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-neutral-800 truncate">{p.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      {/* Right User Bar */}
      <div className="flex items-center gap-3 ml-auto pl-3 border-l border-neutral-200">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm shadow-indigo-600/30 flex items-center justify-center text-white text-xs font-bold tracking-tight">
            {initials || "AU"}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-xs font-semibold text-neutral-800">
              {displayName}
            </p>
            <p className="text-[10px] text-neutral-500 font-medium">
              DANI BROTHERS
            </p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            title="Sign out"
            className="p-2 rounded-lg text-neutral-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
