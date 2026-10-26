import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import ListingTool from "@/components/ListingTool";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Store Listing Checker · ${profile.name}`,
  description: "Check a Google Play store listing against the metadata policy and graphic specs before you submit.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · Store Listing" title="Store listing checker" lede="Store listings get rejected for words like &quot;best&quot; or &quot;free&quot; in the name, keyword stuffing and wrong image sizes. Type your listing and add your graphics to catch these before Google does." />
            <ListingTool />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
