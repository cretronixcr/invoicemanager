import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  effectiveStatus,
  overdueWhere,
  syncInvoiceStatuses,
} from "@/lib/invoice-status";
import { InvoiceRowActions } from "@/components/invoice/InvoiceRowActions";
import { PlusCircle, Search, Zap } from "lucide-react";

export const revalidate = 0;

const PAGE_SIZE = 20;

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { search, status, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);

  const settings = await prisma.businessSettings.findFirst();
  const currency = settings?.currency || "PKR";

  // Repair stored statuses (Issued/Partially → Overdue etc.) before reading.
  await syncInvoiceStatuses();

  const where = {
    AND: [
      search
        ? {
            OR: [
              { invoiceNumber: { contains: search } },
              { referenceNumber: { contains: search } },
              { customer: { name: { contains: search } } },
              { customer: { companyName: { contains: search } } },
              { customer: { customerCode: { contains: search } } },
            ],
          }
        : {},
      status === "Overdue"
        ? overdueWhere()
        : status
        ? { status }
        : {},
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        payments: true,
      },
      orderBy: { invoiceDate: "desc" },
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.invoice.count({ where }),
  ]);

  // Fresh display status even between sync runs.
  const invoices = rows.map((inv) => ({
    ...inv,
    status: effectiveStatus(inv),
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (pageNum - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(pageNum * PAGE_SIZE, total);
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("page", String(p));
    return `/invoices?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-br from-white via-white to-indigo-50 p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Invoices Management
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Create, view, track payments, duplicate, and download official A4 PDF invoices.
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
            <span>Create Invoice</span>
          </Link>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Link
            href="/invoices"
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
              !status ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            All
          </Link>
          <Link
            href="/invoices?status=Issued"
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
              status === "Issued" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Issued
          </Link>
          <Link
            href="/invoices?status=Partially Paid"
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
              status === "Partially Paid" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Partially Paid
          </Link>
          <Link
            href="/invoices?status=Overdue"
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
              status === "Overdue" ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Overdue
          </Link>
          <Link
            href="/invoices?status=Paid"
            className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
              status === "Paid" ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Paid
          </Link>
        </div>

        <span className="text-neutral-500 font-medium">
          Showing {rangeStart}–{rangeEnd} of {total} invoices
        </span>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Invoice ID</th>
                <th className="py-3 px-4 font-bold">Customer Name</th>
                <th className="py-3 px-4 font-bold">Client ID</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold text-right">Subtotal</th>
                <th className="py-3 px-4 font-bold text-right">Discount</th>
                <th className="py-3 px-4 font-bold text-right">Grand Total</th>
                <th className="py-3 px-4 font-bold text-right">Paid</th>
                <th className="py-3 px-4 font-bold text-right">Balance</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-neutral-400">
                      <Search className="w-7 h-7" />
                      <p className="text-xs">
                        No invoices found. Click &quot;Create Invoice&quot; to issue your first invoice.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-neutral-900">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-indigo-600 hover:underline font-mono"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-neutral-900">{inv.customer.name}</p>
                      {inv.customer.companyName && (
                        <p className="text-[10px] text-neutral-500">{inv.customer.companyName}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-600">
                      {inv.customer.customerCode}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-600">
                      {formatCurrency(inv.subtotal, currency)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600">
                      {inv.discount > 0 ? formatCurrency(inv.discount, currency) : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-neutral-900">
                      {formatCurrency(inv.total, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-600">
                      {formatCurrency(inv.paidAmount, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">
                      {formatCurrency(inv.balance, currency)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ring-1 ring-inset ${
                          inv.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : inv.status === "Partially Paid"
                            ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                            : inv.status === "Overdue"
                            ? "bg-rose-50 text-rose-700 ring-rose-600/20"
                            : "bg-neutral-100 text-neutral-600 ring-neutral-500/15"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <InvoiceRowActions
                        invoiceId={inv.id}
                        invoiceNumber={inv.invoiceNumber}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-xs">
          {pageNum > 1 ? (
            <Link
              href={pageHref(pageNum - 1)}
              className="px-4 py-2 bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl transition-colors"
            >
              ← Previous
            </Link>
          ) : (
            <span className="px-4 py-2 text-neutral-300 font-semibold">
              ← Previous
            </span>
          )}
          <span className="text-neutral-500 font-medium">
            Page {pageNum} of {totalPages}
          </span>
          {pageNum < totalPages ? (
            <Link
              href={pageHref(pageNum + 1)}
              className="px-4 py-2 bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl transition-colors"
            >
              Next →
            </Link>
          ) : (
            <span className="px-4 py-2 text-neutral-300 font-semibold">
              Next →
            </span>
          )}
        </div>
      )}
    </div>
  );
}
