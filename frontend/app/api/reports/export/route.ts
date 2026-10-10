import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errMsg } from "@/lib/utils";
import { requireApiSession } from "@/lib/dal";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseDate(value: string | null, endOfDay = false): Date | null {
  if (!value) return null;
  const d = new Date(endOfDay ? `${value}T23:59:59.999` : `${value}T00:00:00.000`);
  return isNaN(d.getTime()) ? null : d;
}

function csvResponse(lines: string[], filename: string): NextResponse {
  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

async function exportInvoices(from: Date | null, to: Date | null): Promise<NextResponse> {
  const invoices = await prisma.invoice.findMany({
    where: {
      AND: [
        from || to
          ? { invoiceDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {},
      ],
    },
    include: { customer: true },
    orderBy: { invoiceDate: "asc" },
  });

  const lines = [
    [
      "Invoice Number",
      "Date",
      "Due Date",
      "Customer",
      "Client ID",
      "Status",
      "Subtotal",
      "Discount",
      "Tax",
      "Total",
      "Paid",
      "Balance",
      "Reference",
    ].map(csvCell).join(","),
  ];

  for (const inv of invoices) {
    lines.push(
      [
        inv.invoiceNumber,
        inv.invoiceDate.toISOString().slice(0, 10),
        inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : "",
        inv.customer.name,
        inv.customer.customerCode,
        inv.status,
        inv.subtotal,
        inv.discount,
        inv.tax,
        inv.total,
        inv.paidAmount,
        inv.balance,
        inv.referenceNumber || "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(lines, `invoices-${stamp}.csv`);
}

async function exportCustomers(): Promise<NextResponse> {
  const customers = await prisma.customer.findMany({
    include: { _count: { select: { invoices: true, quotations: true } } },
    orderBy: { customerCode: "asc" },
  });

  const lines = [
    [
      "Client ID",
      "Name",
      "Company",
      "Address",
      "City",
      "Phone",
      "Email",
      "Notes",
      "Invoices",
      "Quotations",
    ].map(csvCell).join(","),
  ];

  for (const c of customers) {
    lines.push(
      [
        c.customerCode,
        c.name,
        c.companyName || "",
        c.address,
        c.city,
        c.phone,
        c.email || "",
        c.notes || "",
        c._count.invoices,
        c._count.quotations,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(lines, `customers-${stamp}.csv`);
}

async function exportProducts(): Promise<NextResponse> {
  const products = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const lines = [
    [
      "Code",
      "Name",
      "Category",
      "Unit",
      "Rate",
      "Warranty",
      "Description",
      "Notes",
    ].map(csvCell).join(","),
  ];

  for (const p of products) {
    lines.push(
      [
        p.productCode || "",
        p.name,
        p.category,
        p.unit,
        p.rate,
        p.warranty || "",
        p.description || "",
        p.notes || "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(lines, `products-${stamp}.csv`);
}

async function exportPayments(from: Date | null, to: Date | null): Promise<NextResponse> {
  const payments = await prisma.payment.findMany({
    where: {
      AND: [
        from || to
          ? { paymentDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {},
      ],
    },
    include: {
      invoice: {
        include: { customer: true },
      },
    },
    orderBy: { paymentDate: "asc" },
  });

  const lines = [
    [
      "Payment ID",
      "Date",
      "Invoice Number",
      "Customer",
      "Client ID",
      "Payment Method",
      "Amount Received",
      "Reference",
      "Notes",
    ].map(csvCell).join(","),
  ];

  for (const p of payments) {
    lines.push(
      [
        p.paymentNumber,
        p.paymentDate.toISOString().slice(0, 10),
        p.invoice.invoiceNumber,
        p.invoice.customer.name,
        p.invoice.customer.customerCode,
        p.paymentMethod,
        p.amount,
        p.reference || "",
        p.notes || "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return csvResponse(lines, `payments-${stamp}.csv`);
}

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "invoices";
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"), true);

    if (type === "customers") return await exportCustomers();
    if (type === "products") return await exportProducts();
    if (type === "payments") return await exportPayments(from, to);
    return await exportInvoices(from, to);
  } catch (error) {
    const msg = error instanceof Error ? errMsg(error) : "Export failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
