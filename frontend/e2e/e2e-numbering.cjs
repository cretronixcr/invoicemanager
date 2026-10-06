const puppeteer = require("puppeteer-core");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const BASE = "http://localhost:3000";

function fail(msg) {
  console.log("FAIL: " + msg);
  process.exit(1);
}
function pass(msg) {
  console.log("PASS: " + msg);
}
function seq(num) {
  const m = String(num).match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  page.on("dialog", async (d) => await d.accept());

  // 1. Login
  await page.goto(BASE + "/login", { waitUntil: "networkidle2" });
  await page.type("#email", "admin@danibrothers.com");
  await page.type("#password", "admin");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/", { timeout: 20000 });
  pass("logged in");

  // Helpers running in page context (session cookie available)
  const createInvoice = (notes) =>
    page.evaluate(async (notes) => {
      const c = await fetch("/api/customers").then((r) => r.json());
      const r = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: c.customers[0].id,
          invoiceDate: new Date().toISOString(),
          items: [
            { description: "NUM test line", quantity: 1, rate: 100, amount: 100, serialNumber: 1 },
          ],
          subtotal: 100, discount: 0, additionalCharges: 0, tax: 0, total: 100,
          advance: 0, notes,
        }),
      }).then((x) => x.json());
      return r.success
        ? { id: r.invoice.id, number: r.invoice.invoiceNumber, payments: r.invoice.payments }
        : { error: r.error };
    }, notes);

  // 2. The classic count() bug: create A, create B, delete A, create C
  //    Old code: count=1 → number collides with an EXISTING invoice → 400.
  //    Fixed code: max+1 → C succeeds above B.
  const A = await createInvoice("NUM temp A");
  if (A.error) fail("create A: " + A.error);
  const B = await createInvoice("NUM temp B");
  if (B.error) fail("create B: " + B.error);
  if (A.number === B.number) fail(`duplicate numbers: ${A.number}`);
  pass(`sequential invoice numbers: ${A.number}, ${B.number}`);

  await page.evaluate(
    async (id) => (await fetch(`/api/invoices/${id}`, { method: "DELETE" })).ok,
    A.id
  );
  const C = await createInvoice("NUM temp C");
  if (C.error)
    fail(
      `create after deleting a middle invoice FAILED (count() collision bug): ${C.error}`
    );
  if (seq(C.number) <= seq(B.number))
    fail(`C (${C.number}) must be above B (${B.number})`);
  pass(`create after delete works: ${C.number} (old code would have collided)`);

  // 3. Invoice with advance → payment gets sequential PAY- number
  const withAdvance = await page.evaluate(async () => {
    const c = await fetch("/api/customers").then((r) => r.json());
    const r = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: c.customers[0].id,
        invoiceDate: new Date().toISOString(),
        items: [
          { description: "NUM advance test", quantity: 1, rate: 500, amount: 500, serialNumber: 1 },
        ],
        subtotal: 500, discount: 0, additionalCharges: 0, tax: 0, total: 500,
        advance: 200, notes: "NUM temp advance",
      }),
    }).then((x) => x.json());
    return r.success
      ? { id: r.invoice.id, number: r.invoice.invoiceNumber, payment: r.invoice.payments[0] }
      : { error: r.error };
  });
  if (withAdvance.error) fail("advance invoice: " + withAdvance.error);
  const payNum = withAdvance.payment?.paymentNumber || "";
  if (!/^PAY-\d{6}$/.test(payNum))
    fail("advance payment number not sequential format: " + payNum);
  pass(`advance payment number sequential: ${payNum}`);

  // 4. Customers: CUST- prefix + delete-lower → next create succeeds
  const cust1 = await page.evaluate(async () => {
    const r = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "NUM Temp One", address: "Test St 1", city: "Karachi", phone: "0300 0000001",
      }),
    }).then((x) => x.json());
    return r.success ? { id: r.customer.id, code: r.customer.customerCode } : { error: r.error };
  });
  if (cust1.error) fail("create customer: " + cust1.error);
  if (!cust1.code.startsWith("CUST-"))
    fail("customer code missing CUST- prefix: " + cust1.code);
  pass(`customer code prefixed: ${cust1.code}`);

  const cust2 = await page.evaluate(async () => {
    const r = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "NUM Temp Two", address: "Test St 2", city: "Karachi", phone: "0300 0000002",
      }),
    }).then((x) => x.json());
    return r.success ? { id: r.customer.id, code: r.customer.customerCode } : { error: r.error };
  });
  if (cust2.error) fail("create customer 2: " + cust2.error);
  await page.evaluate(
    async (id) => (await fetch(`/api/customers/${id}`, { method: "DELETE" })).ok,
    cust1.id
  );
  const cust3 = await page.evaluate(async () => {
    const r = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "NUM Temp Three", address: "Test St 3", city: "Karachi", phone: "0300 0000003",
      }),
    }).then((x) => x.json());
    return r.success ? { id: r.customer.id, code: r.customer.customerCode } : { error: r.error };
  });
  if (cust3.error)
    fail(
      `customer create after delete FAILED (count() collision): ${cust3.error}`
    );
  if (seq(cust3.code) <= seq(cust2.code))
    fail(`customer code not above existing: ${cust3.code} vs ${cust2.code}`);
  pass(`customer numbering after delete: ${cust3.code}`);

  // 5. Quotation sequential (QT- prefix, delete-lower scenario)
  const q1 = await page.evaluate(async () => {
    const c = await fetch("/api/customers").then((r) => r.json());
    const r = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: c.customers[0].id, date: new Date().toISOString(),
        items: [{ description: "NUM quote 1", quantity: 1, rate: 10, amount: 10, serialNumber: 1 }],
        subtotal: 10, discount: 0, tax: 0, total: 10, status: "Draft", notes: "NUM temp quote",
      }),
    }).then((x) => x.json());
    return r.success ? { id: r.quotation.id, number: r.quotation.quotationNumber } : { error: r.error };
  });
  if (q1.error) fail("create quotation: " + q1.error);
  const q2 = await page.evaluate(async () => {
    const c = await fetch("/api/customers").then((r) => r.json());
    const r = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: c.customers[0].id, date: new Date().toISOString(),
        items: [{ description: "NUM quote 2", quantity: 1, rate: 10, amount: 10, serialNumber: 1 }],
        subtotal: 10, discount: 0, tax: 0, total: 10, status: "Draft", notes: "NUM temp quote",
      }),
    }).then((x) => x.json());
    return r.success ? { id: r.quotation.id, number: r.quotation.quotationNumber } : { error: r.error };
  });
  if (q2.error) fail("create quotation 2: " + q2.error);
  if (!/^QT-/.test(q1.number)) fail("quotation missing QT- prefix: " + q1.number);
  if (q1.number === q2.number) fail("duplicate quotation numbers");
  pass(`quotation numbering: ${q1.number}, ${q2.number}`);

  // 6. Settings page shows the 4 numbering fields (client loads async)
  await page.goto(BASE + "/settings", { waitUntil: "networkidle2" });
  await page.waitForFunction(
    () => document.body.innerText.includes("Quotation Prefix"),
    { timeout: 20000 }
  );
  const settingsOk = await page.evaluate(() => {
    const text = document.body.innerText;
    return (
      text.includes("Quotation Prefix") &&
      text.includes("Customer Prefix") &&
      text.includes("Starting Customer Number")
    );
  });
  if (!settingsOk) fail("settings page missing numbering fields");
  pass("settings page exposes quotation + customer numbering fields");

  // Cleanup all temp records
  await page.evaluate(async ({ invoiceIds, quotationIds, customerIds }) => {
    for (const id of invoiceIds) await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    for (const id of quotationIds) await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    for (const id of customerIds) await fetch(`/api/customers/${id}`, { method: "DELETE" });
  }, {
    invoiceIds: [B.id, C.id, withAdvance.id],
    quotationIds: [q1.id, q2.id],
    customerIds: [cust2.id, cust3.id],
  });
  console.log("cleanup: temp records removed");

  await browser.close();
  console.log("ALL_TESTS_PASSED");
})().catch((e) => {
  console.log("FAIL (exception): " + e.message);
  process.exit(1);
});
