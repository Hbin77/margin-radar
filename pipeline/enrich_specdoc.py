#!/usr/bin/env python3
"""data.json 의 규격서 링크 교정 — 공통 표준문서(sqno1) → 실제 제품 규격서로.

각 첨부세트(untyAtchFileNo)에서 파일명에 '규격서'가 든 sqno 를 찾아 링크를 교체.
못 찾으면 링크 제거(오인 방지). 헤더(Content-Disposition)만 읽어 빠르게 처리.
"""
import json, os, re, urllib.parse, urllib.request

WEB = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web"))
BASE = "https://shop.g2b.go.kr/fs/fsc/fscb/UntyAtchFile/downloadUntyAtchFileWithInfo.do"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"
SQNO_ORDER = [6, 5, 7, 4, 8, 3, 9, 2, 10]   # 규격서는 보통 마지막 첨부


def filename_of(fno, sq):
    url = f"{BASE}?untyAtchFileNo={fno}&atchFileSqno={sq}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Range": "bytes=0-0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            cd = r.headers.get("Content-Disposition", "")
    except Exception:
        return None
    m = re.search(r"filename=([^;]+)", cd)
    if not m:
        return None
    return urllib.parse.unquote(m.group(1).strip())


def find_spec_sqno(fno):
    for sq in SQNO_ORDER:
        fn = filename_of(fno, sq)
        if fn and "규격서" in fn:
            return sq
    return None


def main():
    path = os.path.join(WEB, "data.json")
    d = json.load(open(path, encoding="utf-8"))

    TOPN = 60                       # 상위 N개 품목만 규격서 링크 해석(대량 품목 대비 속도)
    top_items = d["items"][:TOPN]
    rest_items = d["items"][TOPN:]
    fnos = set()
    for it in top_items:
        for s in it["specs"]:
            m = re.search(r"untyAtchFileNo=([^&]+)", s.get("doc", ""))
            if m:
                fnos.add(m.group(1))
        for c in it["corps"]:
            m = re.search(r"untyAtchFileNo=([^&]+)", c.get("doc", ""))
            if m:
                fnos.add(m.group(1))

    # 캐시 로드(재실행 가속): fno→sqno 매핑 영속화
    cache_path = os.path.join(os.path.dirname(__file__), "..", "data", "specdoc_cache.json")
    cache = {}
    if os.path.exists(cache_path):
        try:
            cache = json.load(open(cache_path, encoding="utf-8"))
        except Exception:
            cache = {}
    new = 0
    for i, fno in enumerate(fnos):
        if fno in cache:
            continue
        cache[fno] = find_spec_sqno(fno)
        new += 1
        if new % 25 == 0:
            print(f"  진행 {new} (신규)", flush=True)
    json.dump(cache, open(cache_path, "w", encoding="utf-8"))
    found = sum(1 for v in cache.values() if v)
    print(f"규격서 발견: {found}/{len(fnos)} 첨부세트", flush=True)

    def fix(url):
        m = re.search(r"untyAtchFileNo=([^&]+)", url or "")
        if not m:
            return ""
        sq = cache.get(m.group(1))
        if not sq:
            return ""               # 규격서 없으면 링크 제거(오인 방지)
        return f"{BASE}?untyAtchFileNo={m.group(1)}&atchFileSqno={sq}"

    for it in top_items:
        for s in it["specs"]:
            s["doc"] = fix(s.get("doc", ""))
        for c in it["corps"]:
            c["doc"] = fix(c.get("doc", ""))
    for it in rest_items:           # 상위 외에는 오인 방지로 링크 제거
        for s in it["specs"]:
            s["doc"] = ""
        for c in it["corps"]:
            c["doc"] = ""

    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    sd = sum(1 for it in d["items"] for s in it["specs"] if s.get("doc"))
    cd = sum(1 for it in d["items"] for c in it["corps"] if c.get("doc"))
    print(f"교정 완료 — 규격 링크 {sd}, 업체 링크 {cd} (실제 규격서만)", flush=True)


if __name__ == "__main__":
    main()
