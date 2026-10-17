// A small simulated Git for the Git learning tool. Everything happens in memory in the browser:
// a tiny file system with folders and text files, and repositories with commits, branches,
// HEAD, the staging area, merges (fast-forward, merge commits and conflicts), clone and remotes.
// Output is written to look like real Git so learners see what they'll see on their own computer.

export type Tree = Record<string, string>; // file path (inside the repo) → content
export type Commit = { id: string; message: string; parents: string[]; tree: Tree; branch: string; time: number };
export type Repo = {
  path: string; // folder of the repo, e.g. "~/project"
  commits: Record<string, Commit>;
  order: string[]; // commit ids in creation order
  branches: Record<string, string | null>; // branch → commit id (null before the first commit)
  head: { branch: string } | { detached: string };
  index: Tree; // staging area
  remote?: { name: string; url: string; branches: Record<string, string> };
  merging?: { other: string; otherName: string; conflicts: string[] };
};
export type Fs = { dirs: Set<string>; files: Record<string, string> }; // absolute paths like "~/project/a.txt"
export type GitState = { cwd: string; fs: Fs; repos: Record<string, Repo>; tick: number; history: string[] };
export type Line = { text: string; kind?: "out" | "err" | "ok" | "info" | "cmd" };
export type Result = { lines: Line[]; clear?: boolean };

export function createState(setup?: (s: GitState) => void): GitState {
  const s: GitState = { cwd: "~", fs: { dirs: new Set(["~"]), files: {} }, repos: {}, tick: 0, history: [] };
  setup?.(s);
  return s;
}

// ---------- paths ----------
const join = (a: string, b: string) => (b.startsWith("~") ? b : `${a}/${b}`);
export function resolve(cwd: string, p: string): string {
  const parts: string[] = [];
  for (const seg of join(cwd, p).split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (parts.length > 1) parts.pop();
    } else parts.push(seg);
  }
  return parts.join("/") || "~";
}
const parent = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "~");
const base = (p: string) => p.slice(p.lastIndexOf("/") + 1);

// The repository that contains a folder (the nearest one going up).
export function repoAt(s: GitState, dir = s.cwd): Repo | null {
  let d = dir;
  for (;;) {
    if (s.repos[d]) return s.repos[d];
    if (d === "~" || !d.includes("/")) return null;
    d = parent(d);
  }
}

// Working tree of a repo: its files, keyed by path inside the repo.
export function workTree(s: GitState, r: Repo): Tree {
  const out: Tree = {};
  for (const [p, c] of Object.entries(s.fs.files)) if (p.startsWith(r.path + "/")) out[p.slice(r.path.length + 1)] = c;
  return out;
}
function setWorkTree(s: GitState, r: Repo, tree: Tree) {
  for (const p of Object.keys(s.fs.files)) if (p.startsWith(r.path + "/")) delete s.fs.files[p];
  for (const [p, c] of Object.entries(tree)) writeFile(s, `${r.path}/${p}`, c);
}
function writeFile(s: GitState, abs: string, content: string) {
  let d = parent(abs);
  while (!s.fs.dirs.has(d)) {
    s.fs.dirs.add(d);
    d = parent(d);
  }
  s.fs.files[abs] = content;
}

// ---------- git helpers ----------
export const headCommit = (r: Repo): string | null => ("branch" in r.head ? r.branches[r.head.branch] : r.head.detached);
export const currentBranch = (r: Repo) => ("branch" in r.head ? r.head.branch : null);
const short = (id: string) => id.slice(0, 7);

function newId(s: GitState, seed: string) {
  let h = 2166136261 ^ s.tick;
  for (const ch of seed + s.tick) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const a = (h >>> 0).toString(16).padStart(8, "0");
  let g = h;
  for (const ch of a) g = Math.imul(g ^ ch.charCodeAt(0), 2246822519);
  return (a + (g >>> 0).toString(16).padStart(8, "0") + "0000000000000000000000").slice(0, 40);
}

function addCommit(s: GitState, r: Repo, message: string, parents: string[], tree: Tree, branch: string) {
  s.tick++;
  const id = newId(s, message + parents.join(""));
  r.commits[id] = { id, message, parents, tree: { ...tree }, branch, time: s.tick };
  r.order.push(id);
  return id;
}

function treeOf(r: Repo, id: string | null): Tree {
  return id ? r.commits[id].tree : {};
}

