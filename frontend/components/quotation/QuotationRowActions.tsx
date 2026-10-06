"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Edit, Trash2 } from "lucide-react";

export function QuotationRowActions({
  quotationId,
  quotationNumber,
}: {
  quotationId: string;
  quotationNumber: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const ok = window.confirm(
      `Delete quotation ${quotationNumber} permanently? This cannot be undone.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotations/${quotationId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert(data.error || "Failed to delete quotation");
        setDeleting(false);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete quotation");
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={`/quotations/${quotationId}`}
        title="View Quotation"
        className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
      </Link>
      <Link
        href={`/quotations/new?editId=${quotationId}`}
        title="Edit Quotation"
        className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
      >
        <Edit className="w-3.5 h-3.5" />
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        title="Delete Quotation"
        className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-60"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
