import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export function monthName(month: number) {
  return MONTHS[month - 1] ?? "";
}

export const TIER_LABELS: Record<string, string> = {
  Free: "Ücretsiz",
  Starter: "Başlangıç",
  Professional: "Profesyonel",
  Enterprise: "Kurumsal",
};

export const STATUS_LABELS: Record<string, string> = {
  Open: "Açık", InProgress: "Devam Ediyor", Resolved: "Çözüldü", Closed: "Kapatıldı",
  Pending: "Bekliyor", Paid: "Ödendi", Overdue: "Gecikmiş", PartiallyPaid: "Kısmi Ödeme", Waived: "Muaf",
  Scheduled: "Planlandı", Completed: "Tamamlandı", Cancelled: "İptal", Postponed: "Ertelendi",
  Occupied: "Dolu", Empty: "Boş", ForSale: "Satılık", ForRent: "Kiralık",
};

export const PRIORITY_LABELS: Record<string, string> = {
  Low: "Düşük", Medium: "Orta", High: "Yüksek", Critical: "Kritik",
};

export const CATEGORY_LABELS: Record<string, string> = {
  Electrical: "Elektrik", Plumbing: "Su/Tesisat", Elevator: "Asansör",
  Common: "Ortak Alan", Security: "Güvenlik", Cleaning: "Temizlik", Other: "Diğer",
  General: "Genel", Maintenance: "Bakım", Meeting: "Toplantı", Financial: "Mali", Emergency: "Acil",
};
