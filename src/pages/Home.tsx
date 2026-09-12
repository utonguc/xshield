import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
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
