"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { DOC_COMMANDS, DOC_GROUPS, DOC_UNDO, DOC_WORDS, FLOW_BRANCHES, FLOW_STEPS, type Bi } from "@/data/gitDocs";

type Section = "commands" | "words" | "undo" | "flow";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "commands", label: "Commands" },
  { id: "words", label: "Words" },
  { id: "undo", label: "Undo" },
  { id: "flow", label: "Git flow" },
];

// The 📖 tab of Learn Git: a searchable Git reference in English or Khmer.
export default function GitDocs({ onTry }: { onTry: (cmd: string) => void }) {
  const { t, lang } = useLang();
  const [section, setSection] = useState<Section>("commands");
  const [q, setQ] = useState("");
  const L = (b: Bi) => (lang === "km" ? b.km : b.en);
  const query = q.trim().toLowerCase();
  const hit = (...parts: (string | Bi | undefined)[]) =>
    !query || parts.some((p) => p && (typeof p === "string" ? p : `${p.en} ${p.km}`).toLowerCase().includes(query));

  const commands = DOC_COMMANDS.filter((c) => hit(c.cmd, c.what, c.tip, c.example));
  const words = DOC_WORDS.filter((w) => hit(w.term, w.what, w.like));
  const undo = DOC_UNDO.filter((u) => hit(u.q, u.cmd, u.how));
  // While searching, show matches from every section at once.
  const show = (s: Section) => (query ? true : section === s);

  return (
    <div className="gd">
      <input className="gd-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search, e.g. undo, branch…")} aria-label={t("Search the docs")} />
      {!query && (
        <nav className="gd-nav">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" className={section === s.id ? "on" : undefined} onClick={() => setSection(s.id)}>
              {t(s.label)}
            </button>
          ))}
        </nav>
      )}

      {show("commands") &&
        Object.entries(DOC_GROUPS).map(([g, title]) => {
          const list = commands.filter((c) => c.group === g);
          if (!list.length) return null;
          return (
            <section key={g} className="gd-group">
              <h4>{L(title)}</h4>
              {list.map((c) => (
                <article key={c.cmd} className="gd-card">
                  <header>
                    <code>{c.cmd}</code>
                    {c.tryIt ? (
                      <button type="button" className="gd-try" onClick={() => onTry(c.example)}>
                        ▶ {t("Try it")}
                      </button>
                    ) : (
                      <small className="gd-real">{t("Real Git only")}</small>
                    )}
                  </header>
                  <p>{L(c.what)}</p>
                  <pre className="gd-ex">
                    <span>$ {c.example}</span>
                    {c.output && `\n${c.output}`}
                  </pre>
                  {c.tip && <p className="gd-tip">💡 {L(c.tip)}</p>}
                </article>
              ))}
            </section>
          );
        })}

      {show("words") && words.length > 0 && (
        <section className="gd-group">
          {query && <h4>{t("Words")}</h4>}
          {words.map((w) => (
            <article key={w.term} className="gd-card gd-word">
              <header>
                <b>
                  <span aria-hidden="true">{w.icon}</span> {w.term}
                </b>
              </header>
              <p>{L(w.what)}</p>
              {w.like && <p className="gd-tip">👉 {L(w.like)}</p>}
            </article>
          ))}
        </section>
      )}

      {show("undo") && undo.length > 0 && (
        <section className="gd-group">
          <h4>{t("Oops! How do I undo…")}</h4>
          {undo.map((u) => (
            <details key={u.cmd} className="gd-card gd-undo" open={!!query}>
              <summary>{L(u.q)}</summary>
              <pre className="gd-ex">{u.cmd.split("\n").map((l) => `$ ${l}`).join("\n")}</pre>
              <p>{L(u.how)}</p>
              {u.careful && <p className="gd-warn">⚠️ {L(u.careful)}</p>}
            </details>
          ))}
        </section>
      )}

      {show("flow") && !query && <Flow L={L} />}

      {query && !commands.length && !words.length && !undo.length && <p className="gl-empty">{t("Nothing found. Try another word.")}</p>}
    </div>
  );
}

