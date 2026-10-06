import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuotationSchema } from "@/lib/validations";
import { toDecimalSafe, errMsg } from "@/lib/utils";
import { requireApiSession } from "@/lib/dal";
import { nextQuotationNumber } from "@/lib/numbering";

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const quotations = await prisma.quotation.findMany({
      where: search
        ? {
            OR: [
              { quotationNumber: { contains: search } },
              { customer: { name: { contains: search } } },
              { customer: { companyName: { contains: search } } },
            ],
          }
        : undefined,
      include: {
        customer: true,
        items: true,
        invoices: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, quotations });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const body = await request.json();
    const validated = QuotationSchema.parse(body);

    let quotationNumber = validated.quotationNumber;
    if (!quotationNumber) {
      quotationNumber = await nextQuotationNumber();
    }

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
    const tax = toDecimalSafe(validated.tax || 0);
    const total = toDecimalSafe(calculatedSubtotal - discount + tax);

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: validated.customerId,
        date: new Date(validated.date),
        subtotal: calculatedSubtotal,
        discount,
        tax,
        total,
        status: validated.status || "Pending",
        notes: validated.notes || null,
        items: {
          create: itemsToCreate,
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    return NextResponse.json({ success: true, quotation }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error, "Failed to create quotation") }, { status: 400 });
  }
}
