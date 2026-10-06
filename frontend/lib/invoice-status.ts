import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Invoice status rules — single source of truth.
 *
 * The "Overdue" status existed in the schema/UI enums but nothing ever set
 * it. These helpers resolve it from dueDate + balance, keep display fresh
 * (effectiveStatus) and repair stored rows on read paths (sync).
 */

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isPastDue(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < startOfToday().getTime();
}

export type StatusInput = {
  status: string;
  dueDate: Date | null;
  total: number;
  paidAmount: number;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Full status resolution for writes (create / edit / payment).
 * Draft and Cancelled pass through untouched; everything else is derived.
 */
export function resolveInvoiceStatus(input: StatusInput): string {
  if (input.status === "Draft" || input.status === "Cancelled") {
    return input.status;
  }
  const balance = round2(input.total - input.paidAmount);
  if (input.total > 0 && balance <= 0) return "Paid";
  if (isPastDue(input.dueDate)) return "Overdue";
  return input.paidAmount > 0 ? "Partially Paid" : "Issued";
}

/**
 * Display-only resolution (reads). Never trusts a stale stored value:
 * shows Overdue the moment it's past due, and recovers a stale Overdue
 * row if the due date moved forward or the balance cleared.
 */
export function effectiveStatus(input: StatusInput): string {
  if (input.status === "Draft" || input.status === "Cancelled") {
    return input.status;
  }
  const balance = round2(input.total - input.paidAmount);
  if (input.total > 0 && balance <= 0) return "Paid";
  if (isPastDue(input.dueDate)) return "Overdue";
  if (input.status === "Overdue") {
    // Was overdue, but due date moved forward → back to a paid-state split.
    return input.paidAmount > 0 ? "Partially Paid" : "Issued";
  }
  return input.status;
}

/**
 * Repair stored rows (idempotent). Keeps the status column honest so
 * `?status=Overdue` filters and reports work without a background job.
 * Call this before reading invoice lists.
 */
export async function syncInvoiceStatuses(): Promise<void> {
  const today = startOfToday();

  // Past due + still money open → Overdue.
  await prisma.invoice.updateMany({
    where: {
      dueDate: { lt: today },
      balance: { gt: 0 },
      status: { in: ["Issued", "Partially Paid"] },
    },
    data: { status: "Overdue" },
  });

  // Due date moved forward → recover from Overdue.
  await prisma.invoice.updateMany({
    where: { dueDate: { gte: today }, status: "Overdue", paidAmount: 0 },
    data: { status: "Issued" },
  });
  await prisma.invoice.updateMany({
    where: {
      dueDate: { gte: today },
      status: "Overdue",
      paidAmount: { gt: 0 },
    },
    data: { status: "Partially Paid" },
  });

  // Balance cleared outside the payment flow → Paid.
  await prisma.invoice.updateMany({
    where: { status: "Overdue", balance: { lte: 0 } },
    data: { status: "Paid" },
  });
}

/** Overdue Prisma filter — matches both computed and already-stored rows. */
export function overdueWhere() {
  return {
    dueDate: { lt: startOfToday() },
    balance: { gt: 0 },
    status: { in: ["Issued", "Partially Paid", "Overdue"] },
  };
}