// Is `a` an ancestor of (or equal to) `b`?
export function isAncestor(r: Repo, a: string, b: string): boolean {
  const seen = new Set<string>();
  const stack = [b];
  while (stack.length) {
    const c = stack.pop()!;
    if (c === a) return true;
    if (seen.has(c)) continue;
    seen.add(c);
    stack.push(...r.commits[c].parents);
  }
  return false;
}
function mergeBase(r: Repo, a: string, b: string): string | null {
  const anc = new Set<string>();
  const stack = [a];
  while (stack.length) {
    const c = stack.pop()!;
    if (anc.has(c)) continue;
    anc.add(c);
    stack.push(...r.commits[c].parents);
  }
  const queue = [b];
  const seen = new Set<string>();
  while (queue.length) {
    const c = queue.shift()!;
    if (anc.has(c)) return c;
    if (seen.has(c)) continue;
    seen.add(c);
    queue.push(...r.commits[c].parents);
  }
  return null;
}

// Changes between HEAD, the index and the working tree.
export function statusOf(s: GitState, r: Repo) {
  const head = treeOf(r, headCommit(r));
  const work = workTree(s, r);
  const staged: [string, string][] = [];
  const unstaged: [string, string][] = [];
  const untracked: string[] = [];
  for (const p of new Set([...Object.keys(head), ...Object.keys(r.index)]))
    if (head[p] !== r.index[p]) staged.push([!(p in head) ? "new file" : !(p in r.index) ? "deleted" : "modified", p]);
  for (const p of Object.keys(r.index)) if (!(p in work)) unstaged.push(["deleted", p]);
  for (const [p, c] of Object.entries(work)) {
    if (!(p in r.index)) untracked.push(p);
    else if (r.index[p] !== c) unstaged.push(["modified", p]);
  }
  return { staged: staged.sort(), unstaged: unstaged.sort(), untracked: untracked.sort() };
}

// Split a command line into words, keeping quoted text together.
export function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m[1] !== undefined ? m[1].replace(/\\"/g, '"') : m[2] !== undefined ? m[2] : m[3]);
  return out;
}

// ---------- running commands ----------
const out = (text: string, kind: Line["kind"] = "out"): Line => ({ text, kind });
const err = (text: string): Result => ({ lines: [out(text, "err")] });

export function run(s: GitState, input: string): Result {
  const line = input.trim();
  if (!line) return { lines: [] };
  s.history.push(line);
  // echo "text" > file / >> file
  const redirect = /^echo\s+(.*?)\s*(>>?)\s*(\S+)$/.exec(line);
  if (redirect) {
    const text = tokenize(redirect[1]).join(" ");
    const abs = resolve(s.cwd, redirect[3]);
    if (s.fs.dirs.has(abs)) return err(`bash: ${redirect[3]}: Is a directory`);
    writeFile(s, abs, redirect[2] === ">>" && s.fs.files[abs] !== undefined ? `${s.fs.files[abs]}\n${text}` : text);
    return { lines: [] };
  }
  const [cmd, ...args] = tokenize(line);
  switch (cmd) {
    case "clear":
      return { lines: [], clear: true };
    case "pwd":
      return { lines: [out(s.cwd)] };
    case "ls": {
      const dir = resolve(s.cwd, args.find((a) => !a.startsWith("-")) ?? ".");
      if (!s.fs.dirs.has(dir)) return err(`ls: cannot access '${args[0]}': No such file or directory`);
      const names = new Set<string>();
      for (const d of s.fs.dirs) if (parent(d) === dir && d !== dir) names.add(base(d) + "/");
      for (const f of Object.keys(s.fs.files)) if (parent(f) === dir) names.add(base(f));
      return { lines: [out([...names].sort().join("  ") || "")] };
    }
    case "cd": {
      const target = resolve(s.cwd, args[0] ?? "~");
      if (!s.fs.dirs.has(target)) return err(`bash: cd: ${args[0]}: No such file or directory`);
      s.cwd = target;
      return { lines: [] };
    }
    case "mkdir": {
      if (!args.length) return err("mkdir: missing operand");
      for (const a of args.filter((x) => x !== "-p")) {
        let d = resolve(s.cwd, a);
        while (!s.fs.dirs.has(d)) {
          s.fs.dirs.add(d);
          d = parent(d);
        }
      }
      return { lines: [] };
    }
    case "touch": {
      if (!args.length) return err("touch: missing file operand");
      for (const a of args) {
        const abs = resolve(s.cwd, a);
        if (s.fs.files[abs] === undefined) writeFile(s, abs, "");
      }
      return { lines: [] };
    }
    case "cat": {
      const abs = resolve(s.cwd, args[0] ?? "");
      if (s.fs.files[abs] === undefined) return err(`cat: ${args[0] ?? ""}: No such file or directory`);
      return { lines: s.fs.files[abs].split("\n").map((t) => out(t)) };
    }
    case "rm": {
      const files = args.filter((a) => !a.startsWith("-"));
      for (const a of files) {
        const abs = resolve(s.cwd, a);
        if (s.fs.files[abs] === undefined) return err(`rm: cannot remove '${a}': No such file or directory`);
        delete s.fs.files[abs];
      }
      return { lines: [] };
    }
    case "echo":
      return { lines: [out(args.join(" "))] };
    case "git":
      return git(s, args);
    case "help":
      return {
        lines: [
          out("Shell:  ls  cd  pwd  mkdir  touch  cat  rm  echo \"text\" > file  clear", "info"),
          out("Git:    init  status  add  commit  log  branch  switch  checkout  merge", "info"),
          out("        clone  remote  diff  restore  config", "info"),
          out("Tip: press ↑ / ↓ for earlier commands.", "info"),
        ],
      };
    default:
      return err(`${cmd}: command not found. Type 'help' to see what you can use.`);
  }
}

