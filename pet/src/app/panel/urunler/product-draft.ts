// Ürün formu taslak tipleri — hem sunucu sayfaları hem istemci formu kullanır.

export type VariantDraft = {
  key: string;
  id?: string;
  name: string;
  barcode: string;
  sku: string;
  unit: "adet" | "kg";
  price: string;
  compareAtPrice: string;
  costPrice: string;
  lowStockThreshold: string;
  initialStock: string;
  isActive: boolean;
  stockQty?: number;
};

export type ProductDraft = {
  id: string | null;
  name: string;
  brand: string;
  categoryId: string;
  petType: string;
  description: string;
  isPublished: boolean;
  imageUrl: string | null;
  variants: VariantDraft[];
};

export const blankVariant = (unit: "adet" | "kg" = "adet"): VariantDraft => ({
  // Sunucu ve tarayıcıda çakışmasın diye rastgele (sayaç her ortamda sıfırdan başlar).
  key: `n${Math.random().toString(36).slice(2, 10)}`,
  name: "",
  barcode: "",
  sku: "",
  unit,
  price: "",
  compareAtPrice: "",
  costPrice: "",
  lowStockThreshold: "2",
  initialStock: "",
  isActive: true,
});
