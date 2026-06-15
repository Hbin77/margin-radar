"use client";

import {
  ArrowLeft,
  DoorOpen,
  Lock,
  Cpu,
  Building2,
  Ruler,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import type { Item } from "@/lib/types";
import { won, wonShort, marginColor, entryColor, clusterColor } from "@/lib/format";
import { ScoreBadge } from "./Badges";
import { PriceChart } from "./PriceChart";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-surface p-4 ${className}`}>
      {children}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="min-w-[140px] flex-1">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="tnum mt-0.5 text-[19px] font-bold leading-tight" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11.5px] text-muted">{sub}</div>}
    </div>
  );
}

function H2({ icon: Icon, children }: { icon: typeof Cpu; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-1.5 text-[13.5px] font-semibold">
      <Icon size={16} className="text-brand" />
      {children}
    </div>
  );
}

const ENTRY_COPY: Record<string, string> = {
  개방형: "일반 제조·수입사도 진입 가능한 개방 시장입니다. 마진이 실제 기회로 이어질 수 있습니다.",
  혼합: "일부 품목이 중소기업자간 경쟁제품으로 지정돼 진입에 제약이 있습니다.",
  "중기경쟁 제한":
    "대부분 중소기업자간 경쟁제품으로, 중소기업 직접생산자만 납품 가능합니다. 수입·유통사는 직접 진입이 어렵습니다.",
};

export function DetailView({ item, onBack }: { item: Item; onBack: () => void }) {
  const mc = marginColor(item.margin);
  const ec = entryColor(item.entryType);
  const open = item.entryType === "개방형";

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> 랭킹으로
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold leading-tight tracking-tight">{item.name}</h1>
          <div className="mt-0.5 text-[13px] text-muted">{item.category}</div>
        </div>
        <ScoreBadge score={item.score} size="lg" />
      </div>

      {/* 핵심 지표 */}
      <Card>
        <div className="flex flex-wrap gap-y-4">
          <Metric label="정부 계약단가(중앙값)" value={won(item.govPrice)} />
          <Metric label="동급 시중가(중앙값)" value={won(item.retailPrice)} />
          <Metric label="마진배수" value={`${item.margin}배`} color={mc.fg} />
          <Metric label="경쟁 업체(하한)" value={`${item.competition}곳~`} />
          {item.demand > 0 && (
            <>
              <Metric
                label="정부 구매액(1개월)"
                value={wonShort(item.demand)}
                color="var(--color-brand)"
                sub={`${item.demandCnt.toLocaleString()}건 · 수요기관 ${item.demandInst.toLocaleString()}곳`}
              />
              <Metric
                label="업체당 수요(시장 매력)"
                value={wonShort(Math.round(item.demand / Math.max(item.competition, 1)))}
                color="var(--color-success)"
                sub="수요 ÷ 경쟁업체"
              />
            </>
          )}
        </div>
      </Card>

      {/* 진입 가능성 */}
      <div
        className="rounded-[var(--radius-card)] border border-line bg-surface p-4"
        style={{ borderLeftWidth: 4, borderLeftColor: ec.fg }}
      >
        <H2 icon={open ? DoorOpen : Lock}>
          진입 가능성: <span style={{ color: ec.fg }}>{item.entryType}</span>
          <span className="ml-1 font-normal text-muted">
            (중소기업자간 경쟁제품 비율 {item.smeRatio}%)
          </span>
        </H2>
        <p className="text-[13px] leading-relaxed text-ink-2">{ENTRY_COPY[item.entryType]}</p>
      </div>

      {/* AI 가격예측·이상탐지 */}
      {item.mlPrice > 0 && (
        <Card>
          <H2 icon={Cpu}>
            AI 가격 예측 · 이상탐지
            <span className="ml-1 font-normal text-muted">(HistGBM+RF 앙상블, R²=0.948)</span>
          </H2>
          <div className="flex flex-wrap gap-y-4">
            <Metric
              label="AI 예측 적정가"
              value={won(item.mlPrice)}
              color="var(--color-brand)"
              sub="제품 특성 기반 예측"
            />
            <Metric
              label="AI 기준 가격편차"
              value={`${item.overpayPct > 0 ? "+" : ""}${item.overpayPct}%`}
              color={
                item.overpayPct >= 30
                  ? "var(--color-danger)"
                  : item.overpayPct <= -10
                    ? "var(--color-success)"
                    : "var(--color-ink-2)"
              }
              sub="정부단가 vs AI예측가"
            />
            <Metric
              label="시장 군집(KMeans)"
              value={<span className="text-[16px]">{item.cluster || "-"}</span>}
              color={clusterColor(item.cluster)}
              sub="비지도 세분화"
            />
            <Metric
              label="이상 거래 탐지"
              value={<span className="text-[16px]">{item.anomaly ? "이상치" : "정상"}</span>}
              color={item.anomaly ? "var(--color-danger)" : "var(--color-ink-2)"}
              sub="IsolationForest"
            />
          </div>
        </Card>
      )}

      <PriceChart item={item} />

      {/* 경쟁사 + 규격 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <H2 icon={Building2}>경쟁 업체 ({item.corps.length}곳, 단가순)</H2>
          <ul className="divide-y divide-line-soft text-[13px]">
            {item.corps.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-2 py-1.5">
                {c.doc ? (
                  <a
                    href={c.doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-brand hover:underline"
                  >
                    {c.name}
                  </a>
                ) : (
                  <span className="truncate text-ink-2">{c.name}</span>
                )}
                <span className="tnum shrink-0 text-muted">{c.median ? won(c.median) : "-"}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <H2 icon={Ruler}>정부 납품 규격 샘플</H2>
          <p className="mb-2 text-[11.5px] text-muted">
            규격서 항목 클릭 시 조달청 종합쇼핑몰의 실제 규격서 문서가 열립니다.
          </p>
          <div className="space-y-1.5">
            {item.specs.length ? (
              item.specs.map((s, i) =>
                s.doc ? (
                  <a
                    key={i}
                    href={s.doc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface-warm px-2.5 py-1.5 text-[12.5px] transition-colors hover:border-brand"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
                      <FileText size={13} className="shrink-0" />
                      <span className="truncate">{s.spec}</span>
                    </span>
                    <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-brand">
                      규격서
                    </span>
                  </a>
                ) : (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] text-ink-2"
                  >
                    <FileText size={13} className="shrink-0" />
                    <span className="truncate">{s.spec}</span>
                  </div>
                ),
              )
            ) : (
              <div className="text-[12.5px] text-muted">규격 정보 없음</div>
            )}
          </div>
          {item.imgs.length > 0 && (
            <>
              <div className="mb-3 mt-4 flex items-center gap-1.5 text-[13.5px] font-semibold">
                <ImageIcon size={16} className="text-brand" />
                상품 이미지
              </div>
              <div className="grid grid-cols-3 gap-2">
                {item.imgs.map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={u}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full rounded-md border border-line object-contain bg-surface-warm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
