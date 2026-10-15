"use client";

import { useEffect } from "react";

// Animates every [data-reveal] element that starts below the fold as it scrolls in,
// and runs the count-up on any [data-count] inside it.
function countUp(el: HTMLElement) {
  const end = Number(el.dataset.count);
  const suffix = el.dataset.suffix ?? "";
  const t0 = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / 1100);
    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function Reveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("in");
          el.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().top > window.innerHeight) {
        el.classList.add("pending");
        io.observe(el);
      }
    });
    return () => io.disconnect();
  }, []);

  return null;
}
