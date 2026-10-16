"use client";

import { useEffect, useRef, useState } from "react";
import ThemeCanvas from "./ThemeCanvas";
import { heroThemes } from "@/data/themes";
import { setHeroTheme, useHeroTheme } from "@/lib/heroTheme";
import { useLang } from "@/lib/i18n";

// The Theme page: pick a background to preview it live, then Apply it to the home page.
export default function ThemeGallery() {
  const { t } = useLang();
  const applied = useHeroTheme();
  const [picked, setPicked] = useState(applied.id);
  const [justApplied, setJustApplied] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  // Start on the background that's already applied.
  useEffect(() => setPicked(applied.id), [applied.id]);

  const theme = heroThemes.find((t) => t.id === picked) ?? applied;
  const isApplied = theme.id === applied.id;

  const apply = () => {
    setHeroTheme(theme.id);
    setJustApplied(true);
  };

  return (
    <div className="theme-gallery">
      <div className="theme-main">
        <div className="theme-stage" ref={stage}>
          <ThemeCanvas theme={theme} />
          <span className="theme-stage-tag">{t("Preview · {name}", { name: t(theme.name) })}</span>
        </div>

        <div className="theme-actions">
          <button
            className="btn btn-gold"
            type="button"
            onClick={apply}
            disabled={isApplied}
          >
            {isApplied ? t("✓ Applied") : t("Apply background")}
          </button>
          {justApplied && isApplied && (
            <a className="btn btn-ghost" href="/">
              {t("See it on home →")}
            </a>
          )}
        </div>
      </div>

      <ul className="theme-grid">
        {heroThemes.map((th) => (
          <li key={th.id}>
            <button
              type="button"
              className={`theme-card${th.id === picked ? " on" : ""}`}
              aria-pressed={th.id === picked}
              onClick={() => {
                setPicked(th.id);
                setJustApplied(false);
                // On small screens the preview can be off-screen; bring it back into view.
                const top = stage.current?.getBoundingClientRect().top ?? 0;
                if (top < 0)
                  stage.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={th.thumb} alt="" width={480} height={270} />
              <span className="theme-name">{t(th.name)}</span>
              <span className="theme-state">
                {th.id === applied.id
                  ? t("✓ In use")
                  : th.id === picked
                    ? t("Previewing")
                    : t("Preview")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
