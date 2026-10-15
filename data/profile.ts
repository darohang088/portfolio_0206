// All portfolio content lives here. Edit this file to update the site.

export const profile = {
  name: "Hang Daro",
  firstName: "Hang",
  lastName: "Daro",
  level: "Player 1 · Level 6",
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
  rewards: string[];
  skills?: string[];
  moreSkills?: number;
};

// One entry per company, with every role held there (newest first), like LinkedIn.
export type Company = {
  org: string;
  logo: string;
  employment?: string;
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
        moreSkills: 15,
      },
      {
        title: "Assistant Manager, Android Development",
        dates: "Aug 2022 – Feb 2024",
        duration: "1 yr 7 mos",
        location: "Phnom Penh, Cambodia",
        rewards: ["Managed Android development work, turning business requirements into app features."],
        skills: ["XML", "Communication"],
        moreSkills: 9,
      },
    ],
  },
  {
    org: "UDAYA Technology",
    logo: "/logos/udaya.webp",
    total: "3 yrs",
    months: 36,
    roles: [
      {
        title: "Senior Android Developer",
        dates: "Mar 2021 – Nov 2022",
        duration: "1 yr 9 mos",
        location: "Toul Kork, Phnom Penh, Cambodia",
        rewards: [
          "Launched the Terminal Booking Ticket app from scratch.",
          "Maintained the logistics internal operations app, handling more than 25k transactions a day.",
          "Refactored the codebase from a monolith into a multi-module app.",
          "Released to the Play Store on rotation, and led and mentored the team.",
        ],
      },
      {
        title: "Android Developer",
        dates: "Feb 2020 – Mar 2021",
        duration: "1 yr 2 mos",
        rewards: [
          "Launched the public Logistics app from scratch, now with 100k+ users.",
          "Launched the Vehicle Tracking app from scratch.",
        ],
      },
      {
        title: "Android Developer Intern",
        dates: "Dec 2019 – Feb 2020",
        duration: "3 mos",
        rewards: ["First quest: joined the Android team and shipped my first features."],
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
  "Hi! I'm Droidy, Daro's sidekick.",
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
export type AppItem = {
  slug: string;
  name: string;
  tagline: string;
  description: string[];
  image: string;
  cardImage: string;
  status: string;
  facts: AppFact[];
  links?: { label: string; url: string }[];
};

export const apps: AppItem[] = [
  {
    slug: "tos",
    name: "Tos",
    tagline: "A cheerful blue buddy that waves hello every time you open the app.",
    description: [
      "Tos is my own app. Its star is Tos himself, a round blue character with big eyes and bright green shoes who greets you with a wave.",
      "I'm designing and building it myself, from the first sketch of the character to the release. Screenshots, features and download links will be added here as the app takes shape.",
    ],
    image: "/apps/tos.webp",
    cardImage: "/apps/tos-card.webp",
    status: "In development",
    facts: [
      { label: "Status", value: "In development" },
      { label: "Made by", value: "Hang Daro" },
    ],
  },
];
