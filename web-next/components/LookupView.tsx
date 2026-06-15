"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Item } from "@/lib/types";
import { wonShort } from "@/lib/format";
import { MarginBadge, EntryBadge } from "./Badges";

function verdict(it: Item): { t: string; c: string } {
  if (it.entryType === "중기경쟁 제한")
    return { t: "진입 제한 — 중소기업 직접생산만 (수입·유통사 어려움)", c: "var(--color-muted)" };
  if (it.margin >= 1.5) return { t: "진입 유망 — 개방 시장 + 고마진", c: "var(--color-success)" };
  if (it.margin >= 1.0) return { t: "검토 — 개방 시장, 마진 여유 보통", c: "var(--color-warning)" };
  return { t: "신중 — 정부가가 시중보다 낮음", c: "var(--color-muted)" };
}

export function LookupView({
  items,
  onSelect,
}: {
  items: Item[];
  onSelect: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const hits = useMemo(() => {
    const k = submitted.trim();
    return k ? items.filter((i) => i.name.includes(k) || i.category.includes(k)) : [];
  }, [submitted, items]);

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-card)] border border-line bg-navy p-6 text-cream">
        <div className="text-[19px] font-bold tracking-tight">
          내 제품, 공공조달에선 얼마에 팔릴까?
        </div>
        <div className="mt-1.5 text-[13px] text-cream/70">
          제품 카테고리를 입력하면 정부 구매단가·마진·경쟁 강도를 진단합니다. (현재 분석된{" "}
          {items.length}개 품목 기준)
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSubmitted(q)}
            placeholder="예: 책상, 의자, 청소기, 공기청정기…"
            className="h-12 w-full rounded-lg border border-line bg-surface pl-11 pr-3 text-[14px] outline-none placeholder:text-faint focus:border-brand"
          />
        </div>
        <button
          onClick={() => setSubmitted(q)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <Search size={16} /> 진단
        </button>
      </div>

      {submitted && hits.length === 0 && (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-4 py-10 text-center text-[13.5px] text-muted">
          「{submitted}」 관련 품목을 찾지 못했습니다. 다른 키워드로 시도해 보세요.
        </div>
      )}

      <div className="space-y-2.5">
        {hits.map((it) => {
          const v = verdict(it);
          return (
            <button
              key={it.name}
              onClick={() => onSelect(it.name)}
              className="flex w-full items-center justify-between gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 text-left transition-colors hover:border-brand"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[16px] font-semibold">
                  <span className="truncate">{it.name}</span>
                  <EntryBadge entryType={it.entryType} />
                </div>
                <div className="mt-1 text-[13px] font-semibold" style={{ color: v.c }}>
                  {v.t}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <MarginBadge margin={it.margin} big />
                <div className="mt-1 text-[11.5px] text-muted">
                  {it.demand ? `수요 ${wonShort(it.demand)} · ` : ""}경쟁 {it.competition}곳~
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
