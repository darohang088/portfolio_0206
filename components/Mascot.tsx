"use client";

import { useEffect, useRef, useState } from "react";
import BlinkingPhone from "./BlinkingPhone";
import { useContent } from "@/lib/i18n/content";
import { useLang } from "@/lib/i18n";

export default function Mascot() {
  const { mascotQuotes } = useContent();
  const { t } = useLang();
  const [line, setLine] = useState("");
  const [show, setShow] = useState(false);
  const [happy, setHappy] = useState(false);
  const next = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = (text: string) => {
    setLine(text);
    setShow(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShow(false), 3600);
  };

  useEffect(() => {
    const timer = setTimeout(() => say(t("Hi! I'm Dororo. Tap me!")), 1800);
    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClick = () => {
    say(mascotQuotes[next.current]);
    next.current = (next.current + 1) % mascotQuotes.length;
    setHappy(true);
    setTimeout(() => setHappy(false), 600);
  };

  return (
    <button className="mascot" aria-label={t("Say hi to Dororo, the pixel phone")} onClick={onClick}>
      <BlinkingPhone happy={happy} />
      <span className={`bubble${show ? " show" : ""}`} role="status">
        {line}
      </span>
    </button>
  );
}
