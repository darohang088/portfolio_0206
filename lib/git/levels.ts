// Lessons for the Git learning tool. Each level starts from a prepared state (set up by running
// commands silently), and its objectives are checked against the simulated repository after every
// command, so learners can solve them in any order and with any valid command.

import { createState, headCommit, repoAt, run, statusOf, workTree, currentBranch, type GitState, type Repo } from "./engine";

export type Objective = { text: string; done: (s: GitState, ctx: Ctx) => boolean };
export type Ctx = { start: Record<string, unknown> };
export type Level = {
  id: string;
  section: string;
  title: string;
  goal: string;
  story: string[];
  objectives: Objective[];
  hints: { text: string; code?: string }[];
  points: number;
  setup: () => GitState;
};

// Build a starting state by running commands, then hide them from the learner's history.
function prepared(cmds: string[], cwd?: string): () => GitState {
  return () => {
    const s = createState();
    for (const c of cmds) run(s, c);
    if (cwd) run(s, `cd ${cwd}`);
    s.history = [];
    return s;
  };
}

const ran = (s: GitState, re: RegExp) => s.history.some((h) => re.test(h));
const ranAfter = (s: GitState, first: RegExp, then: RegExp) => {
  const i = s.history.findIndex((h) => first.test(h));
  return i >= 0 && s.history.slice(i + 1).some((h) => then.test(h));
};
const anyRepo = (s: GitState, pick: (r: Repo) => boolean) => Object.values(s.repos).some(pick);
const commitCount = (r: Repo) => r.order.length;

