const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];

  // Desktop 상세 뷰 — 가격 차트 렌더 검증
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning' && msg.text().includes('recharts')) consoleErrors.push('[WARN] ' + msg.text());
  });
  page.on('pageerror', err => consoleErrors.push('[PAGE ERR] ' + err.message));

  await page.goto('http://127.0.0.1:8791/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Click first row
  const firstRow = await page.$('table tbody tr');
  if (firstRow) {
    await firstRow.click();
    await page.waitForTimeout(2500); // wait for detail + charts to render

    // Full detail page screenshot
    await page.screenshot({ path: '/tmp/qa-12-detail-full.png', fullPage: true });
    console.log('SCREENSHOT: /tmp/qa-12-detail-full.png');

    // Detailed chart analysis
    const chartAnalysis = await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg.recharts-surface');
      return Array.from(svgs).map((svg, i) => {
        const bb = svg.getBoundingClientRect();
        const rects = svg.querySelectorAll('rect[fill]:not([fill="none"]):not([fill="transparent"])');
        const paths = svg.querySelectorAll('path[d]');
        const circles = svg.querySelectorAll('circle[fill]:not([fill="none"])');
        const lines = svg.querySelectorAll('line');
        const parent = svg.parentElement;
        const parentBB = parent ? parent.getBoundingClientRect() : null;
        return {
          index: i,
          svgW: Math.round(bb.width),
          svgH: Math.round(bb.height),
          parentW: parentBB ? Math.round(parentBB.width) : null,
          parentH: parentBB ? Math.round(parentBB.height) : null,
          rects: rects.length,
          paths: paths.length,
          circles: circles.length,
          lines: lines.length,
          isVisible: bb.width > 0 && bb.height > 0
        };
      });
    });
    console.log('DETAIL ALL CHARTS:', JSON.stringify(chartAnalysis, null, 2));

    // Check specifically for the price scatter chart container
    const priceChartInfo = await page.evaluate(() => {
      // Look for recharts-wrapper divs and their sizes
      const wrappers = document.querySelectorAll('.recharts-wrapper');
      return Array.from(wrappers).map((w, i) => {
        const bb = w.getBoundingClientRect();
        const svg = w.querySelector('svg');
        const svgBB = svg ? svg.getBoundingClientRect() : null;
        return {
          i,
          wrapperW: Math.round(bb.width),
          wrapperH: Math.round(bb.height),
          svgW: svgBB ? Math.round(svgBB.width) : null,
          svgH: svgBB ? Math.round(svgBB.height) : null,
          inViewport: bb.top < window.innerHeight && bb.bottom > 0
        };
      });
    });
    console.log('RECHARTS WRAPPERS IN DETAIL:', JSON.stringify(priceChartInfo, null, 2));
  }

  // Y축 레이블 잘림 확인 (카테고리 가로 막대 차트)
  await page.goto('http://127.0.0.1:8791/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);

  const yAxisClip = await page.evaluate(() => {
    // Check YAxis labels in the horizontal bar chart (category distribution)
    const yAxisTexts = document.querySelectorAll('.recharts-yAxis text, .recharts-cartesian-axis-tick text');
    return Array.from(yAxisTexts).map(t => {
      const bb = t.getBoundingClientRect();
      return { text: t.textContent, x: Math.round(bb.x), width: Math.round(bb.width), clipped: bb.x < 0 };
    });
  });
  console.log('Y-AXIS LABELS:', JSON.stringify(yAxisClip, null, 2));

  // Check Y-axis on bar chart — are numbers truncated?
  const barChartYAxis = await page.evaluate(() => {
    const yAxes = document.querySelectorAll('.recharts-yAxis');
    return Array.from(yAxes).map((axis, i) => {
      const bb = axis.getBoundingClientRect();
      const texts = axis.querySelectorAll('text');
      return {
        index: i,
        x: Math.round(bb.x),
        width: Math.round(bb.width),
        clipped: bb.x < 0,
        labels: Array.from(texts).map(t => t.textContent)
      };
    });
  });
  console.log('BAR CHART Y-AXES:', JSON.stringify(barChartYAxis, null, 2));

  // Mobile 375px — check chart stacking
  await ctx.close();
  const mCtx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const mPage = await mCtx.newPage();
  await mPage.goto('http://127.0.0.1:8791/', { waitUntil: 'networkidle', timeout: 30000 });
  await mPage.waitForTimeout(2000);

  // Scroll down to see chart area
  await mPage.evaluate(() => window.scrollTo(0, 300));
  await mPage.waitForTimeout(500);
  await mPage.screenshot({ path: '/tmp/qa-13-mobile-charts-scroll.png', fullPage: false });
  console.log('SCREENSHOT: /tmp/qa-13-mobile-charts-scroll.png');

  // Check if charts stack vertically (each chart width should be ~375px)
  const mobileChartLayout = await mPage.evaluate(() => {
    const wrappers = document.querySelectorAll('.recharts-wrapper');
    return Array.from(wrappers).map((w, i) => {
      const bb = w.getBoundingClientRect();
      return { i, left: Math.round(bb.left), top: Math.round(bb.top), width: Math.round(bb.width) };
    });
  });
  console.log('MOBILE CHART LAYOUT (stacked check):', JSON.stringify(mobileChartLayout, null, 2));

  await mCtx.close();

  console.log('\n=== CONSOLE ERRORS ===');
  if (consoleErrors.length === 0) {
    console.log('NONE');
  } else {
    consoleErrors.forEach(e => console.log(e));
  }

  await browser.close();
})();
