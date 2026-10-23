import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import BgRemoveTool from "@/components/BgRemoveTool";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Background Remover · ${profile.name}`,
  description: "Remove the background from a photo and download a transparent PNG with clean edges. Runs in your browser; nothing is uploaded.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · Background Remover" title="Background remover" lede="Drop a photo and get a transparent PNG with clean edges. The AI runs in your browser, then refines the outline at full size and removes the colour halo. Touch it up with a brush if needed." />
            <BgRemoveTool />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
