"use client";

import { useEffect, useRef } from "react";
import type { HeroTheme } from "@/data/themes";
import { startScene } from "@/lib/scene";
import { startDeskScene } from "@/lib/deskScene";
import { startRoomScene } from "@/lib/roomScene";

// Plays one background inside its parent box (which must be position:relative):
// the animated Phnom Penh riverside (lib/scene.ts), Daro at the desk (lib/deskScene.ts),
// the game room (lib/roomScene.ts), or a plain picture.
export default function ThemeCanvas({ theme }: { theme: HeroTheme }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (theme.kind === "image") return;
    const cvs = ref.current;
    const host = cvs?.parentElement;
    if (!cvs || !host) return;
    if (theme.kind === "desk") return startDeskScene(cvs, host, theme.src);
    if (theme.kind === "room") return startRoomScene(cvs, host, theme.src);
    return startScene(cvs, host);
  }, [theme]);

  if (theme.kind === "image") {
    return <div className="hero-bg" style={{ backgroundImage: `url(${theme.src})` }} aria-hidden="true" />;
  }
  return (
    <>
      <canvas key={theme.id} ref={ref} className="scene-canvas" aria-hidden="true" />
      {theme.kind !== "scene" && <div className={`hero-shade ${theme.kind}`} aria-hidden="true" />}
    </>
  );
}
