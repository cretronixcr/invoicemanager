const puppeteer = require("puppeteer-core");
const { PrismaClient } = require("@prisma/client");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:3000";
const prisma = new PrismaClient();

function fail(msg) {
  console.log("FAIL: " + msg);
  process.exit(1);
}
function pass(msg) {
  console.log("PASS: " + msg);
}
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

async function cleanup() {
  const orphans = await prisma.invoice.findMany({
    where: { notes: { startsWith: "OVD temp" } },
    select: { id: true },
  });
  for (const o of orphans) {
    await prisma.invoice.delete({ where: { id: o.id } });
  }
  if (orphans.length) console.log(`cleanup: removed ${orphans.length} temp invoice(s)`);
}

(async () => {
  // ---------- setup: stale row (due date passed "while the app was closed") ----------
  await cleanup();
  const customer = await prisma.customer.findFirst({ orderBy: { createdAt: "asc" } });
  if (!customer) {
    console.log("FAIL: no customer in DB");
    process.exit(1);
  }
  const stale = await prisma.invoice.create({
    data: {
      invoiceNumber: "OVD-TEST-STALE",
      customerId: customer.id,
      invoiceDate: daysFromNow(-10),
      dueDate: daysFromNow(-1), // yesterday → past due
      subtotal: 1000,
      total: 1000,
      paidAmount: 0,
      balance: 1000,
      status: "Issued", // stale: should have become Overdue
      notes: "OVD temp stale",
      items: {
        create: [
          {
            description: "OVD stale line",
            quantity: 1,
            rate: 1000,
            amount: 1000,
            serialNumber: 1,
          },
        ],
      },
    },
  });
  console.log("setup: stale Issued invoice with past due date created");

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  page.on("dialog", async (d) => await d.accept());

  // ---------- 1. Login ----------
  await page.goto(BASE + "/login", { waitUntil: "networkidle2" });
  await page.type("#email", "admin@danibrothers.com");
  await page.type("#password", "admin");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/", { timeout: 20000 });
  pass("logged in");

  // ---------- 2. List page visit triggers sync → DB row repaired ----------
  await page.goto(BASE + "/invoices", { waitUntil: "networkidle2" });
  await page.waitForFunction(
    () => document.body.innerText.includes("OVD-TEST-STALE"),
    { timeout: 20000 }
  );
  const storedAfterSync = await prisma.invoice.findUnique({
    where: { id: stale.id },
    select: { status: true },
  });
  if (storedAfterSync.status !== "Overdue")
    fail(`sync did not repair stale row, status=${storedAfterSync.status}`);
  pass("sync repaired stored status Issued -> Overdue on list read");

  // ---------- 3. Overdue filter + badge ----------
  const hasFilter = await page.evaluate(() =>
    !!document.querySelector('a[href="/invoices?status=Overdue"]')
  );
  if (!hasFilter) fail("Overdue filter button missing");
  await page.goto(BASE + "/invoices?status=Overdue", {
    waitUntil: "networkidle2",
  });
  await page.waitForFunction(
    () => document.body.innerText.includes("OVD-TEST-STALE"),
    { timeout: 20000 }
  );
  const listText = await page.evaluate(() => document.body.innerText);
  if (!listText.includes("OVERDUE")) fail("Overdue badge not rendered in list");
  pass("Overdue filter shows the invoice with OVERDUE badge");

  // ---------- 4. Dashboard shows Overdue badge ----------
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await page.waitForSelector("table", { timeout: 20000 });
  const dashText = await page.evaluate(() => document.body.innerText);
  if (!dashText.includes("OVERDUE")) fail("dashboard missing OVERDUE badge");
  pass("dashboard shows OVERDUE badge");

  // ---------- 5. API: create past-due invoice → Overdue immediately ----------
  const created = await page.evaluate(async (customerId) => {
    const r = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        items: [
          { description: "OVD past due", quantity: 1, rate: 400, amount: 400, serialNumber: 1 },
        ],
        subtotal: 400, discount: 0, additionalCharges: 0, tax: 0, total: 400,
        advance: 0, notes: "OVD temp created-past-due",
      }),
    }).then((x) => x.json());
    return r.success
      ? { id: r.invoice.id, number: r.invoice.invoiceNumber, status: r.invoice.status }
      : { error: r.error };
  }, customer.id);
  if (created.error) fail("create past-due: " + created.error);
  if (created.status !== "Overdue")
    fail("create with past dueDate should be Overdue, got " + created.status);
  pass("create with past dueDate -> Overdue");

  // ---------- 6. Partial payment keeps it Overdue ----------
  const partial = await page.evaluate(async (id) => {
    const r = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId: id,
        amount: 100,
        paymentDate: new Date().toISOString(),
        paymentMethod: "Cash",
      }),
    }).then((x) => x.json());
    return r.success ? { status: r.invoice.status, balance: r.invoice.balance } : { error: r.error };
  }, created.id);
  if (partial.error) fail("partial payment: " + partial.error);
  if (partial.status !== "Overdue")
    fail(`partial payment should keep Overdue, got ${partial.status}`);
  pass("partial payment keeps status Overdue");

  // ---------- 7. Full payment → Paid ----------
  const full = await page.evaluate(async (id) => {
    const r = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId: id,
        amount: 300,
        paymentDate: new Date().toISOString(),
        paymentMethod: "Cash",
      }),
    }).then((x) => x.json());
    return r.success ? { status: r.invoice.status } : { error: r.error };
  }, created.id);
  if (full.error) fail("full payment: " + full.error);
  if (full.status !== "Paid") fail("full payment should be Paid, got " + full.status);
  pass("full payment -> Paid");

  // ---------- 8. Future due date -> Issued ----------
  const future = await page.evaluate(async (customerId) => {
    const r = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        items: [
          { description: "OVD future due", quantity: 1, rate: 100, amount: 100, serialNumber: 1 },
        ],
        subtotal: 100, discount: 0, additionalCharges: 0, tax: 0, total: 100,
        advance: 0, notes: "OVD temp future",
      }),
    }).then((x) => x.json());
    return r.success
      ? { id: r.invoice.id, status: r.invoice.status }
      : { error: r.error };
  }, customer.id);
  if (future.error) fail("create future due: " + future.error);
  if (future.status !== "Issued")
    fail("future dueDate should be Issued, got " + future.status);
  pass("future dueDate -> Issued");

  // ---------- 9. Recovery: push stale invoice's due date forward, sync reverts ----------
  await prisma.invoice.update({
    where: { id: stale.id },
    data: { dueDate: daysFromNow(30) },
  });
  await page.goto(BASE + "/invoices", { waitUntil: "networkidle2" });
  await page.waitForFunction(
    () => document.body.innerText.includes("OVD-TEST-STALE"),
    { timeout: 20000 }
  );
  const recovered = await prisma.invoice.findUnique({
    where: { id: stale.id },
    select: { status: true },
  });
  if (recovered.status !== "Issued")
    fail(`due-date recovery failed, status=${recovered.status}`);
  pass("due date pushed forward -> sync reverts Overdue to Issued");

  await browser.close();
  await cleanup();
  await prisma.$disconnect();
  console.log("ALL_TESTS_PASSED");
})().catch(async (e) => {
  console.log("FAIL (exception): " + e.message);
  try {
    await cleanup();
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
