(() => {
  "use strict";

  if (window.__rumLoaded) return;
  window.__rumLoaded = true;

  const script =
    document.currentScript || document.querySelector('script[src*="/rum.js"]');
  if (!script || !script.src) return;

  const endpoint = new URL("/collect", script.src).href;
  const MAX_EVENTS_PER_BATCH = 20;
  // The server rejects bodies over 8 KB.
  const MAX_BATCH_BYTES = 7000;
  const MAX_ERRORS_PER_PAGE = 50;
  const MAX_TEXT_LENGTH = 300;
  const FLUSH_DELAY_MS = 2000;
  const CONNECTIONS = ["slow-2g", "2g", "3g", "4g"];
  const CLS_GAP_MS = 1000;
  const CLS_WINDOW_MS = 5000;

  const originalFetch =
    typeof window.fetch === "function" ? window.fetch.bind(window) : null;
  const encoder = new TextEncoder();
  const context = {
    sessionId: getSessionId(),
    device: getDevice(),
    os: getOs(),
    connection: getConnection(),
  };

  let queue = [];
  let flushTimer = 0;
  let errorCount = 0;
  let viewPath = location.pathname;
  let spaNavStart = 0;
  let spaStartRender = null;
  let lcp = null;
  let inp = null;
  let clsWindow = 0;
  let clsWindowStart = 0;
  let clsLastShift = 0;
  let cls = 0;
  let sentPageLoad = false;
  let sentLcp = null;
  let sentInp = null;
  let sentCls = null;
  const observers = [];

  function getSessionId() {
    const key = "rum_sid";
    try {
      let id = sessionStorage.getItem(key);
      if (!id) {
        id = randomId();
        sessionStorage.setItem(key, id);
      }
      return id;
    } catch {
      return randomId();
    }
  }

  function randomId() {
    if (window.crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }

  function getDevice() {
    if (!matchMedia("(pointer: coarse)").matches) return "desktop";
    return Math.min(screen.width, screen.height) < 600 ? "mobile" : "tablet";
  }

  function getOs() {
    const ua = navigator.userAgent;
    const source =
      (navigator.userAgentData && navigator.userAgentData.platform) || ua;
    if (
      /iPhone|iPad|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    ) {
      return "iOS";
    }
    if (/Android/i.test(source)) return "Android";
    if (/CrOS|Chrome OS|Chromium OS/i.test(source)) return "ChromeOS";
    if (/Win/i.test(source)) return "Windows";
    if (/Mac/i.test(source)) return "macOS";
    if (/Linux/i.test(source)) return "Linux";
    return "Other";
  }

  function getConnection() {
    const type = navigator.connection && navigator.connection.effectiveType;
    return CONNECTIONS.includes(type) ? type : "unknown";
  }

  function truncate(value) {
    const text = String(value || "").trim();
    return text.length > MAX_TEXT_LENGTH
      ? text.slice(0, MAX_TEXT_LENGTH)
      : text;
  }

  function stripQuery(url) {
    return String(url).replace(/[?#][^\s]*?(?=(:\d+){1,2}$|$)/, "");
  }

  function clsThousandths() {
    return Math.round(cls * 1000);
  }

  function push(event) {
    queue.push(
      Object.assign(
        {
          path: event.path || viewPath,
          lang: document.documentElement.lang || null,
        },
        event,
      ),
    );
    if (queue.length >= MAX_EVENTS_PER_BATCH) {
      flush();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flush, FLUSH_DELAY_MS);
    }
  }

  function flush() {
    clearTimeout(flushTimer);
    flushTimer = 0;

    let batch = [];
    let bytes = 0;
    for (const event of queue) {
      const size = encoder.encode(JSON.stringify(event)).length + 1;
      if (
        batch.length &&
        (batch.length >= MAX_EVENTS_PER_BATCH || bytes + size > MAX_BATCH_BYTES)
      ) {
        send(batch);
        batch = [];
        bytes = 0;
      }
      batch.push(event);
      bytes += size;
    }
    if (batch.length) send(batch);
    queue = [];
  }

  function send(events) {
    const body = JSON.stringify(Object.assign({ events }, context));
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) return;
    } catch {
      // Fall through to fetch.
    }
    if (originalFetch) {
      originalFetch(endpoint, {
        method: "POST",
        body,
        keepalive: true,
        mode: "no-cors",
        credentials: "omit",
      }).catch(() => {});
    }
  }

  function rememberSentVitals() {
    sentLcp = lcp;
    sentInp = inp;
    sentCls = clsThousandths();
  }

  function vitalsChanged() {
    return (
      (lcp !== null && lcp !== sentLcp) ||
      (inp !== null && inp !== sentInp) ||
      (cls > 0 && clsThousandths() !== sentCls)
    );
  }

  function vitalsPayload() {
    const payload = { type: "timing", path: viewPath };
    if (lcp !== null) payload.lcp = lcp;
    if (inp !== null) payload.inp = inp;
    if (cls > 0 || sentCls !== null) payload.cls = clsThousandths();
    return payload;
  }

  function flushVitals() {
    if (!vitalsChanged()) return;
    const payload = vitalsPayload();
    if (
      payload.lcp == null &&
      payload.inp == null &&
      payload.cls == null
    ) {
      return;
    }
    push(payload);
    rememberSentVitals();
  }

  function resetView() {
    errorCount = 0;
    lcp = null;
    inp = null;
    clsWindow = 0;
    clsWindowStart = 0;
    clsLastShift = 0;
    cls = 0;
    spaStartRender = null;
    sentPageLoad = false;
    sentLcp = null;
    sentInp = null;
    sentCls = null;
    restartObservers(false);
  }

  // Timing

  function duration(end, start) {
    return end > 0 ? Math.max(0, Math.round(end - start)) : null;
  }

  function reportNavigationTiming() {
    const nav =
      performance.getEntriesByType &&
      performance.getEntriesByType("navigation")[0];
    if (!nav) return;

    const paints = performance.getEntriesByType("paint");
    const paint =
      paints.find((entry) => entry.name === "first-paint") ||
      paints.find((entry) => entry.name === "first-contentful-paint");

    const timing = {
      type: "timing",
      path: viewPath,
      pageLoad: duration(nav.loadEventEnd, nav.fetchStart),
      ttfb: duration(nav.responseStart, nav.requestStart),
      startRender: paint ? duration(paint.startTime, 0) : null,
    };
    if (lcp !== null) timing.lcp = lcp;
    if (inp !== null) timing.inp = inp;
    if (cls > 0) timing.cls = clsThousandths();
    if (
      timing.pageLoad !== null ||
      timing.ttfb !== null ||
      timing.startRender !== null ||
      timing.lcp != null ||
      timing.inp != null ||
      timing.cls != null
    ) {
      push(timing);
      sentPageLoad = true;
      rememberSentVitals();
    }
  }

  function reportSpaTiming() {
    const pageLoad = lcp !== null ? lcp : spaStartRender;
    const timing = {
      type: "timing",
      path: viewPath,
      pageLoad,
      startRender: spaStartRender,
    };
    if (lcp !== null) timing.lcp = lcp;
    if (inp !== null) timing.inp = inp;
    if (cls > 0) timing.cls = clsThousandths();
    if (pageLoad === null && spaStartRender === null && lcp === null) return;
    push(timing);
    sentPageLoad = true;
    rememberSentVitals();
  }

  function onClientNavigate() {
    const next = location.pathname;
    if (next === viewPath) return;
    flushVitals();
    viewPath = next;
    spaNavStart = performance.now();
    resetView();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (location.pathname !== viewPath) return;
        spaStartRender = Math.round(performance.now() - spaNavStart);
        reportSpaTiming();
      });
    });
  }

  function wrapHistory(method) {
    const original = history[method];
    if (typeof original !== "function") return;
    history[method] = function historyMethod() {
      const result = original.apply(this, arguments);
      onClientNavigate();
      return result;
    };
  }

  wrapHistory("pushState");
  wrapHistory("replaceState");
  addEventListener("popstate", onClientNavigate);
  if (
    window.navigation &&
    typeof window.navigation.addEventListener === "function"
  ) {
    window.navigation.addEventListener("navigate", (event) => {
      if (event.navigationType === "reload") return;
      queueMicrotask(onClientNavigate);
    });
  }

  if (document.readyState === "complete") {
    setTimeout(reportNavigationTiming, 0);
  } else {
    addEventListener("load", () => setTimeout(reportNavigationTiming, 0), {
      once: true,
    });
  }

  // Web vitals

  function observe(type, callback, options) {
    if (typeof PerformanceObserver !== "function") return null;
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });
      observer.observe(Object.assign({ type, buffered: true }, options || {}));
      observers.push(observer);
      return observer;
    } catch {
      return null;
    }
  }

  function stopObservers() {
    while (observers.length) {
      const observer = observers.pop();
      try {
        observer.disconnect();
      } catch {
        // Ignore.
      }
    }
  }

  function onLcp(entry) {
    const start =
      spaNavStart > 0
        ? Math.max(0, Math.round(entry.startTime - spaNavStart))
        : Math.round(entry.startTime);
    if (start >= 0) lcp = start;
  }

  function onEventTiming(entry) {
    if (typeof entry.duration !== "number") return;
    const value = Math.round(entry.duration);
    if (inp === null || value > inp) inp = value;
  }

  function onLayoutShift(entry) {
    if (entry.hadRecentInput || typeof entry.value !== "number") return;
    const at = entry.startTime;
    if (
      clsWindow === 0 ||
      at - clsLastShift > CLS_GAP_MS ||
      at - clsWindowStart > CLS_WINDOW_MS
    ) {
      clsWindow = 0;
      clsWindowStart = at;
    }
    clsWindow += entry.value;
    clsLastShift = at;
    if (clsWindow > cls) cls = clsWindow;
  }

  function restartObservers(buffered) {
    stopObservers();
    observe("largest-contentful-paint", onLcp, { buffered });
    observe("layout-shift", onLayoutShift, { buffered });
    if (
      !observe("event", onEventTiming, {
        buffered,
        durationThreshold: 40,
      })
    ) {
      observe("event", onEventTiming, { buffered });
    }
  }

  restartObservers(true);

  // JavaScript errors

  function sourceFromStack(stack) {
    const match = /(https?:\/\/[^\s)]+:\d+:\d+)/.exec(String(stack || ""));
    return match ? stripQuery(match[1]) : null;
  }

  function reportError(message, source) {
    if (errorCount >= MAX_ERRORS_PER_PAGE) return;
    errorCount += 1;
    push({
      type: "js_error",
      message: truncate(message) || "Unknown error",
      source: source ? truncate(source) : null,
    });
  }

  addEventListener("error", (event) => {
    if (!(event instanceof ErrorEvent)) return;
    const source = event.filename
      ? `${stripQuery(event.filename)}:${event.lineno}:${event.colno}`
      : sourceFromStack(event.error && event.error.stack);
    reportError(event.message || (event.error && event.error.message), source);
  });

  addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? `${reason.name}: ${reason.message}`
        : `Unhandled rejection: ${reason}`;
    reportError(message, sourceFromStack(reason && reason.stack));
  });

  // Network errors

  function reportNetwork(method, rawUrl, status) {
    let url;
    try {
      url = new URL(rawUrl, location.href);
    } catch {
      return;
    }
    if (url.href.startsWith(endpoint) || !/^https?:$/.test(url.protocol))
      return;
    if (errorCount >= MAX_ERRORS_PER_PAGE) return;
    errorCount += 1;

    const upper = String(method || "GET").toUpperCase();
    push({
      type: "network_error",
      method: /^[A-Z]{1,10}$/.test(upper) ? upper : "OTHER",
      url: truncate(url.host + url.pathname),
      status: status >= 400 && status <= 599 ? status : 0,
    });
  }

  if (originalFetch) {
    window.fetch = function fetch(input, init) {
      const request = input instanceof Request ? input : null;
      const method =
        (init && init.method) || (request ? request.method : "GET");
      const url = request ? request.url : String(input);

      return originalFetch(input, init).then(
        (response) => {
          if (response.status >= 400)
            reportNetwork(method, url, response.status);
          return response;
        },
        (error) => {
          if (!error || error.name !== "AbortError")
            reportNetwork(method, url, 0);
          throw error;
        },
      );
    };
  }

  if (window.XMLHttpRequest) {
    const requests = new WeakMap();
    const { open, send: sendXhr } = XMLHttpRequest.prototype;

    XMLHttpRequest.prototype.open = function (method, url) {
      requests.set(this, { method, url: String(url), aborted: false });
      return open.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
      const info = requests.get(this);
      if (info) {
        this.addEventListener("abort", () => {
          info.aborted = true;
        });
        this.addEventListener("loadend", () => {
          if (!info.aborted && (this.status === 0 || this.status >= 400)) {
            reportNetwork(info.method, info.url, this.status);
          }
        });
      }
      return sendXhr.apply(this, arguments);
    };
  }

  // Crashed sessions and delivery on exit

  addEventListener("pagehide", () => {
    if (document.readyState !== "complete") push({ type: "crash" });
    flushVitals();
    flush();
  });

  addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushVitals();
      flush();
    }
  });
})();
