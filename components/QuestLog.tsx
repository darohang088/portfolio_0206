import RoleSkills from "./RoleSkills";
import { experience } from "@/data/profile";

// Longest stay fills the XP bar; others are scaled against it.
const MAX_MONTHS = Math.max(...experience.map((c) => c.months));

export default function QuestLog() {
  return (
    <section className="block" id="quests">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">Quest log</p>
          <h2>Where I leveled up</h2>
        </div>
        <ol className="quests">
          {experience.map((c) => (
            <li className={`quest${c.latest ? "" : " done"}`} key={c.org} data-reveal>
              <div className="co-head">
                <img className="logo-tile co-logo" src={c.logo} alt={`${c.org} logo`} width={60} height={60} loading="lazy" />
                <div className="co-info">
                  <span className="co-name">{c.org}</span>
                  <span className="co-meta">{[c.employment, c.total, c.workplace].filter(Boolean).join(" · ")}</span>
                </div>
                <span className={`chip ${c.latest ? "latest" : "complete"}`}>{c.latest ? "Latest quest" : "Complete"}</span>
              </div>
              <ol className="roles">
                {c.roles.map((r) => (
                  <li className="role" key={r.title}>
                    <h3>{r.title}</h3>
                    <p className="role-meta">
                      {r.dates} · {r.duration}
                      {r.location && <span className="role-loc">{r.location}</span>}
                    </p>
                    {r.summary && <p className="role-summary">{r.summary}</p>}
                    {r.rewards && (
                      <ul>
                        {r.rewards.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    )}
                    {r.sections?.map((sec) => (
                      <div className="role-sec" key={sec.title}>
                        <h4>{sec.title}</h4>
                        <ul>
                          {sec.items.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {r.skills && <RoleSkills skills={r.skills} total={r.skillTotal} />}
                  </li>
                ))}
              </ol>
              <div className="qxp">
                <span>XP</span>
                <span className="bar" style={{ "--m": c.months / MAX_MONTHS } as React.CSSProperties}>
                  <i />
                </span>
                <span>{c.total}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
