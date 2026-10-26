"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BlinkingPhone from "./BlinkingPhone";
import PixelSprite from "./PixelSprite";
import { BUBBLE, BUBBLE_PAL } from "@/lib/sprites";
import { apps, profile } from "@/data/profile";
import { useLang } from "@/lib/i18n";

type Msg = { id: number; who: "bot" | "me"; text: string };
type Field = "name" | "email" | "message";

const EMAIL = /^\S+@\S+\.\S+$/;
const TELEGRAM = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/;
// Where Daro's reply will go, in words the visitor recognises.
const replyWhere = (c: string) => (EMAIL.test(c) ? { how: "email", to: c } : { how: "telegram", to: `@${c.replace(/^@/, "")}` });

const HIRING = "Hi Daro, I'm hiring for an Android / Flutter role and would like to talk. ";

// Floating message button (bottom-left) with a chat-style panel.
// Messages are sent to /api/message, which forwards them to Daro's Telegram.
export default function ChatWidget() {
  const { t } = useLang();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "", company: "" });
  const [interests, setInterests] = useState<string[]>([]);
  const [invalid, setInvalid] = useState<Field[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const cooldownUntil = useRef(0);
  const [cooldown, setCooldown] = useState(0);
  const spamWarning = useRef<HTMLDialogElement>(null);
  const blockedClicks = useRef<number[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);
  const [warningOpen, setWarningOpen] = useState(false);
  const [guardProgress, setGuardProgress] = useState(0);

  // Visual confirmation of the local guard; this performs no tracking or network requests.
  useEffect(() => {
    if (!warningOpen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGuardProgress(100);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      const progress = Math.min(100, Math.floor((Date.now() - started) / 24));
      setGuardProgress(progress);
      if (progress === 100) window.clearInterval(timer);
    }, 60);
    return () => window.clearInterval(timer);
  }, [warningOpen]);

  const showSpamWarning = () => {
    const seconds = Math.max(30, Math.ceil((cooldownUntil.current - Date.now()) / 1000));
    pauseSending(seconds);
    if (!spamWarning.current?.open) {
      setGuardProgress(0);
      setWarningOpen(true);
      spamWarning.current?.showModal();
    }
  };

  const pauseSending = (seconds: number) => {
    cooldownUntil.current = Math.max(cooldownUntil.current, Date.now() + seconds * 1000);
    setCooldown(Math.ceil((cooldownUntil.current - Date.now()) / 1000));
  };

  const coolingDown = cooldown > 0;
  useEffect(() => {
    if (!coolingDown) return;
    const timer = window.setInterval(() => {
      setCooldown(Math.max(0, Math.ceil((cooldownUntil.current - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [coolingDown]);
  const greeted = useRef(false);
  const startedAt = useRef(0);
  const nextId = useRef(0);
  const panel = useRef<HTMLElement>(null);
  const fab = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const msgInput = useRef<HTMLTextAreaElement>(null);

  // Pop the button in shortly after the page loads.
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    body.current?.scrollTo({ top: body.current.scrollHeight });
  }, [msgs, typing, showChips]);

  // Scrolling over the open chat moves the page, unless a part of the chat (like the
  // message list) can still scroll that way itself.
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      for (let n = e.target as HTMLElement | null; n && n !== el; n = n.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 1) {
          const atTop = n.scrollTop <= 0;
          const atEnd = n.scrollTop + n.clientHeight >= n.scrollHeight - 1;
          if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atEnd)) return;
        }
      }
      e.preventDefault();
      window.scrollBy({ top: e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1) });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const add = (who: Msg["who"], text: string) => setMsgs((m) => [...m, { id: nextId.current++, who, text }]);

  const botSay = useCallback((text: string, delay = 650) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTyping(true);
    return new Promise<void>((resolve) =>
      setTimeout(
        () => {
          setTyping(false);
          add("bot", text);
          resolve();
        },
        reduce ? 0 : delay,
      ),
    );
  }, []);

  const toggleInterest = (name: string) =>
    setInterests((list) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]));

  const openChat = async () => {
    setOpen(true);
    // On an app's own page, start with that app ticked.
    const here = apps.find((a) => window.location.pathname.replace(/\/$/, "") === `/apps/${a.slug}`);
    if (here && !greeted.current) setInterests([here.name]);
    if (!startedAt.current) startedAt.current = Date.now();
    setTimeout(() => nameInput.current?.focus(), 320);
    if (greeted.current) return;
    greeted.current = true;
    await botSay(t("Hi! I'm Dororo. Leave a message and Daro will reply to you."), 500);
    setShowChips(true);
  };

  const closeChat = useCallback(() => {
    setOpen(false);
    fab.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !spamWarning.current?.open && closeChat();
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (spamWarning.current?.open) return;
      if (!panel.current?.contains(target) && !fab.current?.contains(target)) closeChat();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, closeChat]);

  const copyEmail = () => {
    const done = () => botSay(t("Copied {email} to your clipboard.", { email: profile.email }), 350);
    const fallback = () => botSay(t("Daro's email is {email}", { email: profile.email }), 350);
    try {
      navigator.clipboard.writeText(profile.email).then(done, fallback);
    } catch {
      fallback();
    }
  };

  const hiring = () => {
    setForm((f) => ({ ...f, message: t(HIRING) }));
    setTimeout(() => {
      const el = msgInput.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // A ref blocks repeat submissions immediately, before React updates the button.
    if (inFlight.current || Date.now() < cooldownUntil.current) {
      const now = Date.now();
      blockedClicks.current = [...blockedClicks.current.filter(time => now - time < 4000), now];
      setBlockedCount(blockedClicks.current.length);
      if (blockedClicks.current.length >= 3) showSpamWarning();
      return;
    }
    blockedClicks.current = [];
    const bad: Field[] = [];
    if (!form.name.trim()) bad.push("name");
    const contact = form.email.trim();
    if (!EMAIL.test(contact) && !TELEGRAM.test(contact)) bad.push("email");
    if (form.message.trim().length < 2) bad.push("message");
    setInvalid(bad);
    if (bad.length) {
      setError(bad[0] === "email" ? t("Add an email or Telegram @username so Daro can reply.") : t("Please fill in your name and a message."));
      return;
    }
    setError("");
    const text = form.message.trim();
    const first = form.name.trim().split(" ")[0];
    inFlight.current = true;
    add("me", text);
    setSending(true);
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, interests, startedAt: startedAt.current }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.status === 429) {
        const retry = res.headers.get("retry-after") ?? "";
        const seconds = /^\d+$/.test(retry) ? Number(retry) : Math.ceil((Date.parse(retry) - Date.now()) / 1000);
        pauseSending(Number.isFinite(seconds) ? Math.min(3600, Math.max(1, seconds)) : 60);
        showSpamWarning();
        await botSay(t("Whoa, that's a lot of messages! Wait a minute, then send again."), 500);
        return;
      }
      if (!res.ok || !data.ok) throw new Error("not sent");
      pauseSending(15);
      setForm((f) => f.message.trim() === text ? { ...f, message: "" } : f);
      const r = replyWhere(contact);
      await botSay(t(r.how === "email" ? "Sent! Thanks, {name}. Daro will reply by email to {to}." : "Sent! Thanks, {name}. Daro will reply on Telegram to {to}.", { name: first, to: r.to }), 700);
    } catch {
      pauseSending(5);
      await botSay(t("Sorry, that didn't send. Please email Daro at {email} instead.", { email: profile.email }), 500);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const field = (k: Field) => ({
    value: form[k],
    "aria-invalid": invalid.includes(k) || undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  return (
    <>
      <button
        ref={fab}
        className={`chat-fab${visible || open ? " show" : ""}`}
        type="button"
        aria-label={t("Message Daro")}
        aria-expanded={open}
        aria-controls="chatPanel"
        onClick={() => (open ? closeChat() : openChat())}
      >
        <PixelSprite rows={BUBBLE} palette={BUBBLE_PAL} />
        <span className="chat-dot" aria-hidden="true">
          1
        </span>
        <span className="chat-tip" aria-hidden="true">
          Message me
        </span>
      </button>

      <section ref={panel} className={`chat-panel${open ? " open" : ""}`} id="chatPanel" role="dialog" aria-labelledby="chatTitle">
        <header className="chat-head">
          <span className="chat-avatar">
            <BlinkingPhone />
          </span>
          <div className="chat-who">
            <b id="chatTitle">DORORO</b>
            <span>{t("Usually replies within a day")}</span>
          </div>
          <button className="chat-x" type="button" aria-label={t("Close messages")} onClick={closeChat}>
            ✕
          </button>
        </header>

        <div className="chat-body" ref={body} aria-live="polite">
          {msgs.map((m) => (
            <div className={`msg ${m.who}`} key={m.id}>
              {m.text}
            </div>
          ))}
          {typing && (
            <div className="msg bot typing" aria-label={t("Dororo is typing")}>
              <i />
              <i />
              <i />
            </div>
          )}
          {showChips && (
            <div className="chips">
              <button className="chip-btn" type="button" onClick={copyEmail}>
                {t("Copy email")}
              </button>
              <a className="chip-btn" href={profile.linkedin.url} target="_blank" rel="noopener noreferrer">
                LinkedIn ↗
              </a>
              <button className="chip-btn" type="button" onClick={hiring}>
                {t("I'm hiring")}
              </button>
            </div>
          )}
        </div>

        <form className="chat-form" onSubmit={submit} aria-busy={sending} noValidate>
          <div className="chat-row">
            <input ref={nameInput} id="chatName" type="text" placeholder={t("Your name")} autoComplete="name" aria-label={t("Your name")} maxLength={80} {...field("name")} />
            <input id="chatEmail" type="text" inputMode="email" placeholder={t("Email or Telegram @username")} autoComplete="email" aria-label={t("Email or Telegram username, for Daro's reply")} maxLength={120} {...field("email")} />
          </div>
          <div className="chat-interest" role="group" aria-labelledby="interestLabel">
            <span className="chat-interest-label" id="interestLabel">
              {t("Interested in")} <small>{t("(optional)")}</small>
            </span>
            <div className="interest-row">
              {apps.map((a) => (
                <button
                  className="interest"
                  type="button"
                  key={a.slug}
                  aria-pressed={interests.includes(a.name)}
                  onClick={() => toggleInterest(a.name)}
                >
                  <img src={a.cardImage} alt="" width={32} height={32} />
                  {a.name}
                </button>
              ))}
            </div>
          </div>
          <textarea ref={msgInput} id="chatMsg" placeholder={t("Write your message…")} aria-label={t("Message")} maxLength={2000} {...field("message")} />
          {/* Hidden from people; bots fill it in and get ignored. */}
          <input
            className="chat-hp"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          />
          <p className="chat-err" role="alert">
            {error}
          </p>
          <div className="chat-send">
            <small role="status">{cooldown > 0 ? t("Please wait {n}s before sending again.", { n: cooldown }) : t("Daro replies to you there")}</small>
            <button className="btn btn-gold" type="submit" aria-disabled={sending || cooldown > 0}>
              {sending ? t("Sending…") : cooldown > 0 ? t("Wait {n}s", { n: cooldown }) : t("Send ▶")}
            </button>
          </div>
        </form>
      </section>

      <dialog
        ref={spamWarning}
        className="spam-dialog"
        aria-labelledby="chatSpamTitle"
        aria-describedby="chatSpamDescription"
        onClose={() => { blockedClicks.current = []; setWarningOpen(false); }}
      >
        <p className="spam-tag">{t("⚠ Spam protection activated")}</p>
        <h3 id="chatSpamTitle">{t("Slow down!")}</h3>
        <p id="chatSpamDescription">
          {blockedCount >= 3
            ? t("You pressed Send repeatedly while sending was locked. Extra attempts are blocked.")
            : t("Too many messages. Sending is temporarily locked.")}
        </p>
        <div className="spam-term">
          <div>{t("> Rapid-send protection .. ACTIVE")}</div>
          {guardProgress >= 25 && <div>{t("> Extra send attempts .... BLOCKED")}</div>}
          {guardProgress >= 50 && <div>{t("> Extra Telegram sends ... BLOCKED")}</div>}
          {guardProgress >= 75 && <div>{t("> Local guard check ...... {n}%", { n: guardProgress })}</div>}
          <span className="spam-bar" role="progressbar" aria-label={t("Spam protection check")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={guardProgress}>
            <i style={{ transform: `scaleX(${guardProgress / 100})` }} />
          </span>
          {guardProgress === 100
            ? <div className="spam-sent">{t("✔ Repeated sends blocked. Further messages must wait for the cooldown.")}</div>
            : <span className="spam-cursor" aria-hidden="true" />}
        </div>
        <p className="spam-timer" role="status">
          {cooldown > 0 ? t("Try again in {n}s", { n: cooldown }) : t("You can send again now.")}
        </p>
        <button className="btn btn-gold" type="button" autoFocus onClick={() => spamWarning.current?.close()}>
          {t("OK, I'll wait")}
        </button>
      </dialog>
    </>
  );
}
