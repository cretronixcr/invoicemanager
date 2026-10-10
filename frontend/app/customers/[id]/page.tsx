"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Printer,
  Building,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  CreditCard,
  Plus,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { RecordPaymentModal, InvoiceOption } from "@/components/payment/RecordPaymentModal";
import { PaymentReceiptModal } from "@/components/payment/PaymentReceiptModal";
import { PaymentReceiptData, SettingsData as ReceiptSettingsData } from "@/components/payment/PaymentReceiptTemplate";

type InvoiceItem = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  total: number;
  paidAmount: number;
  balance: number;
  status: string;
  payments: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
    paymentMethod: string;
    amount: number;
    reference?: string | null;
  }[];
};

type QuotationItem = {
  id: string;
  quotationNumber: string;
  date: string;
  total: number;
  status: string;
};

type CustomerData = {
  id: string;
  customerCode: string;
  name: string;
  companyName?: string | null;
  address: string;
  city: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  invoices: InvoiceItem[];
  quotations: QuotationItem[];
};

type SettingsData = {
  businessName?: string;
  currency?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type LedgerEntry = {
  id: string;
  date: string;
  type: "INVOICE" | "PAYMENT";
  refNumber: string;
  description: string;
  debit: number;  // Increases receivable
  credit: number; // Decreases receivable
  runningBalance: number;
  link?: string;
};

export default function CustomerLedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "invoices" | "quotations">("ledger");
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceOption | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<PaymentReceiptData | null>(null);

  const loadCustomer = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/customers/${id}`).then((r) => r.json()),
        fetch(`/api/settings`).then((r) => r.json()),
      ]);
      if (cRes.success) setCustomer(cRes.customer);
      if (sRes.success) setSettings(sRes.settings);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/customers/${id}`).then((r) => r.json()),
      fetch(`/api/settings`).then((r) => r.json()),
    ])
      .then(([custRes, settRes]) => {
        if (!cancelled) {
          if (custRes.success) setCustomer(custRes.customer);
          if (settRes.success) setSettings(settRes.settings);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const currency = settings?.currency || "PKR";

  // Financial summary
  const totalInvoiced = useMemo(() => {
    return customer?.invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
  }, [customer]);

  const totalPaid = useMemo(() => {
    return customer?.invoices?.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0) || 0;
  }, [customer]);

  const netBalance = useMemo(() => {
    return customer?.invoices?.reduce((sum, inv) => sum + (inv.balance || 0), 0) || 0;
  }, [customer]);

  // Build combined chronological ledger
  const ledger = useMemo<LedgerEntry[]>(() => {
    if (!customer?.invoices) return [];
    const entries: {
      id: string;
      date: string;
      type: "INVOICE" | "PAYMENT";
      refNumber: string;
      description: string;
      debit: number;
      credit: number;
      link?: string;
    }[] = [];

    // Add all invoices as debits
    customer.invoices.forEach((inv) => {
      entries.push({
        id: `inv-${inv.id}`,
        date: inv.invoiceDate,
        type: "INVOICE",
        refNumber: inv.invoiceNumber,
        description: `Invoice ${inv.invoiceNumber} (Status: ${inv.status})`,
        debit: inv.total,
        credit: 0,
        link: `/invoices/${inv.id}`,
      });

      // Add all payments against this invoice as credits
      inv.payments?.forEach((p) => {
        entries.push({
          id: `pay-${p.id}`,
          date: p.paymentDate,
          type: "PAYMENT",
          refNumber: p.paymentNumber,
          description: `Payment ${p.paymentNumber} via ${p.paymentMethod}${
            p.reference ? ` (${p.reference})` : ""
          } for ${inv.invoiceNumber}`,
          debit: 0,
          credit: p.amount,
        });
      });
    });

    // Sort chronologically ascending
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let running = 0;
    return entries.map((entry) => {
      running += entry.debit - entry.credit;
      return {
        ...entry,
        runningBalance: running,
      };
    });
  }, [customer]);

  const handlePrintStatement = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse" aria-hidden>
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 h-28" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-neutral-200 rounded-2xl" />
          <div className="h-24 bg-neutral-200 rounded-2xl" />
          <div className="h-24 bg-neutral-200 rounded-2xl" />
        </div>
        <div className="h-64 bg-neutral-200 rounded-2xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl border border-neutral-200 text-center space-y-3">
        <h3 className="font-bold text-neutral-800 text-sm">Customer Not Found</h3>
        <p className="text-xs text-neutral-500">
          The requested customer record does not exist or may have been removed.
        </p>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner & Customer Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <Link
            href="/customers"
            className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors print:hidden shrink-0 mt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
                {customer.name}
              </h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                {customer.customerCode}
              </span>
              {customer.companyName && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-medium">
                  {customer.companyName}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 mt-2">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-neutral-400" />
                <strong className="text-neutral-700">{customer.phone}</strong>
              </span>
              {customer.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{customer.email}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                <span>
                  {customer.address}, {customer.city}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {netBalance > 0 && (
            <button
              onClick={() => {
                setSelectedInvoiceForPayment(null);
                setShowRecordPayment(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}
          <Link
            href={`/invoices/new`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Invoice</span>
          </Link>
          <button
            onClick={handlePrintStatement}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-neutral-50 text-neutral-700 font-semibold text-xs rounded-xl border border-neutral-300 shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
            Total Billed (Sales)
          </span>
          <span className="text-xl font-black text-neutral-900 mt-1 block font-mono tabular-nums">
            {formatCurrency(totalInvoiced, currency)}
          </span>
          <p className="text-[11px] text-neutral-400 mt-1">
            Across {customer.invoices.length} invoices
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
            Total Payments Received
          </span>
          <span className="text-xl font-black text-emerald-700 mt-1 block font-mono tabular-nums">
            {formatCurrency(totalPaid, currency)}
          </span>
          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Settled &amp; Deposited</span>
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border shadow-sm ${
            netBalance > 0
              ? "bg-rose-50/70 border-rose-200"
              : "bg-white border-neutral-200"
          }`}
        >
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider block ${
              netBalance > 0 ? "text-rose-800" : "text-neutral-500"
            }`}
          >
            Outstanding Balance (Receivable)
          </span>
          <span
            className={`text-xl font-black mt-1 block font-mono tabular-nums ${
              netBalance > 0 ? "text-rose-700" : "text-emerald-700"
            }`}
          >
            {formatCurrency(netBalance, currency)}
          </span>
          <p
            className={`text-[11px] mt-1 flex items-center gap-1 ${
              netBalance > 0 ? "text-rose-600" : "text-neutral-400"
            }`}
          >
            {netBalance > 0 ? (
              <>
                <AlertCircle className="w-3 h-3" />
                <span>Payment Due from Client</span>
              </>
            ) : (
              <span>Account fully settled</span>
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 print:hidden text-xs">
        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "ledger"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Account Ledger (کھاتا)</span>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-neutral-100 text-[10px]">
            {ledger.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "invoices"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Invoices</span>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-neutral-100 text-[10px]">
            {customer.invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("quotations")}
          className={`px-4 py-2.5 font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === "quotations"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Quotations</span>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-neutral-100 text-[10px]">
            {customer.quotations.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Account Ledger Table (Debit / Credit / Running Balance) */}
      {activeTab === "ledger" && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden text-xs">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-neutral-900">
                Statement of Account / Running Ledger
              </h2>
              <p className="text-[11px] text-neutral-500">
                Complete chronological audit of invoices debited and payments credited.
              </p>
            </div>
            <span className="font-mono font-bold text-xs text-neutral-700">
              Net Receivable: {formatCurrency(netBalance, currency)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100 text-neutral-600 text-[11px] uppercase tracking-wider border-b border-neutral-200">
                  <th className="py-2.5 px-3 font-bold">Date</th>
                  <th className="py-2.5 px-3 font-bold">Type</th>
                  <th className="py-2.5 px-3 font-bold">Ref #</th>
                  <th className="py-2.5 px-3 font-bold">Description</th>
                  <th className="py-2.5 px-3 font-bold text-right">Debit (+)</th>
                  <th className="py-2.5 px-3 font-bold text-right">Credit (-)</th>
                  <th className="py-2.5 px-3 font-bold text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-400">
                      No invoices or payments on record for this customer.
                    </td>
                  </tr>
                ) : (
                  ledger.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-neutral-50/80 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-neutral-600 whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            entry.type === "INVOICE"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {entry.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-neutral-900">
                        {entry.link ? (
                          <Link href={entry.link} className="hover:underline text-indigo-600">
                            {entry.refNumber}
                          </Link>
                        ) : (
                          entry.refNumber
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 max-w-sm truncate">
                        {entry.description}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {entry.debit > 0 ? formatCurrency(entry.debit, currency) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 tabular-nums">
                        {entry.credit > 0 ? formatCurrency(entry.credit, currency) : "—"}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-black tabular-nums ${
                          entry.runningBalance > 0
                            ? "text-rose-600"
                            : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(entry.runningBalance, currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Invoices List */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100 text-neutral-600 text-[11px] uppercase tracking-wider border-b border-neutral-200">
                <th className="py-2.5 px-3 font-bold">Invoice #</th>
                <th className="py-2.5 px-3 font-bold">Date</th>
                <th className="py-2.5 px-3 font-bold">Status</th>
                <th className="py-2.5 px-3 font-bold text-right">Total</th>
                <th className="py-2.5 px-3 font-bold text-right">Paid</th>
                <th className="py-2.5 px-3 font-bold text-right">Balance</th>
                <th className="py-2.5 px-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {customer.invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    No invoices created for this customer yet.
                  </td>
                </tr>
              ) : (
                customer.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">
                      {formatDate(inv.invoiceDate)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                      {formatCurrency(inv.total, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(inv.paidAmount, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600">
                      {formatCurrency(inv.balance, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right flex items-center justify-end gap-1.5">
                      {inv.balance > 0 && (
                        <button
                          onClick={() => {
                            setSelectedInvoiceForPayment({
                              id: inv.id,
                              invoiceNumber: inv.invoiceNumber,
                              total: inv.total,
                              paidAmount: inv.paidAmount,
                              balance: inv.balance,
                              invoiceDate: inv.invoiceDate,
                              status: inv.status,
                              customer: {
                                name: customer.name,
                                customerCode: customer.customerCode,
                                phone: customer.phone,
                                address: customer.address,
                                city: customer.city,
                              },
                            });
                            setShowRecordPayment(true);
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[11px] transition-colors"
                        >
                          Pay
                        </button>
                      )}
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-[11px]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Quotations List */}
      {activeTab === "quotations" && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100 text-neutral-600 text-[11px] uppercase tracking-wider border-b border-neutral-200">
                <th className="py-2.5 px-3 font-bold">Quotation #</th>
                <th className="py-2.5 px-3 font-bold">Date</th>
                <th className="py-2.5 px-3 font-bold">Status</th>
                <th className="py-2.5 px-3 font-bold text-right">Total</th>
                <th className="py-2.5 px-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {customer.quotations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-400">
                    No quotations generated for this customer yet.
                  </td>
                </tr>
              ) : (
                customer.quotations.map((qt) => (
                  <tr key={qt.id} className="hover:bg-neutral-50/80">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                      <Link href={`/quotations/${qt.id}`} className="hover:underline">
                        {qt.quotationNumber}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600">
                      {formatDate(qt.date)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-700">
                        {qt.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                      {formatCurrency(qt.total, currency)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/quotations/${qt.id}`}
                        className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-[11px]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <RecordPaymentModal
          invoiceData={selectedInvoiceForPayment}
          customerIdFilter={id}
          settings={settings as ReceiptSettingsData}
          onClose={() => {
            setShowRecordPayment(false);
            setSelectedInvoiceForPayment(null);
          }}
          onSuccess={(payment) => {
            setShowRecordPayment(false);
            setSelectedInvoiceForPayment(null);
            loadCustomer();
            setActiveReceipt(payment);
          }}
        />
      )}

      {/* Payment Receipt Voucher Modal */}
      {activeReceipt && (
        <PaymentReceiptModal
          payment={activeReceipt}
          settings={settings as ReceiptSettingsData}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
}
