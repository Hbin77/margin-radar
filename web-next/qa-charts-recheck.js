const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const consoleWarnings = [];

  // ── Desktop 1280px ─────────────────────────────────────────────────
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const desktop = await desktopCtx.newPage();

  desktop.on('console', msg => {
    if (msg.type() === 'warning' && msg.text().includes('width')) {
      consoleWarnings.push(msg.text().split('\n')[0]);
    }
  });

  // Hard reload: disable cache
  await desktop.goto('http://127.0.0.1:8791/', {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await desktop.evaluate(() => location.reload(true));
  await desktop.waitForLoadState('networkidle');
  await desktop.waitForTimeout(3000); // charts settle

  // Chart bounding box
  const chartBox = await desktop.evaluate(() => {
    const wrappers = document.querySelectorAll('.recharts-wrapper');
    if (wrappers.length === 0) return null;
    const first = wrappers[0].getBoundingClientRect();
    const last  = wrappers[wrappers.length - 1].getBoundingClientRect();
    return {
      x: 220, // skip sidebar
      y: Math.max(0, first.top - 40),
      width: 1060,
      height: last.bottom - first.top + 60,
    };
  });
  console.log('CHART BOX:', JSON.stringify(chartBox));

  if (chartBox && chartBox.height > 0) {
    await desktop.screenshot({
      path: '/tmp/qa-charts-desktop.png',
      clip: chartBox,
      fullPage: false,
    });
    console.log('SCREENSHOT: /tmp/qa-charts-desktop.png');
  } else {
    // Fallback: full viewport
    await desktop.screenshot({ path: '/tmp/qa-charts-desktop.png', fullPage: false });
    console.log('SCREENSHOT (fallback): /tmp/qa-charts-desktop.png');
  }

  // Detailed per-chart analysis
  const chartData = await desktop.evaluate(() => {
    const wrappers = document.querySelectorAll('.recharts-wrapper');
    return Array.from(wrappers).map((w, i) => {
      const svg = w.querySelector('svg.recharts-surface');
      const bb  = w.getBoundingClientRect();

      // Y-axis labels
      const yLabels = Array.from(w.querySelectorAll('.recharts-yAxis text')).map(t => t.textContent.trim());
      // X-axis labels
      const xLabels = Array.from(w.querySelectorAll('.recharts-xAxis text')).map(t => t.textContent.trim());
      // Bar rects with fill
      const bars = w.querySelectorAll('rect.recharts-rectangle[fill]:not([fill="none"]):not([fill="transparent"]):not([fill="rgba(0,0,0,0)"])');
      // Donut / pie sectors
      const sectors = w.querySelectorAll('.recharts-pie-sector path, path.recharts-sector');
      // Center label (donut)
      const centerLabel = w.querySelector('.recharts-label, text.recharts-text');
      // All text inside svg for center % detection
      const allTexts = Array.from(w.querySelectorAll('text')).map(t => t.textContent.trim()).filter(Boolean);
      // Y-axis width
      const yAxis = w.querySelector('.recharts-yAxis');
      const yAxisBB = yAxis ? yAxis.getBoundingClientRect() : null;
      // Check Y-axis clip
      const yAxisClipped = yAxisBB ? yAxisBB.x < (bb.x + 5) : null;

      return {
        index: i,
        wrapperW: Math.round(bb.width),
        wrapperH: Math.round(bb.height),
        barCount: bars.length,
        sectorCount: sectors.length,
        yLabels,
        xLabels: xLabels.slice(0, 10),
        allTexts: allTexts.slice(0, 20),
        yAxisW: yAxisBB ? Math.round(yAxisBB.width) : null,
        yAxisClipped,
      };
    });
  });

  console.log('\n=== CHART ANALYSIS ===');
  chartData.forEach((c, i) => {
    console.log(`\n-- Chart ${i + 1} --`);
    console.log('  Size:', c.wrapperW, 'x', c.wrapperH);
    console.log('  Bars:', c.barCount, '| Sectors:', c.sectorCount);
    console.log('  Y-axis labels:', JSON.stringify(c.yLabels));
    console.log('  X-axis labels:', JSON.stringify(c.xLabels));
    console.log('  All texts in chart:', JSON.stringify(c.allTexts));
    console.log('  Y-axis width:', c.yAxisW, '| clipped:', c.yAxisClipped);
  });

  await desktopCtx.close();

  // ── Mobile 375px ───────────────────────────────────────────────────
  const mobileCtx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
  });
  const mobile = await mobileCtx.newPage();
  await mobile.goto('http://127.0.0.1:8791/', { waitUntil: 'networkidle', timeout: 30000 });
  await mobile.evaluate(() => location.reload(true));
  await mobile.waitForLoadState('networkidle');
  await mobile.waitForTimeout(3000);

  // Scroll to chart area (past KPI cards)
  await mobile.evaluate(() => window.scrollTo(0, 370));
  await mobile.waitForTimeout(400);

  await mobile.screenshot({ path: '/tmp/qa-charts-mobile.png', fullPage: false });
  console.log('\nSCREENSHOT: /tmp/qa-charts-mobile.png');

  const mobileChartData = await mobile.evaluate(() => {
    const wrappers = document.querySelectorAll('.recharts-wrapper');
    return Array.from(wrappers).map((w, i) => {
      const bb = w.getBoundingClientRect();
      const bars    = w.querySelectorAll('rect.recharts-rectangle[fill]:not([fill="none"])');
      const sectors = w.querySelectorAll('.recharts-pie-sector path, path.recharts-sector');
      const yLabels = Array.from(w.querySelectorAll('.recharts-yAxis text')).map(t => t.textContent.trim());
      const xLabels = Array.from(w.querySelectorAll('.recharts-xAxis text')).map(t => t.textContent.trim());
      const yAxis   = w.querySelector('.recharts-yAxis');
      const yBB     = yAxis ? yAxis.getBoundingClientRect() : null;
      return {
        index: i,
        top: Math.round(bb.top),
        width: Math.round(bb.width),
        bars: bars.length,
        sectors: sectors.length,
        yLabels,
        xLabels: xLabels.slice(0, 8),
        yAxisX: yBB ? Math.round(yBB.x) : null,
        yAxisClipped: yBB ? yBB.x < 0 : null,
      };
    });
  });

  console.log('\n=== MOBILE CHART ANALYSIS ===');
  mobileChartData.forEach(c => {
    console.log(`\n-- Mobile Chart ${c.index + 1} --`);
    console.log('  top:', c.top, '| width:', c.width);
    console.log('  Bars:', c.bars, '| Sectors:', c.sectors);
    console.log('  Y-axis labels:', JSON.stringify(c.yLabels));
    console.log('  X-axis labels:', JSON.stringify(c.xLabels));
    console.log('  Y-axis x:', c.yAxisX, '| clipped:', c.yAxisClipped);
  });

  await mobileCtx.close();

  console.log('\n=== RECHARTS WIDTH WARNINGS ===');
  if (consoleWarnings.length === 0) {
    console.log('NONE');
  } else {
    console.log(`COUNT: ${consoleWarnings.length}`);
    consoleWarnings.slice(0, 3).forEach(w => console.log(' ', w));
  }

  await browser.close();
})();
