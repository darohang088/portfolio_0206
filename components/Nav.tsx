"use client";

import { useEffect, useState } from "react";
import PixelSprite from "./PixelSprite";
import ThemeToggle from "./ThemeToggle";
import { COIN, COIN_PAL } from "@/lib/sprites";
import { profile } from "@/data/profile";

const LINKS = [
  { href: "#quests", label: "Quests" },
  { href: "#trophies", label: "Trophies" },
  { href: "#inventory", label: "Inventory" },
  { href: "#blogs", label: "Blogs" },
  { href: "#contact", label: "Contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      setProgress(Math.min(1, h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav${open ? " open" : ""}`}>
      <div className="wrap nav-row">
        <a className="brand" href="#top" aria-label={`${profile.name}, back to top`}>
          <PixelSprite rows={COIN} palette={COIN_PAL} />
          {profile.name}
        </a>
        <ul className="links" id="links">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)}>
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
        <i style={{ width: `${progress * 100}%` }} />
      </div>
    </header>
  );
}
