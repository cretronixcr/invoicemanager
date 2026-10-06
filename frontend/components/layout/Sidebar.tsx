"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  PlusCircle,
  Zap,
  X,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Invoices", href: "/invoices", icon: Receipt },
  { name: "Quick Invoice", href: "/invoices/new?quick=true", icon: Zap, badge: "Fast" },
  { name: "Quotations", href: "/quotations", icon: FileText },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Products & Services", href: "/products", icon: Package },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 text-neutral-300 flex flex-col border-r border-neutral-800 transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 lg:min-h-screen lg:shrink-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header — white logo with "Invoice Management" stacked below it */}
      <div className="px-4 py-3 border-b border-neutral-800 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logodanibro.svg"
            alt="Dani Brothers"
            className="h-9 w-auto max-w-[140px] object-contain shrink-0"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-neutral-400 font-medium tracking-wide">
          Invoice Management
        </p>
      </div>

      {/* Quick Action Button */}
      <div className="p-4 shrink-0">
        <Link
          href="/invoices/new"
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-950/40 transition-all active:translate-y-px"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Invoice</span>
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 pb-3 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Menu
        </p>
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href) && item.href !== "/";

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`group flex items-center justify-between py-2 pl-2.5 pr-3 text-xs rounded-lg border-l-2 transition-all ${
                isActive
                  ? "bg-neutral-800 text-white font-semibold border-indigo-500 shadow-sm"
                  : "border-transparent text-neutral-300 hover:bg-neutral-800/60 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? "text-indigo-400"
                      : "text-neutral-400 group-hover:text-indigo-300"
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / System Status */}
      <div className="px-4 py-3.5 border-t border-neutral-800 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          <span className="text-[11px] text-neutral-300 font-medium">
            Database Online
          </span>
        </div>
        <p className="text-[10px] text-neutral-500 pl-4">A4 Engine: Print-Ready</p>
      </div>
    </aside>
  );
}
