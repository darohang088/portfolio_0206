import type { Metadata } from "next";
import Nav from "@/components/Nav";
import KhqrReader from "@/components/KhqrReader";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `KHQR Reader · ${profile.name}`,
  description: "Read a KHQR payment code and see its data.",
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
              <p className="eyebrow">Tools · KHQR Reader</p>
              <h2>KHQR reader</h2>
              <p className="lede">Read any KHQR or QR code. Upload a picture, paste a link or screenshot, or use your camera. The data is shown in plain words.</p>
            </div>
            <KhqrReader />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
