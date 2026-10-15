import Link from "next/link";
import type { AppItem } from "@/data/profile";

export default function AppDetail({ app }: { app: AppItem }) {
  return (
    <main className="app-page">
      <section className="block app-detail">
        <div className="wrap">
          <Link className="back" href="/#apps">
            ◀ Back to My App
          </Link>
          <div className="app-hero">
            <div className="app-hero-stage" aria-hidden="true">
              <img className="app-hero-img" src={app.image} alt="" width={420} height={420} />
              <span className="app-hero-shadow" />
            </div>
            <div className="app-hero-text">
              <p className="eyebrow">My App</p>
              <h1 className="app-title">{app.name}</h1>
              <p className="app-hero-tagline">{app.tagline}</p>
              <span className="chip soon">{app.status}</span>
            </div>
          </div>
          <div className="app-info">
            <div className="app-about">
              <h2>About {app.name}</h2>
              {app.description.map((p) => (
                <p className="lede" key={p}>
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
              {app.facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </main>
  );
}
