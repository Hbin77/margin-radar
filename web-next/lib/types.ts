export interface Corp {
  name: string;
  median: number;
  doc?: string;
}

export interface Spec {
  spec: string;
  doc?: string;
}

export type EntryType = "개방형" | "혼합" | "중기경쟁 제한";

export interface Item {
  name: string;
  category: string;
  score: number;
  margin: number;
  govPrice: number;
  retailPrice: number;
  competition: number;
  productCount: number;
  matchCount: number;
  entryType: EntryType;
  smeRatio: number;
  demand: number;
  demandCnt: number;
  demandInst: number;
  mlPrice: number;
  overpayPct: number;
  cluster: string;
  anomaly: number | boolean;
  corps: Corp[];
  specs: Spec[];
  imgs: string[];
}

export interface Stats {
  totalProducts: number;
  categories: number;
  rankedItems: number;
  avgMargin: number;
  openItems: number;
  hasDemand: boolean;
}

export interface MRData {
  generated: string;
  updated: string;
  disclaimer: string;
  stats: Stats;
  items: Item[];
}
