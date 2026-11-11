/*
 * AUDP-DSP website — progressive enhancement (theme + mobile menu).
 * No dependencies, no network requests.
 * © 2026 Sbruice Singh / Agriculture Service of Product Farm (ASPF).
 */
"use strict";

(function initTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("js");
  let saved = null;
  try { saved = window.localStorage.getItem("audp-theme"); } catch (_) {}
  if (saved === "light" || saved === "dark") root.dataset.theme = saved;
})();

document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("theme-toggle");
  const navToggle = document.getElementById("nav-toggle");
  const top = document.querySelector(".top");
  const root = document.documentElement;

  if (toggle) {
    function applyMode() {
      const t = root.dataset.theme || "auto";
      toggle.dataset.mode = t;
    }
    applyMode();
    toggle.addEventListener("click", function () {
      const cur = root.dataset.theme || "auto";
      let next = cur === "auto" ? "light" : cur === "light" ? "dark" : "auto";
      if (next === "auto") delete root.dataset.theme;
      else root.dataset.theme = next;
      try { window.localStorage.setItem("audp-theme", next === "auto" ? "" : next); } catch (_) {}
      applyMode();
    });
  }

  if (navToggle && top) {
    navToggle.addEventListener("click", function () {
      const open = top.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // simple reveal
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }
});

/* --------------------------------------------------------------- waveform demo */
(function initDemo() {
  const box = document.getElementById("demo-app");
  if (!box) return;
  box.hidden = false;

  const typeSel = document.getElementById("demo-type");
  const freqIn = document.getElementById("demo-freq");
  const freqOut = document.getElementById("demo-freq-out");
  const noiseIn = document.getElementById("demo-noise");
  const noiseOut = document.getElementById("demo-noise-out");
  const canvas = document.getElementById("demo-canvas");
  const ctx = canvas.getContext("2d");
  let animating = false;
  let phase = 0;
  let raf = null;

  function sample(t, type, freq, noise) {
    const w = 2 * Math.PI * freq * t;
    let s = 0;
    if (type === "sine") s = Math.sin(w);
    else if (type === "square") s = Math.sin(w) >= 0 ? 1 : -1;
    else if (type === "triangle") s = (2 / Math.PI) * Math.asin(Math.sin(w));
    else if (type === "pulse") s = Math.sin(w) > 0.7 ? 1 : 0;
    const n = (Math.random() * 2 - 1) * noise;
    return Math.max(-1.2, Math.min(1.2, s + n));
  }

  function draw() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#0b6fae";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const type = typeSel.value;
    const freq = +freqIn.value;
    const noise = +noiseIn.value;
    const N = 400;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * 1 + phase;
      const y = sample(t, type, freq, noise);
      const x = (i / (N - 1)) * w;
      const py = h / 2 - (y / 1.2) * (h / 2 - 10);
      if (i === 0) ctx.moveTo(x, py); else ctx.lineTo(x, py);
    }
    ctx.stroke();
    // center line
    ctx.strokeStyle = "rgba(128,128,128,0.3)";
    ctx.beginPath();
    ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
  }

  function updateLabels() {
    freqOut.textContent = freqIn.value;
    noiseOut.textContent = noiseIn.value;
  }

  function loop() {
    if (!animating) return;
    phase += 0.02;
    draw();
    raf = requestAnimationFrame(loop);
  }

  function startAnim() {
    if (animating) return;
    animating = true;
    loop();
  }
  function stopAnim() {
    animating = false;
    if (raf) cancelAnimationFrame(raf);
  }

  typeSel.addEventListener("change", () => { draw(); });
  freqIn.addEventListener("input", () => { updateLabels(); draw(); });
  noiseIn.addEventListener("input", () => { updateLabels(); draw(); });
  document.getElementById("demo-animate").addEventListener("click", () => {
    if (animating) { stopAnim(); document.getElementById("demo-animate").textContent = "Animate"; }
    else { startAnim(); document.getElementById("demo-animate").textContent = "Stop"; }
  });
  document.getElementById("demo-reset").addEventListener("click", () => {
    stopAnim();
    typeSel.value = "sine"; freqIn.value = 5; noiseIn.value = 0.1; phase = 0;
    updateLabels(); draw();
    document.getElementById("demo-animate").textContent = "Animate";
  });

  updateLabels();
  draw();
})();
