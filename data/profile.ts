// All portfolio content lives here. Edit this file to update the site.

export const profile = {
  name: "Hang Daro",
  firstName: "Hang",
  lastName: "Daro",
  roles: [
    "Android Development Engineer",
    "Flutter & Native Developer",
    "Merchant Development",
    "Data Analytics",
  ],
  summary:
    "I'm an Android Development Engineer in Phnom Penh, building with Flutter and native Android. I handle the whole journey: understanding what users need, writing the code, testing it and documenting it. I care about apps that feel smooth and run efficiently.",
  companies: [
    { name: "Prince Bank", logo: "/logos/prince-bank.webp" },
    { name: "UDAYA Technology", logo: "/logos/udaya.webp" },
  ],
  email: "darohang009988@gmail.com",
  linkedin: {
    label: "linkedin.com/in/hang-daro-9386b01b5",
    url: "https://www.linkedin.com/in/hang-daro-9386b01b5",
  },
  location: "Tuol Kouk, Phnom Penh, Cambodia",
};

export type Stat = { value: number; suffix: string; label: string };

export const stats: Stat[] = [
  { value: 100, suffix: "k+", label: "users on a logistics app I built from scratch" },
  { value: 25, suffix: "k+", label: "transactions a day through an app I maintained" },
  { value: 6, suffix: "+", label: "years shipping Android apps, since 2019" },
  { value: 3, suffix: "", label: "apps launched from a blank project" },
];

export type Role = {
  title: string;
  dates: string;
  duration: string;
  location?: string;
  summary?: string;
  // Either a plain list of highlights, or titled groups like "Key responsibilities".
  rewards?: string[];
  sections?: { title: string; items: string[] }[];
  // Skills for this role. If LinkedIn lists more than are written here, set skillTotal.
  skills?: string[];
  skillTotal?: number;
};

// One entry per company, with every role held there (newest first), like LinkedIn.
// Colour group for each skill chip: tech, tools or teamwork.
export const skillKinds: Record<string, "tech" | "tool" | "team"> = {
  XML: "tech",
  "Object-Oriented Programming (OOP)": "tech",
  Firebase: "tech",
  Flutter: "tech",
  Android: "tech",
  "Unit Testing": "tech",
  SQLite: "tech",
  Java: "tech",
  Kotlin: "tech",
  "Power BI": "tool",
  "Agile & Waterfall Methodologies": "team",
  Communication: "team",
  "Team Development": "team",
};

export type Company = {
  org: string;
  logo: string;
  employment?: string;
  workplace?: string;
  total: string;
  months: number;
  latest?: boolean;
  roles: Role[];
};

