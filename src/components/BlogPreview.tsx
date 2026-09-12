import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { blogPosts } from "../data/blog";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

export default function BlogPreview() {
  const latest = blogPosts.slice(0, 3);

  return (
    <section id="blog" className="section">
      <div className="container">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-14">
          <div className="max-w-xl">
            <div className="kicker mb-4">Kaynaklar</div>
            <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold text-[var(--ink)] leading-[1.15]">
              Blogdan <span className="marker">Son Yazılar</span>
            </h2>
          </div>
          <Link
            to="/blog"
            className="text-sm font-semibold text-[var(--ink)] no-underline border-b-[1.5px] border-[var(--ink)] pb-0.5 shrink-0"
          >
            Tüm yazılar →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {latest.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
            >
              <Link to={`/blog/${post.slug}`} className="panel p-6 flex flex-col h-full no-underline">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 bg-accent/20 rounded-full text-[11px] font-bold uppercase tracking-wide text-[var(--color-accentdeep)]">
                    {post.category}
                  </span>
                  <span className="text-[var(--subtle)] text-xs">{post.readTime}</span>
                </div>
                <h3 className="text-base font-extrabold text-[var(--ink)] mb-3 leading-snug">{post.title}</h3>
                <p className="text-[var(--muted)] text-sm leading-relaxed mb-5 flex-1">{post.excerpt}</p>
                <div className="text-[var(--subtle)] text-xs mono">{fmtDate(post.date)}</div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
