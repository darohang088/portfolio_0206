"use client";

import { useId, useState } from "react";
import { profile, skillKinds } from "@/data/profile";

const VISIBLE = 3;

// Skill chips for one role. Long lists collapse behind a "+N skills" button.
export default function RoleSkills({ skills, total }: { skills: string[]; total?: number }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const hidden = skills.length - VISIBLE;
  const shown = open || hidden <= 0 ? skills : skills.slice(0, VISIBLE);
  const unlisted = total ? total - skills.length : 0;

  return (
    <div className="role-skills" id={id}>
      {shown.map((s, i) => (
        <span
          className={`skill${i >= VISIBLE ? " new" : ""}`}
          data-k={skillKinds[s] ?? "tech"}
          style={{ "--d": i - VISIBLE } as React.CSSProperties}
          key={s}
        >
          {s}
        </span>
      ))}
      {hidden > 0 && (
        <button className="more-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? "Show less" : `+${hidden} skills`}
        </button>
      )}
      {unlisted > 0 && (
        <a className="more-btn" href={profile.linkedin.url} target="_blank" rel="noopener noreferrer">
          +{unlisted} skills on LinkedIn ↗
        </a>
      )}
    </div>
  );
}
