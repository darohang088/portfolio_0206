"use client";

import Link from "next/link";
import ScreenGallery from "./ScreenGallery";
import type { AppItem } from "@/data/profile";
import { useContent } from "@/lib/i18n/content";
import { useLang } from "@/lib/i18n";

export default function AppDetail({ app: base }: { app: AppItem }) {
  const { apps } = useContent();
  const { t } = useLang();
  const app = apps.find((a) => a.slug === base.slug) ?? base;
  return (
    <main className="app-page">
      <section className="block app-detail">
        <div className="wrap">
          <Link className="back" href="/#apps">
            {t("◀ Back to My App")}
          </Link>
          <div className="app-hero">
            <div className="app-hero-stage" aria-hidden="true">
              <img className="app-hero-img" src={app.image} alt="" width={420} height={420} />
              <span className="app-hero-shadow" />
            </div>
            <div className="app-hero-text">
              <p className="eyebrow">{t("My App")}</p>
              <h1 className="app-title" style={{ "--len": app.name.length } as React.CSSProperties}>
                {app.name}
              </h1>
              {app.localName && (
                <p className="app-local">
                  <span lang="km">{app.localName}</span>
                  {app.meaning && <span> · “{app.meaning}”</span>}
                </p>
              )}
              <p className="app-hero-tagline">{app.tagline}</p>
              {app.status && <span className="chip soon">{app.status}</span>}
            </div>
          </div>

          <div className="app-info">
            <div className="app-about">
              <h2>{t("About {name}", { name: app.name })}</h2>
              {app.description.map((p, i) => (
                <p className="lede" key={i}>
                  {p}
                </p>
              ))}
              {app.links && app.links.length > 0 && (
                <div className="cta-row app-links">
                  {app.links.map((l) => (
                    <a className="btn btn-gold" href={l.url} key={l.url} target="_blank" rel="noopener noreferrer">
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <dl className="app-facts">
              {app.facts.map((f, i) => (
                <div key={i}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {app.screens.length > 0 && (
            <div className="app-block">
              <h2>{t("Screens")}</h2>
              <ScreenGallery screens={app.screens} />
            </div>
          )}

          {app.features.length > 0 && (
            <div className="app-block">
              <h2>{t("What you can do")}</h2>
              <div className="features">
                {app.features.map((f, i) => (
                  <div className="feature" key={i}>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
