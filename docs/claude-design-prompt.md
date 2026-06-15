# MR(Margin Radar) — Claude 디자인 생성용 프롬프트 + 자료

아래 "프롬프트" 블록 전체를 Claude(claude.ai)에 그대로 붙여넣으면 됩니다. 데이터·디자인토큰·화면명세·제약이 모두 포함된 자기완결형입니다.

---

## ▼ 여기부터 복사 (프롬프트)

너는 시니어 프로덕트 디자이너 겸 프론트엔드 개발자다. 아래 사양대로 **공공조달 데이터 분석 SaaS "MR(Margin Radar)"의 웹 UI**를 단일 파일 React 컴포넌트(Tailwind CSS 사용)로 만들어라. claude.ai 아티팩트로 바로 렌더링되어야 하고, 제공한 실제 데이터를 그대로 써라.

### 제품 한 줄
조달 데이터로 "정부가 많이 사고 · 경쟁이 적고 · 시중가 대비 마진이 있는" 품목을 찾아 셀러·수입사에게 진입 우선순위를 보여주는 공공조달 소싱 인텔리전스. 같은 분석이 두 얼굴: (1) 셀러에겐 고마진 판로 발굴, (2) 사회엔 조달 가격·정보 투명성.

### 절대 지켜야 할 제약
- **이모지 절대 금지.** 아이콘은 Lucide(lucide-react) SVG만.
- **과장 금지.** "정부가 5배 비싸게 산다" 같은 카피 쓰지 마라. 마진은 동급(가정용 저가품 제외) 비교 기준 1.1~2.3배다. 카피는 "동급으로 비교해도 정부는 다수 품목을 시중가 대비 더 비싸게 구매하고, 중소 셀러는 이 구조를 모른다"는 정직한 톤.
- 숫자는 tabular-nums(고정폭)로 정렬. 통화는 "402,500원" 형식.
- WCAG AA 대비 준수, 터치타깃 44px 이상.
- 정부 데이터를 단정적으로 "과지출"로 낙인찍지 말 것. 마진 표시에 "동급 비교 기준" 맥락을 둘 것.

### 디자인 방향
데이터 밀집형(data-dense) B2B 대시보드. 정부조달/핀테크의 신뢰감. 미니멀·플랫. 폰트는 Pretendard(없으면 system sans). 과한 그라데이션·네온·글래스모피즘 금지.

### 디자인 토큰 (이 값 그대로)
- Primary #1D4ED8 (hover #1E40AF), Primary-subtle #EFF6FF
- 배경 #F8FAFC / 카드 #FFFFFF / 보더 #E2E8F0
- 텍스트 #0F172A / 보조텍스트 #64748B
- 의미색: success #15803D, warning #B45309, danger #B91C1C, info #0E7490
- radius 10px(카드)/6px, 그림자는 약하게(0 1px 2px rgba(15,23,42,.06))
- 타이포: display 32/700, h1 24/700, h2 18/600, body 14/400, caption 12/500
- 스페이싱 8pt 그리드

### 색 인코딩 규칙
- 마진배수: 1.0 미만=중립회색, 1.0~1.5=info(청), 1.5~2.0=warning(주황), 2.0↑=danger(적). 높을수록 진하게.
- 블루오션 점수(0~50+): 초록 그라데이션, 높을수록 진함.
- 경쟁업체수: 적을수록 success(기회), 많을수록 회색. 막대로 시각화.

### 화면 3개 (탭/라우팅)
1. **블루오션 랭킹(메인)**: 상단 KPI 카드 4개(분석 품목 수, 수집 거래데이터 건수, 평균 마진배수, 시중가 1.5배↑ 품목 수). 아래 랭킹 테이블: 순위 / 품명·카테고리 / 블루오션 점수(배지) / 마진배수(색 pill) / 정부단가 / 동급 시중가 / 경쟁업체수(막대). 행 클릭 시 상세로.
2. **품목 상세**: 헤더(품명·카테고리·점수). 핵심 지표 4개(정부 계약단가, 동급 시중가, 마진배수, 경쟁업체 수). 좌측 카드=경쟁 업체 리스트(단가순, 일부는 규격서 링크), 우측 카드=정부 납품 규격 샘플(각 항목에 "규격서" 링크 태그 — 실제 조달청 규격서 다운로드) + 상품 이미지 썸네일. 규격/업체의 doc 필드가 있으면 새 탭 링크로.
3. **내 제품 역조회**: 상단 배너("내 제품, 공공조달에선 얼마에 팔릴까?") + 검색창. 입력 키워드로 품목 필터 → 진입 진단 카드(마진 pill + 한줄 평가: 1.5↑"진입 유망-고마진" / 1.0↑"검토" / 1.0미만"신중"). 카드 클릭 시 상세로.

