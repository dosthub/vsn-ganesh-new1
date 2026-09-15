import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Load the root Worker as ESM without changing the repository's module settings.
const source = readFileSync(new URL("../lib/community-worker.js", import.meta.url), "utf8");
const { default: worker } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const origin = "https://community.example";
function request(body: unknown, requestOrigin = origin) {
  return new Request(origin + "/api/pooja-requests", {
    method: "POST", headers: { origin: requestOrigin, "content-type": "application/json" }, body: JSON.stringify({ plot: "2-A/10", phone: "9876543210", ...(body as object) }),
  });
}

test("pooja rejects invalid dates, past dates, short names and foreign origins", async () => {
  for (const body of [{ name: "Member", date: "2027-02-30" }, { name: "Member", date: "2000-01-01" }, { name: "A", date: "2099-01-01" }]) {
    assert.equal((await worker.fetch(request(body), {})).status, 400);
  }
  assert.equal((await worker.fetch(request({ name: "Member", date: "2099-01-01" }, "https://other.example"), {})).status, 403);
});

test("pooja never reports success without configured delivery", async () => {
  assert.equal((await worker.fetch(request({ name: "Member", date: "2099-01-01" }), {})).status, 503);
});

test("pooja requires a plot and a valid phone number", async () => {
  for (const extra of [{ plot: "" }, { phone: "abcdefghi" }, { phone: "123" }]) {
    assert.equal((await worker.fetch(request({ name: "Member", date: "2099-01-01", ...extra }), {})).status, 400);
  }
});

test("pooja forwards validated fields and requires acknowledgement from Google", async () => {
  const originalFetch = globalThis.fetch;
  const env = { POOJA_SHEET_WEBHOOK_URL: "https://script.google.com/example/exec", POOJA_WEBHOOK_SECRET: "test-secret" };
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, env.POOJA_SHEET_WEBHOOK_URL);
      assert.deepEqual(JSON.parse(String(options?.body)), { secret: "test-secret", name: "Member", date: "2099-01-01", plot: "2-A/10", phone: "9876543210" });
      return Response.json({ ok: true });
    };
    const response = await worker.fetch(request({ name: " Member ", date: "2099-01-01" }), env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    globalThis.fetch = async () => Response.json({ ok: false });
    assert.equal((await worker.fetch(request({ name: "Member", date: "2099-01-01" }), env)).status, 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
