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

    const [invoices, rawCustomers, rawProducts] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { startsWith: q, mode: "insensitive" } },
            { invoiceNumber: { contains: q, mode: "insensitive" } },
            { referenceNumber: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        include: { customer: true },
        take: 8,
      }),
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { customerCode: { contains: q, mode: "insensitive" } },
            { companyName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 12,
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { productCode: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 12,
      }),
    ]);

    // Priority sorting: Items whose name/code STARTS with the letter come FIRST
    const qLower = q.toLowerCase();
    const customers = rawCustomers
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(qLower) || (a.companyName?.toLowerCase().startsWith(qLower) ?? false);
        const bStarts = b.name.toLowerCase().startsWith(qLower) || (b.companyName?.toLowerCase().startsWith(qLower) ?? false);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);

    const products = rawProducts
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(qLower) || (a.productCode?.toLowerCase().startsWith(qLower) ?? false);
        const bStarts = b.name.toLowerCase().startsWith(qLower) || (b.productCode?.toLowerCase().startsWith(qLower) ?? false);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);

    return NextResponse.json({
      success: true,
      results: {
        invoices: invoices.slice(0, 6),
        customers,
        products,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}
