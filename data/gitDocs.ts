// Git reference for the Learn Git tool. Each entry carries its own English and Khmer text.
// The Khmer is written in plain, everyday words; Git's own words (commit, branch, merge…) stay
// in English because that's what learners will type and see on their own computers.

export type Bi = { en: string; km: string };

// `tryIt` marks commands the practice terminal understands, so the docs can offer "Try it".
export type DocCommand = { cmd: string; group: string; what: Bi; example: string; output?: string; tip?: Bi; tryIt?: boolean };
export type DocWord = { term: string; icon: string; what: Bi; like?: Bi };
export type DocUndo = { q: Bi; cmd: string; how: Bi; careful?: Bi };

export const DOC_GROUPS: Record<string, Bi> = {
  start: { en: "Start a project", km: "ចាប់ផ្តើមគម្រោង" },
  save: { en: "Save your work", km: "រក្សាទុកការងារ" },
  look: { en: "Look around", km: "មើលស្ថានភាព និងប្រវត្តិ" },
  branch: { en: "Branches", km: "Branch (ផ្លូវការងារ)" },
  share: { en: "Work with GitHub", km: "ធ្វើការជាមួយ GitHub" },
};

export const DOC_COMMANDS: DocCommand[] = [
  {
    cmd: "git init",
    group: "start",
    what: { en: "Turns the current folder into a Git project, so Git starts remembering changes.", km: "ធ្វើឲ្យ folder បច្ចុប្បន្ន ក្លាយជាគម្រោង Git។ ចាប់ពីពេលនេះ Git ចាំរាល់ការកែប្រែ។" },
    example: "git init",
    output: "Initialized empty Git repository in ~/my-app/.git/",
    tryIt: true,
  },
  {
    cmd: "git clone <url>",
    group: "start",
    what: { en: "Downloads a full copy of a project from GitHub, with all its history.", km: "ទាញយកគម្រោងពី GitHub មកកុំព្យូទ័រ ទាំងប្រវត្តិទាំងអស់។" },
    example: "git clone https://github.com/octocat/Hello-World.git",
    output: "Cloning into 'Hello-World'...\ndone.",
    tip: { en: "After cloning, remember to cd into the new folder.", km: "Clone រួច កុំភ្លេច cd ចូលទៅក្នុង folder ថ្មី។" },
    tryIt: true,
  },
  {
    cmd: "git config",
    group: "start",
    what: { en: "Sets your name and email. Every commit you make is signed with them. Do this once per computer.", km: "កំណត់ឈ្មោះ និង email របស់អ្នក។ រាល់ commit នឹងមានឈ្មោះអ្នកនៅលើ។ ធ្វើតែម្តងគត់ក្នុងកុំព្យូទ័រមួយ។" },
    example: 'git config --global user.name "Hang Daro"',
    tryIt: true,
  },
  {
    cmd: "git status",
    group: "look",
    what: { en: "Shows what changed: which files are new, edited, or ready to save. Use it often!", km: "បង្ហាញថាមានអ្វីផ្លាស់ប្តូរ៖ ឯកសារថ្មី ឯកសារបានកែ ឬរួចរាល់សម្រាប់រក្សាទុក។ គួរប្រើវាញឹកញាប់!" },
    example: "git status",
    output: "On branch main\nChanges to be committed:\n        new file:   README.md",
    tryIt: true,
  },
  {
    cmd: "git add <file>",
    group: "save",
    what: { en: "Puts a change into the staging area: the list of things your next commit will save.", km: "ដាក់ការកែប្រែចូលក្នុង staging area គឺជាបញ្ជីរបស់ដែល commit បន្ទាប់នឹងរក្សាទុក។" },
    example: "git add README.md",
    tip: { en: "git add . adds every changed file in the folder.", km: "git add . ដាក់គ្រប់ឯកសារដែលបានកែ ក្នុង folder ទាំងអស់។" },
    tryIt: true,
  },
  {
    cmd: 'git commit -m "message"',
    group: "save",
    what: { en: "Saves everything in the staging area as one snapshot, with a short message saying what you did.", km: "រក្សាទុករបស់ទាំងអស់ក្នុង staging area ជារូបថតមួយ ជាមួយសារខ្លីប្រាប់ថាអ្នកបានធ្វើអ្វី។" },
    example: 'git commit -m "Add login screen"',
    output: "[main 1a2b3c4] Add login screen\n 1 file changed",
    tip: { en: "Write messages like \"Add login screen\" or \"Fix price bug\", not \"update\".", km: "សរសេរសារឲ្យច្បាស់ ដូចជា \"Add login screen\" ឬ \"Fix price bug\" កុំសរសេរត្រឹម \"update\"។" },
    tryIt: true,
  },
  {
    cmd: "git commit -am",
    group: "save",
    what: { en: "Adds every file Git already knows about and commits in one step. New files still need git add first.", km: "add និង commit ក្នុងពេលតែមួយ សម្រាប់ឯកសារដែល Git ស្គាល់រួច។ ឯកសារថ្មី នៅតែត្រូវ git add ជាមុនសិន។" },
    example: 'git commit -am "Fix typo"',
    tryIt: true,
  },
  {
    cmd: "git log",
    group: "look",
    what: { en: "Lists the commits, newest first: who, when, and the message.", km: "បង្ហាញបញ្ជី commit ពីថ្មីទៅចាស់៖ អ្នកណាធ្វើ ពេលណា និងសារអ្វី។" },
    example: "git log --oneline",
    output: "1a2b3c4 (HEAD -> main) Add login screen\n9f8e7d6 Start the app",
    tip: { en: "--oneline shows one short line per commit.", km: "--oneline បង្ហាញ commit មួយ ក្នុងមួយបន្ទាត់ខ្លី។" },
    tryIt: true,
  },
  {
    cmd: "git diff",
    group: "look",
    what: { en: "Shows exactly which lines you changed but haven't staged yet. Add --staged to see what's staged.", km: "បង្ហាញបន្ទាត់ដែលអ្នកបានកែ តែមិនទាន់ add។ បន្ថែម --staged ដើម្បីមើលអ្វីដែលបាន add រួច។" },
    example: "git diff",
    tryIt: true,
  },
  {
    cmd: "git branch",
    group: "branch",
    what: { en: "Lists your branches. The * shows the one you're on. Add a name to create a new branch.", km: "បង្ហាញបញ្ជី branch។ សញ្ញា * ប្រាប់ថាអ្នកកំពុងនៅ branch ណា។ ដាក់ឈ្មោះពីក្រោយ ដើម្បីបង្កើត branch ថ្មី។" },
    example: "git branch",
    output: "  feature/login\n* main",
    tryIt: true,
  },
  {
    cmd: "git switch -c <name>",
    group: "branch",
    what: { en: "Creates a new branch and moves you onto it. Without -c, it just moves you to an existing branch.", km: "បង្កើត branch ថ្មី ហើយប្តូរទៅលើវាភ្លាម។ បើគ្មាន -c វាគ្រាន់តែប្តូរទៅ branch ដែលមានស្រាប់។" },
    example: "git switch -c feature/login",
    output: "Switched to a new branch 'feature/login'",
    tip: { en: "Older tutorials use git checkout -b. It does the same thing.", km: "ឯកសារចាស់ៗប្រើ git checkout -b។ វាធ្វើការដូចគ្នា។" },
    tryIt: true,
  },
  {
    cmd: "git merge <branch>",
    group: "branch",
    what: { en: "Brings the work from another branch into the branch you're on.", km: "យកការងារពី branch មួយទៀត មកបញ្ចូលក្នុង branch ដែលអ្នកកំពុងនៅ។" },
    example: "git merge feature/login",
    tip: { en: "Switch to the branch that should receive the work first (usually main).", km: "ត្រូវប្តូរទៅ branch ដែលទទួលការងារជាមុនសិន (ភាគច្រើនគឺ main)។" },
    tryIt: true,
  },
  {
    cmd: "git branch -d <name>",
    group: "branch",
    what: { en: "Deletes a branch you've finished with. Git refuses if its work isn't merged yet, so you can't lose it by accident.", km: "លុប branch ដែលលែងប្រើ។ បើការងារមិនទាន់ merge Git នឹងមិនឲ្យលុបទេ ដូច្នេះមិនបាត់ការងារដោយចៃដន្យ។" },
    example: "git branch -d feature/login",
    tryIt: true,
  },
  {
    cmd: "git remote -v",
    group: "share",
    what: { en: "Shows the online copies your project is linked to. The main one is called origin.", km: "បង្ហាញគម្រោងលើអ៊ីនធឺណិត ដែលភ្ជាប់ជាមួយគម្រោងរបស់អ្នក។ មួយសំខាន់ហៅថា origin។" },
    example: "git remote -v",
    tryIt: true,
  },
  {
    cmd: "git push",
    group: "share",
    what: { en: "Uploads your new commits to GitHub so your team can see them.", km: "បញ្ជូន commit ថ្មីៗរបស់អ្នក ទៅ GitHub ដើម្បីឲ្យក្រុមឃើញ។" },
    example: "git push origin main",
    tip: { en: "First push of a new branch: git push -u origin feature/login", km: "Push branch ថ្មីលើកដំបូង៖ git push -u origin feature/login" },
  },
  {
    cmd: "git pull",
    group: "share",
    what: { en: "Downloads your team's new commits from GitHub and merges them into your branch.", km: "ទាញយក commit ថ្មីៗរបស់ក្រុមពី GitHub ហើយបញ្ចូលក្នុង branch របស់អ្នក។" },
    example: "git pull",
    tip: { en: "Pull before you start work each day, so you build on the latest code.", km: "Pull រាល់ពេលចាប់ផ្តើមការងារ ដើម្បីធ្វើការលើកូដថ្មីបំផុត។" },
  },
  {
    cmd: "git fetch",
    group: "share",
    what: { en: "Checks GitHub for new commits without changing your files. Safe to run any time.", km: "ពិនិត្យមើល commit ថ្មីៗលើ GitHub ដោយមិនប៉ះពាល់ឯកសាររបស់អ្នក។ ប្រើពេលណាក៏បាន។" },
    example: "git fetch",
  },
  {
    cmd: "git stash",
    group: "save",
    what: { en: "Puts your unfinished changes aside so you can switch branches. git stash pop brings them back.", km: "ទុកការកែប្រែដែលមិនទាន់រួចមួយអន្លើសិន ដើម្បីប្តូរ branch បាន។ git stash pop យកវាមកវិញ។" },
    example: "git stash",
  },
];

