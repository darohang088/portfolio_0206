import type { Metadata } from "next";
import Nav from "@/components/Nav";
import TestProjects from "@/components/TestProjects";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Test · ${profile.name}`,
  description: "Private test builds, previewed in a 393 × 852 phone frame.",
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
              <h2>Test projects</h2>
              <p className="lede">Pick a project and enter its PIN to open the phone preview.</p>
            </div>
            <TestProjects />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
