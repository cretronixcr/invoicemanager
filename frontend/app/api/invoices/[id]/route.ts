import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceSchema } from "@/lib/validations";
import { toDecimalSafe } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    return NextResponse.json({ success: true, invoice, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = InvoiceSchema.parse(body);

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

    let status = validated.status;
    if (balance <= 0 && total > 0) {
      status = "Paid";
    } else if (paidAmount > 0 && balance > 0) {
      status = "Partially Paid";
    }

    // Delete old items & recreate
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

    const updatedInvoice = await prisma.invoice.update({
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

    return NextResponse.json({ success: true, invoice: updatedInvoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Invoice deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
