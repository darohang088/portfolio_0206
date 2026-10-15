"use client";

import { useRef } from "react";
import PixelSprite from "./PixelSprite";
import { RARITY_PAL, STAR } from "@/lib/sprites";
import type { Trophy } from "@/data/profile";

export default function TrophyCard({ trophy }: { trophy: Trophy }) {
  const ref = useRef<HTMLElement>(null);

  // 3D tilt that follows the pointer, plus a soft shine under it.
  const onMove = (e: React.PointerEvent) => {
    const c = ref.current;
    if (!c || e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    c.style.transform = `rotateX(${(0.5 - y) * 12}deg) rotateY(${(x - 0.5) * 14}deg) translateY(-4px)`;
    c.style.setProperty("--gx", `${x * 100}%`);
    c.style.setProperty("--gy", `${y * 100}%`);
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <article ref={ref} className="trophy" data-r={trophy.rarity} data-reveal onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="t-top">
        <span className="rarity">{trophy.rarity}</span>
        <PixelSprite rows={STAR} palette={RARITY_PAL[trophy.rarity]} />
      </div>
      <h3>{trophy.title}</h3>
      <p>{trophy.text}</p>
      <div className="tags">
        {trophy.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </article>
  );
}
