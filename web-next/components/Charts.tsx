"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Item } from "@/lib/types";
import { wonShort } from "@/lib/format";

const AXIS = "#7A828F";
const GRID = "#EEF1F6";

function ChartCard({
  title,
  children,
  legend,
}: {
  title: string;
  children: React.ReactNode;
  legend?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[12.5px] font-semibold text-ink-2">{title}</div>
        {legend}
      </div>
      <div className="h-[132px] min-w-0">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  background: "#FFFFFF",
  border: "1px solid #E5E9F0",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  padding: "6px 9px",
  boxShadow: "0 2px 8px rgba(15,23,42,.08)",
};

// 1) 마진배수 분포 히스토그램
export function MarginHistogram({ items }: { items: Item[] }) {
  const data = useMemo(() => {
    const bins = [
      { label: "<1.0", lo: 0, hi: 1.0, fill: "#94A3B8" },
      { label: "1.0–1.3", lo: 1.0, hi: 1.3, fill: "#0E7490" },
      { label: "1.3–1.6", lo: 1.3, hi: 1.6, fill: "#3E5C76" },
      { label: "1.6–2.0", lo: 1.6, hi: 2.0, fill: "#B45309" },
      { label: "2.0+", lo: 2.0, hi: Infinity, fill: "#B91C1C" },
    ];
    return bins.map((b) => ({
      label: b.label,
      fill: b.fill,
      count: items.filter((it) => it.margin >= b.lo && it.margin < b.hi).length,
    }));
  }, [items]);

  return (
    <ChartCard title="마진배수 분포">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10.5, fill: AXIS }} axisLine={{ stroke: GRID }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
          <Tooltip cursor={{ fill: "#F4F6F9" }} contentStyle={tooltipStyle} formatter={(v) => [`${v}종`, "품목"]} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={42}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// 2) 진입유형 도넛
const ENTRY_COLORS: Record<string, string> = {
  개방형: "#15803D",
  혼합: "#B45309",
  "중기경쟁 제한": "#64748B",
};

export function EntryDonut({ items }: { items: Item[] }) {
  const data = useMemo(() => {
    const order = ["개방형", "혼합", "중기경쟁 제한"];
    const counts = items.reduce<Record<string, number>>((a, it) => {
      a[it.entryType] = (a[it.entryType] ?? 0) + 1;
      return a;
    }, {});
    return order
      .filter((k) => counts[k])
      .map((k) => ({ name: k, value: counts[k], fill: ENTRY_COLORS[k] }));
  }, [items]);

  const total = items.length;
  const openPct = Math.round(((data.find((d) => d.name === "개방형")?.value ?? 0) / total) * 100);

  return (
    <ChartCard
      title="진입유형 분포"
      legend={
        <div className="flex gap-2 text-[10.5px] text-muted">
          {data.map((d) => (
            <span key={d.name} className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: d.fill }} />
              {d.name === "중기경쟁 제한" ? "제한" : d.name}
            </span>
          ))}
        </div>
      }
    >
      <div className="relative h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={40}
              outerRadius={58}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v}종`, n as string]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center leading-none">
            <div className="tnum text-[20px] font-bold text-ink">{openPct}%</div>
            <div className="text-[10px] text-muted">개방형</div>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

// 3) 정부 수요 상위 품목 (1개월 실거래)
export function DemandTop({ items }: { items: Item[] }) {
  const data = useMemo(
    () =>
      items
        .filter((it) => it.demand > 0)
        .sort((a, b) => b.demand - a.demand)
        .slice(0, 6)
        .map((it) => ({
          name: it.name.length > 8 ? it.name.slice(0, 7) + "…" : it.name,
          full: it.name,
          demand: it.demand,
        })),
    [items],
  );

  return (
    <ChartCard title="정부 수요 상위 품목 (1개월)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 2, right: 10, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10.5, fill: "#566071" }}
            axisLine={false}
            tickLine={false}
            width={72}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "#F4F6F9" }}
            contentStyle={tooltipStyle}
            formatter={(v) => [wonShort(Number(v)), "정부 구매액"]}
            labelFormatter={(_l, p) => (p?.[0]?.payload?.full as string) ?? ""}
          />
          <Bar dataKey="demand" fill="#3E5C76" radius={[0, 4, 4, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
