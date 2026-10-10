"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, FileText } from "lucide-react";
import { PaymentReceiptModal } from "./PaymentReceiptModal";
import { PaymentReceiptData, SettingsData } from "./PaymentReceiptTemplate";

export function PaymentRowActions({
  paymentId,
  paymentNumber,
  paymentData,
  settings,
}: {
  paymentId: string;
  paymentNumber: string;
  paymentData?: PaymentReceiptData;
  settings?: SettingsData;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

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
    <>
      <div className="flex items-center justify-end gap-1.5">
        {paymentData && (
          <button
            type="button"
            onClick={() => setShowReceipt(true)}
            title="View & Print Official Receipt"
            className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 font-semibold text-[11px]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Receipt</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete payment (void)"
          className="p-1.5 rounded-lg text-neutral-500 bg-neutral-100 hover:bg-rose-50 hover:text-rose-600 transition-colors disabled:opacity-60"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {showReceipt && paymentData && (
        <PaymentReceiptModal
          payment={paymentData}
          settings={settings}
          onClose={() => setShowReceipt(false)}
        />
      )}
    </>
  );
}
