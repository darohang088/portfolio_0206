import { skills } from "@/data/profile";

export default function Inventory() {
  return (
    <section className="block" id="inventory">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">Inventory</p>
          <h2>Equipped skills</h2>
        </div>
        <div className="inv" data-reveal>
          {skills.map((s) => (
            <div className="slot" key={s.name}>
              <div className="slot-name">
                <span>{s.name}</span>
                <small>LV {s.level}</small>
              </div>
              <div className="slot-kind">{s.kind}</div>
              <div className="segs" role="img" aria-label={`Level ${s.level} of 10`}>
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
