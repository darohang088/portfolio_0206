"use client";

import { useState } from "react";
import { toolGroups, type Tool } from "@/data/tools";
import { useLang } from "@/lib/i18n";
import PinDialog from "./PinDialog";

// Set right before opening a PIN-locked tool, so its page knows the PIN was just entered.
export const PASS_KEY = "tool-pass";

// Pixel-art star: a 9×9 grid drawn with square cells so it matches the site's style.
const STAR_CELLS = [
  [4, 0], [4, 1], [3, 2], [4, 2], [5, 2],
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3],
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
  [2, 5], [3, 5], [4, 5], [5, 5], [6, 5],
  [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
  [1, 7], [2, 7], [3, 7], [5, 7], [6, 7], [7, 7],
  [1, 8], [2, 8], [6, 8], [7, 8],
];

function ToolStar({ n, label }: { n: number; label: string }) {
  return (
    <span className="tool-star" aria-label={label} title={label}>
      <svg viewBox="0 0 9 9" aria-hidden="true" shapeRendering="crispEdges">
        {STAR_CELLS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
        ))}
      </svg>
      <b>{n}</b>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={`spark s${i}`} aria-hidden="true" />
      ))}
    </span>
  );
}

export default function ToolsList() {
  const { t } = useLang();
  const [locked, setLocked] = useState<Tool | null>(null);
  // Number every tool 1, 2, 3… across all groups, in the order they're shown.
  const number = new Map(toolGroups.flatMap((g) => g.tools).map((tool, i) => [tool.href, i + 1]));
  return (
    <>
      {toolGroups.map((g) => (
        <div className="tools-group" key={g.title}>
          <h3 className="tools-group-title">{t(g.title)}</h3>
          <ul className="tools-grid">
            {g.tools.map((tool) => (
              <li key={tool.href}>
                <a
                  className="tool-card"
                  href={tool.href}
                  onClick={(e) => {
                    if (!tool.pinHash) return;
                    e.preventDefault();
                    setLocked(tool);
                  }}
                >
                  <span className="tool-icon" aria-hidden="true">
                    {tool.icon}
                  </span>
                  <span className="tool-body">
                    <b>{t(tool.name)}</b>
                    <span>{t(tool.description)}</span>
                    <span className="test-tags">
                      {tool.tags.map((tag) => (
                        <i key={tag}>{t(tag)}</i>
                      ))}
                    </span>
                  </span>
                  <ToolStar n={number.get(tool.href) ?? 0} label={t("Tool {n}", { n: number.get(tool.href) ?? 0 })} />
                  <span className="tool-go">{tool.pinHash ? t("🔒 Open →") : t("Open →")}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {locked?.pinHash && (
        <PinDialog
          title={locked.name}
          icon={locked.icon}
          pinHash={locked.pinHash}
          onClose={() => setLocked(null)}
          onUnlock={() => {
            try {
              sessionStorage.setItem(PASS_KEY, locked.href);
            } catch {}
            window.location.href = locked.href;
          }}
        />
      )}
    </>
  );
}