function git(s: GitState, args: string[]): Result {
  const [sub, ...rest] = args;
  if (!sub) return err("usage: git <command> [<args>]   (type 'help' for the list)");
  if (sub === "init") return gitInit(s);
  if (sub === "clone") return gitClone(s, rest);
  if (sub === "config") return { lines: rest.length >= 2 ? [] : [out("user.name=You"), out("user.email=you@example.com")] };
  if (sub === "--version" || sub === "version") return { lines: [out("git version 2.45.0 (simulator)")] };
  const r = repoAt(s);
  if (!r) return err("fatal: not a git repository (or any of the parent directories): .git");
  switch (sub) {
    case "status":
      return gitStatus(s, r);
    case "add":
      return gitAdd(s, r, rest);
    case "commit":
      return gitCommit(s, r, rest);
    case "log":
      return gitLog(r, rest);
    case "branch":
      return gitBranch(r, rest);
    case "switch":
      return gitSwitch(s, r, rest);
    case "checkout":
      return gitCheckout(s, r, rest);
    case "merge":
      return gitMerge(s, r, rest);
    case "remote":
      return { lines: r.remote ? (rest.includes("-v") ? [out(`${r.remote.name}\t${r.remote.url} (fetch)`), out(`${r.remote.name}\t${r.remote.url} (push)`)] : [out(r.remote.name)]) : [] };
    case "diff":
      return gitDiff(s, r, rest);
    case "restore":
      return gitRestore(s, r, rest);
    default:
      return err(`git: '${sub}' is not a git command in this simulator yet. Type 'help'.`);
  }
}

function gitInit(s: GitState): Result {
  if (s.repos[s.cwd]) return { lines: [out(`Reinitialized existing Git repository in ${s.cwd}/.git/`)] };
  s.repos[s.cwd] = { path: s.cwd, commits: {}, order: [], branches: { main: null }, head: { branch: "main" }, index: {} };
  return { lines: [out(`Initialized empty Git repository in ${s.cwd}/.git/`, "ok")] };
}

const URL_RE = /^(https:\/\/[\w.-]+\.[a-z]{2,}\/[\w.-]+\/[\w.-]+?(\.git)?\/?|git@[\w.-]+:[\w.-]+\/[\w.-]+?(\.git)?)$/i;

