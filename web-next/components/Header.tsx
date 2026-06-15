"use client";

import { Radar, Search } from "lucide-react";
import { RadarMark } from "./Logo";

export type View = "ranking" | "lookup" | "detail";

const TABS: { id: View; label: string; icon: typeof Radar }[] = [
  { id: "ranking", label: "블루오션 랭킹", icon: Radar },
  { id: "lookup", label: "내 제품 역조회", icon: Search },
];

export function Header({
  view,
  onView,
  updated,
}: {
  view: View;
  onView: (v: View) => void;
  updated?: string;
}) {
  const active: View = view === "detail" ? "ranking" : view;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-[9px] bg-navy text-cream">
            <RadarMark size={20} />
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">Margin Radar</div>
            <div className="text-[11px] text-muted">공공조달 블루오션·마진 발굴 엔진</div>
          </div>
        </div>

        <nav role="tablist" aria-label="화면 전환" className="ml-auto flex gap-1 rounded-[10px] bg-[#F1F0EA] p-[3px]">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = active === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                aria-label={t.label}
                onClick={() => onView(t.id)}
                className={`flex min-h-11 items-center gap-1.5 rounded-md px-3.5 text-[13.5px] font-semibold transition-colors ${
                  on
                    ? "bg-surface text-ink shadow-[0_1px_2px_rgba(13,19,33,.08)]"
                    : "text-muted hover:text-ink-2"
                }`}
              >
                <Icon size={15} strokeWidth={2.2} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      {updated && (
        <div className="border-t border-line-soft bg-surface-warm">
          <div className="mx-auto max-w-6xl px-5 py-1.5 text-[11px] text-muted">
            <span className="tnum">최종 갱신 {updated}</span> · 조달청 종합쇼핑몰 품목정보 API ·
            네이버 쇼핑 · MR 분석
          </div>
        </div>
      )}
    </header>
  );
}
