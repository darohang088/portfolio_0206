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
export type Reply = { kind: "email"; value: string } | { kind: "telegram"; value: string; url: string };
export function replyTo(contact: string): Reply | null {
  if (EMAIL.test(contact)) return { kind: "email", value: contact };
  if (TELEGRAM.test(contact)) {
    const handle = contact.replace(/^@/, "");
    return { kind: "telegram", value: `@${handle}`, url: `https://t.me/${handle}` };
  }
  return null;
}

// Telegram HTML needs <, > and & escaped in anything the visitor typed.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// "Home", "Tos page", "Merchant page"… instead of a long URL.
export function pageName(referer: string | null): string {
  if (!referer) return "Unknown page";
  try {
    const path = new URL(referer).pathname.replace(/\/$/, "");
    const app = /^\/apps\/([a-z0-9-]+)$/.exec(path);
    if (app) return `${app[1].charAt(0).toUpperCase()}${app[1].slice(1)} page`;
    return path === "" ? "Home" : path;
  } catch {
    return "Unknown page";
  }
}

export function formatMessage(name: string, reply: Reply, message: string, page: string, now = new Date()) {
  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Phnom_Penh",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);
  const contact =
    reply.kind === "telegram"
      ? `💬 Telegram: <a href="${reply.url}">${esc(reply.value)}</a>`
      : `✉️ Email: ${esc(reply.value)}`;
  const text = [
    "📬 <b>New message from your portfolio</b>",
    "",
    `👤 <b>${esc(name)}</b>`,
    contact,
    "",
    `<blockquote>${esc(message)}</blockquote>`,
    "",
    `🕒 ${when} · ${esc(page)}`,
  ].join("\n");
  const reply_markup =
    reply.kind === "telegram"
      ? { inline_keyboard: [[{ text: `Reply to ${reply.value} on Telegram`, url: reply.url }]] }
      : undefined;
  return { text, reply_markup };
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

  const { text, reply_markup } = formatMessage(name, reply, message, pageName(request.headers.get("referer")));

  const res = await send(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
      ...(reply_markup ? { reply_markup } : {}),
    }),
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
