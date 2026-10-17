"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

// Pixel "↑" button in the bottom-right corner. It shows once you've scrolled down a screen
// and takes you back to the top. (The chat button lives bottom-left, so they never overlap.)
export default function BackToTop() {
  const { t } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const up = () => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  };

  return (
    <button type="button" className={`to-top${show ? " show" : ""}`} onClick={up} aria-label={t("Back to top")} title={t("Back to top")} tabIndex={show ? 0 : -1}>
      <svg viewBox="0 0 10 10" width="26" height="26" aria-hidden="true" shapeRendering="crispEdges">
        <path fill="currentColor" d="M4 1h2v1h1v1h1v1h1v2H7V5H6v4H4V5H3v1H1V4h1V3h1V2h1z" />
      </svg>
    </button>
  );
}
