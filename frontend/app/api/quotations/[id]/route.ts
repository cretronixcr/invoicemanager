import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuotationSchema } from "@/lib/validations";
import { toDecimalSafe, errMsg } from "@/lib/utils";
import { requireApiSession } from "@/lib/dal";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          orderBy: { serialNumber: "asc" },
        },
        invoices: {
          select: { id: true, invoiceNumber: true },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: "Quotation not found" },
        { status: 404 }
      );
    }

    const settings = await prisma.businessSettings.findFirst();
    return NextResponse.json({ success: true, quotation, settings });
  } catch (error) {
    const msg = error instanceof Error ? errMsg(error) : "Request failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
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
    const validated = QuotationSchema.parse(body);

    const existing = await prisma.quotation.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        invoices: { select: { id: true } },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Quotation not found" },
        { status: 404 }
      );
    }

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
    const tax = toDecimalSafe(validated.tax || 0);
    const total = toDecimalSafe(calculatedSubtotal - discount + tax);

    // A quotation with a linked invoice stays "Converted" no matter what.
    const status =
      existing.invoices.length > 0 ? "Converted" : validated.status;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      return tx.quotation.update({
        where: { id },
        data: {
          customerId: validated.customerId,
          date: new Date(validated.date),
          subtotal: calculatedSubtotal,
          discount,
          tax,
          total,
          status,
          notes: validated.notes || null,
          items: { create: itemsData },
        },
        include: {
          customer: true,
          items: { orderBy: { serialNumber: "asc" } },
          invoices: { select: { id: true, invoiceNumber: true } },
        },
      });
    });

    return NextResponse.json({ success: true, quotation: updated });
  } catch (error) {
    const msg =
      error instanceof Error ? errMsg(error) : "Failed to update quotation";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
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
    const existing = await prisma.quotation.findUnique({
      where: { id },
      select: { id: true, invoices: { select: { id: true, invoiceNumber: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Quotation not found" },
        { status: 404 }
      );
    }
    if (existing.invoices.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Already converted to invoice ${existing.invoices[0].invoiceNumber}. Delete that invoice first.`,
        },
        { status: 400 }
      );
    }
    await prisma.quotation.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Quotation deleted successfully" });
  } catch (error) {
    const msg = error instanceof Error ? errMsg(error) : "Request failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
