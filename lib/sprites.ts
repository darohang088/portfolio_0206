// Pixel-art sprites as text maps: each character is one pixel, "." is transparent.

export type Palette = Record<string, string>;

export const COIN = [
  "..oooo..",
  ".oyyyyo.",
  "oywwyydo",
  "oywyyydo",
  "oywyyydo",
  "oyyyyydo",
  ".oyddddo",
  "..oooo..",
];
export const COIN_PAL: Palette = { o: "#3a2410", y: "#f7c948", w: "#fff3c4", d: "#c98a1e" };

export const STAR = [
  ".....o.....",
  "....oyo....",
  "....oyo....",
  "ooooywyoooo",
  "oyyyywyyyyo",
  ".oyyyyyyyo.",
  "..oyyyyyo..",
  "..oyyoyyo..",
  ".oyyo.oyyo.",
  ".oyo...oyo.",
  ".oo.....oo.",
];

export const RARITY_PAL: Record<"legendary" | "epic" | "rare", Palette> = {
  legendary: { o: "#06071a", y: "#f7c948", w: "#fff3c4" },
  epic: { o: "#06071a", y: "#a98bff", w: "#e2d8ff" },
  rare: { o: "#06071a", y: "#6db3ff", w: "#d6ebff" },
};

export type Face = "open" | "blink" | "happy";

const PHONE_TOP = [
  "....a..........a....",
  ".....a........a.....",
  "..oooooooooooooooo..",
  ".oGGGGGGGGGGGGGGGGo.",
  ".oGGGGGGoooGGGGGGDo.",
  ".oGGGGGGGGGGGGGGGDo.",
  ".oGoooooooooooooGDo.",
];
const PHONE_BOTTOM = [
  ".oGoooooooooooooGDo.",
  ".oGGGGGGGGGGGGGGGDo.",
  ".oGGGGGGoooGGGGGGDo.",
  ".oGGGGGGGGGGGGGGGDo.",
  ".oDDDDDDDDDDDDDDDDo.",
  "..oooooooooooooooo..",
];

export function phone(face: Face): string[] {
  const eyesA = face === "blink" ? "SSSSSSSSSSS" : "SSeeSSSeeSS";
  const eyesB = face === "happy" ? "SeSSeSeSSeS" : "SSeeSSSeeSS";
  const screen = [
    "wwSSSSSSSSS",
    "wSSSSSSSSSS",
    eyesA,
    eyesB,
    "SSSSSSSSSSS",
    "SpSSSSSSSpS",
    "SSeSSSSSeSS",
    "SSSeeeeeSSS",
    "SSSSSSSSSSs",
    "SSSSSSSSSss",
    "sssssssssss",
  ];
  return [...PHONE_TOP, ...screen.map((s) => ".oGo" + s + "oGDo."), ...PHONE_BOTTOM];
}

export const PHONE_PAL: Palette = {
  o: "#1a1530",
  G: "#d8dcf0",
  D: "#9aa0c8",
  S: "#8ff0d4",
  s: "#62c9b0",
  w: "#ffffff",
  e: "#1d2f6b",
  p: "#f58fbf",
  a: "#8bd450",
};
