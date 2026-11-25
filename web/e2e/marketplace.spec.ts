import { expect, test, type Page } from "@playwright/test";

const stamp = Date.now();

async function login(page: Page, email: string, password = "campus123") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: /Log out/ })).toBeVisible();
}

test("browse, search and open a listing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Buy and sell on your campus/ })).toBeVisible();
  await expect(page.locator(".listing-card").first()).toBeVisible();
  await page.getByLabel("Search").fill("cycle");
  await expect(page).toHaveURL(/q=cycle/);
  await expect(page.locator(".listing-card").first()).toContainText(/cycle/i);
  await page.locator(".listing-card").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/cycle/i);
});

test("empty state when nothing matches", async ({ page }) => {
  await page.goto("/?q=zzzznothing");
  await expect(page.getByRole("heading", { name: "Nothing matches" })).toBeVisible();
});

test("a protected page sends you to log in, then back", async ({ page }) => {
  await page.goto("/sell");
  await expect(page).toHaveURL(/\/login\?next=%2Fsell/);
  await page.getByLabel("Email").fill("aarav@campus.test");
  await page.getByLabel("Password").fill("campus123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Sell an item" })).toBeVisible();
});

test("wrong password shows one clear error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("aarav@campus.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.locator(".notice.error")).toHaveText("Wrong email or password");
});

test("sign up, post a listing with the AI helper, mark sold, delete", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Test Student");
  await page.getByLabel("Email").fill(`student${stamp}@campus.test`);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("button", { name: /Log out/ })).toBeVisible();

  await page.goto("/sell");
  await page.getByRole("button", { name: "Post listing" }).click();
  await expect(page.getByText("Title needs at least 3 characters")).toBeVisible();

  await page.getByLabel("Notes about your item").fill("Hero cycle, 21 gears, new tyres, 4000 rupees");
  await page.getByRole("button", { name: "Write my listing" }).click();
  await expect(page.getByRole("status")).toContainText("Draft ready");
  await expect(page.getByLabel("Title")).toHaveValue(/Hero cycle/);
  await expect(page.getByLabel("Price (₹)")).toHaveValue("4000");
  await expect(page.getByLabel("Category")).toHaveValue("CYCLES");
  await page.getByRole("button", { name: "Post listing" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Hero cycle/);
  await expect(page.getByRole("heading", { name: "Your listing" })).toBeVisible();
  await page.getByRole("button", { name: "Mark as sold" }).click();
  await expect(page.getByText("Sold", { exact: true }).first()).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL("/");
});

test("you cannot edit someone else's listing", async ({ page }) => {
  await login(page, "diya@campus.test");
  await page.goto("/listings/1");
  await expect(page.getByRole("heading", { name: /Message Aarav/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
});

test("chat: a message reaches the seller live", async ({ browser }) => {
  const seller = await (await browser.newContext()).newPage();
  const buyer = await (await browser.newContext()).newPage();
  await login(seller, "aarav@campus.test");
  await login(buyer, "diya@campus.test");

  await seller.goto("/messages");
  await expect(seller.getByText("Live", { exact: true })).toBeVisible();
  await seller.locator(".convo").first().click();

  await buyer.goto("/listings/1");
  const text = `Can we meet at 6? ${stamp}`;
  await buyer.locator("#msg").fill(text);
  await buyer.getByRole("button", { name: "Send message" }).click();
  await expect(buyer.getByText(/^Sent\./)).toBeVisible();

  await expect(seller.getByText(text).first()).toBeVisible({ timeout: 8000 });
});
