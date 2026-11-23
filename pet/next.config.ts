import path from "node:path";
import type { NextConfig } from "next";

// Bu uygulama xshield reposunun içindeki pet/ klasöründe yaşıyor; üst klasördeki
// package-lock.json yüzünden Next kök dizini yanlış tahmin etmesin.
const root = path.resolve(import.meta.dirname);

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: root,
  turbopack: { root },
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Ürün görselleri tarayıcıda küçültülüyor; yine de telefon fotoğrafları için pay bırakıyoruz.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
