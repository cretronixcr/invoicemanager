import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimalSafe, errMsg } from "@/lib/utils";
import { requireApiSession } from "@/lib/dal";
import {
  effectiveStatus,
  resolveInvoiceStatus,
} from "@/lib/invoice-status";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { invoice: true },
    });
    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    const invoice = payment.invoice;
    const paidAmount = toDecimalSafe(invoice.paidAmount - payment.amount);
    const balance = toDecimalSafe(invoice.total - paidAmount);

    // Voiding a payment re-derives the invoice status: a fully paid invoice
    // goes back to Issued / Partially Paid / Overdue as the dates dictate.
    const base =
      invoice.status === "Draft" || invoice.status === "Cancelled"
        ? invoice.status
        : "Issued";
    const status = resolveInvoiceStatus({
      status: base,
      dueDate: invoice.dueDate,
      total: invoice.total,
      paidAmount,
    });

    const [, updated] = await prisma.$transaction([
      prisma.payment.delete({ where: { id } }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount, balance, status },
        include: {
          customer: true,
          items: { orderBy: { serialNumber: "asc" } },
          payments: { orderBy: { paymentDate: "desc" } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Payment deleted",
      invoice: { ...updated, status: effectiveStatus(updated) },
    });
  } catch (error) {
    const msg = error instanceof Error ? errMsg(error) : "Failed to delete payment";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
