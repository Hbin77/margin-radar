#!/usr/bin/env python3
"""전수 수집 — 12개월 × 3계약유형 종합쇼핑몰 품목정보 전수 페이징.
월별 증분 저장(중단 안전). 누적 dedup. 목표: 시중가 비교 가능한 전체 모집단 확보.
"""
import os, csv, time, urllib.parse, urllib.request, json

KEY = os.environ["G2B_KEY"]
BASE = "https://apis.data.go.kr/1230000/at/ShoppingMallPrdctInfoService"
OPS = [("getMASCntrctPrdctInfoList", "MAS"),
       ("getUcntrctPrdctInfoList", "일반단가"),
       ("getThptyUcntrctPrdctInfoList", "제3자단가")]
# 최근 12개월(월 단위 윈도)
MONTHS = ["202504", "202505", "202506", "202507", "202508", "202509",
          "202510", "202511", "202512", "202601", "202602", "202603"]
PER_PAGE = 999
MAX_PAGES = 90
DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
UA = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/124 Safari/537.36"
KEEP = ["category", "prdctClsfcNoNm", "dtilPrdctClsfcNo", "prdctIdntNo",
        "cntrctCorpNm", "cntrctCorpNo", "entrprsDivNm", "prdctSpecNm", "prdctMakrNm",
        "cntrctPrceAmt", "orderCalclPrceAmt", "prdctUnit", "exclncPrcrmntPrdctYn",
        "smetprCmptProdctYn", "prdctImgUrl", "rgstDt", "cntrctBgnDate", "cntrctEndDate",
        "specDocAtchFileNmUrl1", "shopngCntrctNo", "cntrctDeptNm", "cntrctDeptTelNo"]


import calendar


def mrange(ym):
    y, m = int(ym[:4]), int(ym[4:6])
    last = calendar.monthrange(y, m)[1]            # 월 말일(30/31/28 정확)
    return f"{ym}010000", f"{ym}{last:02d}2359"


def get(op, page, bgn, end, tries=3):
    q = {"ServiceKey": KEY, "type": "json", "numOfRows": str(PER_PAGE), "pageNo": str(page),
         "rgstDtBgnDt": bgn, "rgstDtEndDt": end}
    url = f"{BASE}/{op}?" + urllib.parse.urlencode(q, safe="")
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=45) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            b = d.get("response", {}).get("body", {})
            it = b.get("items", {})
            it = it.get("item", []) if isinstance(it, dict) else it
            return int(b.get("totalCount", 0)), (it if isinstance(it, list) else [it])
        except Exception:
            time.sleep(2)
    return -1, []


def main():
    path = os.path.join(DATA, "products.csv")
    seen, rows = set(), []
    if os.path.exists(path):
        for r in csv.DictReader(open(path, encoding="utf-8-sig")):
            k = (r.get("prdctIdntNo"), r.get("cntrctCorpNo"), r.get("prdctSpecNm"))
            seen.add(k); rows.append({c: r.get(c, "") for c in KEEP})
    print(f"기존 {len(rows)}행 로드", flush=True)

    def save():
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=KEEP); w.writeheader(); w.writerows(rows)

    for ym in MONTHS:
        bgn, end = mrange(ym)
        m_added = 0
        for op, label in OPS:
            total, _ = get(op, 1, bgn, end)
            if total <= 0:
                continue
            pages = min(MAX_PAGES, (total + PER_PAGE - 1) // PER_PAGE)
            for p in range(1, pages + 1):
                _, items = get(op, p, bgn, end)
                if not items:
                    break
                for r in items:
                    k = (r.get("prdctIdntNo"), r.get("cntrctCorpNo"), r.get("prdctSpecNm"))
                    if k in seen:
                        continue
                    seen.add(k)
                    row = {c: r.get(c, "") for c in KEEP}
                    row["category"] = label
                    rows.append(row); m_added += 1
                time.sleep(0.12)
        save()
        nms = len({r["prdctClsfcNoNm"] for r in rows if r.get("prdctClsfcNoNm")})
        print(f"  [{ym}] 신규 {m_added:,}행 | 누적 {len(rows):,}행, 고유품명 {nms}개 (저장)", flush=True)

    print(f"\n전수 수집 완료: {len(rows):,}행, 고유품명 {len({r['prdctClsfcNoNm'] for r in rows if r.get('prdctClsfcNoNm')})}개", flush=True)


if __name__ == "__main__":
    main()
