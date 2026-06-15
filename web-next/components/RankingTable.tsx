"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import type { Item } from "@/lib/types";
import { won, wonShort, compColor } from "@/lib/format";
import { ScoreBadge, MarginBadge, EntryBadge } from "./Badges";

type Row = Item & { rank: number };
const col = createColumnHelper<Row>();

const ENTRY_FILTERS = ["전체", "개방형", "혼합", "중기경쟁 제한"] as const;

export function RankingTable({
  items,
  hasDemand,
  onSelect,
}: {
  items: Item[];
  hasDemand: boolean;
  onSelect: (name: string) => void;
}) {
  const data = useMemo<Row[]>(() => items.map((it, i) => ({ ...it, rank: i + 1 })), [items]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [entry, setEntry] = useState<(typeof ENTRY_FILTERS)[number]>("전체");

  const columns = useMemo(
    () => [
      col.accessor("rank", {
        header: "#",
        cell: (c) => {
          const r = c.getValue();
          return (
            <span
              className={`tnum grid size-7 place-items-center rounded-md text-[12px] font-bold ${
                r <= 3 ? "bg-navy text-cream" : "text-faint"
              }`}
            >
              {r}
            </span>
          );
        },
        enableSorting: false,
      }),
      col.accessor("name", {
        header: "품명 / 카테고리",
        cell: (c) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">{c.getValue()}</div>
            <div className="truncate text-[11.5px] text-muted">{c.row.original.category}</div>
          </div>
        ),
        filterFn: (row, _id, value: string) => {
          const it = row.original;
          return it.name.includes(value) || it.category.includes(value);
        },
      }),
      col.accessor("score", {
        header: "블루오션",
        cell: (c) => <ScoreBadge score={c.getValue()} />,
        sortDescFirst: true,
      }),
      col.accessor("entryType", {
        header: "진입유형",
        cell: (c) => <EntryBadge entryType={c.getValue()} />,
        filterFn: (row, _id, value: string) => value === "전체" || row.original.entryType === value,
      }),
      col.accessor("margin", {
        header: "마진",
        cell: (c) => <MarginBadge margin={c.getValue()} />,
        sortDescFirst: true,
      }),
      col.accessor("demand", {
        header: hasDemand ? "정부 수요(1개월)" : "정부 수요",
        cell: (c) => {
          const v = c.getValue();
          return v ? (
            <span className="tnum text-ink-2" title={won(v)}>
              {wonShort(v)}
            </span>
          ) : (
            <span className="text-faint">-</span>
          );
        },
        sortDescFirst: true,
      }),
      col.accessor("competition", {
        header: "경쟁(하한)",
        cell: (c) => {
          const v = c.getValue();
          const w = Math.max(8, 64 - v * 1.6);
          return (
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line-soft">
                <span
                  className="block h-full rounded-full"
                  style={{ width: w, background: compColor(v) }}
                />
              </span>
              <span className="tnum text-[12px] text-muted">{v}곳~</span>
            </div>
          );
        },
      }),
    ],
    [hasDemand],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _id, value: string) => {
      const it = row.original;
      return it.name.includes(value) || it.category.includes(value);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const setEntryFilter = (v: (typeof ENTRY_FILTERS)[number]) => {
    setEntry(v);
    setColumnFilters(v === "전체" ? [] : [{ id: "entryType", value: v }]);
  };

  const rows = table.getRowModel().rows;

  return (
    <div>
      {/* 툴바 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="품명·카테고리 검색"
            className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13.5px] outline-none placeholder:text-faint focus:border-brand"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-[#F1F0EA] p-[3px]">
          {ENTRY_FILTERS.map((v) => (
            <button
              key={v}
              onClick={() => setEntryFilter(v)}
              className={`rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                entry === v ? "bg-surface text-ink shadow-[0_1px_2px_rgba(13,19,33,.07)]" : "text-muted hover:text-ink-2"
              }`}
            >
              {v === "중기경쟁 제한" ? "제한" : v}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-line bg-surface-warm">
                  {hg.headers.map((h) => {
                    const sortable = h.column.getCanSort();
                    const sorted = h.column.getIsSorted();
                    const isNum = ["score", "margin", "demand"].includes(h.column.id);
                    return (
                      <th
                        key={h.id}
                        onClick={sortable ? h.column.getToggleSortingHandler() : undefined}
                        className={`whitespace-nowrap px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted ${
                          isNum ? "text-right" : "text-left"
                        } ${sortable ? "cursor-pointer select-none hover:text-ink-2" : ""}`}
                      >
                        <span className={`inline-flex items-center gap-1 ${isNum ? "flex-row-reverse" : ""}`}>
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sortable &&
                            (sorted === "desc" ? (
                              <ArrowDown size={12} />
                            ) : sorted === "asc" ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ChevronsUpDown size={12} className="text-faint" />
                            ))}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onSelect(row.original.name)}
                  className="cursor-pointer border-b border-line-soft transition-colors last:border-0 hover:bg-brand-soft/60"
                >
                  {row.getVisibleCells().map((cell) => {
                    const isNum = ["score", "margin", "demand"].includes(cell.column.id);
                    return (
                      <td
                        key={cell.id}
                        className={`px-3 py-2.5 align-middle ${isNum ? "text-right" : "text-left"} ${
                          cell.column.id === "name" ? "max-w-[280px]" : ""
                        }`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className="px-4 py-10 text-center text-[13.5px] text-muted">
            검색 결과가 없습니다.
          </div>
        )}
      </div>
      <div className="mt-2 px-1 text-[12px] text-muted">
        {rows.length}개 표시 · 헤더 클릭으로 정렬 · 행 클릭으로 상세
      </div>
    </div>
  );
}
