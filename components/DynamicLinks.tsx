"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type Settings = { domain: string; android: boolean; packageName: string; fingerprints: string[]; playStore: string; ios: boolean; bundleId: string; teamId: string; appStore: string; web: boolean; webUrl: string };
type LinkDraft = { id: string; name: string; destination: string; parameters: string; title: string; description: string; image: string; source: string; medium: string; campaign: string; term: string; content: string };
const defaults: Settings = { domain: "", android: true, packageName: "", fingerprints: [""], playStore: "", ios: true, bundleId: "", teamId: "", appStore: "", web: true, webUrl: "" };
const emptyLink = { name: "", destination: "/", parameters: "", title: "", description: "", image: "", source: "", medium: "", campaign: "", term: "", content: "" };
const STORAGE = "dynamic-links-dashboard-v1";
const sections = [{ name: "Setup", icon: "⚙" }, { name: "Links", icon: "↗" }, { name: "Analytics", icon: "⌁" }] as const;

export default function DynamicLinks() {
  const [tab, setTab] = useState<string>("Setup");
  const [settings, setSettings] = useState<Settings>(defaults);
  const [links, setLinks] = useState<LinkDraft[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyLink);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "null");
      if (saved?.settings && Array.isArray(saved.links)) {
        setSettings({ ...defaults, ...saved.settings, fingerprints: Array.isArray(saved.settings.fingerprints) ? saved.settings.fingerprints : [""] });
        setLinks(saved.links.filter((link: LinkDraft) => typeof link.id === "string" && typeof link.name === "string" && typeof link.destination === "string"));
      }
    } catch { setNotice("Saved data could not be loaded. You can start a new setup."); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (creating) dialog.current?.showModal();
    else dialog.current?.close();
  }, [creating]);
  const persist = (nextSettings: Settings, nextLinks: LinkDraft[]) => {
    try { localStorage.setItem(STORAGE, JSON.stringify({ settings: nextSettings, links: nextLinks })); return true; }
    catch { setNotice("Could not save. Browser storage may be full or unavailable."); return false; }
  };
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings(s => ({ ...s, [key]: value }));
  const field = (label: string, key: keyof Omit<Settings, "android" | "ios" | "web" | "fingerprints">, placeholder: string, type = "text") => <label className="dl-field"><span>{label}</span><input type={type} value={settings[key]} placeholder={placeholder} onChange={e => change(key, e.target.value)} /></label>;
  const linkField = (label: string, key: keyof typeof emptyLink, placeholder = "", required = false, type = "text") => <label className="dl-field"><span>{label}{required ? " *" : ""}</span><input type={type} required={required} value={draft[key]} placeholder={placeholder} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} /></label>;
  const saveSetup = (e: FormEvent) => {
    e.preventDefault();
    if (settings.android && settings.fingerprints.some(f => f.trim() && !/^([a-fA-F0-9]{2}:){31}[a-fA-F0-9]{2}$/.test(f.trim()))) return setNotice("Enter each SHA-256 fingerprint as 32 hexadecimal pairs separated by colons.");
    if (persist(settings, links)) setNotice("Settings saved on this browser. Live service is not connected yet.");
  };
  const createLink = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim() || !draft.destination.startsWith("/") || draft.destination.startsWith("//") || /[?#\\]/.test(draft.destination)) return setNotice("Enter a name and an app path such as /product/123. Add query values in Parameters.");
    const next = [{ ...draft, name: draft.name.trim(), id: crypto.randomUUID() }, ...links];
    if (persist(settings, next)) { setLinks(next); setCreating(false); setDraft(emptyLink); setNotice("Link draft saved. Connect the live service before sharing a public link."); }
  };
  const copyPath = async (link: LinkDraft) => {
    const params = new URLSearchParams(link.parameters);
    (["source", "medium", "campaign", "term", "content"] as const).forEach(k => { if (link[k]) params.set(`utm_${k}`, link[k]); });
    try { await navigator.clipboard.writeText(link.destination + (params.size ? `?${params}` : "")); setNotice("App path copied. This is a draft, not a published dynamic link."); }
    catch { setNotice("Clipboard unavailable. Copy the destination shown in the list."); }
  };
  return <div className="dl-layout">
    <aside className="dl-sidebar"><h2>Dynamic Links <span aria-hidden="true">⌄</span></h2><nav aria-label="Dynamic Links sections">{sections.map(s => <button key={s.name} aria-current={tab === s.name ? "page" : undefined} onClick={() => { setTab(s.name); setNotice(""); }}><span aria-hidden="true">{s.icon}</span>{s.name}</button>)}</nav><p>Workspace preview<br /><small>Saved on this browser</small></p></aside>
    <div className="dl-content"><div className="dl-banner"><strong>Live service not connected</strong><span>Prepare your setup and link drafts here. Public redirects and click tracking require a connected Cloudflare backend.</span></div><p role="status" className="dl-notice">{notice}</p>
    {tab === "Setup" && <form onSubmit={saveSetup}><h2>Setup</h2><p className="dl-muted">Connect your app platforms and choose where visitors should land.</p><div className="dl-card"><h3>Link domain</h3>{field("HTTPS domain", "domain", "https://links.example.com", "url")}</div>
      {(["android", "ios", "web"] as const).map(platform => <section className="dl-card" key={platform}><label className="dl-platform"><strong>{platform === "ios" ? "iOS" : platform === "android" ? "Android" : "Web"}</strong><input type="checkbox" role="switch" checked={settings[platform]} onChange={e => change(platform, e.target.checked)} /></label><fieldset disabled={!settings[platform]}>
      {platform === "android" ? <>{field("Package name", "packageName", "com.mycompany.myapp")}<label className="dl-field"><span>SHA-256 fingerprints</span></label>{settings.fingerprints.map((f, i) => <div className="dl-fingerprint" key={i}><input aria-label={`SHA-256 fingerprint ${i + 1}`} value={f} placeholder="AA:BB:CC:…" onChange={e => change("fingerprints", settings.fingerprints.map((v, n) => n === i ? e.target.value : v))} /><button type="button" aria-label={`Remove fingerprint ${i + 1}`} onClick={() => change("fingerprints", settings.fingerprints.filter((_, n) => n !== i))}>×</button></div>)}<button type="button" className="dl-secondary" onClick={() => change("fingerprints", [...settings.fingerprints, ""])}>Add fingerprint</button>{field("Google Play URL", "playStore", "https://play.google.com/store/apps/details?id=…", "url")}</> : platform === "ios" ? <>{field("Bundle ID", "bundleId", "com.mycompany.myapp")}{field("Apple Team ID", "teamId", "ABCDE12345")}{field("App Store URL", "appStore", "https://apps.apple.com/app/id1234567890", "url")}</> : field("Web fallback URL", "webUrl", "https://example.com", "url")}</fieldset></section>)}
      <div className="dl-card"><p className="dl-muted">Save after changing your platform settings.</p><button className="btn" disabled={!ready}>Save settings</button></div></form>}
    {tab === "Links" && <><div className="dl-heading"><div><h2>Links</h2><p className="dl-muted">Prepare destinations and previews for your app links.</p></div><button className="btn" disabled={!ready} onClick={() => setCreating(true)}>+ Create link</button></div><div className="dl-card dl-table"><table><thead><tr><th>Name / destination</th><th>Status</th><th>Actions</th></tr></thead><tbody>{links.map(link => <tr key={link.id}><td><strong>{link.name}</strong><small>{link.destination}</small></td><td><span className="dl-badge">Draft</span></td><td><button onClick={() => copyPath(link)}>Copy path</button> <button onClick={() => { const next = links.filter(l => l.id !== link.id); if (persist(settings, next)) setLinks(next); }}>Delete</button></td></tr>)}</tbody></table>{!links.length && <div className="dl-empty"><span aria-hidden="true">↗</span><h3>No links yet</h3><p>Create your first link draft to choose a destination and share preview.</p></div>}</div></>}
    {tab === "Analytics" && <><h2>⌁ Analytics</h2><p className="dl-muted">Clicks on your links, app opens, and store fallbacks.</p><div className="dl-metrics">{["Clicks", "Opens", "Fallbacks", "Fallback rate"].map(label => <div className="dl-card" key={label}><span>{label}</span><strong>—</strong><small>{label === "Opens" ? "Reported by the app" : "Last 30 days"}</small></div>)}</div><section className="dl-card"><h3>Clicks and opens</h3><p className="dl-muted">Daily totals over the last 30 days, in UTC.</p><div className="dl-chart"><p>No tracking data yet</p><small>Connect the live service to start collecting clicks.<br />App opens require reporting from your app.</small></div><p className="dl-legend">● Clicks <span>● Opens</span></p></section>{["By platform", "By link"].map(title => <section className="dl-card dl-table" key={title}><h3>{title}</h3><p className="dl-muted">No events recorded. Metrics will appear when tracking is connected.</p><table><thead><tr><th>{title === "By platform" ? "Platform" : "Link"}</th><th>Clicks</th><th>Opens</th><th>Fallbacks</th></tr></thead><tbody>{(title === "By platform" ? ["iOS", "Android", "Web"] : links.map(l => l.name)).map((label, i) => <tr key={i}><td>{label}</td><td>—</td><td>—</td><td>—</td></tr>)}</tbody></table></section>)}</>}
    </div>
    <dialog ref={dialog} className="dl-dialog" onCancel={() => setCreating(false)} onClick={e => { if (e.target === e.currentTarget) setCreating(false); }}><form onSubmit={createLink}><div className="dl-heading"><h2>Create a link</h2><button type="button" aria-label="Close create link" onClick={() => setCreating(false)}>×</button></div>{linkField("Name", "name", "Lisbon guide newsletter", true)}{linkField("Destination path", "destination", "/product/123", true)}{linkField("Parameters (optional)", "parameters", "productId=123&ref=newsletter")}<h3>Preview when shared</h3>{linkField("Title", "title", "Explore Lisbon")}{linkField("Description", "description", "Your guide to the city")}{linkField("Image URL", "image", "https://example.com/preview.jpg", false, "url")}<details><summary>Campaign tracking (optional)</summary>{(["source", "medium", "campaign", "term", "content"] as const).map(k => <div key={k}>{linkField(k.charAt(0).toUpperCase() + k.slice(1), k)}</div>)}</details><p className="dl-muted">Creates a local draft. Public links are available after connecting the live service.</p><p role="status">{notice}</p><div className="dl-dialog-actions"><button type="button" className="dl-secondary" onClick={() => setCreating(false)}>Cancel</button><button className="btn">Save link draft</button></div></form></dialog>
  </div>;
}
