"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function PaymentRowActions({
  paymentId,
  paymentNumber,
}: {
  paymentId: string;
  paymentNumber: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const ok = window.confirm(
      `Delete payment ${paymentNumber}? The invoice balance and status will be recalculated.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert(data.error || "Failed to delete payment");
        setDeleting(false);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete payment");
      setDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      title="Delete payment (void)"
      className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-60"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
