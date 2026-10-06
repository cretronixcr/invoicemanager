"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuotationPDFTemplate } from "@/components/quotation/QuotationPDFTemplate";
import { generateInvoicePDF, printInvoiceElement } from "@/lib/pdf-generator";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Printer,
  Edit,
  Trash2,
  FileCheck,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-neutral-100 text-neutral-600 ring-neutral-500/15",
  Sent: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  Accepted: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Rejected: "bg-rose-50 text-rose-700 ring-rose-600/20",
  Converted: "bg-purple-50 text-purple-700 ring-purple-600/20",
};

type Settings = NonNullable<
  React.ComponentProps<typeof QuotationPDFTemplate>["settings"]
>;

type QuotationDetail =
  React.ComponentProps<typeof QuotationPDFTemplate>["quotation"] & {
    id: string;
    customerId: string;
    invoices?: { id: string; invoiceNumber: string }[];
  };

function statusPill(status: string) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ring-1 ring-inset ${
        STATUS_STYLES[status] || STATUS_STYLES.Draft
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export default function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quotations/${id}`);
        const data = await res.json();
        if (!cancelled && data.success) {
          setQuotation(data.quotation);
          setSettings(data.settings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!quotation) return;
    try {
      await generateInvoicePDF(
        "quotation-pdf-template",
        `Quotation_${quotation.quotationNumber || "QT"}.pdf`
      );
    } catch {
      alert("Failed to generate PDF. You can also use the Print button to save as PDF.");
    }
  };

  const handlePrint = () => {
    printInvoiceElement("quotation-pdf-template", "Print Quotation");
  };

  const changeStatus = async (status: string) => {
    if (!quotation) return;
    setUpdatingStatus(true);
    try {
      const payload = {
        customerId: quotation.customerId,
        date: new Date(quotation.date ?? Date.now()).toISOString(),
        items: quotation.items.map(
          (
            it: {
              productId?: string | null;
              section?: string | null;
              description: string;
              quantity: number;
              rate: number;
              amount: number;
            },
            idx: number
          ) => ({
            productId: it.productId || null,
            section: it.section || null,
            serialNumber: idx + 1,
            description: it.description,
            quantity: Number(it.quantity),
            rate: Number(it.rate),
            amount: Number(it.amount),
          })
        ),
        subtotal: quotation.subtotal,
        discount: quotation.discount,
        tax: quotation.tax,
        total: quotation.total,
        status,
        notes: quotation.notes || null,
      };
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setQuotation(data.quotation);
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!quotation) return;
    const ok = window.confirm(
      `Delete quotation ${quotation.quotationNumber} permanently? This cannot be undone.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/quotations");
      } else {
        alert(data.error || "Failed to delete quotation");
        setDeleting(false);
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete quotation"
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse" aria-hidden>
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm h-16" />
        <div className="bg-neutral-800 p-6 rounded-2xl flex justify-center">
          <div className="w-[794px] h-[1123px] bg-white rounded-sm shadow-xl p-10 space-y-5">
            <div className="h-7 w-44 bg-neutral-200 rounded" />
            <div className="h-40 w-full bg-neutral-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm text-center">
        <p className="text-sm font-semibold text-neutral-800 mb-1">
          Quotation not found
        </p>
        <p className="text-xs text-neutral-500 mb-4">
          It may have been deleted, or the link is invalid.
        </p>
        <Link
          href="/quotations"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quotations
        </Link>
      </div>
    );
  }

  const isConverted = quotation.status === "Converted";
  const linkedInvoice = quotation.invoices?.[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/quotations"
            className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-neutral-900 font-mono">
                {quotation.quotationNumber}
              </h1>
              {statusPill(quotation.status || "Draft")}
            </div>
            <p className="text-xs text-neutral-500">
              Client: {quotation.customer?.name} ({quotation.customer?.customerCode})
              <span className="mx-1.5 text-neutral-300">·</span>
              {formatDate(quotation.date)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status actions */}
          {!isConverted && quotation.status !== "Sent" && (
            <button
              onClick={() => changeStatus("Sent")}
              disabled={updatingStatus}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 ring-1 ring-inset ring-indigo-600/20 font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Mark Sent</span>
            </button>
          )}
          {!isConverted && quotation.status !== "Accepted" && (
            <button
              onClick={() => changeStatus("Accepted")}
              disabled={updatingStatus}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 ring-1 ring-inset ring-emerald-600/20 font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Accept</span>
            </button>
          )}
          {!isConverted && quotation.status !== "Rejected" && (
            <button
              onClick={() => changeStatus("Rejected")}
              disabled={updatingStatus}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 ring-1 ring-inset ring-rose-600/20 font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          )}

          {/* Convert to invoice */}
          {!isConverted && (
            <Link
              href={`/invoices/new?quotationId=${quotation.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-500 text-neutral-950 font-semibold rounded-xl shadow-sm shadow-amber-500/30 transition-all active:translate-y-px"
            >
              <FileCheck className="w-4 h-4" />
              <span>Convert to Invoice</span>
            </Link>
          )}
          {isConverted && linkedInvoice && (
            <Link
              href={`/invoices/${linkedInvoice.id}`}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 ring-1 ring-inset ring-purple-600/20 font-semibold rounded-xl transition-colors"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>View {linkedInvoice.invoiceNumber}</span>
            </Link>
          )}

          <Link
            href={`/quotations/new?editId=${quotation.id}`}
            className="flex items-center gap-1 px-3 py-2 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 font-medium rounded-xl transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </Link>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl transition-all active:translate-y-px"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 px-3 py-2 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 font-medium rounded-xl transition-colors disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{deleting ? "Deleting..." : "Delete"}</span>
          </button>
        </div>
      </div>

      {/* A4 preview on dark canvas */}
      <div className="bg-neutral-800 p-4 sm:p-6 rounded-2xl border border-neutral-700 flex justify-center overflow-x-auto shadow-inner">
        <div className="zoom-[0.44] sm:zoom-[0.7] md:zoom-[0.85] xl:zoom-100">
          <QuotationPDFTemplate
            quotation={quotation}
            settings={settings || undefined}
            id="quotation-pdf-template"
          />
        </div>
      </div>
    </div>
  );
}
