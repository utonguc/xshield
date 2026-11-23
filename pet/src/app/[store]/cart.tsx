"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = { variantId: string; qty: number; name: string; unit: "adet" | "kg" };

type CartCtx = {
  slug: string;
  items: CartItem[];
  ready: boolean;
  add: (item: CartItem) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);

const keyFor = (slug: string) => `pet-cart:${slug}`;

function load(slug: string): CartItem[] {
  try {
    const raw = localStorage.getItem(keyFor(slug));
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.variantId === "string" && i.qty > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Sepet tarayıcıda saklanır; sunucu render'ında boş başlar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(load(slug));
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === keyFor(slug) && setItems(load(slug));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [slug]);

  const persist = useCallback(
    (next: CartItem[]) => {
      setItems(next);
      try {
        localStorage.setItem(keyFor(slug), JSON.stringify(next));
      } catch {
        // gizli sekme vb. — sepet yalnızca bu sayfada yaşar
      }
    },
    [slug],
  );

  const value = useMemo<CartCtx>(
    () => ({
      slug,
      items,
      ready,
      count: items.reduce((s, i) => s + (i.unit === "kg" ? 1 : i.qty), 0),
      add: (item) => {
        const i = items.findIndex((x) => x.variantId === item.variantId);
        persist(i >= 0 ? items.map((x, j) => (j === i ? { ...x, qty: Math.round((x.qty + item.qty) * 1000) / 1000 } : x)) : [...items, item]);
      },
      setQty: (id, qty) => persist(qty > 0 ? items.map((x) => (x.variantId === id ? { ...x, qty } : x)) : items.filter((x) => x.variantId !== id)),
      remove: (id) => persist(items.filter((x) => x.variantId !== id)),
      clear: () => persist([]),
    }),
    [slug, items, ready, persist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}

export function CartButton() {
  const { slug, count } = useCart();
  return (
    <Link href={`/${slug}/sepet`} className="relative inline-flex items-center gap-2 rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-white hover:bg-stone-800">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden>
        <path d="M6 6h15l-1.5 9h-12L6 6Zm0 0L5 3H2m6 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hidden sm:inline">Sepet</span>
      {count > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-xs font-bold">{count}</span>}
    </Link>
  );
}

export function AddToCartButton({
  item,
  disabled,
  className = "btn-primary w-full",
  children = "Sepete ekle",
}: {
  item: CartItem;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      className={className}
      onClick={() => {
        add(item);
        setAdded(true);
        setTimeout(() => setAdded(false), 1400);
      }}
    >
      {disabled ? "Tükendi" : added ? "Eklendi ✓" : children}
    </button>
  );
}
