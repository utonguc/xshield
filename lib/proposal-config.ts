import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join("/app/data", "proposal_xs2026047.json");

export interface ProposalPrices {
  gelistirme: number;
  veri_aktarimi: number;
  altyapi: number;
  egitim: number;
  garanti: number;
  sunucu_min: number;
  sunucu_max: number;
}

const DEFAULTS: ProposalPrices = {
  gelistirme: 38000,
  veri_aktarimi: 2500,
  altyapi: 1500,
  egitim: 1000,
  garanti: 2000,
  sunucu_min: 800,
  sunucu_max: 1000,
};

export function getPrices(): ProposalPrices {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrices(prices: ProposalPrices): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(prices, null, 2), "utf-8");
}

export function fmt(n: number): string {
  return "$" + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function calcTotal(p: ProposalPrices): number {
  return p.gelistirme + p.veri_aktarimi + p.altyapi + p.egitim + p.garanti;
}

export function fmtRange(min: number, max: number): string {
  return `~${fmt(min)}–${fmt(max)}/ay`;
}
