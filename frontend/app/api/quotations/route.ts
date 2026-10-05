import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QuotationSchema } from "@/lib/validations";
import { toDecimalSafe } from "@/lib/utils";

export async function GET(request: Request) {
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = QuotationSchema.parse(body);

    let quotationNumber = validated.quotationNumber;
    if (!quotationNumber) {
      const settings = await prisma.businessSettings.findFirst();
      const count = await prisma.quotation.count();
      const prefix = settings?.quotationPrefix || "QT-";
      const startNum = settings?.startingQuotationNum || 200;
      quotationNumber = `${String(startNum + count).padStart(7, "0")}`;
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to create quotation" }, { status: 400 });
  }
}
