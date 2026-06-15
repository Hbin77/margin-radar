"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useData } from "@/lib/useData";
import { Sidebar, type View } from "@/components/Sidebar";
import { KpiBar } from "@/components/KpiBar";
import { MarginHistogram, EntryDonut, DemandTop } from "@/components/Charts";
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
    <div className="min-h-full">
      <Sidebar view={view} onView={goView} updated={data?.updated} />

      <div className="lg:pl-56">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          {error && !data && (
            <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface px-4 py-16 text-center text-[14px] text-muted">
              데이터를 불러오지 못했습니다: {error}
            </div>
          )}

          {!data && !error && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[88px] animate-pulse rounded-[var(--radius-card)] bg-line-soft" />
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[180px] animate-pulse rounded-[var(--radius-card)] bg-line-soft" />
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
                  <div>
                    <h1 className="text-[22px] font-bold tracking-tight">블루오션 대시보드</h1>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {data.stats.hasDemand
                        ? "점수 = 마진(30%) + 진입가능성(30%) + 수요(25%) + 저경쟁(15%)"
                        : "점수 = 마진(40%) + 진입가능성(40%) + 저경쟁(20%)"}{" "}
                      · 동급 비교 기준
                    </p>
                  </div>

                  <KpiBar stats={data.stats} />

                  <div className="grid gap-3 md:grid-cols-3">
                    <MarginHistogram items={data.items} />
                    <EntryDonut items={data.items} />
                    <DemandTop items={data.items} />
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

          <footer className="mt-8 border-t border-line pt-4 text-[11.5px] leading-relaxed text-muted">
            {data?.disclaimer ??
              "동급 비교 기준 · 경쟁업체수는 최근 등록 기준 하한 · 수요는 1개월 실거래 스냅샷."}
          </footer>
        </main>
      </div>
    </div>
  );
}
