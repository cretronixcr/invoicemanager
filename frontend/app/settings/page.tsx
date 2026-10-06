"use client";

import { useEffect, useState, useActionState } from "react";
import {
  Settings,
  Save,
  Building,
  FileSpreadsheet,
  Upload,
  ImageOff,
  KeyRound,
  UserPlus,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import {
  changePassword,
  createUser,
  deleteUser,
} from "@/app/actions/account";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function SettingsPage() {
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
  const [startingQuotationNum, setStartingQuotationNum] = useState(1);
  const [customerPrefix, setCustomerPrefix] = useState("CUST-");
  const [startingCustomerNum, setStartingCustomerNum] = useState(1);
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("");
  const [defaultNotes, setDefaultNotes] = useState("");
  const [footerText, setFooterText] = useState("");
  const [logo, setLogo] = useState<string | null>(null);

  // Security & Users
  const [pwState, pwAction, pwPending] = useActionState(changePassword, undefined);
  const [userState, userAction, userPending] = useActionState(createUser, undefined);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const refreshUsers = async () => {
    try {
      const d = await fetch("/api/users").then((r) => r.json());
      if (d.success) {
        setUsers(d.users);
        setCurrentUserId(d.currentUserId || null);
      }
    } catch {
      /* list load failure is non-fatal */
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await fetch("/api/users").then((r) => r.json());
        if (!cancelled && d.success) {
          setUsers(d.users);
          setCurrentUserId(d.currentUserId || null);
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteUser = async (u: UserRow) => {
    const ok = window.confirm(`Remove ${u.name} (${u.email})?`);
    if (!ok) return;
    const res = await deleteUser(u.id);
    if (res?.error) {
      alert(res.error);
    } else {
      await refreshUsers();
    }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      alert("Logo must be 300 KB or smaller.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.onerror = () => alert("Could not read that file.");
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.settings) {
          const s = data.settings;
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
          setStartingQuotationNum(s.startingQuotationNum || 1);
          setCustomerPrefix(s.customerPrefix || "CUST-");
          setStartingCustomerNum(s.startingCustomerNum || 1);
          setDefaultPaymentTerms(s.defaultPaymentTerms || "");
          setDefaultNotes(s.defaultNotes || "");
          setFooterText(s.footerText || "");
          setLogo(s.logo || null);
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
          logo: logo || null,
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
          customerPrefix,
          startingCustomerNum: Number(startingCustomerNum),
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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save settings");
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

        {/* Logo & Branding */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
          <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Settings className="w-4 h-4 text-indigo-600" />
            <span>Logo &amp; Branding</span>
          </h2>

          <div className="flex flex-wrap items-center gap-5">
            <div className="h-24 w-48 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-center p-3 shrink-0">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt="Business logo"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-neutral-400">
                  <ImageOff className="w-5 h-5" />
                  <span className="text-[10px] font-medium">
                    Default logo in use
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Upload Logo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoFile}
                />
              </label>
              {logo && (
                <button
                  type="button"
                  onClick={() => setLogo(null)}
                  className="block px-4 py-2 bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-600 font-semibold rounded-xl transition-colors"
                >
                  Remove (use default)
                </button>
              )}
              <p className="text-[11px] text-neutral-500 max-w-xs">
                PNG, JPG or SVG up to 300 KB. Applied to invoice &amp;
                quotation PDF headers. Save Settings to apply.
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Numbering & Currency */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
          <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2 border-b border-neutral-100 pb-3">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Numbering Formats & Currency</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Quotation Prefix
              </label>
              <input
                type="text"
                value={quotationPrefix}
                onChange={(e) => setQuotationPrefix(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Starting Quotation Number
              </label>
              <input
                type="number"
                min="1"
                value={startingQuotationNum}
                onChange={(e) => setStartingQuotationNum(Number(e.target.value))}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Customer Prefix
              </label>
              <input
                type="text"
                value={customerPrefix}
                onChange={(e) => setCustomerPrefix(e.target.value)}
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Starting Customer Number
              </label>
              <input
                type="number"
                min="1"
                value={startingCustomerNum}
                onChange={(e) => setStartingCustomerNum(Number(e.target.value))}
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

      {/* Security & Users */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-5">
        <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2 border-b border-neutral-100 pb-3">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>Security &amp; Users</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change own password */}
          <form action={pwAction} className="space-y-3 text-xs">
            <p className="font-bold text-neutral-800 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              Change Your Password
            </p>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="current"
                autoComplete="current-password"
                required
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                New Password (min 8 chars)
              </label>
              <input
                type="password"
                name="next"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirm"
                autoComplete="new-password"
                minLength={8}
                required
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
              />
            </div>

            {pwState?.error && (
              <p className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold">
                {pwState.error}
              </p>
            )}
            {pwState?.success && (
              <p className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-semibold">
                {pwState.success}
              </p>
            )}

            <button
              type="submit"
              disabled={pwPending}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-all active:translate-y-px disabled:opacity-60"
            >
              {pwPending ? "Updating..." : "Update Password"}
            </button>
          </form>

          {/* Add a user */}
          <form action={userAction} className="space-y-3 text-xs">
            <p className="font-bold text-neutral-800 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              Add Team Member
            </p>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                required
                minLength={2}
                placeholder="e.g. Ali Raza"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="ali@danibrothers.com"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Password (min 8 chars)
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
              />
            </div>

            {userState?.error && (
              <p className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-semibold">
                {userState.error}
              </p>
            )}
            {userState?.success && (
              <p className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-semibold">
                {userState.success}
              </p>
            )}

            <button
              type="submit"
              disabled={userPending}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all active:translate-y-px disabled:opacity-60"
            >
              {userPending ? "Adding..." : "Add User"}
            </button>
          </form>
        </div>

        {/* Users list */}
        <div className="border-t border-neutral-100 pt-4">
          <p className="font-bold text-neutral-800 text-xs mb-2">
            Users ({users.length})
          </p>
          <div className="divide-y divide-neutral-100">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 truncate">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase">
                        You
                      </span>
                    )}
                  </p>
                  <p className="text-neutral-500 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-bold uppercase">
                    {u.role}
                  </span>
                  {u.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u)}
                      title="Remove user"
                      className="p-1.5 rounded-lg text-neutral-400 bg-neutral-100 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="py-3 text-neutral-400 text-xs">Loading users...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
