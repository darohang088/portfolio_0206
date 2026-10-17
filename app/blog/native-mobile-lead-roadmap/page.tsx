import type { Metadata } from "next";
import Nav from "@/components/Nav";
import RoadmapPost from "@/components/RoadmapPost";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Senior Officer, IT Native Mobile Development: a one-year roadmap · ${profile.name}`,
  description: "A step-by-step, one-year plan to lead a Native Mobile Unit and own Android and iOS apps end to end: iOS, WebView bridges, safe content updates, performance, security, releases, leadership and incidents.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <RoadmapPost />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
