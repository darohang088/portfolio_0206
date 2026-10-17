import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import IconTool from "@/components/IconTool";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `App Icon & Splash Generator · ${profile.name}`,
  description: "Make every Android, iOS, web and store icon plus the Android 12 splash icon from one logo, right in your browser.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · App Icons" title="App icon & splash generator" lede="Drop one logo and get every icon your app needs, sized and named the way Android Studio, Xcode and Flutter expect. Your image never leaves your device." />
            <IconTool />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
