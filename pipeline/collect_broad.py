#!/usr/bin/env python3
"""광범위 수집 — 종합쇼핑몰 3개 계약유형(MAS·일반단가·제3자단가)을 날짜로 전수 페이징.
품명 검색의 매칭 한계를 우회해, 실제 존재하는 모든 품명을 그대로 수집한다.
기존 products.csv(손수 고른 카테고리 정밀표본)와 병합(중복 제거).
"""
import os, csv, time, urllib.parse, urllib.request, json

KEY = os.environ["G2B_KEY"]
BASE = "https://apis.data.go.kr/1230000/at/ShoppingMallPrdctInfoService"
OPS = [("getMASCntrctPrdctInfoList", "MAS"),
       ("getUcntrctPrdctInfoList", "일반단가"),
       ("getThptyUcntrctPrdctInfoList", "제3자단가")]
WINDOW = ("202603010000", "202603312359")   # 1개월 등록분 전수(분류 전 범위 커버)
PER_PAGE = 999
MAX_PAGES = 90                                # op당 페이지 상한(MAS 1개월≈72p)
DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"

KEEP = ["category", "prdctClsfcNoNm", "dtilPrdctClsfcNo", "prdctIdntNo",
        "cntrctCorpNm", "cntrctCorpNo", "entrprsDivNm", "prdctSpecNm", "prdctMakrNm",
        "cntrctPrceAmt", "orderCalclPrceAmt", "prdctUnit", "exclncPrcrmntPrdctYn",
        "smetprCmptProdctYn", "prdctImgUrl", "rgstDt", "cntrctBgnDate", "cntrctEndDate",
        "specDocAtchFileNmUrl1", "shopngCntrctNo", "cntrctDeptNm", "cntrctDeptTelNo"]


def get(op, page, tries=3):
    q = {"ServiceKey": KEY, "type": "json", "numOfRows": str(PER_PAGE), "pageNo": str(page),
         "rgstDtBgnDt": WINDOW[0], "rgstDtEndDt": WINDOW[1]}
    url = f"{BASE}/{op}?" + urllib.parse.urlencode(q, safe="")
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            b = d.get("response", {}).get("body", {})
            it = b.get("items", {})
            it = it.get("item", []) if isinstance(it, dict) else it
            it = it if isinstance(it, list) else [it]
            return int(b.get("totalCount", 0)), it
        except Exception:
            time.sleep(1.5)
    return -1, []


def main():
    seen = set()
    rows = []
    # 기존 정밀표본 먼저 적재(중복키 등록)
    path = os.path.join(DATA, "products.csv")
    if os.path.exists(path):
        for r in csv.DictReader(open(path, encoding="utf-8-sig")):
            k = (r.get("prdctIdntNo"), r.get("cntrctCorpNo"), r.get("prdctSpecNm"))
            seen.add(k)
            rows.append({c: r.get(c, "") for c in KEEP})
    base_n = len(rows)
    print(f"기존 표본 {base_n}행 로드", flush=True)

    for op, label in OPS:
        total, _ = get(op, 1)
        if total < 0:
            print(f"  {label}: 조회 실패", flush=True); continue
        pages = min(MAX_PAGES, (total + PER_PAGE - 1) // PER_PAGE)
        added = 0
        for p in range(1, pages + 1):
            _, items = get(op, p)
            if not items:
                break
            for r in items:
                k = (r.get("prdctIdntNo"), r.get("cntrctCorpNo"), r.get("prdctSpecNm"))
                if k in seen:
                    continue
                seen.add(k)
                row = {c: r.get(c, "") for c in KEEP}
                row["category"] = label          # 계약유형을 category로 기록
                rows.append(row)
                added += 1
            time.sleep(0.15)
        print(f"  {label}: total {total:,} → {pages}p 수집, 신규 {added:,}행", flush=True)

    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=KEEP)
        w.writeheader()
        w.writerows(rows)
    # 품명 다양성 리포트
    nms = {r["prdctClsfcNoNm"] for r in rows if r.get("prdctClsfcNoNm")}
    print(f"\n총 {len(rows):,}행(신규 {len(rows)-base_n:,}), 고유 품명 {len(nms):,}개 → {path}", flush=True)


if __name__ == "__main__":
    main()
