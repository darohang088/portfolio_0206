"use client";

import { useEffect, useRef, useState } from "react";
import BlinkingPhone from "./BlinkingPhone";
import { mascotQuotes } from "@/data/profile";

export default function Mascot() {
  const [line, setLine] = useState("Hi! I'm Droidy. Tap me!");
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
    const t = setTimeout(() => say("Hi! I'm Droidy. Tap me!"), 1800);
    return () => {
      clearTimeout(t);
      clearTimeout(hideTimer.current);
    };
  }, []);

  const onClick = () => {
    say(mascotQuotes[next.current]);
    next.current = (next.current + 1) % mascotQuotes.length;
    setHappy(true);
    setTimeout(() => setHappy(false), 600);
  };

  return (
    <button className="mascot" aria-label="Say hi to Droidy, the pixel phone" onClick={onClick}>
      <BlinkingPhone happy={happy} />
      <span className={`bubble${show ? " show" : ""}`} role="status">
        {line}
      </span>
    </button>
  );
}
