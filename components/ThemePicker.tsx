"use client";

import { useEffect, useRef, useState } from "react";
import { heroThemes } from "@/data/themes";
import { setHeroTheme, useHeroTheme } from "@/lib/heroTheme";

// "Theme" in the nav: opens a list of hero backgrounds; click one to apply it.
export default function ThemePicker({ onPick }: { onPick?: () => void }) {
  const current = useHeroTheme();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: string) => {
    setHeroTheme(id);
    setOpen(false);
    onPick?.();
    // Jump to the hero so the new background is visible right away.
    if (document.getElementById("top")) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="theme-pick" ref={box}>
      <button
        type="button"
        className={`theme-pick-btn${open ? " active" : ""}`}
        aria-expanded={open}
        aria-controls="themeMenu"
        onClick={() => setOpen((o) => !o)}
      >
        Theme
      </button>
      {open && (
        <div className="theme-menu" id="themeMenu" role="dialog" aria-label="Choose a background">
          <p className="theme-menu-title">Background</p>
          <ul>
            {heroThemes.map((t) => {
              const on = t.id === current.id;
              return (
                <li key={t.id}>
                  <button type="button" className={`theme-card${on ? " on" : ""}`} aria-pressed={on} onClick={() => pick(t.id)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.thumb} alt="" width={240} height={135} />
                    <span className="theme-name">{t.name}</span>
                    <span className="theme-state">{on ? "✓ Applied" : "Apply"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="theme-menu-more">More backgrounds coming soon.</p>
        </div>
      )}
    </div>
  );
}
