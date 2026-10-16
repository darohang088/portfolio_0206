import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import PrettyJson from "@/components/PrettyJson";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Pretty JSON · ${profile.name}`,
  description: "Paste JSON and get it formatted, validated or minified.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · Pretty JSON" title="Pretty JSON" lede="Paste JSON on the left and get it formatted on the right. Errors show the exact line and column." />
            <PrettyJson />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
