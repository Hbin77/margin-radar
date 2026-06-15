import { Boxes, Database, TrendingUp, DoorOpen } from "lucide-react";
import type { Stats } from "@/lib/types";

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
        <Icon size={14} strokeWidth={2} />
        {label}
      </div>
      <div className="mt-1.5 text-[26px] font-bold leading-none tracking-tight">
        <span className="tnum">{value}</span>
        {sub && <span className="ml-1 text-[13px] font-medium text-faint">{sub}</span>}
      </div>
    </div>
  );
}

export function KpiBar({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi icon={Boxes} label="분석 품목" value={stats.rankedItems.toLocaleString()} sub="종" />
      <Kpi
        icon={Database}
        label="수집 거래데이터"
        value={stats.totalProducts.toLocaleString()}
        sub="건"
      />
      <Kpi icon={TrendingUp} label="평균 마진배수" value={`${stats.avgMargin}배`} />
      <Kpi
        icon={DoorOpen}
        label="진입 가능(개방형)"
        value={stats.openItems.toLocaleString()}
        sub="종"
      />
    </div>
  );
}
