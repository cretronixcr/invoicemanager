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

  // 2. Create a temp invoice via API (session cookie is active)
  const temp = await page.evaluate(async () => {
    const custRes = await fetch("/api/customers").then((r) => r.json());
    const customerId = custRes.customers[0]?.id;
    if (!customerId) return { error: "no customers" };
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        invoiceDate: new Date().toISOString(),
        items: [
          {
            description: "E2E temp invoice line",
            quantity: 1,
            rate: 1000,
            amount: 1000,
            serialNumber: 1,
          },
        ],
        subtotal: 1000,
        discount: 0,
        additionalCharges: 0,
        tax: 0,
        total: 1000,
        advance: 0,
        status: "Draft",
      }),
    });
    const data = await res.json();
    return data.success
      ? { id: data.invoice.id, number: data.invoice.invoiceNumber }
      : { error: data.error };
  });
  if (temp.error) fail("temp invoice create: " + temp.error);
  pass(`temp invoice created: ${temp.number}`);

  // 3. List page: edit link must exist for this invoice
  await page.goto(BASE + "/invoices", { waitUntil: "networkidle2" });
  const editHref = await page.evaluate(
    (id) => !!document.querySelector(`a[href="/invoices/new?editId=${id}"]`),
    temp.id
  );
  if (!editHref) fail("edit link missing on invoices list");
  pass("edit button present on list row");

  // 4. Open edit page via that link
  await page.click(`a[href="/invoices/new?editId=${temp.id}"]`);
  await page.waitForFunction(
    (num) =>
      location.pathname === "/invoices/new" &&
      document.body.innerText.includes("Edit Invoice " + num),
    { timeout: 20000 },
    temp.number
  );
  pass("edit page opened with correct title");

  // 5. Prefill check: wait until BOTH items and customer select are filled
  //    (they arrive in one response but render in one commit — wait for both
  //    to avoid racing the DOM read).
  await page.waitForFunction(
    () => {
      const ta = document.querySelectorAll("textarea")[0];
      const sel = document.querySelector("select");
      return (
        ta && ta.value.includes("E2E temp invoice line") && sel && sel.value
      );
    },
    { timeout: 20000 }
  );
  const prefill = await page.evaluate(() => ({
    itemDesc: document.querySelectorAll("textarea")[0].value,
    customerSet: !!document.querySelector("select")?.value,
  }));
  if (!prefill.customerSet) fail("customer not prefilled");
  pass("form prefilled (customer + items)");

  // 6. Advance input must be locked in edit mode
  const advanceLocked = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input[type="number"]')];
    const labels = [...document.querySelectorAll("label")];
    const advLabel = labels.find((l) =>
      l.innerText.includes("Advance Payment Received")
    );
    if (!advLabel) return "no-label";
    const input = advLabel.parentElement.querySelector("input");
    return input ? (input.disabled ? "locked" : "unlocked") : "no-input";
  });
  if (advanceLocked !== "locked") fail("advance input not locked: " + advanceLocked);
  pass("advance input locked in edit mode");

  // 7. Edit item description (React state via native setter + input event)
  await page.evaluate(() => {
    const ta = document.querySelectorAll("textarea")[0];
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    ).set;
    setter.call(ta, "E2E EDITED description");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  // also bump discount to verify financial recalculation
  await page.evaluate(() => {
    const labels = [...document.querySelectorAll("label")];
    const dLabel = labels.find((l) => l.innerText.includes("Discount (PKR)"));
    const input = dLabel.parentElement.querySelector("input");
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    setter.call(input, "100");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // 8. Save Changes
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.innerText.trim() === "Save Changes"
    );
    btn.click();
  });
  await page.waitForFunction(
    (id) => location.pathname === "/invoices/" + id,
    { timeout: 20000 },
    temp.id
  );
  pass("saved -> redirected to invoice detail");

  // 9. Verify detail shows edited description + recalculated total (1000-100=900)
  await page.waitForSelector("#invoice-pdf-template", { timeout: 15000 });
  const detailText = await page.evaluate(
    () => document.querySelector("#invoice-pdf-template").innerText
  );
  if (!detailText.includes("E2E EDITED description"))
    fail("edited description not on detail page");
  if (!detailText.includes("900")) fail("total not recalculated (expected 900)");
  pass("edit persisted: description + total 900 verified");

  // 10. Delete from detail page (confirm dialog auto-accepted)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.innerText.trim() === "Delete"
    );
    btn.click();
  });
  await page.waitForFunction(() => location.pathname === "/invoices", {
    timeout: 20000,
  });
  pass("deleted -> redirected to invoices list");

  // 11. Confirm it's really gone (API 404)
  const gone = await page.evaluate(
    async (id) => {
      const res = await fetch(`/api/invoices/${id}`);
      return res.status;
    },
    temp.id
  );
  if (gone !== 404) fail("invoice still exists, status=" + gone);
  pass("invoice confirmed deleted (404)");

  await browser.close();
  console.log("ALL_TESTS_PASSED");
})().catch((e) => {
  console.log("FAIL (exception): " + e.message);
  process.exit(1);
});