function gitClone(s: GitState, args: string[]): Result {
  const url = args.find((a) => !a.startsWith("-"));
  if (!url) return err("fatal: You must specify a repository to clone.");
  if (/[<>]/.test(url)) return err(`fatal: '${url}' is a placeholder. Replace it with a real address like https://github.com/octocat/Hello-World.git`);
  if (!URL_RE.test(url)) return err(`fatal: repository '${url}' does not look like a Git address (https://host/user/repo.git or git@host:user/repo.git)`);
  const name = args.filter((a) => !a.startsWith("-"))[1] ?? url.replace(/\/$/, "").replace(/\.git$/, "").split(/[/:]/).pop()!;
  const dir = resolve(s.cwd, name);
  if (s.fs.dirs.has(dir)) return err(`fatal: destination path '${name}' already exists and is not an empty directory.`);
  s.fs.dirs.add(dir);
  const r: Repo = { path: dir, commits: {}, order: [], branches: {}, head: { branch: "main" }, index: {} };
  s.repos[dir] = r;
  // A small history so there is something to explore.
  const t1: Tree = { "README.md": `# ${name}\n\nCloned from ${url}` };
  const c1 = addCommit(s, r, "Initial commit", [], t1, "main");
  const t2: Tree = { ...t1, "index.html": "<h1>Hello</h1>" };
  const c2 = addCommit(s, r, "Add home page", [c1], t2, "main");
  const t3: Tree = { ...t2, "style.css": "h1 { color: gold; }" };
  const c3 = addCommit(s, r, "Add styles", [c2], t3, "main");
  r.branches.main = c3;
  r.index = { ...t3 };
  r.remote = { name: "origin", url, branches: { main: c3 } };
  setWorkTree(s, r, t3);
  return {
    lines: [
      out(`Cloning into '${name}'...`),
      out("remote: Enumerating objects: 9, done."),
      out("remote: Total 9 (delta 0), reused 0 (delta 0)"),
      out("Receiving objects: 100% (9/9), done.", "ok"),
    ],
  };
}

function gitStatus(s: GitState, r: Repo): Result {
  const lines: Line[] = [];
  const b = currentBranch(r);
  lines.push(out(b ? `On branch ${b}` : `HEAD detached at ${short(headCommit(r)!)}`));
  if (b && r.remote && r.remote.branches[b] && r.remote.branches[b] === r.branches[b]) lines.push(out(`Your branch is up to date with '${r.remote.name}/${b}'.`));
  if (r.merging) {
    lines.push(out("You have unmerged paths.", "err"), out('  (fix conflicts and run "git commit")'), out('  (use "git merge --abort" to abort the merge)'));
    if (r.merging.conflicts.length) {
      lines.push(out(""), out("Unmerged paths:"), out('  (use "git add <file>..." to mark resolution)'));
      for (const p of r.merging.conflicts) lines.push(out(`\tboth modified:   ${p}`, "err"));
    }
  }
  if (!headCommit(r)) lines.push(out(""), out("No commits yet"));
  const st = statusOf(s, r);
  if (st.staged.length) {
    lines.push(out(""), out("Changes to be committed:"), out('  (use "git restore --staged <file>..." to unstage)'));
    for (const [k, p] of st.staged) lines.push(out(`\t${(k + ":").padEnd(12)}${p}`, "ok"));
  }
  if (r.merging) st.unstaged = st.unstaged.filter(([, p]) => !r.merging!.conflicts.includes(p));
  if (st.unstaged.length) {
    lines.push(out(""), out("Changes not staged for commit:"), out('  (use "git add <file>..." to update what will be committed)'));
    for (const [k, p] of st.unstaged) lines.push(out(`\t${(k + ":").padEnd(12)}${p}`, "err"));
  }
  if (st.untracked.length) {
    lines.push(out(""), out("Untracked files:"), out('  (use "git add <file>..." to include in what will be committed)'));
    for (const p of st.untracked) lines.push(out(`\t${p}`, "err"));
  }
  if (!st.staged.length && !st.unstaged.length && !st.untracked.length && !r.merging?.conflicts.length)
    lines.push(out(headCommit(r) ? "nothing to commit, working tree clean" : 'nothing to commit (create/copy files and use "git add" to track)'));
  return { lines };
}

function gitAdd(s: GitState, r: Repo, args: string[]): Result {
  if (!args.length) return err("Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?");
  const work = workTree(s, r);
  const all = args.some((a) => a === "." || a === "-A" || a === "--all");
  const rel = (a: string) => {
    const abs = resolve(s.cwd, a);
    return abs.startsWith(r.path + "/") ? abs.slice(r.path.length + 1) : abs === r.path ? "" : null;
  };
  const targets = all ? [""] : args.map(rel);
  for (const [i, t] of targets.entries()) {
    if (t === null) return err(`fatal: '${args[i]}' is outside repository`);
    const matched = Object.keys({ ...work, ...r.index }).filter((p) => t === "" || p === t || p.startsWith(t + "/"));
    if (!matched.length) return err(`fatal: pathspec '${args[i]}' did not match any files`);
    for (const p of matched) {
      if (p in work) r.index[p] = work[p];
      else delete r.index[p];
    }
  }
  if (r.merging) r.merging.conflicts = r.merging.conflicts.filter((p) => !(p in r.index) || /^<<<<<<< /m.test(r.index[p]));
  return { lines: [] };
}

