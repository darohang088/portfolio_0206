"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { COVERAGE, HABITS, HOW_TO, INTRO, PHASES, ROADMAP_SLUG, type Bi } from "@/data/roadmap";

const STORE = `roadmap-${ROADMAP_SLUG}`;
const ALL = PHASES.flatMap((p) => p.months.flatMap((m) => m.tasks.map((_, i) => `${m.n}.${i}`)));

// Blog post: one-year roadmap to Senior Officer, IT Native Mobile Development, with tickable tasks.
export default function RoadmapPost() {
  const { t, lang } = useLang();
  const L = (b: Bi) => (lang === "km" ? b.km : b.en);
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) || "[]");
      if (Array.isArray(v)) setDone(new Set(v.filter((x) => ALL.includes(x))));
    } catch {}
  }, []);

  const toggle = (id: string) =>
    setDone((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      try {
        localStorage.setItem(STORE, JSON.stringify([...n]));
      } catch {}
      return n;
    });

  const pct = Math.round((done.size / ALL.length) * 100);

  // Scroll to a month (below the sticky nav and progress bar) and flash it so the eye finds it.
  const goMonth = (n: number) => {
    const el = document.getElementById(`m-${n}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.remove("flash");
    void el.offsetWidth; // restart the animation when the same month is clicked twice
    el.classList.add("flash");
  };
  const monthDone = (n: number, count: number) => Array.from({ length: count }, (_, i) => done.has(`${n}.${i}`)).every(Boolean);

  return (
    <article className="rm">
      <a className="back-link" href="/#blogs">
        {t("← All posts")}
      </a>
      <header className="head rm-head">
        <p className="eyebrow">{t("Blogs · Career roadmap")}</p>
        <h1>{t("Senior Officer, IT Native Mobile Development")}</h1>
        <p className="lede">{t("The route to becoming an experienced Senior Officer, IT Native Mobile Development: leading the Native Mobile Unit and taking end-to-end technical ownership of Android and iOS apps.")}</p>
        <p className="rm-meta">
          <span>📅 {t("12 months")}</span>
          <span>🧭 {t("4 phases")}</span>
          <span>✅ {t("{n} tasks", { n: ALL.length })}</span>
          <span>✍️ Hang Daro</span>
        </p>
      </header>

      <div className="rm-progress" role="group" aria-label={t("Your progress")}>
        <span>{t("Your progress")}</span>
        <div className="gl-meter" role="progressbar" aria-valuemin={0} aria-valuemax={ALL.length} aria-valuenow={done.size}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <b>
          {done.size}/{ALL.length} · {pct}%
        </b>
      </div>

      <section className="rm-intro">
        {INTRO.map((p, i) => (
          <p key={i}>{L(p)}</p>
        ))}
        <div className="rm-box">
          <b>{t("How to use this plan")}</b>
          <ul>
            {HOW_TO.map((h, i) => (
              <li key={i}>{L(h)}</li>
            ))}
          </ul>
        </div>
      </section>

      <nav className="rm-jump" aria-label={t("Months")}>
        {PHASES.flatMap((p) => p.months).map((m) => (
          <button key={m.n} type="button" onClick={() => goMonth(m.n)} className={monthDone(m.n, m.tasks.length) ? "done" : undefined} title={L(m.title)} aria-label={`${t("Month")} ${m.n}: ${L(m.title)}`}>
            {monthDone(m.n, m.tasks.length) ? "✓" : m.n}
          </button>
        ))}
      </nav>

      {PHASES.map((p, pi) => (
        <section key={pi} className={`rm-phase ph-${pi + 1}`}>
          <h2>{L(p.title)}</h2>
          <ol className="rm-months">
            {p.months.map((m) => (
              <li key={m.n} id={`m-${m.n}`} className={`rm-month${monthDone(m.n, m.tasks.length) ? " done" : ""}`}>
                <div className="rm-badge" aria-hidden="true">
                  <small>{t("Month")}</small>
                  <b>{m.n}</b>
                </div>
                <div className="rm-body">
                  <h3>{L(m.title)}</h3>
                  <p className="rm-goal">🎯 {L(m.goal)}</p>
                  <div className="rm-learn">
                    <b>{t("Learn")}</b>
                    <p>
                      {m.learn.map((x) => (
                        <i key={x}>{x}</i>
                      ))}
                    </p>
                  </div>
                  <div className="rm-tasks">
                    <b>{t("Do")}</b>
                    {m.tasks.map((task, i) => {
                      const id = `${m.n}.${i}`;
                      return (
                        <label key={id} className={done.has(id) ? "on" : undefined}>
                          <input type="checkbox" checked={done.has(id)} onChange={() => toggle(id)} />
                          <span>{L(task)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="rm-proof">
                    <b>🏆 {t("Proof for your interview:")}</b> {L(m.proof)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <section className="rm-phase">
        <h2>{t("Does the plan cover the whole job post?")}</h2>
        <div className="rm-cover">
          {COVERAGE.map((c, i) => (
            <div key={i}>
              <span>{L(c.req)}</span>
              <span className="rm-chips">
                {c.months.map((n) => (
                  <button key={n} type="button" onClick={() => goMonth(n)}>
                    {t("M{n}", { n })}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rm-phase">
        <h2>{t("Habits for the whole year")}</h2>
        <ul className="rm-habits">
          {HABITS.map((h, i) => (
            <li key={i}>{L(h)}</li>
          ))}
        </ul>
        <p className="rm-end">{t("One last tip: Flutter or React Native is a bonus, but this role wants real Kotlin and Swift. Keep both native platforms at the centre of everything you build this year.")}</p>
      </section>
    </article>
  );
}
