import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Receipt,
  Users,
  CreditCard,
  Clock,
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  PlusCircle,
  Zap,
} from "lucide-react";

export const revalidate = 0;

export default async function DashboardPage() {
  const [
    invoicesCount,
    customersCount,
    allInvoices,
    recentPayments,
  ] = await Promise.all([
    prisma.invoice.count(),
    prisma.customer.count(),
    prisma.invoice.findMany({
      include: { customer: true },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.payment.findMany({
      take: 6,
      orderBy: { paymentDate: "desc" },
      include: {
        invoice: {
          include: { customer: true },
        },
      },
    }),
  ]);

  let totalSales = 0;
  let totalPaid = 0;
  let totalPending = 0;

  for (const inv of allInvoices) {
    if (inv.status !== "Cancelled") {
      totalSales += inv.total;
      totalPaid += inv.paidAmount;
      totalPending += inv.balance;
    }
  }

  const recentInvoices = allInvoices.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-br from-white via-white to-indigo-50 p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Business Dashboard
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Overview of sales, customer accounts, and pending invoices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/invoices/new?quick=true"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-500 text-neutral-950 font-semibold text-xs rounded-xl shadow-sm shadow-amber-500/30 transition-all active:translate-y-px"
          >
            <Zap className="w-4 h-4" />
            <span>Quick Invoice</span>
          </Link>
          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Invoice</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Sales */}
        <div className="group bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Sales
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 transition-transform group-hover:scale-105">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-900 tabular-nums">
            {formatCurrency(totalSales)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Across {invoicesCount} total invoices
          </p>
        </div>

        {/* Paid Amount */}
        <div className="group bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Paid Amount
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 transition-transform group-hover:scale-105">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-600 tabular-nums">
            {formatCurrency(totalPaid)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Collected revenues &amp; advances
          </p>
        </div>

        {/* Pending Balance */}
        <div className="group bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Outstanding Amount
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 transition-transform group-hover:scale-105">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-600 tabular-nums">
            {formatCurrency(totalPending)}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Unpaid / partial client balances
          </p>
        </div>

        {/* Total Customers */}
        <div className="group bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-neutral-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Customers
            </span>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition-transform group-hover:scale-105">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-neutral-900 tabular-nums">
            {customersCount}
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            Active corporate &amp; retail accounts
          </p>
        </div>
      </div>

      {/* Two Column Tables: Recent Invoices & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                Recent Invoices
              </h2>
              <p className="text-[11px] text-neutral-500">
                Latest sales and installation billing
              </p>
            </div>
            <Link
              href="/invoices"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 text-[11px] uppercase">
                  <th className="py-2.5 px-4 font-semibold">Invoice No</th>
                  <th className="py-2.5 px-4 font-semibold">Customer</th>
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Total</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Balance</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-neutral-900">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="hover:underline text-indigo-600"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-neutral-900">
                        {inv.customer?.name}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        {inv.customer?.companyName || `ID: ${inv.customer?.customerCode}`}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-neutral-900">
                      {formatCurrency(inv.total)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-rose-600">
                      {formatCurrency(inv.balance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ring-1 ring-inset ${
                          inv.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : inv.status === "Partially Paid"
                            ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                            : "bg-neutral-100 text-neutral-600 ring-neutral-500/15"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments (1 Col) */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                Recent Payments
              </h2>
              <p className="text-[11px] text-neutral-500">
                Latest transaction receipts
              </p>
            </div>
            <Link
              href="/payments"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex-1 space-y-3 overflow-y-auto">
            {recentPayments.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-7 h-7 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs text-neutral-500">
                  No payments recorded yet.
                </p>
              </div>
            ) : (
              recentPayments.map((pay) => (
                <div
                  key={pay.id}
                  className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs transition-all hover:bg-white hover:shadow-sm"
                >
                  <div>
                    <p className="font-bold text-neutral-900">
                      {pay.invoice.customer.name}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      {pay.invoice.invoiceNumber} • {pay.paymentMethod}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {formatDate(pay.paymentDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 text-sm block tabular-nums">
                      +{formatCurrency(pay.amount)}
                    </span>
                    <span className="text-[9px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-mono">
                      {pay.paymentNumber}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
