"use client";

import { useEffect, useState } from "react";
import DeviceTester from "./DeviceTester";
import PinDialog from "./PinDialog";
import { PASS_KEY } from "./ToolsList";
import { toolGroups } from "@/data/tools";

const TOOL = toolGroups.flatMap((g) => g.tools).find((x) => x.href === "/test")!;
import { useLang } from "@/lib/i18n";
import { testProjects, type TestProject } from "@/data/testProjects";

// The Test page: it always opens on the list of apps to test. Tap one and enter its PIN
// (asked every time), then use the phone preview.
export default function TestProjects() {
  const { t } = useLang();
  const [open, setOpen] = useState<TestProject | null>(null);
  const [unlocked, setUnlocked] = useState<TestProject | null>(null);
  // The Test App itself has a PIN. Coming from the Tools page it was just entered; opening /test directly asks for it here.
  const [gate, setGate] = useState<"checking" | "ask" | "open">("checking");

  useEffect(() => {
    let passed = false;
    try {
      passed = sessionStorage.getItem(PASS_KEY) === "/test";
      sessionStorage.removeItem(PASS_KEY);
    } catch {}
    setGate(passed || !TOOL.pinHash ? "open" : "ask");
  }, []);

  const unlock = (p: TestProject) => {
    setOpen(null);
    setUnlocked(p);
    window.scrollTo({ top: 0 });
  };

  const lock = () => {
    setUnlocked(null);
    window.history.replaceState(null, "", window.location.pathname);
  };

  if (gate !== "open")
    return gate === "ask" ? (
      <PinDialog title={TOOL.name} icon={TOOL.icon} pinHash={TOOL.pinHash!} onClose={() => (window.location.href = "/tools")} onUnlock={() => setGate("open")} />
    ) : null;

  if (unlocked) {
    return (
      <div className="test-open">
        <div className="test-open-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unlocked.logo} alt="" width={48} height={48} />
          <div>
            <h3>{t(unlocked.name)}</h3>
            <p>{t("Press Render to see it at 393 × 852, the screen size of an iPhone 15 or 16.")}</p>
          </div>
          <button className="mini-tool" type="button" onClick={lock}>
            {t("← All projects")}
          </button>
        </div>
        <DeviceTester fixedUrl={unlocked.url} />
      </div>
    );
  }

  return (
    <>
      <ul className="test-projects">
        {testProjects.map((p) => (
          <li key={p.id}>
            <button type="button" className="test-card" onClick={() => setOpen(p)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt="" width={72} height={72} />
              <span className="test-card-body">
                <b>{t(p.name)}</b>
                <span>{t(p.description)}</span>
                <span className="test-tags">
                  {p.tags.map((tag) => (
                    <i key={tag}>{t(tag)}</i>
                  ))}
                </span>
              </span>
              <span className="test-lock" aria-hidden="true">
                {t("🔒 Enter PIN")}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && <PinDialog title={open.name} logo={open.logo} pinHash={open.pinHash} onClose={() => setOpen(null)} onUnlock={() => unlock(open)} />}
    </>
  );
}
