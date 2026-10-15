import { profile, stats } from "@/data/profile";

export default function About() {
  return (
    <section className="block intro" id="about">
      <div className="wrap">
        <div data-reveal>
          <p className="eyebrow">Player profile</p>
          <h2>
            Explore <em>6+ years</em> of Android apps people use every day
          </h2>
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
