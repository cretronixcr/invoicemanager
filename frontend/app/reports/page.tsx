import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, TrendingUp, Users, Package } from "lucide-react";

export const revalidate = 0;

export default async function ReportsPage() {
  const [
    allInvoices,
    customers,
    products,
  ] = await Promise.all([
    prisma.invoice.findMany({
      include: {
        customer: true,
        items: true,
      },
    }),
    prisma.customer.findMany({
      include: {
        invoices: true,
      },
    }),
    prisma.product.findMany({
      include: {
        invoiceItems: true,
      },
    }),
  ]);

  let totalSales = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  allInvoices.forEach((inv) => {
    if (inv.status !== "Cancelled") {
      totalSales += inv.total;
      totalPaid += inv.paidAmount;
      totalOutstanding += inv.balance;
    }
  });

  // Top customers by volume
  const topCustomers = [...customers]
    .map((c) => ({
      name: c.name,
      code: c.customerCode,
      company: c.companyName,
      invoicesCount: c.invoices.length,
      totalSpent: c.invoices.reduce((acc, i) => acc + i.total, 0),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-white via-white to-indigo-50 p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
          Financial &amp; Sales Reports
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Performance metrics, revenue summary, and top customer accounts.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="group bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Total Billed Revenue
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition-transform group-hover:scale-105">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-900 mt-3 tabular-nums">
            {formatCurrency(totalSales)}
          </div>
        </div>

        <div className="group bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Total Cash Realized
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 transition-transform group-hover:scale-105">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-3 tabular-nums">
            {formatCurrency(totalPaid)}
          </div>
        </div>

        <div className="group bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Receivables / Outstanding
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 transition-transform group-hover:scale-105">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-600 mt-3 tabular-nums">
            {formatCurrency(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Top Customers Breakdown */}
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
                <th className="py-2 px-3 font-semibold">Customer Name</th>
                <th className="py-2 px-3 font-semibold">Company</th>
                <th className="py-2 px-3 font-semibold text-center">Total Invoices</th>
                <th className="py-2 px-3 font-semibold text-right">Total Business</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {topCustomers.map((c) => (
                <tr key={c.code}>
                  <td className="py-3 px-3 font-mono font-bold text-neutral-700">{c.code}</td>
                  <td className="py-3 px-3 font-semibold text-neutral-900">{c.name}</td>
                  <td className="py-3 px-3 text-neutral-500">{c.company || "-"}</td>
                  <td className="py-3 px-3 text-center tabular-nums">{c.invoicesCount}</td>
                  <td className="py-3 px-3 text-right font-bold text-neutral-900 tabular-nums">
                    {formatCurrency(c.totalSpent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
