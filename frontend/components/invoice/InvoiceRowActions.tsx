"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Copy, Edit, Trash2 } from "lucide-react";

export function InvoiceRowActions({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const ok = window.confirm(
      `Delete invoice ${invoiceNumber} permanently? This cannot be undone.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert(data.error || "Failed to delete invoice");
        setDeleting(false);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete invoice");
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={`/invoices/${invoiceId}`}
        title="View / Download PDF"
        className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
      </Link>
      <Link
        href={`/invoices/new?editId=${invoiceId}`}
        title="Edit Invoice"
        className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      >
        <Edit className="w-3.5 h-3.5" />
      </Link>
      <Link
        href={`/invoices/new?duplicateId=${invoiceId}`}
        title="Duplicate Invoice"
        className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      >
        <Copy className="w-3.5 h-3.5" />
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        title="Delete Invoice"
        className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-60"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
