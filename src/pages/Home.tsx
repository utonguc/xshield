import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import StatsStrip from "../components/StatsStrip";
import Pillars from "../components/Pillars";
import ProcessRoadmap from "../components/ProcessRoadmap";
import ProductsShowcase from "../components/ProductsShowcase";
import SecurityRoadmap from "../components/SecurityRoadmap";
import WhyStats from "../components/WhyStats";
import About from "../components/About";
import CtaFinale from "../components/CtaFinale";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <StatsStrip />
      <Pillars />
      <ProcessRoadmap />
      <ProductsShowcase />
      <SecurityRoadmap />
      <WhyStats />
      <About />
      <CtaFinale />
      <Contact />
      <Footer />
    </>
  );
}
