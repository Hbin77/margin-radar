let DATA = null;
const $ = (s, r = document) => r.querySelector(s);
const won = n => Number(n).toLocaleString('ko-KR') + '원';
const wonShort = n => {            // 큰 금액: 억/만원
  n = Number(n);
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '억원';
  if (n >= 1e4) return Math.round(n / 1e4).toLocaleString('ko-KR') + '만원';
  return n.toLocaleString('ko-KR') + '원';
};

// 색 매핑 (에디토리얼 팔레트, 채도 낮춤)
function marginColor(m) {
  if (m < 1.0) return { bg: '#F1F0EA', fg: '#94A3B8' };       // 시중보다 쌈 = 중립
  if (m < 1.5) return { bg: '#ECFBFD', fg: '#0E7490' };       // info
  if (m < 2.0) return { bg: '#FAF1E2', fg: '#B45309' };       // warning
  return { bg: '#FAEEEC', fg: '#B91C1C' };                    // danger(고마진)
}
function scoreColor(s) {
  const t = Math.min(s / 80, 1);                              // 점수 높을수록 진한 포레스트그린
  return `hsl(152 32% ${45 - t * 17}%)`;
}
function compColor(c) { return c <= 6 ? '#15803D' : c <= 15 ? '#B45309' : '#94A3B8'; }
function entryColor(t) {
  if (t === '개방형') return { bg: '#E7F1E9', fg: '#15803D' };
  if (t === '혼합') return { bg: '#FAF1E2', fg: '#B45309' };
  return { bg: '#F1F0EA', fg: '#64748B' };                    // 중기경쟁 제한
}

function render(view, arg) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  if (view === 'ranking') renderRanking();
  else if (view === 'lookup') renderLookup();
  else if (view === 'detail') renderDetail(arg);
  if (window.lucide) lucide.createIcons();
}

function kpiCards() {
  const s = DATA.stats;
  const card = (icon, label, value, sub = '') =>
    `<div class="card kpi"><div class="label"><i data-lucide="${icon}"></i>${label}</div>
     <div class="value">${value}${sub ? ` <small>${sub}</small>` : ''}</div></div>`;
  return `<div class="kpis">
    ${card('boxes', '분석 품목', s.rankedItems.toLocaleString(), '종')}
    ${card('database', '수집 거래데이터', s.totalProducts.toLocaleString(), '건')}
    ${card('trending-up', '평균 마진배수', s.avgMargin + '배')}
    ${card('door-open', '진입 가능(개방형)', s.openItems, '종')}
  </div>`;
}

function renderRanking() {
  const rows = DATA.items.map((it, i) => {
    const mc = marginColor(it.margin);
    const ec = entryColor(it.entryType);
    const compW = Math.max(8, 64 - it.competition * 1.6);
    return `<tr data-name="${encodeURIComponent(it.name)}">
      <td><span class="rank ${i < 3 ? 'top' : ''}">${i + 1}</span></td>
      <td><div class="pname">${it.name}</div><div class="cat">${it.category}</div></td>
      <td class="r"><span class="score" style="background:${scoreColor(it.score)}">${it.score}</span></td>
      <td><span class="entry-pill" style="background:${ec.bg};color:${ec.fg}">${it.entryType}</span></td>
      <td class="r"><span class="margin-pill" style="background:${mc.bg};color:${mc.fg}">${it.margin}배</span></td>
      <td class="r num" title="${it.demand ? won(it.demand) : ''}">${it.demand ? wonShort(it.demand) : '-'}</td>
      <td><div class="comp-bar"><div class="bar"><span style="width:${compW}px;background:${compColor(it.competition)}"></span></div>
        <span class="num">${it.competition}곳~</span></div></td>
    </tr>`;
  }).join('');

  $('#app').innerHTML = `
    ${kpiCards()}
    <div class="section-head"><h1>블루오션 랭킹</h1>
      <span class="hint">${DATA.stats.hasDemand
        ? '점수 = 마진(30%) + 진입가능성(30%) + 수요(25%) + 저경쟁(15%)'
        : '점수 = 마진(40%) + 진입가능성(40%) + 저경쟁(20%)'} · 동급 비교 기준</span></div>
    <table class="tbl"><thead><tr>
      <th>#</th><th>품명 / 카테고리</th><th class="r">블루오션</th><th>진입유형</th><th class="r">마진</th>
      <th class="r">정부 수요${DATA.stats.hasDemand ? '(1개월)' : ''}</th><th>경쟁(하한)</th>
    </tr></thead><tbody>${rows}</tbody></table>`;

  $('#app').querySelectorAll('tbody tr').forEach(tr =>
    tr.onclick = () => render('detail', decodeURIComponent(tr.dataset.name)));
}

