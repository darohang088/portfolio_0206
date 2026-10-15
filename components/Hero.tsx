import HeroScene from "./HeroScene";
import Mascot from "./Mascot";
import TypedRoles from "./TypedRoles";
import { profile } from "@/data/profile";

function GoldWord({ word, start }: { word: string; start: number }) {
  return (
    <span className="word" aria-hidden="true">
      {[...word].map((ch, i) => (
        <span key={i} className="ch" style={{ "--i": start + i } as React.CSSProperties}>
          <span className="ch-o">{ch}</span>
          <span className="ch-f">{ch}</span>
        </span>
      ))}
    </span>
  );
}

export default function Hero() {
  return (
    <section className="hero" id="top">
      <HeroScene />
      <div className="wrap hero-inner">
        <p className="eyebrow-hero">{profile.level}</p>
        <h1 className="title" aria-label={profile.name}>
          <GoldWord word={profile.firstName} start={0} />
          <GoldWord word={profile.lastName} start={profile.firstName.length} />
        </h1>
        <TypedRoles roles={profile.roles} />
        <div className="cta-row">
          <a className="btn btn-gold" href="#quests">
            Start quest log
          </a>
          <a className="btn btn-ghost" href="#contact">
            Team up
          </a>
        </div>
      </div>
      <Mascot />
      <div className="shipped wrap">
        <span className="shipped-label">Shipped apps at</span>
        {profile.companies.map((c) => (
          <span key={c.name} className="mark">
            <img className="logo-tile" src={c.logo} alt="" width={44} height={44} />
            {c.name}
          </span>
        ))}
      </div>
    </section>
  );
}
