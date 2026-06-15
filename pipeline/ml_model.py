#!/usr/bin/env python3
"""T2~T6 — 조달 가격예측 앙상블 + 이상탐지 + 세그멘테이션.

- 가격예측: HistGradientBoosting + RandomForest → Ridge 스태킹 (타깃 log 계약단가)
- 평가: holdout MAE/R²/MAPE (가격 스케일) + 베이스라인 대비
- 이상탐지: 잔차(실제-예측, log) z-score → 품목별 과지출지표
- 세그멘테이션: 품목 통합피처 KMeans + IsolationForest
- 피처중요도: permutation importance
출력: data/ml_predictions.csv, docs/ml_report.txt, docs/ml_*.png
실행: .venv/bin/python ml_model.py
"""
import os, csv, json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
plt.rcParams["font.family"] = ["AppleGothic", "Apple SD Gothic Neo", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False
from sklearn.ensemble import (HistGradientBoostingRegressor, RandomForestRegressor,
                              IsolationForest, StackingRegressor)
from sklearn.linear_model import Ridge
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, TargetEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.inspection import permutation_importance

import ml_features as F

HERE = os.path.dirname(__file__)
DATA = os.path.abspath(os.path.join(HERE, "..", "data"))
DOCS = os.path.abspath(os.path.join(HERE, "..", "docs"))
TRAIN_CAP = 150000          # 학습 표본 상한(속도)


def log(m): print(m, flush=True)


def main():
    df = pd.read_csv(os.path.join(DATA, "products.csv"), dtype=str, keep_default_na=False)
    log(f"원천 {len(df):,}행")
    df = F.build(df)
    log(f"피처 빌드 후 {len(df):,}행")

    # 입력: 범주형(문자) + 수치 DataFrame. 고차원 범주는 TargetEncoder(CV, 누수없음)로 수치화
    feat = F.CAT_COLS + F.NUM_COLS
    for c in F.CAT_COLS:
        df[c] = df[c].astype(str)
    Xdf = df[feat].copy()
    y = df["y"].values

    Xtr, Xte, ytr, yte = train_test_split(Xdf, y, test_size=0.2, random_state=42)
    if len(Xtr) > TRAIN_CAP:                       # 학습 표본 상한(속도) — 위치 인덱스로 정렬 유지
        sel = np.random.RandomState(42).choice(len(Xtr), TRAIN_CAP, replace=False)
        Xtr = Xtr.iloc[sel]; ytr = ytr[sel]
    log(f"학습 {len(Xtr):,} / 평가 {len(Xte):,}")

    def make_ct():
        return ColumnTransformer([
            ("te", TargetEncoder(target_type="continuous", random_state=42), F.CAT_COLS),
            ("num", "passthrough", F.NUM_COLS)])
    hgb = Pipeline([("ct", make_ct()),
                    ("m", HistGradientBoostingRegressor(max_iter=600, learning_rate=0.06,
                                                        max_leaf_nodes=63, l2_regularization=0.1,
                                                        early_stopping=True, random_state=42))])
    rf = Pipeline([("ct", make_ct()),
                   ("m", RandomForestRegressor(n_estimators=120, max_depth=22, n_jobs=-1,
                                               max_samples=0.5, random_state=42))])
    ens = StackingRegressor(estimators=[("hgb", hgb), ("rf", rf)],
                            final_estimator=Ridge(), cv=3, n_jobs=-1)
    log("스태킹 앙상블 학습 중…")
    ens.fit(Xtr, ytr)

    # === 평가(가격 스케일) ===
    def metrics(model, name):
        pred = model.predict(Xte)
        pr, ar = np.expm1(pred), np.expm1(yte)
        mae = mean_absolute_error(ar, pr); r2 = r2_score(yte, pred)
        mape = float(np.median(np.abs(pr - ar) / np.maximum(ar, 1)) * 100)
        log(f"  {name:<10} R²={r2:.3f}  MAE={mae:,.0f}원  MAPE(중앙)={mape:.1f}%")
        return r2, mae, mape
    hgb.fit(Xtr, ytr); rf.fit(Xtr, ytr)
    base_mae = mean_absolute_error(np.expm1(yte), np.expm1(np.full_like(yte, np.median(ytr))))
    log("평가:")
    log(f"  {'베이스라인':<10} MAE={base_mae:,.0f}원 (전체 중앙값 예측)")
    m_hgb = metrics(hgb, "HistGBM"); m_rf = metrics(rf, "RandomForest")
    m_ens = metrics(ens, "앙상블")

    # === 전체 예측 → 잔차(과지출) ===
    df["pred_log"] = ens.predict(Xdf)
    df["pred_price"] = np.expm1(df["pred_log"])
    df["resid"] = df["y"] - df["pred_log"]          # +면 예측보다 비쌈(과지출 의심)

    # 품목(품명)별 집계
    g = df.groupby("prdctClsfcNoNm").agg(
        예측적정가=("pred_price", "median"),
        과지출지표=("resid", "median"),
        표본수=("price", "size")).reset_index()
    g["과지출지표"] = g["과지출지표"].round(3)
    g["예측적정가"] = g["예측적정가"].round(0).astype(int)

    # === 피처 중요도(permutation, HGB) ===
    log("피처 중요도 계산 중…")
    sub = np.random.RandomState(1).choice(len(Xte), min(4000, len(Xte)), replace=False)
    pi = permutation_importance(hgb, Xte.iloc[sub], yte[sub], n_repeats=4, random_state=1, n_jobs=-1)
    names = feat
    imp = sorted(zip(names, pi.importances_mean), key=lambda x: -x[1])
    plt.figure(figsize=(7, 5))
    top = imp[:12][::-1]
    plt.barh([n for n, _ in top], [v for _, v in top], color="#3E5C76")
    plt.title("조달 단가 예측 — 피처 중요도(permutation)"); plt.tight_layout()
    plt.savefig(os.path.join(DOCS, "ml_feature_importance.png"), dpi=110); plt.close()

    # === 품목 통합피처: KMeans + IsolationForest (scores_v2 조인) ===
    seg = pd.DataFrame()
    spath = os.path.join(DATA, "scores_v2.csv")
    if os.path.exists(spath):
        s = pd.read_csv(spath)
        s = s.merge(g[["prdctClsfcNoNm", "과지출지표", "예측적정가"]],
                    left_on="품명", right_on="prdctClsfcNoNm", how="left")
        fcols = ["마진배수", "경쟁업체수_하한", "중기경쟁비율"]
        if "수요금액" in s.columns:
            s["수요log"] = np.log1p(pd.to_numeric(s["수요금액"], errors="coerce").fillna(0))
            fcols.append("수요log")
        Z = StandardScaler().fit_transform(s[fcols].fillna(0).values)
        km = KMeans(n_clusters=4, n_init=10, random_state=42).fit(Z)
        s["군집"] = km.labels_
        s["이상치"] = (IsolationForest(contamination=0.06, random_state=42)
                     .fit_predict(Z) == -1).astype(int)
        # 군집 명명: 평균 블루오션점수·마진·진입으로 해석
        cs = s.groupby("군집").agg(점수=("블루오션점수", "mean"),
                                  마진=("마진배수", "mean"),
                                  중기=("중기경쟁비율", "mean")).sort_values("점수", ascending=False)
        names_map = {}
        ranked = list(cs.index)
        for rank, cl in enumerate(ranked):
            if cs.loc[cl, "중기"] >= 70: nm = "진입제한 시장"
            elif rank == 0: nm = "블루오션 후보"
            elif rank == len(ranked) - 1: nm = "레드오션"
            else: nm = "관망 시장"
            names_map[cl] = nm
        s["군집명"] = s["군집"].map(names_map)
        seg = s[["품명", "군집", "군집명", "이상치", "과지출지표", "예측적정가"]]

    # === 출력 ===
    g = g.rename(columns={"prdctClsfcNoNm": "품명"})
    if len(seg):
        out = g.merge(seg[["품명", "군집", "군집명", "이상치"]], on="품명", how="left")
    else:
        out = g
    # 과지출지표를 % 환산(exp(resid)-1), 데이터오류 클립 ±300%
    out["과지출퍼센트"] = (np.expm1(out["과지출지표"]) * 100).clip(-90, 300).round(0)
    keep = ["품명", "예측적정가", "과지출지표", "과지출퍼센트", "표본수"] + \
           [c for c in ["군집", "군집명", "이상치"] if c in out.columns]
    out = out[[c for c in keep if c in out.columns]].drop_duplicates("품명")
    out.to_csv(os.path.join(DATA, "ml_predictions.csv"), index=False, encoding="utf-8-sig")

    # 리포트
    with open(os.path.join(DOCS, "ml_report.txt"), "w", encoding="utf-8") as f:
        f.write("MR 가격예측 앙상블 — 성능 리포트\n")
        f.write(f"학습 {len(Xtr):,} / 평가 {len(Xte):,}\n")
        f.write(f"베이스라인 MAE {base_mae:,.0f}원\n")
        f.write(f"HistGBM      R²={m_hgb[0]:.3f} MAE={m_hgb[1]:,.0f} MAPE={m_hgb[2]:.1f}%\n")
        f.write(f"RandomForest R²={m_rf[0]:.3f} MAE={m_rf[1]:,.0f} MAPE={m_rf[2]:.1f}%\n")
        f.write(f"앙상블       R²={m_ens[0]:.3f} MAE={m_ens[1]:,.0f} MAPE={m_ens[2]:.1f}%\n\n")
        f.write("피처 중요도 TOP12:\n")
        for n, v in imp[:12]:
            f.write(f"  {n:<22} {v:.4f}\n")
        if len(seg):
            f.write("\n군집 분포:\n")
            for cl, c in seg["군집명"].value_counts().items():
                f.write(f"  {cl}: {c}개\n")
    log(f"\n완료 → data/ml_predictions.csv ({len(out)}품목), docs/ml_report.txt, ml_feature_importance.png")
    log(f"앙상블 최종: R²={m_ens[0]:.3f}, MAPE={m_ens[2]:.1f}%")


if __name__ == "__main__":
    main()
