import TrophyCard from "./TrophyCard";
import { trophies } from "@/data/profile";

export default function Trophies() {
  return (
    <section className="block" id="trophies">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">Trophy room</p>
          <h2>Apps I&apos;ve shipped</h2>
        </div>
        <div className="trophies">
          {trophies.map((t) => (
            <TrophyCard key={t.title} trophy={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
