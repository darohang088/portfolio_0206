"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { currentBranch, headCommit, repoAt, run, type GitState, type Line, type Repo } from "@/lib/git/engine";
import { LEVELS, TOTAL_POINTS } from "@/lib/git/levels";
import GitDocs from "./GitDocs";

const STORE = "git-lab-v1";
const WELCOME = "\u0000welcome"; // rendered through t() so it follows the language switch
type Saved = { done: string[]; level: number };

function load(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "{}");
    return { done: Array.isArray(v.done) ? v.done : [], level: Number.isInteger(v.level) ? Math.min(Math.max(v.level, 0), LEVELS.length - 1) : 0 };
  } catch {
    return { done: [], level: 0 };
  }
}
function save(v: Saved) {
  try {
    localStorage.setItem(STORE, JSON.stringify(v));
  } catch {}
}

// Interactive Git lessons: a simulated terminal on the left, the challenge and a live commit graph on the right.
export default function GitLab() {
  const { t } = useLang();
  const [level, setLevel] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [mode, setMode] = useState<"terminal" | "visual">("terminal");
  const [tab, setTab] = useState<"challenge" | "graph" | "docs">("challenge");
  const [showHints, setShowHints] = useState(true);
  const [showStory, setShowStory] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState<boolean[]>([]);
  const [justDone, setJustDone] = useState(false);
  const [, setTick] = useState(0);
  const state = useRef<GitState | null>(null);
  const past = useRef<string[]>([]);
  const pastAt = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  const L = LEVELS[level];
  const points = LEVELS.filter((l) => done.includes(l.id)).reduce((n, l) => n + l.points, 0);

  const start = useCallback(
    (i: number) => {
      state.current = LEVELS[i].setup();
      setLines([{ text: WELCOME, kind: "info" }]);
      setChecked(LEVELS[i].objectives.map(() => false));
      setJustDone(false);
      setShowStory(false);
      setInput("");
      setTick((n) => n + 1);
    },
    [],
  );

  useEffect(() => {
    const v = load();
    setDone(v.done);
    setLevel(v.level);
    start(v.level);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goto = (i: number) => {
    setLevel(i);
    save({ done, level: i });
    start(i);
  };

  useEffect(() => {
    screenRef.current?.scrollTo({ top: screenRef.current.scrollHeight });
  }, [lines]);

  const exec = (cmd: string) => {
    const s = state.current;
    if (!s) return;
    const text = cmd.trim();
    const prompt = promptOf(s);
    if (!text) {
      setLines((l) => [...l, { text: `${prompt} `, kind: "cmd" }]);
      return;
    }
    past.current = [...past.current.filter((c) => c !== text), text];
    pastAt.current = -1;
    const res = run(s, text);
    setLines((l) => (res.clear ? [] : [...l, { text: `${prompt} ${text}`, kind: "cmd" }, ...res.lines]));
    // Objectives stay ticked once reached, so learners can look around afterwards.
    const ctx = { start: {} };
    const next = L.objectives.map((o, i) => checked[i] || o.done(s, ctx));
    setChecked(next);
    if (next.every(Boolean) && !done.includes(L.id)) {
      const d = [...done, L.id];
      setDone(d);
      save({ done: d, level });
      setJustDone(true);
    } else if (next.every(Boolean)) setJustDone(true);
    setTick((n) => n + 1);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      exec(input);
      setInput("");
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const h = past.current;
      if (!h.length) return;
      e.preventDefault();
      let i = pastAt.current < 0 ? h.length : pastAt.current;
      i = e.key === "ArrowUp" ? Math.max(0, i - 1) : i + 1;
      if (i >= h.length) {
        pastAt.current = -1;
        setInput("");
      } else {
        pastAt.current = i;
        setInput(h[i]);
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const fillCode = (code: string) => {
    setInput(code);
    inputRef.current?.focus({ preventScroll: true });
    // On phones the terminal sits above the panel, so bring it into view.
    inputRef.current?.closest(".gl-term")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const s = state.current;
  const repo = s ? repoAt(s) ?? Object.values(s.repos).at(-1) ?? null : null;
  const here = s ? repoAt(s) : null;
  const pct = Math.round((points / TOTAL_POINTS) * 100);

  const terminal = (
    <section className={`gl-term${mode === "visual" ? " small" : ""}`} onClick={(e) => (e.target as HTMLElement).closest("button,a,input") || window.getSelection()?.toString() || inputRef.current?.focus({ preventScroll: true })}>
      <header className="gl-bar">
        <span className="gl-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <b>{s?.cwd ?? "~"}</b>
        <span className="gl-icons">
          <button type="button" title={t("Show the commands")} aria-label={t("Show the commands")} onClick={() => exec("help")}>
            ?
          </button>
          <button type="button" title={t("Restart this level")} aria-label={t("Restart this level")} onClick={() => start(level)}>
            ↺
          </button>
        </span>
      </header>
      <div className="gl-screen" ref={screenRef} aria-live="polite">
        {lines.map((l, i) => (
          <div key={i} className={`gl-line k-${l.kind ?? "out"}`}>
            {l.text === WELCOME ? t("Welcome to the Git Terminal Simulator! Level {n} started. Type 'help' for help.", { n: level + 1 }) : l.text || " "}
          </div>
        ))}
      </div>
      <footer className="gl-foot">
        <span>
          {s?.cwd ?? "~"} {here ? <em>({currentBranch(here) ?? `HEAD ${headCommit(here)?.slice(0, 7)}`})</em> : <em className="none">{t("no repository")}</em>}
        </span>
      </footer>
      <div className="gl-input">
        <span aria-hidden="true">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={t("Enter a command…")}
          aria-label={t("Command")}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="send"
        />
        <button
          type="button"
          aria-label={t("Run")}
          onClick={() => {
            exec(input);
            setInput("");
            inputRef.current?.focus();
          }}
        >
          ➤
        </button>
      </div>
    </section>
  );

  return (
    <div className="gl">
      <div className="gl-top">
        <div>
          <p className="gl-crumb">
            {t("Level {n}", { n: level + 1 })} · {t(L.section)}
          </p>
          <h3 className="gl-title">{t(L.title)}</h3>
        </div>
        <span className="pj-views gl-mode">
          <button type="button" className={mode === "terminal" ? "on" : undefined} onClick={() => setMode("terminal")}>
            {t("Terminal")}
          </button>
          <button type="button" className={mode === "visual" ? "on" : undefined} onClick={() => setMode("visual")}>
            {t("Visual")}
          </button>
        </span>
      </div>

      <div className="gl-progress">
        <span>{t("Progress")}</span>
        <div className="gl-meter" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL_POINTS} aria-valuenow={points}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="gl-pts">{t("{a}/{b} points ({p}%)", { a: points, b: TOTAL_POINTS, p: pct })}</span>
        <span className="gl-coin" aria-hidden="true">
          ★
        </span>
      </div>

      <nav className="gl-levels" aria-label={t("Levels")}>
        {LEVELS.map((l, i) => (
          <button key={l.id} type="button" className={`${i === level ? "on" : ""}${done.includes(l.id) ? " done" : ""}`} onClick={() => goto(i)} title={t(l.title)}>
            {done.includes(l.id) ? "✓" : i + 1}
            {(i === 0 || LEVELS[i - 1].section !== l.section) && <small>{t(l.section)}</small>}
          </button>
        ))}
      </nav>

      <div className="gl-main">
        <div className="gl-left">
          {mode === "visual" && (
            <section className="gl-panel gl-visual">
              <header className="gl-bar">
                <b>{t("Git Graph")}</b>
              </header>
              <Graph repo={repo} big />
            </section>
          )}
          {terminal}
        </div>

        <section className="gl-panel gl-side">
          <header className="gl-tabs">
            <span className="pj-views">
              <button type="button" className={tab === "challenge" ? "on" : undefined} onClick={() => setTab("challenge")}>
                {t("Challenge")}
              </button>
              <button type="button" className={tab === "graph" ? "on" : undefined} onClick={() => setTab("graph")}>
                {t("Git Graph")}
              </button>
            </span>
            <button type="button" className={`gl-book${tab === "docs" ? " on" : ""}`} onClick={() => setTab("docs")} title={t("Git docs")} aria-label={t("Git docs")}>
              📖
            </button>
          </header>

          {tab === "docs" ? (
            <GitDocs onTry={fillCode} />
          ) : tab === "graph" ? (
            <Graph repo={repo} />
          ) : (
            <div className="gl-challenge">
              {justDone && (
                <div className="gl-win" role="status">
                  <b>
                    ★ {t("Level complete!")} <span>+{L.points}</span>
                  </b>
                  {level < LEVELS.length - 1 ? (
                    <button type="button" className="mini-tool" onClick={() => goto(level + 1)}>
                      {t("Next level")} →
                    </button>
                  ) : (
                    <p>{t("You finished every level. You can now use Git for real!")}</p>
                  )}
                </div>
              )}

              {showStory && (
                <div className="gl-story">
                  {L.story.map((p, i) => (
                    <p key={i}>{t(p)}</p>
                  ))}
                </div>
              )}

              <p className="gl-goal">{t(L.goal)}</p>

              <div>
                <b className="gl-sub">{t("Objectives:")}</b>
                <ul className="gl-objs">
                  {L.objectives.map((o, i) => (
                    <li key={i} className={checked[i] ? "ok" : undefined}>
                      <span aria-hidden="true">{checked[i] ? "✓" : ""}</span>
                      {t(o.text)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="gl-btns">
                <button type="button" className="mini-tool" onClick={() => setShowHints((v) => !v)}>
                  {showHints ? t("Hide Hints") : t("Show Hints")}
                </button>
                <button type="button" className="mini-tool" onClick={() => setShowStory((v) => !v)}>
                  {showStory ? t("Hide Story") : t("Show Story")}
                </button>
              </div>

              {showHints && (
                <div className="gl-hints">
                  <b className="gl-sub">{t("Hints")}</b>
                  <ul>
                    {L.hints.map((h, i) => (
                      <li key={i}>
                        {h.text && <span>{t(h.text)}</span>}
                        {h.code && (
                          <button type="button" className="gl-code" onClick={() => fillCode(h.code!)} title={t("Put it in the terminal")}>
                            {h.code}
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <small>{t("Tap a command to put it in the terminal, then press Enter.")}</small>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const promptOf = (s: GitState) => {
  const r = repoAt(s);
  const b = r ? currentBranch(r) : null;
  return `${s.cwd}${r ? ` (${b ?? "HEAD"})` : ""} $`;
};

const COLORS = ["var(--gold)", "var(--mint)", "var(--sky)", "var(--pink)", "var(--violet)"];
const ROW = 34;
const LANE = 22;

// A git log --graph style picture: newest commit on top, one column per line of work.
function Graph({ repo, big }: { repo: Repo | null; big?: boolean }) {
  const { t } = useLang();
  const layout = useMemo(() => {
    if (!repo) return null;
    const ids = [...repo.order].reverse();
    const lanes: (string | null)[] = [];
    const laneOf: Record<string, number> = {};
    for (const id of ids) {
      let i = lanes.indexOf(id);
      if (i < 0) {
        i = lanes.indexOf(null);
        if (i < 0) i = lanes.push(null) - 1;
      }
      laneOf[id] = i;
      for (let j = 0; j < lanes.length; j++) if (j !== i && lanes[j] === id) lanes[j] = null;
      const [first, ...rest] = repo.commits[id].parents;
      lanes[i] = first ?? null;
      for (const p of rest) {
        if (lanes.includes(p)) continue;
        const free = lanes.indexOf(null);
        if (free >= 0) lanes[free] = p;
        else lanes.push(p);
      }
    }
    const width = Math.max(1, ...Object.values(laneOf).map((n) => n + 1));
    return { ids, laneOf, width };
  }, [repo, repo?.order.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!repo) return <p className="gl-empty">{t("No repository yet. Create one with git init or git clone.")}</p>;
  if (!layout || !layout.ids.length)
    return (
      <p className="gl-empty">
        {t("No commits yet on branch {b}. Make your first commit to see it here.", { b: currentBranch(repo) ?? "main" })}
      </p>
    );

  const { ids, laneOf, width } = layout;
  const row: Record<string, number> = {};
  ids.forEach((id, i) => (row[id] = i));
  const x = (id: string) => 14 + laneOf[id] * LANE;
  const y = (id: string) => 18 + row[id] * ROW;
  const head = headCommit(repo);
  const cur = currentBranch(repo);
  const labels: Record<string, { text: string; kind: string }[]> = {};
  const add = (id: string | null | undefined, text: string, kind: string) => id && (labels[id] ??= []).push({ text, kind });
  for (const [b, id] of Object.entries(repo.branches)) add(id, b === cur ? `HEAD → ${b}` : b, b === cur ? "head" : "branch");
  if (!cur) add(head, "HEAD", "head");
  if (repo.remote) for (const [b, id] of Object.entries(repo.remote.branches)) add(id, `${repo.remote.name}/${b}`, "remote");
  const svgW = 14 + width * LANE;
  const h = ids.length * ROW + 4;

  return (
    <div className={`gl-graph${big ? " big" : ""}`}>
      <div className="gl-graph-in" style={{ minHeight: h }}>
        <svg width={svgW} height={h} aria-hidden="true">
          {ids.flatMap((id) =>
            repo.commits[id].parents.map((p, k) => {
              if (row[p] === undefined) return null;
              const cx = x(id), cy = y(id), px = x(p), py = y(p);
              let d: string;
              if (cx === px) d = `M${cx},${cy}L${px},${py}`;
              else if (k === 0 && cx > px) d = `M${cx},${cy}L${cx},${py - ROW}C${cx},${py - ROW / 2} ${px},${py - ROW / 2} ${px},${py}`;
              else d = `M${cx},${cy}C${cx},${cy + ROW / 2} ${px},${cy + ROW / 2} ${px},${cy + ROW}L${px},${py}`;
              const lane = k === 0 && cx > px ? laneOf[id] : laneOf[p];
              return <path key={`${id}-${p}`} d={d} fill="none" stroke={COLORS[lane % COLORS.length]} strokeWidth={3} />;
            }),
          )}
          {ids.map((id) => (
            <g key={id}>
              <rect x={x(id) - 7} y={y(id) - 7} width={14} height={14} fill={COLORS[laneOf[id] % COLORS.length]} stroke="var(--ink)" strokeWidth={2} />
              {id === head && <rect x={x(id) - 3} y={y(id) - 3} width={6} height={6} fill="var(--ink)" />}
            </g>
          ))}
        </svg>
        <ol className="gl-rows" style={{ marginLeft: svgW }}>
          {ids.map((id) => (
            <li key={id} style={{ height: ROW }} className={id === head ? "is-head" : undefined}>
              <code>{id.slice(0, 7)}</code>
              {(labels[id] ?? []).map((l) => (
                <i key={l.text} className={`gl-ref r-${l.kind}`}>
                  {l.text}
                </i>
              ))}
              <span>{repo.commits[id].message}</span>
            </li>
          ))}
        </ol>
      </div>
      <Legend>
        {repo.merging && <span className="gl-warn">{t("Merging: fix the conflicts, then git add and git commit.")}</span>}
        <span>
          <i className="gl-ref r-head">HEAD</i> {t("where you are now")}
        </span>
        <span>
          <i className="gl-ref r-branch">{t("branch")}</i> {t("a movable name for a commit")}
        </span>
        {repo.remote && (
          <span>
            <i className="gl-ref r-remote">origin/main</i> {t("the last known state of GitHub")}
          </span>
        )}
      </Legend>
    </div>
  );
}

const Legend = ({ children }: { children: ReactNode }) => <div className="gl-legend">{children}</div>;
