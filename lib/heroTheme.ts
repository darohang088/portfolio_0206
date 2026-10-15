"use client";

import { useEffect, useState } from "react";
import { DEFAULT_HERO_THEME, heroThemes, type HeroTheme } from "@/data/themes";

const KEY = "heroTheme";
const EVENT = "herotheme";

function stored(): HeroTheme {
  try {
    const id = localStorage.getItem(KEY);
    return heroThemes.find((t) => t.id === id) ?? DEFAULT_HERO_THEME;
  } catch {
    return DEFAULT_HERO_THEME;
  }
}

// Apply a hero background everywhere on the page and remember it for next visit.
export function setHeroTheme(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Storage can be blocked; the background still changes for this visit.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useHeroTheme(): HeroTheme {
  const [theme, setTheme] = useState<HeroTheme>(DEFAULT_HERO_THEME);
  useEffect(() => {
    const sync = () => setTheme(stored());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return theme;
}