export const LEVELS: Level[] = [
  {
    id: "init",
    section: "Introduction to Git",
    title: "Your first repository",
    goal: "Turn a normal folder into a Git repository",
    story: [
      "You're starting a new app. Before writing code, you want Git to remember every change you make.",
      "A repository (repo) is just a folder that Git watches. 'git init' creates the hidden .git folder where Git keeps its history.",
    ],
    objectives: [
      { text: "Make a folder and go into it", done: (s) => s.cwd !== "~" },
      { text: "Create a Git repository in it", done: (s) => !!repoAt(s) },
      { text: "Check the repository's status", done: (s) => !!repoAt(s) && ranAfter(s, /^git init/, /^git status/) },
    ],
    hints: [
      { text: "Create a folder and enter it:", code: "mkdir my-app" },
      { text: "Then:", code: "cd my-app" },
      { text: "Start the repository:", code: "git init" },
      { text: "Ask Git what's going on:", code: "git status" },
    ],
    points: 20,
    setup: prepared([]),
  },
  {
    id: "commit",
    section: "Introduction to Git",
    title: "Your first commit",
    goal: "Save a snapshot of your work",
    story: [
      "A commit is a saved snapshot of your project, like a save point in a game.",
      "Saving takes two steps: first 'git add' puts changes on the stage (the staging area), then 'git commit' saves everything on the stage with a message.",
    ],
    objectives: [
      { text: "Create a file in the project", done: (s) => { const r = repoAt(s); return !!r && Object.keys(workTree(s, r)).length > 0; } },
      { text: "Add it to the staging area", done: (s) => anyRepo(s, (r) => Object.keys(r.index).length > 0) },
      { text: "Commit it with a message", done: (s) => anyRepo(s, (r) => commitCount(r) > 0) },
      { text: "See your commit in the history", done: (s) => anyRepo(s, (r) => commitCount(r) > 0) && ranAfter(s, /^git commit/, /^git log/) },
    ],
    hints: [
      { text: "Make a file with some text:", code: 'echo "Hello Cambodia" > README.md' },
      { text: "Stage it:", code: "git add README.md" },
      { text: "Save the snapshot:", code: 'git commit -m "Add README"' },
      { text: "Show the history:", code: "git log" },
    ],
    points: 20,
    setup: prepared(["mkdir project", "cd project", "git init"], "~/project"),
  },
  {
    id: "clone",
    section: "Introduction to Git",
    title: "Cloning repositories",
    goal: "Copy an existing project from the internet",
    story: [
      "Your team already has a project on GitHub. Instead of starting from zero, you download a full copy of it, with its whole history.",
      "'git clone' copies the repository into a new folder and remembers where it came from (called 'origin').",
    ],
    objectives: [
      { text: "Clone a remote repository", done: (s) => anyRepo(s, (r) => !!r.remote) },
      { text: "Go into the cloned repository", done: (s) => !!repoAt(s)?.remote },
    ],
    hints: [
      { text: "Run git clone followed by a real address, e.g.", code: "git clone https://github.com/octocat/Hello-World.git" },
      { text: "After cloning, go into the new folder:", code: "cd Hello-World" },
      { text: "It has to be a real address like https://github.com/user/repo.git; a placeholder like <url> is rejected." },
    ],
    points: 20,
    setup: prepared([]),
  },
  {
    id: "history",
    section: "Introduction to Git",
    title: "Reading the history",
    goal: "Find out who changed what, and when",
    story: [
      "Your boss asks: \"When did we add the styles?\" The answer is in the history.",
      "'git log' lists every commit from newest to oldest. '--oneline' shows a short version, one commit per line.",
    ],
    objectives: [
      { text: "Show the full history", done: (s) => ran(s, /^git log(?!.*--oneline)/) },
      { text: "Show the short, one-line history", done: (s) => ran(s, /^git log.*--oneline/) },
      { text: "Look inside a file of the project", done: (s) => ran(s, /^cat \S+/) },
    ],
    hints: [
      { text: "The detailed history:", code: "git log" },
      { text: "The compact history:", code: "git log --oneline" },
      { text: "List the files, then read one:", code: "ls" },
      { text: "", code: "cat style.css" },
    ],
    points: 20,
    setup: prepared(["git clone https://github.com/daro/website.git"], "~/website"),
  },
  {
    id: "branch",
    section: "Branches",
    title: "Making a branch",
    goal: "Work on a new feature without touching main",
    story: [
      "You need to build a login screen, but 'main' must always work. So you make a branch: a separate line of work.",
      "'git switch -c name' creates a branch and moves you onto it in one step.",
    ],
    objectives: [
      { text: "Create a new branch", done: (s) => anyRepo(s, (r) => Object.keys(r.branches).length > 1) },
      { text: "Switch to your new branch", done: (s) => { const r = repoAt(s); return !!r && currentBranch(r) !== "main" && currentBranch(r) !== null; } },
      { text: "List the branches", done: (s) => ran(s, /^git branch\s*$/) && anyRepo(s, (r) => Object.keys(r.branches).length > 1) },
    ],
    hints: [
      { text: "Create and switch in one command:", code: "git switch -c feature/login" },
      { text: "Or in two steps:", code: "git branch feature/login" },
      { text: "", code: "git switch feature/login" },
      { text: "See all branches (* marks the one you're on):", code: "git branch" },
    ],
    points: 20,
    setup: prepared(["mkdir app", "cd app", "git init", 'echo "My App" > README.md', "git add .", 'git commit -m "Start the app"', 'echo "home" > home.txt', "git add .", 'git commit -m "Add home screen"'], "~/app"),
  },
  {
    id: "branch-commit",
    section: "Branches",
    title: "Committing on a branch",
    goal: "See that branches keep work separate",
    story: [
      "You're on the 'feature/login' branch. Anything you commit here stays here until you merge it.",
      "Make a commit, then switch back to main: your new file disappears, because main doesn't have it yet. Don't worry, it's safe on the branch.",
    ],
    objectives: [
      { text: "Commit a new file on feature/login", done: (s) => anyRepo(s, (r) => !!r.branches["feature/login"] && r.branches["feature/login"] !== r.branches.main) },
      { text: "Switch back to main", done: (s) => { const r = repoAt(s); return !!r && currentBranch(r) === "main" && r.branches["feature/login"] !== r.branches.main; } },
      { text: "List the files on main", done: (s) => ranAfter(s, /^git (switch|checkout) main/, /^ls/) },
    ],
    hints: [
      { text: "Create a file:", code: 'echo "login form" > login.txt' },
      { text: "Stage and commit:", code: "git add login.txt" },
      { text: "", code: 'git commit -m "Add login form"' },
      { text: "Go back to main and look:", code: "git switch main" },
      { text: "", code: "ls" },
    ],
    points: 20,
    setup: prepared(["mkdir app", "cd app", "git init", 'echo "My App" > README.md', "git add .", 'git commit -m "Start the app"', "git switch -c feature/login"], "~/app"),
  },
  {
    id: "ff-merge",
    section: "Branches",
    title: "Fast-forward merge",
    goal: "Bring a finished feature into main",
    story: [
      "The login feature is finished and tested. Time to bring it into main.",
      "main hasn't changed since the branch started, so Git can just move main forward to the feature's latest commit. This is called a fast-forward.",
    ],
    objectives: [
      { text: "Merge feature/login into main", done: (s) => anyRepo(s, (r) => !!r.branches.main && !!r.order.find((id) => r.commits[id].message === "Add login button") && r.branches.main === r.order[r.order.length - 1]) },
      { text: "Delete the merged branch", done: (s) => anyRepo(s, (r) => !("feature/login" in r.branches) && r.order.some((id) => r.commits[id].message === "Add login button")) },
    ],
    hints: [
      { text: "You're on main already. Merge the feature:", code: "git merge feature/login" },
      { text: "Clean up the branch you no longer need:", code: "git branch -d feature/login" },
      { text: "Check the result:", code: "git log --oneline" },
    ],
    points: 20,
    setup: prepared(
      ["mkdir app", "cd app", "git init", 'echo "My App" > README.md', "git add .", 'git commit -m "Start the app"', "git switch -c feature/login", 'echo "form" > login.txt', "git add .", 'git commit -m "Add login form"', 'echo "button" >> login.txt', 'git commit -am "Add login button"', "git switch main"],
      "~/app",
    ),
  },
  {
    id: "conflict",
    section: "Branches",
    title: "Merge conflicts",
    goal: "Fix it when two branches changed the same line",
    story: [
      "You changed the app title on main. Your teammate changed the same title on 'update-title'. Git can't guess which one is right.",
      "When you merge, Git marks the conflict inside the file with <<<<<<<, ======= and >>>>>>>. You decide the final text, then add and commit to finish the merge.",
    ],
    objectives: [
      { text: "Merge update-title into main", done: (s) => anyRepo(s, (r) => !!r.merging || r.order.some((id) => r.commits[id].parents.length > 1)) },
      { text: "Fix the conflict in title.txt", done: (s) => anyRepo(s, (r) => (!!r.merging || r.order.some((id) => r.commits[id].parents.length > 1)) && !/<<<<<<<|>>>>>>>/.test(s.fs.files[`${r.path}/title.txt`] ?? "")) },
      { text: "Commit the merge", done: (s) => anyRepo(s, (r) => r.order.some((id) => r.commits[id].parents.length > 1) && !r.merging) },
    ],
    hints: [
      { text: "Start the merge:", code: "git merge update-title" },
      { text: "Look at the conflict markers:", code: "cat title.txt" },
      { text: "Write the final title (this replaces the whole file):", code: 'echo "Daro Shop" > title.txt' },
      { text: "Mark it fixed and finish:", code: "git add title.txt" },
      { text: "", code: 'git commit -m "Merge update-title"' },
    ],
    points: 20,
    setup: prepared(
      ["mkdir shop", "cd shop", "git init", 'echo "My Shop" > title.txt', "git add .", 'git commit -m "Add title"', "git switch -c update-title", 'echo "Daro Store" > title.txt', 'git commit -am "Rename to Daro Store"', "git switch main", 'echo "Daro Shop" > title.txt', 'git commit -am "Rename to Daro Shop"'],
      "~/shop",
    ),
  },
];

export const TOTAL_POINTS = LEVELS.reduce((n, l) => n + l.points, 0);

// Not used by levels directly but handy for the UI.
export { headCommit, statusOf, currentBranch };
