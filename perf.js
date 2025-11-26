new PerformanceObserver((list) => {
  const lcpEntry = list.getEntries().at(-1);
  if (!lcpEntry || !lcpEntry.url) return;

  const navEntry   = performance.getEntriesByType('navigation')[0];
  const resEntries = performance.getEntriesByType('resource');

  // find the resource that corresponds to the LCP
  const lcpResEntry = resEntries.filter((e) => e.name === lcpEntry.url)[0];

  // #1 — DOCUMENT TTFB
  const docTTFB = navEntry.responseStart;

  // #2 — RESOURCE LOAD DELAY
  const lcpRequestStart = Math.max(docTTFB, lcpResEntry ? lcpResEntry.requestStart : 0);

  // #3 — RESOURCE LOAD TIME
  const lcpResponseEnd = Math.max(lcpRequestStart, lcpResEntry ? lcpResEntry.responseEnd : 0);

  // #4 — ELEMENT RENDER DELAY
  const lcpRenderTime = Math.max(lcpResponseEnd, lcpEntry.startTime);

  console.log('LCP:', lcpRenderTime, lcpEntry.element);
  console.log('document_ttfb', docTTFB);
  console.log('resource_load_delay', lcpRequestStart - docTTFB);
  console.log('resource_load_time',  lcpResponseEnd - lcpRequestStart);
  console.log('element_render_delay', lcpRenderTime - lcpResponseEnd);

  // performance.measure() is only used to force a separate row in the Performance Panel
  performance.measure('document_ttfb', {
    start: 0,
    end: docTTFB
  });

  performance.measure('resource_load_delay', {
    start: docTTFB,
    end: lcpRequestStart - 0.01
  });

  performance.measure('resource_load_time', {
    start: lcpRequestStart,
    end: lcpResponseEnd
  });

  performance.measure('element_render_delay', {
    start: lcpResponseEnd - 0.01,
    end: lcpRenderTime
  });

}).observe({ type: 'largest-contentful-paint', buffered: true });