export const DOC_WORDS: DocWord[] = [
  {
    term: "Repository (repo)",
    icon: "📁",
    what: { en: "A project folder that Git watches. It keeps every version of every file.", km: "Folder គម្រោងដែល Git តាមដាន។ វាចាំគ្រប់ version នៃឯកសារទាំងអស់។" },
    like: { en: "Like a photo album of your project.", km: "ដូចអាល់ប៊ុមរូបថតរបស់គម្រោង។" },
  },
  {
    term: "Commit",
    icon: "💾",
    what: { en: "One saved snapshot of your project, with a message and a unique ID like 1a2b3c4.", km: "ការរក្សាទុកមួយដង នៃគម្រោងទាំងមូល មានសារ និងលេខសម្គាល់ ដូចជា 1a2b3c4។" },
    like: { en: "Like a save point in a game: you can always come back to it.", km: "ដូច save ក្នុងហ្គេម៖ អ្នកអាចត្រឡប់មកវិញបានជានិច្ច។" },
  },
  {
    term: "Staging area",
    icon: "📦",
    what: { en: "The waiting list of changes for your next commit. git add puts changes here.", km: "បញ្ជីរង់ចាំ នៃការកែប្រែសម្រាប់ commit បន្ទាប់។ git add ដាក់ការកែប្រែមកទីនេះ។" },
    like: { en: "Like packing a box before you seal and send it.", km: "ដូចការដាក់អីវ៉ាន់ចូលប្រអប់ មុនបិទ ហើយផ្ញើ។" },
  },
  {
    term: "Branch",
    icon: "🌿",
    what: { en: "A separate line of work. You can try new things on a branch without breaking main.", km: "ផ្លូវការងារដាច់ដោយឡែកមួយ។ អ្នកអាចសាកល្បងរបស់ថ្មីលើ branch ដោយមិនធ្វើឲ្យ main ខូច។" },
    like: { en: "Like a copy of your homework where you try a new answer.", km: "ដូចចម្លងកិច្ចការផ្ទះមួយច្បាប់ ដើម្បីសាកចម្លើយថ្មី។" },
  },
  {
    term: "main",
    icon: "⭐",
    what: { en: "The main branch. It should always hold working code.", km: "Branch សំខាន់។ វាគួរតែមានកូដដែលដំណើរការល្អជានិច្ច។" },
  },
  {
    term: "HEAD",
    icon: "📍",
    what: { en: "A marker that says where you are now: which branch and commit you're working on.", km: "សញ្ញាប្រាប់ថាអ្នកនៅត្រង់ណាឥឡូវនេះ៖ កំពុងធ្វើការលើ branch និង commit មួយណា។" },
    like: { en: "Like the \"You are here\" dot on a map.", km: "ដូចចំណុច \"អ្នកនៅទីនេះ\" លើផែនទី។" },
  },
  {
    term: "Merge",
    icon: "🔀",
    what: { en: "Joining the work of one branch into another.", km: "ការបញ្ចូលការងារពី branch មួយ ទៅ branch មួយទៀត។" },
  },
  {
    term: "Fast-forward",
    icon: "⏩",
    what: { en: "The simplest merge: when main has no new commits, Git just moves main forward. No merge commit needed.", km: "Merge ងាយបំផុត៖ ពេល main គ្មាន commit ថ្មី Git គ្រាន់តែរំកិល main ទៅមុខ។ មិនចាំបាច់មាន merge commit ទេ។" },
  },
  {
    term: "Conflict",
    icon: "⚔️",
    what: { en: "When two branches changed the same line, Git can't choose. You pick the right text, then add and commit.", km: "ពេល branch ពីរកែបន្ទាត់ដូចគ្នា Git មិនដឹងយកមួយណា។ អ្នកជាអ្នកជ្រើសអត្ថបទត្រឹមត្រូវ រួច add និង commit។" },
    like: { en: "Not an error! Just Git asking you a question.", km: "មិនមែនជាកំហុសទេ! គ្រាន់តែ Git សួរអ្នកមួយសំណួរ។" },
  },
  {
    term: "Remote / origin",
    icon: "☁️",
    what: { en: "The copy of your project online, for example on GitHub. origin is its usual name.", km: "ច្បាប់ចម្លងនៃគម្រោងរបស់អ្នកលើអ៊ីនធឺណិត ឧទាហរណ៍នៅលើ GitHub។ origin ជាឈ្មោះដែលគេប្រើជាទូទៅ។" },
  },
  {
    term: "Clone",
    icon: "📥",
    what: { en: "Downloading a full project from a remote, with its whole history.", km: "ការទាញយកគម្រោងទាំងមូលពី remote រួមទាំងប្រវត្តិទាំងអស់។" },
  },
  {
    term: "Push / Pull",
    icon: "🔃",
    what: { en: "Push sends your commits up to GitHub. Pull brings your team's commits down to you.", km: "Push បញ្ជូន commit របស់អ្នកទៅ GitHub។ Pull ទាញ commit របស់ក្រុមមកកុំព្យូទ័រអ្នក។" },
  },
  {
    term: "Pull Request (PR)",
    icon: "🙋",
    what: { en: "A request on GitHub to merge your branch. Teammates review the code before it goes into main.", km: "សំណើលើ GitHub ដើម្បី merge branch របស់អ្នក។ មិត្តរួមក្រុមពិនិត្យកូដ មុនពេលបញ្ចូលទៅ main។" },
  },
];

