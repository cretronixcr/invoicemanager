"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { PaymentReceiptModal } from "./PaymentReceiptModal";
import { PaymentReceiptData, SettingsData } from "./PaymentReceiptTemplate";

export function RecordPaymentButton({
  settings,
}: {
  settings?: SettingsData;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-emerald-600/30 transition-all active:translate-y-px"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Record Payment</span>
      </button>

      {open && (
        <RecordPaymentModal
          settings={settings}
          onClose={() => setOpen(false)}
          onSuccess={(newReceipt) => {
            setOpen(false);
            setReceipt(newReceipt);
            router.refresh();
          }}
        />
      )}

      {receipt && (
        <PaymentReceiptModal
          payment={receipt}
          settings={settings}
          onClose={() => setReceipt(null)}
        />
      )}
    </>
  );
}
