// Cloudflare Worker for the portfolio.
// Serves the static site from `out/`, and handles POST /api/message by
// forwarding the visitor's message to Daro's Telegram through a bot.
//
// Secrets (set in Cloudflare: Settings → Variables and Secrets):
//   TELEGRAM_BOT_TOKEN  the token @BotFather gives you
//   TELEGRAM_CHAT_ID    your own chat id, so only you receive messages

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

type Payload = { name?: unknown; email?: unknown; message?: unknown; company?: unknown; startedAt?: unknown };

const LIMITS = { name: 80, email: 120, message: 2000 };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Visitors can leave an email or a Telegram username for Daro's reply.
const EMAIL = /^\S+@\S+\.\S+$/;
const TELEGRAM = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/;
export function replyTo(contact: string): string | null {
  if (EMAIL.test(contact)) return `Email: ${contact}`;
  if (TELEGRAM.test(contact)) return `Telegram: @${contact.replace(/^@/, "")} (https://t.me/${contact.replace(/^@/, "")})`;
  return null;
}

export async function handleMessage(request: Request, env: Env, send: typeof fetch = fetch): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "Use POST." }, 405);
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json({ ok: false, error: "Messaging isn't set up yet." }, 503);

  let data: Payload;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Couldn't read the message." }, 400);
  }

  // Bots tend to fill the hidden "company" field or submit instantly. Pretend it worked.
  const startedAt = typeof data.startedAt === "number" ? data.startedAt : 0;
  if (clean(data.company, 100) || (startedAt && Date.now() - startedAt < 2500)) return json({ ok: true });

  const name = clean(data.name, LIMITS.name);
  const email = clean(data.email, LIMITS.email);
  const message = clean(data.message, LIMITS.message);
  const reply = replyTo(email);
  if (!name || !reply || message.length < 2) {
    return json({ ok: false, error: "Please add your name, an email or Telegram username, and a message." }, 400);
  }

  const text = [
    "New message from your portfolio",
    "",
    `Name: ${name}`,
    `Reply to → ${reply}`,
    "",
    message,
    "",
    `Page: ${request.headers.get("referer") ?? "unknown"}`,
  ].join("\n");

  const res = await send(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
  });
  if (!res.ok) return json({ ok: false, error: "Telegram didn't accept the message." }, 502);
  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/message") return handleMessage(request, env);
    return env.ASSETS.fetch(request);
  },
};
