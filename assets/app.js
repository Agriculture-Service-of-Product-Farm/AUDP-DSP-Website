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
  const smoothIn = document.getElementById("demo-smooth");
  const smoothOut = document.getElementById("demo-smooth-out");
  const canvas = document.getElementById("demo-canvas");
  const spec = document.getElementById("demo-spectrum");
  const ctx = canvas.getContext("2d");
  const sctx = spec.getContext("2d");
  let animating = false;
  let phase = 0;
  let raf = null;

  function sample(t, type, freq, noise) {
    let s = 0;
    if (type === "chirp") {
      const f0 = Math.max(1, freq * 0.3);
      const f1 = freq * 2;
      const k = (f1 - f0) / 1.0;
      s = Math.sin(2 * Math.PI * (f0 * t + 0.5 * k * t * t));
    } else {
      const w = 2 * Math.PI * freq * t;
      if (type === "sine") s = Math.sin(w);
      else if (type === "square") s = Math.sin(w) >= 0 ? 1 : -1;
      else if (type === "triangle") s = (2 / Math.PI) * Math.asin(Math.sin(w));
      else s = Math.sin(w);
    }
    return Math.max(-1.3, Math.min(1.3, s + (Math.random() * 2 - 1) * noise));
  }

  function movingAverage(arr, win) {
    const out = new Array(arr.length);
    const half = Math.floor(win / 2);
    for (let i = 0; i < arr.length; i++) {
      let sum = 0, c = 0;
      for (let k = -half; k <= half; k++) {
        const j = i + k;
        if (j >= 0 && j < arr.length) { sum += arr[j]; c++; }
      }
      out[i] = c ? sum / c : 0;
    }
    return out;
  }

  function magnitudeSpectrum(arr) {
    const N = arr.length;
    const mag = new Array(Math.floor(N / 2));
    for (let k = 0; k < mag.length; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const ang = -2 * Math.PI * k * n / N;
        re += arr[n] * Math.cos(ang);
        im += arr[n] * Math.sin(ang);
      }
      mag[k] = Math.sqrt(re * re + im * im) / N;
    }
    return mag;
  }

  function draw() {
    const w = canvas.width, h = canvas.height;
    const type = typeSel.value;
    const freq = +freqIn.value;
    const noise = +noiseIn.value;
    const win = +smoothIn.value;
    const N = 360;
    const raw = [];
    for (let i = 0; i < N; i++) raw.push(sample((i / N) + phase, type, freq, noise));
    const smooth = movingAverage(raw, win);

    ctx.clearRect(0, 0, w, h);
    // center
    ctx.strokeStyle = "rgba(128,128,128,0.25)";
    ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();

    function plot(data, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * w;
        const y = h / 2 - (data[i] / 1.3) * (h / 2 - 8);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#0b6fae";
    plot(raw, accent);
    plot(smooth, "#2e9e3a");

    // spectrum of smoothed
    const mag = magnitudeSpectrum(smooth);
    const sw = spec.width, sh = spec.height;
    sctx.clearRect(0, 0, sw, sh);
    const maxM = Math.max(...mag, 1e-6);
    sctx.fillStyle = accent;
    const bins = Math.min(mag.length, 80);
    const bw = sw / bins;
    for (let k = 0; k < bins; k++) {
      const bh = (mag[k] / maxM) * (sh - 12);
      sctx.fillRect(k * bw + 1, sh - bh - 4, bw - 2, bh);
    }
  }

  function updateLabels() {
    freqOut.textContent = freqIn.value;
    noiseOut.textContent = noiseIn.value;
    smoothOut.textContent = smoothIn.value;
  }

  function loop() {
    if (!animating) return;
    phase += 0.015;
    draw();
    raf = requestAnimationFrame(loop);
  }

  typeSel.addEventListener("change", draw);
  freqIn.addEventListener("input", () => { updateLabels(); draw(); });
  noiseIn.addEventListener("input", () => { updateLabels(); draw(); });
  smoothIn.addEventListener("input", () => { updateLabels(); draw(); });
  document.getElementById("demo-animate").addEventListener("click", function () {
    animating = !animating;
    this.textContent = animating ? "Stop" : "Animate";
    if (animating) loop();
    else if (raf) cancelAnimationFrame(raf);
  });
  document.getElementById("demo-reset").addEventListener("click", () => {
    animating = false;
    if (raf) cancelAnimationFrame(raf);
    typeSel.value = "sine"; freqIn.value = 5; noiseIn.value = 0.15; smoothIn.value = 5; phase = 0;
    updateLabels(); draw();
    document.getElementById("demo-animate").textContent = "Animate";
  });

  updateLabels();
  draw();
})();
