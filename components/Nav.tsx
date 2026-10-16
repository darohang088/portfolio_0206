"use client";

import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import LangToggle from "./LangToggle";
import { useLang } from "@/lib/i18n";
import { profile } from "@/data/profile";

const LINKS: { href: string; label: string; page?: boolean }[] = [
  { href: "#quests", label: "Quests" },
  { href: "#trophies", label: "Trophies" },
  { href: "#apps", label: "My App" },
  { href: "#inventory", label: "Inventory" },
  { href: "#blogs", label: "Blogs" },
  { href: "#contact", label: "Contact" },
  { href: "/tools", label: "Tools", page: true },
  { href: "/theme", label: "Theme", page: true },
];

// On other pages (like an app's detail page) the links point back to sections of the home page.
export default function Nav({ home = true }: { home?: boolean }) {
  const { t } = useLang();
  const base = home ? "" : "/";
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("");
  const bar = useRef<HTMLElement>(null);
  const lockUntil = useRef(0);

  // Highlight the link for the page or section you're on: Test on /test, My App on an
  // app's page, and on the home page whichever section has scrolled under the nav.
  useEffect(() => {
    const path = window.location.pathname;
    // Tools and every tool inside it light up "Tools".
    if (/^\/(tools|test|apk|apk-diff|khqr|qr|fingerprint|permissions|json|share)(\/|$)/.test(path)) return setActive("/tools");
    if (path.startsWith("/theme")) return setActive("/theme");
    if (path.startsWith("/apps")) return setActive("#apps");
    const ids = LINKS.filter((l) => !l.page).map((l) => l.href);
    let frame = 0;
    const spy = () => {
      frame = 0;
      if (Date.now() < lockUntil.current) return;
      let cur = "";
      for (const id of ids) {
        const el = document.querySelector(id);
        if (el && el.getBoundingClientRect().top <= 140) cur = id;
      }
      const h = document.documentElement;
      if (h.scrollTop + h.clientHeight >= h.scrollHeight - 4) cur = ids[ids.length - 1];
      setActive(cur);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(spy);
    };
    spy();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Update the XP bar once per frame on the compositor, without re-rendering the nav.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const h = document.documentElement;
      const p = Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className={`nav${open ? " open" : ""}`}>
      <div className="wrap nav-row">
        <a className="brand" href={`${base}#top`} aria-label={t("{name}, back to top", { name: profile.name })}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="avatar" src="/daro-avatar.png" alt="" width={40} height={40} />
          {profile.name}
        </a>
        <ul className="links" id="links">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.page ? l.href : `${base}${l.href}`}
                className={active === l.href ? "active" : undefined}
                aria-current={active === l.href ? (l.page ? "page" : "location") : undefined}
                onClick={() => {
                  setOpen(false);
                  setActive(l.href);
                  // Keep the clicked link lit while the page smooth-scrolls past other sections.
                  lockUntil.current = Date.now() + 1200;
                }}
              >
                {t(l.label)}
              </a>
            </li>
          ))}
        </ul>
        <div className="nav-actions">
          <LangToggle />
          <ThemeToggle />
          <button
            className="menu-btn"
            aria-label={t("Open menu")}
            aria-expanded={open}
            aria-controls="links"
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <div className="xp" aria-hidden="true">
        <i ref={bar} />
      </div>
    </header>
  );
}
