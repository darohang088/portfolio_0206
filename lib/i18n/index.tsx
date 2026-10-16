"use client";

// English is the default; Khmer is a full alternate. Text goes through t("English text"),
// which looks it up in lib/i18n/km.ts. Missing entries fall back to English.

import { createContext, Fragment, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { KM, KM_PATTERNS } from "./km";

export type Lang = "en" | "km";
type Vars = Record<string, string | number>;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function translate(lang: Lang, text: string, vars?: Vars): string {
  let out = text;
  if (lang === "km") {
    const hit = KM[text];
    if (hit !== undefined) out = hit;
    else
      for (const [re, km] of KM_PATTERNS) {
        const m = re.exec(text);
        if (m) {
          out = km.replace(/\$(\d)/g, (_, i: string) => m[Number(i)] ?? "");
          break;
        }
      }
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? String(vars[k]) : all));
  return out;
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // The inline script in the layout already set <html lang>; pick it up after hydration.
  useEffect(() => {
    if (document.documentElement.lang === "km") setLangState("km");
  }, []);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem("lang", l);
    } catch {}
    document.documentElement.lang = l;
    setLangState(l);
  }, []);

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(Ctx);
  const t = useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);
  // Like t(), but {name} placeholders can be React elements (for <em>, links…).
  const tr = useCallback(
    (text: string, parts: Record<string, ReactNode>) =>
      translate(lang, text)
        .split(/(\{\w+\})/)
        .map((p, i) => {
          const k = /^\{(\w+)\}$/.exec(p)?.[1];
          return <Fragment key={i}>{k && k in parts ? parts[k] : p}</Fragment>;
        }),
    [lang],
  );
  return { lang, setLang, t, tr };
}

// Overlay translated data onto the English original: same shape, arrays matched by position.
export function overlay<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base)) return base.map((b, i) => overlay(b, (over as unknown[])[i])) as T;
  if (typeof base === "object" && base !== null) {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [k, v] of Object.entries(over as Record<string, unknown>)) out[k] = overlay(out[k], v);
    return out as T;
  }
  return over as T;
}
