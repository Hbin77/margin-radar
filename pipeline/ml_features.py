#!/usr/bin/env python3
"""T1 — 피처 엔지니어링. products.csv → 가격예측용 피처 행렬.
규격 텍스트에서 치수/수치 파싱 + 범주형 인코딩.
"""
import re
import numpy as np
import pandas as pd

DIM_RE = re.compile(r"(\d{2,6})[×xX*](\d{2,6})(?:[×xX*](\d{2,6}))?")
NUM_RE = re.compile(r"\d+(?:\.\d+)?")
# 가격결정 신호 단위별 정규식
CAP_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:ml|밀리리터|cc)", re.I)
LIT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:l|리터|ℓ)", re.I)
KG_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:kg|킬로)", re.I)
G_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:g|그램|gram)", re.I)
SHEET_RE = re.compile(r"(\d+)\s*(?:매|장|겹|ply|p\b)", re.I)
INCH_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:인치|inch|\")", re.I)
WATT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:kw|w|와트)", re.I)
SET_RE = re.compile(r"(\d+)\s*(?:구|조|세트|set|입|인용)", re.I)


def _first(rx, s):
    m = rx.search(s)
    return float(m.group(1)) if m else 0.0

# 범주형 (계층 롤업 포함: 미지 세부품명도 상위 분류에서 가격수준 차용)
CAT_COLS = ["dtilPrdctClsfcNo", "cls2", "cls4", "cls6", "cls8",
            "prdctClsfcNoNm", "prdctMakrNm", "prdctUnit",
            "entrprsDivNm", "category", "exclncPrcrmntPrdctYn", "smetprCmptProdctYn"]
NUM_COLS = ["dim_w", "dim_d", "dim_h", "vol", "max_num", "num_cnt",
            "cap_ml", "cap_l", "wt_kg", "wt_g", "sheet", "inch", "watt", "setcnt",
            "spec_len", "makr_freq", "sebu_freq", "cntrct_days"]

SPEC_KEYS = ["dim_w", "dim_d", "dim_h", "vol", "max_num", "num_cnt",
             "cap_ml", "cap_l", "wt_kg", "wt_g", "sheet", "inch", "watt", "setcnt", "spec_len"]


def parse_spec(s):
    raw = s or ""
    s = raw.replace(" ", "")
    m = DIM_RE.search(s)
    w = d = h = 0.0
    if m:
        w = float(m.group(1)); d = float(m.group(2)); h = float(m.group(3) or 0)
    vol = w * d * h if h else (w * d if d else 0.0)
    nums = [float(x) for x in NUM_RE.findall(s)]
    return (w, d, h, np.log1p(vol), (max(nums) if nums else 0.0), len(nums),
            _first(CAP_RE, s), _first(LIT_RE, s), _first(KG_RE, s), _first(G_RE, s),
            _first(SHEET_RE, s), _first(INCH_RE, s), _first(WATT_RE, s),
            _first(SET_RE, s), len(raw))


def build(df):
    df = df.copy()
    df["price"] = pd.to_numeric(df["cntrctPrceAmt"], errors="coerce")
    df = df[df["price"] > 0].copy()
    # 가격 극단 트림(상하위 0.5%) — 학습 안정
    lo, hi = df["price"].quantile([0.005, 0.995])
    df = df[(df["price"] >= lo) & (df["price"] <= hi)].copy()
    df["y"] = np.log1p(df["price"])

    # 물품분류 계층 롤업(10자리 → 2/4/6/8자리 상위분류)
    sebu = df["dtilPrdctClsfcNo"].fillna("").astype(str)
    df["cls2"] = sebu.str[:2]
    df["cls4"] = sebu.str[:4]
    df["cls6"] = sebu.str[:6]
    df["cls8"] = sebu.str[:8]

    dims = df["prdctSpecNm"].apply(parse_spec)
    df[SPEC_KEYS] = pd.DataFrame(dims.tolist(), index=df.index)

    # 계약기간(일) — 가격에 영향 가능
    bg = pd.to_datetime(df["cntrctBgnDate"], errors="coerce")
    en = pd.to_datetime(df["cntrctEndDate"], errors="coerce")
    df["cntrct_days"] = (en - bg).dt.days.fillna(0).clip(0, 3650)

    # 고차원 범주 빈도 인코딩(RF용 수치)
    df["makr_freq"] = df["prdctMakrNm"].map(df["prdctMakrNm"].value_counts()).fillna(0)
    df["sebu_freq"] = df["dtilPrdctClsfcNo"].map(df["dtilPrdctClsfcNo"].value_counts()).fillna(0)

    for c in CAT_COLS:
        df[c] = df[c].fillna("").astype("category")
    return df


def Xy(df):
    """HistGBM용: 범주형 + 수치. RF용은 별도 인코딩에서 처리."""
    X = df[CAT_COLS + NUM_COLS].copy()
    return X, df["y"]
