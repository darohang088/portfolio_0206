// Store Listing Checker: checks Google Play store listing text and graphics against Play's
// metadata policy and graphic asset specs, in the browser.

export type Level = "error" | "warn" | "pass";
export type Issue = { field: Field; level: Level; title: string; detail: string; hits?: string[] };
export type Field = "title" | "short" | "full" | "icon" | "feature" | "screens";

export const LIMITS = { title: 30, short: 80, full: 4000 } as const;

// Play counts characters, not bytes: an emoji is one character.
export const charCount = (s: string) => [...s].length;

const EMOJI = /\p{Extended_Pictographic}/gu;
// "top" only as a ranking ("top 10", "top rated"), so names like "Mobile Top Up" aren't flagged.
const RANKING = /(#\s?1\b|\b(best|no\.?\s?1|number\s+one|top\s+(\d+|rated|ranked|app|apps)|top-rated|ranked|award[- ]winning|most\s+popular)\b)/gi;
const PROMO = /\b(free|sale|discount|cheap|promo|limited\s+time|\d+\s?%\s?off|bonus|cashback|no\s+ads|ad[- ]free)\b/gi;
const CTA = /\b(download|install|get\s+it|play|try|update)\s+(now|today|free)\b/gi;
const GUARANTEE = /\b(guaranteed\s+(income|profit|returns?|approval|loan)|instant(ly)?\s+(money|cash|loan|approval)|earn\s+(money|cash)\s+fast|get\s+rich|cures?\s+\w+|miracle|hack(s|ed)?|cheats?|unlimited\s+(coins|gems|money))\b/gi;
const OTHER_STORES = /\b(app\s*store|apple\s+store|apkpure|apkmirror|aptoide|uptodown|huawei\s+appgallery|galaxy\s+store|download\s+(the\s+)?apk)\b/gi;
// Well-known brands only (not ordinary words like "line" or "zoom"). Fine when it's your own brand.
const BRANDS = /\b(google\s+play|google|android|youtube|whatsapp|facebook|instagram|tiktok|telegram|netflix|chatgpt|openai|spotify|snapchat|wechat|viber|aba\s+bank|acleda|wing\s+bank|bakong)\b/gi;
const TESTIMONIAL = /(★{3,}|\b\d\s?stars?\b|"[^"]{10,}"\s*[-–—]\s*\w+|“[^”]{10,}”\s*[-–—]\s*\w+)/gi;
const STOP = new Set(
  "a an and are as at be by for from has have in into is it its of on or our that the their this to was were will with you your we us can more all any app apps one also not use using get my me i so if than then there these they which who what when where how about up out".split(" "),
);

const uniq = (a: string[]) => [...new Set(a.map((x) => x.trim()).filter(Boolean))];
const matches = (s: string, re: RegExp) => uniq(s.match(re) ?? []);

function capsRatio(s: string) {
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters.length < 6) return 0;
  return letters.replace(/[^A-Z]/g, "").length / letters.length;
}

