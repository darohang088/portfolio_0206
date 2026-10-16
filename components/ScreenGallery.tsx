"use client";

import { useRef, useState } from "react";
import type { AppScreen } from "@/data/profile";
import { useLang } from "@/lib/i18n";

// A swipeable row of screenshots; tapping one opens it large.
export default function ScreenGallery({ screens }: { screens: AppScreen[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<AppScreen | null>(null);
  const { t } = useLang();

  const show = (s: AppScreen) => {
    setOpen(s);
    dialog.current?.showModal();
  };

  return (
    <>
      <div className="screens" role="list">
        {screens.map((s) => (
          <button className="shot" key={s.src} onClick={() => show(s)} role="listitem" aria-label={t("Enlarge: {alt}", { alt: s.alt })}>
            <img src={s.src} alt={s.alt} width={360} height={781} loading="lazy" />
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="lightbox"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        onClose={() => setOpen(null)}
      >
        {open && <img src={open.full} alt={open.alt} width={720} height={1562} />}
        <button className="lightbox-close" onClick={() => dialog.current?.close()} aria-label={t("Close")}>
          ✕
        </button>
      </dialog>
    </>
  );
}
