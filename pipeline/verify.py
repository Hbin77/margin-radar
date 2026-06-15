#!/usr/bin/env python3
"""검증: '의자' 전체(상한없이) 수집 → 세부품명별 진짜 경쟁업체수 확인."""
import os, json, urllib.parse, urllib.request
from collections import defaultdict

KEY = os.environ["G2B_KEY"]
B = "https://apis.data.go.kr/1230000/at/ShoppingMallPrdctInfoService/getMASCntrctPrdctInfoList"
WINDOWS = [("202404010000", "202503312359"), ("202504010000", "202603312359")]


def collect_all(cat):
    rows, enc = [], cat
    for bgn, end in WINDOWS:
        for pg in range(1, 60):
            q = {"ServiceKey": KEY, "type": "json", "numOfRows": "100",
                 "pageNo": str(pg), "prdctClsfcNoNm": enc,
                 "rgstDtBgnDt": bgn, "rgstDtEndDt": end}
            url = B + "?" + urllib.parse.urlencode(q, safe="")
            try:
                d = json.load(urllib.request.urlopen(
                    urllib.request.Request(url, headers={"User-Agent": "M"}), timeout=25))
            except Exception:
                break
            b = d.get("response", {}).get("body", {})
            it = b.get("items", {})
            it = it.get("item", []) if isinstance(it, dict) else it
            it = it if isinstance(it, list) else [it]
            if not it:
                break
            rows += it
            if pg * 100 >= int(b.get("totalCount", 0)):
                break
    return rows


rows = collect_all("의자")
print(f"'의자' 전체 수집: {len(rows)}행 (상한 없이)")
g = defaultdict(set)
for r in rows:
    g[r.get("prdctClsfcNoNm")].add(r.get("cntrctCorpNm"))
print("세부품명별 실제 경쟁업체수 (상위 12):")
for nm, corps in sorted(g.items(), key=lambda x: -len(x[1]))[:12]:
    print(f"  {nm:<16} {len(corps)}곳")
print(f"\n※ 본수집(상한600) 때 '접이식의자'는 4곳으로 집계됐음 — 위와 비교")
