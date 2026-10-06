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

  // 2. Create invoice with advance (creates 1 payment), future due date
  const inv = await page.evaluate(async () => {
    const c = await fetch("/api/customers").then((r) => r.json());
    const r = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: c.customers[0].id,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        items: [
          { description: "PAY-DEL test line", quantity: 1, rate: 1000, amount: 1000, serialNumber: 1 },
        ],
        subtotal: 1000, discount: 0, additionalCharges: 0, tax: 0, total: 1000,
        advance: 400, notes: "PAY-DEL temp invoice",
      }),
    }).then((x) => x.json());
    return r.success
      ? {
          id: r.invoice.id,
          number: r.invoice.invoiceNumber,
          status: r.invoice.status,
          paid: r.invoice.paidAmount,
          balance: r.invoice.balance,
          payments: r.invoice.payments.map((p) => ({ id: p.id, number: p.paymentNumber })),
        }
      : { error: r.error };
  });
  if (inv.error) fail("create: " + inv.error);
  if (inv.paid !== 400 || inv.balance !== 600)
    fail(`advance state wrong: paid=${inv.paid} balance=${inv.balance}`);
  if (inv.status !== "Partially Paid")
    fail("expected Partially Paid, got " + inv.status);
  pass(`invoice created: ${inv.number}, advance payment ${inv.payments[0].number}`);

  // 3. Record another payment (200)
  const second = await page.evaluate(async (id) => {
    const r = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId: id,
        amount: 200,
        paymentDate: new Date().toISOString(),
        paymentMethod: "Bank Transfer",
        reference: "PAY-DEL txn",
      }),
    }).then((x) => x.json());
    return r.success
      ? { id: r.payment.id, number: r.payment.paymentNumber, paid: r.invoice.paidAmount, balance: r.invoice.balance }
      : { error: r.error };
  }, inv.id);
  if (second.error) fail("record payment: " + second.error);
  if (second.paid !== 600 || second.balance !== 400)
    fail(`after 2nd payment: paid=${second.paid} balance=${second.balance}`);
  pass(`second payment recorded: ${second.number} (paid 600, balance 400)`);

  // 4. API delete second payment → recalc
  const afterApiDelete = await page.evaluate(async (payId) => {
    const r = await fetch(`/api/payments/${payId}`, { method: "DELETE" }).then((x) => x.json());
    return r.success
      ? { paid: r.invoice.paidAmount, balance: r.invoice.balance, status: r.invoice.status, count: r.invoice.payments.length }
      : { error: r.error };
  }, second.id);
  if (afterApiDelete.error) fail("api delete payment: " + afterApiDelete.error);
  if (afterApiDelete.paid !== 400 || afterApiDelete.balance !== 600)
    fail(`recalc wrong: paid=${afterApiDelete.paid} balance=${afterApiDelete.balance}`);
  if (afterApiDelete.count !== 1)
    fail("expected 1 payment remaining, got " + afterApiDelete.count);
  if (afterApiDelete.status !== "Partially Paid")
    fail("expected Partially Paid after void, got " + afterApiDelete.status);
  pass("API void: balance recalculated (400/600), status intact");

  // 5. UI: invoice detail — payment row has a delete button; use it
  await page.goto(`${BASE}/invoices/${inv.id}`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#invoice-pdf-template", { timeout: 20000 });
  const historyOk = await page.evaluate(() => {
    const t = document.body.innerText;
    return t.includes("Payment History") && t.includes("PAY-");
  });
  if (!historyOk) fail("payment history not shown on detail");
  await page.evaluate(() => {
    const btn = document.querySelector(
      'button[title="Delete this payment (void)"]'
    );
    if (btn) btn.click();
  });
  await page.waitForFunction(
    () => !document.body.innerText.includes("Payment History Recorded"),
    { timeout: 15000 }
  );
  const afterUiDelete = await page.evaluate(async (id) => {
    const r = await fetch(`/api/invoices/${id}`).then((x) => x.json());
    return { paid: r.invoice.paidAmount, balance: r.invoice.balance, status: r.invoice.status, count: r.invoice.payments.length };
  }, inv.id);
  if (afterUiDelete.paid !== 0 || afterUiDelete.balance !== 1000)
    fail(`after UI void: paid=${afterUiDelete.paid} balance=${afterUiDelete.balance}`);
  if (afterUiDelete.status !== "Issued")
    fail("expected Issued after all payments voided, got " + afterUiDelete.status);
  if (afterUiDelete.count !== 0) fail("payments should be empty");
  pass("UI void from invoice detail: paid 0, status back to Issued");

  // 6. Payments list page: row actions + UI delete
  const adv2 = await page.evaluate(async () => {
    const c = await fetch("/api/customers").then((r) => r.json());
    const r = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: c.customers[0].id,
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        items: [
          { description: "PAY-DEL list test", quantity: 1, rate: 300, amount: 300, serialNumber: 1 },
        ],
        subtotal: 300, discount: 0, additionalCharges: 0, tax: 0, total: 300,
        advance: 300, notes: "PAY-DEL temp list",
      }),
    }).then((x) => x.json());
    return r.success
      ? { id: r.invoice.id, payId: r.invoice.payments[0].id, payNum: r.invoice.payments[0].paymentNumber }
      : { error: r.error };
  });
  if (adv2.error) fail("create for list test: " + adv2.error);

  await page.goto(BASE + "/payments", { waitUntil: "networkidle2" });
  await page.waitForFunction(
    (num) => document.body.innerText.includes(num),
    { timeout: 20000 },
    adv2.payNum
  );
  const hasAction = await page.evaluate(
    (num) => {
      const rows = [...document.querySelectorAll("tr")];
      const row = rows.find((r) => r.innerText.includes(num));
      return !!row && !!row.querySelector('button[title="Delete payment (void)"]');
    },
    adv2.payNum
  );
  if (!hasAction) fail("payments list row missing delete action");
  await page.evaluate((num) => {
    const rows = [...document.querySelectorAll("tr")];
    const row = rows.find((r) => r.innerText.includes(num));
    row.querySelector('button[title="Delete payment (void)"]').click();
  }, adv2.payNum);
  await page.waitForFunction(
    (num) => !document.body.innerText.includes(num),
    { timeout: 15000 },
    adv2.payNum
  );
  pass("payments list: row delete works (row disappears after refresh)");

  // 7. Past-due + fully paid → void the payment → Overdue (not Issued)
  const overdueCase = await page.evaluate(async () => {
    const c = await fetch("/api/customers").then((r) => r.json());
    const r = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: c.customers[0].id,
        invoiceDate: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
        dueDate: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        items: [
          { description: "PAY-DEL overdue case", quantity: 1, rate: 500, amount: 500, serialNumber: 1 },
        ],
        subtotal: 500, discount: 0, additionalCharges: 0, tax: 0, total: 500,
        advance: 500, notes: "PAY-DEL temp overdue",
      }),
    }).then((x) => x.json());
    if (!r.success) return { error: r.error };
    const payId = r.invoice.payments[0].id;
    const del = await fetch(`/api/payments/${payId}`, { method: "DELETE" }).then((x) => x.json());
    return del.success
      ? { createdStatus: r.invoice.status, afterVoid: del.invoice.status }
      : { error: del.error };
  });
  if (overdueCase.error) fail("overdue case: " + overdueCase.error);
  if (overdueCase.createdStatus !== "Paid")
    fail("past-due + fully paid should be Paid, got " + overdueCase.createdStatus);
  if (overdueCase.afterVoid !== "Overdue")
    fail("void on past-due invoice should return Overdue, got " + overdueCase.afterVoid);
  pass("void on past-due paid invoice -> Overdue (not Issued)");

  // Cleanup temp invoices
  await page.evaluate(async () => {
    const list = await fetch("/api/invoices").then((r) => r.json());
    const temps = list.invoices.filter((i) =>
      (i.notes || "").startsWith("PAY-DEL temp")
    );
    for (const t of temps) await fetch(`/api/invoices/${t.id}`, { method: "DELETE" });
  });
  console.log("cleanup: temp invoices removed");

  await browser.close();
  console.log("ALL_TESTS_PASSED");
})().catch((e) => {
  console.log("FAIL (exception): " + e.message);
  process.exit(1);
});
