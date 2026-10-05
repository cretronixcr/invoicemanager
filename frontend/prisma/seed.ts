import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Business Settings
  const settings = await prisma.businessSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessName: "DANI BROTHERS",
      address: "Shop B-13 Sector Z-6 Gulshan e Maymar",
      city: "Sindh, Karachi",
      phone: "0333 1360441",
      email: "sales@danibrothers.com",
      website: "www.danibrothers.com",
      invoicePrefix: "INV-",
      startingInvoiceNumber: 1,
      quotationPrefix: "QT-",
      startingQuotationNum: 200,
      customerPrefix: "CUST-",
      startingCustomerNum: 80,
      currency: "PKR",
      defaultPaymentTerms: "50% advance with order, balance upon completion of installation & commissioning.",
      defaultNotes: "Thank you for choosing Dani Brothers. All equipment carries 1 Year standard manufacturer warranty. Physical damages/burns not covered.",
      footerText: "This is a computer-generated invoice. For queries contact 0333 1360441 or sales@danibrothers.com",
    },
  });
  console.log("Settings seeded:", settings.businessName);

  // 2. Default User
  await prisma.user.upsert({
    where: { email: "admin@danibrothers.com" },
    update: {},
    create: {
      name: "Dani Brothers Admin",
      email: "admin@danibrothers.com",
      password: "admin", // Simple dev auth
      role: "ADMIN",
    },
  });

  // 3. Customers
  const customerKhalid = await prisma.customer.upsert({
    where: { customerCode: "000080" },
    update: {},
    create: {
      customerCode: "000080",
      name: "KHALID BHAI",
      companyName: "Al-Khalid Traders",
      address: "Sector 5-E, North Karachi",
      city: "Karachi",
      phone: "0300 9283741",
      email: "khalidbhai@gmail.com",
      notes: "Preferred customer - CCTV Surveillance installation site.",
    },
  });

  const customerTariq = await prisma.customer.upsert({
    where: { customerCode: "000081" },
    update: {},
    create: {
      customerCode: "000081",
      name: "TARIQ MEHMOOD",
      companyName: "Mehmood & Sons Logistics",
      address: "Plot 42, Korangi Industrial Area",
      city: "Karachi",
      phone: "0321 4455667",
      email: "tariq@mehmoodlogistics.pk",
      notes: "Office camera setup & networking.",
    },
  });

  // 4. Products / Services based on real technical surveillance reference
  const productsData = [
    {
      productCode: "CAM-01",
      name: "Hikvision 4MP IP Network IR Dome Camera",
      description: "Hikvision DS-2CD1143G0-I 4MP Fixed Dome Network Camera, 2.8mm Lens, 30m IR Range, IP67 Weatherproof, IK10 Vandal-Proof, PoE Supported, DWDR 3D DNR",
      category: "A - Cameras",
      unit: "Pcs",
      rate: 6000,
      warranty: "1 Year Replacement Warranty",
    },
    {
      productCode: "CAM-02",
      name: "Dahua 2MP Full-color Bullet Camera",
      description: "Dahua 2MP HDCVI Full-Color Bullet Camera with Built-in Mic, 20m Warm Light, IP67 Outdoor rated",
      category: "A - Cameras",
      unit: "Pcs",
      rate: 4500,
      warranty: "1 Year Warranty",
    },
    {
      productCode: "NVR-01",
      name: "Hikvision 16-Channel 4K Network Video Recorder (NVR)",
      description: "Hikvision DS-7616NI-Q2/16P 16-CH NVR with 16 Independent PoE Ports, Supports up to 8MP/4K resolution, H.265+ Compression, Dual SATA interfaces up to 16TB total",
      category: "B - NVR & Storage",
      unit: "Pcs",
      rate: 29500,
      warranty: "1 Year Official Warranty",
    },
    {
      productCode: "HDD-01",
      name: "WD Purple 4TB Surveillance Internal Hard Drive",
      description: "Western Digital Purple 4TB 3.5\" Surveillance HDD, 5400 RPM, SATA 6 Gb/s, 64MB Cache, Engineered specifically for 24/7 DVR/NVR surveillance security systems",
      category: "B - NVR & Storage",
      unit: "Pcs",
      rate: 19800,
      warranty: "2 Years Replacement Warranty",
    },
    {
      productCode: "SW-01",
      name: "Hikvision 8-Port Gigabit PoE Switch",
      description: "DS-3E0508P-E 8-Port Gigabit Unmanaged PoE Switch, 60W PoE budget, 30W Max per port, Surge protection 6KV",
      category: "B - NVR & Storage",
      unit: "Pcs",
      rate: 12500,
      warranty: "1 Year Warranty",
    },
    {
      productCode: "CAB-01",
      name: "D-Link CAT6 Pure Copper High-Performance UTP Cable Roll",
      description: "D-Link 305M CAT6 UTP 23AWG Solid Bare Copper Network Cable Roll for high-bandwidth IP Video Transmission",
      category: "C - Installation / Services",
      unit: "Roll",
      rate: 22000,
      warranty: "Standard",
    },
    {
      productCode: "BOX-01",
      name: "Waterproof Camera Base Junction Box 4x4",
      description: "Heavy duty PVC waterproof camera base junction box with brass inserts and rubber grommets",
      category: "C - Installation / Services",
      unit: "Pcs",
      rate: 350,
      warranty: "N/A",
    },
    {
      productCode: "SRV-01",
      name: "Complete Installation, Conduit Piping, Cabling & Setup Charges",
      description: "Professional camera mounting, conduit pipe laying, CAT6 wiring, RJ45 crimping, NVR configuration, remote mobile app setup (Hik-Connect / DMSS), testing & commissioning",
      category: "C - Installation / Services",
      unit: "Job",
      rate: 25000,
      warranty: "30 Days Service Warranty",
    },
  ];

  for (const prod of productsData) {
    await prisma.product.create({
      data: prod,
    });
  }

  // 5. Sample Quotation (0000200) for Khalid Bhai
  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber: "0000200",
      customerId: customerKhalid.id,
      date: new Date("2026-09-28"),
      subtotal: 175200,
      discount: 12200,
      total: 163000,
      status: "Accepted",
      notes: "Proposal for comprehensive CCTV setup at client residence / commercial facility.",
      items: {
        create: [
          {
            section: "A - Cameras",
            serialNumber: 1,
            description: "Hikvision DS-2CD1143G0-I 4MP Fixed Dome Network Camera, 2.8mm Lens, 30m IR Range, IP67 Weatherproof, IK10 Vandal-Proof, PoE Supported",
            quantity: 10,
            rate: 6000,
            amount: 60000,
          },
          {
            section: "B - NVR & Storage",
            serialNumber: 2,
            description: "Hikvision DS-7616NI-Q2/16P 16-CH NVR with 16 Independent PoE Ports, H.265+ Compression, 4K HDMI Output",
            quantity: 1,
            rate: 29500,
            amount: 29500,
          },
          {
            section: "B - NVR & Storage",
            serialNumber: 3,
            description: "WD Purple 4TB 3.5\" Surveillance Internal Hard Drive 24/7 Continuous Recording",
            quantity: 1,
            rate: 19800,
            amount: 19800,
          },
          {
            section: "C - Cabling & Accessories",
            serialNumber: 4,
            description: "D-Link 305M CAT6 UTP 23AWG Solid Bare Copper Network Cable Roll",
            quantity: 1.5,
            rate: 22000,
            amount: 33000,
          },
          {
            section: "C - Cabling & Accessories",
            serialNumber: 5,
            description: "Waterproof Camera Base Junction Box 4x4 with PVC connectors",
            quantity: 10,
            rate: 350,
            amount: 3500,
          },
          {
            section: "D - Installation / Services",
            serialNumber: 6,
            description: "Complete camera mounting, cable routing, RJ45 termination, NVR configuration, remote mobile phone viewing setup and testing",
            quantity: 1,
            rate: 29400,
            amount: 29400,
          },
        ],
      },
    },
  });

  // 6. Primary Reference Invoice (INV-000001) matching exact prompt numbers:
  // Subtotal: PKR 175,200
  // Discount: PKR 12,200
  // Grand Total: PKR 163,000
  // Advance: PKR 80,000
  // Remaining Balance: PKR 83,000
  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-000001",
      quotationId: quotation.id,
      customerId: customerKhalid.id,
      invoiceDate: new Date("2026-10-02"),
      dueDate: new Date("2026-10-15"),
      referenceNumber: "REF-SURV-2026-09",
      subtotal: 175200,
      discount: 12200,
      additionalCharges: 0,
      tax: 0,
      total: 163000,
      advance: 80000,
      paidAmount: 80000,
      balance: 83000,
      status: "Partially Paid",
      notes: "Advance of PKR 80,000 received via Online Bank Transfer. Remaining balance PKR 83,000 payable upon full hand-over.",
      items: {
        create: [
          {
            section: "A - Cameras",
            serialNumber: 1,
            description: "Hikvision DS-2CD1143G0-I 4MP Fixed Dome Network Camera, 2.8mm Lens, 30m IR Range, IP67 Weatherproof, IK10 Vandal-Proof, PoE Supported",
            quantity: 10,
            rate: 6000,
            amount: 60000,
          },
          {
            section: "B - NVR & Storage",
            serialNumber: 2,
            description: "Hikvision DS-7616NI-Q2/16P 16-CH NVR with 16 Independent PoE Ports, H.265+ Compression, 4K HDMI Output",
            quantity: 1,
            rate: 29500,
            amount: 29500,
          },
          {
            section: "B - NVR & Storage",
            serialNumber: 3,
            description: "WD Purple 4TB 3.5\" Surveillance Internal Hard Drive 24/7 Continuous Recording",
            quantity: 1,
            rate: 19800,
            amount: 19800,
          },
          {
            section: "C - Cabling & Accessories",
            serialNumber: 4,
            description: "D-Link 305M CAT6 UTP 23AWG Solid Bare Copper Network Cable Roll",
            quantity: 1.5,
            rate: 22000,
            amount: 33000,
          },
          {
            section: "C - Cabling & Accessories",
            serialNumber: 5,
            description: "Waterproof Camera Base Junction Box 4x4 with PVC connectors",
            quantity: 10,
            rate: 350,
            amount: 3500,
          },
          {
            section: "D - Installation / Services",
            serialNumber: 6,
            description: "Complete camera mounting, cable routing, RJ45 termination, NVR configuration, remote mobile phone viewing setup and testing",
            quantity: 1,
            rate: 29400,
            amount: 29400,
          },
        ],
      },
      payments: {
        create: [
          {
            paymentNumber: "PAY-000001",
            amount: 80000,
            paymentDate: new Date("2026-10-02"),
            paymentMethod: "Bank Transfer",
            reference: "Meezan Bank Txn #99182348",
            notes: "Initial advance for surveillance hardware procurement.",
          },
        ],
      },
    },
  });

  // 7. Second Invoice (INV-000002) for Tariq Mehmood (Paid in full)
  await prisma.invoice.create({
    data: {
      invoiceNumber: "INV-000002",
      customerId: customerTariq.id,
      invoiceDate: new Date("2026-10-03"),
      dueDate: new Date("2026-10-10"),
      referenceNumber: "LOG-CAM-01",
      subtotal: 54000,
      discount: 4000,
      additionalCharges: 0,
      tax: 0,
      total: 50000,
      advance: 50000,
      paidAmount: 50000,
      balance: 0,
      status: "Paid",
      notes: "Warehouse cameras installation completed and verified.",
      items: {
        create: [
          {
            section: "A - Cameras",
            serialNumber: 1,
            description: "Dahua 2MP HDCVI Full-Color Bullet Camera with Built-in Mic, 20m Warm Light, IP67 Outdoor rated",
            quantity: 6,
            rate: 4500,
            amount: 27000,
          },
          {
            section: "B - Switch & Cabling",
            serialNumber: 2,
            description: "Hikvision 8-Port Gigabit PoE Switch DS-3E0508P-E 60W budget",
            quantity: 1,
            rate: 12500,
            amount: 12500,
          },
          {
            section: "C - Installation",
            serialNumber: 3,
            description: "Installation, cabling and camera alignment charges",
            quantity: 1,
            rate: 14500,
            amount: 14500,
          },
        ],
      },
      payments: {
        create: [
          {
            paymentNumber: "PAY-000002",
            amount: 50000,
            paymentDate: new Date("2026-10-03"),
            paymentMethod: "Cash",
            reference: "Cash on delivery",
            notes: "Payment in full received by technician.",
          },
        ],
      },
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
