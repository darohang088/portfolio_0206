import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PrivacyExplainer from "@/components/PrivacyExplainer";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Permissions & Privacy Explainer · ${profile.name}`,
  description: "See which Android permissions need a Google Play declaration or prominent disclosure before you submit.",
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
              <p className="eyebrow">Tools · Permissions</p>
              <h2>Permissions &amp; privacy explainer</h2>
              <p className="lede">
                Drop your AndroidManifest.xml or APK to see which permissions Google Play will question, the declarations Play Console asks for, where you need a prominent
                disclosure, and what gets apps rejected.
              </p>
            </div>
            <PrivacyExplainer />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
