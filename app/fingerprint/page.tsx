import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import FingerprintTool from "@/components/FingerprintTool";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Keystore Fingerprints · ${profile.name}`,
  description: "Get MD5, SHA-1 and SHA-256 fingerprints from a keystore, APK or certificate.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · Keystore Fingerprints" title="Keystore fingerprints" lede="Get the MD5, SHA-1 and SHA-256 of your signing key from a keystore, APK or certificate, for Firebase, Google Sign-In and payment SDKs. No terminal needed." />
            <FingerprintTool />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
