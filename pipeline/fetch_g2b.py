#!/usr/bin/env python3
"""조달청 OpenAPI 수집기 — 조달 마진 레이더 T0 검증용.

표준 라이브러리만 사용 (pip 설치 불필요).
키는 환경변수 G2B_KEY 로 전달.

사용 예:
  export G2B_KEY="발급받은_일반인증키"
  python3 fetch_g2b.py probe                      # 키/활성화 상태 점검
  python3 fetch_g2b.py mas   2026-03-02           # 다수공급자계약 품목(등록일 하루분) 샘플
  python3 fetch_g2b.py dlvr  2026-03-01 2026-03-31  # 납품요구(수요·거래) 한 달치
  python3 fetch_g2b.py stat  2025                 # 품목별 실적 통계(수요 축)
"""
import os, sys, csv, json, time, urllib.parse, urllib.request
from xml.etree import ElementTree as ET

KEY = os.environ.get("G2B_KEY", "").strip()
SHOP = "https://apis.data.go.kr/1230000/at/ShoppingMallPrdctInfoService"
STAT = "https://apis.data.go.kr/1230000/at/PubPrcrmntStatInfoService"
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"


def call(base, op, params):
    """API 호출 → (http_status, items[list[dict]], raw_head)."""
    q = {"ServiceKey": KEY, "pageNo": "1", "numOfRows": "100", "type": "json"}
    q.update(params)
    url = f"{base}/{op}?" + urllib.parse.urlencode(q, safe="")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode("utf-8", "replace")
            status = r.status
    except urllib.error.HTTPError as e:
        return e.code, [], e.read().decode("utf-8", "replace")[:300]
    except Exception as e:
        return -1, [], str(e)[:300]

    items = []
    body_strip = body.lstrip()
    if body_strip.startswith("{"):
        try:
            j = json.loads(body)
            node = j.get("response", {}).get("body", {}).get("items", {})
            it = node.get("item", []) if isinstance(node, dict) else node
            items = it if isinstance(it, list) else [it]
        except Exception:
            pass
    else:  # XML
        try:
            root = ET.fromstring(body)
            for item in root.iter("item"):
                items.append({c.tag: (c.text or "") for c in item})
        except Exception:
            pass
    return status, items, body[:300]


def save_csv(name, rows):
    if not rows:
        print(f"  (저장 생략: {name} 행 없음)")
        return
    cols = list({k for r in rows for k in r.keys()})
    path = os.path.abspath(os.path.join(DATA_DIR, name))
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    print(f"  저장: {path}  ({len(rows)}행 x {len(cols)}열)")


def d(s):  # 2026-03-01 -> 20260301
    return s.replace("-", "")


def main():
    if not KEY:
        print("환경변수 G2B_KEY 가 없습니다."); sys.exit(1)
    mode = sys.argv[1] if len(sys.argv) > 1 else "probe"

    if mode == "probe":
        st, items, head = call(STAT, "getTotlPubPrcrmntSttus", {"srchBssYear": "2025", "numOfRows": "3"})
        print(f"[probe] HTTP {st}  items={len(items)}")
        print(f"        응답머리: {head[:160]}")
        if st == 403:
            print("        → 403: 키는 인식되나 서비스 권한 전파 대기 중(활성화 지연). 잠시 후 재시도.")
        elif st == 200:
            print("        → 200: 활성화 완료. 본수집 가능.")

    elif mode == "mas":
        day = d(sys.argv[2])
        st, items, head = call(SHOP, "getMASCntrctPrdctInfoList",
                               {"rgstDtBgnDt": day + "0000", "rgstDtEndDt": day + "2359"})
        print(f"[mas] HTTP {st}  items={len(items)}")
        if items:
            print("  필드:", ", ".join(list(items[0].keys())[:20]))
        save_csv(f"mas_{day}.csv", items)

    elif mode == "dlvr":
        bgn, end = d(sys.argv[2]), d(sys.argv[3])
        st, items, head = call(SHOP, "getDlvrReqInfoList",
                               {"dlvrReqRcptDateBgnDt": bgn, "dlvrReqRcptDateEndDt": end})
        print(f"[dlvr] HTTP {st}  items={len(items)}  head={head[:120]}")
        if items:
            print("  필드:", ", ".join(list(items[0].keys())[:25]))
        save_csv(f"dlvr_{bgn}_{end}.csv", items)

    elif mode == "stat":
        year = sys.argv[2]
        st, items, head = call(STAT, "getPrdctIdntNoServcAccotArslt",
                               {"srchBssYear": year, "numOfRows": "200"})
        print(f"[stat] HTTP {st}  items={len(items)}  head={head[:120]}")
        if items:
            print("  필드:", ", ".join(list(items[0].keys())[:25]))
        save_csv(f"stat_prdct_{year}.csv", items)

    else:
        print("알 수 없는 모드:", mode)


if __name__ == "__main__":
    main()
