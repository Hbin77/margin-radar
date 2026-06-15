#!/usr/bin/env python3
"""개방형(진입 가능) 카테고리 추가 수집 → products.csv 병합."""
import csv, os
import collect_mas as cm

NEW = ["모니터", "텔레비전", "복사기", "냉장고", "프린터", "펌프", "세탁기", "전기레인지"]

path = os.path.join(cm.DATA, "products.csv")
existing = list(csv.DictReader(open(path, encoding="utf-8-sig")))
existing = [r for r in existing if r.get("category") not in NEW]

added = []
for cat in NEW:
    rows = cm.collect_category(cat)
    corps = {r["cntrctCorpNm"] for r in rows}
    print(f"  {cat:<8} {len(rows):>4}행 | 업체 {len(corps):>3}곳", flush=True)
    added += rows

allrows = existing + added
with open(path, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=cm.KEEP)
    w.writeheader()
    w.writerows(allrows)
print(f"products.csv 병합: 총 {len(allrows)}행 (신규 {len(added)})", flush=True)
