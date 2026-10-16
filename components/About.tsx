"use client";

import { useContent } from "@/lib/i18n/content";
import { useLang } from "@/lib/i18n";

export default function About() {
  const { profile, stats } = useContent();
  const { t, tr } = useLang();
  return (
    <section className="block intro" id="about">
      <div className="wrap">
        <div data-reveal>
          <p className="eyebrow">{t("Player profile")}</p>
          <h2>{tr("Explore {years} of Android apps people use every day", { years: <em>{t("6+ years")}</em> })}</h2>
          <p className="lede">{profile.summary}</p>
        </div>
        <div className="stats" data-reveal>
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <b data-count={s.value} data-suffix={s.suffix}>
                {s.value}
                {s.suffix}
              </b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