export const experience: Company[] = [
  {
    org: "Prince Bank Plc.",
    logo: "/logos/prince-bank.webp",
    employment: "Full-time",
    total: "3 yrs 6 mos",
    months: 42,
    latest: true,
    roles: [
      {
        title: "Android Development Engineer",
        dates: "Feb 2024 – Jan 2026",
        duration: "2 yrs",
        rewards: [
          "Designed, built and improved the bank's Android apps across the full cycle, from user needs to code, tests and documentation.",
          "Worked on merchant development for the bank's mobile products.",
        ],
        skills: ["Agile & Waterfall Methodologies", "Object-Oriented Programming (OOP)"],
        skillTotal: 17,
      },
      {
        title: "Assistant Manager, Android Development",
        dates: "Aug 2022 – Feb 2024",
        duration: "1 yr 7 mos",
        location: "Phnom Penh, Cambodia",
        rewards: ["Managed Android development work, turning business requirements into app features."],
        skills: [
          "XML",
          "Communication",
          "Object-Oriented Programming (OOP)",
          "Power BI",
          "Agile & Waterfall Methodologies",
          "Firebase",
          "Flutter",
          "Android",
          "Unit Testing",
          "Team Development",
          "SQLite",
        ],
      },
    ],
  },
  {
    org: "UDAYA Technology Co., Ltd.",
    logo: "/logos/udaya.webp",
    employment: "Full-time",
    workplace: "On-site",
    total: "3 yrs",
    months: 36,
    roles: [
      {
        title: "Senior Android Developer",
        dates: "Mar 2021 – Nov 2022",
        duration: "1 yr 9 mos",
        location: "1st Floor, #3, St 259, Sangkat Teuk Laak 1, Khan Toul Kork, Phnom Penh, Cambodia",
        sections: [
          {
            title: "Key responsibilities",
            items: [
              "Worked closely with project managers, designers and the QA team to build new project features.",
              "Kept project dependencies up to date.",
              "Refactored the codebase from a monolithic app into a multi-module application.",
              "Released the project to the Play Store on a rotation.",
            ],
          },
          {
            title: "Key accomplishments",
            items: [
              "Launched the Terminal Booking Ticket app from scratch.",
              "Maintained and updated the Logistic Internal Operation App, which handles more than 25k transactions a day.",
              "Found innovative ideas and built proofs of concept to match project requirements.",
              "Led and mentored the team.",
            ],
          },
        ],
      },
      {
        title: "Android Developer",
        dates: "Feb 2020 – Mar 2021",
        duration: "1 yr 2 mos",
        summary: "Built new features to improve the user experience of the Logistic Internal App and the public app.",
        sections: [
          {
            title: "Key accomplishments",
            items: ["Launched the Logistic App from scratch, now with 100k+ users.", "Launched the Vehicle Tracking App from scratch."],
          },
        ],
      },
      {
        title: "Android Developer Intern",
        dates: "Dec 2019 – Feb 2020",
        duration: "3 mos",
        skills: ["Java", "Kotlin"],
      },
    ],
  },
];

export type Rarity = "legendary" | "epic" | "rare";

export type Trophy = { rarity: Rarity; title: string; text: string; tags: string[] };

export const trophies: Trophy[] = [
  {
    rarity: "legendary",
    title: "Logistics App",
    text: "A public logistics app I built from scratch. It now has more than 100,000 users.",
    tags: ["Android", "From scratch", "100k+ users"],
  },
  {
    rarity: "epic",
    title: "Logistics Operations App",
    text: "An internal operations app I maintained and updated, handling more than 25,000 transactions a day.",
    tags: ["Android", "Internal", "25k+/day"],
  },
  {
    rarity: "epic",
    title: "Multi-module Refactor",
    text: "Moved a monolithic Android codebase to a multi-module app, so features build and ship independently.",
    tags: ["Architecture", "Gradle modules"],
  },
  {
    rarity: "rare",
    title: "Vehicle Tracking App",
    text: "A vehicle tracking app built from a blank project.",
    tags: ["Android", "From scratch"],
  },
  {
    rarity: "rare",
    title: "Terminal Booking Ticket",
    text: "A ticket booking app for terminals, launched from scratch.",
    tags: ["Android", "From scratch"],
  },
  {
    rarity: "rare",
    title: "Team Mentor",
    text: "Led and mentored Android developers at UDAYA, and ran Play Store releases on rotation.",
    tags: ["Leadership", "Releases"],
  },
];

// Levels are out of 10.
export type Skill = { name: string; kind: string; level: number };

export const skills: Skill[] = [
  { name: "Android (Native)", kind: "Platform", level: 9 },
  { name: "Flutter & Dart", kind: "Cross-platform", level: 8 },
  { name: "Kotlin & Java", kind: "Languages", level: 8 },
  { name: "Multi-module Architecture", kind: "Architecture", level: 8 },
  { name: "Play Store Releases", kind: "Shipping", level: 9 },
  { name: "Requirements Gathering", kind: "Product", level: 8 },
  { name: "Business Requirements", kind: "Product", level: 8 },
  { name: "Merchant Development", kind: "Banking", level: 7 },
  { name: "Data Analytics", kind: "Data", level: 6 },
  { name: "Testing & Documentation", kind: "Quality", level: 7 },
  { name: "Team Leading & Mentoring", kind: "Leadership", level: 7 },
  { name: "Working with PM, Design & QA", kind: "Teamwork", level: 9 },
];

