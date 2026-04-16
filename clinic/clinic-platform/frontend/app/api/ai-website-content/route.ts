import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI yapılandırılmamış." }, { status: 503 });
  }

  try {
    const { clinicName, city, specialty, tone, extraContext } = await req.json() as {
      clinicName: string;
      city?: string;
      specialty?: string;
      tone?: string;
      extraContext?: string;
    };

    if (!clinicName?.trim()) {
      return NextResponse.json({ error: "Klinik adı zorunlu." }, { status: 400 });
    }

    const toneMap: Record<string, string> = {
      professional: "resmi ve profesyonel",
      warm: "sıcak ve samimi",
      modern: "modern ve dinamik",
      luxury: "prestijli ve lüks",
    };
    const toneDesc = toneMap[tone ?? "professional"] ?? "resmi ve profesyonel";

    const prompt = `Sen bir sağlık sektörü web sitesi metin yazarısın. Türkçe, SEO uyumlu ve ikna edici içerik üretiyorsun.

Klinik Bilgileri:
- Ad: ${clinicName}
- Şehir: ${city ?? "belirtilmemiş"}
- Uzmanlık / Branş: ${specialty ?? "genel"}
- Ton: ${toneDesc}
${extraContext ? `- Ek bilgi: ${extraContext}` : ""}

Aşağıdaki içerikleri üret ve SADECE JSON formatında döndür, başka açıklama ekleme:

{
  "heroTitle": "...(max 60 karakter, dikkat çekici, klinik adını kullan)",
  "heroSubtitle": "...(max 120 karakter, uzmanlık alanını ve avantajı vurgula)",
  "aboutText": "...(3-4 cümle, klinik tanıtımı, güven vurgula, 250-350 karakter)",
  "metaTitle": "...(max 60 karakter, SEO için klinik adı + hizmet + şehir)",
  "metaDescription": "...(max 155 karakter, anahtar hizmetleri ve şehri içeren SEO açıklaması)",
  "metaKeywords": "...(virgülle ayrılmış 5-8 anahtar kelime)"
}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });

    const raw = (completion.choices[0].message.content ?? "").trim();
    console.log("[ai-website-content] Ham yanıt:", raw.slice(0, 300));

    // Markdown kod bloğu varsa temizle (```json ... ```)
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    // İlk { ile son } arasını al
    const start = stripped.indexOf("{");
    const end   = stripped.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      console.error("[ai-website-content] JSON bulunamadı:", raw);
      return NextResponse.json({ error: "AI geçerli içerik üretemedi, lütfen tekrar deneyin." }, { status: 500 });
    }

    let result: Record<string, string>;
    try {
      result = JSON.parse(stripped.slice(start, end + 1));
    } catch (parseErr) {
      console.error("[ai-website-content] JSON parse hatası:", parseErr, stripped.slice(start, end + 1));
      return NextResponse.json({ error: "AI yanıtı işlenemedi, lütfen tekrar deneyin." }, { status: 500 });
    }

    return NextResponse.json(result);

  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    console.error("[ai-website-content] Hata:", err);

    if (status === 429) {
      return NextResponse.json({ error: "AI asistanı şu an yoğun, lütfen tekrar deneyin." }, { status: 429 });
    }
    return NextResponse.json({ error: "İçerik oluşturulamadı, lütfen tekrar deneyin." }, { status: 500 });
  }
}
