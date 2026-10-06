import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errMsg } from "@/lib/utils";
import { SettingsSchema } from "@/lib/validations";
import { requireApiSession } from "@/lib/dal";

export async function GET() {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    let settings = await prisma.businessSettings.findFirst();
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          id: "default",
          businessName: "DANI BROTHERS",
          address: "Shop B-13 Sector Z-6 Gulshan e Maymar",
          city: "Sindh, Karachi",
          phone: "0333 1360441",
          email: "sales@danibrothers.com",
          currency: "PKR",
        },
      });
    }
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await requireApiSession();
  if (session instanceof NextResponse) return session;
  try {
    const body = await request.json();
    const validated = SettingsSchema.parse(body);

    const settings = await prisma.businessSettings.upsert({
      where: { id: "default" },
      update: {
        businessName: validated.businessName,
        logo: validated.logo || null,
        address: validated.address,
        city: validated.city,
        phone: validated.phone,
        email: validated.email,
        website: validated.website || null,
        invoicePrefix: validated.invoicePrefix,
        startingInvoiceNumber: validated.startingInvoiceNumber,
        quotationPrefix: validated.quotationPrefix,
        startingQuotationNum: validated.startingQuotationNum,
        customerPrefix: validated.customerPrefix,
        startingCustomerNum: validated.startingCustomerNum,
        currency: validated.currency,
        defaultPaymentTerms: validated.defaultPaymentTerms || null,
        defaultNotes: validated.defaultNotes || null,
        footerText: validated.footerText || null,
      },
      create: {
        id: "default",
        businessName: validated.businessName,
        logo: validated.logo || null,
        address: validated.address,
        city: validated.city,
        phone: validated.phone,
        email: validated.email,
        website: validated.website || null,
        invoicePrefix: validated.invoicePrefix,
        startingInvoiceNumber: validated.startingInvoiceNumber,
        quotationPrefix: validated.quotationPrefix,
        startingQuotationNum: validated.startingQuotationNum,
        customerPrefix: validated.customerPrefix,
        startingCustomerNum: validated.startingCustomerNum,
        currency: validated.currency,
        defaultPaymentTerms: validated.defaultPaymentTerms || null,
        defaultNotes: validated.defaultNotes || null,
        footerText: validated.footerText || null,
      },
    });

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ success: false, error: errMsg(error) }, { status: 400 });
  }
}
