"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/lib/currency";
import { Package, Plus, Search, Edit, Trash2, ShieldCheck, Download } from "lucide-react";

type Product = {
  id: string;
  productCode?: string | null;
  name: string;
  description?: string | null;
  category: string;
  unit: string;
  rate: number;
  warranty?: string | null;
  notes?: string | null;
};

function ProductsPageInner() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = useCurrency();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [category, setCategory] = useState("A - Cameras");
  const [unit, setUnit] = useState("Pcs");
  const [rate, setRate] = useState<number>(0);
  const [warranty, setWarranty] = useState("1 Year Warranty");
  const [description, setDescription] = useState("");

  const fetchProducts = async () => {
    try {
      const url = `/api/products?search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
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
        const url = `/api/products?search=${encodeURIComponent(search)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled && data.success) {
          setProducts(data.products);
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
  }, [search]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName("");
    setProductCode("");
    setCategory("A - Cameras");
    setUnit("Pcs");
    setRate(0);
    setWarranty("1 Year Warranty");
    setDescription("");
    setShowModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setProductCode(p.productCode || "");
    setCategory(p.category);
    setUnit(p.unit);
    setRate(p.rate);
    setWarranty(p.warranty || "");
    setDescription(p.description || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          productCode: productCode || null,
          category,
          unit,
          rate: Number(rate),
          warranty: warranty || null,
          description: description || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchProducts();
      } else {
        alert(data.error || "Failed to save product");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product/service?")) {
      return;
    }
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
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
            Products &amp; Services Catalog
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Maintain reusable hardware (Cameras, NVRs, cabling) and installation service rates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/reports/export?type=products"
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
            <span>Add Product / Service</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items, specs, product code..."
            className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
          />
        </div>

        <span className="text-neutral-500 font-medium">
          Total Items: {products.length}
        </span>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Code</th>
                <th className="py-3 px-4 font-bold">Name &amp; Specifications</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">Unit</th>
                <th className="py-3 px-4 font-bold text-right">Default Rate</th>
                <th className="py-3 px-4 font-bold">Warranty</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center">
                    <span className="inline-flex items-center gap-2 text-neutral-400 text-xs">
                      <span className="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-indigo-600 animate-spin inline-block" />
                      Loading catalog...
                    </span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-neutral-400">
                      <Package className="w-7 h-7" />
                      <p className="text-xs">No products found. Click &quot;Add Product / Service&quot; to add one.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-neutral-700">
                      {p.productCode || "-"}
                    </td>
                    <td className="py-3 px-4 max-w-md">
                      <p className="font-bold text-neutral-900">{p.name}</p>
                      {p.description && (
                        <p className="text-[11px] text-neutral-500 line-clamp-2 mt-0.5">
                          {p.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 ring-1 ring-inset ring-neutral-500/10 text-neutral-700 rounded-full text-[10px] font-bold uppercase tracking-wide">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{p.unit}</td>
                    <td className="py-3 px-4 text-right font-bold text-neutral-900 tabular-nums">
                      {formatCurrency(p.rate, currency)}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {p.warranty ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-700">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{p.warranty}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Edit Item"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg p-6">
            <h2 className="text-base font-bold text-neutral-900 mb-1">
              {editingProduct ? "Edit Product / Service" : "Add Product / Service"}
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Add reusable surveillance hardware or installation charge details.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Product / Service Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hikvision 4MP IP Network IR Dome Camera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Product Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CAM-01"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Category / Section Group *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A - Cameras, B - NVR, C - Installation"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    placeholder="Pcs / Mtr / Job"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Default Rate (PKR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value))}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-700 font-semibold mb-1">
                    Warranty
                  </label>
                  <input
                    type="text"
                    placeholder="1 Year Warranty"
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-semibold mb-1">
                  Full Technical Description (Supports Multi-line)
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed specifications (Hikvision model, lens, IR range, compression...)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs"
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
                  {editingProduct ? "Update Item" : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 min-h-screen text-neutral-400 text-xs">
          <span className="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-indigo-600 animate-spin inline-block" />{" "}
          Loading products...
        </div>
      }
    >
      <ProductsPageInner />
    </Suspense>
  );
}
