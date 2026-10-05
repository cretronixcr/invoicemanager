"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FileText, Plus, Eye, ArrowRight } from "lucide-react";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotations = async () => {
    try {
      const res = await fetch("/api/quotations");
      const data = await res.json();
      if (data.success) {
        setQuotations(data.quotations);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-br from-white via-white to-indigo-50 p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Quotations System
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Create proposals and convert them directly into invoices with 1 click.
          </p>
        </div>
        <div>
          <Link
            href="/invoices/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice / Quote</span>
          </Link>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Quotation ID</th>
                <th className="py-3 px-4 font-bold">Customer</th>
                <th className="py-3 px-4 font-bold">Date</th>
                <th className="py-3 px-4 font-bold text-right">Subtotal</th>
                <th className="py-3 px-4 font-bold text-right">Discount</th>
                <th className="py-3 px-4 font-bold text-right">Total</th>
                <th className="py-3 px-4 font-bold text-center">Status</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center">
                    <span className="inline-flex items-center gap-2 text-neutral-400 text-xs">
                      <span className="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-indigo-600 animate-spin inline-block" />
                      Loading quotations...
                    </span>
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-neutral-400">
                      <FileText className="w-7 h-7" />
                      <p className="text-xs">No quotations found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-neutral-900 font-mono">
                      {q.quotationNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-neutral-900">{q.customer?.name}</p>
                      <p className="text-[10px] text-neutral-500">
                        Client ID: {q.customer?.customerCode}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {formatDate(q.date)}
                    </td>
                    <td className="py-3 px-4 text-right text-neutral-600">
                      {formatCurrency(q.subtotal)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600">
                      {q.discount > 0 ? formatCurrency(q.discount) : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-neutral-900 tabular-nums">
                      {formatCurrency(q.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ring-1 ring-inset ${
                          q.status === "Converted"
                            ? "bg-purple-50 text-purple-700 ring-purple-600/20"
                            : q.status === "Accepted"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : "bg-neutral-100 text-neutral-600 ring-neutral-500/15"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/invoices/new?quotationId=${q.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 ring-1 ring-inset ring-indigo-600/20 font-semibold rounded-lg text-[11px] transition-colors"
                      >
                        <span>Convert to Invoice</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
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
