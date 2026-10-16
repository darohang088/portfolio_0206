"use client";

import { apps, education, experience, mascotQuotes, posts, profile, skills, stats, trophies } from "@/data/profile";
import { appsKm, educationKm, experienceKm, mascotQuotesKm, postsKm, profileKm, skillsKm, statsKm, trophiesKm } from "@/data/profile.km";
import { overlay, useLang } from "./index";

const EN = { profile, stats, experience, trophies, skills, education, mascotQuotes, posts, apps };
const KMC: typeof EN = {
  profile: overlay(profile, profileKm),
  stats: overlay(stats, statsKm),
  experience: overlay(experience, experienceKm),
  trophies: overlay(trophies, trophiesKm),
  skills: overlay(skills, skillsKm),
  education: overlay(education, educationKm),
  mascotQuotes: mascotQuotesKm,
  posts: overlay(posts, postsKm),
  apps: overlay(apps, appsKm),
};

// All portfolio content in the current language.
export function useContent() {
  return useLang().lang === "km" ? KMC : EN;
}
