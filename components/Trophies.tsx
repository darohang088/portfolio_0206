"use client";

import TrophyCard from "./TrophyCard";
import { useContent } from "@/lib/i18n/content";
import { useLang } from "@/lib/i18n";

export default function Trophies() {
  const { trophies } = useContent();
  const { t } = useLang();
  return (
    <section className="block" id="trophies">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">{t("Trophy room")}</p>
          <h2>{t("Apps I've shipped")}</h2>
        </div>
        <div className="trophies">
          {trophies.map((x, i) => (
            <TrophyCard key={i} trophy={x} />
          ))}
        </div>
      </div>
    </section>
  );
}
