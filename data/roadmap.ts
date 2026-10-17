// Blog post: a one-year roadmap to "Manager, IT Native Mobile Development".
// Each month has topics to learn (technical names stay in English), tasks people can tick off,
// and the proof to keep for interviews. Text is in English and plain Khmer.

export type Bi = { en: string; km: string };
export type Month = { n: number; title: Bi; goal: Bi; learn: string[]; tasks: Bi[]; proof: Bi };
export type Phase = { title: Bi; months: Month[] };

export const ROADMAP_SLUG = "native-mobile-lead-roadmap";

export const INTRO: Bi[] = [
  {
    en: "This role is not just \"a good mobile developer\". It asks for someone who owns Android and iOS end to end: the code, the builds, the releases, the incidents and the people. Most job posts for it also prefer banking or payments experience, where mistakes cost real money.",
    km: "តួនាទីនេះមិនមែនគ្រាន់តែជា \"អ្នកអភិវឌ្ឍន៍ mobile ពូកែ\" ទេ។ គេត្រូវការអ្នកដែលទទួលខុសត្រូវ Android និង iOS ពីដើមដល់ចប់៖ កូដ build ការចេញ version បញ្ហាពេលកំពុងប្រើ (incident) និងមនុស្សក្នុងក្រុម។ ភាគច្រើនគេចង់បានបទពិសោធន៍ធនាគារ ឬការទូទាត់ ដែលកំហុសតូចមួយអាចខាតលុយពិតៗ។",
  },
  {
    en: "Below is the plan I'd follow for one year. It starts from strong Android skills (where I am today), fills the iOS gap first, then goes through hybrid apps, content updates, performance, security, releases, leadership and incidents. Every month ends with something you can show in an interview, because the job post asks for proof and \"a clear explanation of your personal contribution\".",
    km: "ខាងក្រោមនេះជាផែនការមួយឆ្នាំដែលខ្ញុំនឹងធ្វើតាម។ វាចាប់ផ្តើមពីជំនាញ Android ដែលរឹងមាំ (កន្លែងដែលខ្ញុំនៅសព្វថ្ងៃ) បំពេញចន្លោះខ្វះ iOS មុនគេ រួចបន្តទៅ hybrid app ការ update មាតិកា ល្បឿនកម្មវិធី សុវត្ថិភាព ការចេញ version ភាពជាអ្នកដឹកនាំ និង incident។ ខែនីមួយៗបញ្ចប់ដោយរបស់មួយដែលអ្នកអាចបង្ហាញពេលសម្ភាសន៍ ព្រោះគេចង់ឃើញភស្តុតាង និង \"ការពន្យល់ច្បាស់ពីអ្វីដែលអ្នកធ្វើដោយខ្លួនឯង\"។",
  },
];

export const HOW_TO: Bi[] = [
  { en: "About 8–10 hours a week next to your job: 2 evenings + one weekend block.", km: "ប្រហែល 8–10 ម៉ោងក្នុងមួយសប្តាហ៍ ក្រៅពីការងារ៖ ល្ងាច 2 ដង + ពេលចុងសប្តាហ៍មួយដង។" },
  { en: "Tick tasks as you go. Your progress is saved in this browser.", km: "ធីកកិច្ចការនៅពេលធ្វើរួច។ វឌ្ឍនភាពរបស់អ្នកត្រូវបានរក្សាទុកក្នុង browser នេះ។" },
  { en: "Keep a \"brag document\": each month write what you did, the numbers, and what YOU decided.", km: "សរសេរ \"brag document\"៖ រៀងរាល់ខែ កត់ត្រាអ្វីដែលបានធ្វើ លេខតួលេខ និងអ្វីដែល \"អ្នក\" ជាអ្នកសម្រេច។" },
  { en: "Use real work where you can. A fix shipped at your job beats any side project.", km: "ប្រើការងារពិតនៅពេលអាច។ បញ្ហាដែលអ្នកដោះស្រាយ ហើយចេញនៅកន្លែងការងារ មានតម្លៃជាងគម្រោងផ្ទាល់ខ្លួនណាមួយ។" },
];