function priceChart(it) {
  const cps = it.corps.map(c => c.median).filter(p => p > 0);
  if (cps.length < 2) return '';
  const ref = [...cps, it.govPrice, it.retailPrice];
  const lo = Math.min(...ref);
  // 이상치 클램프: 정부단가의 1.6배와 경쟁사 분포 상단 중 큰 값으로 상한
  const sorted = [...cps].sort((a, b) => a - b);
  const p85 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.85))];
  const hi = Math.max(it.govPrice, it.retailPrice, p85) * 1.08;
  const span = (hi - lo) || 1;
  const x = p => (Math.min(Math.max((p - lo) / span, 0), 1) * 90 + 5).toFixed(1);  // 5~95%, 클램프
  const jit = [34, 58, 44, 70, 38, 62, 50, 30, 66, 42, 54, 48];
  const dots = cps.map((p, i) =>
    `<span class="dot" style="left:${x(p)}%;bottom:${jit[i % jit.length]}%" title="${won(p)}"${p > hi ? ' data-out="1"' : ''}></span>`).join('');
  return `<div class="card" style="margin-bottom:var(--s4)">
    <div class="h2"><i data-lucide="git-commit-horizontal"></i> 가격 분포 · 경쟁사 단가(${cps.length}곳)와 정부·시중 단가</div>
    <div class="chart">${dots}
      <span class="retailline" style="left:${x(it.retailPrice)}%"></span>
      <span class="govline" style="left:${x(it.govPrice)}%"></span></div>
    <div class="chart-axis"><span>${won(lo)}</span>
      <span style="color:var(--success);font-family:Pretendard;font-weight:600">시중 ${won(it.retailPrice)}</span>
      <span style="color:var(--danger);font-family:Pretendard;font-weight:600">정부 ${won(it.govPrice)}</span>
      <span>${won(hi)}</span></div>
  </div>`;
}