function Flow({ L }: { L: (b: Bi) => string }) {
  const { t } = useLang();
  // Lanes top to bottom: hotfix, main, release, develop, feature. x = time.
  const y = { hotfix: 18, main: 50, release: 82, develop: 114, feature: 146 };
  const c = { main: "var(--gold)", develop: "var(--sky)", feature: "var(--mint)", release: "var(--violet)", hotfix: "var(--pink)" };
  const dot = (x: number, lane: keyof typeof y) => <rect key={`${lane}${x}`} x={x - 6} y={y[lane] - 6} width={12} height={12} fill={c[lane]} stroke="var(--ink)" strokeWidth={2} />;
  const link = (x1: number, a: keyof typeof y, x2: number, b: keyof typeof y) => (
    <path key={`${a}${x1}${b}${x2}`} d={`M${x1},${y[a]} C${(x1 + x2) / 2},${y[a]} ${(x1 + x2) / 2},${y[b]} ${x2},${y[b]}`} fill="none" stroke={c[a === "main" || a === "develop" ? b : a]} strokeWidth={3} />
  );
  return (
    <section className="gd-group">
      <p className="gd-lead">{t("Git flow is a common way for teams to organise branches, so main always works and releases are calm.")}</p>
      <div className="gd-flow">
        <svg viewBox="0 0 330 164" role="img" aria-label={t("Git flow diagram")}>
          {(Object.keys(y) as (keyof typeof y)[]).map((k) => (
            <text key={k} x={0} y={y[k] + 4} fontSize={10} fill="var(--muted)" fontFamily="ui-monospace,monospace">
              {k}
            </text>
          ))}
          <line x1={58} y1={y.main} x2={322} y2={y.main} stroke={c.main} strokeWidth={3} />
          <line x1={78} y1={y.develop} x2={322} y2={y.develop} stroke={c.develop} strokeWidth={3} />
          {link(64, "main", 84, "develop")}
          {link(100, "develop", 120, "feature")}
          <line x1={120} y1={y.feature} x2={160} y2={y.feature} stroke={c.feature} strokeWidth={3} />
          {link(160, "feature", 180, "develop")}
          {link(190, "develop", 210, "release")}
          <line x1={210} y1={y.release} x2={236} y2={y.release} stroke={c.release} strokeWidth={3} />
          {link(236, "release", 256, "main")}
          {link(236, "release", 256, "develop")}
          {link(264, "main", 284, "hotfix")}
          {link(284, "hotfix", 306, "main")}
          {link(284, "hotfix", 306, "develop")}
          {[64, 256, 306].map((x) => dot(x, "main"))}
          {[84, 100, 180, 190, 256, 306].map((x) => dot(x, "develop"))}
          {[120, 140, 160].map((x) => dot(x, "feature"))}
          {[210, 236].map((x) => dot(x, "release"))}
          {dot(284, "hotfix")}
          <text x={256} y={y.main - 10} fontSize={9} textAnchor="middle" fill="var(--gold-text)" fontFamily="ui-monospace,monospace">
            v1.0
          </text>
          <text x={306} y={y.main - 10} fontSize={9} textAnchor="middle" fill="var(--gold-text)" fontFamily="ui-monospace,monospace">
            v1.0.1
          </text>
        </svg>
      </div>
      <ul className="gd-branches">
        {FLOW_BRANCHES.map((b) => (
          <li key={b.name}>
            <i style={{ background: b.color }} />
            <code>{b.name}</code>
            <span>{L(b.what)}</span>
          </li>
        ))}
      </ul>
      <h4>{t("Step by step")}</h4>
      <ol className="gd-steps">
        {FLOW_STEPS.map((s, i) => (
          <li key={i}>
            <b>{L(s.title)}</b>
            <pre className="gd-ex">{s.cmds.split("\n").map((l) => `$ ${l}`).join("\n")}</pre>
          </li>
        ))}
      </ol>
      <p className="gd-tip">💡 {t("Small team or solo? Many teams skip develop and use GitHub flow: make a feature branch from main, open a Pull Request, then merge into main.")}</p>
    </section>
  );
}
