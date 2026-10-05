import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PaymentSchema } from "@/lib/validations";
import { toDecimalSafe } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    const payments = await prisma.payment.findMany({
      where: invoiceId ? { invoiceId } : undefined,
      include: {
        invoice: {
          include: { customer: true },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({ success: true, payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = PaymentSchema.parse(body);

    const invoice = await prisma.invoice.findUnique({
      where: { id: validated.invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    if (validated.amount > invoice.balance) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (${validated.amount}) cannot exceed outstanding balance (${invoice.balance}).`,
        },
        { status: 400 }
      );
    }

    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;

    // Create payment in transaction
    const [payment, updatedInvoice] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          paymentNumber,
          invoiceId: validated.invoiceId,
          amount: validated.amount,
          paymentDate: new Date(validated.paymentDate),
          paymentMethod: validated.paymentMethod,
          reference: validated.reference || null,
          notes: validated.notes || null,
        },
      }),
      prisma.invoice.update({
        where: { id: validated.invoiceId },
        data: {
          paidAmount: toDecimalSafe(invoice.paidAmount + validated.amount),
          balance: toDecimalSafe(invoice.balance - validated.amount),
          status:
            toDecimalSafe(invoice.balance - validated.amount) <= 0
              ? "Paid"
              : "Partially Paid",
        },
        include: {
          customer: true,
          payments: true,
        },
      }),
    ]);

    return NextResponse.json({ success: true, payment, invoice: updatedInvoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to record payment" }, { status: 400 });
  }
}
