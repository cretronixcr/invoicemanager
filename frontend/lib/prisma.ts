import { PrismaClient } from "@prisma/client";

/**
 * Money columns are Decimal in Postgres (exact precision), but the app
 * works in plain JS numbers. This result extension converts every money
 * field to `number` at the Prisma boundary, so all reads — including
 * nested includes — are plain numbers everywhere in the app.
 */
function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return base.$extends({
    result: {
      invoice: {
        subtotal: { needs: {}, compute: (i) => Number(i.subtotal) },
        discount: { needs: {}, compute: (i) => Number(i.discount) },
        additionalCharges: { needs: {}, compute: (i) => Number(i.additionalCharges) },
        tax: { needs: {}, compute: (i) => Number(i.tax) },
        total: { needs: {}, compute: (i) => Number(i.total) },
        advance: { needs: {}, compute: (i) => Number(i.advance) },
        paidAmount: { needs: {}, compute: (i) => Number(i.paidAmount) },
        balance: { needs: {}, compute: (i) => Number(i.balance) },
      },
      quotation: {
        subtotal: { needs: {}, compute: (q) => Number(q.subtotal) },
        discount: { needs: {}, compute: (q) => Number(q.discount) },
        tax: { needs: {}, compute: (q) => Number(q.tax) },
        total: { needs: {}, compute: (q) => Number(q.total) },
      },
      quotationItem: {
        rate: { needs: {}, compute: (i) => Number(i.rate) },
        amount: { needs: {}, compute: (i) => Number(i.amount) },
      },
      invoiceItem: {
        rate: { needs: {}, compute: (i) => Number(i.rate) },
        amount: { needs: {}, compute: (i) => Number(i.amount) },
      },
      payment: {
        amount: { needs: {}, compute: (p) => Number(p.amount) },
      },
      product: {
        rate: { needs: {}, compute: (p) => Number(p.rate) },
      },
    },
  });
}

type AppPrismaClient = ReturnType<typeof createClient>;

declare global {
  var prisma: AppPrismaClient | undefined;
}

export const prisma = global.prisma || createClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