function renderDetail(name) {
  const it = DATA.items.find(x => x.name === name);
  if (!it) return render('ranking');
  const mc = marginColor(it.margin);
  const corps = it.corps.map(c => {
    const nm = c.doc ? `<a href="${c.doc}" target="_blank" rel="noopener" class="lnk">${c.name}</a>` : c.name;
    return `<li><span>${nm}</span><span class="num">${c.median ? won(c.median) : '-'}</span></li>`;
  }).join('');
  const specs = it.specs.map(s => {
    const label = `<i data-lucide="file-text"></i> ${s.spec}`;
    return s.doc
      ? `<a class="spec lnk-row" href="${s.doc}" target="_blank" rel="noopener">${label}<span class="lnk-tag">규격서</span></a>`
      : `<div class="spec">${label}</div>`;
  }).join('') || '<div class="spec">규격 정보 없음</div>';
  const imgs = it.imgs.map(u => `<img src="${u}" loading="lazy" onerror="this.style.display='none'">`).join('');

  $('#app').innerHTML = `
    <button class="back" onclick="render('ranking')"><i data-lucide="arrow-left"></i> 랭킹으로</button>
    <div class="detail-head">
      <div><h1 style="font-size:24px">${it.name}</h1><div class="cat">${it.category}</div></div>
      <span class="score" style="background:${scoreColor(it.score)};height:36px;font-size:16px;min-width:56px">${it.score}</span>
    </div>
    <div class="card" style="margin-bottom:var(--s4)">
      <div class="metric-row">
        <div class="metric"><div class="l">정부 계약단가(중앙값)</div><div class="v">${won(it.govPrice)}</div></div>
        <div class="metric"><div class="l">동급 시중가(중앙값)</div><div class="v">${won(it.retailPrice)}</div></div>
        <div class="metric"><div class="l">마진배수</div><div class="v" style="color:${mc.fg}">${it.margin}배</div></div>
        <div class="metric"><div class="l">경쟁 업체(하한)</div><div class="v">${it.competition}곳~</div></div>
        ${it.demand ? `<div class="metric"><div class="l">정부 구매액(1개월)</div><div class="v" style="color:var(--primary)">${wonShort(it.demand)}</div>
          <div class="cat">${it.demandCnt.toLocaleString()}건 · 수요기관 ${it.demandInst.toLocaleString()}곳</div></div>
        <div class="metric"><div class="l">업체당 수요(시장 매력)</div><div class="v" style="color:var(--success)">${wonShort(Math.round(it.demand / Math.max(it.competition, 1)))}</div>
          <div class="cat">수요 ÷ 경쟁업체</div></div>` : ''}
      </div>
    </div>
    <div class="card" style="margin-bottom:var(--s4);border-left:4px solid ${entryColor(it.entryType).fg}">
      <div class="h2"><i data-lucide="${it.entryType === '개방형' ? 'door-open' : 'lock'}"></i> 진입 가능성: <span style="color:${entryColor(it.entryType).fg}">${it.entryType}</span> <span class="cat">(중소기업자간 경쟁제품 비율 ${it.smeRatio}%)</span></div>
      <div class="cat">${it.entryType === '개방형'
        ? '일반 제조·수입사도 진입 가능한 개방 시장입니다. 마진이 실제 기회로 이어질 수 있습니다.'
        : it.entryType === '혼합'
          ? '일부 품목이 중소기업자간 경쟁제품으로 지정돼 진입에 제약이 있습니다.'
          : '대부분 중소기업자간 경쟁제품으로, 중소기업 직접생산자만 납품 가능합니다. 수입·유통사는 직접 진입이 어렵습니다.'}</div>
    </div>
    ${it.mlPrice ? `<div class="card" style="margin-bottom:var(--s4)">
      <div class="h2"><i data-lucide="cpu"></i> AI 가격 예측 · 이상탐지 <span class="cat">(HistGBM+RF 앙상블, R²=0.94)</span></div>
      <div class="metric-row">
        <div class="metric"><div class="l">AI 예측 적정가</div><div class="v" style="color:var(--primary)">${won(it.mlPrice)}</div>
          <div class="cat">제품 특성 기반 예측</div></div>
        <div class="metric"><div class="l">AI 기준 가격편차</div><div class="v" style="color:${it.overpayPct >= 30 ? 'var(--danger)' : it.overpayPct <= -10 ? 'var(--success)' : 'var(--text-2)'}">${it.overpayPct > 0 ? '+' : ''}${it.overpayPct}%</div>
          <div class="cat">정부단가 vs AI예측가</div></div>
        <div class="metric"><div class="l">시장 군집(KMeans)</div><div class="v" style="font-size:17px;color:${entryColor(it.cluster === '블루오션 후보' ? '개방형' : it.cluster === '진입제한 시장' ? '중기경쟁 제한' : '혼합').fg}">${it.cluster || '-'}</div>
          <div class="cat">비지도 세분화</div></div>
        <div class="metric"><div class="l">이상 거래 탐지</div><div class="v" style="font-size:17px;color:${it.anomaly ? 'var(--danger)' : 'var(--text-2)'}">${it.anomaly ? '이상치' : '정상'}</div>
          <div class="cat">IsolationForest</div></div>
      </div>
    </div>` : ''}
    ${priceChart(it)}
    <div class="detail-grid">
      <div class="card"><div class="h2"><i data-lucide="building-2"></i> 경쟁 업체 (${it.corps.length}곳, 단가순)</div>
        <ul class="corp-list">${corps}</ul></div>
      <div class="card"><div class="h2"><i data-lucide="ruler"></i> 정부 납품 규격 샘플</div>
        <div class="cat" style="margin-bottom:8px">규격서 항목 클릭 시 조달청 종합쇼핑몰의 실제 규격서 문서가 열립니다.</div>${specs}
        ${imgs ? `<div class="h2" style="margin-top:16px"><i data-lucide="image"></i> 상품 이미지</div><div class="imgs">${imgs}</div>` : ''}
      </div>
    </div>`;
}

