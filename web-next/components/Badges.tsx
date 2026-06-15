import { marginColor, scoreColor, entryColor } from "@/lib/format";

export function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  return (
    <span
      className={`tnum inline-grid place-items-center rounded-md font-semibold text-white ${
        size === "lg" ? "h-9 min-w-14 px-2 text-base" : "h-7 min-w-11 px-1.5 text-[13px]"
      }`}
      style={{ background: scoreColor(score) }}
    >
      {score}
    </span>
  );
}

export function MarginBadge({ margin, big = false }: { margin: number; big?: boolean }) {
  const c = marginColor(margin);
  return (
    <span
      className={`tnum inline-block whitespace-nowrap rounded-md font-semibold ${big ? "px-2.5 py-1 text-[15px]" : "px-2 py-0.5 text-[13px]"}`}
      style={{ background: c.bg, color: c.fg }}
    >
      {margin}배
    </span>
  );
}

export function EntryBadge({ entryType }: { entryType: string }) {
  const c = entryColor(entryType);
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[12px] font-semibold"
      style={{ background: c.bg, color: c.fg }}
    >
      {entryType}
    </span>
  );
}
