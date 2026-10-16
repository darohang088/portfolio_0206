// "Player level" = full years since Daro's first Android job; XP = progress through the current year.
// Levels up on its own every December.
export const CAREER_START = new Date(2019, 11, 1); // Dec 2019, Android intern at UDAYA

export function playerLevel(now = new Date()) {
  const months = (now.getFullYear() - CAREER_START.getFullYear()) * 12 + now.getMonth() - CAREER_START.getMonth();
  const level = Math.max(1, Math.floor(months / 12));
  const xp = Math.round(((months % 12) / 12) * 100);
  return { level, xp, years: Math.floor(months / 12), months: months % 12 };
}
