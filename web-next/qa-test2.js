const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── Mobile 375px top section (clipped) ──────────────────────────────
  const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const mobile = await mobileCtx.newPage();
  await mobile.goto('http://127.0.0.1:8791/', { waitUntil: 'networkidle', timeout: 30000 });
  await mobile.waitForTimeout(2000);

  // Top 500px only
  await mobile.screenshot({ path: '/tmp/qa-07-mobile-top.png', clip: { x: 0, y: 0, width: 375, height: 500 }, fullPage: false });
  console.log('SCREENSHOT: /tmp/qa-07-mobile-top.png');

  // Chart section
  await mobile.screenshot({ path: '/tmp/qa-08-mobile-charts.png', clip: { x: 0, y: 120, width: 375, height: 500 }, fullPage: false });
  console.log('SCREENSHOT: /tmp/qa-08-mobile-charts.png');

  // Check mobile header structure
  const headerHTML = await mobile.evaluate(() => {
    const header = document.querySelector('header');
    return header ? header.outerHTML.substring(0, 800) : 'NO HEADER FOUND';
  });
  console.log('MOBILE HEADER HTML:', headerHTML);

  // Check if sidebar is hidden on mobile
  const sidebarInfo = await mobile.evaluate(() => {
    const selectors = ['aside', '[class*="sidebar"]', '[class*="Sidebar"]', 'nav'];
    const results = [];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const style = window.getComputedStyle(el);
        results.push({ sel, display: style.display, width: style.width, visibility: style.visibility });
      }
    }
    return results;
  });
  console.log('MOBILE SIDEBAR/NAV INFO:', JSON.stringify(sidebarInfo, null, 2));

  await mobileCtx.close();

  // ── Desktop: zoom in on chart row ─────────────────────────────────
  const desktopCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const desktop = await desktopCtx.newPage();
  await desktop.goto('http://127.0.0.1:8791/', { waitUntil: 'networkidle', timeout: 30000 });
  await desktop.waitForTimeout(2500);

  // Find chart section bounding box
  const chartBox = await desktop.evaluate(() => {
    // Look for the recharts wrapper or a container holding charts
    const wrappers = document.querySelectorAll('.recharts-wrapper');
    if (wrappers.length > 0) {
      const first = wrappers[0].getBoundingClientRect();
      const last = wrappers[wrappers.length - 1].getBoundingClientRect();
      return {
        x: 0,
        y: Math.max(0, first.top - 20),
        width: 1280,
        height: last.bottom - first.top + 60
      };
    }
    return null;
  });
  console.log('CHART BOX:', JSON.stringify(chartBox));

  if (chartBox && chartBox.height > 0) {
    await desktop.screenshot({
      path: '/tmp/qa-09-desktop-charts-zoom.png',
      clip: chartBox,
      fullPage: false
    });
    console.log('SCREENSHOT: /tmp/qa-09-desktop-charts-zoom.png');
  }

  // Detail view: click first row and capture
  const firstRow = await desktop.$('table tbody tr');
  if (firstRow) {
    await firstRow.click();
    await desktop.waitForTimeout(2000);
    await desktop.screenshot({ path: '/tmp/qa-10-detail-top.png', clip: { x: 0, y: 0, width: 1280, height: 800 }, fullPage: false });
    console.log('SCREENSHOT: /tmp/qa-10-detail-top.png');

    // Scroll to see price chart
    await desktop.evaluate(() => window.scrollBy(0, 400));
    await desktop.waitForTimeout(500);
    await desktop.screenshot({ path: '/tmp/qa-11-detail-chart.png', clip: { x: 0, y: 0, width: 1280, height: 800 }, fullPage: false });
    console.log('SCREENSHOT: /tmp/qa-11-detail-chart.png');

    // Check detail recharts
    const detailCharts = await desktop.evaluate(() => {
      const svgs = document.querySelectorAll('svg.recharts-surface');
      return Array.from(svgs).map((svg, i) => {
        const bb = svg.getBoundingClientRect();
        const rects = svg.querySelectorAll('rect[fill]:not([fill="none"]):not([fill="transparent"])');
        const paths = svg.querySelectorAll('path[d]');
        return { index: i, w: Math.round(bb.width), h: Math.round(bb.height), rects: rects.length, paths: paths.length };
      });
    });
    console.log('DETAIL CHARTS:', JSON.stringify(detailCharts, null, 2));
  }

  // Accessibility quick check - contrast + labels
  const a11yIssues = await desktop.evaluate(() => {
    const issues = [];
    // Check buttons/links without accessible labels
    document.querySelectorAll('button, a, [role="button"]').forEach(el => {
      const text = el.textContent.trim();
      const aria = el.getAttribute('aria-label');
      const title = el.getAttribute('title');
      if (!text && !aria && !title) {
        issues.push({ type: 'NO_LABEL', tag: el.tagName, class: el.className.substring(0, 60) });
      }
    });
    // Check images without alt
    document.querySelectorAll('img').forEach(img => {
      if (!img.getAttribute('alt') && img.getAttribute('alt') !== '') {
        issues.push({ type: 'IMG_NO_ALT', src: img.src.substring(0, 60) });
      }
    });
    return issues.slice(0, 20);
  });
  console.log('A11Y ISSUES:', JSON.stringify(a11yIssues, null, 2));

  await desktopCtx.close();
  await browser.close();
})();
