"use client";
export function PrintButton({ label }: { label: string }) {
  return (
    <button onClick={() => window.print()} className="print-btn">
      {label}
    </button>
  );
}
