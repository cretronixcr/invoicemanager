"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Building, FileSpreadsheet } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [startingInvoiceNumber, setStartingInvoiceNumber] = useState(1);
  const [quotationPrefix, setQuotationPrefix] = useState("QT-");
  const [startingQuotationNum, setStartingQuotationNum] = useState(200);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("");
  const [defaultNotes, setDefaultNotes] = useState("");
  const [footerText, setFooterText] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) {
          const s = data.settings;
          setSettings(s);
          setBusinessName(s.businessName || "DANI BROTHERS");
          setAddress(s.address || "Shop B-13 Sector Z-6 Gulshan e Maymar");
          setCity(s.city || "Sindh, Karachi");
          setPhone(s.phone || "0333 1360441");
          setEmail(s.email || "sales@danibrothers.com");
          setWebsite(s.website || "www.danibrothers.com");
          setCurrency(s.currency || "PKR");
          setInvoicePrefix(s.invoicePrefix || "INV-");
          setStartingInvoiceNumber(s.startingInvoiceNumber || 1);
          setQuotationPrefix(s.quotationPrefix || "QT-");
          setStartingQuotationNum(s.startingQuotationNum || 200);
          setDefaultPaymentTerms(s.defaultPaymentTerms || "");
          setDefaultNotes(s.defaultNotes || "");
          setFooterText(s.footerText || "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          address,
          city,
          phone,
          email,
          website: website || null,
          currency,
          invoicePrefix,
          startingInvoiceNumber: Number(startingInvoiceNumber),
          quotationPrefix,
          startingQuotationNum: Number(startingQuotationNum),
          defaultPaymentTerms: defaultPaymentTerms || null,
          defaultNotes: defaultNotes || null,
          footerText: footerText || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Settings updated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        alert(data.error || "Failed to update settings");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-neutral-400 text-xs">
        <span className="h-5 w-5 rounded-full border-2 border-neutral-300 border-t-indigo-600 animate-spin inline-block" />
        Loading business settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-white via-white to-indigo-50 p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
          Business &amp; Invoice Settings
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Configure business details, invoice numbering formats, currencies, and default terms.
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Company Identity */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
          <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Building className="w-4 h-4 text-indigo-600" />
            <span>Company Identity & Contact (Printed on PDF)</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Business Address *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                City / Province *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Official Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Invoice Numbering & Currency */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
          <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2 border-b border-neutral-100 pb-3">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Numbering Formats & Currency</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Default Currency
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Starting Invoice Number
              </label>
              <input
                type="number"
                min="1"
                value={startingInvoiceNumber}
                onChange={(e) => setStartingInvoiceNumber(Number(e.target.value))}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono"
                required
              />
            </div>
          </div>
        </div>

        {/* Default Notes & Terms */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
          <h2 className="font-bold text-neutral-900 text-sm border-b border-neutral-100 pb-3">
            Default Terms, Conditions & Footers
          </h2>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Default Notes & Warranty Disclaimers
            </label>
            <textarea
              rows={3}
              value={defaultNotes}
              onChange={(e) => setDefaultNotes(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              PDF Footer Text
            </label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px disabled:opacity-60 text-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
