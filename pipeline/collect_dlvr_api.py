#!/usr/bin/env python3
"""납품요구(수요) API 자동수집 — getDlvrReqInfoList (로그인 다운로드 대체).
inqryDiv=1 + inqryBgnDate/inqryEndDate(YYYYMMDD)로 일자 페이징.
원시 레코드를 dlvr_raw_api.csv에 누적(중복제거) → 품명별 수요 집계 demand.csv 갱신.

사용:
  python3 collect_dlvr_api.py 20260601 20260615   # 기간 지정
  python3 collect_dlvr_api.py                      # 최근 LOOKBACK_DAYS
"""
import os, sys, csv, json, time, urllib.parse, urllib.request
from datetime import datetime, timedelta
from collections import defaultdict

KEY = os.environ.get("G2B_KEY", "")
URL = "https://apis.data.go.kr/1230000/at/ShoppingMallPrdctInfoService/getDlvrReqInfoList"
PER_PAGE = 999
MAX_PAGES = 400
LOOKBACK_DAYS = 3
DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
UA = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/124 Safari/537.36"
RAW = os.path.join(DATA, "dlvr_raw_api.csv")
RAW_COLS = ["dlvrReqNo", "dlvrReqChgOrd", "dlvrReqRcptDate", "rprsntPrdctClsfcNoNm",
            "rprsntDtilPrdctClsfcNoNm", "dlvrReqAmt", "dlvrReqQty", "dminsttNm",
            "cntrctCnclsStleNm", "corpNm"]


def log(m): print(m, flush=True)


def get(page, b, e):
    q = {"ServiceKey": KEY, "type": "json", "numOfRows": str(PER_PAGE), "pageNo": str(page),
         "inqryDiv": "1", "inqryBgnDate": b, "inqryEndDate": e}
    u = URL + "?" + urllib.parse.urlencode(q, safe="")
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": UA}), timeout=40) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            b2 = d.get("response", {}).get("body", {})
            it = b2.get("items", {})
            it = it.get("item", []) if isinstance(it, dict) else it
            return int(b2.get("totalCount", 0)), (it if isinstance(it, list) else [it])
        except Exception:
            time.sleep(2)
    return -1, []


def collect(b, e):
    seen = set()
    if os.path.exists(RAW):
        with open(RAW, encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                seen.add((r.get("dlvrReqNo"), r.get("dlvrReqChgOrd")))
    total, _ = get(1, b, e)
    if total < 0:
        log("API 호출 실패(권한 전파 대기 가능)"); return False
    log(f"납품요구 {b}~{e}: 총 {total:,}건")
    new_file = not os.path.exists(RAW)
    added = 0
    with open(RAW, "a", newline="", encoding="utf-8-sig") as fo:
        w = csv.DictWriter(fo, fieldnames=RAW_COLS)
        if new_file:
            w.writeheader()
        for p in range(1, min(MAX_PAGES, (total + PER_PAGE - 1) // PER_PAGE) + 1):
            _, items = get(p, b, e)
            if not items:
                break
            for r in items:
                k = (r.get("dlvrReqNo"), r.get("dlvrReqChgOrd"))
                if k in seen:
                    continue
                seen.add(k)
                w.writerow({c: r.get(c, "") for c in RAW_COLS})
                added += 1
            fo.flush()
            time.sleep(0.1)
    log(f"신규 {added:,}건 누적")
    return True


def aggregate():
    g = defaultdict(lambda: {"amt": 0, "cnt": 0, "insts": set()})
    with open(RAW, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            nm = (r.get("rprsntPrdctClsfcNoNm") or "").strip()
            if not nm:
                continue
            try:
                amt = int(float((r.get("dlvrReqAmt") or "0").replace(",", "")))
            except ValueError:
                amt = 0
            g[nm]["amt"] += amt
            g[nm]["cnt"] += 1
            g[nm]["insts"].add(r.get("dminsttNm"))
    if len(g) < 100:        # 가드: 누적 원시가 빈약하면 기존(수동) demand.csv 보존
        log(f"  API 수요 품명 {len(g)}개로 빈약 — 기존 demand.csv 유지(백필 전)")
        return
    out = os.path.join(DATA, "demand.csv")
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["품명", "수요금액합계", "거래건수", "수요기관수"])
        for nm, v in sorted(g.items(), key=lambda x: -x[1]["amt"]):
            w.writerow([nm, v["amt"], v["cnt"], len(v["insts"])])
    log(f"수요 집계: {len(g)}개 품명 → {out}")


def main():
    if not KEY:
        log("G2B_KEY 없음"); sys.exit(1)
    if len(sys.argv) >= 3:
        b, e = sys.argv[1], sys.argv[2]
    else:
        end = datetime.now()
        b = (end - timedelta(days=LOOKBACK_DAYS)).strftime("%Y%m%d")
        e = end.strftime("%Y%m%d")
    if collect(b, e):
        aggregate()


if __name__ == "__main__":
    main()
