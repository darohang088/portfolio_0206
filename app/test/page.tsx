import type { Metadata } from "next";
import Nav from "@/components/Nav";
import DeviceTester from "@/components/DeviceTester";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Test · ${profile.name}`,
  description: "Render any website inside a 393 × 852 phone frame.",
};

export default function TestPage() {
  return (
    <>
      <Nav home={false} />
      <main className="test-page">
        <section className="block test-block">
          <div className="wrap">
            <div className="head">
              <p className="eyebrow">Test</p>
              <h2>Phone preview</h2>
              <p className="lede">Paste a link and press Render to see the site at 393 × 852, the screen size of an iPhone 15 or 16.</p>
            </div>
            <DeviceTester />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
