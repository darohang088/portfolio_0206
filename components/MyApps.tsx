import Link from "next/link";
import { apps } from "@/data/profile";

export default function MyApps() {
  return (
    <section className="block" id="apps">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">My App</p>
          <h2>Apps I&apos;m building</h2>
          <p className="lede">My own projects, outside of work. Pick one to see the details.</p>
        </div>
        <div className="apps">
          {apps.map((a) => (
            <Link className="app-card" href={`/apps/${a.slug}`} key={a.slug} data-reveal>
              <span className="app-stage">
                <img src={a.cardImage} alt={`${a.name} character`} width={160} height={160} />
              </span>
              <span className="app-body">
                <span className="app-top">
                  <span className="app-name">{a.name}</span>
                  <span className="chip soon">{a.status}</span>
                </span>
                <span className="app-tagline">{a.cardText}</span>
                <span className="read">View app ▶</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
