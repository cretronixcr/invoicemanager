import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "PKR"): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${currency} 0`;
  }
  // Decimal-safe rounded to integer or 2 decimal places if needed
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
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
