import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const rootEl = document.getElementById("root");

if (rootEl?.firstElementChild && typeof performance !== "undefined") {
  window.__PRERENDERED_SHELL__ = true;
  const fcpEntry = performance.getEntriesByName?.("first-contentful-paint")?.[0];
  if (fcpEntry && fcpEntry.startTime > 0) {
    const elapsedSec = Math.max(0, (performance.now() - fcpEntry.startTime) / 1000);
    document.documentElement.style.setProperty("--hero-offset", `-${elapsedSec.toFixed(3)}s`);
  }
}

function mountApp() {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Statik kabukta LCP banner görseli varsa, ilk boyama karesi tamamlandıktan
// hemen sonra React'i mount et (en fazla 200 ms bekleme sınırı).
if (window.__PRERENDERED_SHELL__ && !window.location.hash) {
  let mounted = false;
  const startMount = () => {
    if (mounted) return;
    mounted = true;
    window.requestAnimationFrame(() => window.setTimeout(mountApp, 0));
  };
  const lcpImg = rootEl.querySelector('img[fetchpriority="high"]');
  if (lcpImg && !lcpImg.complete) {
    const cap = window.setTimeout(startMount, 350);
    const done = () => {
      window.clearTimeout(cap);
      startMount();
    };
    lcpImg.addEventListener("load", done, { once: true });
    lcpImg.addEventListener("error", done, { once: true });
  } else {
    startMount();
  }
} else {
  mountApp();
}
