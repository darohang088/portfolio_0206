"use client";

import { useContent } from "@/lib/i18n/content";
import { useLang } from "@/lib/i18n";

export default function SavePoints() {
  const { education } = useContent();
  const { t } = useLang();
  return (
    <section className="block" id="saves">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">{t("Save points")}</p>
          <h2>{t("Education")}</h2>
        </div>
        <div className="saves">
          {education.map((e) => (
            <div className="save" key={e.years} data-reveal>
              <img className="logo-tile logo-lg" src={e.logo} alt={t("{name} logo", { name: e.school })} width={72} height={72} loading="lazy" />
              <span className="save-tag">{e.tag}</span>
              <h3>{e.title}</h3>
              <p>{e.school}</p>
              <p className="yrs">{e.years}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
