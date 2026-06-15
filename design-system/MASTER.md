# MR (Margin Radar) 디자인 시스템 — MASTER

> 제품 유형: 공공조달 데이터 분석 B2B SaaS (data-dense dashboard)
> 스타일: Flat + Minimal, 신뢰감(정부조달/핀테크 인접), 정보 밀도 우선
> 스택: Next.js + Tailwind / Pretendard(국문)·Inter(영문/숫자)

## 1. 컬러 토큰

### Brand / Primary (신뢰의 딥블루)
| 토큰 | Light | Dark | 용도 |
|---|---|---|---|
| `--primary` | `#1D4ED8` | `#3B82F6` | 주요 액션, 링크, 강조 |
| `--primary-hover` | `#1E40AF` | `#60A5FA` | hover |
| `--primary-subtle` | `#EFF6FF` | `#172554` | 배경 강조, 선택 행 |

### Neutral (그레이 스케일)
| 토큰 | Light | Dark |
|---|---|---|
| `--bg` | `#FFFFFF` | `#0B1120` |
| `--bg-subtle` | `#F8FAFC` | `#111827` |
| `--surface` | `#FFFFFF` | `#1E293B` |
| `--border` | `#E2E8F0` | `#334155` |
| `--text` | `#0F172A` | `#F1F5F9` |
| `--text-muted` | `#64748B` | `#94A3B8` |

### Semantic (의미 색 — 마진/경쟁 시각화 핵심)
| 토큰 | Light | Dark | 용도 |
|---|---|---|---|
| `--success` | `#15803D` | `#22C55E` | 블루오션·저경쟁·기회 |
| `--success-subtle` | `#DCFCE7` | `#14532D` | 좋은 마진 배경 |
| `--warning` | `#B45309` | `#F59E0B` | 주의·중간 등급 |
| `--danger` | `#B91C1C` | `#EF4444` | 고마진(과지출)·경고 |
| `--danger-subtle` | `#FEE2E2` | `#7F1D1D` | 강조 배경 |
| `--info` | `#0E7490` | `#06B6D4` | 보조 정보 |

> 마진 스케일 색 매핑: 1.0배 미만=중립(muted) / 1.0~1.5=info / 1.5~2.0=warning / 2.0배↑=danger(높을수록 진하게). 점수 높을수록 success.

### 대비 검증 (WCAG AA 4.5:1)
- text(#0F172A) on bg(#FFFFFF) = 17.9:1 (통과)
- text-muted(#64748B) on bg = 4.8:1 (통과)
- primary(#1D4ED8) on white = 6.7:1 (통과)
- success(#15803D) on white = 5.0:1 (통과)
- warning(#B45309) on white = 5.0:1 (통과) / danger(#B91C1C) on white = 6.5:1 (통과)
- white on primary(#1D4ED8) = 6.7:1 (통과)

## 2. 타이포그래피
| 토큰 | 크기/굵기 | 용도 |
|---|---|---|
| `display` | 32px / 700 | 페이지 타이틀, 핵심 수치 |
| `h1` | 24px / 700 | 섹션 헤더 |
| `h2` | 18px / 600 | 카드 헤더 |
| `body` | 14px / 400 | 본문·표 |
| `caption` | 12px / 500 | 라벨·메타 |
| `num` | tabular-nums, 600 | 단가·배수 등 숫자(정렬 일관) |

- 폰트: `Pretendard, Inter, -apple-system, sans-serif`
- 숫자는 항상 `font-variant-numeric: tabular-nums` (표 정렬).

## 3. 스페이싱 (8pt 그리드)
`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` — 토큰 `--space-1`(4) ~ `--space-8`(64). 데이터 밀집 UI라 카드 패딩 16, 표 셀 패딩 8×12 기준.

## 4. Radius / Shadow
- radius: `--radius-sm` 6px, `--radius` 10px(카드), `--radius-full` 9999px(배지)
- shadow: `--shadow-sm` `0 1px 2px rgba(15,23,42,.06)`, `--shadow` `0 4px 12px rgba(15,23,42,.08)` (과한 그림자 금지)

## 5. 애니메이션
- 기본 transition `150ms ease`, hover만. 데이터 화면이라 과한 모션 금지.
- 로딩은 skeleton, 점수 변화는 200ms 색 전환까지만.

## 6. 컴포넌트 가이드
- **ScoreBadge**: 블루오션 점수(0~100) 원형/필 배지. 점수→색(success 그라데이션).
- **MarginPill**: 마진배수 표시. 1.0 미만 muted, 높을수록 danger 계열.
- **RankTable**: data-dense 표. 행 hover=primary-subtle, 숫자 우정렬 tabular-nums, 정렬 가능 헤더.
- **StatCard**: KPI 카드(총 품목수, 평균 마진 등). 큰 숫자 display + caption.
- **CompetitionBar**: 경쟁업체수 막대(적을수록 success).

## 7. 금기 (Anti-patterns) — 절대 금지
- (금지) 이모지를 구조 아이콘으로 사용 (Lucide 아이콘만)
- (금지) raw hex 직접 사용 (반드시 토큰 변수)
- (금지) 자극적 빨강 남발 — danger는 진짜 경고/고마진에만
- (금지) 과한 그라데이션·네온·글래스모피즘 (신뢰 저해)
- (금지) 숫자 가변폭 폰트 (표 정렬 깨짐)
- (금지) 터치 타깃 44pt 미만
- (금지) 정부 데이터를 단정적으로 "과지출"로 표기 (검증보고서 결론: 등급 차이 고지 필요 → "동급 비교 기준" 라벨 병기)