function gitCommit(s: GitState, r: Repo, args: string[]): Result {
  const mi = args.findIndex((a) => a === "-m" || a === "-am" || a === "-a");
  if (args.includes("-a") || args.includes("-am")) {
    const work = workTree(s, r);
    for (const p of Object.keys(r.index)) {
      if (p in work) r.index[p] = work[p];
      else delete r.index[p];
    }
  }
  const msgIdx = args.findIndex((a) => a === "-m" || a === "-am");
  const message = msgIdx >= 0 ? args[msgIdx + 1] : undefined;
  if (mi < 0 || !message) return err('error: write a message with -m, for example: git commit -m "Add home page"');
  if (r.merging?.conflicts.length) return err(`error: Committing is not possible because you have unmerged files.\nhint: Fix them in the work tree, then use 'git add <file>'.`);
  const head = headCommit(r);
  const st = statusOf(s, r);
  if (!st.staged.length && !r.merging) {
    const b = currentBranch(r);
    return { lines: [out(b ? `On branch ${b}` : "HEAD detached"), out(st.untracked.length || st.unstaged.length ? 'no changes added to commit (use "git add" first)' : "nothing to commit, working tree clean", "err")] };
  }
  const branch = currentBranch(r) ?? "HEAD";
  const parents = head ? [head] : [];
  if (r.merging) parents.push(r.merging.other);
  const id = addCommit(s, r, message, parents, r.index, branch);
  if ("branch" in r.head) r.branches[r.head.branch] = id;
  else r.head = { detached: id };
  const wasMerge = !!r.merging;
  r.merging = undefined;
  const n = st.staged.length;
  return { lines: [out(`[${branch}${head ? "" : " (root-commit)"} ${short(id)}] ${message}`, "ok"), out(wasMerge ? " Merge completed" : ` ${n} file${n === 1 ? "" : "s"} changed`)] };
}

function gitLog(r: Repo, args: string[]): Result {
  const start = headCommit(r);
  if (!start) return err(`fatal: your current branch '${currentBranch(r)}' does not have any commits yet`);
  const oneline = args.includes("--oneline");
  const seen = new Set<string>();
  const list: Commit[] = [];
  const stack = [start];
  while (stack.length) {
    const c = stack.pop()!;
    if (seen.has(c)) continue;
    seen.add(c);
    list.push(r.commits[c]);
    stack.push(...r.commits[c].parents);
  }
  list.sort((a, b) => b.time - a.time);
  const labels = (id: string) => {
    const ls: string[] = [];
    if (id === start) ls.push("branch" in r.head ? `HEAD -> ${r.head.branch}` : "HEAD");
    for (const [b, c] of Object.entries(r.branches)) if (c === id && !("branch" in r.head && r.head.branch === b)) ls.push(b);
    if (r.remote) for (const [b, c] of Object.entries(r.remote.branches)) if (c === id) ls.push(`${r.remote.name}/${b}`);
    return ls.length ? ` (${ls.join(", ")})` : "";
  };
  const lines: Line[] = [];
  for (const c of list) {
    if (oneline) lines.push(out(`${short(c.id)}${labels(c.id)} ${c.message}`, "ok"));
    else {
      lines.push(out(`commit ${c.id}${labels(c.id)}`, "ok"));
      if (c.parents.length > 1) lines.push(out(`Merge: ${c.parents.map(short).join(" ")}`));
      lines.push(out("Author: You <you@example.com>"), out(""), out(`    ${c.message}`), out(""));
    }
  }
  return { lines };
}

