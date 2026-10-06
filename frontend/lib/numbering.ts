import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Sequential, never-reusing document numbers.
 *
 * Previous implementation used `start + count()`, which produced numbers
 * already taken after any deletion (unique-constraint failures) and ignored
 * the configured prefixes. These helpers compute `max(existing) + 1` instead,
 * parsing both the current prefixed format and legacy unprefixed values.
 */

function parseSequence(value: string, prefix: string): number {
  if (prefix && value.startsWith(prefix)) {
    const rest = value.slice(prefix.length);
    if (/^\d+$/.test(rest)) return parseInt(rest, 10);
  }
  const match = value.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

function nextSequence(values: string[], prefix: string, startAt: number): number {
  let max = startAt - 1;
  for (const value of values) {
    max = Math.max(max, parseSequence(value, prefix));
  }
  return max + 1;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

export async function nextInvoiceNumber(): Promise<string> {
  const settings = await prisma.businessSettings.findFirst();
  const prefix = settings?.invoicePrefix || "INV-";
  const start = settings?.startingInvoiceNumber || 1;
  const rows = await prisma.invoice.findMany({ select: { invoiceNumber: true } });
  const n = nextSequence(
    rows.map((r) => r.invoiceNumber),
    prefix,
    start
  );
  return `${prefix}${pad(n, 6)}`;
}

export async function nextQuotationNumber(): Promise<string> {
  const settings = await prisma.businessSettings.findFirst();
  const prefix = settings?.quotationPrefix || "QT-";
  const start = settings?.startingQuotationNum || 1;
  const rows = await prisma.quotation.findMany({ select: { quotationNumber: true } });
  const n = nextSequence(
    rows.map((r) => r.quotationNumber),
    prefix,
    start
  );
  return `${prefix}${pad(n, 7)}`;
}

export async function nextCustomerCode(): Promise<string> {
  const settings = await prisma.businessSettings.findFirst();
  const prefix = settings?.customerPrefix || "CUST-";
  const start = settings?.startingCustomerNum || 1;
  const rows = await prisma.customer.findMany({ select: { customerCode: true } });
  const n = nextSequence(
    rows.map((r) => r.customerCode),
    prefix,
    start
  );
  return `${prefix}${pad(n, 6)}`;
}

export async function nextPaymentNumber(): Promise<string> {
  const rows = await prisma.payment.findMany({ select: { paymentNumber: true } });
  const n = nextSequence(rows.map((r) => r.paymentNumber), "PAY-", 1);
  return `PAY-${pad(n, 6)}`;
}
