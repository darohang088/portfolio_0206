"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BlinkingPhone from "./BlinkingPhone";
import PixelSprite from "./PixelSprite";
import { BUBBLE, BUBBLE_PAL } from "@/lib/sprites";
import { apps, profile } from "@/data/profile";

type Msg = { id: number; who: "bot" | "me"; text: string };
type Field = "name" | "email" | "message";

const EMAIL = /^\S+@\S+\.\S+$/;
const TELEGRAM = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/;
// Where Daro's reply will go, in words the visitor recognises.
const replyWhere = (c: string) => (EMAIL.test(c) ? `by email to ${c}` : `on Telegram to @${c.replace(/^@/, "")}`);

const HIRING = "Hi Daro, I'm hiring for an Android / Flutter role and would like to talk. ";

// Floating message button (bottom-left) with a chat-style panel.
// Messages are sent to /api/message, which forwards them to Daro's Telegram.
export default function ChatWidget() {
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
    await botSay("Hi! I'm Dororo. Leave a message and Daro will reply to you.", 500);
    setShowChips(true);
  };

  const closeChat = useCallback(() => {
    setOpen(false);
    fab.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeChat();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !fab.current?.contains(t)) closeChat();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, closeChat]);

  const copyEmail = () => {
    const done = () => botSay(`Copied ${profile.email} to your clipboard.`, 350);
    const fallback = () => botSay(`Daro's email is ${profile.email}`, 350);
    try {
      navigator.clipboard.writeText(profile.email).then(done, fallback);
    } catch {
      fallback();
    }
  };

  const hiring = () => {
    setForm((f) => ({ ...f, message: HIRING }));
    setTimeout(() => {
      const el = msgInput.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const bad: Field[] = [];
    if (!form.name.trim()) bad.push("name");
    const contact = form.email.trim();
    if (!EMAIL.test(contact) && !TELEGRAM.test(contact)) bad.push("email");
    if (form.message.trim().length < 2) bad.push("message");
    setInvalid(bad);
    if (bad.length) {
      setError(bad[0] === "email" ? "Add an email or Telegram @username so Daro can reply." : "Please fill in your name and a message.");
      return;
    }
    setError("");
    const text = form.message.trim();
    const first = form.name.trim().split(" ")[0];
    add("me", text);
    setSending(true);
    try {
      const res = await fetch("/api/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, interests, startedAt: startedAt.current }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !data.ok) throw new Error("not sent");
      setForm((f) => ({ ...f, message: "" }));
      await botSay(`Sent! Thanks, ${first}. Daro will reply ${replyWhere(contact)}.`, 700);
    } catch {
      await botSay(`Sorry, that didn't send. Please email Daro at ${profile.email} instead.`, 500);
    } finally {
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
        aria-label="Message Daro"
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
            <span>Usually replies within a day</span>
          </div>
          <button className="chat-x" type="button" aria-label="Close messages" onClick={closeChat}>
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
            <div className="msg bot typing" aria-label="Dororo is typing">
              <i />
              <i />
              <i />
            </div>
          )}
          {showChips && (
            <div className="chips">
              <button className="chip-btn" type="button" onClick={copyEmail}>
                Copy email
              </button>
              <a className="chip-btn" href={profile.linkedin.url} target="_blank" rel="noopener noreferrer">
                LinkedIn ↗
              </a>
              <button className="chip-btn" type="button" onClick={hiring}>
                I&apos;m hiring
              </button>
            </div>
          )}
        </div>

        <form className="chat-form" onSubmit={submit} noValidate>
          <div className="chat-row">
            <input ref={nameInput} id="chatName" type="text" placeholder="Your name" autoComplete="name" aria-label="Your name" maxLength={80} {...field("name")} />
            <input id="chatEmail" type="text" inputMode="email" placeholder="Email or Telegram @username" autoComplete="email" aria-label="Email or Telegram username, for Daro's reply" maxLength={120} {...field("email")} />
          </div>
          <div className="chat-interest" role="group" aria-labelledby="interestLabel">
            <span className="chat-interest-label" id="interestLabel">
              Interested in <small>(optional)</small>
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
          <textarea ref={msgInput} id="chatMsg" placeholder="Write your message…" aria-label="Message" maxLength={2000} {...field("message")} />
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
            <small>Daro replies to you there</small>
            <button className="btn btn-gold" type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send ▶"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
