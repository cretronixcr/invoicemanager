import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CustomerSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { companyName: { contains: search } },
              { customerCode: { contains: search } },
              { phone: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: { invoices: true, quotations: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CustomerSchema.parse(body);

    // Generate auto customer code
    const settings = await prisma.businessSettings.findFirst();
    const count = await prisma.customer.count();
    const prefix = settings?.customerPrefix || "CUST-";
    const startNum = settings?.startingCustomerNum || 80;
    const nextCode = `${String(startNum + count).padStart(6, "0")}`;

    const customer = await prisma.customer.create({
      data: {
        customerCode: nextCode,
        name: validated.name,
        companyName: validated.companyName || null,
        address: validated.address,
        city: validated.city,
        phone: validated.phone,
        email: validated.email || null,
        notes: validated.notes || null,
      },
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to create customer" }, { status: 400 });
  }
}
