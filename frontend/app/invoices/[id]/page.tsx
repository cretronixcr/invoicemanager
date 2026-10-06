"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InvoicePDFTemplate } from "@/components/invoice/InvoicePDFTemplate";
import { generateInvoicePDF, printInvoiceElement } from "@/lib/pdf-generator";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Printer,
  CreditCard,
  Edit,
  Copy,
  Trash2,
  CheckCircle,
  MessageCircle,
  Mail,
  Link2,
} from "lucide-react";

type InvoiceDetail =
  React.ComponentProps<typeof InvoicePDFTemplate>["invoice"] & {
    id: string;
    customerId: string;
    payments?: {
      id: string;
      paymentNumber: string;
      paymentDate: string;
      paymentMethod: string;
      reference?: string | null;
      amount: number;
    }[];
  };

type SettingsInfo = React.ComponentProps<typeof InvoicePDFTemplate>["settings"];

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [settings, setSettings] = useState<SettingsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildShare = () => {
    if (!invoice?.customer) return null;
    const url = `${window.location.origin}/invoices/${invoice.id}`;
    const text = [
      `Invoice ${invoice.invoiceNumber} — ${settings?.businessName || "DANI BROTHERS"}`,
      `Customer: ${invoice.customer.name}`,
      `Total: ${formatCurrency(invoice.total, settings?.currency)}`,
      `Paid: ${formatCurrency(invoice.paidAmount, settings?.currency)}`,
      `Balance: ${formatCurrency(invoice.balance, settings?.currency)}`,
      "",
      url,
    ].join("\n");
    return { url, text };
  };

  const handleWhatsApp = () => {
    const share = buildShare();
    const phone = invoice?.customer?.phone;
    if (!share || !phone) return;
    const digits = phone.replace(/\D/g, "");
    let intl = digits;
    if (intl.startsWith("0")) intl = `92${intl.slice(1)}`;
    else if (!intl.startsWith("92")) intl = `92${intl}`;
    window.open(
      `https://wa.me/${intl}?text=${encodeURIComponent(share.text)}`,
      "_blank",
      "noopener"
    );
  };

  const handleEmail = () => {
    const share = buildShare();
    if (!share) return;
    const subject = `Invoice ${invoice?.invoiceNumber} — ${
      settings?.businessName || "DANI BROTHERS"
    }`;
    const to = invoice?.customer?.email || "";
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(share.text)}`;
  };

  const handleCopyLink = async () => {
    const share = buildShare();
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy invoice link:", share.url);
    }
  };

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${id}`);
      const data = await res.json();
      if (data.success) {
        setInvoice(data.invoice);
        setSettings(data.settings);
        setPaymentAmount(data.invoice.balance > 0 ? data.invoice.balance : 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        const data = await res.json();
        if (!cancelled && data.success) {
          setInvoice(data.invoice);
          setSettings(data.settings);
          setPaymentAmount(data.invoice.balance > 0 ? data.invoice.balance : 0);
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
    if (!invoice) return;
    try {
      await generateInvoicePDF(
        "invoice-pdf-template",
        `Invoice_${invoice.invoiceNumber || "INV"}.pdf`
      );
    } catch {
      alert("Failed to generate PDF. You can also use the Print button to save as PDF.");
    }
  };

  const handlePrint = () => {
    printInvoiceElement("invoice-pdf-template");
  };

  const handleDelete = async () => {
    if (!invoice) return;
    const ok = window.confirm(
      `Delete invoice ${invoice.invoiceNumber} permanently? This cannot be undone.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/invoices");
      } else {
        alert(data.error || "Failed to delete invoice");
        setDeleting(false);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete invoice");
      setDeleting(false);
    }
  };

  const handleDeletePayment = async (paymentId: string, paymentNumber: string) => {
    const ok = window.confirm(
      `Delete payment ${paymentNumber}? The invoice balance and status will be recalculated.`
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchInvoice();
      } else {
        alert(data.error || "Failed to delete payment");
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete payment"
      );
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: id,
          amount: Number(paymentAmount),
          paymentDate: new Date().toISOString(),
          paymentMethod,
          reference: paymentReference || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(false);
        fetchInvoice();
      } else {
        alert(data.error || "Failed to record payment");
      }
    } catch (e) {
      alert(
        e instanceof Error ? e.message : "Error recording payment"
      );
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse" aria-hidden>
        {/* Action bar skeleton */}
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-neutral-200" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-neutral-200 rounded" />
              <div className="h-3 w-48 bg-neutral-100 rounded" />
            </div>
          </div>
          <div className="hidden sm:flex gap-2">
            <div className="h-9 w-32 bg-neutral-200 rounded-xl" />
            <div className="h-9 w-28 bg-neutral-200 rounded-xl" />
            <div className="h-9 w-28 bg-neutral-200 rounded-xl" />
          </div>
        </div>
        {/* A4 preview skeleton on the dark canvas */}
        <div className="bg-neutral-800 p-4 sm:p-6 rounded-2xl border border-neutral-700 flex justify-center overflow-x-auto">
          <div className="zoom-[0.44] sm:zoom-[0.7] md:zoom-[0.85] xl:zoom-100">
            <div className="w-[794px] h-[1123px] bg-white rounded-sm shadow-xl shadow-black/40 p-10 space-y-5">
              <div className="h-7 w-44 bg-neutral-200 rounded" />
              <div className="h-3 w-64 bg-neutral-100 rounded" />
              <div className="h-40 w-full bg-neutral-100 rounded" />
              <div className="h-3 w-full bg-neutral-100 rounded" />
              <div className="h-3 w-5/6 bg-neutral-100 rounded" />
              <div className="h-3 w-2/3 bg-neutral-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm text-center">
        <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-neutral-800 mb-1">
          Invoice not found
        </p>
        <p className="text-xs text-neutral-500 mb-4">
          It may have been deleted, or the link is invalid.
        </p>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-neutral-900 font-mono">
              {invoice.invoiceNumber}
            </h1>
            <p className="text-xs text-neutral-500">
              Customer: {invoice.customer?.name} ({invoice.customer?.customerCode})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {invoice.balance > 0 && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm shadow-emerald-600/30 transition-all active:translate-y-px"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Payment</span>
            </button>
          )}

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
            <span>Print Invoice</span>
          </button>

          {invoice.customer?.phone && (
            <button
              onClick={handleWhatsApp}
              title="Share on WhatsApp"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 ring-1 ring-inset ring-emerald-600/20 font-semibold rounded-xl transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          )}

          <button
            onClick={handleEmail}
            title={
              invoice.customer?.email
                ? "Email invoice summary"
                : "No email on file — opens blank mail app"
            }
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-600 hover:text-white text-sky-700 ring-1 ring-inset ring-sky-600/20 font-semibold rounded-xl transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          <button
            onClick={handleCopyLink}
            title="Copy shareable invoice link"
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold rounded-xl transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{copied ? "Copied!" : "Copy Link"}</span>
          </button>

          <Link
            href={`/invoices/new?editId=${invoice.id}`}
            className="flex items-center gap-1 px-3 py-2 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 font-medium rounded-xl transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit</span>
          </Link>

          <Link
            href={`/invoices/new?duplicateId=${invoice.id}`}
            className="flex items-center gap-1 px-3 py-2 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 font-medium rounded-xl transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </Link>

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

      {/* Payment History Card if any payments exist */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm text-xs print:hidden">
          <h3 className="font-bold text-neutral-900 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Payment History Recorded Against This Invoice</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 text-[11px]">
                  <th className="py-1 px-2 font-medium">Payment ID</th>
                  <th className="py-1 px-2 font-medium">Date</th>
                  <th className="py-1 px-2 font-medium">Method</th>
                  <th className="py-1 px-2 font-medium">Reference</th>
                  <th className="py-1 px-2 font-medium text-right">Amount</th>
                  <th className="py-1 px-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {invoice.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 px-2 font-mono font-semibold">{p.paymentNumber}</td>
                    <td className="py-2 px-2">{formatDate(p.paymentDate)}</td>
                    <td className="py-2 px-2">{p.paymentMethod}</td>
                    <td className="py-2 px-2 text-neutral-500">{p.reference || "N/A"}</td>
                    <td className="py-2 px-2 text-right font-bold text-emerald-600">
                      {formatCurrency(p.amount, settings?.currency)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(p.id, p.paymentNumber)}
                        title="Delete this payment (void)"
                        className="p-1.5 rounded-lg text-neutral-400 bg-neutral-100 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visual Live A4 PDF Preview Container — zoom scales the preview to
          the viewport on small screens; the PDF clone lives outside this
          wrapper (pdf-generator.ts), so capture stays at full size.
          Dark canvas = PDF-viewer look; printInvoiceElement opens its own
          window with only the template's outerHTML, so this never prints. */}
      <div className="bg-neutral-800 p-4 sm:p-6 rounded-2xl border border-neutral-700 flex justify-center overflow-x-auto shadow-inner">
        <div className="zoom-[0.44] sm:zoom-[0.7] md:zoom-[0.85] xl:zoom-100">
          <InvoicePDFTemplate
            invoice={invoice}
            settings={settings || undefined}
            id="invoice-pdf-template"
          />
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md p-6">
            <h2 className="text-base font-bold text-neutral-900 mb-1">
              Record Invoice Payment
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Invoice: {invoice.invoiceNumber} • Outstanding Balance:{" "}
              <strong className="text-rose-600 tabular-nums">
                {formatCurrency(invoice.balance, settings?.currency)}
              </strong>
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Payment Amount ({settings?.currency || "PKR"})
                </label>
                <input
                  type="number"
                  step="any"
                  max={invoice.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Reference / Txn ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meezan Bank Txn #123456"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm shadow-emerald-600/30 transition-all active:translate-y-px disabled:opacity-60"
                >
                  {submittingPayment ? "Recording..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
