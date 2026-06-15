#!/usr/bin/env python3
"""정제 점수화 v2 — 검증에서 드러난 결함 4종 보정.

1) 단위 오염 제거: prdctUnit 이 '개'/'대' 인 행만 (㎡/m/식 등 설치·면적단가 제외)
2) 이상치 제거: 품명 내 단가의 p5~p95 만 사용
3) 비제품 품명 제외: 서비스·임대·부품·부속·유닛·재 등 키워드
4) 등급매칭 보정(핵심): 시중가를 '정부 중앙값의 40% 이상'인 항목만으로 산정
   → 가정용 싸구려 제외, 동급 추정 비교 → 마진 과장 완화
경쟁업체수는 표본(상한600) 기반 '하한값'으로 표기.
"""
import os, csv, json, time, urllib.parse, urllib.request, statistics as st
from collections import defaultdict

NID = os.environ["NAVER_CLIENT_ID"]
NSEC = os.environ["NAVER_CLIENT_SECRET"]
DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))

GOOD_UNITS = {"개", "대"}
BAD_KW = ["서비스", "임대", "부품", "부속", "유닛", "패널", "재", "섬유", "보조용품", "액세서리"]


import re

MODIFIERS = ["가정용", "업소용", "실험실용", "사무용", "학생용", "컴퓨터", "다기능",
             "건습식", "휴대용", "자동", "일반", "보조", "작업용", "라운지용", "전기", "오디오", "영상"]


def core_noun(nm):
    for pre in MODIFIERS:
        nm = nm.replace(pre, "")
    return nm.strip()


def naver_prices(query):
    """(price, title) 목록 반환."""
    url = "https://openapi.naver.com/v1/search/shop.json?display=40&sort=sim&query=" + urllib.parse.quote(query)
    req = urllib.request.Request(url, headers={"X-Naver-Client-Id": NID, "X-Naver-Client-Secret": NSEC})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            d = json.loads(r.read().decode())
        return [(int(i.get("lprice", 0)), re.sub("<[^>]+>", "", i.get("title", "")))
                for i in d.get("items", []) if int(i.get("lprice", 0)) > 0]
    except Exception:
        return []


def trimmed(vals):
    """p5~p95 트림."""
    v = sorted(vals)
    if len(v) < 5:
        return v
    lo, hi = v[int(len(v) * 0.05)], v[int(len(v) * 0.95)]
    return [x for x in v if lo <= x <= hi]


