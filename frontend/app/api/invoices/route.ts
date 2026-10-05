import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceSchema } from "@/lib/validations";
import { toDecimalSafe } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const customerId = searchParams.get("customerId") || "";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const dateFilter: any = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);

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

    return NextResponse.json({ success: true, invoices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = InvoiceSchema.parse(body);

    // Compute or verify invoice numbering
    let invoiceNumber = validated.invoiceNumber;
    if (!invoiceNumber) {
      const settings = await prisma.businessSettings.findFirst();
      const count = await prisma.invoice.count();
      const prefix = settings?.invoicePrefix || "INV-";
      const startNum = settings?.startingInvoiceNumber || 1;
      invoiceNumber = `${prefix}${String(startNum + count).padStart(6, "0")}`;
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

    let status = validated.status;
    if (balance <= 0 && total > 0) {
      status = "Paid";
    } else if (paidAmount > 0 && balance > 0) {
      status = "Partially Paid";
    } else if (paidAmount === 0 && status !== "Draft" && status !== "Cancelled") {
      status = "Issued";
    }

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
        payments:
          advance > 0
            ? {
                create: [
                  {
                    paymentNumber: `PAY-${Date.now().toString().slice(-6)}`,
                    amount: advance,
                    paymentDate: new Date(validated.invoiceDate),
                    paymentMethod: "Cash",
                    reference: "Advance Payment",
                    notes: "Initial advance payment recorded at invoice creation.",
                  },
                ],
              }
            : undefined,
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to create invoice" }, { status: 400 });
  }
}
