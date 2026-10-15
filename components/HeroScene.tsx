"use client";

import { useEffect, useRef } from "react";
import { startScene } from "@/lib/scene";
import { startDeskScene } from "@/lib/deskScene";
import { useHeroTheme } from "@/lib/heroTheme";

// The hero background chosen from the Theme menu: the animated Phnom Penh riverside
// (lib/scene.ts), Daro at the desk (lib/deskScene.ts), or a plain picture.
export default function HeroScene() {
  const theme = useHeroTheme();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (theme.kind === "image") return;
    const cvs = ref.current;
    const host = cvs?.parentElement;
    if (!cvs || !host) return;
    return theme.kind === "desk" ? startDeskScene(cvs, host, theme.src) : startScene(cvs, host);
  }, [theme]);

  if (theme.kind === "image") {
    return <div className="hero-bg" style={{ backgroundImage: `url(${theme.src})` }} aria-hidden="true" />;
  }
  return (
    <>
      <canvas key={theme.id} ref={ref} id="scene" aria-hidden="true" />
      {theme.kind === "desk" && <div className="hero-shade" aria-hidden="true" />}
    </>
  );
}