export const PHASES: Phase[] = [
  {
    title: { en: "Phase 1 · Become truly two-platform", km: "ដំណាក់កាលទី 1 · ពូកែទាំងពីរ platform ពិតប្រាកដ" },
    months: [
      {
        n: 1,
        title: { en: "Android depth check", km: "ពិនិត្យជម្រៅ Android" },
        goal: { en: "Be able to explain Android internals clearly, not just use them.", km: "អាចពន្យល់ពីរបៀបដែល Android ដំណើរការខាងក្នុងបានច្បាស់ មិនមែនគ្រាន់តែចេះប្រើ។" },
        learn: ["Activity / Fragment / process lifecycle", "Process death & SavedStateHandle", "Coroutines, Flow, structured concurrency", "WorkManager & foreground services", "Memory: LeakCanary, heap dumps", "Room, DataStore, file storage"],
        tasks: [
          { en: "Score yourself 1–5 on every line of the job post and write it down", km: "ដាក់ពិន្ទុខ្លួនឯង 1–5 លើបន្ទាត់នីមួយៗនៃការប្រកាសការងារ ហើយកត់ទុក" },
          { en: "Find and fix one memory leak with LeakCanary in a real app", km: "រក និងជួសជុល memory leak មួយដោយ LeakCanary ក្នុងកម្មវិធីពិត" },
          { en: "Test process death (\"Don't keep activities\") on every main screen", km: "តេស្ត process death (\"Don't keep activities\") លើអេក្រង់សំខាន់ៗទាំងអស់" },
          { en: "Start your brag document", km: "ចាប់ផ្តើមសរសេរ brag document" },
        ],
        proof: { en: "A short write-up: \"How my app survives process death\"", km: "អត្ថបទខ្លីមួយ៖ \"របៀបដែលកម្មវិធីខ្ញុំរស់រានពី process death\"" },
      },
      {
        n: 2,
        title: { en: "Swift & iOS foundations", km: "មូលដ្ឋាន Swift និង iOS" },
        goal: { en: "Read and write everyday iOS code with confidence.", km: "អាន និងសរសេរកូដ iOS ប្រចាំថ្ងៃបានដោយទំនុកចិត្ត។" },
        learn: ["Swift: optionals, value vs reference types, protocols", "SwiftUI + UIKit basics", "App & scene lifecycle", "async/await, actors, GCD", "ARC & retain cycles", "URLSession, Codable, Keychain"],
        tasks: [
          { en: "Finish Apple's \"Develop in Swift\" / SwiftUI tutorials", km: "បញ្ចប់មេរៀន \"Develop in Swift\" / SwiftUI របស់ Apple" },
          { en: "Rebuild one screen of your Android app in SwiftUI", km: "បង្កើតអេក្រង់មួយនៃកម្មវិធី Android របស់អ្នកឡើងវិញក្នុង SwiftUI" },
          { en: "Make a table: Android concept ↔ iOS concept (Activity ↔ UIViewController, ViewModel ↔ ObservableObject…)", km: "ធ្វើតារាង៖ គំនិត Android ↔ គំនិត iOS (Activity ↔ UIViewController, ViewModel ↔ ObservableObject…)" },
        ],
        proof: { en: "A small iOS app on GitHub with a README", km: "កម្មវិធី iOS តូចមួយលើ GitHub មាន README" },
      },
      {
        n: 3,
        title: { en: "iOS in production", km: "iOS ក្នុងការប្រើប្រាស់ពិត" },
        goal: { en: "Be able to build, sign, ship and debug an iOS app alone.", km: "អាច build, sign, ចេញ និង debug កម្មវិធី iOS ដោយខ្លួនឯង។" },
        learn: ["Xcode schemes, configurations, xcconfig", "Certificates, provisioning profiles, App IDs", "TestFlight & App Store Connect", "Instruments: Time Profiler, Leaks, Allocations", "BGTaskScheduler, background URLSession", "FileManager, Core Data / SwiftData"],
        tasks: [
          { en: "Ship your iOS app to TestFlight", km: "ចេញកម្មវិធី iOS របស់អ្នកទៅ TestFlight" },
          { en: "Set up Debug / Staging / Release configurations", km: "រៀបចំ configuration Debug / Staging / Release" },
          { en: "Find one leak or slow spot with Instruments and fix it", km: "រក leak ឬកន្លែងយឺតមួយដោយ Instruments ហើយជួសជុល" },
          { en: "Review one iOS pull request at work (or in open source)", km: "Review pull request iOS មួយនៅកន្លែងការងារ (ឬ open source)" },
        ],
        proof: { en: "TestFlight link + notes on signing and build setup", km: "តំណ TestFlight + កំណត់ចំណាំពី signing និងការរៀបចំ build" },
      },
    ],
  },
  {
    title: { en: "Phase 2 · The hard parts of this job", km: "ដំណាក់កាលទី 2 · ផ្នែកពិបាកនៃការងារនេះ" },
    months: [
      {
        n: 4,
        title: { en: "Hybrid apps: WebView & JS bridges", km: "Hybrid app៖ WebView និង JS bridge" },
        goal: { en: "Design a safe, versioned bridge between native and web.", km: "រចនា bridge រវាង native និង web ដែលមានសុវត្ថិភាព និងមាន version។" },
        learn: ["Android WebView, WebViewAssetLoader, addJavascriptInterface risks", "WKWebView, WKScriptMessageHandler, WKURLSchemeHandler", "Bridge protocol: JSON messages, request ids, callbacks, versions", "Origin allow-lists, no secrets in JS", "Flutter platform channels / native plugins", "WebView warm-up and caching"],
        tasks: [
          { en: "Build one demo: the same web page on Android and iOS, calling native (camera, biometrics) through your bridge", km: "បង្កើតគំរូមួយ៖ ទំព័រ web ដដែលលើ Android និង iOS ហៅមុខងារ native (កាមេរ៉ា ស្នាមម្រាមដៃ) តាម bridge របស់អ្នក" },
          { en: "Write the bridge spec: message format, errors, versioning", km: "សរសេរ spec របស់ bridge៖ ទម្រង់សារ កំហុស និង version" },
          { en: "List 5 WebView security rules and check your demo against them", km: "រាយច្បាប់សុវត្ថិភាព WebView 5 ហើយពិនិត្យគំរូរបស់អ្នក" },
        ],
        proof: { en: "Demo repo + bridge spec document", km: "Repo គំរូ + ឯកសារ spec របស់ bridge" },
      },
      {
        n: 5,
        title: { en: "Content download & safe updates", km: "ការទាញយកមាតិកា និង update ដោយសុវត្ថិភាព" },
        goal: { en: "Update web bundles or assets without ever breaking the app.", km: "Update web bundle ឬ asset ដោយមិនធ្វើឲ្យកម្មវិធីខូចសោះ។" },
        learn: ["HTTP Range, ETag, resumable downloads", "SHA-256 checksums + signature check", "Atomic replace: download → verify → rename", "A/B slots and rollback", "Manifest with minAppVersion / compatibility", "WorkManager & background URLSession for big files"],
        tasks: [
          { en: "Build an \"update engine\" on both platforms: resume after network loss, verify hash, swap atomically", km: "បង្កើត \"update engine\" លើ platform ទាំងពីរ៖ បន្តទាញយកក្រោយដាច់អ៊ីនធឺណិត ពិនិត្យ hash ហើយប្តូរឯកសារម្តងតែមួយ (atomic)" },
          { en: "Kill the app in the middle of an update. It must still start", km: "បិទកម្មវិធីភ្លាមៗពេលកំពុង update។ វាត្រូវតែនៅបើកបាន" },
          { en: "Ship a bad bundle on purpose and prove the app rolls back", km: "ចេញ bundle ខុសដោយចេតនា ហើយបង្ហាញថាកម្មវិធីត្រឡប់ទៅ version មុនវិញ" },
        ],
        proof: { en: "A diagram + test results of the failure cases", km: "ដ្យាក្រាមមួយ + លទ្ធផលតេស្តករណីបរាជ័យ" },
      },
      {
        n: 6,
        title: { en: "Performance on slow networks", km: "ល្បឿនកម្មវិធីលើអ៊ីនធឺណិតយឺត" },
        goal: { en: "Measure first, then make startup, memory and network faster.", km: "វាស់ជាមុនសិន រួចធ្វើឲ្យការបើកកម្មវិធី memory និង network លឿនជាងមុន។" },
        learn: ["Startup: Baseline Profiles, App Startup, iOS pre-main", "ANRs: StrictMode, Perfetto, main-thread work", "Large images & assets", "Timeouts, retry with backoff, request de-duplication", "Network Link Conditioner / emulator throttling", "Crashlytics or Sentry dashboards"],
        tasks: [
          { en: "Measure cold start, memory and crash-free rate before you change anything", km: "វាស់ cold start, memory និង crash-free rate មុនពេលកែអ្វីមួយ" },
          { en: "Test every main flow on \"3G / very bad network\"", km: "តេស្តដំណើរការសំខាន់ៗទាំងអស់លើ \"3G / អ៊ីនធឺណិតខ្សោយខ្លាំង\"" },
          { en: "Fix the top 3 issues and measure again", km: "ជួសជុលបញ្ហាធំ 3 ហើយវាស់ម្តងទៀត" },
        ],
        proof: { en: "A before/after report with numbers", km: "របាយការណ៍មុន/ក្រោយ ដែលមានលេខតួលេខ" },
      },
    ],
  },
  {
    title: { en: "Phase 3 · Bank-grade engineering", km: "ដំណាក់កាលទី 3 · វិស្វកម្មកម្រិតធនាគារ" },
    months: [
      {
        n: 7,
        title: { en: "Mobile security for fintech", km: "សុវត្ថិភាព mobile សម្រាប់ fintech" },
        goal: { en: "Think like an attacker and protect money and data.", km: "គិតដូចអ្នកវាយប្រហារ ហើយការពារលុយ និងទិន្នន័យ។" },
        learn: ["OWASP MASVS & MASTG", "Android Keystore, iOS Keychain & Secure Enclave", "AES-GCM, key handling, no hard-coded secrets", "Certificate pinning, TLS", "Play Integrity, App Attest, root/jailbreak checks", "R8 / obfuscation, FLAG_SECURE, biometrics", "PCI DSS basics, NBC (National Bank of Cambodia) tech-risk rules, KHQR/Bakong"],
        tasks: [
          { en: "Write a threat model for one app: what can go wrong, how you stop it", km: "សរសេរ threat model សម្រាប់កម្មវិធីមួយ៖ អ្វីអាចខុស និងរបៀបការពារ" },
          { en: "Check one app against MASVS-L1 and fix the gaps", km: "ពិនិត្យកម្មវិធីមួយតាម MASVS-L1 ហើយបំពេញចន្លោះខ្វះ" },
          { en: "Move every secret into Keystore / Keychain", km: "ផ្លាស់ secret ទាំងអស់ទៅក្នុង Keystore / Keychain" },
        ],
        proof: { en: "Threat model + security checklist your team can reuse", km: "Threat model + checklist សុវត្ថិភាព ដែលក្រុមអាចប្រើបានម្តងទៀត" },
      },
      {
        n: 8,
        title: { en: "Releases, signing & CI/CD", km: "ការចេញ version, signing និង CI/CD" },
        goal: { en: "Releases become boring: automatic, staged and reversible.", km: "ការចេញ version ក្លាយជារឿងធម្មតា៖ ស្វ័យប្រវត្តិ ចេញបន្តិចម្តងៗ និងអាចត្រឡប់វិញបាន។" },
        learn: ["Gradle: build types, flavors, version catalogs", "Xcode: schemes, configs, build settings", "fastlane, GitHub Actions / Bitrise", "Keeping signing keys & secrets safe in CI", "Play staged rollout & halt, App Store phased release", "Hotfix branches; rollback with remote config / kill switch", "Huawei AppGallery, HMS Core vs Google services"],
        tasks: [
          { en: "One pipeline that builds, tests and uploads Android and iOS", km: "Pipeline មួយដែល build, test និង upload ទាំង Android និង iOS" },
          { en: "Do a staged rollout 5% → 20% → 100% and practise halting it", km: "ធ្វើ staged rollout 5% → 20% → 100% ហើយហាត់បញ្ឈប់វា" },
          { en: "Write a release checklist and a hotfix playbook", km: "សរសេរ checklist សម្រាប់ចេញ version និងសៀវភៅណែនាំ hotfix" },
          { en: "Publish a test app on Huawei AppGallery", km: "ចេញកម្មវិធីតេស្តមួយលើ Huawei AppGallery" },
        ],
        proof: { en: "Pipeline config + release / hotfix / rollback playbook", km: "Config របស់ pipeline + សៀវភៅណែនាំ release / hotfix / rollback" },
      },
      {
        n: 9,
        title: { en: "APIs, testing & SDKs", km: "API ការតេស្ត និង SDK" },
        goal: { en: "Changes are safe because tests catch mistakes first.", km: "ការកែប្រែមានសុវត្ថិភាព ព្រោះតេស្តចាប់កំហុសបានមុន។" },
        learn: ["REST design, OpenAPI contracts, error models", "JUnit, Compose UI tests, Espresso", "XCTest, XCUITest", "Fakes vs mocks, test pyramid", "Coverage gates in CI", "Checklist for adding third-party SDKs (size, privacy, security)"],
        tasks: [
          { en: "Add tests to the most important module on each platform", km: "បន្ថែមតេស្តលើ module សំខាន់បំផុត លើ platform នីមួយៗ" },
          { en: "Make CI fail when tests fail", km: "ធ្វើឲ្យ CI បរាជ័យ នៅពេលតេស្តបរាជ័យ" },
          { en: "Review one SDK your app uses with the checklist", km: "ពិនិត្យ SDK មួយដែលកម្មវិធីប្រើ តាម checklist" },
        ],
        proof: { en: "Test strategy document + coverage numbers", km: "ឯកសារយុទ្ធសាស្ត្រតេស្ត + លេខ coverage" },
      },
    ],
  },
  {
    title: { en: "Phase 4 · Lead the unit", km: "ដំណាក់កាលទី 4 · ដឹកនាំក្រុម" },
    months: [
      {
        n: 10,
        title: { en: "Leading & mentoring", km: "ការដឹកនាំ និងការណែនាំ" },
        goal: { en: "Make the whole team better, not only your own code.", km: "ធ្វើឲ្យក្រុមទាំងមូលពូកែជាងមុន មិនមែនតែកូដរបស់អ្នក។" },
        learn: ["Code review: what to look for, how to say it kindly", "Coding standards & Architecture Decision Records (ADR)", "Writing an RFC and running a tech discussion", "1:1s, pairing, giving feedback", "Estimating and splitting work"],
        tasks: [
          { en: "Write the team's code review guide and PR template", km: "សរសេរការណែនាំ code review និង PR template សម្រាប់ក្រុម" },
          { en: "Mentor one junior developer every week", km: "ណែនាំអ្នកអភិវឌ្ឍន៍ថ្មីម្នាក់ រៀងរាល់សប្តាហ៍" },
          { en: "Run one tech discussion with a written RFC", km: "ដឹកនាំការពិភាក្សាបច្ចេកទេសមួយ ជាមួយ RFC ជាលាយលក្ខណ៍អក្សរ" },
        ],
        proof: { en: "A \"Native Mobile Handbook\" for the team", km: "\"សៀវភៅណែនាំ Native Mobile\" សម្រាប់ក្រុម" },
      },
      {
        n: 11,
        title: { en: "Production incidents", km: "Incident ពេលកំពុងប្រើប្រាស់" },
        goal: { en: "Stay calm in an outage and stop it happening again.", km: "នៅស្ងប់ពេលមានបញ្ហាធំ ហើយការពារកុំឲ្យកើតឡើងម្តងទៀត។" },
        learn: ["Severity levels & incident roles", "Timeline, impact, root cause (5 Whys, fishbone)", "Corrective & preventive actions (CAPA)", "Blameless postmortems", "Reporting to management in plain English"],
        tasks: [
          { en: "Write an incident process for the mobile unit", km: "សរសេរដំណើរការដោះស្រាយ incident សម្រាប់ក្រុម mobile" },
          { en: "Write 2 postmortems (a real one, or a past bug)", km: "សរសេរ postmortem 2 (incident ពិត ឬ bug ពីមុន)" },
          { en: "Practise a 5-minute incident update for managers", km: "ហាត់រាយការណ៍ incident 5 នាទី សម្រាប់ថ្នាក់គ្រប់គ្រង" },
        ],
        proof: { en: "Incident process + 2 postmortems", km: "ដំណើរការ incident + postmortem 2" },
      },
      {
        n: 12,
        title: { en: "Show it & apply", km: "បង្ហាញ ហើយដាក់ពាក្យ" },
        goal: { en: "Turn the year into a story a hiring panel believes.", km: "ប្រែក្លាយមួយឆ្នាំនេះ ជារឿងដែលគណៈកម្មការសម្ភាសន៍ជឿ។" },
        learn: ["STAR answers (Situation, Task, Action, Result)", "Mobile system design: \"design a banking app\", \"design a content update system\"", "Presenting to management and vendors", "CV & LinkedIn with numbers"],
        tasks: [
          { en: "Write 4 case studies from your brag document, each with YOUR contribution", km: "សរសេរ case study 4 ពី brag document ដោយបង្ហាញអ្វីដែល \"អ្នក\" បានធ្វើ" },
          { en: "Do 3 mock interviews, at least one in English with a senior engineer", km: "ធ្វើការសម្ភាសន៍សាកល្បង 3 ដង យ៉ាងហោចណាស់ម្តងជាភាសាអង់គ្លេស ជាមួយវិស្វករជាន់ខ្ពស់" },
          { en: "Update your CV and portfolio, then apply", km: "Update CV និង portfolio រួចដាក់ពាក្យ" },
        ],
        proof: { en: "Case studies + updated CV", km: "Case study + CV ថ្មី" },
      },
    ],
  },
];

