"use client";

import { useLang } from "@/lib/i18n";

// Translated page heading (eyebrow, title, intro) with an optional "← All tools" link.
export default function PageHead({ eyebrow, title, lede, back }: { eyebrow: string; title: string; lede: string; back?: boolean }) {
  const { t } = useLang();
  return (
    <>
      {back && (
        <a className="back-link" href="/tools">
          {t("← All tools")}
        </a>
      )}
      <div className="head">
        <p className="eyebrow">{t(eyebrow)}</p>
        <h2>{t(title)}</h2>
        <p className="lede">{t(lede)}</p>
      </div>
    </>
  );
}
