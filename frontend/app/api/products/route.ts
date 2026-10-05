import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductSchema } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const products = await prisma.product.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { description: { contains: search } },
                  { productCode: { contains: search } },
                ],
              }
            : {},
          category ? { category } : {},
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = ProductSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        name: validated.name,
        productCode: validated.productCode || null,
        description: validated.description || null,
        category: validated.category,
        unit: validated.unit,
        rate: validated.rate,
        warranty: validated.warranty || null,
        notes: validated.notes || null,
      },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "Failed to create product" }, { status: 400 });
  }
}
