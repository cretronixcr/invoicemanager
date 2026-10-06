import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceSchema } from "@/lib/validations";
import { toDecimalSafe, errMsg } from "@/lib/utils";
import { requireApiSession } from "@/lib/dal";
import { effectiveStatus, resolveInvoiceStatus } from "@/lib/invoice-status";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
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
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    const settings = await prisma.businessSettings.findFirst();

    const payload = { ...invoice, status: effectiveStatus(invoice) };
    return NextResponse.json({ success: true, invoice: payload, settings });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = InvoiceSchema.parse(body);

    const existing = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    // Compute updated subtotal & line items
    let calculatedSubtotal = 0;
    const itemsData = validated.items.map((item, idx) => {
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

    // Get current payments sum
    const existingPayments = await prisma.payment.findMany({
      where: { invoiceId: id },
    });
    const paidAmount = existingPayments.reduce((sum, p) => toDecimalSafe(sum + p.amount), 0);
    const balance = toDecimalSafe(total - paidAmount);

    // Never resurrect a cancelled invoice via edit; derive the rest
    // (Paid / Overdue / Partially Paid) from dates + payments.
    const status =
      existing.status === "Cancelled"
        ? "Cancelled"
        : resolveInvoiceStatus({
            status: validated.status,
            dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
            total,
            paidAmount,
          });

    // Delete old items & recreate atomically so a failure can't lose them.
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      return tx.invoice.update({
        where: { id },
        data: {
          customerId: validated.customerId,
          invoiceDate: new Date(validated.invoiceDate),
          dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
          referenceNumber: validated.referenceNumber || null,
          subtotal: calculatedSubtotal,
          discount,
          additionalCharges,
          tax,
          total,
          advance: validated.advance !== undefined ? validated.advance : undefined,
          paidAmount,
          balance,
          status,
          notes: validated.notes || null,
          items: {
            create: itemsData,
          },
        },
        include: {
          customer: true,
          items: true,
          payments: true,
        },
      });
    });

    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const { id } = await params;
    const existing = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}
