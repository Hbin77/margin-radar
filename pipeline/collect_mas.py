#!/usr/bin/env python3
"""조달청 종합쇼핑몰 MAS 품목 본수집 — 카테고리별 단가·업체(경쟁) 수집.

- 품명(prdctClsfcNoNm) LIKE 검색 + 12개월 윈도 스윕(범위제한 회피)
- 페이지네이션, 품목 중복제거, 카테고리당 상한
- 결과: data/products.csv (분석용 핵심 컬럼)

사용: export $(grep -v '^#' ../.env | xargs); python3 collect_mas.py
"""
import os, sys, csv, json, time, urllib.parse, urllib.request

KEY = os.environ["G2B_KEY"]
B = "https://apis.data.go.kr/1230000/at/ShoppingMallPrdctInfoService/getMASCntrctPrdctInfoList"
DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"

CATEGORIES = ["의자", "소파", "책장", "캐비닛", "사물함", "매트",
              "문서세단기", "책상", "신발장", "진공청소기", "공기청정기", "에어컨"]
WINDOWS = [("202404010000", "202503312359"),
           ("202504010000", "202603312359")]
PER_PAGE = 999              # 호출당 대용량 (7초/콜 → 호출수 최소화)
MAX_PER_CAT = 6000          # 상한 (경쟁업체수 과소집계 보정)

KEEP = ["category", "prdctClsfcNoNm", "dtilPrdctClsfcNo", "prdctIdntNo",
        "cntrctCorpNm", "cntrctCorpNo", "entrprsDivNm", "prdctSpecNm", "prdctMakrNm",
        "cntrctPrceAmt", "orderCalclPrceAmt", "prdctUnit", "exclncPrcrmntPrdctYn",
        "smetprCmptProdctYn", "prdctImgUrl", "rgstDt", "cntrctBgnDate", "cntrctEndDate",
        "specDocAtchFileNmUrl1", "shopngCntrctNo", "cntrctDeptNm", "cntrctDeptTelNo"]


def get(params, tries=3):
    q = {"ServiceKey": KEY, "type": "json", "numOfRows": str(PER_PAGE)}
    q.update(params)
    url = B + "?" + urllib.parse.urlencode(q, safe="")
    for t in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            if "response" in d:
                b = d["response"]["body"]
                items = b.get("items", {})
                it = items.get("item", []) if isinstance(items, dict) else items
                it = it if isinstance(it, list) else [it]
                return int(b.get("totalCount", 0)), it
            return -1, []          # 에러 응답
        except Exception:
            time.sleep(1.0)
    return -1, []


def collect_category(cat):
    seen, rows = set(), []
    enc = cat
    for bgn, end in WINDOWS:
        # 카운트 호출: 일시적 에러(-1)면 재시도해서 카테고리 통째 누락 방지
        total = -1
        for _try in range(4):
            total, _ = get({"prdctClsfcNoNm": enc, "rgstDtBgnDt": bgn, "rgstDtEndDt": end,
                            "pageNo": "1"})
            if total >= 0:
                break
            time.sleep(2)
        if total <= 0:          # 진짜 0건이면 스킵 (에러 -1 은 위에서 재시도됨)
            continue
        pages = (total + PER_PAGE - 1) // PER_PAGE
        for p in range(1, pages + 1):
            if len(rows) >= MAX_PER_CAT:
                break
            _, items = get({"prdctClsfcNoNm": enc, "rgstDtBgnDt": bgn, "rgstDtEndDt": end,
                            "pageNo": str(p)})
            for r in items:
                key = (r.get("prdctIdntNo"), r.get("cntrctCorpNo"), r.get("prdctSpecNm"))
                if key in seen:
                    continue
                seen.add(key)
                row = {k: r.get(k, "") for k in KEEP}
                row["category"] = cat
                rows.append(row)
            time.sleep(0.2)
    return rows


def main():
    all_rows = []
    print(f"본수집 시작 — {len(CATEGORIES)}개 카테고리\n")
    for cat in CATEGORIES:
        rows = collect_category(cat)
        corps = {r["cntrctCorpNm"] for r in rows}
        prices = [int(float(r["cntrctPrceAmt"])) for r in rows if (r["cntrctPrceAmt"] or "").strip()]
        rng = f"{min(prices):,}~{max(prices):,}원" if prices else "-"
        print(f"  {cat:<8} 품목 {len(rows):>4}개 | 업체 {len(corps):>3}곳 | 단가 {rng}", flush=True)
        all_rows += rows

    path = os.path.join(DATA, "products.csv")
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=KEEP)
        w.writeheader()
        w.writerows(all_rows)
    print(f"\n총 {len(all_rows)}행 저장 → {path}")


if __name__ == "__main__":
    main()