function gitBranch(r: Repo, args: string[]): Result {
  const del = args.findIndex((a) => a === "-d" || a === "-D");
  if (del >= 0) {
    const name = args[del + 1];
    if (!name || !(name in r.branches)) return err(`error: branch '${name ?? ""}' not found.`);
    if (currentBranch(r) === name) return err(`error: Cannot delete branch '${name}' checked out`);
    const tip = r.branches[name]!;
    const head = headCommit(r);
    if (args[del] === "-d" && head && tip && !isAncestor(r, tip, head)) return err(`error: The branch '${name}' is not fully merged.\nIf you are sure you want to delete it, run 'git branch -D ${name}'.`);
    delete r.branches[name];
    return { lines: [out(`Deleted branch ${name} (was ${tip ? short(tip) : "empty"}).`)] };
  }
  const name = args.find((a) => !a.startsWith("-"));
  if (!name) {
    const cur = currentBranch(r);
    return { lines: Object.keys(r.branches).sort().map((b) => out(`${b === cur ? "* " : "  "}${b}`, b === cur ? "ok" : "out")) };
  }
  return createBranch(r, name);
}

function createBranch(r: Repo, name: string): Result {
  if (!/^[\w./-]+$/.test(name) || name.endsWith("/") || name.includes("..")) return err(`fatal: '${name}' is not a valid branch name.`);
  if (name in r.branches) return err(`fatal: a branch named '${name}' already exists.`);
  const head = headCommit(r);
  if (!head) return err(`fatal: Not a valid object name: '${currentBranch(r)}'. Make a first commit before creating branches.`);
  r.branches[name] = head;
  return { lines: [] };
}

// Move HEAD to a branch and update the working tree and index (refusing if it would lose work).
function switchTo(s: GitState, r: Repo, name: string): Result {
  if (!(name in r.branches)) {
    if (r.remote && name in r.remote.branches) {
      r.branches[name] = r.remote.branches[name];
    } else return err(`fatal: invalid reference: ${name}`);
  }
  if (currentBranch(r) === name) return { lines: [out(`Already on '${name}'`)] };
  const st = statusOf(s, r);
  const target = treeOf(r, r.branches[name]);
  const head = treeOf(r, headCommit(r));
  const dirty = [...st.staged.map((x) => x[1]), ...st.unstaged.map((x) => x[1])].filter((p) => target[p] !== head[p]);
  if (dirty.length) return err(`error: Your local changes to the following files would be overwritten by checkout:\n\t${dirty.join("\n\t")}\nPlease commit your changes before you switch branches.`);
  const work = workTree(s, r);
  // Keep untracked files and unrelated local changes, replace tracked files with the target branch's.
  const next: Tree = {};
  for (const [p, c] of Object.entries(work)) if (!(p in head) || work[p] !== head[p]) next[p] = c;
  for (const [p, c] of Object.entries(target)) if (!(p in next) || next[p] === head[p]) next[p] = c;
  for (const p of Object.keys(head)) if (!(p in target) && work[p] === head[p]) delete next[p];
  setWorkTree(s, r, next);
  r.index = { ...target };
  r.head = { branch: name };
  return { lines: [out(`Switched to branch '${name}'`, "ok")] };
}

function gitSwitch(s: GitState, r: Repo, args: string[]): Result {
  const create = args.findIndex((a) => a === "-c" || a === "--create");
  if (create >= 0) {
    const name = args[create + 1];
    if (!name) return err("fatal: missing branch name; try -c <name>");
    const made = createBranch(r, name);
    if (made && made.lines.length) return made;
    const res = switchTo(s, r, name);
    return { lines: res.lines.map((l) => (l.kind === "ok" ? out(`Switched to a new branch '${name}'`, "ok") : l)) };
  }
  const name = args.find((a) => !a.startsWith("-"));
  if (!name) return err("fatal: missing branch name");
  return switchTo(s, r, name);
}

function gitCheckout(s: GitState, r: Repo, args: string[]): Result {
  if (args[0] === "-b") return gitSwitch(s, r, ["-c", ...args.slice(1)]);
  if (args[0] === "--") return gitRestore(s, r, args.slice(1));
  return gitSwitch(s, r, args);
}

