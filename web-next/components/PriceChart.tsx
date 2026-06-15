import { GitCommitHorizontal } from "lucide-react";
import type { Item } from "@/lib/types";
import { won } from "@/lib/format";

const JIT = [34, 58, 44, 70, 38, 62, 50, 30, 66, 42, 54, 48];

export function PriceChart({ item }: { item: Item }) {
  const cps = item.corps.map((c) => c.median).filter((p) => p > 0);
  if (cps.length < 2) return null;

  const lo = Math.min(...cps, item.govPrice, item.retailPrice);
  const sorted = [...cps].sort((a, b) => a - b);
  const p85 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.85))];
  const hi = Math.max(item.govPrice, item.retailPrice, p85) * 1.08;
  const span = hi - lo || 1;
  const x = (p: number) => (Math.min(Math.max((p - lo) / span, 0), 1) * 90 + 5).toFixed(1);

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[13.5px] font-semibold">
        <GitCommitHorizontal size={16} className="text-brand" />
        가격 분포 · 경쟁사 단가({cps.length}곳)와 정부·시중 단가
      </div>
      <div className="relative h-24 rounded-lg bg-surface-warm">
        {cps.map((p, i) => (
          <span
            key={i}
            title={won(p)}
            className="absolute size-2 -translate-x-1/2 translate-y-1/2 rounded-full"
            style={{
              left: `${x(p)}%`,
              bottom: `${JIT[i % JIT.length]}%`,
              background: p > hi ? "var(--color-faint)" : "var(--color-brand)",
              opacity: p > hi ? 0.5 : 0.8,
            }}
          />
        ))}
        <span
          className="absolute bottom-0 top-0 w-px border-l-2 border-dashed border-success"
          style={{ left: `${x(item.retailPrice)}%` }}
        />
        <span
          className="absolute bottom-0 top-0 w-px border-l-2 border-danger"
          style={{ left: `${x(item.govPrice)}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11.5px]">
        <span className="tnum text-faint">{won(lo)}</span>
        <span className="font-semibold text-success">시중 {won(item.retailPrice)}</span>
        <span className="font-semibold text-danger">정부 {won(item.govPrice)}</span>
        <span className="tnum text-faint">{won(hi)}</span>
      </div>
    </div>
  );
}
