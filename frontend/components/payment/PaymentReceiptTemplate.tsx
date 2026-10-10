import React from "react";
import { formatCurrency, formatDate, amountInWords } from "@/lib/utils";

export interface PaymentReceiptData {
  id?: string;
  paymentNumber: string;
  paymentDate: string | Date;
  amount: number;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
  invoice: {
    id?: string;
    invoiceNumber: string;
    invoiceDate?: string | Date;
    total: number;
    paidAmount?: number;
    balance?: number;
    customer: {
      name: string;
      customerCode?: string;
      companyName?: string | null;
      address?: string;
      city?: string;
      phone?: string;
      email?: string | null;
    };
  };
}

export interface SettingsData {
  businessName?: string;
  logo?: string | null;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string | null;
  ntn?: string | null;
  strn?: string | null;
  currency?: string;
  footerText?: string | null;
}

interface PaymentReceiptTemplateProps {
  payment: PaymentReceiptData;
  settings?: SettingsData;
  id?: string;
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
};

const labelCls = "text-[8.5px] font-bold uppercase tracking-[0.16em] mb-1";

export const PaymentReceiptTemplate: React.FC<PaymentReceiptTemplateProps> = ({
  payment,
  settings,
  id = "payment-receipt-template",
}) => {
  const currency = settings?.currency || "PKR";
  const inv = payment.invoice;
  const cust = inv.customer;
  const inWords = amountInWords(payment.amount);

  return (
    <div
      id={id}
      className="bg-white text-black font-sans"
      style={{
        width: "210mm",
        minHeight: "297mm",
        boxSizing: "border-box",
        backgroundColor: "#ffffff",
        color: "#171717",
        padding: "7mm 10mm",
        // Same slim branded top edge as Invoice PDF template (#2041ce)
        borderTop: "3mm solid #2041ce",
        display: "flex",
        flexDirection: "column",
        lineHeight: 1.35,
      }}
    >
      {/* 1. Header: logo left, business contact right */}
      <header
        className="flex items-start justify-between gap-6 pb-2"
        style={{ borderBottom: "1px solid #e5e5e5" }}
      >
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings?.logo || "/logodanibro.svg"}
            alt={settings?.businessName || "Company logo"}
            style={{ height: "42px", width: "auto", objectFit: "contain" }}
          />
        </div>

        <div className="text-right text-[9.5px] text-neutral-600 leading-[1.45]">
          <p className="font-bold text-neutral-900 text-[12px]">
            {settings?.businessName || "DANI BROTHERS"}
          </p>
          <p>
            {settings?.address || "Shop B-13 Sector Z-6 Gulshan e Maymar"},{" "}
            {settings?.city || "Sindh, Karachi"}
          </p>
          <p>
            <span className="font-semibold text-neutral-800">Phone</span>{" "}
            {settings?.phone || "0333 1360441"}
            <span className="mx-1.5 text-neutral-300">·</span>
            <span className="font-semibold text-neutral-800">Email</span>{" "}
            {settings?.email || "sales@danibrothers.com"}
          </p>
          {settings?.website && (
            <p>
              <span className="font-semibold text-neutral-800">Web</span>{" "}
              {settings.website}
            </p>
          )}
          {(settings?.ntn || settings?.strn) && (
            <p className="font-semibold text-neutral-700">
              {settings.ntn && <span>NTN: {settings.ntn} </span>}
              {settings.strn && <span>· STRN: {settings.strn}</span>}
            </p>
          )}
        </div>
      </header>

      {/* 2. Title band: Same brand styling as Invoice PDF */}
      <div className="flex items-end justify-between gap-6 mt-2.5">
        <div>
          <h1
            className="font-black uppercase text-neutral-900"
            style={{ fontSize: "24px", letterSpacing: "0.1em", lineHeight: 1 }}
          >
            Payment Receipt
          </h1>
          <div
            aria-hidden
            style={{
              width: "40px",
              height: "3px",
              backgroundColor: "#2041ce",
              borderRadius: "2px",
              margin: "6px 0 4px",
            }}
          />
          <p className="text-[9px] text-neutral-400 uppercase tracking-[0.14em] font-semibold">
            Official Acknowledgment of Payment Received
          </p>
        </div>

        <div
          className="text-right px-3.5 py-1.5"
          style={{ backgroundColor: "#eef2ff", borderRadius: "8px" }}
        >
          <p
            className="text-[8.5px] uppercase tracking-[0.18em] font-bold"
            style={{ color: "#2041ce" }}
          >
            Receipt Number
          </p>
          <p className="font-mono font-black text-neutral-900 text-[17px] leading-tight mt-0.5">
            {payment.paymentNumber}
          </p>
        </div>
      </div>

      {/* 3. Cards Grid: Payer Info & Transaction Details */}
      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        <div style={cardStyle} className="px-3 py-2.5">
          <p className={labelCls} style={{ color: "#2041ce" }}>
            Received With Thanks From
          </p>
          <p className="text-[12.5px] font-bold text-neutral-900">
            {cust?.name || "WALK-IN CUSTOMER"}
          </p>
          {cust?.companyName && (
            <p className="text-[10.5px] font-semibold text-neutral-700">
              {cust.companyName}
            </p>
          )}
          <p className="text-[10px] text-neutral-600 mt-0.5 leading-[1.45]">
            {cust?.address || "N/A"}{cust?.city ? `, ${cust.city}` : ""}
          </p>
          <p className="text-[10px] text-neutral-800 font-medium">
            Contact: {cust?.phone || "N/A"}
          </p>
          {cust?.customerCode && (
            <p className="text-[9.5px] text-neutral-500 mt-0.5">
              Client Code: <strong className="text-neutral-700">{cust.customerCode}</strong>
            </p>
          )}
        </div>

        <div style={cardStyle} className="px-3 py-2.5">
          <p className={labelCls} style={{ color: "#2041ce" }}>
            Payment &amp; Voucher Details
          </p>

          <div className="text-[10px]">
            <div className="flex justify-between gap-3 py-[2.5px] border-b border-neutral-200">
              <span className="text-neutral-500 font-medium">Receipt Date</span>
              <span className="font-semibold text-neutral-900">
                {formatDate(payment.paymentDate)}
              </span>
            </div>

            <div className="flex justify-between gap-3 py-[2.5px] border-b border-neutral-200">
              <span className="text-neutral-500 font-medium">Payment Mode</span>
              <span className="font-bold text-neutral-900 uppercase">
                {payment.paymentMethod}
              </span>
            </div>

            <div className="flex justify-between gap-3 py-[2.5px] border-b border-neutral-200">
              <span className="text-neutral-500 font-medium">Against Invoice #</span>
              <span className="font-mono font-bold" style={{ color: "#2041ce" }}>
                {inv.invoiceNumber}
              </span>
            </div>

            {payment.reference && (
              <div className="flex justify-between gap-3 py-[2.5px] border-b border-neutral-200">
                <span className="text-neutral-500 font-medium">Txn / Bank Ref</span>
                <span className="font-semibold text-neutral-800 font-mono">
                  {payment.reference}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Highlighted Amount Box */}
      <div
        className="mt-3 px-4 py-3 rounded-xl flex items-center justify-between"
        style={{
          backgroundColor: "#f8fafc",
          border: "1.5px solid #2041ce",
        }}
      >
        <div>
          <span
            className="text-[9px] uppercase font-bold tracking-[0.16em] block"
            style={{ color: "#2041ce" }}
          >
            Net Amount Received
          </span>
          <p className="text-[11px] font-semibold text-neutral-800 mt-0.5 italic">
            &ldquo;{inWords}&rdquo;
          </p>
        </div>
        <div className="text-right">
          <span
            className="text-2xl font-black font-mono tabular-nums"
            style={{ color: "#2041ce" }}
          >
            {formatCurrency(payment.amount, currency)}
          </span>
        </div>
      </div>

      {/* 5. Invoice Account Settlement Summary */}
      <div className="mt-3" style={{ border: "1px solid #e5e5e5", borderRadius: "8px", overflow: "hidden" }}>
        <div className="bg-neutral-100 px-3.5 py-1.5 border-b border-neutral-200 flex justify-between items-center">
          <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-700">
            Invoice Financial Summary Status
          </span>
          <span className="text-[9px] text-neutral-500 font-mono">
            Invoice #{inv.invoiceNumber}
          </span>
        </div>
        <table className="w-full text-left border-collapse text-[10px]">
          <tbody>
            <tr className="border-b border-neutral-200">
              <td className="py-2 px-3.5 text-neutral-600 font-medium">Total Invoice Amount</td>
              <td className="py-2 px-3.5 text-right font-semibold text-neutral-900 font-mono">
                {formatCurrency(inv.total, currency)}
              </td>
            </tr>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <td className="py-2 px-3.5 text-neutral-600 font-medium">Total Paid to Date (Including this Payment)</td>
              <td className="py-2 px-3.5 text-right font-bold text-neutral-900 font-mono">
                {formatCurrency(inv.paidAmount ?? payment.amount, currency)}
              </td>
            </tr>
            <tr style={{ backgroundColor: (inv.balance ?? 0) <= 0 ? "#f0fdf4" : "#fef2f2" }}>
              <td className="py-2 px-3.5 font-bold text-neutral-900">
                Outstanding Balance Remaining
              </td>
              <td
                className="py-2 px-3.5 text-right font-black font-mono text-[11px]"
                style={{ color: (inv.balance ?? 0) <= 0 ? "#059669" : "#dc2626" }}
              >
                {formatCurrency(inv.balance ?? 0, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 6. Notes if present */}
      {payment.notes && (
        <div style={cardStyle} className="mt-3 px-3.5 py-2.5 text-[10px]">
          <span className="font-bold text-neutral-700 block mb-0.5">Payment Memo / Note:</span>
          <p className="text-neutral-600">{payment.notes}</p>
        </div>
      )}

      {/* 7. Signatures */}
      <div className="mt-auto pt-8">
        <div className="flex justify-between items-end gap-12">
          <div className="text-center">
            <div
              className="w-56 text-neutral-500 font-semibold text-[9px] uppercase tracking-[0.14em] pt-1.5"
              style={{ borderTop: "1px solid #d4d4d4" }}
            >
              Customer / Payer Signature
            </div>
          </div>

          <div className="text-center">
            <div
              className="w-56 text-neutral-500 font-semibold text-[9px] uppercase tracking-[0.14em] pt-1.5"
              style={{ borderTop: "1px solid #d4d4d4" }}
            >
              Authorized Signature (Dani Brothers)
            </div>
          </div>
        </div>
      </div>

      {/* 8. Footer */}
      <footer
        className="mt-4 pt-2 text-center text-[9px] leading-[1.45] text-neutral-500"
        style={{ borderTop: "1px solid #ececec" }}
      >
        {settings?.footerText || "This is a computer-generated payment receipt. For queries contact 0333 1360441 or sales@danibrothers.com"}
      </footer>
    </div>
  );
};
