"use client";
import { useState } from "react";

interface Sub { id: number; name: string }
interface Cat { id: number; name: string; color: string; subcategories: Sub[] }

export function CategorySelect({
  categories,
  defaultCategoryId,
  defaultSubcategoryId,
}: {
  categories: Cat[];
  defaultCategoryId?: number | null;
  defaultSubcategoryId?: number | null;
}) {
  const [catId, setCatId] = useState<string>(defaultCategoryId ? String(defaultCategoryId) : "");
  const subs = categories.find((c) => c.id === Number(catId))?.subcategories ?? [];

  return (
    <div className="cat-wrap">
      <div className="field">
        <label>Kategori</label>
        <select
          name="category_id"
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
        >
          <option value="">— Kategori Seç —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {subs.length > 0 && (
        <div className="field">
          <label>Alt Kategori</label>
          <select name="subcategory_id" defaultValue={defaultSubcategoryId ?? ""}>
            <option value="">— Alt Kategori Seç —</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
