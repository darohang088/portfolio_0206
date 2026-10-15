"use client";

import { useEffect, useRef } from "react";
import { startScene } from "@/lib/scene";
import { useHeroTheme } from "@/lib/heroTheme";

// The hero background: the animated Phnom Penh riverside (drawn in lib/scene.ts),
// or a picture chosen from the Theme menu.
export default function HeroScene() {
  const theme = useHeroTheme();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (theme.kind !== "scene") return;
    const cvs = ref.current;
    const host = cvs?.parentElement;
    if (!cvs || !host) return;
    return startScene(cvs, host);
  }, [theme]);

  if (theme.kind === "image") {
    return <div className="hero-bg" style={{ backgroundImage: `url(${theme.src})` }} aria-hidden="true" />;
  }
  return <canvas ref={ref} id="scene" aria-hidden="true" />;
}
