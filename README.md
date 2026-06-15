# MR (Margin Radar) — 공공조달 소싱 인텔리전스

조달청 종합쇼핑몰 데이터 + 납품요구(수요) + 네이버 시중가를 결합해, 셀러·수입사에게
"정부가 많이 사고 · 진입 가능하고 · 시중가 대비 마진 있고 · 경쟁 적은" 품목을 점수화해 보여주는
공공조달 분석 도구. (2026 공공조달데이터·AI 활용 창업경진대회 / 제품·서비스 개발 부문)

## 핵심 기능
- **블루오션 랭킹**: 마진(30%) + 진입가능성(30%) + 수요(25%) + 저경쟁(15%) 점수
- **진입 가능성 판별**: 중소기업자간 경쟁제품 여부로 "막힌 시장 vs 개방 시장" 구분
- **AI 가격예측·이상탐지**: 32만건 학습 앙상블(HistGBM+RandomForest→Ridge, R²=0.948)로
  적정가 예측 + 과지출 탐지 + KMeans 시장세분화 + IsolationForest 이상거래
- **규격서 링크**: 각 품목 → 실제 조달청 규격서 문서
- **매일 자동 갱신**: 증분수집→점수화→ML재학습→빌드 (cron)

## 디렉토리
```
margin-radar/
├─ .env                  # API 키 (조달청 G2B_KEY, 네이버 NAVER_CLIENT_ID/SECRET)
├─ .venv/                # ML용 가상환경 (sklearn 등)
├─ pipeline/             # 데이터 파이프라인 (Python)
│  ├─ collect_full.py        # 12개월 전수 수집(3계약유형)
│  ├─ collect_dlvr_api.py    # 납품요구(수요) API 수집
│  ├─ ingest_dlvr.py         # 납품요구 파일 → 수요 집계(대체 경로)
│  ├─ score_v2.py            # 블루오션 스코어링
│  ├─ ml_features.py         # ML 피처 엔지니어링
│  ├─ ml_model.py            # 가격예측 앙상블 + 이상탐지 + 세그멘테이션
│  ├─ ml_validate.py         # ML 적대적 검증
│  ├─ build_web_data.py      # 모든 산출 → web/data.json
│  ├─ enrich_specdoc.py      # 규격서 실링크 해석
│  ├─ daily_update.py        # 매일 갱신 오케스트레이터(lock)
│  ├─ run_daily.sh / setup_cron.sh   # cron 자동화
├─ data/                 # products.csv, scores_v2.csv, demand.csv, ml_predictions.csv …
├─ web/                  # 정적 SPA (index.html, app.js, styles.css, data.json)
├─ design-system/MASTER.md
└─ docs/                 # 제품서비스소개서, 검증보고서, ml_validation, 배포가이드 …
```

## 실행

### 웹 보기 (로컬)
```bash
cd web && python3 -m http.server 8799   # → http://localhost:8799
```

### 수동 전체 갱신
```bash
cd pipeline && export $(grep -v '^#' ../.env | xargs)
python3 daily_update.py     # 증분수집→점수→ML→빌드→링크 (~9분)
```

### 매일 자동 갱신 (cron)
```bash
bash pipeline/setup_cron.sh   # 매일 07:10 자동 실행 등록
```

## 데이터 흐름
```
조달청 API ─collect_full─► products.csv ─┐
납품요구 API ─collect_dlvr─► demand.csv  ├─ score_v2 ─► scores_v2.csv
                                          ├─ ml_model ─► ml_predictions.csv
네이버 쇼핑(시중가) ─────────────────────┘
                          build_web_data ─► web/data.json ─► 웹
```

## 현재 규모
- 수집 45.2만 행 / 829 품명 → **256 품목** 랭킹
- ML: R²=0.948, MAPE 21.2% (32만건 학습)

## 한계 (정직 고지)
- ML은 가격예측·이상탐지·세분화의 독립 신호. 랭킹 공식은 투명(ML 비의존).
- 경쟁업체수는 최근 등록 기준 하한값.
- 수요 API(getDlvrReqInfoList)는 권한 전파 시 자동 활성(현재는 수동 demand.csv).
- 자세한 검증: `docs/ml_validation.md`, `검증보고서.md`
