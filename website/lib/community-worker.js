const DEFAULT_SHEET_ID = "1gfGm1bGOEE0IT1Kg97IGE1nsBfTxURS5NO7LfAZh-BY";
const DONATION_TABS = [
  "web Donations received",
  "Donations received",
  "Donations received ",
];
const EXPENSE_TABS = ["Expenditure"];
const MAX_CONTACT_BODY_BYTES = 8_192;

function csvUrl(spreadsheetId, sheetName) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function looksLikeCsv(text) {
  return Boolean(text) && !text.startsWith("<") && !/sign in|login required/i.test(text);
}

async function fetchCsv(spreadsheetId, names) {
  let lastStatus = 0;
  for (const name of names) {
    const response = await fetch(csvUrl(spreadsheetId, name), {
      cache: "no-store",
    });
    const text = await response.text();
    lastStatus = response.status;
    if (response.ok && looksLikeCsv(text)) return text;
  }
  if (lastStatus === 403 || lastStatus === 401) {
    throw Object.assign(
      new Error(
        "The Google Sheet is private. Share it as “Anyone with the link can view”.",
      ),
      { status: 403 },
    );
  }
  throw Object.assign(
    new Error("Google Sheet tabs could not be read."),
    { status: 502 },
  );
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

function contactPayload(body) {
  if (!body || typeof body !== "object") return null;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const website = typeof body.website === "string" ? body.website.trim() : "";

  if (website) return { spam: true };
  if (name.length < 2 || name.length > 100) return null;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (message.length < 10 || message.length > 2_000) return null;

  return { name, email, message };
}

async function handleContact(request, env) {
  return handleSubmission(request, env, false);
}

function poojaPayload(body) {
  if (!body || typeof body !== "object") return null;
  if (typeof body.website === "string" && body.website.trim()) return { spam: true };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const date = typeof body.date === "string" ? body.date : "";
  const plot = typeof body.plot === "string" ? body.plot.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!plot || plot.length > 50 || !/^\+?[0-9 ()-]{7,25}$/.test(phone) || phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) return null;
  const parsed = new Date(date + "T12:00:00Z");
  if (name.length < 2 || name.length > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (date < today) return null;
  return { name, date, plot, phone };
}

async function handleSubmission(request, env, pooja) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const requestUrl = new URL(request.url);
  if (request.headers.get("origin") !== requestUrl.origin) {
    return json({ error: "Request origin is not allowed" }, 403);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_CONTACT_BODY_BYTES) {
    return json({ error: "Message is too large" }, 413);
  }

  let body;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_CONTACT_BODY_BYTES) {
      return json({ error: "Message is too large" }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const contact = pooja ? poojaPayload(body) : contactPayload(body);
  if (!contact) return json({ error: "Please check the form fields" }, 400);
  if (contact.spam) return json({ ok: true });

  const webhook = pooja ? env.POOJA_SHEET_WEBHOOK_URL : env.CONTACT_SHEET_WEBHOOK_URL;
  const secret = pooja ? env.POOJA_WEBHOOK_SECRET : env.CONTACT_WEBHOOK_SECRET;
  if (!webhook || !secret) {
    if (pooja) return json({ error: "Pooja requests are not connected yet. Please contact the committee.", code: "POOJA_NOT_CONFIGURED" }, 503);
    return json({ error: "Message delivery is not configured" }, 503);
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret,
        ...contact,
      }),
      redirect: "follow",
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.ok) {
      return json({ error: "Message could not be saved" }, 502);
    }

    return json({ ok: true });
  } catch {
    return json({ error: "Message service is unavailable" }, 502);
  }
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    if (path === "/api/pooja-schedule") {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      try {
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID}/gviz/tq?tqx=out:csv&gid=2009284977&headers=1&tq=${encodeURIComponent("select A,B,D,E")}`;
        const response = await fetch(sheetUrl, { cache: "no-store" });
        const csv = await response.text();
        if (!response.ok || (csv && !looksLikeCsv(csv))) throw new Error("Schedule unavailable");
        return json({ csv, fetchedAt: new Date().toISOString() });
      } catch {
        return json({ error: "The pooja schedule could not be loaded. Please try again." }, 502);
      }
    }
    if (path === "/api/contact") {
      return handleContact(request, env);
    }
    if (path === "/api/pooja-requests") {
      return handleSubmission(request, env, true);
    }
    if (path === "/api/finances") {
      try {
        const spreadsheetId = env.GOOGLE_SHEET_ID || DEFAULT_SHEET_ID;
        const [donationsCsv, expensesCsv] = await Promise.all([
          fetchCsv(spreadsheetId, DONATION_TABS),
          fetchCsv(spreadsheetId, EXPENSE_TABS),
        ]);
        return json({
          donationsCsv,
          expensesCsv,
          fetchedAt: new Date().toISOString(),
        });
      } catch (error) {
        return json(
          {
            error: error instanceof Error ? error.message : "Sheet fetch failed",
            code: error?.status === 403 ? "SHEET_FORBIDDEN" : "SHEET_UNAVAILABLE",
          },
          error?.status === 403 ? 403 : 502,
        );
      }
    }
    return env.ASSETS.fetch(request);
  },
};
export default worker;