function renderLookup() {
  $('#app').innerHTML = `
    <div class="banner"><div class="big">내 제품, 공공조달에선 얼마에 팔릴까?</div>
      <div class="small">제품 카테고리를 입력하면 정부 구매단가·마진·경쟁 강도를 진단합니다. (현재 분석된 ${DATA.items.length}개 품목 기준)</div></div>
    <div class="search-box">
      <input id="q" placeholder="예: 책상, 의자, 청소기, 공기청정기…" autocomplete="off">
      <button onclick="doLookup()"><i data-lucide="search"></i> 진단</button>
    </div>
    <div id="result"></div>`;
  const inp = $('#q');
  inp.onkeydown = e => { if (e.key === 'Enter') doLookup(); };
  inp.focus();
}

function doLookup() {
  const q = $('#q').value.trim();
  const hits = q ? DATA.items.filter(i => i.name.includes(q) || i.category.includes(q)) : [];
  if (!hits.length) { $('#result').innerHTML = `<div class="empty">「${q}」 관련 품목을 찾지 못했습니다. 다른 키워드로 시도해 보세요.</div>`; return; }
  $('#result').innerHTML = hits.map(it => {
    const mc = marginColor(it.margin);
    const ec = entryColor(it.entryType);
    // 진입 막힌 시장은 마진과 무관하게 신중
    const verdict = it.entryType === '중기경쟁 제한'
      ? { t: '진입 제한 — 중소기업 직접생산만 (수입·유통사 어려움)', c: 'var(--text-muted)' }
      : it.margin >= 1.5 ? { t: '진입 유망 — 개방 시장 + 고마진', c: 'var(--success)' }
        : it.margin >= 1.0 ? { t: '검토 — 개방 시장, 마진 여유 보통', c: 'var(--warning)' }
          : { t: '신중 — 정부가가 시중보다 낮음', c: 'var(--text-muted)' };
    return `<div class="card lookup-hit" data-name="${encodeURIComponent(it.name)}" style="margin-bottom:var(--s3);cursor:pointer">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div class="pname" style="font-size:16px">${it.name}
          <span class="entry-pill" style="background:${ec.bg};color:${ec.fg};margin-left:6px">${it.entryType}</span></div>
          <div style="color:${verdict.c};font-weight:600;font-size:13px;margin-top:4px">${verdict.t}</div></div>
        <div style="text-align:right">
          <span class="margin-pill" style="background:${mc.bg};color:${mc.fg};font-size:15px">${it.margin}배</span>
          <div class="cat" style="margin-top:4px">${it.demand ? '수요 ' + wonShort(it.demand) + ' · ' : ''}경쟁 ${it.competition}곳~</div>
        </div></div></div>`;
  }).join('');
  $('#result').querySelectorAll('.lookup-hit').forEach(el =>
    el.onclick = () => render('detail', decodeURIComponent(el.dataset.name)));
  if (window.lucide) lucide.createIcons();
}

document.querySelectorAll('.tab').forEach(t => t.onclick = () => render(t.dataset.view));

let curView = 'ranking';
const _origRender = render;
render = (v, a) => { if (v === 'ranking' || v === 'lookup') curView = v; _origRender(v, a); };

function applyData(d) {
  DATA = d;
  $('#disclaimer').textContent = (d.updated ? `최종 갱신 ${d.updated} · ` : '') + d.disclaimer;
}

fetch('data.json').then(r => r.json()).then(d => {
  applyData(d); render('ranking');
}).catch(e => { $('#app').innerHTML = `<div class="empty">data.json 로드 실패: ${e}</div>`; });

// 자동 갱신: 5분마다 data.json 재조회, 갱신시각이 바뀌면 현재 화면 재렌더(실시간 반영)
setInterval(() => {
  fetch('data.json?t=' + Date.now()).then(r => r.json()).then(d => {
    if (d.updated && DATA && d.updated !== DATA.updated) { applyData(d); render(curView); }
  }).catch(() => {});
}, 300000);
