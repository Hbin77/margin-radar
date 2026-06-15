#!/usr/bin/env python3
"""웹용 data.json 생성 — scores_v2.csv(랭킹) + products.csv(상세) 조인."""
import os, csv, json, statistics as st
from collections import defaultdict

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
WEB = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web"))
os.makedirs(WEB, exist_ok=True)


def load(name):
    p = os.path.join(DATA, name)
    return list(csv.DictReader(open(p, encoding="utf-8-sig"))) if os.path.exists(p) else []


CAT_LABEL = {"MAS": "다수공급자계약", "일반단가": "일반단가계약", "제3자단가": "제3자단가계약"}


def main():
    scores = load("scores_v2.csv")
    products = load("products.csv")
    demand = {d["품명"]: d for d in load("demand.csv")}    # 수요(있으면)
    ml = {m["품명"]: m for m in load("ml_predictions.csv")}  # ML 예측/군집(있으면)

    # 품명별 상세(업체·규격·이미지) 인덱스
    detail = defaultdict(lambda: {"corps": {}, "specs": [], "imgs": []})
    for r in products:
        nm = r.get("prdctClsfcNoNm")
        if not nm:
            continue
        doc = (r.get("specDocAtchFileNmUrl1") or "").strip()
        doc = doc if doc.startswith("http") else ""
        c = r.get("cntrctCorpNm")
        if c:
            v = (r.get("cntrctPrceAmt") or "").strip()
            corp = detail[nm]["corps"].setdefault(c, {"prices": [], "doc": ""})
            try:
                corp["prices"].append(int(float(v)))
            except ValueError:
                pass
            if doc and not corp["doc"]:
                corp["doc"] = doc
        sp = (r.get("prdctSpecNm") or "").strip()
        if sp and len(detail[nm]["specs"]) < 24:
            detail[nm]["specs"].append({"spec": sp[:60], "doc": doc})
        im = (r.get("prdctImgUrl") or "").strip()
        if im.startswith("http") and len(detail[nm]["imgs"]) < 6:
            detail[nm]["imgs"].append(im)

    items = []
    for s in scores:
        nm = s["품명"]
        d = detail.get(nm, {"corps": {}, "specs": [], "imgs": []})
        corps = [{"name": c, "median": int(st.median(v["prices"])) if v["prices"] else 0,
                  "doc": v["doc"]}
                 for c, v in d["corps"].items()]
        corps.sort(key=lambda x: x["median"])
        items.append({
            "name": nm,
            "category": CAT_LABEL.get(s["category"], s["category"]),
            "score": float(s["블루오션점수"]),
            "margin": float(s["마진배수"]),
            "govPrice": int(s["정부단가중앙값"]),
            "retailPrice": int(s["동급시중가중앙값"]),
            "competition": int(s["경쟁업체수_하한"]),
            "productCount": int(s["품목수"]),
            "matchCount": int(s["동급매칭수"]),
            "entryType": s.get("진입유형", ""),
            "smeRatio": int(s.get("중기경쟁비율", 0)),
            "demand": int(s.get("수요금액", 0) or 0),
            "demandCnt": int(demand.get(nm, {}).get("거래건수", 0) or 0),
            "demandInst": int(demand.get(nm, {}).get("수요기관수", 0) or 0),
            "mlPrice": int(float(ml.get(nm, {}).get("예측적정가", 0) or 0)),
            "overpayPct": int(float(ml.get(nm, {}).get("과지출퍼센트", 0) or 0)),
            "cluster": ml.get(nm, {}).get("군집명", ""),
            "anomaly": int(float(ml.get(nm, {}).get("이상치", 0) or 0)),
            "corps": corps[:12],
            "specs": sorted(d["specs"], key=lambda x: 0 if x["doc"] else 1)[:8],
            "imgs": d["imgs"],
        })

    from datetime import datetime
    margins = [i["margin"] for i in items]
    has_demand = any(i["demand"] > 0 for i in items)
    out = {
        "generated": datetime.now().strftime("%Y-%m-%d"),
        "updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "disclaimer": ("마진배수 = 정부 계약단가 중앙값 ÷ 동급(정부가 40%↑) 시중가 중앙값. "
                       "수요 = 종합쇼핑몰 납품요구 1개월(2026-05-15~06-14) 실거래 집계."),
        "stats": {
            "totalProducts": len(products),
            "categories": len({i["category"] for i in items}),
            "rankedItems": len(items),
            "avgMargin": round(st.mean(margins), 2) if margins else 0,
            "openItems": sum(1 for i in items if i["entryType"] == "개방형"),
            "hasDemand": has_demand,
        },
        "items": items,
    }
    path = os.path.join(WEB, "data.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"data.json 생성: {len(items)}개 품목, 총 {len(products)}행 기반 → {path}")


if __name__ == "__main__":
    main()
