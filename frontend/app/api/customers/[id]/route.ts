import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CustomerSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          include: { payments: true },
          orderBy: { invoiceDate: "desc" },
        },
        quotations: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
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
    const validated = CustomerSchema.parse(body);

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: validated.name,
        companyName: validated.companyName || null,
        address: validated.address,
        city: validated.city,
        phone: validated.phone,
        email: validated.email || null,
        notes: validated.notes || null,
      },
    });

    return NextResponse.json({ success: true, customer });
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
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Customer deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
