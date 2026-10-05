"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, toDecimalSafe } from "@/lib/utils";
import { InvoicePDFTemplate } from "@/components/invoice/InvoicePDFTemplate";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Eye,
  FileCheck,
  Zap,
  Users,
  Package,
} from "lucide-react";

interface ItemRow {
  productId?: string;
  section: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

function NewInvoicePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isQuick = searchParams.get("quick") === "true";
  const duplicateId = searchParams.get("duplicateId");
  const quotationId = searchParams.get("quotationId");

  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Form states
  const [customerId, setCustomerId] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [quotationNumber, setQuotationNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [advance, setAdvance] = useState<number>(0);
  const [items, setItems] = useState<ItemRow[]>([
    {
      section: "A - Cameras",
      description: "",
      quantity: 1,
      rate: 0,
      amount: 0,
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Quick Customer Creation modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustCompany, setNewCustCompany] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustCity, setNewCustCity] = useState("Karachi");
  const [newCustPhone, setNewCustPhone] = useState("");

  useEffect(() => {
    // Fetch initial setup data
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([custData, prodData, settData]) => {
      if (custData.success) {
        setCustomers(custData.customers);
        if (custData.customers.length > 0 && !customerId) {
          setCustomerId(custData.customers[0].id);
        }
      }
      if (prodData.success) setProducts(prodData.products);
      if (settData.success) {
        setSettings(settData.settings);
        if (settData.settings.defaultNotes) {
          setNotes(settData.settings.defaultNotes);
        }
      }
    });
  }, []);

  // Handle duplicate or convert from quotation
  useEffect(() => {
    if (duplicateId) {
      fetch(`/api/invoices/${duplicateId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.invoice) {
            const inv = data.invoice;
            setCustomerId(inv.customerId);
            setReferenceNumber(inv.referenceNumber || "");
            setQuotationNumber(inv.quotation?.quotationNumber || "");
            setDiscount(inv.discount || 0);
            setAdditionalCharges(inv.additionalCharges || 0);
            setTax(inv.tax || 0);
            setNotes(inv.notes || "");
            if (inv.items && inv.items.length > 0) {
              setItems(
                inv.items.map((it: any) => ({
                  productId: it.productId || undefined,
                  section: it.section || "",
                  description: it.description,
                  quantity: it.quantity,
                  rate: it.rate,
                  amount: it.amount,
                }))
              );
            }
          }
        });
    } else if (quotationId) {
      fetch(`/api/quotations`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            const qt = data.quotations.find((q: any) => q.id === quotationId);
            if (qt) {
              setCustomerId(qt.customerId);
              setQuotationNumber(qt.quotationNumber);
              setDiscount(qt.discount || 0);
              setTax(qt.tax || 0);
              setNotes(qt.notes || "");
              if (qt.items && qt.items.length > 0) {
                setItems(
                  qt.items.map((it: any) => ({
                    productId: it.productId || undefined,
                    section: it.section || "",
                    description: it.description,
                    quantity: it.quantity,
                    rate: it.rate,
                    amount: it.amount,
                  }))
                );
              }
            }
          }
        });
    }
  }, [duplicateId, quotationId]);

  // Handle Item Row changes
  const updateItem = (index: number, field: keyof ItemRow, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "rate") {
        const qty = field === "quantity" ? Number(value) : item.quantity;
        const rt = field === "rate" ? Number(value) : item.rate;
        item.amount = toDecimalSafe(qty * rt);
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const selected = products.find((p) => p.id === prodId);
    if (selected) {
      setItems((prev) => {
        const updated = [...prev];
        const qty = updated[index].quantity || 1;
        const lineAmount = toDecimalSafe(qty * selected.rate);
        updated[index] = {
          ...updated[index],
          productId: selected.id,
          section: selected.category || updated[index].section,
          description: selected.description
            ? `${selected.name}\n${selected.description}`
            : selected.name,
          rate: selected.rate,
          amount: lineAmount,
        };
        return updated;
      });
    }
  };

  const addItemRow = (sectionName: string = "A - Cameras") => {
    setItems((prev) => [
      ...prev,
      {
        section: sectionName,
        description: "",
        quantity: 1,
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, curr) => toDecimalSafe(acc + curr.amount), 0);
  }, [items]);

  const total = useMemo(() => {
    return toDecimalSafe(
      subtotal - Number(discount || 0) + Number(additionalCharges || 0) + Number(tax || 0)
    );
  }, [subtotal, discount, additionalCharges, tax]);

  const balance = useMemo(() => {
    return toDecimalSafe(total - Number(advance || 0));
  }, [total, advance]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customers, customerId]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone || !newCustAddress) {
      alert("Name, Address, and Phone are required.");
      return;
    }
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustName,
          companyName: newCustCompany || null,
          address: newCustAddress,
          city: newCustCity,
          phone: newCustPhone,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCustomers((prev) => [data.customer, ...prev]);
        setCustomerId(data.customer.id);
        setShowAddCustomerModal(false);
        setNewCustName("");
        setNewCustCompany("");
        setNewCustAddress("");
        setNewCustPhone("");
      } else {
        alert(data.error || "Failed to add customer");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      alert("Please select a customer.");
      return;
    }
    if (items.length === 0 || !items.some((i) => i.description.trim())) {
      alert("Please add at least one line item with a description.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId,
        quotationId: quotationId || null,
        referenceNumber: referenceNumber || null,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        items: items.map((it, idx) => ({
          productId: it.productId || null,
          section: it.section || null,
          serialNumber: idx + 1,
          description: it.description,
          quantity: Number(it.quantity),
          rate: Number(it.rate),
          amount: Number(it.amount),
        })),
        subtotal,
        discount: Number(discount || 0),
        additionalCharges: Number(additionalCharges || 0),
        tax: Number(tax || 0),
        total,
        advance: Number(advance || 0),
        notes: notes || null,
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/invoices/${data.invoice.id}`);
      } else {
        alert(data.error || "Failed to save invoice.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-white via-white to-indigo-50 p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <span>{isQuick ? "Quick Invoice Creation" : "Create New Invoice"}</span>
              {isQuick && (
                <span className="bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Fast Mode
                </span>
              )}
            </h1>
            <p className="text-xs text-neutral-500">
              Configure customer, technical items, and financial values.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>{showPreview ? "Hide Preview" : "Live PDF Preview"}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Invoice..." : "Generate Invoice PDF"}</span>
          </button>
        </div>
      </div>

      {/* Main Creation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Info Card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Customer &amp; Invoice Details</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 -my-1 rounded-lg transition-colors"
              >
                + Add New Customer
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Select Customer *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ""} - {c.customerCode}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="mt-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-[11px] text-neutral-600 space-y-0.5">
                    <p className="font-semibold text-neutral-900">
                      Client ID: {selectedCustomer.customerCode}
                    </p>
                    <p>{selectedCustomer.address}, {selectedCustomer.city}</p>
                    <p>Phone: {selectedCustomer.phone}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Invoice Date *
                    </label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Quotation ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0000200"
                      value={quotationNumber}
                      onChange={(e) => setQuotationNumber(e.target.value)}
                      className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CCTV-SITE-01"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>Invoice Items &amp; Categories</span>
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Select predefined products or enter custom hardware and installation charges.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addItemRow("A - Cameras")}
                  className="px-3 py-1.5 bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-lg text-[11px] transition-colors"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Line Items List */}
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-neutral-50/70 border border-neutral-200 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/30">
                      {idx + 1}
                    </span>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Section / Category Group */}
                      <div>
                        <input
                          type="text"
                          placeholder="Section (e.g. A - Cameras, B - NVR, C - Installation)"
                          value={item.section}
                          onChange={(e) => updateItem(idx, "section", e.target.value)}
                          className="w-full p-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-800 font-semibold text-[11px]"
                        />
                      </div>

                      {/* Quick Select Product */}
                      <div>
                        <select
                          onChange={(e) => handleProductSelect(idx, e.target.value)}
                          defaultValue=""
                          className="w-full p-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-700 text-[11px]"
                        >
                          <option value="">-- Load from Product Catalog --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatCurrency(p.rate)})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 rounded-lg text-neutral-400 bg-neutral-100 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Remove Row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Description Box */}
                  <div>
                    <textarea
                      rows={2}
                      placeholder="Enter detailed technical description (Hikvision camera specs, NVR channels, cabling details...)"
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      className="w-full p-2 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-xs"
                      required
                    />
                  </div>

                  {/* Qty, Rate, Amount Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                        Quantity
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        className="w-full p-2 bg-white border border-neutral-300 rounded-xl text-neutral-900 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                        Rate (PKR)
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={item.rate}
                        onChange={(e) => updateItem(idx, "rate", e.target.value)}
                        className="w-full p-2 bg-white border border-neutral-300 rounded-xl text-neutral-900 font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 mb-0.5">
                        Amount (PKR)
                      </label>
                      <div className="w-full p-2 bg-neutral-100 border border-neutral-300 rounded-xl text-neutral-900 font-bold text-right tabular-nums">
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addItemRow("C - Installation / Services")}
              className="w-full py-2.5 border-2 border-dashed border-neutral-300 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 text-neutral-600 font-semibold rounded-xl text-center transition-colors"
            >
              + Add Another Line Item
            </button>
          </div>

          {/* Notes Card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm text-xs space-y-2">
            <label className="block font-bold text-neutral-900">
              Terms &amp; Conditions / Invoice Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-800 text-xs"
              placeholder="Custom terms, warranty specifications, bank details..."
            />
          </div>
        </div>

        {/* Calculation & Summary Panel (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4 text-xs sticky top-4">
            <h2 className="font-bold text-neutral-900 text-sm border-b border-neutral-100 pb-2 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Financial Calculations</span>
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-neutral-600 font-medium">
                <span>Subtotal:</span>
                <span className="font-bold text-neutral-900 text-sm tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-rose-700 mb-1">
                  Discount (PKR):
                </label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Additional Adjustment / Delivery (PKR):
                </label>
                <input
                  type="number"
                  min="0"
                  value={additionalCharges}
                  onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
                  Tax / GST (PKR):
                </label>
                <input
                  type="number"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                />
              </div>

              <div className="p-3.5 bg-neutral-900 text-white rounded-xl flex justify-between items-center">
                <span className="font-bold uppercase tracking-wider text-xs">
                  Grand Total:
                </span>
                <span className="text-base font-black tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-700 mb-1">
                  Advance Payment Received (PKR):
                </label>
                <input
                  type="number"
                  min="0"
                  max={total}
                  value={advance}
                  onChange={(e) => setAdvance(Number(e.target.value))}
                  className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 font-bold"
                />
              </div>

              <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xl flex justify-between items-center">
                <span className="font-bold text-neutral-900 uppercase tracking-wide">
                  Remaining Balance:
                </span>
                <span className="text-base font-black text-rose-600 tabular-nums">
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Generating..." : "Save &amp; Generate Invoice PDF"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live PDF Preview section if toggled */}
      {showPreview && (
        <div className="bg-neutral-800 p-4 sm:p-6 rounded-2xl border border-neutral-700 shadow-inner flex justify-center overflow-x-auto mt-6">
          <div className="zoom-[0.44] sm:zoom-[0.7] md:zoom-[0.85] xl:zoom-100">
          <InvoicePDFTemplate
            invoice={{
              invoiceNumber: "INV-PREVIEW",
              invoiceDate: new Date(invoiceDate),
              dueDate: dueDate ? new Date(dueDate) : null,
              quotationNumber: quotationNumber || "0000200",
              referenceNumber: referenceNumber || null,
              subtotal,
              discount: Number(discount || 0),
              additionalCharges: Number(additionalCharges || 0),
              tax: Number(tax || 0),
              total,
              advance: Number(advance || 0),
              balance,
              status: balance <= 0 ? "Paid" : advance > 0 ? "Partially Paid" : "Issued",
              notes,
              items: items.map((it, idx) => ({
                serialNumber: idx + 1,
                section: it.section,
                description: it.description || "Product description...",
                quantity: Number(it.quantity),
                rate: Number(it.rate),
                amount: Number(it.amount),
              })),
              customer: selectedCustomer || {
                name: "Customer Name",
                customerCode: "000080",
                address: "Street Address",
                city: "Karachi",
                phone: "0300 0000000",
              },
            }}
            settings={settings}
          />
          </div>
        </div>
      )}

      {/* Quick Customer Creation Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md p-6">
            <h2 className="text-base font-bold text-neutral-900 mb-1">
              Add New Customer
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Enter customer details for instant invoice assignment.
            </p>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. KHALID BHAI"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Al-Khalid Traders"
                  value={newCustCompany}
                  onChange={(e) => setNewCustCompany(e.target.value)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  placeholder="Street / Sector address"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Phone *
                  </label>
                  <input
                    type="text"
                    placeholder="0300 1234567"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full p-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px"
                >
                  Save &amp; Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center gap-2 min-h-screen text-neutral-400 text-xs"><span className="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-indigo-600 animate-spin inline-block" /> Loading invoice builder...</div>}>
      <NewInvoicePageInner />
    </Suspense>
  );
}
