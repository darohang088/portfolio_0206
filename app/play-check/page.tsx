import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import PlayCheckTool from "@/components/PlayCheckTool";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Play Store Readiness Check · ${profile.name}`,
  description: "Check a native Android APK against Google Play requirements: target SDK, signing, 16 KB, restricted permissions, Android 15 and 16 changes and deprecated SDKs.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · Play Store Readiness" title="Play Store readiness check" lede="Find what Google Play will reject before you upload. Drop your release APK to check it against Play requirements, restricted-permission policies and Android 15 and 16 changes, with a fix for every problem." />
            <PlayCheckTool />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
