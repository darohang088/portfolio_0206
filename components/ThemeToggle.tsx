"use client";

import { useEffect, useState } from "react";
import PixelSprite from "./PixelSprite";
import { MOON, MOON_PAL, SUN, SUN_PAL } from "@/lib/sprites";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  const t = document.documentElement.getAttribute("data-theme");
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

// Shows the sun in dark mode (switch to light) and the moon in light mode (switch to dark).
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    setTheme(currentTheme());
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setTheme(currentTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage can be blocked; the theme still applies for this visit.
    }
    setTheme(next);
    setSpin(true);
    setTimeout(() => setSpin(false), 450);
  };

  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button className={`theme-btn${spin ? " spin" : ""}`} onClick={toggle} aria-label={label} title={label}>
      {theme === "dark" ? <PixelSprite rows={SUN} palette={SUN_PAL} /> : <PixelSprite rows={MOON} palette={MOON_PAL} />}
    </button>
  );
}
