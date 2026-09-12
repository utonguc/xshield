import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import StatsStrip from "../components/StatsStrip";
import Pillars from "../components/Pillars";
import DowntimeCalculator from "../components/DowntimeCalculator";
import ProcessRoadmap from "../components/ProcessRoadmap";
import ProductsShowcase from "../components/ProductsShowcase";
import SecurityRoadmap from "../components/SecurityRoadmap";
import WhyStats from "../components/WhyStats";
import About from "../components/About";
import BlogPreview from "../components/BlogPreview";
import CtaFinale from "../components/CtaFinale";
import Contact from "../components/Contact";
import Footer from "../components/Footer";

export default function Home() {
  useDocumentMeta(
    "xShield | Bulut, Ağ, Siber Güvenlik & IT Çözümleri",
    "xShield; Cloud sunucu, ağ yönetimi, siber güvenlik, altyapı hizmetleri ve yazılım danışmanlığı alanlarında kurumsal çözümler sunan teknoloji firmasıdır. e-Clinic, Signed, xCut, xSignage, Pekiyi ve goX ürünleriyle işletmenizi dijitale taşıyın.",
  );

  return (
    <>
      <Navbar />
      <Hero />
      <StatsStrip />
      <Pillars />
      <DowntimeCalculator />
      <ProcessRoadmap />
      <ProductsShowcase />
      <SecurityRoadmap />
      <WhyStats />
      <About />
      <BlogPreview />
      <CtaFinale />
      <Contact />
      <Footer />
    </>
  );
}
