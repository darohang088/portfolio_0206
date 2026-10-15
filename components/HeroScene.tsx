"use client";

import { useEffect, useRef } from "react";
import { startScene } from "@/lib/scene";

// The animated Phnom Penh riverside behind the hero (drawing code lives in lib/scene.ts).
export default function HeroScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    const host = cvs?.parentElement;
    if (!cvs || !host) return;
    return startScene(cvs, host);
  }, []);

  return <canvas ref={ref} id="scene" aria-hidden="true" />;
}
