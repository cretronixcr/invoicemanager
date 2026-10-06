import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errMsg } from "@/lib/utils";
import { CustomerSchema } from "@/lib/validations";
import { requireApiSession } from "@/lib/dal";
import { nextCustomerCode } from "@/lib/numbering";

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page")) || 0;
    const pageSize = Number(searchParams.get("pageSize")) || 0;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { companyName: { contains: search } },
            { customerCode: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : undefined;

    const paginated = pageSize > 0;
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: { invoices: true, quotations: true },
          },
        },
        orderBy: { createdAt: "desc" },
        ...(paginated
          ? { skip: Math.max(0, page - 1) * pageSize, take: pageSize }
          : {}),
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({ success: true, customers, total });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const body = await request.json();
    const validated = CustomerSchema.parse(body);

    // Sequential code with configured prefix (prefix used to be ignored).
    const nextCode = await nextCustomerCode();

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
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error, "Failed to create customer") }, { status: 400 });
  }
}
