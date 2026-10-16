import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import ToolsList from "@/components/ToolsList";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Tools · ${profile.name}`,
  description: "Small tools for Android and app developers.",
};

export default function ToolsPage() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead eyebrow="Tools" title="Dev tools" lede="Small tools I built for checking and testing apps. Pick one to open it." />
            <ToolsList />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
