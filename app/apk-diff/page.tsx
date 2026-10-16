import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import ApkDiff from "@/components/ApkDiff";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Manifest Diff · ${profile.name}`,
  description: "Compare two APKs or manifests: permissions, exported components, SDK and signing changes.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · Manifest Diff" title="Manifest & permissions diff" lede="Drop two versions of your app to see added or removed permissions, newly exported components, SDK changes and whether the signing key changed." />
            <ApkDiff />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
