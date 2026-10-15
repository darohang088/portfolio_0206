"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

// Types and deletes each role in turn, like a game's text box.
export default function TypedRoles({ roles }: { roles: string[] }) {
  const reduce = useReducedMotion();
  const [text, setText] = useState(roles[0]);

  useEffect(() => {
    if (reduce) return;
    let r = 0;
    let i = roles[0].length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (deleting) {
        i--;
        if (i <= 0) {
          deleting = false;
          r = (r + 1) % roles.length;
        }
      } else {
        i++;
        if (i >= roles[r].length) {
          deleting = true;
          setText(roles[r]);
          timer = setTimeout(tick, 2200);
          return;
        }
      }
      setText(roles[r].slice(0, Math.max(0, i)));
      timer = setTimeout(tick, deleting ? 35 : 70);
    };

    timer = setTimeout(tick, 2600);
    return () => clearTimeout(timer);
  }, [roles, reduce]);

  return (
    <p className="tagline">
      <span>{text}</span>
      <span className="caret" aria-hidden="true" />
    </p>
  );
}
