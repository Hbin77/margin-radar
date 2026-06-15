#!/usr/bin/env python3
"""ML 적대적 검증 — '완벽한가'를 다각도로 테스트.
1) 카테고리 중앙값 베이스라인을 이기는가 (모델이 룩업 이상인가)
2) K-fold CV 안정성 + 과적합(train vs test) 갭
3) GroupKFold(세부품명) — 처음 보는 카테고리 일반화
4) 잔차 진단(분포·극단치) + 이상치 타당성
"""
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.preprocessing import TargetEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge
from sklearn.ensemble import StackingRegressor
from sklearn.model_selection import KFold, GroupKFold, cross_val_predict, train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import ml_features as F

DATA = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))


def log(m): print(m, flush=True)


def rmae(y, p):
    return r2_score(y, p), mean_absolute_error(np.expm1(y), np.expm1(p))


def make_model():
    ct = ColumnTransformer([("te", TargetEncoder(target_type="continuous"), F.CAT_COLS),
                            ("num", "passthrough", F.NUM_COLS)])
    return Pipeline([("ct", ct), ("m", HistGradientBoostingRegressor(
        max_iter=600, learning_rate=0.06, max_leaf_nodes=63,
        l2_regularization=0.1, early_stopping=True, random_state=42))])


def main():
    df = F.build(pd.read_csv(os.path.join(DATA, "products.csv"), dtype=str, keep_default_na=False))
    for c in F.CAT_COLS:
        df[c] = df[c].astype(str)
    # 속도 위해 표본 12만
    if len(df) > 120000:
        df = df.sample(120000, random_state=0).reset_index(drop=True)
    X = df[F.CAT_COLS + F.NUM_COLS]
    y = df["y"].values
    sebu = df["dtilPrdctClsfcNo"].values
    log(f"검증 표본 {len(df):,}행, 세부품명 {df['dtilPrdctClsfcNo'].nunique()}종\n")

    # ===== 1) 베이스라인 비교 =====
    log("[1] 베이스라인 대비 (모델이 룩업 이상인가)")
    Xtr, Xte, ytr, yte, str_, ste = train_test_split(X, y, sebu, test_size=0.2, random_state=42)
    # (a) 전체 중앙값
    p_glob = np.full_like(yte, np.median(ytr))
    r0, m0 = rmae(yte, p_glob)
    # (b) 세부품명별 중앙값(룩업) — train에서 학습, test에 적용
    med = pd.Series(ytr).groupby(pd.Series(str_)).median()
    gmed = np.median(ytr)
    p_cat = np.array([med.get(s, gmed) for s in ste])
    r1, m1 = rmae(yte, p_cat)
    # (c) 모델
    mdl = make_model().fit(Xtr, ytr)
    p_mdl = mdl.predict(Xte)
    r2, m2 = rmae(yte, p_mdl)
    log(f"   전체중앙값      R²={r0:6.3f}  MAE={m0:,.0f}")
    log(f"   세부품명중앙값  R²={r1:6.3f}  MAE={m1:,.0f}  ← 룩업 베이스라인")
    log(f"   ML(HGB)        R²={r2:6.3f}  MAE={m2:,.0f}")
    gain = (m1 - m2) / m1 * 100
    log(f"   → 룩업 대비 MAE {gain:+.1f}% (양수=모델이 카테고리내 변동까지 설명)\n")

    # ===== 2) K-fold CV 안정성 + 과적합 =====
    log("[2] 5-fold CV 안정성 + 과적합")
    kf = KFold(5, shuffle=True, random_state=1)
    r2s, gaps = [], []
    for tr, te in kf.split(X):
        m = make_model().fit(X.iloc[tr], y[tr])
        rt = r2_score(y[tr], m.predict(X.iloc[tr]))
        rv = r2_score(y[te], m.predict(X.iloc[te]))
        r2s.append(rv); gaps.append(rt - rv)
    log(f"   CV R² = {np.mean(r2s):.3f} ± {np.std(r2s):.3f}")
    log(f"   과적합 갭(train-test R²) = {np.mean(gaps):.3f} (작을수록 건강)\n")

    # ===== 3) GroupKFold(세부품명) — 미지 카테고리 일반화 =====
    log("[3] GroupKFold(세부품명) — 처음 보는 카테고리 일반화")
    gkf = GroupKFold(5)
    rg = []
    for tr, te in gkf.split(X, y, groups=sebu):
        m = make_model().fit(X.iloc[tr], y[tr])
        rg.append(r2_score(y[te], m.predict(X.iloc[te])))
    log(f"   미지 세부품명 R² = {np.mean(rg):.3f} ± {np.std(rg):.3f}")
    log(f"   → 일반 R²({np.mean(r2s):.3f})와의 차이가 크면 '카테고리 룩업 의존'\n")

    # ===== 4) 잔차 진단 =====
    log("[4] 잔차 진단")
    resid = yte - p_mdl
    within20 = np.mean(np.abs(np.expm1(p_mdl) - np.expm1(yte)) / np.maximum(np.expm1(yte), 1) <= 0.2) * 100
    log(f"   잔차(log) 평균={resid.mean():.3f} 표준편차={resid.std():.3f}")
    log(f"   예측오차 ±20% 이내 비율 = {within20:.1f}%")
    log(f"   |잔차|>1.0(±170%↑ 빗나감) 비율 = {np.mean(np.abs(resid)>1.0)*100:.1f}%")


if __name__ == "__main__":
    main()
