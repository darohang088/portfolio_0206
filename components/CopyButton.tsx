"use client";

import { useState } from "react";

export default function CopyButton({ text, targetId }: { text: string; targetId: string }) {
  const [label, setLabel] = useState("Copy");

  const flash = (l: string) => {
    setLabel(l);
    setTimeout(() => setLabel("Copy"), 1600);
  };

  // If the clipboard is blocked, select the text so it can be copied by hand.
  const selectText = () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    flash("Selected");
  };

  const onClick = () => {
    try {
      navigator.clipboard.writeText(text).then(() => flash("Copied"), selectText);
    } catch {
      selectText();
    }
  };

  return (
    <button className="mini" type="button" onClick={onClick}>
      {label}
    </button>
  );
}
