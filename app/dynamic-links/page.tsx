import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import Footer from "@/components/Footer";
import DynamicLinks from "@/components/DynamicLinks";

export const metadata: Metadata = { title: "Dynamic Links", description: "Configure app platforms, prepare dynamic links, and view analytics." };
export default function Page() {
  return <><Nav home={false} /><main><section className="block"><div className="wrap"><PageHead back eyebrow="Tools · Dynamic Links" title="Dynamic Links" lede="One link for your app, its store, and the web." /><DynamicLinks /></div></section></main><Footer /></>;
}
