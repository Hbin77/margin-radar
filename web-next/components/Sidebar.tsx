"use client";

import { Radar, Search } from "lucide-react";
import { RadarMark } from "./Logo";

export type View = "ranking" | "lookup" | "detail";

const NAV: { id: View; label: string; icon: typeof Radar }[] = [
  { id: "ranking", label: "블루오션 랭킹", icon: Radar },
  { id: "lookup", label: "내 제품 역조회", icon: Search },
];

export function Sidebar({
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
    <>
      {/* 데스크톱: 좌측 네이비 사이드바 */}
      <aside className="hidden bg-navy text-white/75 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-56 lg:flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid size-9 place-items-center rounded-[9px] bg-navy-soft text-cream">
            <RadarMark size={20} />
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-white">Margin Radar</div>
            <div className="text-[10.5px] text-white/45">공공조달 인텔리전스</div>
          </div>
        </div>

        <nav role="tablist" aria-label="화면 전환" className="mt-2 flex flex-col gap-1 px-3">
          {NAV.map((t) => {
            const Icon = t.icon;
            const on = active === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => onView(t.id)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
                  on ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={16} strokeWidth={2.1} />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-5 py-4 text-[10.5px] leading-relaxed text-white/40">
          {updated && (
            <>
              최종 갱신
              <br />
              <span className="tnum text-white/55">{updated}</span>
            </>
          )}
          <div className="mt-1.5">조달청 종합쇼핑몰 · 네이버 쇼핑</div>
        </div>
      </aside>

      {/* 모바일: 상단 네이비 바 */}
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-navy px-4 py-3 text-white lg:hidden">
        <span className="grid size-8 place-items-center rounded-lg bg-navy-soft text-cream">
          <RadarMark size={18} />
        </span>
        <span className="text-[15px] font-bold">Margin Radar</span>
        <nav className="ml-auto flex gap-1" aria-label="화면 전환">
          {NAV.map((t) => {
            const Icon = t.icon;
            const on = active === t.id;
            return (
              <button
                key={t.id}
                aria-label={t.label}
                aria-selected={on}
                onClick={() => onView(t.id)}
                className={`grid size-10 place-items-center rounded-lg transition-colors ${
                  on ? "bg-white/15 text-white" : "text-white/60"
                }`}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </nav>
      </header>
    </>
  );
}
