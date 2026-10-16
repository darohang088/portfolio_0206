"use client";

import { useEffect, useState } from "react";
import { playerLevel } from "@/lib/level";

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
    <div className="hud" aria-label={`Level ${p.level} Android Engineer, ${p.xp}% to level ${p.level + 1}`}>
      <div className="hud-row">
        <span className="hud-lv">
          <b>LV {p.level}</b> · Android Engineer
        </span>
        {clock && (
          <span className={`hud-status${clock.awake ? "" : " away"}`}>
            <i aria-hidden="true" />
            {clock.awake ? "Online" : "Sleeping"} · Phnom Penh {clock.time}
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
          XP to Lv {p.level + 1}: {p.xp}%
        </span>
      </div>
    </div>
  );
}
