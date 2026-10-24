import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const rootEl = document.getElementById("root");

// Production build'de statik HTML kabuğu (Hero + Navbar) önceden boyanmışsa,
// React mount olduğunda Hero giriş animasyonunun sıfırlanıp tekrar başlamaması
// için ilk boyamadan (FCP) beri geçen süreyi negatif animation-delay olarak aktar.
if (rootEl?.firstElementChild && typeof performance !== "undefined") {
  window.__PRERENDERED_SHELL__ = true;
  const fcpEntry = performance.getEntriesByName?.("first-contentful-paint")?.[0];
  const startTime = fcpEntry ? fcpEntry.startTime : 0;
  const elapsedSec = Math.max(0, (performance.now() - startTime) / 1000);
  document.documentElement.style.setProperty("--hero-offset", `-${elapsedSec.toFixed(3)}s`);
}

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
