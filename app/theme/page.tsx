import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
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
            <PageHead eyebrow="Theme" title="Choose a background" lede="Tap a background to preview it, then press Apply to use it on the home page." />
            <ThemeGallery />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
