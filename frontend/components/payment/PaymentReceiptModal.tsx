"use client";

import React from "react";
import { PaymentReceiptTemplate, PaymentReceiptData, SettingsData } from "./PaymentReceiptTemplate";
import { generateInvoicePDF, printInvoiceElement } from "@/lib/pdf-generator";
import { Download, Printer, X } from "lucide-react";

interface PaymentReceiptModalProps {
  payment: PaymentReceiptData | null;
  settings?: SettingsData | null;
  onClose: () => void;
}

export function PaymentReceiptModal({
  payment,
  settings,
  onClose,
}: PaymentReceiptModalProps) {
  if (!payment) return null;

  const handleDownload = async () => {
    try {
      await generateInvoicePDF(
        "payment-receipt-print-target",
        `Receipt_${payment.paymentNumber}.pdf`
      );
    } catch {
      alert("Failed to generate PDF. You can also click Print to save as PDF.");
    }
  };

  const handlePrint = () => {
    printInvoiceElement("payment-receipt-print-target", `Payment Receipt - ${payment.paymentNumber}`);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Action Header */}
        <div className="bg-white p-3.5 sm:px-6 flex items-center justify-between border-b border-neutral-200">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span>Official Payment Receipt: {payment.paymentNumber}</span>
            </h3>
            <p className="text-[11px] text-neutral-500">
              Against Invoice: {payment.invoice.invoiceNumber} • Customer: {payment.invoice.customer.name}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold text-xs rounded-xl transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex justify-center bg-neutral-800">
          <div className="zoom-[0.5] sm:zoom-[0.75] md:zoom-[0.9] lg:zoom-100 shadow-2xl rounded-sm">
            <PaymentReceiptTemplate
              payment={payment}
              settings={settings || undefined}
              id="payment-receipt-print-target"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
