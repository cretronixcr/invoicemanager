"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatCurrency, toDecimalSafe } from "@/lib/utils";
import { PaymentReceiptData, SettingsData } from "./PaymentReceiptTemplate";
import {
  CreditCard,
  X,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Building,
} from "lucide-react";

export type InvoiceOption = {
  id: string;
  invoiceNumber: string;
  total: number;
  paidAmount: number;
  balance: number;
  invoiceDate: string | Date;
  status: string;
  customer?: {
    name: string;
    customerCode?: string;
    phone?: string;
    address?: string;
    city?: string;
  } | null;
};

interface RecordPaymentModalProps {
  invoiceData?: InvoiceOption | null;
  customerIdFilter?: string;
  settings?: SettingsData | null;
  onClose: () => void;
  onSuccess: (payment: PaymentReceiptData) => void;
}

export function RecordPaymentModal({
  invoiceData,
  customerIdFilter,
  settings,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const currency = settings?.currency || "PKR";

  // If no initial invoice was passed, allow selecting from unpaid invoices
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(!invoiceData);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(invoiceData?.id || "");

  // Form states
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load unpaid invoices if needed
  useEffect(() => {
    if (!invoiceData) {
      let cancelled = false;
      const url = customerIdFilter
        ? `/api/invoices?customerId=${customerIdFilter}`
        : "/api/invoices";
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (!cancelled && data.success) {
            const unpaid = (data.invoices as InvoiceOption[]).filter(
              (inv) => inv.balance > 0 && inv.status !== "Cancelled"
            );
            setInvoices(unpaid);
            if (unpaid.length > 0 && !selectedInvoiceId) {
              setSelectedInvoiceId(unpaid[0].id);
            }
          }
        })
        .catch(() => {
          if (!cancelled) setErrorMsg("Failed to load invoices list.");
        })
        .finally(() => {
          if (!cancelled) setLoadingInvoices(false);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [invoiceData, customerIdFilter, selectedInvoiceId]);

  // Active target invoice
  const currentInvoice = useMemo(() => {
    if (invoiceData) return invoiceData;
    return invoices.find((i) => i.id === selectedInvoiceId) || null;
  }, [invoiceData, invoices, selectedInvoiceId]);

  // Set default amount to remaining balance when active invoice changes
  useEffect(() => {
    if (currentInvoice && currentInvoice.balance > 0) {
      setAmount(currentInvoice.balance);
    }
  }, [currentInvoice]);

  const maxBalance = currentInvoice?.balance || 0;
  const newBalance = Math.max(0, toDecimalSafe(maxBalance - (amount || 0)));
  const isSettled = amount > 0 && newBalance === 0;

  const handlePreset = (fraction: number) => {
    if (!maxBalance) return;
    const computed = toDecimalSafe(maxBalance * fraction);
    setAmount(computed);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!currentInvoice) {
      setErrorMsg("Please select an invoice.");
      return;
    }

    if (!amount || amount <= 0) {
      setErrorMsg("Payment amount must be greater than zero.");
      return;
    }

    if (amount > maxBalance) {
      setErrorMsg(
        `Amount cannot exceed the remaining balance of ${formatCurrency(
          maxBalance,
          currency
        )}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: currentInvoice.id,
          amount: Number(amount),
          paymentDate: new Date(paymentDate).toISOString(),
          paymentMethod,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success && data.payment) {
        // Construct full receipt object to pass to success handler
        const receiptPayload: PaymentReceiptData = {
          id: data.payment.id,
          paymentNumber: data.payment.paymentNumber,
          paymentDate: data.payment.paymentDate,
          amount: data.payment.amount,
          paymentMethod: data.payment.paymentMethod,
          reference: data.payment.reference,
          notes: data.payment.notes,
          invoice: {
            id: currentInvoice.id,
            invoiceNumber: currentInvoice.invoiceNumber,
            invoiceDate: currentInvoice.invoiceDate,
            total: currentInvoice.total,
            paidAmount: toDecimalSafe((currentInvoice.paidAmount || 0) + data.payment.amount),
            balance: toDecimalSafe(maxBalance - data.payment.amount),
            customer: currentInvoice.customer || {
              name: "WALK-IN CUSTOMER",
              address: "N/A",
              city: "Karachi",
              phone: "N/A",
            },
          },
        };

        onSuccess(receiptPayload);
      } else {
        setErrorMsg(data.error || "Failed to record payment.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error saving payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-neutral-900 text-white p-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">
                Record Invoice Payment
              </h2>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Post customer settlement and generate official receipt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Invoice Selector (if opened from payments or general list) */}
          {!invoiceData && (
            <div>
              <label className="block text-neutral-700 font-semibold mb-1">
                Select Invoice to Settle *
              </label>
              {loadingInvoices ? (
                <div className="p-2.5 bg-neutral-100 rounded-xl text-neutral-400 animate-pulse text-xs">
                  Loading outstanding invoices...
                </div>
              ) : invoices.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                  No unpaid invoices found with an outstanding balance.
                </div>
              ) : (
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-medium focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.customer?.name || "Client"} (Due:{" "}
                      {formatCurrency(inv.balance, currency)})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Active Invoice Info Card */}
          {currentInvoice && (
            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-neutral-900 text-sm">
                    {currentInvoice.invoiceNumber}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700 font-semibold">
                    {currentInvoice.status}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  Client:{" "}
                  <strong>{currentInvoice.customer?.name || "WALK-IN"}</strong>{" "}
                  {currentInvoice.customer?.phone && (
                    <span>({currentInvoice.customer.phone})</span>
                  )}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                  Due Balance
                </span>
                <span className="text-sm font-black text-rose-600 font-mono tabular-nums">
                  {formatCurrency(maxBalance, currency)}
                </span>
              </div>
            </div>
          )}

          {/* Amount Field with Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-neutral-700 font-semibold">
                Payment Amount ({currency}) *
              </label>
              {maxBalance > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePreset(1)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    Full Balance
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset(0.5)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset(0.25)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                  >
                    25%
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                max={maxBalance}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Enter payment amount"
                className="w-full p-2.5 bg-white border border-neutral-300 rounded-xl text-neutral-900 font-black text-base font-mono tabular-nums focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                required
              />
            </div>
          </div>

          {/* Real-Time Balance Simulation */}
          {currentInvoice && amount > 0 && (
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] ${
                isSettled
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-neutral-50 border-neutral-200 text-neutral-700"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isSettled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <CreditCard className="w-4 h-4 text-neutral-400" />
                )}
                <span>
                  {isSettled
                    ? "Complete Settlement! Invoice will be marked as PAID."
                    : "Partial Payment recorded."}
                </span>
              </div>
              <div className="text-right">
                <span className="text-neutral-500 mr-1.5">Balance After:</span>
                <strong
                  className={`font-mono font-bold ${
                    isSettled ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {formatCurrency(newBalance, currency)}
                </strong>
              </div>
            </div>
          )}

          {/* Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-700 font-semibold mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-neutral-700 font-semibold mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-medium"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer / Online</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Reference / Txn ID */}
          <div>
            <label className="block text-neutral-700 font-semibold mb-1">
              Reference / Txn ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Meezan Bank Ref #998877 or Cheque #1234"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
            />
          </div>

          {/* Notes / Remarks */}
          <div>
            <label className="block text-neutral-700 font-semibold mb-1">
              Payment Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Received by Daniyal at Gulshan site"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !currentInvoice || maxBalance <= 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm shadow-emerald-600/30 transition-all active:translate-y-px disabled:opacity-60 flex items-center gap-1.5"
            >
              {submitting ? (
                <span>Saving Payment...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save &amp; View Receipt</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
