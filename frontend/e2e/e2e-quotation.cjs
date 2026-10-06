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

  // 1b. Clean up leftovers from previous failed runs
  const cleaned = await page.evaluate(async () => {
    const list = await fetch("/api/quotations").then((r) => r.json());
    const leftovers = list.quotations.filter(
      (q) => q.notes === "E2E test quotation"
    );
    for (const q of leftovers) {
      await fetch(`/api/quotations/${q.id}`, { method: "DELETE" });
    }
    return leftovers.length;
  });
  if (cleaned > 0) console.log(`cleanup: removed ${cleaned} leftover temp quotation(s)`);

  // 2. Create temp quotation via API — verify QT- prefix fix
  const temp = await page.evaluate(async () => {
    const custRes = await fetch("/api/customers").then((r) => r.json());
    const customerId = custRes.customers[0]?.id;
    if (!customerId) return { error: "no customers" };
    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        date: new Date().toISOString(),
        items: [
          {
            description: "E2E temp quotation line",
            section: "A - Cameras",
            quantity: 2,
            rate: 500,
            amount: 1000,
            serialNumber: 1,
          },
        ],
        subtotal: 1000,
        discount: 100,
        tax: 0,
        total: 900,
        status: "Draft",
        notes: "E2E test quotation",
      }),
    });
    const data = await res.json();
    return data.success
      ? { id: data.quotation.id, number: data.quotation.quotationNumber }
      : { error: data.error };
  });
  if (temp.error) fail("create quotation: " + temp.error);
  if (!/^QT-/.test(temp.number))
    fail("quotation number missing QT- prefix: " + temp.number);
  pass(`temp quotation created with prefix: ${temp.number}`);

  // 3. Guard: a quotation already linked to an invoice cannot be deleted
  const convertedGuard = await page.evaluate(async () => {
    const list = await fetch("/api/quotations").then((r) => r.json());
    const linked = list.quotations.find(
      (q) => q.invoices && q.invoices.length > 0
    );
    if (!linked) return { skipped: true };
    const res = await fetch(`/api/quotations/${linked.id}`, {
      method: "DELETE",
    });
    return { status: res.status };
  });
  if (convertedGuard.skipped) {
    console.log("SKIP: no invoice-linked quotation to guard-test");
  } else if (convertedGuard.status !== 400) {
    fail("linked quotation delete should be 400, got " + convertedGuard.status);
  } else {
    pass("invoice-linked quotation delete blocked (400)");
  }

  // 4. List page: New Quotation button + view link (client-side render — wait for it)
  await page.goto(BASE + "/quotations", { waitUntil: "networkidle2" });
  await page.waitForSelector(`a[href="/quotations/${temp.id}"]`, {
    timeout: 20000,
  });
  const listOk = await page.evaluate(() => {
    const hasNewBtn = [...document.querySelectorAll("a")].some(
      (a) =>
        a.getAttribute("href") === "/quotations/new" &&
        a.innerText.includes("New Quotation")
    );
    return { hasNewBtn };
  });
  if (!listOk.hasNewBtn) fail("New Quotation button missing");
  pass("list: New Quotation button + view link present");

  // 5. Detail page renders PDF template
  await page.click(`a[href="/quotations/${temp.id}"]`);
  await page.waitForSelector("#quotation-pdf-template", { timeout: 20000 });
  const pdfText = await page.evaluate(
    () => document.querySelector("#quotation-pdf-template").innerText
  );
  if (!pdfText.includes("Quotation")) fail("PDF template missing 'Quotation' title");
  if (!pdfText.includes(temp.number)) fail("PDF template missing quotation number");
  if (!pdfText.includes("E2E temp quotation line")) fail("PDF missing item");
  if (!pdfText.includes("900")) fail("PDF missing total 900");
  pass("detail: A4 PDF template renders (title, number, item, total)");

  // 6. Status: Mark Sent
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.innerText.includes("Mark Sent")
    );
    btn.click();
  });
  await page.waitForFunction(
    () => document.body.innerText.includes("SENT"),
    { timeout: 15000 }
  );
  pass("status changed Draft -> Sent");

  // 7. Convert-to-invoice link present
  const convertHref = await page.evaluate(
    (id) =>
      !!document.querySelector(`a[href="/invoices/new?quotationId=${id}"]`),
    temp.id
  );
  if (!convertHref) fail("Convert to Invoice link missing");
  pass("convert-to-invoice link present");

  // 8. Edit page prefill + save
  await page.click(`a[href="/quotations/new?editId=${temp.id}"]`);
  await page.waitForFunction(
    (num) =>
      document.body.innerText.includes("Edit Quotation " + num),
    { timeout: 20000 },
    temp.number
  );
  await page.waitForFunction(
    () => {
      const ta = document.querySelectorAll("textarea")[0];
      return ta && ta.value.includes("E2E temp quotation line");
    },
    { timeout: 20000 }
  );
  pass("edit page prefilled");

  await page.evaluate(() => {
    const ta = document.querySelectorAll("textarea")[0];
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    ).set;
    setter.call(ta, "E2E EDITED quotation line");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.innerText.trim() === "Save Changes"
    );
    btn.click();
  });
  await page.waitForFunction(
    (id) => location.pathname === "/quotations/" + id,
    { timeout: 20000 },
    temp.id
  );
  await page.waitForSelector("#quotation-pdf-template", { timeout: 15000 });
  const afterEdit = await page.evaluate(
    () => document.querySelector("#quotation-pdf-template").innerText
  );
  if (!afterEdit.includes("E2E EDITED quotation line"))
    fail("edited description not persisted");
  // innerText reflects CSS text-transform (uppercase pill) — compare case-insensitively
  if (!afterEdit.toUpperCase().includes("SENT"))
    fail("status lost after edit (expected Sent to persist)");
  pass("edit saved: description updated, status preserved (Sent)");

  // 9. Delete from detail
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.innerText.trim() === "Delete"
    );
    btn.click();
  });
  await page.waitForFunction(() => location.pathname === "/quotations", {
    timeout: 20000,
  });
  const gone = await page.evaluate(
    async (id) => (await fetch(`/api/quotations/${id}`)).status,
    temp.id
  );
  if (gone !== 404) fail("quotation still exists, status=" + gone);
  pass("deleted -> 404 confirmed");

  // 10. New quotation form page loads (create flow smoke check)
  await page.goto(BASE + "/quotations/new", { waitUntil: "networkidle2" });
  const formOk = await page.evaluate(
    () =>
      document.body.innerText.includes("Create New Quotation") &&
      !!document.querySelector("select")
  );
  if (!formOk) fail("new quotation form did not render");
  pass("new quotation form renders");

  await browser.close();
  console.log("ALL_TESTS_PASSED");
})().catch((e) => {
  console.log("FAIL (exception): " + e.message);
  process.exit(1);
});
