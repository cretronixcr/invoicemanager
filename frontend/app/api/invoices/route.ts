import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceSchema } from "@/lib/validations";
import { toDecimalSafe, errMsg } from "@/lib/utils";
import { requireApiSession } from "@/lib/dal";
import { nextInvoiceNumber, nextPaymentNumber } from "@/lib/numbering";
import { resolveInvoiceStatus, effectiveStatus, syncInvoiceStatuses } from "@/lib/invoice-status";

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const customerId = searchParams.get("customerId") || "";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);

    // Recompute overdue flags before reading so filters/badges are honest.
    await syncInvoiceStatuses();

    const invoices = await prisma.invoice.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { invoiceNumber: { contains: search } },
                  { referenceNumber: { contains: search } },
                  { customer: { name: { contains: search } } },
                  { customer: { companyName: { contains: search } } },
                  { customer: { customerCode: { contains: search } } },
                  { customer: { phone: { contains: search } } },
                ],
              }
            : {},
          status ? { status } : {},
          customerId ? { customerId } : {},
          fromDate || toDate ? { invoiceDate: dateFilter } : {},
        ],
      },
      include: {
        customer: true,
        quotation: true,
        items: {
          include: { product: true },
          orderBy: { serialNumber: "asc" },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { invoiceDate: "desc" },
    });

    // Fresh display status even if the stored row hasn't been synced yet.
    const payload = invoices.map((inv) => ({
      ...inv,
      status: effectiveStatus(inv),
    }));

    return NextResponse.json({ success: true, invoices: payload });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const body = await request.json();
    const validated = InvoiceSchema.parse(body);

    // Guard against duplicate quotation conversion (prevents double billing)
    if (validated.quotationId) {
      const existingLinkedInvoice = await prisma.invoice.findFirst({
        where: { quotationId: validated.quotationId },
        select: { id: true, invoiceNumber: true },
      });
      if (existingLinkedInvoice) {
        return NextResponse.json(
          {
            success: false,
            error: `Quotation is already converted to Invoice ${existingLinkedInvoice.invoiceNumber}. To prevent duplicate billing, record additional payments against the existing invoice instead of generating a new invoice.`,
          },
          { status: 400 }
        );
      }
    }

    // Sequential number — max(existing) + 1, so deletions never cause reuse.
    let invoiceNumber = validated.invoiceNumber;
    if (!invoiceNumber) {
      invoiceNumber = await nextInvoiceNumber();
    }

    // Precise calculations
    let calculatedSubtotal = 0;
    const itemsToCreate = validated.items.map((item, idx) => {
      const lineAmount = toDecimalSafe(item.quantity * item.rate);
      calculatedSubtotal = toDecimalSafe(calculatedSubtotal + lineAmount);
      return {
        productId: item.productId || null,
        section: item.section || null,
        serialNumber: idx + 1,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: lineAmount,
      };
    });

    const discount = toDecimalSafe(validated.discount || 0);
    const additionalCharges = toDecimalSafe(validated.additionalCharges || 0);
    const tax = toDecimalSafe(validated.tax || 0);
    const total = toDecimalSafe(calculatedSubtotal - discount + additionalCharges + tax);
    const advance = toDecimalSafe(validated.advance || 0);
    const paidAmount = advance;
    const balance = toDecimalSafe(total - paidAmount);

    const status = resolveInvoiceStatus({
      status: validated.status,
      dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
      total,
      paidAmount,
    });

    // Advance records create a payment row too — reserve its number first.
    const advancePaymentNumber =
      advance > 0 ? await nextPaymentNumber() : undefined;
    const advancePayment = advancePaymentNumber
      ? {
          create: [
            {
              paymentNumber: advancePaymentNumber,
              amount: advance,
              paymentDate: new Date(validated.invoiceDate),
              paymentMethod: "Cash",
              reference: "Advance Payment",
              notes: "Initial advance payment recorded at invoice creation.",
            },
          ],
        }
      : undefined;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        quotationId: validated.quotationId || null,
        customerId: validated.customerId,
        invoiceDate: new Date(validated.invoiceDate),
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        referenceNumber: validated.referenceNumber || null,
        subtotal: calculatedSubtotal,
        discount,
        additionalCharges,
        tax,
        total,
        advance,
        paidAmount,
        balance,
        status,
        notes: validated.notes || null,
        items: {
          create: itemsToCreate,
        },
        payments: advancePayment,
      },
      include: {
        customer: true,
        items: true,
        payments: true,
      },
    });

    // If linked to quotation, update quotation status
    if (validated.quotationId) {
      await prisma.quotation.update({
        where: { id: validated.quotationId },
        data: { status: "Converted" },
      });
    }

    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error, "Failed to create invoice") }, { status: 400 });
  }
}
