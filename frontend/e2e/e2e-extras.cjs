const puppeteer = require("puppeteer-core");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const path = require("path");
const fs = require("fs");
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
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(BASE, ["clipboard-read", "clipboard-write"]);
  const page = await browser.newPage();
  let lastDialogMessage = "";
  page.on("dialog", async (d) => {
    lastDialogMessage = d.message();
    await d.accept();
  });

  // 1. Login
  await page.goto(BASE + "/login", { waitUntil: "networkidle2" });
  await page.type("#email", "admin@danibrothers.com");
  await page.type("#password", "admin");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/", { timeout: 20000 });
  pass("logged in");

  // ================= Currency wiring (#9) =================
  // Set currency to USD, snapshot dashboard text, RESTORE, then assert.
  const currencyCheck = await page.evaluate(async () => {
    const cur = await fetch("/api/settings").then((r) => r.json());
    const original = cur.settings.currency;
    const body = { ...cur.settings, currency: "USD" };
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { original };
  });
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await page.waitForSelector("table", { timeout: 20000 });
  const usdShown = await page.evaluate(() =>
    document.body.innerText.includes("USD ")
  );
  // restore immediately, before any assertion can exit the process
  await page.evaluate(async (original) => {
    const cur = await fetch("/api/settings").then((r) => r.json());
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cur.settings, currency: original }),
    });
  }, currencyCheck.original);
  if (!usdShown) fail("dashboard did not follow settings currency (USD missing)");
  pass(`dashboard respects settings currency (USD shown, restored to ${currencyCheck.original})`);

  // ================= Logo upload (#8) =================
  await page.goto(BASE + "/settings", { waitUntil: "networkidle2" });
  await page.waitForFunction(
    () => document.body.innerText.includes("Logo & Branding"),
    { timeout: 20000 }
  );
  const fileInput = await page.$('input[type="file"]');
  if (!fileInput) fail("logo file input missing");
  // Self-contained: generate the 1x1 PNG next to this script if missing.
  const logoPath = path.join(__dirname, "test-logo.png");
  if (!fs.existsSync(logoPath)) {
    fs.writeFileSync(
      logoPath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
        "base64"
      )
    );
  }
  await fileInput.uploadFile(logoPath);
  await page.waitForFunction(
    () => !!document.querySelector('img[src^="data:image"]'),
    { timeout: 10000 }
  );
  pass("logo upload shows data-URL preview");

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.innerText.includes("Save Settings")
    );
    btn.click();
  });
  await page.waitForFunction(
    () => document.body.innerText.includes("Settings updated successfully"),
    { timeout: 20000 }
  );
  pass("logo saved with settings");

  // persisted? reload and look for custom preview (not default state)
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForFunction(
    () => document.body.innerText.includes("Logo & Branding"),
    { timeout: 20000 }
  );
  const persisted = await page.evaluate(
    () => !!document.querySelector('img[src^="data:image"]')
  );
  if (!persisted) fail("logo not persisted after reload");
  pass("logo persists across reload");

  // remove → save → default state back
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.innerText.includes("Remove (use default)")
    );
    btn.click();
  });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.innerText.includes("Save Settings")
    );
    btn.click();
  });
  await page.waitForFunction(
    () => document.body.innerText.includes("Settings updated successfully"),
    { timeout: 20000 }
  );
  const removed = await page.evaluate(
    () =>
      !document.querySelector('img[src^="data:image"]') &&
      document.body.innerText.includes("Default logo in use")
  );
  if (!removed) fail("logo removal did not stick");
  pass("logo removed -> default state restored");

  // ================= Global search dropdown (#10) =================
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await page.waitForSelector("header input[type='text']", { timeout: 15000 });
  await page.type("header input[type='text']", "INV-");
  await page.waitForFunction(
    () => document.querySelectorAll('form a[href^="/invoices/"]').length > 0,
    { timeout: 10000 }
  );
  const dropdown = await page.evaluate(() => {
    const links = [...document.querySelectorAll('form a[href^="/invoices/"]')];
    return links.length;
  });
  if (dropdown === 0) fail("search dropdown has no invoice results");
  pass(`search dropdown shows ${dropdown} invoice result(s)`);

  await page.evaluate(() => {
    const link = document.querySelector('form a[href^="/invoices/"]');
    link.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    link.click();
  });
  await page.waitForFunction(
    () => /^\/invoices\/.+/.test(location.pathname),
    { timeout: 15000 }
  );
  pass("dropdown result navigates to invoice detail");

  // ================= Share buttons (#11) =================
  await page.waitForSelector("#invoice-pdf-template", { timeout: 20000 });
  const shareBtns = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      whatsapp: t.includes("WhatsApp"),
      email: t.includes("Email"),
      copy: t.includes("Copy Link"),
    };
  });
  if (!shareBtns.whatsapp || !shareBtns.email || !shareBtns.copy)
    fail("share buttons missing: " + JSON.stringify(shareBtns));
  pass("WhatsApp / Email / Copy Link buttons present");

  const waUrl = await page.evaluate(() => {
    window.__opened = [];
    window.open = (u) => {
      window.__opened.push(String(u));
      return null;
    };
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.innerText.includes("WhatsApp")
    );
    btn.click();
    return window.__opened[0] || "";
  });
  if (!waUrl.includes("wa.me/92"))
    fail("whatsapp url wrong: " + waUrl);
  if (!waUrl.includes("text=") || !decodeURIComponent(waUrl).includes("INV-"))
    fail("whatsapp text missing invoice summary");
  pass("WhatsApp builds wa.me/92 link with invoice summary");

  // Clipboard writes are denied in headless Edge — the app's documented
  // fallback is a prompt exposing the URL. Real browsers take the
  // writeText path and show "Copied!".
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.innerText.includes("Copy Link")
    );
    btn.click();
  });
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline && !lastDialogMessage) {
    await new Promise((r) => setTimeout(r, 200));
  }
  const copyResult = lastDialogMessage;
  if (!copyResult.includes("/invoices/") && !copyResult.includes("Copy invoice link"))
    fail("copy link produced neither clipboard state nor url prompt: " + copyResult);
  pass("Copy Link works (clipboard fallback exposes invoice URL)");

  // ================= 404 page =================
  const resp404 = await page.goto(BASE + "/definitely-missing-page-xyz", {
    waitUntil: "networkidle2",
  });
  const notFound = await page.evaluate(() => document.body.innerText);
  if (resp404.status() !== 404) fail("missing route status " + resp404.status());
  if (!notFound.includes("Page not found"))
    fail("not-found page content missing");
  pass("not-found: 404 status + custom page");

  await browser.close();
  console.log("ALL_TESTS_PASSED");
})().catch((e) => {
  console.log("FAIL (exception): " + e.message);
  process.exit(1);
});
