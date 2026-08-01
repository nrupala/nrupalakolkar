// nrupalakolkar.com -- Cloudflare Worker + Static Assets
//
// Design: resilient, no-lockout. Every form submission is written to the
// SUBMISSIONS KV namespace FIRST (durable), then an email is attempted on a
// best-effort basis. If email is not configured or fails, the submission is
// still captured in KV and never lost. This is the fix for the silent-failure
// class of bug (deprecated free-tier email path returning success while
// dropping the message).
//
// No framework, no build step beyond esbuild-via-wrangler, no Docker.

import { EmailMessage } from "cloudflare:email";

export interface Env {
  ASSETS: Fetcher;
  SUBMISSIONS: KVNamespace;
  // Optional email notification (see wrangler.toml). Guarded everywhere.
  SEB?: { send(message: EmailMessage): Promise<void> };
  NOTIFY_TO?: string;
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

// Best-effort email. Never throws; the submission is already persisted in KV.
async function sendMail(env: Env, subject: string, text: string, ref: string): Promise<void> {
  if (!env.SEB || !env.NOTIFY_TO) return;
  try {
    const from = "site@nrupalakolkar.com";
    const to = env.NOTIFY_TO;
    const raw =
      `From: nrupalakolkar.com <${from}>\r\n` +
      `To: <${to}>\r\n` +
      `Reply-To: <${from}>\r\n` +
      `Message-ID: <${ref}@nrupalakolkar.com>\r\n` +
      `Date: ${new Date().toUTCString()}\r\n` +
      `MIME-Version: 1.0\r\n` +
      `Content-Type: text/plain; charset=utf-8\r\n` +
      `Subject: ${subject}\r\n` +
      `\r\n` +
      text.replace(/\r?\n/g, "\r\n") +
      `\r\n`;
    await env.SEB.send(new EmailMessage(from, to, raw));
  } catch {
    // swallow -- submission is durable in KV
  }
}

async function handleNotify(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const b = await readJson(request);
  const email = clean(b.email, 254);
  if (!looksLikeEmail(email)) return json({ ok: false, error: "invalid_email" }, 400);
  const ref = rid();
  const rec = {
    type: "notify",
    email,
    ts: new Date().toISOString(),
    ip: request.headers.get("cf-connecting-ip") || "",
    ua: request.headers.get("user-agent") || "",
  };
  await env.SUBMISSIONS.put(`notify:${ref}`, JSON.stringify(rec));
  ctx.waitUntil(sendMail(env, "New launch-notify signup", `Email: ${email}\nWhen: ${rec.ts}`, ref));
  return json({ ok: true });
}

async function handleOrder(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
    name,
    email,
    address,
    format,
    quantity,
    ts: new Date().toISOString(),
    ip: request.headers.get("cf-connecting-ip") || "",
  };
  await env.SUBMISSIONS.put(`order:${ref}`, JSON.stringify(rec));
  const body =
    `Signed hard-copy request\n\n` +
    `Name: ${name}\nEmail: ${email}\nFormat: ${format}\nQuantity: ${quantity}\n` +
    `Shipping address:\n${address}\n\nWhen: ${rec.ts}\nRef: ${ref}`;
  ctx.waitUntil(sendMail(env, "New signed hard-copy request", body, ref));
  return json({ ok: true, ref });
}

async function handleContact(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
    name,
    email,
    subject,
    message,
    ts: new Date().toISOString(),
    ip: request.headers.get("cf-connecting-ip") || "",
  };
  await env.SUBMISSIONS.put(`contact:${ref}`, JSON.stringify(rec));
  ctx.waitUntil(
    sendMail(env, `Contact: ${subject || "(no subject)"}`, `From: ${name} <${email}>\n\n${message}\n\nWhen: ${rec.ts}`, ref),
  );
  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST") {
      switch (url.pathname) {
        case "/api/notify":
          return handleNotify(request, env, ctx);
        case "/api/book-order":
          return handleOrder(request, env, ctx);
        case "/contact":
          return handleContact(request, env, ctx);
        default:
          return json({ ok: false, error: "not_found" }, 404);
      }
    }

    // Everything else -> static assets. html_handling maps /books -> books.html.
    return env.ASSETS.fetch(request);
  },
};
