import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import PageSizeTool from "@/components/PageSizeTool";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `16 KB Page Size Checker · ${profile.name}`,
  description: "Check if an Android APK or AAB supports 16 KB page sizes, with the same ELF and zipalign checks Google uses.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · 16 KB Page Size" title="16 KB page size checker" lede="New Android phones use 16 KB memory pages, and Google Play requires apps that target Android 15+ to support them. Drop your APK or AAB to check every native library the way Google does." />
            <PageSizeTool />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
