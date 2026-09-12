import { Link, useParams, Navigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { blogPosts, getPostBySlug } from "../data/blog";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

export default function BlogPost() {
  const { slug } = useParams();
  const post = slug ? getPostBySlug(slug) : undefined;

  useDocumentMeta(
    post ? `${post.title} | xShield Blog` : "Yazı Bulunamadı | xShield Blog",
    post?.excerpt ?? "Aradığınız blog yazısı bulunamadı.",
  );

  if (!post) return <Navigate to="/blog" replace />;

  const others = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <>
      <Navbar />
      <main className="bg-[var(--bg)] min-h-dvh pt-32 pb-24">
        <article className="container max-w-2xl">
          <Link to="/blog" className="text-sm font-semibold text-[var(--muted)] no-underline hover:text-[var(--ink)] transition-colors">
            ← Tüm Yazılar
          </Link>

          <div className="mt-6 mb-10">
            <div className="flex items-center gap-3 mb-5">
              <span className="px-2.5 py-1 bg-accent/20 rounded-full text-[11px] font-bold uppercase tracking-wide text-[var(--color-accentdeep)]">
                {post.category}
              </span>
              <span className="text-[var(--subtle)] text-xs mono">
                {fmtDate(post.date)} · {post.readTime} okuma
              </span>
            </div>
            <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold text-[var(--ink)] tracking-tight leading-[1.2]">
              {post.title}
            </h1>
          </div>

          <div className="flex flex-col gap-5">
            {post.content.map((block, i) => {
              if (block.type === "h2") {
                return (
                  <h2 key={i} className="text-xl font-extrabold text-[var(--ink)] mt-4">
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "ul") {
                return (
                  <ul key={i} className="flex flex-col gap-2 pl-1">
                    {block.items.map((item, j) => (
                      <li key={j} className="flex gap-2.5 text-[var(--muted)] text-[15px] leading-relaxed">
                        <span className="text-[var(--color-accentdeep)] shrink-0">—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="text-[var(--muted)] text-[15px] leading-[1.85]">
                  {block.text}
                </p>
              );
            })}
          </div>

          <div className="mt-14 pt-8 border-t border-[var(--border)]">
            <a
              href="/#iletisim"
              className="inline-block px-7 py-3.5 rounded-[10px] bg-[var(--ink)] text-white no-underline text-sm font-bold"
            >
              Bu konuda destek alın →
            </a>
          </div>

          {others.length > 0 && (
            <div className="mt-16 pt-10 border-t border-[var(--border)]">
              <div className="kicker mb-6">Diğer Yazılar</div>
              <div className="grid sm:grid-cols-2 gap-5">
                {others.map((p) => (
                  <Link key={p.slug} to={`/blog/${p.slug}`} className="panel p-5 no-underline block">
                    <h3 className="text-[var(--ink)] font-bold text-[15px] mb-2 leading-snug">{p.title}</h3>
                    <p className="text-[var(--muted)] text-xs leading-relaxed">{p.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
      <Footer />
    </>
  );
}
