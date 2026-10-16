"use client";

import ThemeCanvas from "./ThemeCanvas";
import { useHeroTheme } from "@/lib/heroTheme";

// The hero background, as chosen on the Theme page.
export default function HeroScene() {
  return <ThemeCanvas theme={useHeroTheme()} />;
}
