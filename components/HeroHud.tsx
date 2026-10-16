"use client";

import { useEffect, useState } from "react";
import { playerLevel } from "@/lib/level";
import { useLang } from "@/lib/i18n";

const BLOCKS = 18;
const TZ = "Asia/Phnom_Penh";

function phnomPenhNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return { time: `${String(h).padStart(2, "0")}:${m}`, awake: h >= 8 && h < 23 };
}

// Game-style HUD in the hero's top-left: level and role, live Phnom Penh time,
// and an XP bar toward the next level (one level per year since Dec 2019).
export default function HeroHud() {
  const [p, setP] = useState(() => playerLevel());
  const [clock, setClock] = useState<{ time: string; awake: boolean } | null>(null);
  const [filled, setFilled] = useState(0);
  const { t } = useLang();

  useEffect(() => {
    const now = playerLevel();
    setP(now);
    const target = Math.round((now.xp / 100) * BLOCKS);
    // Fill the bar one block at a time.
    let n = 0;
    const fill = setInterval(() => {
      n += 1;
      setFilled(n);
      if (n >= target) clearInterval(fill);
    }, 70);
    const tick = () => setClock(phnomPenhNow());
    tick();
    const t = setInterval(tick, 15000);
    return () => {
      clearInterval(fill);
      clearInterval(t);
    };
  }, []);

  return (
    <div className="hud" aria-label={t("Level {lv} Android Engineer, {xp}% to level {next}", { lv: p.level, xp: p.xp, next: p.level + 1 })}>
      <div className="hud-row">
        <span className="hud-lv">
          <b>LV {p.level}</b> · {t("Android Engineer")}
        </span>
        {clock && (
          <span className={`hud-status${clock.awake ? "" : " away"}`}>
            <i aria-hidden="true" />
            {clock.awake ? t("Online") : t("Sleeping")} · {t("Phnom Penh")} {clock.time}
          </span>
        )}
      </div>
      <div className="hud-row">
        <span className="hud-bar" aria-hidden="true">
          {Array.from({ length: BLOCKS }, (_, i) => (
            <i key={i} className={i < filled ? "on" : undefined} />
          ))}
        </span>
        <span className="hud-xp">
          {t("XP to Lv {n}: {xp}%", { n: p.level + 1, xp: p.xp })}
        </span>
      </div>
    </div>
  );
}
