import { quests } from "@/data/profile";

export default function QuestLog() {
  return (
    <section className="block" id="quests">
      <div className="wrap">
        <div className="head" data-reveal>
          <p className="eyebrow">Quest log</p>
          <h2>Where I leveled up</h2>
        </div>
        <ol className="quests">
          {quests.map((q) => (
            <li className={`quest${q.latest ? "" : " done"}`} key={q.role} data-reveal>
              <div className="q-top">
                <span className={`chip ${q.latest ? "latest" : "complete"}`}>
                  {q.latest ? "Latest quest" : "Complete"}
                </span>
                <span className="org">{q.org}</span>
                <span className="dates">{q.dates}</span>
              </div>
              <h3>{q.role}</h3>
              <ul>
                {q.rewards.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="qxp">
                <span>XP</span>
                <span className="bar" style={{ "--m": q.months } as React.CSSProperties}>
                  <i />
                </span>
                <span>{q.months} months</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
