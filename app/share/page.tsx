import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import BuildShare from "@/components/BuildShare";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Build Share · ${profile.name}`,
  description: "Share a test APK with clients and testers through a short link and QR code.",
  robots: { index: false },
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · Build Share" title="Build share" lede="Drop a test APK and get a short link with a QR code. Testers get a clean page with the app icon, version and a Download button. Links expire on their own." />
            <BuildShare />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
