/*
  perfo.js — Performance Overlay

  Features:
  - LCP, FCP, CLS, INP, TTFB
  - Request count + total transfer weight
  - Color coding per Google thresholds
  - Draggable floating panel
  - Collapse / expand
  - Toggle with CTRL + SHIFT + P
*/

(function () {
  if (window.__perfOverlayLoaded) return;
  window.__perfOverlayLoaded = true;

  // ---------- UI HELPERS ----------
  function el(tag, styles = {}, text = "") {
    const e = document.createElement(tag);
    Object.assign(e.style, styles);
    if (text) e.textContent = text;
    return e;
  }

  function colorMetric(value, good, meh) {
    if (value <= good) return "#6EFF6E";       // green
    if (value <= meh) return "#FFD86E";        // yellow
    return "#FF6E6E";                          // red
  }

  // ---------- PANEL UI ----------
  const panel = el("div", {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    width: "260px",
    background: "rgba(0,0,0,0.85)",
    color: "#fff",
    padding: "14px",
    borderRadius: "10px",
    backdropFilter: "blur(10px)",
    boxShadow: "0 0 30px rgba(0,0,0,0.45)",
    fontFamily: "monospace",
    fontSize: "12px",
    zIndex: 999999999,
    userSelect: "none"
  });

  const header = el("div", {
    fontWeight: "bold",
    marginBottom: "8px",
    display: "flex",
    justifyContent: "space-between",
    cursor: "grab",
  }, "Performance Monitor");

  const toggleBtn = el("div", {
    fontWeight: "bold",
    cursor: "pointer",
    padding: "0 6px"
  }, "–");

  header.appendChild(toggleBtn);
  panel.appendChild(header);

  const body = el("div");

  body.innerHTML = `
    <div id="lcp">LCP: …</div>
    <div id="fcp">FCP: …</div>
    <div id="cls">CLS: …</div>
    <div id="inp">INP: …</div>
    <div id="ttfb">TTFB: …</div>
    <hr style="border:0;border-top:1px solid rgba(255,255,255,0.2);margin:8px 0;">
    <div id="req">Requests: …</div>
    <div id="size">Weight: …</div>
  `;

  panel.appendChild(body);
  document.body.appendChild(panel);

  const ui = {
    lcp: body.querySelector("#lcp"),
    fcp: body.querySelector("#fcp"),
    cls: body.querySelector("#cls"),
    inp: body.querySelector("#inp"),
    ttfb: body.querySelector("#ttfb"),
    req: body.querySelector("#req"),
    size: body.querySelector("#size"),
  };

  // ---------- COLLAPSE ----------
  let collapsed = false;
  toggleBtn.onclick = () => {
    collapsed = !collapsed;
    body.style.display = collapsed ? "none" : "block";
    toggleBtn.textContent = collapsed ? "+" : "–";
  };

  // ---------- DRAGGABLE ----------
  let drag = false;
  let offsetX, offsetY;

  header.addEventListener("mousedown", (e) => {
    drag = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;
    header.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!drag) return;
    panel.style.left = e.clientX - offsetX + "px";
    panel.style.top = e.clientY - offsetY + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  });

  document.addEventListener("mouseup", () => {
    drag = false;
    header.style.cursor = "grab";
  });

  // ---------- KEYBOARD TOGGLE ----------
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "p") {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    }
  });

  // ---------- FORMATTERS ----------
  function ms(v) {
    return v ? v.toFixed(0) + " ms" : "0 ms";
  }
  function kb(b) {
    return (b / 1024).toFixed(1) + " KB";
  }

  // ---------- TTFB ----------
  const nav = performance.getEntriesByType("navigation")[0];
  if (nav) {
    const ttfb = nav.responseStart;
    ui.ttfb.textContent = "TTFB: " + ms(ttfb);
    ui.ttfb.style.color = colorMetric(ttfb, 200, 600);
  }

  // ---------- RESOURCE STATS ----------
  function resourceStats() {
    const r = performance.getEntriesByType("resource");
    const count = r.length;
    const weight = r.reduce((a, x) => a + (x.transferSize || 0), 0);

    ui.req.textContent = "Requests: " + count;
    ui.size.textContent = "Weight: " + kb(weight);
  }

  window.addEventListener("load", () => setTimeout(resourceStats, 600));

  // ---------- LCP ----------
  new PerformanceObserver(list => {
    const last = list.getEntries().at(-1);
    if (!last) return;
    const v = last.startTime;
    ui.lcp.textContent = "LCP: " + ms(v);
    ui.lcp.style.color = colorMetric(v, 2500, 4000);
  }).observe({ type: "largest-contentful-paint", buffered: true });

  // ---------- FCP ----------
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      if (e.name === "first-contentful-paint") {
        const v = e.startTime;
        ui.fcp.textContent = "FCP: " + ms(v);
        ui.fcp.style.color = colorMetric(v, 1800, 3000);
      }
    }
  }).observe({ type: "paint", buffered: true });

  // ---------- CLS ----------
  let cls = 0;
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) {
      if (!e.hadRecentInput) cls += e.value;
    }
    ui.cls.textContent = "CLS: " + cls.toFixed(3);
    ui.cls.style.color = colorMetric(cls, 0.1, 0.25);
  }).observe({ type: "layout-shift", buffered: true });

  // ---------- INP ----------
  new PerformanceObserver(list => {
    const e = list.getEntries().at(-1);
    if (!e) return;
    const v = e.processingEnd - e.startTime;
    ui.inp.textContent = "INP: " + ms(v);
    ui.inp.style.color = colorMetric(v, 200, 500);
  }).observe({ type: "event", durationThreshold: 40, buffered: true });

})();