export type SavePoint = { tag: string; title: string; school: string; years: string; logo: string };

export const education: SavePoint[] = [
  {
    tag: "Latest save",
    title: "Master's degree, Computer Science",
    school: "University of Puthisastra",
    years: "2023 – 2026",
    logo: "/logos/puthisastra.webp",
  },
  {
    tag: "Saved",
    title: "Bachelor of Management Information Systems",
    school: "SETEC Institute",
    years: "2017 – 2022",
    logo: "/logos/setec.webp",
  },
  {
    tag: "Saved",
    title: "General Education",
    school: "BELTEI International School",
    years: "2012 – 2016",
    logo: "/logos/beltei.webp",
  },
];

export const mascotQuotes = [
  "Hi! I'm Dororo, Daro's sidekick.",
  "Daro has shipped Android apps since 2019.",
  "100k+ people use an app Daro built from scratch!",
  "Daro speaks Flutter and native Android.",
  "Scroll down for the quest log!",
];

// Blog posts. Posts without a `url` show as "Coming soon".
// When a post is published, add its link as `url` and it becomes clickable.
export type Post = { title: string; summary: string; tag: string; url?: string };

export const posts: Post[] = [
  {
    title: "Senior Officer, IT Native Mobile Development",
    summary: "Route to becoming an experienced Senior Officer, IT Native Mobile Development: lead the Native Mobile Unit and take end-to-end technical ownership of Android and iOS apps. A step-by-step plan for one year.",
    tag: "Career",
    url: "/blog/native-mobile-lead-roadmap",
  },
  {
    title: "Moving an Android app from monolith to multi-module",
    summary: "What changed for build times, team ownership and releases after splitting the codebase.",
    tag: "Architecture",
  },
  {
    title: "Shipping a logistics app to 100k users",
    summary: "Lessons from building a public Android app from a blank project to a large user base.",
    tag: "Android",
  },
  {
    title: "Flutter or native: how I choose for a new app",
    summary: "The questions I ask before picking Flutter or native Android for a project.",
    tag: "Flutter",
  },
];

// Apps shown under "My App". Each one gets a card and its own page at /apps/<slug>.
export type AppFact = { label: string; value: string };
export type AppFeature = { title: string; text: string };
export type AppScreen = { src: string; full: string; alt: string };
export type AppItem = {
  slug: string;
  name: string;
  localName?: string;
  meaning?: string;
  tagline: string;
  cardText: string;
  description: string[];
  image: string;
  cardImage: string;
  status?: string;
  facts: AppFact[];
  features: AppFeature[];
  screens: AppScreen[];
  links?: { label: string; url: string }[];
};

