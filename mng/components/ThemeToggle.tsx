"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("mng-theme") as "dark" | "light") || "dark";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("mng-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Aydınlık moda geç" : "Karanlık moda geç"}
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        fontSize: 16, padding: "4px 6px", borderRadius: 6, lineHeight: 1,
        transition: "opacity 0.15s", opacity: 0.5,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
