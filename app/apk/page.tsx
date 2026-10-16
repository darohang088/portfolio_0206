import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
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
            <PageHead back eyebrow="Tools · APK" title="APK security check" lede="Drop an Android APK to see how secure it is: debug settings, network, exported screens, signing, permissions and hardcoded secrets." />
            <ApkAnalyzer />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
