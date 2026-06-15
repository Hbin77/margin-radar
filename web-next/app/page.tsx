"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useData } from "@/lib/useData";
import { Header, type View } from "@/components/Header";
import { KpiBar } from "@/components/KpiBar";
import { RankingTable } from "@/components/RankingTable";
import { DetailView } from "@/components/DetailView";
import { LookupView } from "@/components/LookupView";

export default function Home() {
  const { data, error } = useData();
  const [view, setView] = useState<View>("ranking");
  const [selected, setSelected] = useState<string | null>(null);

  const openDetail = useCallback((name: string) => {
    setSelected(name);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goView = useCallback((v: View) => {
    setView(v);
    setSelected(null);
  }, []);

  const item = data?.items.find((i) => i.name === selected) ?? null;
  const motionProps = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header view={view} onView={goView} updated={data?.updated} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6">
        {error && !data && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-4 py-16 text-center text-[14px] text-muted">
            데이터를 불러오지 못했습니다: {error}
          </div>
        )}

        {!data && !error && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[88px] animate-pulse rounded-[var(--radius-card)] bg-line-soft"
                />
              ))}
            </div>
            <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-line-soft" />
          </div>
        )}

        {data && (
          <AnimatePresence mode="wait">
            {view === "detail" && item ? (
              <motion.div key={`detail-${item.name}`} {...motionProps}>
                <DetailView item={item} onBack={() => goView("ranking")} />
              </motion.div>
            ) : view === "lookup" ? (
              <motion.div key="lookup" {...motionProps}>
                <LookupView items={data.items} onSelect={openDetail} />
              </motion.div>
            ) : (
              <motion.div key="ranking" {...motionProps} className="space-y-5">
                <KpiBar stats={data.stats} />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h1 className="text-[20px] font-bold tracking-tight">블루오션 랭킹</h1>
                  <span className="text-[12px] text-muted">
                    {data.stats.hasDemand
                      ? "점수 = 마진(30%) + 진입가능성(30%) + 수요(25%) + 저경쟁(15%)"
                      : "점수 = 마진(40%) + 진입가능성(40%) + 저경쟁(20%)"}{" "}
                    · 동급 비교 기준
                  </span>
                </div>
                <RankingTable
                  items={data.items}
                  hasDemand={data.stats.hasDemand}
                  onSelect={openDetail}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      <footer className="border-t border-line bg-surface-warm">
        <div className="mx-auto max-w-6xl px-5 py-4 text-[11.5px] leading-relaxed text-muted">
          {data?.disclaimer ??
            "동급 비교 기준 · 경쟁업체수는 최근 등록 기준 하한 · 수요는 1개월 실거래 스냅샷."}
        </div>
      </footer>
    </div>
  );
}
