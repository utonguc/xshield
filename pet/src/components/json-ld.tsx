/**
 * schema.org yapılandırılmış verisi. Ürün/mağaza adları kullanıcı girdisi olduğu için
 * "<" kaçırılır; aksi halde "</script>" içeren bir metin sayfaya script enjekte edebilir.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
