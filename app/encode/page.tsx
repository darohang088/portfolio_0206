import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import EncodeTool from "@/components/EncodeTool";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Encode & Hash · ${profile.name}`,
  description: "Base64, URL encoding, MD5 / SHA hashes and HMAC for text or files, in your browser.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · Encode & Hash" title="Encode & hash" lede="Base64 and URL encode or decode, file checksums (MD5, SHA-1, SHA-256…) and HMAC signatures. Paste text or drop a file." />
            <EncodeTool />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
