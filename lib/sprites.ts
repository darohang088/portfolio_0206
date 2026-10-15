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

export const SUN = [
  ".....r.....",
  ".r...r...r.",
  "..r.....r..",
  "....YYY....",
  "...YwwYY...",
  "rr.YwYYY.rr",
  "...YYYYY...",
  "....YYY....",
  "..r.....r..",
  ".r...r...r.",
  ".....r.....",
];
export const SUN_PAL: Palette = { r: "#f59f2a", Y: "#f7c948", w: "#fff3c4" };

// A crescent: a disc with an offset disc cut out of it, plus a small star.
export const MOON = Array.from({ length: 11 }, (_, y) =>
  Array.from({ length: 11 }, (_, x) => {
    if (x === 9 && y === 8) return "s";
    const inMoon = (x - 5) ** 2 + (y - 5) ** 2 <= 5.2 ** 2;
    const cut = (x - 7.5) ** 2 + (y - 3) ** 2;
    if (!inMoon || cut <= 4.3 ** 2) return ".";
    return cut <= 5.6 ** 2 ? "d" : "m";
  }).join(""),
);
export const MOON_PAL: Palette = { m: "#4a4f9a", d: "#7d84c9", s: "#e0a21a" };

// Speech bubble for the message button.
export const BUBBLE = [
  "..ooooooooo..",
  ".owwwwwwwwwo.",
  "owwwwwwwwwwwo",
  "owwwwwwwwwwwo",
  "owwbwwbwwbwwo",
  "owwwwwwwwwwwo",
  "owwwwwwwwwwwo",
  ".owwwwwwwwwo.",
  "..oowoooooo..",
  "...owo.......",
  "...oo........",
];
export const BUBBLE_PAL: Palette = { o: "#1a1030", w: "#ffffff", b: "#1a1030" };

// Daro from behind, from the desk photo: gold-tipped bun, earphone, black patterned shirt.
export const DARO = [
  "......kkkk......",
  ".....kgggGk.....",
  "....kgggGGGk....",
  ".....kgGGGk.....",
  "......kkkk......",
  "....kkHgGHkk....",
  "...kHHhgGhHHk...",
  "..kHhhhhghhhHk..",
  "..khhhhhhhhhhk..",
  ".ksshhhhhhhhssk.",
  ".ksShhhhhhhhSek.",
  "..kkhhhhhhhhkek.",
  "....kSssssSk....",
  "..kkwwSssSwwkk..",
  ".kbbbwwwwwwbbbk.",
  "kbpbbbbppbbbbpbk",
  "kbbbpbbbbbbpbbbk",
  "kbpbbbbpbbbbbpbk",
];
export const DARO_PAL: Palette = {
  k: "#1a1030",
  g: "#f6c453",
  G: "#c98a1e",
  h: "#2e2640",
  H: "#4a3f5e",
  s: "#c98b5e",
  S: "#9c623f",
  w: "#eef0ff",
  e: "#eef0ff",
  b: "#2b2838",
  p: "#55506a",
};
