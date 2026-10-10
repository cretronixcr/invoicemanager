import React from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface QuotationItem {
  id?: string;
  serialNumber?: number;
  section?: string | null;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface QuotationData {
  quotationNumber?: string;
  date?: string | Date;
  status?: string;
  subtotal: number;
  discount: number;
  tax?: number;
  total: number;
  notes?: string | null;
  items: QuotationItem[];
  customer?: {
    name: string;
    customerCode?: string;
    companyName?: string | null;
    address: string;
    city: string;
    phone: string;
    email?: string | null;
  } | null;
}

interface SettingsData {
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
  defaultNotes?: string | null;
  footerText?: string | null;
}

interface QuotationPDFTemplateProps {
  quotation: QuotationData;
  settings?: SettingsData;
  id?: string;
}

// Shared card chrome — inline styles only, html2canvas-safe (plain hex,
// no Tailwind lab()/color-mix() vars, no opacity modifiers).
const cardStyle: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #e5e5e5",
  borderRadius: "8px",
};

const labelCls = "text-[8.5px] font-bold uppercase tracking-[0.16em] mb-1";

function statusBadge(status?: string) {
  switch (status) {
    case "Accepted":
      return "bg-emerald-100 text-emerald-800";
    case "Converted":
      return "bg-purple-100 text-purple-800";
    case "Rejected":
      return "bg-rose-100 text-rose-800";
    case "Sent":
      return "bg-indigo-100 text-indigo-800";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

export const QuotationPDFTemplate: React.FC<QuotationPDFTemplateProps> = ({
  quotation,
  settings,
  id = "quotation-pdf-template",
}) => {
  const currency = settings?.currency || "PKR";

  // Group line items by section, running serial across section breaks.
  const groupedSections: {
    sectionTitle: string | null;
    items: { item: QuotationItem; seq: number }[];
  }[] = [];
  let currentSection: string | null = null;
  let currentItems: { item: QuotationItem; seq: number }[] = [];
  let runningSeq = 0;

  const pushCurrent = () => {
    if (currentItems.length > 0) {
      groupedSections.push({ sectionTitle: currentSection, items: currentItems });
    }
  };

  quotation.items.forEach((item) => {
    const itemSection = item.section?.trim() || null;
    if (itemSection !== currentSection) {
      pushCurrent();
      currentSection = itemSection;
      currentItems = [];
    }
    runningSeq += 1;
    currentItems.push({ item, seq: runningSeq });
  });
  pushCurrent();

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

      {/* 2. Title band: QUOTATION label + quotation number chip */}
      <div className="flex items-end justify-between gap-6 mt-2.5">
        <div>
          <h1
            className="font-black uppercase text-neutral-900"
            style={{ fontSize: "24px", letterSpacing: "0.1em", lineHeight: 1 }}
          >
            Quotation
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
            Cost Proposal for Client
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
            Quotation Number
          </p>
          <p className="font-mono font-black text-neutral-900 text-[17px] leading-tight mt-0.5">
            {quotation.quotationNumber || "QT-NEW"}
          </p>
        </div>
      </div>

      {/* 3. Customer card & quotation details card */}
      <div className="grid grid-cols-2 gap-2.5 mt-2.5">
        <div style={cardStyle} className="px-3 py-2.5">
          <p className={labelCls} style={{ color: "#2041ce" }}>
            Prepared For
          </p>
          <p className="text-[12.5px] font-bold text-neutral-900">
            {quotation.customer?.name || "WALK-IN CUSTOMER"}
          </p>
          {quotation.customer?.companyName && (
            <p className="text-[10.5px] font-semibold text-neutral-700">
              {quotation.customer.companyName}
            </p>
          )}
          <p className="text-[10px] text-neutral-600 mt-0.5 leading-[1.45]">
            {quotation.customer?.address || "N/A"}
            {quotation.customer?.city ? `, ${quotation.customer.city}` : ""}
          </p>
          <p className="text-[10px] text-neutral-800 font-medium">
            {quotation.customer?.phone || "N/A"}
          </p>
          {quotation.customer?.email && (
            <p className="text-[10px] text-neutral-600">
              {quotation.customer.email}
            </p>
          )}
        </div>

        <div style={cardStyle} className="px-3 py-2.5">
          <p className={labelCls} style={{ color: "#2041ce" }}>
            Quotation Details
          </p>

          <div className="text-[10px]">
            <div className="flex justify-between gap-3 py-[2.5px] border-b border-neutral-200">
              <span className="text-neutral-500 font-medium">Quotation Date</span>
              <span className="font-semibold text-neutral-900">
                {formatDate(quotation.date)}
              </span>
            </div>

            <div className="flex justify-between gap-3 py-[2.5px] border-b border-neutral-200">
              <span className="text-neutral-500 font-medium">Client ID</span>
              <span className="font-semibold text-neutral-800">
                {quotation.customer?.customerCode || "—"}
              </span>
            </div>

            <div className="flex justify-between items-center gap-3 py-[3px]">
              <span className="text-neutral-500 font-medium">Status</span>
              <span
                className={`inline-block px-2.5 py-[2.5px] text-[8.5px] font-bold uppercase tracking-[0.08em] rounded-full ${statusBadge(
                  quotation.status
                )}`}
              >
                {quotation.status || "Draft"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Line items table */}
      <div
        className="mt-2.5"
        style={{ border: "1px solid #e5e5e5", borderRadius: "8px", overflow: "hidden" }}
      >
        <table
          className="w-full text-left border-collapse"
          style={{ tableLayout: "fixed" }}
        >
          <thead>
            <tr
              className="text-white text-[9px] uppercase tracking-[0.09em]"
              style={{ backgroundColor: "#2041ce" }}
            >
              <th
                className="py-[6px] px-2 text-center font-bold"
                style={{ width: "14mm" }}
              >
                S.No
              </th>
              <th
                className="py-[6px] px-2 text-center font-bold"
                style={{ width: "15mm" }}
              >
                Qty
              </th>
              <th className="py-[6px] px-2 font-bold">Description</th>
              <th
                className="py-[6px] px-2 text-right font-bold"
                style={{ width: "30mm" }}
              >
                Rate ({currency})
              </th>
              <th
                className="py-[6px] px-2 text-right font-bold"
                style={{ width: "34mm" }}
              >
                Amount ({currency})
              </th>
            </tr>
          </thead>
          <tbody className="text-[10.5px]">
            {groupedSections.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-4 text-center text-neutral-500 border-b border-neutral-200"
                >
                  No line items
                </td>
              </tr>
            )}

            {groupedSections.map((group, gIdx) => (
              <React.Fragment key={gIdx}>
                {group.sectionTitle && (
                  <tr style={{ backgroundColor: "#eef2ff" }}>
                    <td
                      colSpan={5}
                      className="py-[4.5px] px-3 font-bold uppercase tracking-[0.1em] text-[9px]"
                      style={{
                        borderBottom: "1px solid #c7d2fe",
                        color: "#2041ce",
                      }}
                    >
                      {group.sectionTitle}
                    </td>
                  </tr>
                )}
                {group.items.map(({ item, seq }, iIdx) => (
                  <tr
                    key={item.id || `${gIdx}-${iIdx}`}
                    className={iIdx % 2 === 1 ? "bg-neutral-50" : "bg-white"}
                    style={{ borderBottom: "1px solid #e5e5e5" }}
                  >
                    <td className="py-[5px] px-2 text-center text-neutral-400 font-semibold align-top">
                      {seq}
                    </td>
                    <td
                      className="py-[5px] px-2 text-center font-bold text-neutral-900 align-top"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {item.quantity}
                    </td>
                    <td className="py-[5px] px-2 text-neutral-800 align-top pr-3">
                      <span className="font-semibold text-neutral-900">
                        {item.description.split("\n")[0]}
                      </span>
                      {item.description.includes("\n") && (
                        <span className="block text-[9.5px] text-neutral-500 mt-0.5 whitespace-pre-wrap">
                          {item.description.split("\n").slice(1).join("\n")}
                        </span>
                      )}
                    </td>
                    <td
                      className="py-[5px] px-2 text-right font-medium text-neutral-600 align-top"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {item.rate.toLocaleString("en-PK")}
                    </td>
                    <td
                      className="py-[5px] px-2 text-right font-semibold text-neutral-900 align-top"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {item.amount.toLocaleString("en-PK")}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5. Notes & signatures (left) + totals (right) */}
      <div className="grid grid-cols-12 gap-2.5 mt-2.5 flex-1">
        <div className="col-span-7 flex flex-col text-[10.5px]">
          <div style={cardStyle} className="px-3 py-2.5">
            <p className={labelCls} style={{ color: "#2041ce" }}>
              Terms &amp; Conditions / Notes
            </p>
            <p className="text-neutral-600 text-[10px] leading-[1.5] whitespace-pre-wrap">
              {quotation.notes ||
                settings?.defaultNotes ||
                "Prices are valid for 7 days from the quotation date. Delivery and installation timelines confirmed on order approval."}
            </p>
          </div>

          <div className="flex-1" />

          <div className="pt-2">
            <div className="flex justify-between items-end gap-6">
              <span
                className="w-40 text-center text-neutral-500 font-semibold text-[9px] uppercase tracking-[0.14em] pt-1.5"
                style={{ borderTop: "1px solid #d4d4d4" }}
              >
                Authorized Signature
              </span>
              <span
                className="w-40 text-center text-neutral-500 font-semibold text-[9px] uppercase tracking-[0.14em] pt-1.5"
                style={{ borderTop: "1px solid #d4d4d4" }}
              >
                Customer Signature
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-5 text-[10.5px]">
          <div
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <table className="w-full border-collapse">
              <tbody>
                <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td className="py-[5px] px-3 text-neutral-500 font-medium">
                    Subtotal
                  </td>
                  <td
                    className="py-[5px] px-3 text-right font-semibold text-neutral-900"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(quotation.subtotal, currency)}
                  </td>
                </tr>

                {quotation.discount > 0 && (
                  <tr className="text-rose-700" style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td className="py-[5px] px-3 font-medium">Discount</td>
                    <td
                      className="py-[5px] px-3 text-right font-semibold"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      - {formatCurrency(quotation.discount, currency)}
                    </td>
                  </tr>
                )}

                {(quotation.tax ?? 0) > 0 && (
                  <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
                    <td className="py-[5px] px-3 text-neutral-500 font-medium">Tax / GST</td>
                    <td
                      className="py-[5px] px-3 text-right font-medium text-neutral-900"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      + {formatCurrency(quotation.tax || 0, currency)}
                    </td>
                  </tr>
                )}

                <tr
                  className="text-white"
                  style={{ backgroundColor: "#2041ce" }}
                >
                  <td className="py-[6px] px-3 uppercase tracking-[0.08em] text-[10px] font-bold">
                    Total Estimate
                  </td>
                  <td
                    className="py-[6px] px-3 text-right font-black text-[13px]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(quotation.total, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[8.5px] text-neutral-400 mt-1 text-right uppercase tracking-[0.1em] font-semibold">
            Amounts shown in {currency}
          </p>
        </div>
      </div>

      {/* 6. Footer */}
      <footer
        className="mt-2 pt-1.5 text-center text-[9px] leading-[1.45] text-neutral-500"
        style={{ borderTop: "1px solid #ececec" }}
      >
        {settings?.footerText || "This is a computer-generated quotation."}
      </footer>
    </div>
  );
};