### 푸터 고지(작게)
"마진배수 = 정부 계약단가 중앙값 ÷ 동급(정부가 40%↑) 시중가 중앙값. 동급 비교 기준. 출처: 조달청 종합쇼핑몰 품목정보 API · 네이버 쇼핑 · MR 분석"

### 데이터 (이걸 그대로 컴포넌트에 넣어라)
STATS = {"totalProducts":41894,"categories":8,"rankedItems":14,"avgMargin":1.56,"overpayItems":9}

RANKING(14품목, govPrice=정부단가, retailPrice=동급시중가, competition=경쟁업체수, productCount=품목수):
[{"name":"컴퓨터책상","category":"책상","score":46.1,"margin":2.27,"govPrice":402500,"retailPrice":177000,"competition":57,"productCount":872},
{"name":"작업용의자","category":"의자","score":39.8,"margin":1.94,"govPrice":195000,"retailPrice":100495,"competition":38,"productCount":4493},
{"name":"책장","category":"책장","score":39.1,"margin":1.93,"govPrice":336000,"retailPrice":174000,"competition":84,"productCount":6421},
{"name":"진공청소기","category":"진공청소기","score":37.7,"margin":1.73,"govPrice":364000,"retailPrice":210000,"competition":12,"productCount":68},
{"name":"스툴의자","category":"의자","score":37.1,"margin":1.8,"govPrice":122000,"retailPrice":67950,"competition":35,"productCount":544},
{"name":"공기청정기","category":"공기청정기","score":36.5,"margin":1.72,"govPrice":1437250,"retailPrice":836945,"competition":18,"productCount":44},
{"name":"건습식진공청소기","category":"진공청소기","score":35.7,"margin":1.64,"govPrice":379500,"retailPrice":230945,"competition":13,"productCount":72},
{"name":"책상","category":"책상","score":35.4,"margin":1.74,"govPrice":297000,"retailPrice":171000,"competition":65,"productCount":4512},
{"name":"보조책상","category":"책상","score":34.0,"margin":1.66,"govPrice":203500,"retailPrice":122900,"competition":49,"productCount":394},
{"name":"라운지용의자","category":"의자","score":29.6,"margin":1.42,"govPrice":495000,"retailPrice":349600,"competition":32,"productCount":901},
{"name":"캐비닛","category":"캐비닛","score":27.5,"margin":1.35,"govPrice":283000,"retailPrice":209500,"competition":85,"productCount":5706},
{"name":"학생용책상","category":"책상","score":27.4,"margin":1.12,"govPrice":74800,"retailPrice":66900,"competition":7,"productCount":273},
{"name":"소파","category":"소파","score":18.9,"margin":0.9,"govPrice":558000,"retailPrice":622040,"competition":43,"productCount":4125},
{"name":"매트리스","category":"매트","score":15.2,"margin":0.58,"govPrice":176000,"retailPrice":301880,"competition":10,"productCount":603}]

DETAIL 예시(컴퓨터책상 — 상세화면 구조 참고용. 다른 품목은 corps/specs/imgs가 비어도 우아하게 처리):
{"name":"컴퓨터책상","corps":[{"name":"청원","median":220000,"doc":""},{"name":"힐탑플러스","median":250000,"doc":"https://shop.g2b.go.kr/..."},{"name":"다솜우드","median":252500,"doc":"https://shop.g2b.go.kr/..."}],
"specs":[{"spec":"컴퓨터책상, 대오퍼니처, DOF-140, 1800×600×750mm","doc":"https://shop.g2b.go.kr/..."},{"spec":"컴퓨터책상, 파랑새교구, PRCD53, 800×500×530mm, 노출형","doc":"https://shop.g2b.go.kr/..."}],
"imgs":["https://shop.g2b.go.kr/static/CataAttach/.../img1.jpg"]}

### 산출물
- 단일 React 컴포넌트(default export), Tailwind 클래스 사용, lucide-react 아이콘. 외부 데이터 fetch 없이 위 상수를 내장.
- 반응형(데스크탑·모바일). 빈 데이터 우아하게 처리. 깔끔하고 프로페셔널하게.

## ▲ 여기까지 복사

---

## 참고: 실제 데이터 전체가 필요하면
`web/data.json`에 14품목 전체(업체·규격·이미지·규격서 링크 포함)가 들어있다. 더 풍부한 상세화면을 원하면 그 파일을 통째로 첨부해서 "이 data.json을 import해 렌더링해줘"라고 하면 된다.

## 참고: 현재 구현된 화면
`web/`(index.html+app.js+styles.css)에 이미 작동하는 3화면 구현본이 있다. Claude가 만든 디자인을 이걸 대체하거나 비교 참고용으로 쓰면 된다. 디자인 상세는 `design-system/MASTER.md` 참조.
