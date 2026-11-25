import { afterAll, beforeEach } from "vitest";
import { db } from "../src/db.js";

// Safety guard: never run tests against a real database.
if (!/_test(\?|$)/.test(process.env.DATABASE_URL ?? "")) {
  throw new Error("Refusing to run: DATABASE_URL must end with _test");
}

beforeEach(async () => {
  await db.message.deleteMany();
  await db.listing.deleteMany();
  await db.user.deleteMany();
});
afterAll(() => db.$disconnect());
