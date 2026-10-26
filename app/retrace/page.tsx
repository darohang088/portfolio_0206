import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import RetraceTool from "@/components/RetraceTool";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Crash Retrace · ${profile.name}`,
  description: "Deobfuscate Android release crashes in your browser: mapping.txt plus a stack trace gives real class, method and line names.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · Crash Retrace" title="Crash retrace" lede="Release crashes show names like a.b.c(SourceFile:12). Drop the mapping.txt from the same build and paste the crash to see the real classes, methods and line numbers. Nothing leaves your browser." />
            <RetraceTool />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