// Every line of the job post, and the months that cover it.
export const COVERAGE: { req: Bi; months: number[] }[] = [
  { req: { en: "Deep in one native platform, able to review the other", km: "ពូកែ native មួយ ហើយអាច review មួយទៀត" }, months: [1, 2, 3] },
  { req: { en: "Leading, mentoring, code reviews, standards", km: "ដឹកនាំ ណែនាំ code review និងស្តង់ដារ" }, months: [3, 10] },
  { req: { en: "Shipped apps on Android and iOS, with your own contribution", km: "ចេញកម្មវិធីលើ Android និង iOS ជាមួយការចូលរួមផ្ទាល់" }, months: [3, 12] },
  { req: { en: "Lifecycle, state, background, async, memory, storage", km: "Lifecycle, state, background, async, memory, storage" }, months: [1, 2, 3] },
  { req: { en: "WebView, JS bridges, native plugins", km: "WebView, JS bridge, native plugin" }, months: [4] },
  { req: { en: "Downloads, caching, resume, integrity, atomic swap, rollback", km: "ទាញយក cache បន្តទាញ ពិនិត្យ hash ប្តូរ atomic និង rollback" }, months: [5] },
  { req: { en: "Startup, memory, WebView, ANRs on bad networks", km: "Startup, memory, WebView, ANR លើអ៊ីនធឺណិតខ្សោយ" }, months: [6] },
  { req: { en: "Store releases, signing, CI/CD, staged rollout, AppGallery", km: "ចេញលើ store, signing, CI/CD, staged rollout, AppGallery" }, months: [3, 8] },
  { req: { en: "REST, testing, crash monitoring, security, SDKs", km: "REST ការតេស្ត crash monitoring សុវត្ថិភាព និង SDK" }, months: [6, 7, 9] },
  { req: { en: "Incident analysis, root cause, CAPA, reports", km: "វិភាគ incident, root cause, CAPA និងរបាយការណ៍" }, months: [11] },
  { req: { en: "Banking, fintech, payments", km: "ធនាគារ fintech និងការទូទាត់" }, months: [5, 7] },
  { req: { en: "Good English with management and vendors", km: "ភាសាអង់គ្លេសល្អ ជាមួយថ្នាក់គ្រប់គ្រង និងដៃគូ" }, months: [10, 11, 12] },
];

export const HABITS: Bi[] = [
  { en: "Every day: 20 minutes of English (read docs aloud, write your daily update in English).", km: "រាល់ថ្ងៃ៖ ភាសាអង់គ្លេស 20 នាទី (អានឯកសារឲ្យឮៗ សរសេររបាយការណ៍ប្រចាំថ្ងៃជាភាសាអង់គ្លេស)។" },
  { en: "Every week: read one real codebase (Android or iOS open source) for 1 hour.", km: "រាល់សប្តាហ៍៖ អានកូដពិតមួយ (open source Android ឬ iOS) រយៈពេល 1 ម៉ោង។" },
  { en: "Every month: publish one blog post about what you built. Teaching is proof.", km: "រាល់ខែ៖ សរសេរអត្ថបទ blog មួយ ពីអ្វីដែលបានបង្កើត។ ការបង្រៀនគឺជាភស្តុតាង។" },
  { en: "Every quarter: re-score yourself against the job post.", km: "រាល់ត្រីមាស៖ ដាក់ពិន្ទុខ្លួនឯងម្តងទៀត តាមការប្រកាសការងារ។" },
];
