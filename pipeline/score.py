#!/usr/bin/env python3
"""블루오션 스코어링 — 조달 데이터(경쟁·단가) + 네이버 시중가(마진).

products.csv 를 세부품명 단위로 집계:
  - 경쟁: 계약업체 수 (적을수록 블루오션)
  - 정부단가: 계약단가 중앙값
  - 시중가: 네이버 쇼핑 검색 최저가 중앙값(가격필터로 잡음 제거)
  - 마진배수 = 정부단가 / 시중가
블루오션 점수 = 마진 점수 × 저경쟁 점수 (0~100)

사용: export $(grep -v '^#' ../.env | xargs); python3 score.py
"""
import os, csv, json, time, urllib.parse, urllib.request, statistics as st
from collections import defaultdict

NID = os.environ["NAVER_CLIENT_ID"]
NSEC = os.environ["NAVER_CLIENT_SECRET"]
DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))


def naver_median(query, floor):
    """네이버 쇼핑 최저가 중앙값 (floor 미만 잡음 제거)."""
    url = "https://openapi.naver.com/v1/search/shop.json?display=40&sort=sim&query=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={
        "X-Naver-Client-Id": NID, "X-Naver-Client-Secret": NSEC})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            d = json.loads(r.read().decode())
    except Exception:
        return None, 0
    prices = [int(i["lprice"]) for i in d.get("items", []) if int(i.get("lprice", 0)) >= floor]
    if len(prices) < 3:
        return None, len(prices)
    return int(st.median(prices)), len(prices)


def main():
    rows = list(csv.DictReader(open(os.path.join(DATA, "products.csv"), encoding="utf-8-sig")))
    # 세부품명(품명) 단위 집계
    g = defaultdict(lambda: {"corps": set(), "prices": [], "cat": ""})
    for r in rows:
        nm = r.get("prdctClsfcNoNm") or r.get("category")
        k = nm
        g[k]["cat"] = r.get("category")
        g[k]["corps"].add(r.get("cntrctCorpNm"))
        v = (r.get("cntrctPrceAmt") or "").strip()
        if v:
            try:
                p = int(float(v))
                if p > 0:
                    g[k]["prices"].append(p)
            except ValueError:
                pass

    results = []
    for nm, v in g.items():
        if not v["prices"]:
            continue
        gov = int(st.median(v["prices"]))
        floor = max(1000, gov // 10)          # 잡음(스티커 등) 제거용 하한
        retail, n = naver_median(nm, floor)
        time.sleep(0.1)
        margin = round(gov / retail, 2) if retail else None
        results.append({
            "category": v["cat"], "품명": nm,
            "경쟁업체수": len(v["corps"]), "품목수": len(v["prices"]),
            "정부단가중앙값": gov, "시중가중앙값": retail or "", "매칭수": n,
            "마진배수": margin or "",
        })

    # 블루오션 점수: 마진 높고 경쟁 낮을수록 ↑
    mc = [r["마진배수"] for r in results if r["마진배수"]]
    mmax = max(mc) if mc else 1
    for r in results:
        m = r["마진배수"] or 0
        margin_score = min(m / max(mmax, 1.0), 1.0) * 100 if m else 0
        comp_score = 100 / (1 + r["경쟁업체수"])      # 경쟁 적을수록 ↑
        r["블루오션점수"] = round(0.6 * margin_score + 0.4 * comp_score, 1) if m else 0

    results.sort(key=lambda x: -x["블루오션점수"])
    out = os.path.join(DATA, "scores.csv")
    cols = ["블루오션점수", "category", "품명", "마진배수", "정부단가중앙값", "시중가중앙값",
            "경쟁업체수", "품목수", "매칭수"]
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(results)

    print(f"{'점수':>5} {'카테고리':<8} {'품명':<14} {'마진':>5} {'정부가':>10} {'시중가':>10} {'경쟁':>4}")
    for r in results:
        print(f"  {r['블루오션점수']:>5} {str(r['category'])[:8]:<8} {str(r['품명'])[:14]:<14} "
              f"{str(r['마진배수']):>5} {r['정부단가중앙값']:>10,} {str(r['시중가중앙값']):>10} {r['경쟁업체수']:>4}")
    print(f"\n저장 → {out}")


if __name__ == "__main__":
    main()