export const DOC_UNDO: DocUndo[] = [
  {
    q: { en: "I staged a file by mistake", km: "ខ្ញុំ add ឯកសារខុស" },
    cmd: "git restore --staged <file>",
    how: { en: "Takes the file off the staging area. Your edits stay in the file.", km: "យកឯកសារចេញពី staging area វិញ។ អ្វីដែលអ្នកបានកែ នៅតែមានក្នុងឯកសារ។" },
  },
  {
    q: { en: "I want to throw away my changes to a file", km: "ខ្ញុំចង់បោះចោលការកែប្រែក្នុងឯកសារមួយ" },
    cmd: "git restore <file>",
    how: { en: "Puts the file back the way it was in the last commit.", km: "ធ្វើឲ្យឯកសារត្រឡប់ទៅដូច commit ចុងក្រោយវិញ។" },
    careful: { en: "Your unsaved edits are gone for good.", km: "ការកែប្រែដែលមិនទាន់ commit នឹងបាត់រហូត។" },
  },
  {
    q: { en: "I made a typo in my last commit message", km: "ខ្ញុំសរសេរសារ commit ចុងក្រោយខុស" },
    cmd: 'git commit --amend -m "New message"',
    how: { en: "Replaces the last commit's message.", km: "ប្តូរសាររបស់ commit ចុងក្រោយ។" },
    careful: { en: "Only before you push.", km: "ធ្វើបានតែមុនពេល push ប៉ុណ្ណោះ។" },
  },
  {
    q: { en: "I forgot a file in my last commit", km: "ខ្ញុំភ្លេចដាក់ឯកសារមួយក្នុង commit ចុងក្រោយ" },
    cmd: "git add <file>\ngit commit --amend --no-edit",
    how: { en: "Adds the file into the last commit and keeps its message.", km: "បន្ថែមឯកសារនោះចូលក្នុង commit ចុងក្រោយ ហើយរក្សាសារដដែល។" },
    careful: { en: "Only before you push.", km: "ធ្វើបានតែមុនពេល push ប៉ុណ្ណោះ។" },
  },
  {
    q: { en: "Undo my last commit, but keep the changes", km: "លុប commit ចុងក្រោយ តែរក្សាការកែប្រែទុក" },
    cmd: "git reset --soft HEAD~1",
    how: { en: "Removes the commit; your changes go back to the staging area, ready to commit again.", km: "លុប commit នោះចេញ ហើយការកែប្រែត្រឡប់ទៅ staging area វិញ រួចរាល់សម្រាប់ commit ម្តងទៀត។" },
    careful: { en: "Only before you push.", km: "ធ្វើបានតែមុនពេល push ប៉ុណ្ណោះ។" },
  },
  {
    q: { en: "I already pushed a bad commit", km: "ខ្ញុំបាន push commit ខុសរួចហើយ" },
    cmd: "git revert <commit-id>",
    how: { en: "Makes a new commit that undoes the bad one. History stays safe for your team.", km: "បង្កើត commit ថ្មីមួយ ដែលលុបបំបាត់អ្វីដែល commit ខុសបានធ្វើ។ ប្រវត្តិរបស់ក្រុមនៅតែមានសុវត្ថិភាព។" },
  },
  {
    q: { en: "I committed on the wrong branch", km: "ខ្ញុំ commit នៅលើ branch ខុស" },
    cmd: "git switch -c right-branch\ngit switch main\ngit reset --hard HEAD~1",
    how: { en: "Saves the commit on a new branch, then removes it from main.", km: "រក្សា commit នោះទុកលើ branch ថ្មី រួចលុបវាចេញពី main។" },
    careful: { en: "reset --hard deletes uncommitted changes. Commit or stash first.", km: "reset --hard លុបការកែប្រែដែលមិនទាន់ commit។ ត្រូវ commit ឬ stash ជាមុនសិន។" },
  },
  {
    q: { en: "I'm stuck in a merge and want to stop", km: "ខ្ញុំជាប់ក្នុងការ merge ហើយចង់ឈប់" },
    cmd: "git merge --abort",
    how: { en: "Cancels the merge and puts everything back the way it was before.", km: "បោះបង់ការ merge ហើយធ្វើឲ្យអ្វីៗត្រឡប់ទៅដូចមុនវិញ។" },
  },
];

