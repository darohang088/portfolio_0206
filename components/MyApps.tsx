"use client";

import Link from "next/link";
import { useContent } from "@/lib/i18n/content";
import { useLang } from "@/lib/i18n";

export default function MyApps() {
  const { apps } = useContent();
  const { t } = useLang();
  return (
    <section className="block" id="apps">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">{t("My App")}</p>
          <h2>{t("Apps I'm building")}</h2>
          <p className="lede">{t("My own projects, outside of work. Pick one to see the details.")}</p>
        </div>
        <div className="apps">
          {apps.map((a) => (
            <Link className="app-card" href={`/apps/${a.slug}`} key={a.slug} data-reveal>
              <span className="app-stage">
                <img src={a.cardImage} alt={t("{name} character", { name: a.name })} width={160} height={160} />
              </span>
              <span className="app-body">
                <span className="app-top">
                  <span className="app-name">{a.name}</span>
                  {a.status && <span className="chip soon">{a.status}</span>}
                </span>
                <span className="app-tagline">{a.cardText}</span>
                <span className="read">{t("View app ▶")}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
