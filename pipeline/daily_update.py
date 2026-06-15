#!/usr/bin/env python3
"""매일 자동 갱신 오케스트레이터.
1) 최근 N일 신규 등록분 증분 수집(3계약유형) → products.csv 병합
2) score_v2 → ml_model(앙상블 재학습) → build_web_data → enrich_specdoc
3) 갱신 타임스탬프 기록
cron 등에서 매일 실행. 데이터는 D-1 갱신이라 '매일'이 사실상 최신.
"""
import os, csv, sys, json, time, subprocess, urllib.parse, urllib.request
from datetime import datetime, timedelta

KEY = os.environ.get("G2B_KEY", "")
BASE = "https://apis.data.go.kr/1230000/at/ShoppingMallPrdctInfoService"
OPS = [("getMASCntrctPrdctInfoList", "MAS"),
       ("getUcntrctPrdctInfoList", "일반단가"),
       ("getThptyUcntrctPrdctInfoList", "제3자단가")]
LOOKBACK_DAYS = 3
PER_PAGE = 999
MAX_PAGES = 90
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.path.join(HERE, "..", "data"))
VENV = os.path.abspath(os.path.join(HERE, "..", ".venv", "bin", "python"))
if not os.path.exists(VENV):
    VENV = sys.executable  # 컨테이너 등 venv 부재 시 시스템 python(의존성 설치됨) 사용
UA = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/124 Safari/537.36"
KEEP = ["category", "prdctClsfcNoNm", "dtilPrdctClsfcNo", "prdctIdntNo",
        "cntrctCorpNm", "cntrctCorpNo", "entrprsDivNm", "prdctSpecNm", "prdctMakrNm",
        "cntrctPrceAmt", "orderCalclPrceAmt", "prdctUnit", "exclncPrcrmntPrdctYn",
        "smetprCmptProdctYn", "prdctImgUrl", "rgstDt", "cntrctBgnDate", "cntrctEndDate",
        "specDocAtchFileNmUrl1", "shopngCntrctNo", "cntrctDeptNm", "cntrctDeptTelNo"]


def log(m): print(f"[{datetime.now():%H:%M:%S}] {m}", flush=True)


def get(op, page, bgn, end):
    q = {"ServiceKey": KEY, "type": "json", "numOfRows": str(PER_PAGE), "pageNo": str(page),
         "rgstDtBgnDt": bgn, "rgstDtEndDt": end}
    url = f"{BASE}/{op}?" + urllib.parse.urlencode(q, safe="")
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=40) as r:
                d = json.loads(r.read().decode("utf-8", "replace"))
            b = d.get("response", {}).get("body", {})
            it = b.get("items", {})
            it = it.get("item", []) if isinstance(it, dict) else it
            return int(b.get("totalCount", 0)), (it if isinstance(it, list) else [it])
        except Exception:
            time.sleep(2)
    return -1, []


def incremental_collect():
    """메모리 경량: 기존 키만 로드(중복체크), 신규 행만 파일에 append."""
    path = os.path.join(DATA, "products.csv")
    seen = set(); base = 0
    if os.path.exists(path):
        with open(path, encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                seen.add((r.get("prdctIdntNo"), r.get("cntrctCorpNo"), r.get("prdctSpecNm")))
                base += 1
    end = datetime.now()
    b = (end - timedelta(days=LOOKBACK_DAYS)).strftime("%Y%m%d0000")
    e = end.strftime("%Y%m%d2359")
    log(f"증분 수집 윈도 {b}~{e} (기존 {base:,}행, append 모드)")
    added = 0
    new_file = not os.path.exists(path)
    with open(path, "a", newline="", encoding="utf-8-sig") as fo:
        w = csv.DictWriter(fo, fieldnames=KEEP)
        if new_file:
            w.writeheader()
        for op, label in OPS:
            total, _ = get(op, 1, b, e)
            if total <= 0:
                continue
            for p in range(1, min(MAX_PAGES, (total + PER_PAGE - 1) // PER_PAGE) + 1):
                _, items = get(op, p, b, e)
                if not items:
                    break
                for r in items:
                    k = (r.get("prdctIdntNo"), r.get("cntrctCorpNo"), r.get("prdctSpecNm"))
                    if k in seen:
                        continue
                    seen.add(k)
                    row = {c: r.get(c, "") for c in KEEP}; row["category"] = label
                    w.writerow(row); added += 1
                fo.flush()
                time.sleep(0.15)
            log(f"  {label}: 신규 누적 {added:,}")
    log(f"증분 수집 완료: 신규 {added:,}행, 총 {base + added:,}행")
    return added


def run(label, cmd):
    log(f"{label} …")
    r = subprocess.run(cmd, cwd=HERE, capture_output=True, text=True)
    tail = (r.stdout.strip().splitlines() or [""])[-1]
    if r.returncode != 0:
        log(f"  실패: {r.stderr.strip()[-300:]}"); sys.exit(1)
    log(f"  완료: {tail}")


def main():
    if not KEY:
        log("G2B_KEY 환경변수 없음"); sys.exit(1)
    # 동시 실행 방지 lock (오래된 lock은 무시)
    lock = os.path.join(DATA, "daily.lock")
    if os.path.exists(lock):
        age = time.time() - os.path.getmtime(lock)
        if age < 3 * 3600:
            log(f"다른 갱신이 진행 중(lock {age/60:.0f}분 전). 종료."); sys.exit(0)
        log("오래된 lock 무시")
    open(lock, "w").write(str(os.getpid()))
    try:
        t0 = time.time()
        log("=== 일일 갱신 시작 ===")
        incremental_collect()
        # 수요 API 자동수집(권한 전파 전이면 graceful 실패→기존 demand.csv 유지)
        r = subprocess.run(["python3", "collect_dlvr_api.py"], cwd=HERE, capture_output=True, text=True)
        log("수요 API: " + ((r.stdout.strip().splitlines() or ["(출력없음)"])[-1]))
        run("재점수화", ["python3", "score_v2.py"])
        run("ML 재학습", [VENV, "ml_model.py"])
        run("웹데이터 빌드", ["python3", "build_web_data.py"])
        run("규격서 링크 교정", ["python3", "enrich_specdoc.py"])
        json.dump({"updated": datetime.now().strftime("%Y-%m-%d %H:%M"),
                   "elapsed_sec": round(time.time() - t0)},
                  open(os.path.join(DATA, "last_update.json"), "w"), ensure_ascii=False)
        log(f"=== 일일 갱신 완료 ({time.time()-t0:.0f}초) ===")
    finally:
        if os.path.exists(lock):
            os.remove(lock)


if __name__ == "__main__":
    main()