function gitMerge(s: GitState, r: Repo, args: string[]): Result {
  if (args[0] === "--abort") {
    if (!r.merging) return err("fatal: There is no merge to abort (MERGE_HEAD missing).");
    const head = treeOf(r, headCommit(r));
    r.index = { ...head };
    setWorkTree(s, r, head);
    r.merging = undefined;
    return { lines: [out("Merge aborted.", "ok")] };
  }
  const name = args.find((a) => !a.startsWith("-"));
  if (!name) return err("fatal: No remote for the current branch. Name a branch: git merge <branch>");
  const other = r.branches[name] ?? (r.remote && name.startsWith(r.remote.name + "/") ? r.remote.branches[name.slice(r.remote.name.length + 1)] : undefined);
  if (!other) return err(`merge: ${name} - not something we can merge`);
  const head = headCommit(r);
  if (!head) return err("fatal: You have no commits yet.");
  const st = statusOf(s, r);
  if (st.staged.length || st.unstaged.length) return err("error: Your local changes would be overwritten by merge.\nPlease commit your changes before you merge.");
  if (isAncestor(r, other, head)) return { lines: [out("Already up to date.")] };
  const noFf = args.includes("--no-ff");
  if (isAncestor(r, head, other) && !noFf) {
    if ("branch" in r.head) r.branches[r.head.branch] = other;
    else r.head = { detached: other };
    const tree = treeOf(r, other);
    r.index = { ...tree };
    setWorkTree(s, r, { ...workTree(s, r), ...tree });
    return { lines: [out(`Updating ${short(head)}..${short(other)}`), out("Fast-forward", "ok")] };
  }
  // Three-way merge of whole files.
  const baseId = mergeBase(r, head, other);
  const b = treeOf(r, baseId);
  const ours = treeOf(r, head);
  const theirs = treeOf(r, other);
  const merged: Tree = {};
  const conflicts: string[] = [];
  for (const p of new Set([...Object.keys(ours), ...Object.keys(theirs)])) {
    const o = ours[p];
    const t = theirs[p];
    if (o === t) {
      if (o !== undefined) merged[p] = o;
    } else if (o === b[p]) {
      if (t !== undefined) merged[p] = t;
    } else if (t === b[p]) {
      if (o !== undefined) merged[p] = o;
    } else {
      conflicts.push(p);
      merged[p] = `<<<<<<< HEAD\n${o ?? ""}\n=======\n${t ?? ""}\n>>>>>>> ${name}`;
    }
  }
  setWorkTree(s, r, merged);
  if (conflicts.length) {
    r.index = Object.fromEntries(Object.entries(merged).filter(([p]) => !conflicts.includes(p)));
    for (const p of conflicts) if (p in ours) r.index[p] = ours[p];
    r.merging = { other, otherName: name, conflicts };
    return { lines: [...conflicts.map((p) => out(`CONFLICT (content): Merge conflict in ${p}`, "err")), out("Automatic merge failed; fix conflicts and then commit the result.", "err")] };
  }
  r.index = { ...merged };
  const branch = currentBranch(r) ?? "HEAD";
  const id = addCommit(s, r, `Merge branch '${name}'${branch !== "main" ? ` into ${branch}` : ""}`, [head, other], merged, branch);
  if ("branch" in r.head) r.branches[r.head.branch] = id;
  return { lines: [out("Merge made by the 'ort' strategy.", "ok")] };
}

function gitDiff(s: GitState, r: Repo, args: string[]): Result {
  const staged = args.includes("--staged") || args.includes("--cached");
  const from = staged ? treeOf(r, headCommit(r)) : r.index;
  const to = staged ? r.index : workTree(s, r);
  const lines: Line[] = [];
  for (const p of [...new Set([...Object.keys(from), ...Object.keys(to)])].sort()) {
    if (from[p] === to[p] || (!staged && !(p in r.index))) continue;
    lines.push(out(`diff --git a/${p} b/${p}`, "info"));
    for (const l of (from[p] ?? "").split("\n").filter((x) => from[p] !== undefined && x !== undefined)) lines.push(out(`-${l}`, "err"));
    for (const l of (to[p] ?? "").split("\n").filter((x) => to[p] !== undefined && x !== undefined)) lines.push(out(`+${l}`, "ok"));
  }
  return { lines };
}

function gitRestore(s: GitState, r: Repo, args: string[]): Result {
  const staged = args.includes("--staged");
  const files = args.filter((a) => !a.startsWith("-"));
  if (!files.length) return err("fatal: you must specify path(s) to restore");
  const head = treeOf(r, headCommit(r));
  for (const f of files) {
    const abs = resolve(s.cwd, f);
    const p = abs.slice(r.path.length + 1);
    if (staged) {
      if (p in head) r.index[p] = head[p];
      else delete r.index[p];
    } else {
      if (!(p in r.index)) return err(`error: pathspec '${f}' did not match any file(s) known to git`);
      writeFile(s, abs, r.index[p]);
    }
  }
  return { lines: [] };
}
