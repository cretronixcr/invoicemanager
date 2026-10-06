"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, toDecimalSafe } from "@/lib/utils";
import { useCurrency } from "@/lib/currency";
import { QuotationPDFTemplate } from "@/components/quotation/QuotationPDFTemplate";
import { ArrowLeft, Trash2, Save, Eye, Users, Package } from "lucide-react";

type Settings =
  React.ComponentProps<typeof QuotationPDFTemplate>["settings"];

type Customer = {
  id: string;
  name: string;
  companyName?: string | null;
  customerCode: string;
  address: string;
  city: string;
  phone: string;
};

type Product = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  rate: number;
};

type ItemRow = {
  productId?: string;
  section: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

function NewQuotationPageInner() {
  const router = useRouter();
  const currency = useCurrency();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const isEdit = Boolean(editId);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [editing, setEditing] = useState<{
    id: string;
    quotationNumber: string;
    status: string;
  } | null>(null);
  const [editLoading, setEditLoading] = useState(isEdit);
  const [editError, setEditError] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [items, setItems] = useState<ItemRow[]>([
    { section: "A - Cameras", description: "", quantity: 1, rate: 0, amount: 0 },
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
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([custData, prodData, settData]) => {
      if (custData.success) {
        setCustomers(custData.customers);
        if (custData.customers.length > 0 && !customerId && !editId) {
          setCustomerId(custData.customers[0].id);
        }
      }
      if (prodData.success) setProducts(prodData.products);
      if (settData.success) setSettings(settData.settings);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load quotation in edit mode
  useEffect(() => {
    if (!editId) return;
    fetch(`/api/quotations/${editId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.quotation) {
          const q = data.quotation;
          setEditing({
            id: q.id,
            quotationNumber: q.quotationNumber,
            status: q.status || "Draft",
          });
          setCustomerId(q.customerId);
          setDate(new Date(q.date).toISOString().split("T")[0]);
          setDiscount(q.discount || 0);
          setTax(q.tax || 0);
          setNotes(q.notes || "");
          if (q.items && q.items.length > 0) {
            setItems(
              q.items.map(
                (it: {
                  productId?: string | null;
                  section?: string | null;
                  description: string;
                  quantity: number;
                  rate: number;
                  amount: number;
                }) => ({
                  productId: it.productId || undefined,
                  section: it.section || "",
                  description: it.description,
                  quantity: it.quantity,
                  rate: it.rate,
                  amount: it.amount,
                })
              )
            );
          }
        } else {
          setEditError(data.error || "Quotation not found");
        }
      })
      .catch(() => setEditError("Failed to load quotation"))
      .finally(() => setEditLoading(false));
  }, [editId]);

  const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
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
        const rate = updated[index].rate || 0;
        updated[index] = {
          ...updated[index],
          productId: selected.id,
          section: selected.category || updated[index].section,
          description: selected.description
            ? `${selected.name}\n${selected.description}`
            : selected.name,
          amount: toDecimalSafe(qty * rate),
        };
        return updated;
      });
    }
  };

  const addItemRow = (sectionName: string = "A - Cameras") => {
    setItems((prev) => [
      ...prev,
      { section: sectionName, description: "", quantity: 1, rate: 0, amount: 0 },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(
    () => items.reduce((acc, curr) => toDecimalSafe(acc + curr.amount), 0),
    [items]
  );

  const total = useMemo(
    () => toDecimalSafe(subtotal - Number(discount || 0) + Number(tax || 0)),
    [subtotal, discount, tax]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId]
  );

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
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add customer");
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
        date: new Date(date).toISOString(),
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
        tax: Number(tax || 0),
        total,
        status: editing?.status || "Draft",
        notes: notes || null,
      };

      const res = await fetch(
        isEdit ? `/api/quotations/${editId}` : "/api/quotations",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (data.success) {
        router.push(`/quotations/${data.quotation.id}`);
      } else {
        alert(data.error || "Failed to save quotation.");
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to submit quotation"
      );
    } finally {
      setSaving(false);
    }
  };

  if (editLoading) {
    return (
      <div className="flex items-center justify-center gap-2 min-h-[50vh] text-neutral-400 text-xs">
        <span className="h-5 w-5 rounded-full border-2 border-neutral-300 border-t-indigo-600 animate-spin inline-block" />
        Loading quotation for editing...
      </div>
    );
  }

  if (editError) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm text-center">
        <p className="text-sm font-semibold text-neutral-800 mb-1">
          Cannot edit quotation
        </p>
        <p className="text-xs text-neutral-500 mb-4">{editError}</p>
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-white via-white to-indigo-50 p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={isEdit ? `/quotations/${editId}` : "/quotations"}
            className="p-2 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <span>
                {isEdit
                  ? `Edit Quotation ${editing?.quotationNumber || ""}`
                  : "Create New Quotation"}
              </span>
              {isEdit && (
                <span className="bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Edit Mode
                </span>
              )}
            </h1>
            <p className="text-xs text-neutral-500">
              {isEdit
                ? "Update client, items, or pricing. Quotation number stays unchanged."
                : "Prepare a cost proposal - convert it to an invoice with one click."}
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
            <span>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Save Quotation"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Client & Info Card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Client &amp; Quotation Details</span>
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
                  Select Client *
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
                      {c.name} {c.companyName ? `(${c.companyName})` : ""} -{" "}
                      {c.customerCode}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <div className="mt-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-[11px] text-neutral-600 space-y-0.5">
                    <p className="font-semibold text-neutral-900">
                      Client ID: {selectedCustomer.customerCode}
                    </p>
                    <p>
                      {selectedCustomer.address}, {selectedCustomer.city}
                    </p>
                    <p>Phone: {selectedCustomer.phone}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Quotation Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                  required
                />
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h2 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>Quotation Items</span>
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Select from the product catalog or enter custom items and services.
                </p>
              </div>
              <button
                type="button"
                onClick={() => addItemRow("A - Cameras")}
                className="px-3 py-1.5 bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-lg text-[11px] transition-colors"
              >
                + Add Item
              </button>
            </div>

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
                      <input
                        type="text"
                        placeholder="Section (e.g. A - Cameras, B - NVR, C - Installation)"
                        value={item.section}
                        onChange={(e) => updateItem(idx, "section", e.target.value)}
                        className="w-full p-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-800 font-semibold text-[11px]"
                      />
                      <select
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        defaultValue=""
                        className="w-full p-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-700 text-[11px]"
                      >
                        <option value="">-- Load from Product Catalog --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatCurrency(p.rate, currency)})
                          </option>
                        ))}
                      </select>
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

                  <textarea
                    rows={2}
                    placeholder="Enter detailed technical description (camera specs, NVR channels, cabling...)"
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    className="w-full p-2 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-xs"
                    required
                  />

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
                        {formatCurrency(item.amount, currency)}
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
              Terms &amp; Conditions / Quotation Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-800 text-xs"
              placeholder="Validity period, warranty, delivery terms, bank details..."
            />
          </div>
        </div>

        {/* Calculation Panel */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm space-y-4 text-xs sticky top-4">
            <h2 className="font-bold text-neutral-900 text-sm border-b border-neutral-100 pb-2">
              Financial Calculations
            </h2>

            <div className="flex justify-between items-center text-neutral-600 font-medium">
              <span>Subtotal:</span>
              <span className="font-bold text-neutral-900 text-sm tabular-nums">
                {formatCurrency(subtotal, currency)}
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
                Total Estimate:
              </span>
              <span className="text-base font-black tabular-nums">
                {formatCurrency(total, currency)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : isEdit ? "Save Changes" : "Save Quotation"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live PDF Preview */}
      {showPreview && (
        <div className="bg-neutral-800 p-4 sm:p-6 rounded-2xl border border-neutral-700 shadow-inner flex justify-center overflow-x-auto mt-6">
          <div className="zoom-[0.44] sm:zoom-[0.7] md:zoom-[0.85] xl:zoom-100">
            <QuotationPDFTemplate
              quotation={{
                quotationNumber: editing?.quotationNumber || "QT-PREVIEW",
                date: new Date(date),
                status: "Draft",
                subtotal,
                discount: Number(discount || 0),
                tax: Number(tax || 0),
                total,
                notes,
                items: items.map((it, idx) => ({
                  serialNumber: idx + 1,
                  section: it.section,
                  description: it.description || "Item description...",
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
              settings={settings || undefined}
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
              Enter client details for this quotation.
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm transition-all active:translate-y-px"
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

export default function NewQuotationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 min-h-screen text-neutral-400 text-xs">
          <span className="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-indigo-600 animate-spin inline-block" />{" "}
          Loading quotation builder...
        </div>
      }
    >
      <NewQuotationPageInner />
    </Suspense>
  );
}
