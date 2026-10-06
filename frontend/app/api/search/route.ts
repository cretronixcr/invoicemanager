import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errMsg } from "@/lib/utils";
import { requireApiSession } from "@/lib/dal";

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    if (!q) {
      return NextResponse.json({ success: true, results: [] });
    }

    const [invoices, customers, products] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: q } },
            { referenceNumber: { contains: q } },
            { customer: { name: { contains: q } } },
          ],
        },
        include: { customer: true },
        take: 6,
      }),
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { customerCode: { contains: q } },
            { companyName: { contains: q } },
            { phone: { contains: q } },
          ],
        },
        take: 6,
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { productCode: { contains: q } },
            { category: { contains: q } },
          ],
        },
        take: 6,
      }),
    ]);

    return NextResponse.json({
      success: true,
      results: {
        invoices,
        customers,
        products,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}
