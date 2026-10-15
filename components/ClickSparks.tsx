"use client";

import { useEffect } from "react";

const COLORS = ["#f7c948", "#f27fb2", "#7fe0c8", "#6db3ff"];

// Bursts of pixel sparks wherever the visitor clicks.
export default function ClickSparks() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onDown = (e: PointerEvent) => {
      for (let k = 0; k < 8; k++) {
        const s = document.createElement("i");
        s.className = "spark";
        s.style.left = `${e.clientX - 3}px`;
        s.style.top = `${e.clientY - 3}px`;
        s.style.background = COLORS[k % COLORS.length];
        document.body.appendChild(s);
        const a = (k / 8) * Math.PI * 2;
        const d = 26 + Math.random() * 22;
        s.animate(
          [
            { transform: "translate(0,0)", opacity: 1 },
            { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`, opacity: 0 },
          ],
          { duration: 520, easing: "steps(6)" },
        ).onfinish = () => s.remove();
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  return null;
}
