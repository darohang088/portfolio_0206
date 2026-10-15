import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import QuestLog from "@/components/QuestLog";
import Trophies from "@/components/Trophies";
import Inventory from "@/components/Inventory";
import SavePoints from "@/components/SavePoints";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";
import ClickSparks from "@/components/ClickSparks";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <QuestLog />
        <Trophies />
        <Inventory />
        <SavePoints />
        <Contact />
      </main>
      <Footer />
      <Reveal />
      <ClickSparks />
    </>
  );
}