export const apps: AppItem[] = [
  {
    slug: "merchant",
    name: "Merchant",
    tagline: "A point-of-sale app for owners who run several shops: cashiers, QR payments and live revenue in one place.",
    cardText: "Point-of-sale for multi-shop owners, with PIN-secured cashiers, QR payments and live analytics.",
    description: [
      "Merchant is a point-of-sale and merchant management app. Owners run several businesses and all their shops and branches from one place.",
      "They assign PIN-secured cashiers to specific counters, take payments by QR code, and follow revenue on a real-time dashboard that shows top shops, peak hours and the mix of payment methods.",
      "It's built with Flutter and Dart for iOS, Android and the web, with Riverpod for state, Supabase for the backend, go_router for navigation and fl_chart for the charts. It's in development and being tested on iOS.",
    ],
    image: "/apps/merchant.webp",
    cardImage: "/apps/merchant-card.webp",
    status: "In development",
    facts: [
      { label: "Status", value: "In development, testing on iOS" },
      { label: "Platforms", value: "iOS, Android & web" },
      { label: "Built with", value: "Flutter & Dart" },
      { label: "State", value: "Riverpod" },
      { label: "Backend", value: "Supabase (Postgres + Auth)" },
      { label: "Routing", value: "go_router" },
      { label: "Charts", value: "fl_chart" },
      { label: "Languages", value: "Khmer, English, Chinese & Vietnamese" },
      { label: "Made by", value: "Hang Daro" },
    ],
    features: [
      { title: "Multi-business management", text: "Owners manage several businesses and all their shops and branches in one place." },
      { title: "Cashiers and counters", text: "Assign cashiers to specific counters, each signing in with their own PIN." },
      { title: "QR-code payments", text: "Take payments by QR code at the counter." },
      { title: "Real-time analytics", text: "A live dashboard of revenue, top shops, peak hours and payment methods." },
      { title: "Secure accounts and data", text: "Sign-in and data handled by Supabase, with Postgres and Supabase Auth." },
      { title: "Four languages", text: "Khmer by default, plus English, Chinese and Vietnamese." },
    ],
    screens: [],
  },
  {
    slug: "tos",
    name: "Tos",
    localName: "តោះ",
    meaning: "Let's go!",
    tagline: "Find your squad tonight. A social activity app for Cambodian Gen Z.",
    cardText: "Find people to play futsal, grab coffee, game or travel with tonight.",
    description: [
      "Tos (តោះ, “Let's go!”) is a social activity app for Cambodian Gen Z. It helps you find people to play futsal, grab coffee, game or travel with tonight.",
      "You join in one tap, chat with your squad, and pay your share with KHQR. Tos holds the money safely until the activity really happens.",
      "It's a mobile app for Android and iOS, built with Flutter from one codebase. It's in design and pre-launch now, and coming soon in Phnom Penh.",
    ],
    image: "/apps/tos.webp",
    cardImage: "/apps/tos-card.webp",
    status: "Coming soon",
    facts: [
      { label: "Status", value: "Design & pre-launch" },
      { label: "Launch", value: "Phnom Penh, coming soon" },
      { label: "Platforms", value: "Android & iOS" },
      { label: "Built with", value: "Flutter" },
      { label: "Payments", value: "KHQR" },
      { label: "Languages", value: "Khmer & English" },
      { label: "Made by", value: "Hang Daro" },
    ],
    features: [
      { title: "Who's down tonight", text: "See which friends are free and join their plans." },
      { title: "Nearby activities", text: "A feed and live map of futsal, badminton, coffee, MLBB and trips near you." },
      { title: "Join in one tap", text: "Tap “Tos!” to join open plans instantly, or send a request for small groups and trips that the host approves." },
      { title: "KHQR payments with escrow", text: "Pay your share with KHQR. Tos holds the money until the host checks in, with a full automatic refund if the host doesn't show." },
      { title: "Squad chat", text: "A group chat for every activity, with a message guard against harmful messages." },
      { title: "Check-ins and reliability", text: "GPS check-in for players and hosts, plus a reliability score that rewards people who show up." },
      { title: "Safety tools", text: "Verified profiles, women-only plans, share-my-plan, a safety timer and SOS." },
      { title: "Hosting tools", text: "Create a plan in 4 steps, with waitlists, earnings and payouts, and Host Pro for clubs." },
      { title: "Fun extras", text: "Streaks, XP, crews, leaderboards and shareable recap stories." },
      { title: "Khmer and English", text: "Use the app in either language, with prices in riel or dollars." },
    ],
    screens: [
      { src: "/apps/tos-screen-1.webp", full: "/apps/tos-screen-1-full.webp", alt: "Find your squad tonight: home feed of what's happening in Phnom Penh" },
      { src: "/apps/tos-screen-2.webp", full: "/apps/tos-screen-2-full.webp", alt: "Join in one tap: activity detail with spots, price and bring-a-friend" },
      { src: "/apps/tos-screen-3.webp", full: "/apps/tos-screen-3-full.webp", alt: "Pay safely with KHQR: payment screen with escrow and full refund on host no-show" },
      { src: "/apps/tos-screen-4.webp", full: "/apps/tos-screen-4-full.webp", alt: "See who's free tonight: friends who are down and the weekly leaderboard" },
      { src: "/apps/tos-screen-5.webp", full: "/apps/tos-screen-5-full.webp", alt: "Stay safe at every meetup: safety centre with verification, check-in timer and SOS" },
    ],
  },
];
