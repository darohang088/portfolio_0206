"use client";

import RoleSkills from "./RoleSkills";
import { experience as EXPERIENCE } from "@/data/profile";
import { useContent } from "@/lib/i18n/content";
import { useLang } from "@/lib/i18n";

// Longest stay fills the XP bar; others are scaled against it.
const MAX_MONTHS = Math.max(...EXPERIENCE.map((c) => c.months));

export default function QuestLog() {
  const { experience } = useContent();
  const { t } = useLang();
  return (
    <section className="block" id="quests">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">{t("Quest log")}</p>
          <h2>{t("Where I leveled up")}</h2>
        </div>
        <ol className="quests">
          {experience.map((c) => (
            <li className={`quest${c.latest ? "" : " done"}`} key={c.org} data-reveal>
              <div className="co-head">
                <img className="logo-tile co-logo" src={c.logo} alt={t("{name} logo", { name: c.org })} width={60} height={60} loading="lazy" />
                <div className="co-info">
                  <span className="co-name">{c.org}</span>
                  <span className="co-meta">{[c.employment, c.total, c.workplace].filter(Boolean).join(" · ")}</span>
                </div>
                <span className={`chip ${c.latest ? "latest" : "complete"}`}>{c.latest ? t("Latest quest") : t("Complete")}</span>
              </div>
              <ol className="roles">
                {c.roles.map((r) => (
                  <li className="role" key={r.dates}>
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
                      <div className="role-sec" key={sec.items[0]}>
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