export function checkText(title: string, short: string, full: string): Issue[] {
  const out: Issue[] = [];
  const add = (i: Issue) => out.push(i);

  // ---- lengths ----
  const lens: [Field, string, string][] = [
    ["title", title, "App name"],
    ["short", short, "Short description"],
    ["full", full, "Full description"],
  ];
  for (const [field, text, name] of lens) {
    const n = charCount(text);
    const max = LIMITS[field as keyof typeof LIMITS];
    if (!text.trim()) add({ field, level: "error", title: `${name} is empty`, detail: `Google Play requires it (up to ${max} characters).` });
    else if (n > max) add({ field, level: "error", title: `${name} is too long: ${n}/${max}`, detail: `Play Console won't save more than ${max} characters. Cut ${n - max}.` });
  }

  // ---- app name ----
  if (title.trim()) {
    const emoji = matches(title, EMOJI);
    if (emoji.length) add({ field: "title", level: "error", title: "Emoji in the app name", detail: "Play's metadata policy doesn't allow emojis or emoticons in the app name.", hits: emoji });
    const rank = matches(title, RANKING);
    if (rank.length) add({ field: "title", level: "error", title: "Ranking or performance claim in the name", detail: 'Words like "best", "#1" or "top" aren\'t allowed in the app name (they suggest a ranking Play doesn\'t give).', hits: rank });
    const promo = matches(title, PROMO);
    if (promo.length) add({ field: "title", level: "error", title: "Promotional words in the name", detail: 'Price and promotion words ("free", "sale", "no ads", "50% off"…) aren\'t allowed in the app name.', hits: promo });
    const cta = matches(title, CTA);
    if (cta.length) add({ field: "title", level: "error", title: "Call to action in the name", detail: 'Phrases like "download now" or "install now" aren\'t allowed in the app name.', hits: cta });
    if (/([!?.*~_=+|#$-])\1{1,}|[!?]{2,}/.test(title)) add({ field: "title", level: "error", title: "Repeated special characters", detail: "Repeated symbols (!!, ***, ~~) aren't allowed in the app name." });
    if (capsRatio(title) > 0.7 && /[A-Z]{4,}/.test(title)) add({ field: "title", level: "warn", title: "App name in ALL CAPS", detail: "Capital letters are only allowed when they're part of your brand name." });
    const seps = (title.match(/[|,;:•·–—-]/g) ?? []).length;
    if (seps >= 2) add({ field: "title", level: "warn", title: "Looks like a keyword list", detail: "Several separators (| , - :) in the name read like keyword stuffing. Use your app's name, with at most a short description after it." });
    const brands = matches(title, BRANDS);
    if (brands.length) add({ field: "title", level: "warn", title: "Another brand in the app name", detail: "Using another company's brand in the name can be seen as impersonation, unless it's yours or you have permission.", hits: brands });
  }

  // ---- short description ----
  if (short.trim()) {
    const rank = matches(short, RANKING);
    if (rank.length) add({ field: "short", level: "warn", title: "Ranking claim in the short description", detail: 'Avoid "best", "#1" or "top" unless you can attribute it (for example an award with its name and year).', hits: rank });
    const cta = matches(short, CTA);
    if (cta.length) add({ field: "short", level: "warn", title: "Call to action in the short description", detail: 'Describe what the app does instead of "download now".', hits: cta });
    const emoji = short.match(EMOJI) ?? [];
    if (emoji.length > 1) add({ field: "short", level: "warn", title: `${emoji.length} emojis in the short description`, detail: "Emojis aren't banned here, but more than one looks spammy and reviewers may flag it.", hits: uniq(emoji) });
    const promoShort = matches(short, /\b(\d+\s?%\s?off|limited\s+time|today\s+only|sale\s+ends|price\s+drop)\b/gi);
    if (promoShort.length) add({ field: "short", level: "warn", title: "Time-limited promotion", detail: "Sales and discounts go out of date and can read as misleading. Use Play's promotional content for offers.", hits: promoShort });
    if (capsRatio(short) > 0.6) add({ field: "short", level: "warn", title: "Mostly capital letters", detail: "Write it in normal sentence case." });
  }

  // ---- full description ----
  if (full.trim()) {
    const words = full.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
    const counts = new Map<string, number>();
    for (const w of words) if (w.length > 2 && !STOP.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
    const total = words.length || 1;
    // Words from the app name naturally repeat, so they get a higher limit.
    const inName = new Set(title.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []);
    const stuffed = [...counts.entries()].filter(([w, n]) => (inName.has(w) ? n >= 8 && n / total > 0.06 : n >= 6 && n / total > 0.03)).sort((a, b) => b[1] - a[1]);
    if (stuffed.length) add({ field: "full", level: "warn", title: "Keyword repetition", detail: "These words repeat a lot. Play's metadata policy treats excessive repetition as keyword stuffing.", hits: stuffed.slice(0, 6).map(([w, n]) => `${w} × ${n}`) });
    const lists = full.split(/\n/).filter((line) => (line.match(/,/g) ?? []).length >= 8 && line.split(",").every((x) => x.trim().split(/\s+/).length <= 3));
    if (lists.length) add({ field: "full", level: "warn", title: "Keyword list", detail: "A long comma-separated list of short words looks like keyword stuffing. Write sentences instead.", hits: lists.slice(0, 2).map((l) => l.slice(0, 80) + (l.length > 80 ? "…" : "")) });
    const testi = matches(full, TESTIMONIAL);
    if (testi.length) add({ field: "full", level: "warn", title: "User testimonials or star ratings", detail: "Unattributed or anonymous reviews (\"Great app!\" - John, ★★★★★) aren't allowed in the description.", hits: testi.slice(0, 4) });
    const rank = matches(full, RANKING);
    if (rank.length) add({ field: "full", level: "warn", title: "Ranking or performance claims", detail: "Claims like \"#1\" or \"best\" need a source. Remove them or say who gave the award and when.", hits: rank });
    const guar = matches(full, GUARANTEE);
    if (guar.length) add({ field: "full", level: "error", title: "Misleading or risky claims", detail: "Guarantees, \"instant money\", health cures, hacks and cheats are flagged as deceptive or harmful content.", hits: guar });
    const stores = matches(full, OTHER_STORES);
    if (stores.length) add({ field: "full", level: "warn", title: "Mentions other app stores or APK downloads", detail: "Don't point users to other stores or direct APK downloads from your Play listing.", hits: stores });
    const promo = matches(full, /\b(\d+\s?%\s?off|limited\s+time|sale\s+ends|today\s+only|price\s+drop)\b/gi);
    if (promo.length) add({ field: "full", level: "warn", title: "Time-limited promotions", detail: "Prices and sales go out of date and can be seen as misleading. Use Play's promotional content (LiveOps) for offers instead.", hits: promo });
    const emojis = full.match(EMOJI) ?? [];
    if (emojis.length > 15) add({ field: "full", level: "warn", title: `${emojis.length} emojis`, detail: "A few emojis as bullet points are fine. This many looks spammy." });
    if (capsRatio(full) > 0.5) add({ field: "full", level: "warn", title: "Lots of capital letters", detail: "Write the description in normal sentence case." });
    if (charCount(full) < 250) add({ field: "full", level: "warn", title: "Very short description", detail: "Explain what the app does, its main features and who it's for. It helps reviewers and search." });
  }

  if (!out.some((i) => i.field === "title" && i.level !== "pass") && title.trim()) add({ field: "title", level: "pass", title: "App name looks fine", detail: "No policy problems found." });
  if (!out.some((i) => i.field === "short" && i.level !== "pass") && short.trim()) add({ field: "short", level: "pass", title: "Short description looks fine", detail: "No policy problems found." });
  if (!out.some((i) => i.field === "full" && i.level !== "pass") && full.trim()) add({ field: "full", level: "pass", title: "Full description looks fine", detail: "No policy problems found." });
  return out;
}

// ---------- graphics ----------
export type ImageInfo = { name: string; type: string; size: number; width: number; height: number; alpha: boolean; cornersTransparent: boolean; url: string };

// Does a PNG have an alpha channel? Colour type 4/6, or a tRNS chunk.
function pngAlpha(b: Uint8Array): boolean {
  if (b.length < 33 || b[0] !== 0x89 || b[1] !== 0x50) return false;
  const colorType = b[25];
  if (colorType === 4 || colorType === 6) return true;
  let p = 8;
  while (p + 8 <= b.length) {
    const len = (b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3];
    const type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
    if (type === "tRNS") return true;
    if (type === "IDAT" || type === "IEND") break;
    p += 12 + len;
  }
  return false;
}

export async function readImage(file: File): Promise<ImageInfo> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const type = isPng ? "PNG" : isJpeg ? "JPEG" : file.type.replace("image/", "").toUpperCase() || "unknown";
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  let cornersTransparent = false;
  if (isPng && pngAlpha(bytes)) {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    const w = c.width - 1;
    const h = c.height - 1;
    cornersTransparent = [g.getImageData(0, 0, 1, 1), g.getImageData(w, 0, 1, 1), g.getImageData(0, h, 1, 1), g.getImageData(w, h, 1, 1)].some((d) => d.data[3] < 250);
  }
  return { name: file.name, type, size: file.size, width: img.naturalWidth, height: img.naturalHeight, alpha: isPng && pngAlpha(bytes), cornersTransparent, url };
}

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export function checkIcon(i: ImageInfo): Issue[] {
  const out: Issue[] = [];
  const add = (level: Level, title: string, detail: string) => out.push({ field: "icon", level, title, detail });
  if (i.type !== "PNG") add("error", `Icon is ${i.type}, not PNG`, "The Play Store icon must be a 32-bit PNG.");
  if (i.width !== 512 || i.height !== 512) add("error", `Icon is ${i.width} × ${i.height}`, "It must be exactly 512 × 512 pixels.");
  if (i.size > 1024 * 1024) add("error", `Icon is ${kb(i.size)}`, "The maximum is 1 MB.");
  if (i.type === "PNG" && !i.alpha) add("warn", "Icon is a 24-bit PNG", "Google asks for a 32-bit PNG (with an alpha channel). Export it as 32-bit / RGBA.");
  if (i.cornersTransparent) add("warn", "Transparent corners", "Google Play adds the rounded corners and shadow itself. Use a full square with a solid background, or the icon gets a double frame.");
  if (!out.length) add("pass", "Icon meets the specs", "512 × 512, 32-bit PNG, under 1 MB, full square.");
  return out;
}

export function checkFeature(i: ImageInfo): Issue[] {
  const out: Issue[] = [];
  const add = (level: Level, title: string, detail: string) => out.push({ field: "feature", level, title, detail });
  if (i.type !== "PNG" && i.type !== "JPEG") add("error", `Feature graphic is ${i.type}`, "Use a JPEG or a 24-bit PNG.");
  if (i.width !== 1024 || i.height !== 500) add("error", `Feature graphic is ${i.width} × ${i.height}`, "It must be exactly 1024 × 500 pixels.");
  if (i.alpha) add("error", "Feature graphic has transparency", "Play needs a 24-bit PNG (no alpha) or a JPEG. Flatten it onto a background.");
  if (i.size > 15 * 1024 * 1024) add("error", `Feature graphic is ${kb(i.size)}`, "The maximum is 15 MB.");
  if (!out.length) add("pass", "Feature graphic meets the specs", "1024 × 500, no transparency.");
  return out;
}

export function checkScreens(list: ImageInfo[]): Issue[] {
  const out: Issue[] = [];
  const add = (level: Level, title: string, detail: string, hits?: string[]) => out.push({ field: "screens", level, title, detail, hits });
  if (list.length < 2) add("error", `${list.length} phone screenshot${list.length === 1 ? "" : "s"}`, "Google Play needs at least 2 phone screenshots (up to 8).");
  if (list.length > 8) add("error", `${list.length} phone screenshots`, "You can upload at most 8 phone screenshots.");
  const bad = (pred: (i: ImageInfo) => boolean) => list.filter(pred).map((i) => `${i.name} (${i.width} × ${i.height})`);
  const format = bad((i) => i.type !== "PNG" && i.type !== "JPEG");
  if (format.length) add("error", "Wrong file type", "Screenshots must be JPEG or 24-bit PNG.", format);
  const alpha = bad((i) => i.alpha);
  if (alpha.length) add("error", "Screenshots with transparency", "Use JPEG or a 24-bit PNG without alpha.", alpha);
  const small = bad((i) => Math.min(i.width, i.height) < 320);
  if (small.length) add("error", "Too small", "Each side must be at least 320 pixels.", small);
  const big = bad((i) => Math.max(i.width, i.height) > 3840);
  if (big.length) add("error", "Too big", "Each side must be at most 3840 pixels.", big);
  const ratio = bad((i) => Math.max(i.width, i.height) > 2 * Math.min(i.width, i.height));
  if (ratio.length) add("error", "Too long and thin", "The long side can't be more than twice the short side (2:1). Very tall phone screenshots need cropping or padding.", ratio);
  const heavy = list.filter((i) => i.size > 8 * 1024 * 1024).map((i) => `${i.name} (${kb(i.size)})`);
  if (heavy.length) add("error", "File too large", "Each screenshot must be 8 MB or less.", heavy);
  const sizes = new Set(list.map((i) => `${i.width}x${i.height}`));
  if (list.length >= 2 && sizes.size > 1) add("warn", "Screenshots have different sizes", "Mixed sizes look untidy in the store. Export them all at the same size.", [...sizes]);
  const hiRes = list.filter((i) => Math.min(i.width, i.height) >= 1080).length;
  if (list.length >= 2 && hiRes < 4) add("warn", "Not eligible for featured spots", "To be shown in Play's recommendations and promotions, add at least 4 screenshots that are 1080 pixels or more on the short side (16:9 or 9:16).");
  if (!out.length) add("pass", `${list.length} screenshots meet the specs`, "Right size, ratio and format.");
  return out;
}
