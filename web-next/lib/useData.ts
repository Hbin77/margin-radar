"use client";

import { useEffect, useState } from "react";
import type { MRData } from "./types";

// data.json 클라이언트 fetch + 5분마다 폴링(갱신시각 바뀌면 교체) → 매일 자동갱신 실시간 반영
export function useData() {
  const [data, setData] = useState<MRData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = (bust: boolean) =>
      fetch(bust ? `/data.json?t=${Date.now()}` : "/data.json")
        .then((r) => r.json())
        .then((d: MRData) => {
          if (!alive) return;
          setData((prev) => (!prev || prev.updated !== d.updated ? d : prev));
        })
        .catch((e) => {
          if (alive) setError((prev) => prev ?? String(e));
        });

    load(false);
    const id = setInterval(() => load(true), 300_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return { data, error };
}