def main():
    rows = list(csv.DictReader(open(os.path.join(DATA, "products.csv"), encoding="utf-8-sig")))
    # 품명별로 (가격, 단위, 업체, 중기경쟁여부, 카테고리) 수집 → 이후 지배단위만 사용
    g = defaultdict(lambda: {"recs": [], "cat": ""})
    for r in rows:
        nm = r.get("prdctClsfcNoNm") or ""
        if not nm or any(k in nm for k in BAD_KW):        # ③ 비제품 제외
            continue
        v = (r.get("cntrctPrceAmt") or "").strip()
        if not v:
            continue
        try:
            p = int(float(v))
        except ValueError:
            continue
        if p <= 0:
            continue
        if not g[nm]["cat"]:
            g[nm]["cat"] = r.get("category")
        g[nm]["recs"].append((p, (r.get("prdctUnit") or "").strip(),
                              r.get("cntrctCorpNm"), r.get("smetprCmptProdctYn") == "Y"))

    # 수요(납품요구) 데이터 — 있으면 로드 (없으면 수요 축 생략)
    demand = {}
    dpath = os.path.join(DATA, "demand.csv")
    if os.path.exists(dpath):
        for d in csv.DictReader(open(dpath, encoding="utf-8-sig")):
            try:
                demand[d["품명"]] = int(d["수요금액합계"])
            except (ValueError, KeyError):
                pass

    from collections import Counter as _C
    results = []
    for nm, v in g.items():
        recs = v["recs"]
        if len(recs) < 5:
            continue
        # 지배 단위 결정: 가장 많은 단위. 혼합(<60%)이면 마진 비교 불가 → 제외
        ucnt = _C(u for _, u, _, _ in recs if u)
        if not ucnt:
            continue
        dom_unit, dom_n = ucnt.most_common(1)[0]
        if dom_n < 5 or dom_n / len(recs) < 0.6:          # ① 단위 일관성(지배단위 60%↑)
            continue
        rec_d = [r for r in recs if r[1] == dom_unit]
        prices = trimmed([r[0] for r in rec_d])           # ② 이상치 트림
        if len(prices) < 5:
            continue
        corps_set = {r[2] for r in rec_d}
        sme_cnt = sum(1 for r in rec_d if r[3])
        tot_cnt = len(rec_d)
        gov = int(st.median(prices))
        rps = naver_prices(nm)
        time.sleep(0.1)
        floored = [(p, t) for p, t in rps if p >= gov * 0.4]   # ④ 동급(가격) 필터
        core = core_noun(nm)
        relevant = [p for p, t in floored if core and core in t.replace(" ", "")]
        comp_grade = relevant if len(relevant) >= 5 else [p for p, t in floored]  # 관련성 우선, 부족시 폴백
        if len(comp_grade) < 3:
            continue
        retail = int(st.median(comp_grade))
        margin = round(gov / retail, 2)
        sme_ratio = round(100 * sme_cnt / tot_cnt) if tot_cnt else 0
        entry = ("개방형" if sme_ratio < 30 else
                 "혼합" if sme_ratio < 70 else "중기경쟁 제한")
        results.append({
            "category": v["cat"], "품명": nm, "마진배수": margin,
            "정부단가중앙값": gov, "동급시중가중앙값": retail,
            "경쟁업체수_하한": len(corps_set), "품목수": len(prices),
            "동급매칭수": len(comp_grade),
            "중기경쟁비율": sme_ratio, "진입유형": entry,
            "수요금액": demand.get(nm, 0),
        })

    # 신뢰 필터: 동급매칭 5건 이상 + 마진 0.3~10 범위(극단 제외)
    results = [r for r in results if r["동급매칭수"] >= 5 and 0.3 <= r["마진배수"] <= 10]
    import math
    has_demand = any(r["수요금액"] > 0 for r in results)
    dmax = math.log10(max((r["수요금액"] for r in results), default=1) + 1) or 1
    for r in results:
        ms = min(r["마진배수"] / 3.0, 1) * 100             # 마진: 3배=만점
        es = 100 - r["중기경쟁비율"]                        # 진입가능성: 중기경쟁 낮을수록↑
        cs = 100 / (1 + r["경쟁업체수_하한"])              # 저경쟁(공급)
        if has_demand:
            ds = math.log10(r["수요금액"] + 1) / dmax * 100  # 수요: 로그 정규화
            r["블루오션점수"] = round(0.30 * ms + 0.30 * es + 0.25 * ds + 0.15 * cs, 1)
        else:
            r["블루오션점수"] = round(0.40 * ms + 0.40 * es + 0.20 * cs, 1)
    results.sort(key=lambda x: -x["블루오션점수"])

    out = os.path.join(DATA, "scores_v2.csv")
    cols = ["블루오션점수", "category", "품명", "진입유형", "중기경쟁비율", "마진배수", "정부단가중앙값",
            "동급시중가중앙값", "경쟁업체수_하한", "품목수", "동급매칭수", "수요금액"]
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader(); w.writerows(results)

    print(f"{'점수':>5} {'품명':<14}{'진입유형':<10} {'마진':>5} {'중기경쟁':>6} {'경쟁≥':>5}")
    for r in results[:20]:
        print(f"  {r['블루오션점수']:>5} {str(r['품명'])[:14]:<14}{r['진입유형']:<10} "
              f"{r['마진배수']:>5} {r['중기경쟁비율']:>5}% {r['경쟁업체수_하한']:>5}")
    print(f"\n{len(results)}개 품목 → {out}")


if __name__ == "__main__":
    main()
