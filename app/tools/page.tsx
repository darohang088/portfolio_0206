import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { toolGroups } from "@/data/tools";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Tools · ${profile.name}`,
  description: "Small tools for Android and app developers.",
};

export default function ToolsPage() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <div className="head">
              <p className="eyebrow">Tools</p>
              <h2>Dev tools</h2>
              <p className="lede">Small tools I built for checking and testing apps. Pick one to open it.</p>
            </div>
            {toolGroups.map((g) => (
              <div className="tools-group" key={g.title}>
                <h3 className="tools-group-title">{g.title}</h3>
                <ul className="tools-grid">
                  {g.tools.map((t) => (
                    <li key={t.href}>
                      <a className="tool-card" href={t.href}>
                        <span className="tool-icon" aria-hidden="true">
                          {t.icon}
                        </span>
                        <span className="tool-body">
                          <b>{t.name}</b>
                          <span>{t.description}</span>
                          <span className="test-tags">
                            {t.tags.map((tag) => (
                              <i key={tag}>{tag}</i>
                            ))}
                          </span>
                        </span>
                        <span className="tool-go">{t.locked ? "🔒 Open →" : "Open →"}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
