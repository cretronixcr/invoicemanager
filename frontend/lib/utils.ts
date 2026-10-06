import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize any money-ish value (Prisma Decimal, numeric string, number)
 * to a plain JS number. Prisma Decimal is safe to pass here — it stringifies
 * to a numeric representation.
 */
export function toNum(value: unknown): number {
  if (typeof value === "number") return value;
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Safe error message extraction for catch blocks (no `any`). */
export function errMsg(error: unknown, fallback = "Request failed"): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function formatCurrency(amount: unknown, currency: string = "PKR"): string {
  const value = toNum(amount);
  if (!Number.isFinite(value)) {
    return `${currency} 0`;
  }
  // Decimal-safe rounded to integer or 2 decimal places if needed
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currency} ${formatted}`;
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date); // e.g. 05 Oct 2026
}

// Decimal precision helper for calculations to avoid JS floating point errors
export function toDecimalSafe(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
