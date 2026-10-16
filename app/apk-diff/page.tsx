import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ApkDiff from "@/components/ApkDiff";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Manifest Diff · ${profile.name}`,
  description: "Compare two APKs or manifests: permissions, exported components, SDK and signing changes.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <a className="back-link" href="/tools">
              ← All tools
            </a>
            <div className="head">
              <p className="eyebrow">Tools · Manifest Diff</p>
              <h2>Manifest & permissions diff</h2>
              <p className="lede">Drop two versions of your app to see added or removed permissions, newly exported components, SDK changes and whether the signing key changed.</p>
            </div>
            <ApkDiff />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
