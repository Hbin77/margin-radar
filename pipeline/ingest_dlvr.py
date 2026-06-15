#!/usr/bin/env python3
"""납품요구(실수요) 파일 → 품명별 수요 집계. 여러 달 파일 병합 지원.

입력: 조달데이터허브 '종합쇼핑몰 납품요구 물품 내역'(UI-ADOXAA-038R) 다운로드
      (UTF-16, 탭구분, 앞부분 검색조건 메타줄). 여러 달치를 여러 파일로 받아도 됨.
출력: data/demand.csv  (품명, 수요금액합계, 월평균금액, 거래건수, 수요기관수)

사용:
  python3 ingest_dlvr.py file1.csv file2.csv ...   # 명시한 파일들 병합
  python3 ingest_dlvr.py                            # data/ 및 프로젝트 루트의 납품요구 파일 자동 탐색
"""
import csv, os, sys, glob
from collections import defaultdict

HERE = os.path.dirname(__file__)
DATA = os.path.abspath(os.path.join(HERE, "..", "data"))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))


def find_exact(headers, *names):
    for name in names:
        for h in headers:
            if h.replace(" ", "") == name:
                return h
    return None


def find_col(headers, *keywords):
    for h in headers:
        if any(k in h.replace(" ", "") for k in keywords):
            return h
    return None


def process_file(path, g, months):
    text = None
    for enc in ("utf-16", "utf-8-sig", "cp949", "utf-8"):
        try:
            text = open(path, encoding=enc).read()
            if "납품요구번호" in text:
                break
        except Exception:
            continue
    if not text:
        print(f"  [건너뜀] 읽기 실패: {path}"); return
    lines = text.splitlines()
    hi = next((i for i, l in enumerate(lines) if "납품요구번호" in l and ("\t" in l or "," in l)), None)
    if hi is None:
        print(f"  [건너뜀] 헤더 없음: {path}"); return
    delim = "\t" if "\t" in lines[hi] else ","
    reader = csv.DictReader(lines[hi:], delimiter=delim)
    headers = reader.fieldnames or []
    c_amt = find_exact(headers, "납품금액") or find_col(headers, "납품금액", "품대금액")
    c_nm = find_exact(headers, "품명") or find_col(headers, "품명")
    c_inst = find_exact(headers, "수요기관") or find_col(headers, "수요기관명", "수요기관")
    c_date = find_exact(headers, "납품요구일자") or find_col(headers, "납품요구일자", "결재일자", "일자")
    if not (c_amt and c_nm):
        print(f"  [건너뜀] 필수컬럼 없음: {path}"); return
    n = 0
    for r in reader:
        nm = (r.get(c_nm) or "").strip()
        if not nm:
            continue
        try:
            amt = int(float((r.get(c_amt) or "0").replace(",", "")))
        except ValueError:
            amt = 0
        g[nm]["amt"] += amt
        g[nm]["cnt"] += 1
        if c_inst:
            g[nm]["insts"].add(r.get(c_inst))
        if c_date:
            d = (r.get(c_date) or "").replace("-", "").strip()
            if len(d) >= 6:
                months.add(d[:6])
        n += 1
    print(f"  {os.path.basename(path)[:40]} → {n:,}행")


def main():
    if len(sys.argv) > 1:
        files = sys.argv[1:]
    else:
        files = (glob.glob(os.path.join(DATA, "dlvr*.csv")) +
                 glob.glob(os.path.join(ROOT, "*납품요구*.csv")) +
                 glob.glob(os.path.join(ROOT, "UI-ADOXAA*.csv")))
    files = [f for f in dict.fromkeys(files) if "demand.csv" not in f]
    if not files:
        print("입력 파일 없음 — 납품요구 CSV 경로를 인자로 주거나 data/에 두세요."); sys.exit(1)

    g = defaultdict(lambda: {"amt": 0, "cnt": 0, "insts": set()})
    months = set()
    print(f"병합 대상 {len(files)}개 파일:")
    for f in files:
        process_file(f, g, months)

    nmonths = max(1, len(months))
    out = os.path.join(DATA, "demand.csv")
    with open(out, "w", newline="", encoding="utf-8-sig") as fo:
        w = csv.writer(fo)
        w.writerow(["품명", "수요금액합계", "월평균금액", "거래건수", "수요기관수"])
        for nm, v in sorted(g.items(), key=lambda x: -x[1]["amt"]):
            w.writerow([nm, v["amt"], round(v["amt"] / nmonths), v["cnt"], len(v["insts"])])
    print(f"\n수요 집계 완료: {len(g)}개 품명, {nmonths}개월({sorted(months)}) → {out}")


if __name__ == "__main__":
    main()
