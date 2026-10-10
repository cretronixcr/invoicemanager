import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errMsg } from "@/lib/utils";
import { CustomerSchema } from "@/lib/validations";
import { requireApiSession } from "@/lib/dal";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
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
    const [invoiceCount, quotationCount] = await Promise.all([
      prisma.invoice.count({ where: { customerId: id } }),
      prisma.quotation.count({ where: { customerId: id } }),
    ]);

    if (invoiceCount > 0 || quotationCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete customer: they have ${invoiceCount} invoice(s) and ${quotationCount} quotation(s). Please archive or remove their records first to prevent financial data loss.`,
        },
        { status: 400 }
      );
    }

    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Customer deleted successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}
