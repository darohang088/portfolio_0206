import type { Metadata } from "next";
import Nav from "@/components/Nav";
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
            <a className="back-link" href="/tools">
              ← All tools
            </a>
            <div className="head">
              <p className="eyebrow">Tools · QR Code Maker</p>
              <h2>QR code maker</h2>
              <p className="lede">Type any text or link, pick a frame, and download a ready-to-print QR code.</p>
            </div>
            <QrMaker />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
