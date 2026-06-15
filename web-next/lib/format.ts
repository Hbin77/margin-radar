import type { EntryType } from "./types";

export const won = (n: number) => Number(n).toLocaleString("ko-KR") + "원";

export function wonShort(n: number): string {
  n = Number(n);
  if (n >= 1e8) return (n / 1e8).toFixed(1) + "억원";
  if (n >= 1e4) return Math.round(n / 1e4).toLocaleString("ko-KR") + "만원";
  return n.toLocaleString("ko-KR") + "원";
}

export interface Swatch {
  bg: string;
  fg: string;
}

// 마진배수 → 색 (낮은 채도 에디토리얼)
export function marginColor(m: number): Swatch {
  if (m < 1.0) return { bg: "var(--color-line-soft)", fg: "var(--color-faint)" };
  if (m < 1.5) return { bg: "var(--color-info-soft)", fg: "var(--color-info)" };
  if (m < 2.0) return { bg: "var(--color-warning-soft)", fg: "var(--color-warning)" };
  return { bg: "var(--color-danger-soft)", fg: "var(--color-danger)" };
}

// 블루오션 점수 → 진해지는 포레스트그린
export function scoreColor(s: number): string {
  const t = Math.min(s / 80, 1);
  return `hsl(152 32% ${45 - t * 17}%)`;
}

export function compColor(c: number): string {
  return c <= 6
    ? "var(--color-success)"
    : c <= 15
      ? "var(--color-warning)"
      : "var(--color-faint)";
}

export function entryColor(t: EntryType | string): Swatch {
  if (t === "개방형") return { bg: "var(--color-success-soft)", fg: "var(--color-success)" };
  if (t === "혼합") return { bg: "var(--color-warning-soft)", fg: "var(--color-warning)" };
  return { bg: "var(--color-line-soft)", fg: "var(--color-muted)" };
}

export function clusterColor(cluster: string): string {
  if (cluster === "블루오션 후보") return "var(--color-success)";
  if (cluster === "진입제한 시장") return "var(--color-muted)";
  return "var(--color-warning)";
}
