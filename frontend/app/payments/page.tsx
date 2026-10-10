import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentRowActions } from "@/components/payment/PaymentRowActions";
import { RecordPaymentButton } from "@/components/payment/RecordPaymentButton";
import { CreditCard } from "lucide-react";

export const revalidate = 0;

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    include: {
      invoice: {
        include: { customer: true },
      },
    },
    orderBy: { paymentDate: "desc" },
  });

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  const settings = await prisma.businessSettings.findFirst();
  const currency = settings?.currency || "PKR";

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-br from-white via-white to-emerald-50/70 p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Payments Received
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Complete transaction ledger for advances and invoice settlements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RecordPaymentButton settings={settings || undefined} />
          <a
            href="/api/reports/export?type=payments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs rounded-xl border border-neutral-300 shadow-sm transition-colors"
          >
            <span>Export CSV</span>
          </a>
          <div className="bg-white/80 px-4 py-2 rounded-xl border border-emerald-200/70 shadow-sm">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
              Total Revenue Collected
            </span>
            <span className="text-lg font-black text-emerald-700 tabular-nums">
              {formatCurrency(totalCollected, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Payment ID</th>
                <th className="py-3 px-4 font-bold">Invoice ID</th>
                <th className="py-3 px-4 font-bold">Customer</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold">Payment Method</th>
                <th className="py-3 px-4 font-bold">Reference / Notes</th>
                <th className="py-3 px-4 font-bold text-right">Amount Received</th>
                <th className="py-3 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-neutral-400">
                      <CreditCard className="w-7 h-7" />
                      <p className="text-xs">No payment transactions recorded yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      {p.paymentNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-600">
                      <Link
                        href={`/invoices/${p.invoice.id}`}
                        className="hover:underline"
                      >
                        {p.invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-neutral-900">
                        {p.invoice.customer.name}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        Client ID: {p.invoice.customer.customerCode}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-neutral-100 ring-1 ring-inset ring-neutral-500/10 font-medium text-neutral-700 rounded-full text-[11px] inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600 max-w-xs">
                      {p.reference && <p className="font-medium">{p.reference}</p>}
                      {p.notes && <p className="text-[11px] text-neutral-400">{p.notes}</p>}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm tabular-nums">
                      +{formatCurrency(p.amount, currency)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <PaymentRowActions
                        paymentId={p.id}
                        paymentNumber={p.paymentNumber}
                        paymentData={p}
                        settings={settings || undefined}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
