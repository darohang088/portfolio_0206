"use client";

import { useEffect, useMemo, useState } from "react";
import PixelSprite from "./PixelSprite";
import { PHONE_PAL, phone, type Face } from "@/lib/sprites";
import { useReducedMotion } from "@/lib/useReducedMotion";

// The pixel phone mascot. It blinks on its own; pass `happy` to show a smile.
export default function BlinkingPhone({ happy = false }: { happy?: boolean }) {
  const reduce = useReducedMotion();
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (reduce) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          schedule();
        }, 140);
      }, 1800 + Math.random() * 3200);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [reduce]);

  const face: Face = happy ? "happy" : blink ? "blink" : "open";
  const rows = useMemo(() => phone(face), [face]);
  return <PixelSprite rows={rows} palette={PHONE_PAL} />;
}
