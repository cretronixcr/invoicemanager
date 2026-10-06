import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { syncInvoiceStatuses } from "@/lib/invoice-status";
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  Download,
  Clock,
} from "lucide-react";

export const revalidate = 0;

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  // Keep stored statuses honest so the Overdue KPI is accurate.
  await syncInvoiceStatuses();

  const fromDate =
    from && !isNaN(new Date(from).getTime())
      ? new Date(`${from}T00:00:00.000`)
      : null;
  const toDate =
    to && !isNaN(new Date(to).getTime())
      ? new Date(`${to}T23:59:59.999`)
      : null;
  const hasRange = Boolean(fromDate || toDate);
  const dateFilter = {
    ...(fromDate ? { gte: fromDate } : {}),
    ...(toDate ? { lte: toDate } : {}),
  };

  const settings = await prisma.businessSettings.findFirst();
  const currency = settings?.currency || "PKR";

  const invoices = await prisma.invoice.findMany({
    where: hasRange ? { invoiceDate: dateFilter } : {},
    include: {
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: { invoiceDate: "asc" },
  });

  const active = invoices.filter((i) => i.status !== "Cancelled");

  let totalSales = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let overdueAmount = 0;
  let overdueCount = 0;

  for (const inv of active) {
    totalSales += inv.total;
    totalPaid += inv.paidAmount;
    totalOutstanding += inv.balance;
    if (inv.status === "Overdue") {
      overdueAmount += inv.balance;
      overdueCount += 1;
    }
  }

  // ---- Monthly series (billed vs collected), capped at last 12 months ----
  const monthMap = new Map<string, { billed: number; paid: number }>();
  for (const inv of active) {
    const key = `${inv.invoiceDate.getFullYear()}-${String(
      inv.invoiceDate.getMonth() + 1
    ).padStart(2, "0")}`;
    const bucket = monthMap.get(key) || { billed: 0, paid: 0 };
    bucket.billed += inv.total;
    bucket.paid += inv.paidAmount;
    monthMap.set(key, bucket);
  }
  const months = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([key, v]) => ({ key, label: monthLabel(key), ...v }));
  const maxBar = Math.max(1, ...months.map((m) => Math.max(m.billed, m.paid)));

  // ---- Top customers by revenue (in range) ----
  const customerMap = new Map<
    string,
    { name: string; code: string; company: string | null; count: number; spent: number }
  >();
  for (const inv of active) {
    const c = inv.customer;
    const bucket = customerMap.get(c.id) || {
      name: c.name,
      code: c.customerCode,
      company: c.companyName,
      count: 0,
      spent: 0,
    };
    bucket.count += 1;
    bucket.spent += inv.total;
    customerMap.set(c.id, bucket);
  }
  const topCustomers = [...customerMap.values()]
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 8);

  // ---- Top products by revenue (in range) ----
  const productMap = new Map<
    string,
    { name: string; category: string; qty: number; revenue: number }
  >();
  let customQty = 0;
  let customRevenue = 0;
  for (const inv of active) {
    for (const item of inv.items) {
      if (item.productId && item.product) {
        const p = item.product;
        const bucket = productMap.get(p.id) || {
          name: p.name,
          category: p.category,
          qty: 0,
          revenue: 0,
        };
        bucket.qty += item.quantity;
        bucket.revenue += item.amount;
        productMap.set(p.id, bucket);
      } else {
        customQty += item.quantity;
        customRevenue += item.amount;
      }
    }
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // ---- Preset ranges ----
  const today = new Date();
  const thisMonth = {
    from: localYmd(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: localYmd(today),
  };
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const lastMonth = { from: localYmd(lastMonthStart), to: localYmd(lastMonthEnd) };
  const thisYear = { from: `${today.getFullYear()}-01-01`, to: localYmd(today) };

  const presetCls = (active: boolean) =>
    `px-3 py-1.5 rounded-full font-semibold transition-all ${
      active
        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
    }`;

  const exportHref = `/api/reports/export${
    from || to ? `?from=${from || ""}&to=${to || ""}` : ""
  }`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-br from-white via-white to-indigo-50 p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Financial &amp; Sales Reports
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            {hasRange
              ? `Range: ${from || "start"} → ${to || "today"} • ${
                  active.length
                } invoice${active.length === 1 ? "" : "s"} in period`
              : "Performance metrics, revenue trends, product and customer breakdowns."}
          </p>
        </div>
        <a
          href={exportHref}
          className="flex items-center gap-1.5 px-4 py-2 bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </a>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-wrap items-end justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/reports" className={presetCls(!hasRange)}>
            All Time
          </Link>
          <Link
            href={`/reports?from=${thisMonth.from}&to=${thisMonth.to}`}
            className={presetCls(
              from === thisMonth.from && to === thisMonth.to
            )}
          >
            This Month
          </Link>
          <Link
            href={`/reports?from=${lastMonth.from}&to=${lastMonth.to}`}
            className={presetCls(
              from === lastMonth.from && to === lastMonth.to
            )}
          >
            Last Month
          </Link>
          <Link
            href={`/reports?from=${thisYear.from}&to=${thisYear.to}`}
            className={presetCls(from === thisYear.from && to === thisYear.to)}
          >
            This Year
          </Link>
        </div>

        <form method="GET" className="flex items-end gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
              From
            </label>
            <input
              type="date"
              name="from"
              defaultValue={from || ""}
              className="p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
              To
            </label>
            <input
              type="date"
              name="to"
              defaultValue={to || ""}
              className="p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-all active:translate-y-px"
          >
            Apply
          </button>
          {hasRange && (
            <Link
              href="/reports"
              className="px-3 py-2 text-neutral-500 hover:text-rose-600 font-medium rounded-xl transition-colors"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Billed
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-900 tabular-nums">
            {formatCurrency(totalSales, currency)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Cash Collected
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600 tabular-nums">
            {formatCurrency(totalPaid, currency)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Outstanding
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-600/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-600 tabular-nums">
            {formatCurrency(totalOutstanding, currency)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Overdue ({overdueCount})
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-600 tabular-nums">
            {formatCurrency(overdueAmount, currency)}
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Monthly Sales Trend</span>
            </h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Billed vs collected per month {hasRange ? "in selected range" : ""}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-neutral-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-indigo-500 inline-block" />
              Billed
            </span>
            <span className="flex items-center gap-1.5 text-neutral-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" />
              Collected
            </span>
          </div>
        </div>

        {months.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-neutral-400">
            No invoices in this period.
          </div>
        ) : (
          <div className="flex items-end gap-2 sm:gap-3 overflow-x-auto">
            {months.map((m) => (
              <div
                key={m.key}
                className="flex-1 min-w-[42px] flex flex-col items-center gap-1.5"
              >
                <div className="w-full h-40 flex items-end justify-center gap-1">
                  <div
                    title={`Billed: ${formatCurrency(m.billed, currency)}`}
                    className="w-1/2 max-w-[20px] bg-indigo-500 rounded-t-md transition-all"
                    style={{
                      height: `${
                        m.billed > 0
                          ? Math.max((m.billed / maxBar) * 100, 2)
                          : 0
                      }%`,
                    }}
                  />
                  <div
                    title={`Collected: ${formatCurrency(m.paid, currency)}`}
                    className="w-1/2 max-w-[20px] bg-emerald-500 rounded-t-md transition-all"
                    style={{
                      height: `${
                        m.paid > 0 ? Math.max((m.paid / maxBar) * 100, 2) : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500 font-medium text-center w-full truncate">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products & Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            <span>Top Selling Products</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 text-[11px] uppercase">
                  <th className="py-2 px-3 font-semibold">Product</th>
                  <th className="py-2 px-3 font-semibold">Category</th>
                  <th className="py-2 px-3 font-semibold text-center">Qty</th>
                  <th className="py-2 px-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {topProducts.length === 0 && customRevenue === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-neutral-400">
                      No product sales in this period.
                    </td>
                  </tr>
                ) : (
                  <>
                    {topProducts.map((p, i) => (
                      <tr key={i} className="hover:bg-neutral-50/70">
                        <td className="py-2.5 px-3 font-semibold text-neutral-900 max-w-[220px] truncate">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-3 text-neutral-500">
                          {p.category}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums">
                          {p.qty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-neutral-900 tabular-nums">
                          {formatCurrency(p.revenue, currency)}
                        </td>
                      </tr>
                    ))}
                    {customRevenue > 0 && (
                      <tr className="bg-neutral-50">
                        <td className="py-2.5 px-3 font-semibold text-neutral-600">
                          Custom items (no catalog link)
                        </td>
                        <td className="py-2.5 px-3 text-neutral-400">—</td>
                        <td className="py-2.5 px-3 text-center tabular-nums">
                          {customQty}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-neutral-700 tabular-nums">
                          {formatCurrency(customRevenue, currency)}
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Top Revenue Customers</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 text-[11px] uppercase">
                  <th className="py-2 px-3 font-semibold">Client ID</th>
                  <th className="py-2 px-3 font-semibold">Customer</th>
                  <th className="py-2 px-3 font-semibold text-center">Invoices</th>
                  <th className="py-2 px-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-neutral-400">
                      No customer activity in this period.
                    </td>
                  </tr>
                ) : (
                  topCustomers.map((c, i) => (
                    <tr key={i} className="hover:bg-neutral-50/70">
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-700">
                        {c.code}
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-neutral-900">{c.name}</p>
                        {c.company && (
                          <p className="text-[10px] text-neutral-500">
                            {c.company}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums">
                        {c.count}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-neutral-900 tabular-nums">
                        {formatCurrency(c.spent, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
