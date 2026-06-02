"use client";
interface Option { value: string | number; label: string; }
interface Props { basePath: string; paramName?: string; options: Option[]; current?: string; placeholder?: string; }

export function FilterSelect({ basePath, paramName = "customer", options, current, placeholder = "Tüm müşteriler" }: Props) {
  return (
    <select
      className="filter-select"
      defaultValue={current ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        window.location.href = v ? `${basePath}?${paramName}=${v}` : basePath;
      }}
      style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)", borderRadius: 8, padding: "7px 10px", color: "var(--text)", fontSize: 13, outline: "none" }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
