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
  page.on("pageerror", (e) => console.log("PAGE_ERROR:", e.message.slice(0, 300)));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE_ERROR:", m.text().slice(0, 300));
  });
  page.on("request", (r) => {
    if (r.url().includes("/login") && r.method() === "POST") console.log("NET: POST /login");
  });

  // 1. Unauthenticated "/" redirects to /login
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  if (!page.url().includes("/login")) fail("expected redirect to /login, got " + page.url());
  pass("unauthenticated / redirects to /login");

  // 2. Wrong password shows error
  await page.type("#email", "admin@danibrothers.com");
  await page.type("#password", "definitely-wrong");
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => document.body.innerText.includes("Invalid email or password"),
    { timeout: 15000 }
  );
  if (!page.url().includes("/login")) fail("should stay on /login after bad password");
  pass("wrong password -> error message, stays on /login");

  // 3. Correct password logs in.
  // Note: React 19 auto-resets forms after an action completes, so both
  // fields are empty after the failed attempt — refill before retrying.
  await page.$eval("#email", (el) => (el.value = ""));
  await page.$eval("#password", (el) => (el.value = ""));
  await page.type("#email", "admin@danibrothers.com");
  await page.type("#password", "admin");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/", { timeout: 20000 });
  await page.waitForSelector("header", { timeout: 20000 });
  pass("correct password -> redirected to /");

  // 4. Header shows the real user name (not hardcoded)
  const headerText = await page.evaluate(() => document.querySelector("header")?.innerText || "");
  if (!headerText.includes("Dani Brothers Admin")) fail("header missing user name: " + headerText);
  pass("header shows logged-in user name");

  // 5. Session survives reload
  await page.reload({ waitUntil: "networkidle2" });
  if (page.url() !== BASE + "/") fail("session lost after reload, at " + page.url());
  pass("session persists across reload");

  // 6. Login page redirects away when already authed
  await page.goto(BASE + "/login", { waitUntil: "networkidle2" });
  if (page.url() !== BASE + "/") fail("authed /login should redirect to /, got " + page.url());
  pass("authed visit to /login redirects to /");

  // 7. Logout button works (server action redirect is client-side too)
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await page.click('button[aria-label="Sign out"]');
  await page.waitForFunction(() => location.pathname === "/login", { timeout: 15000 });
  pass("logout -> back to /login");

  // 8. Now "/" is protected again
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  if (!page.url().includes("/login")) fail("post-logout / should redirect, got " + page.url());
  pass("post-logout / blocked again");

  await browser.close();
  console.log("ALL_TESTS_PASSED");
})().catch((e) => {
  console.log("FAIL (exception): " + e.message);
  process.exit(1);
});
