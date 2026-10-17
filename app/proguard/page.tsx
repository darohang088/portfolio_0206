import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import R8Rules from "@/components/R8Rules";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `ProGuard / R8 Rules · ${profile.name}`,
  description: "Generate ProGuard / R8 keep rules for the libraries your Android or Flutter app uses.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · ProGuard / R8" title="ProGuard / R8 rules" lede="Tick the libraries your app uses and get a ready proguard-rules.pro, with a note on every rule. Fixes the classic works-in-debug, crashes-in-release bugs." />
            <R8Rules />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
