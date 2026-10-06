"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Users, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Download } from "lucide-react";

const PAGE_SIZE = 20;

type Customer = {
  id: string;
  customerCode: string;
  name: string;
  companyName?: string | null;
  address: string;
  city: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  _count?: { invoices: number; quotations: number };
};

function CustomersPageInner() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Form states
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Karachi");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const fetchCustomers = async () => {
    try {
      const res = await fetch(
        `/api/customers?search=${encodeURIComponent(search)}&page=${page}&pageSize=${PAGE_SIZE}`
      );
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
        setTotal(
          typeof data.total === "number" ? data.total : data.customers.length
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/customers?search=${encodeURIComponent(search)}&page=${page}&pageSize=${PAGE_SIZE}`
        );
        const data = await res.json();
        if (!cancelled && data.success) {
          setCustomers(data.customers);
          setTotal(
            typeof data.total === "number" ? data.total : data.customers.length
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, page]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName("");
    setCompanyName("");
    setAddress("");
    setCity("Karachi");
    setPhone("");
    setEmail("");
    setNotes("");
    setShowModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setCompanyName(c.companyName || "");
    setAddress(c.address);
    setCity(c.city);
    setPhone(c.phone);
    setEmail(c.email || "");
    setNotes(c.notes || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          companyName: companyName || null,
          address,
          city,
          phone,
          email: email || null,
          notes: notes || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchCustomers();
      } else {
        alert(data.error || "Failed to save customer");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save customer");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer? All associated invoices will be removed.")) {
      return;
    }
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-br from-white via-white to-indigo-50 p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Maintain client records, address books, and view associated billing history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/reports/export?type=customers"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex items-center justify-between gap-4 text-xs">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, ID, phone, company..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
          />
        </div>
        <span className="text-neutral-500 font-medium">
          Total Customers: {total}
        </span>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <p className="col-span-full py-8 text-center text-xs text-neutral-400">
            Loading customers...
          </p>
        ) : customers.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center gap-2 text-neutral-400">
            <Users className="w-7 h-7" />
            <p className="text-xs">
              No customers found. Click &quot;Add New Customer&quot; to create one.
            </p>
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c.id}
              className="group bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between text-xs space-y-4 transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-neutral-900 text-sm">{c.name}</h2>
                    <p className="text-[11px] font-semibold text-indigo-600">
                      Client ID: {c.customerCode}
                    </p>
                  </div>
                  {c.companyName && (
                    <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-[10px] font-medium">
                      {c.companyName}
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-neutral-600 text-[11px]">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>{c.address}, {c.city}</span>
                  </p>
                  <p className="flex items-center gap-2 font-medium text-neutral-800">
                    <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span>{c.phone}</span>
                  </p>
                  {c.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{c.email}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-neutral-500">
                <span className="text-[11px]">
                  {c._count?.invoices || 0} Invoices • {c._count?.quotations || 0} Quotations
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(c)}
                    className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    title="Edit Customer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-xs">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-neutral-500 font-medium">
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-white ring-1 ring-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md p-6">
            <h2 className="text-base font-bold text-neutral-900 mb-1">
              {editingCustomer ? "Edit Customer Record" : "Add New Customer"}
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Enter official billing and contact details.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. KHALID BHAI"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Al-Khalid Traders"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  placeholder="Street / Sector / Phase"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
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
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Phone *
                  </label>
                  <input
                    type="text"
                    placeholder="0333 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="client@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="CCTV installation site instructions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:translate-y-px"
                >
                  {editingCustomer ? "Update Customer" : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 min-h-screen text-neutral-400 text-xs">
          <span className="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-indigo-600 animate-spin inline-block" />{" "}
          Loading customers...
        </div>
      }
    >
      <CustomersPageInner />
    </Suspense>
  );
}
