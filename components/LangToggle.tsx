"use client";

import { useLang } from "@/lib/i18n";

// EN | ខ្មែរ switch next to the theme button. English is the default.
export default function LangToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label={t("Language")}>
      <button type="button" className={lang === "en" ? "on" : undefined} aria-pressed={lang === "en"} onClick={() => setLang("en")} lang="en">
        EN
      </button>
      <button type="button" className={lang === "km" ? "on" : undefined} aria-pressed={lang === "km"} onClick={() => setLang("km")} lang="km">
        ខ្មែរ
      </button>
    </div>
  );
}
