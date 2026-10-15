// Backgrounds for the hero, picked from the Theme menu.
// To add one: put a picture in public/themes/ and add an "image" entry with its
// src (the full background) and thumb (a small preview for the menu).
export type HeroTheme =
  | { id: string; name: string; thumb: string; kind: "scene"; scene: "riverside" }
  | { id: string; name: string; thumb: string; kind: "image"; src: string };

export const heroThemes: HeroTheme[] = [
  { id: "riverside", name: "Phnom Penh Riverside", thumb: "/themes/riverside-thumb.webp", kind: "scene", scene: "riverside" },
];

export const DEFAULT_HERO_THEME = heroThemes[0];
