"use client";

import { useEffect, useRef, useState } from "react";
import PixelSprite from "./PixelSprite";
import ThemeToggle from "./ThemeToggle";
import { COIN, COIN_PAL } from "@/lib/sprites";
import { profile } from "@/data/profile";

const LINKS = [
  { href: "#quests", label: "Quests" },
  { href: "#trophies", label: "Trophies" },
  { href: "#apps", label: "My App" },
  { href: "#inventory", label: "Inventory" },
  { href: "#blogs", label: "Blogs" },
  { href: "#contact", label: "Contact" },
];

// On other pages (like an app's detail page) the links point back to sections of the home page.
export default function Nav({ home = true }: { home?: boolean }) {
  const base = home ? "" : "/";
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLElement>(null);

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
        <a className="brand" href={`${base}#top`} aria-label={`${profile.name}, back to top`}>
          <PixelSprite rows={COIN} palette={COIN_PAL} />
          {profile.name}
        </a>
        <ul className="links" id="links">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={`${base}${l.href}`} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="nav-actions">
          <ThemeToggle />
          <button
            className="menu-btn"
            aria-label="Open menu"
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