// Git flow: the branches and when to use each.
export const FLOW_BRANCHES: { name: string; color: string; what: Bi }[] = [
  { name: "main", color: "var(--gold)", what: { en: "What users have right now. Every commit here is a release.", km: "កូដដែលអ្នកប្រើកំពុងប្រើ។ រាល់ commit នៅទីនេះ គឺជា version ដែលបានចេញ។" } },
  { name: "develop", color: "var(--sky)", what: { en: "Where finished features gather before the next release.", km: "កន្លែងប្រមូលមុខងារដែលធ្វើរួច មុនពេលចេញ version បន្ទាប់។" } },
  { name: "feature/…", color: "var(--mint)", what: { en: "One branch per feature, made from develop and merged back into develop.", km: "Branch មួយ សម្រាប់មុខងារមួយ។ បង្កើតពី develop ហើយ merge ត្រឡប់ទៅ develop វិញ។" } },
  { name: "release/…", color: "var(--violet)", what: { en: "Getting a version ready: only testing and small fixes. Merged into main and develop.", km: "រៀបចំ version ដើម្បីចេញ៖ មានតែការតេស្ត និងការកែតូចៗ។ Merge ចូល main និង develop។" } },
  { name: "hotfix/…", color: "var(--pink)", what: { en: "An urgent fix for a bug users have now. Made from main, merged into main and develop.", km: "ការកែកំហុសបន្ទាន់ ដែលអ្នកប្រើកំពុងជួប។ បង្កើតពី main ហើយ merge ចូល main និង develop។" } },
];

export const FLOW_STEPS: { title: Bi; cmds: string }[] = [
  { title: { en: "Start a feature from develop", km: "ចាប់ផ្តើមមុខងារថ្មី ពី develop" }, cmds: "git switch develop\ngit switch -c feature/login" },
  { title: { en: "Work and commit as usual", km: "ធ្វើការ ហើយ commit ដូចធម្មតា" }, cmds: 'git add .\ngit commit -m "Add login form"' },
  { title: { en: "Finish: merge it back into develop", km: "ធ្វើរួច៖ merge ត្រឡប់ចូល develop វិញ" }, cmds: "git switch develop\ngit merge feature/login\ngit branch -d feature/login" },
  { title: { en: "Release: merge develop into main and tag it", km: "ចេញ version៖ merge develop ចូល main ហើយដាក់ tag" }, cmds: "git switch main\ngit merge develop\ngit tag v1.0.0" },
];
