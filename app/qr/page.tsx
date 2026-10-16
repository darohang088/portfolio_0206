import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import QrMaker from "@/components/QrMaker";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `QR Code Maker · ${profile.name}`,
  description: "Make a QR code with a frame and download it.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · QR Code Maker" title="QR code maker" lede="Type any text or link, pick a frame, and download a ready-to-print QR code." />
            <QrMaker />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
