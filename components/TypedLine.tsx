"use client";

import { useEffect, useRef, useState } from "react";

// Shows the full line at rest, then retypes it once when it scrolls into view.
export default function TypedLine({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(text);

  // Language switch: show the new text right away.
  useEffect(() => setShown(text), [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        let i = 0;
        const type = () => {
          i++;
          setShown(text.slice(0, i));
          if (i < text.length) timer = setTimeout(type, 22);
        };
        type();
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [text]);

  return (
    <p className="line" ref={ref} aria-label={text}>
      {shown}
    </p>
  );
}
