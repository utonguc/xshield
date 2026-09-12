import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { blogPosts } from "../data/blog";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

export default function Blog() {
  useDocumentMeta(
    "Blog | xShield",
    "IT altyapısı, siber güvenlik ve KVKK uyumu üzerine xShield'in bilgilendirici blog yazıları.",
  );

  return (
    <>
      <Navbar />
      <main className="bg-[var(--bg)] min-h-dvh pt-32 pb-24">
        <div className="container">
          <div className="max-w-2xl mb-16">
            <div className="kicker mb-4">Blog</div>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold text-[var(--ink)] tracking-tight leading-[1.15] mb-5">
              Kaynaklar & <span className="marker">Bilgi Merkezi</span>
            </h1>
            <p className="text-[var(--muted)] text-lg leading-relaxed">
              Siber güvenlik, IT altyapısı ve KVKK uyumu üzerine sahadan derlediğimiz pratik yazılar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogPosts.map((post, i) => (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: "easeOut" }}
              >
                <Link to={`/blog/${post.slug}`} className="panel p-6 flex flex-col h-full no-underline">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-2.5 py-1 bg-accent/20 rounded-full text-[11px] font-bold uppercase tracking-wide text-[var(--color-accentdeep)]">
                      {post.category}
                    </span>
                    <span className="text-[var(--subtle)] text-xs">{post.readTime} okuma</span>
                  </div>
                  <h2 className="text-lg font-extrabold text-[var(--ink)] mb-3 leading-snug">{post.title}</h2>
                  <p className="text-[var(--muted)] text-sm leading-relaxed mb-5 flex-1">{post.excerpt}</p>
                  <div className="text-[var(--subtle)] text-xs mono">{fmtDate(post.date)}</div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
