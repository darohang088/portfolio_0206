"use client";

import { toolGroups } from "@/data/tools";
import { useLang } from "@/lib/i18n";

export default function ToolsList() {
  const { t } = useLang();
  return (
    <>
      {toolGroups.map((g) => (
        <div className="tools-group" key={g.title}>
          <h3 className="tools-group-title">{t(g.title)}</h3>
          <ul className="tools-grid">
            {g.tools.map((tool) => (
              <li key={tool.href}>
                <a className="tool-card" href={tool.href}>
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
                  <span className="tool-go">{tool.locked ? t("🔒 Open →") : t("Open →")}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
