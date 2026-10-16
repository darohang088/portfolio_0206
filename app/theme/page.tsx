import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ThemeGallery from "@/components/ThemeGallery";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Theme · ${profile.name}`,
  description: "Pick the background for the top of the portfolio.",
};

export default function ThemePage() {
  return (
    <>
      <Nav home={false} />
      <main className="theme-page">
        <section className="block">
          <div className="wrap">
            <div className="head">
              <p className="eyebrow">Theme</p>
              <h2>Choose a background</h2>
              <p className="lede">Tap a background to preview it, then press Apply to use it on the home page.</p>
            </div>
            <ThemeGallery />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
