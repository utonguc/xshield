"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()}>🖨️ Yazdır / PDF Olarak Kaydet</button>
  );
}
