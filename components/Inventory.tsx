"use client";

import { useContent } from "@/lib/i18n/content";
import { useLang } from "@/lib/i18n";

export default function Inventory() {
  const { skills } = useContent();
  const { t } = useLang();
  return (
    <section className="block" id="inventory">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">{t("Inventory")}</p>
          <h2>{t("Equipped skills")}</h2>
        </div>
        <div className="inv" data-reveal>
          {skills.map((s) => (
            <div className="slot" key={s.level + s.kind + s.name}>
              <div className="slot-name">
                <span>{s.name}</span>
                <small>LV {s.level}</small>
              </div>
              <div className="slot-kind">{s.kind}</div>
              <div className="segs" role="img" aria-label={t("Level {n} of 10", { n: s.level })}>
                {Array.from({ length: 10 }, (_, i) => (
                  <i key={i} className={`seg${i < s.level ? " on" : ""}`} style={{ "--s": i } as React.CSSProperties} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
