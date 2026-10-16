import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ApkAnalyzer from "@/components/ApkAnalyzer";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `APK check · ${profile.name}`,
  description: "Drop an Android APK to get a quick security report, checked in your browser.",
};

export default function ApkPage() {
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
              <p className="eyebrow">Tools · APK</p>
              <h2>APK security check</h2>
              <p className="lede">Drop an Android APK to see how secure it is: debug settings, network, exported screens, signing, permissions and hardcoded secrets.</p>
            </div>
            <ApkAnalyzer />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
