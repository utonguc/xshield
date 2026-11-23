import type { LegalKind, MovementType, OrderStatus, PaymentMethod, PetType, Role } from "@/db/schema";

export const PET_TYPE_LABELS: Record<PetType, string> = {
  kedi: "Kedi",
  kopek: "Köpek",
  kus: "Kuş",
  balik: "Balık & Akvaryum",
  kemirgen: "Kemirgen",
  surungen: "Sürüngen",
  genel: "Genel",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Yeni",
  preparing: "Hazırlanıyor",
  ready: "Teslime hazır",
  on_the_way: "Yolda",
  delivered: "Teslim edildi",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  new: "bg-amber-100 text-amber-900 ring-amber-300",
  preparing: "bg-sky-100 text-sky-900 ring-sky-300",
  ready: "bg-violet-100 text-violet-900 ring-violet-300",
  on_the_way: "bg-indigo-100 text-indigo-900 ring-indigo-300",
  delivered: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  completed: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  cancelled: "bg-stone-200 text-stone-700 ring-stone-300",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash_on_delivery: "Kapıda nakit",
  card_on_delivery: "Kapıda kartla",
  bank_transfer: "Havale / EFT",
  cash: "Nakit",
  card: "Kart",
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  receive: "Mal kabul",
  sale_pos: "Mağaza satışı",
  sale_online: "Online sipariş",
  cancel: "Sipariş iptali",
  return: "Müşteri iadesi",
  waste: "Fire",
  count: "Sayım farkı",
  adjust: "Düzeltme",
};

export const ROLE_LABELS: Record<Role, string> = { owner: "Mağaza sahibi", staff: "Personel", courier: "Kurye" };

export const LEGAL_LABELS: Record<LegalKind, string> = {
  kvkk: "KVKK Aydınlatma Metni",
  gizlilik: "Gizlilik Politikası",
  "mesafeli-satis": "Mesafeli Satış Sözleşmesi",
  "on-bilgilendirme": "Ön Bilgilendirme Formu",
  iade: "İade ve Değişim Koşulları",
};

export const DEFAULT_CATEGORIES = [
  "Kedi Maması",
  "Köpek Maması",
  "Yaş Mama & Konserve",
  "Ödül & Atıştırmalık",
  "Kedi Kumu",
  "Oyuncak",
  "Tasma & Gezdirme",
  "Taşıma Çantası",
  "Yatak & Kulübe",
  "Mama & Su Kabı",
  "Bakım & Hijyen",
  "Parfüm & Şampuan",
  "Akvaryum & Balık",
  "Kuş Ürünleri",
  "Kemirgen Ürünleri",
];
