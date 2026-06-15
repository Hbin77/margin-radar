const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  const consoleWarnings = [];

  // ── 1. Desktop 1280px ──────────────────────────────────────────────
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const desktop = await desktopCtx.newPage();

  desktop.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push('[DESKTOP] ' + msg.text());
    if (msg.type() === 'warning') consoleWarnings.push('[DESKTOP] ' + msg.text());
  });
  desktop.on('pageerror', err => consoleErrors.push('[DESKTOP PAGE ERROR] ' + err.message));

  await desktop.goto('http://127.0.0.1:8791/', { waitUntil: 'networkidle', timeout: 30000 });
  await desktop.waitForTimeout(2000); // let charts render

  // 1-a) Full page screenshot
  await desktop.screenshot({ path: '/tmp/qa-01-desktop-full.png', fullPage: true });
  console.log('SCREENSHOT: /tmp/qa-01-desktop-full.png');

  // 1-b) Sidebar check
  const sidebar = await desktop.$('aside, nav, [class*="sidebar"], [class*="Sidebar"]');
  console.log('SIDEBAR ELEMENT FOUND:', !!sidebar);

  // 1-c) Check sidebar text content
  const bodyText = await desktop.textContent('body');
  console.log('HAS "Margin Radar":', bodyText.includes('Margin Radar'));
  console.log('HAS "블루오션":', bodyText.includes('블루오션'));
  console.log('HAS "역조회":', bodyText.includes('역조회'));

  // 2. Chart area screenshot (crop top viewport)
  await desktop.screenshot({ path: '/tmp/qa-02-desktop-viewport.png', fullPage: false });
  console.log('SCREENSHOT: /tmp/qa-02-desktop-viewport.png');

  // 2-a) Check chart containers
  const chartContainers = await desktop.$$('svg.recharts-surface, .recharts-wrapper, [class*="recharts"]');
  console.log('RECHARTS SVG COUNT:', chartContainers.length);

  // Check if charts have actual rendered content (paths, rects with fill)
  const chartContent = await desktop.evaluate(() => {
    const svgs = document.querySelectorAll('svg.recharts-surface');
    return Array.from(svgs).map((svg, i) => {
      const rects = svg.querySelectorAll('rect[fill]:not([fill="none"]):not([fill="transparent"])');
      const paths = svg.querySelectorAll('path[d]');
      const bb = svg.getBoundingClientRect();
      return {
        index: i,
        width: bb.width,
        height: bb.height,
        rectCount: rects.length,
        pathCount: paths.length,
        hasContent: rects.length > 0 || paths.length > 0
      };
    });
  });
  console.log('CHART CONTENT:', JSON.stringify(chartContent, null, 2));

  // 2-b) KPI cards
  const kpiCards = await desktop.$$('[class*="card"], [class*="Card"], [class*="kpi"], [class*="stat"]');
  console.log('KPI/CARD ELEMENTS:', kpiCards.length);

  // 3. Table check
  const tableRows = await desktop.$$('table tbody tr, [class*="table"] [class*="row"]');
  console.log('TABLE ROW COUNT:', tableRows.length);

  await desktop.screenshot({ path: '/tmp/qa-03-desktop-table.png', fullPage: true });

  // 4. Click sidebar navigation - reverse lookup
  const navLinks = await desktop.$$('a, button, [role="button"]');
  let clickedReverse = false;
  for (const link of navLinks) {
    const text = await link.textContent().catch(() => '');
    if (text.includes('역조회')) {
      await link.click();
      await desktop.waitForTimeout(1500);
      await desktop.screenshot({ path: '/tmp/qa-04-reverse-lookup.png', fullPage: true });
      console.log('SCREENSHOT: /tmp/qa-04-reverse-lookup.png');
      console.log('REVERSE LOOKUP PAGE TEXT SAMPLE:', (await desktop.textContent('body')).substring(0, 300));
      clickedReverse = true;
      break;
    }
  }
  if (!clickedReverse) console.log('REVERSE LOOKUP LINK: NOT FOUND');

  // Navigate back to main
  await desktop.goto('http://127.0.0.1:8791/', { waitUntil: 'networkidle', timeout: 30000 });
  await desktop.waitForTimeout(2000);

  // 5. Click table row for detail
  const rows = await desktop.$$('table tbody tr');
  if (rows.length > 0) {
    await rows[0].click();
    await desktop.waitForTimeout(1500);
    await desktop.screenshot({ path: '/tmp/qa-05-detail-view.png', fullPage: true });
    console.log('SCREENSHOT: /tmp/qa-05-detail-view.png');
    const detailText = await desktop.textContent('body');
    console.log('HAS DETAIL/AI CARD:', detailText.includes('AI') || detailText.includes('분석') || detailText.includes('차트'));
  } else {
    console.log('TABLE ROW CLICK: NO ROWS FOUND');
  }

  await desktopCtx.close();

  // ── 2. Mobile 375px ────────────────────────────────────────────────
  const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobile = await mobileCtx.newPage();

  mobile.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push('[MOBILE] ' + msg.text());
  });

  await mobile.goto('http://127.0.0.1:8791/', { waitUntil: 'networkidle', timeout: 30000 });
  await mobile.waitForTimeout(2000);

  await mobile.screenshot({ path: '/tmp/qa-06-mobile-full.png', fullPage: true });
  console.log('SCREENSHOT: /tmp/qa-06-mobile-full.png');

  // Check mobile layout
  const mobileSidebarVisible = await mobile.evaluate(() => {
    const sidebar = document.querySelector('aside, nav[class*="sidebar"], [class*="Sidebar"]');
    if (!sidebar) return false;
    const style = window.getComputedStyle(sidebar);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
  console.log('MOBILE SIDEBAR VISIBLE:', mobileSidebarVisible);

  // Check mobile top bar
  const mobileTopBar = await mobile.$('header, [class*="header"], [class*="topbar"], [class*="TopBar"], [class*="navbar"]');
  console.log('MOBILE TOP BAR ELEMENT:', !!mobileTopBar);

  // Check mobile chart rendering
  const mobileCharts = await mobile.$$('svg.recharts-surface, .recharts-wrapper');
  console.log('MOBILE RECHARTS COUNT:', mobileCharts.length);

  const mobileChartContent = await mobile.evaluate(() => {
    const svgs = document.querySelectorAll('svg.recharts-surface');
    return Array.from(svgs).map((svg, i) => {
      const bb = svg.getBoundingClientRect();
      const rects = svg.querySelectorAll('rect[fill]:not([fill="none"]):not([fill="transparent"])');
      return { index: i, width: Math.round(bb.width), height: Math.round(bb.height), rectCount: rects.length };
    });
  });
  console.log('MOBILE CHART CONTENT:', JSON.stringify(mobileChartContent));

  await mobileCtx.close();

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('\n=== CONSOLE ERRORS ===');
  if (consoleErrors.length === 0) {
    console.log('NONE');
  } else {
    consoleErrors.forEach(e => console.log(e));
  }

  console.log('\n=== CONSOLE WARNINGS (sample) ===');
  consoleWarnings.slice(0, 10).forEach(w => console.log(w));
  if (consoleWarnings.length > 10) console.log(`... and ${consoleWarnings.length - 10} more`);

  await browser.close();
})();
