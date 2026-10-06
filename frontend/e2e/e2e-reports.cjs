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

  // 1. Login
  await page.goto(BASE + "/login", { waitUntil: "networkidle2" });
  await page.type("#email", "admin@danibrothers.com");
  await page.type("#password", "admin");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/", { timeout: 20000 });
  pass("logged in");

  // 2. Reports page: KPIs + chart + tables
  await page.goto(BASE + "/reports", { waitUntil: "networkidle2" });
  await page.waitForSelector("table", { timeout: 20000 });
  const base = await page.evaluate(() => {
    // innerText reflects CSS text-transform — compare uppercase.
    const t = document.body.innerText.toUpperCase();
    return {
      billed: t.includes("TOTAL BILLED"),
      collected: t.includes("CASH COLLECTED"),
      outstanding: t.includes("OUTSTANDING"),
      overdue: /OVERDUE \(\d+\)/.test(t),
      chart: t.includes("MONTHLY SALES TREND"),
      products: t.includes("TOP SELLING PRODUCTS"),
      customers: t.includes("TOP REVENUE CUSTOMERS"),
      exportBtn: !!document.querySelector('a[href^="/api/reports/export"]'),
      presets:
        t.includes("ALL TIME") && t.includes("THIS MONTH") &&
        t.includes("LAST MONTH") && t.includes("THIS YEAR"),
    };
  });
  for (const [k, v] of Object.entries(base)) {
    if (!v) fail(`reports missing: ${k}`);
  }
  pass("KPIs (incl. Overdue count), chart, both tables, export, presets present");

  // 3. Chart actually renders bars (seed data exists)
  const chart = await page.evaluate(() => {
    const bars = [...document.querySelectorAll('[title^="Billed:"]')];
    const withHeight = bars.filter(
      (b) => parseInt(b.style.height) > 0
    );
    return { bars: bars.length, withHeight: withHeight.length };
  });
  if (chart.bars === 0) fail("chart has no billed bars");
  if (chart.withHeight === 0) fail("chart bars all zero-height");
  pass(`chart renders ${chart.bars} month bars (${chart.withHeight} with data)`);

  // 4. Custom-items bucket present (seed invoice items are unlinked)
  const productsText = await page.evaluate(() => {
    const h2 = [...document.querySelectorAll("h2")].find((x) =>
      x.innerText.includes("Top Selling Products")
    );
    return h2 ? h2.closest("div").innerText : "";
  });
  if (!productsText.includes("Custom items"))
    fail("custom-items bucket row missing in products table");
  pass("products table shows custom-items bucket");

  // 5. Preset: This Month applies range
  await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find(
      (x) => x.innerText.trim() === "This Month"
    );
    a.click();
  });
  await page.waitForFunction(
    () => location.search.includes("from=") && location.search.includes("to="),
    { timeout: 15000 }
  );
  // Client nav updates the URL first — wait for the new subtitle to render.
  await page.waitForFunction(
    () => document.body.innerText.includes("Range:"),
    { timeout: 20000 }
  );
  const rangeText = await page.evaluate(() => document.body.innerText);
  if (!rangeText.includes("Range:"))
    fail("range indicator not shown after preset");
  pass("This Month preset applies from/to range");

  // 6. Custom date range via form
  await page.goto(BASE + "/reports", { waitUntil: "networkidle2" });
  const applied = await page.evaluate(() => {
    const form = document.querySelector('form[method="GET"]');
    const inputs = form.querySelectorAll('input[type="date"]');
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const from = d.toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);
    inputs[0].value = from;
    inputs[1].value = to;
    form.querySelector('button[type="submit"]').click();
    return { from, to };
  });
  await page.waitForFunction(
    (f) => location.search.includes(`from=${f}`),
    { timeout: 15000 },
    applied.from
  );
  // URL updates before the server response re-renders — wait for subtitle.
  await page.waitForFunction(
    (f) => document.body.innerText.includes(`${f} →`),
    { timeout: 20000 },
    applied.from
  );
  const customOk = await page.evaluate(
    (f) => document.body.innerText.includes(`${f} →`),
    applied.from
  );
  if (!customOk) fail("custom range not reflected in subtitle");
  pass("custom date range form works");

  // 7. CSV export: correct headers + data
  const csv = await page.evaluate(async () => {
    const r = await fetch("/api/reports/export");
    const text = await r.text();
    return {
      status: r.status,
      type: r.headers.get("content-type") || "",
      disposition: r.headers.get("content-disposition") || "",
      firstLine: text.split("\r\n")[0],
      hasInvoice: text.includes("INV-"),
    };
  });
  if (csv.status !== 200) fail("export status " + csv.status);
  if (!csv.type.includes("text/csv")) fail("export content-type: " + csv.type);
  if (!csv.disposition.includes("attachment"))
    fail("export missing attachment disposition");
  if (!csv.firstLine.startsWith("Invoice Number"))
    fail("export header wrong: " + csv.firstLine);
  if (!csv.hasInvoice) fail("export body missing invoice rows");
  pass("CSV export: headers, attachment, and rows verified");

  // 8. Range-scoped export URL is wired from the page button
  const exportHref = await page.evaluate(
    () => document.querySelector('a[href^="/api/reports/export"]').getAttribute("href")
  );
  if (!exportHref.includes("from="))
    fail("export button does not carry range: " + exportHref);
  pass("export button carries current range");

  await browser.close();
  console.log("ALL_TESTS_PASSED");
})().catch((e) => {
  console.log("FAIL (exception): " + e.message);
  process.exit(1);
});
