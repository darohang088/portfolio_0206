import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
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
            <PageHead back eyebrow="Tools · Test App" title="Test projects" lede="Pick a project and enter its PIN to open the phone preview." />
            <TestProjects />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
