// nrupalakolkar.com -- Cloudflare Worker + Static Assets
//
// Resilient form handling. Every submission (contact, launch-notify, book
// order) is written to the SUBMISSIONS KV namespace FIRST (durable), then
// forwarded to a Google Apps Script Web App that (a) appends a row to the
// linked Google Sheet and (b) emails Nrupal. If the forward fails, the
// submission is still captured in KV -- nothing is silently lost (the failure
// mode that killed the old free-tier email path).
//
// No framework, no Docker.

export interface Env {
  ASSETS: Fetcher;
  SUBMISSIONS: KVNamespace;
  APPSCRIPT_URL?: string; // Google Apps Script Web App /exec URL (secret)
  APPSCRIPT_SECRET?: string; // shared secret echoed to Apps Script (secret)
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" } as const;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function rid(): string {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function clean(v: unknown, max = 2000): string {
  return String(v ?? "").trim().slice(0, max);
}

function looksLikeEmail(v: string): boolean {
  return v.length >= 3 && v.length <= 254 && v.includes("@") && !/\s/.test(v);
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// Best-effort forward to Apps Script (Sheet append + email). Never throws;
// the submission is already durable in KV.
async function forward(env: Env, record: Record<string, unknown>): Promise<void> {
  if (!env.APPSCRIPT_URL) return;
  try {
    await fetch(env.APPSCRIPT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...record, secret: env.APPSCRIPT_SECRET || "" }),
    });
  } catch {
    // durable copy already in KV
  }
}

async function handleNotify(request: Request, env: Env): Promise<Response> {
  const b = await readJson(request);
  const email = clean(b.email, 254);
  if (!looksLikeEmail(email)) return json({ ok: false, error: "invalid_email" }, 400);
  const ref = rid();
  const rec = {
    type: "notify",
    ref,
    email,
    ts: new Date().toISOString(),
    ip: request.headers.get("cf-connecting-ip") || "",
  };
  await env.SUBMISSIONS.put(`notify:${ref}`, JSON.stringify(rec));
  await forward(env, rec);
  return json({ ok: true });
}

async function handleOrder(request: Request, env: Env): Promise<Response> {
  const b = await readJson(request);
  const name = clean(b.name, 200);
  const email = clean(b.email, 254);
  const address = clean(b.address, 1000);
  const format = clean(b.format, 120);
  const quantity = clean(b.quantity, 10);
  if (!name || !looksLikeEmail(email) || !address) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }
  const ref = rid();
  const rec = {
    type: "order",
    ref,
    name,
    email,
    address,
    format,
    quantity,
    ts: new Date().toISOString(),
    ip: request.headers.get("cf-connecting-ip") || "",
  };
  await env.SUBMISSIONS.put(`order:${ref}`, JSON.stringify(rec));
  await forward(env, rec);
  return json({ ok: true, ref });
}

async function handleContact(request: Request, env: Env): Promise<Response> {
  const b = await readJson(request);
  const name = clean(b.name, 200);
  const email = clean(b.email, 254);
  const subject = clean(b.subject, 200);
  const message = clean(b.message, 5000);
  if (!name || !looksLikeEmail(email) || !message) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }
  const ref = rid();
  const rec = {
    type: "contact",
    ref,
    name,
    email,
    subject,
    message,
    ts: new Date().toISOString(),
    ip: request.headers.get("cf-connecting-ip") || "",
  };
  await env.SUBMISSIONS.put(`contact:${ref}`, JSON.stringify(rec));
  await forward(env, rec);
  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST") {
      switch (url.pathname) {
        case "/api/notify":
          return handleNotify(request, env);
        case "/api/book-order":
          return handleOrder(request, env);
        case "/contact":
          return handleContact(request, env);
        default:
          return json({ ok: false, error: "not_found" }, 404);
      }
    }

    // Everything else -> static assets. html_handling maps /books -> books.html.
    return env.ASSETS.fetch(request);
  },
};
