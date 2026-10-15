import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import AppDetail from "@/components/AppDetail";
import Footer from "@/components/Footer";
import ClickSparks from "@/components/ClickSparks";
import { apps, profile } from "@/data/profile";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return apps.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const app = apps.find((a) => a.slug === slug);
  return app ? { title: `${app.name} · ${profile.name}`, description: app.tagline } : {};
}

export default async function AppPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const app = apps.find((a) => a.slug === slug);
  if (!app) notFound();
  return (
    <>
      <Nav home={false} />
      <AppDetail app={app} />
      <Footer />
      <ClickSparks />
    </>
  );
}
