"use client";

import { useState } from "react";
import { toolGroups, type Tool } from "@/data/tools";
import { useLang } from "@/lib/i18n";
import PinDialog from "./PinDialog";

// Set right before opening a PIN-locked tool, so its page knows the PIN was just entered.
export const PASS_KEY = "tool-pass";

export default function ToolsList() {
  const { t } = useLang();
  const [locked, setLocked] = useState<Tool | null>(null);
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
