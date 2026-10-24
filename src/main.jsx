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

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
