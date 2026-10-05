import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      invoicesCount,
      customersCount,
      productsCount,
      quotationsCount,
      allInvoices,
      recentPayments,
      monthlySalesData,
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.customer.count(),
      prisma.product.count(),
      prisma.quotation.count(),
      prisma.invoice.findMany({
        include: { customer: true },
        orderBy: { invoiceDate: "desc" },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { paymentDate: "desc" },
        include: {
          invoice: {
            include: { customer: true },
          },
        },
      }),
      prisma.invoice.findMany({
        select: {
          invoiceDate: true,
          total: true,
          paidAmount: true,
        },
      }),
    ]);

    let totalSales = 0;
    let totalPaid = 0;
    let totalPending = 0;

    for (const inv of allInvoices) {
      if (inv.status !== "Cancelled") {
        totalSales += inv.total;
        totalPaid += inv.paidAmount;
        totalPending += inv.balance;
      }
    }

    // Group monthly sales
    const monthlyMap: { [key: string]: number } = {};
    for (const inv of monthlySalesData) {
      const monthKey = new Date(inv.invoiceDate).toLocaleString("default", {
        month: "short",
        year: "numeric",
      });
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + inv.total;
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalInvoices: invoicesCount,
        totalCustomers: customersCount,
        totalProducts: productsCount,
        totalQuotations: quotationsCount,
        totalSales,
        totalPaid,
        totalPending,
      },
      recentInvoices: allInvoices.slice(0, 5),
      recentPayments,
      monthlySales: Object.entries(monthlyMap).map(([month, amount]) => ({
        month,
        amount,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
