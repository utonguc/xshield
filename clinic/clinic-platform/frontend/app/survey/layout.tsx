import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={inter.variable} style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {children}
    </div>
  );
}
