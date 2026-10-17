import type { Metadata } from "next";
import Nav from "@/components/Nav";
import PageHead from "@/components/PageHead";
import GitLab from "@/components/GitLab";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { profile } from "@/data/profile";

export const metadata: Metadata = {
  title: `Learn Git · ${profile.name}`,
  description: "Learn Git and Git flow by doing: a Git terminal simulator with lessons, a live commit graph and Khmer translation.",
};

export default function Page() {
  return (
    <>
      <Nav home={false} />
      <main>
        <section className="block">
          <div className="wrap">
            <PageHead back eyebrow="Tools · Learn Git" title="Learn Git by doing" lede="Type real Git commands in a safe practice terminal and watch the commit graph change. Each level teaches one idea, from your first commit to fixing merge conflicts." />
            <GitLab />
          </div>
        </section>
      </main>
      <Footer />
      <ClickSparks />
    </>
  );
}
