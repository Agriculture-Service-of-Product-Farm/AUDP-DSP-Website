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





/* --------------------------------------------------------------- advanced filter demo */
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
  const ftypeSel = document.getElementById("demo-ftype");
  const cutIn = document.getElementById("demo-cut");
  const cutOut = document.getElementById("demo-cut-out");
  const bwIn = document.getElementById("demo-bw");
  const bwOut = document.getElementById("demo-bw-out");
  const viewSel = document.getElementById("demo-view");
  const canvas = document.getElementById("demo-canvas");
  const spec = document.getElementById("demo-spectrum");
  const fall = document.getElementById("demo-waterfall");
  const timeWrap = document.getElementById("demo-time-wrap");
  const specWrap = document.getElementById("demo-spec-wrap");
  const fallWrap = document.getElementById("demo-fall-wrap");
  const mRms = document.getElementById("m-rms");
  const mPeak = document.getElementById("m-peak");
  const mDom = document.getElementById("m-dom");
  const mEnergy = document.getElementById("m-energy");
  const ctx = canvas.getContext("2d");
  const sctx = spec.getContext("2d");
  const fctx = fall.getContext("2d");
  let animating = false, paused = false, phase = 0, raf = null;
  const history = [];
  const MAX_HIST = 48;
  const FS = 200;

  function sample(t, type, freq, noise) {
    let s = 0;
    if (type === "chirp") {
      const f0 = Math.max(1, freq * 0.25);
      const f1 = freq * 2.2;
      const k = (f1 - f0);
      s = Math.sin(2 * Math.PI * (f0 * t + 0.5 * k * t * t));
    } else if (type === "modulated") {
      s = Math.sin(2 * Math.PI * freq * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * freq * 0.15 * t));
    } else {
      const w = 2 * Math.PI * freq * t;
      if (type === "sine") s = Math.sin(w);
      else if (type === "square") s = Math.sin(w) >= 0 ? 1 : -1;
      else if (type === "triangle") s = (2 / Math.PI) * Math.asin(Math.sin(w));
      else s = Math.sin(w);
    }
    return Math.max(-1.4, Math.min(1.4, s + (Math.random() * 2 - 1) * noise));
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

  function onePoleLow(arr, alpha) {
    const a = Math.min(0.95, Math.max(0.02, alpha));
    const out = new Array(arr.length);
    let y = arr[0] || 0;
    for (let i = 0; i < arr.length; i++) {
      y = y + a * (arr[i] - y);
      out[i] = y;
    }
    return out;
  }

  function onePoleHigh(arr, alpha) {
    const lp = onePoleLow(arr, alpha);
    return arr.map((v, i) => v - lp[i]);
  }

  function bandPass(arr, center, bw) {
    const lo = Math.max(0.02, center - bw / 2);
    const hi = Math.min(0.95, center + bw / 2);
    const hp = onePoleHigh(arr, lo);
    return onePoleLow(hp, hi);
  }

  function envelope(arr) {
    const abs = arr.map(v => Math.abs(v));
    return onePoleLow(abs, 0.15);
  }

  function applyFilter(arr, ftype, cut, bw) {
    if (ftype === "none") return arr.slice();
    if (ftype === "lowpass") return onePoleLow(arr, cut);
    if (ftype === "highpass") return onePoleHigh(arr, cut);
    if (ftype === "bandpass") return bandPass(arr, cut, bw);
    if (ftype === "envelope") return envelope(arr);
    return arr.slice();
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

  function updateViews() {
    const v = viewSel.value;
    timeWrap.hidden = v === "spectrum" || v === "waterfall";
    specWrap.hidden = v === "time" || v === "waterfall";
    fallWrap.hidden = v !== "waterfall";
  }

  function draw() {
    const type = typeSel.value;
    const freq = +freqIn.value;
    const noise = +noiseIn.value;
    const win = +smoothIn.value;
    const ftype = ftypeSel ? ftypeSel.value : "lowpass";
    const cut = cutIn ? +cutIn.value : 0.4;
    const bw = bwIn ? +bwIn.value : 0.2;
    const N = 360;
    const raw = [];
    for (let i = 0; i < N; i++) raw.push(sample((i / N) + phase, type, freq, noise));
    const smoothed = movingAverage(raw, win);
    const filtered = applyFilter(smoothed, ftype, cut, bw);
    const mag = magnitudeSpectrum(filtered);
    history.unshift(mag.slice(0, 80));
    if (history.length > MAX_HIST) history.pop();

    let sumSq = 0, peak = 0;
    for (let i = 0; i < filtered.length; i++) {
      const v = filtered[i];
      sumSq += v * v;
      if (Math.abs(v) > peak) peak = Math.abs(v);
    }
    const rms = Math.sqrt(sumSq / filtered.length);
    const energy = sumSq;
    let domBin = 1, domVal = 0;
    for (let k = 1; k < Math.min(mag.length, 80); k++) {
      if (mag[k] > domVal) { domVal = mag[k]; domBin = k; }
    }
    const domHz = (domBin * FS / N).toFixed(1);

    if (mRms) mRms.textContent = rms.toFixed(3);
    if (mPeak) mPeak.textContent = peak.toFixed(3);
    if (mDom) mDom.textContent = domHz + " Hz";
    if (mEnergy) mEnergy.textContent = energy.toFixed(1);

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#0b6fae";

    if (!timeWrap.hidden) {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(128,128,128,0.2)";
      ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); ctx.stroke();
      function plot(data, color, width) {
        ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const x = (i / (data.length - 1)) * w;
          const y = h / 2 - (data[i] / 1.4) * (h / 2 - 6);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      plot(raw, accent, 1.4);
      plot(filtered, "#2e9e3a", 2.2);
    }

    if (!specWrap.hidden) {
      const sw = spec.width, sh = spec.height;
      sctx.clearRect(0, 0, sw, sh);
      const maxM = Math.max(...mag, 1e-6);
      const bins = Math.min(mag.length, 90);
      const bwpx = sw / bins;
      for (let k = 0; k < bins; k++) {
        const bh = (mag[k] / maxM) * (sh - 10);
        const hue = 190 + (k / bins) * 50;
        sctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        sctx.fillRect(k * bwpx + 1, sh - bh - 3, bwpx - 2, bh);
      }
    }

    if (!fallWrap.hidden && history.length) {
      const fw = fall.width, fh = fall.height;
      fctx.clearRect(0, 0, fw, fh);
      const rows = history.length;
      const rh = fh / Math.max(rows, 1);
      const cols = history[0].length;
      const cw = fw / cols;
      for (let r = 0; r < rows; r++) {
        const row = history[r];
        const maxM = Math.max(...row, 1e-6);
        for (let c = 0; c < cols; c++) {
          const v = row[c] / maxM;
          const l = 15 + v * 55;
          fctx.fillStyle = `hsl(200, 65%, ${l}%)`;
          fctx.fillRect(c * cw, r * rh, cw + 0.5, rh + 0.5);
        }
      }
    }
  }

  function updateLabels() {
    freqOut.textContent = freqIn.value;
    noiseOut.textContent = noiseIn.value;
    smoothOut.textContent = smoothIn.value;
    if (cutOut && cutIn) cutOut.textContent = cutIn.value;
    if (bwOut && bwIn) bwOut.textContent = bwIn.value;
  }

  function loop() {
    if (!animating || paused) return;
    phase += 0.012;
    draw();
    raf = requestAnimationFrame(loop);
  }

  typeSel.addEventListener("change", draw);
  freqIn.addEventListener("input", () => { updateLabels(); draw(); });
  noiseIn.addEventListener("input", () => { updateLabels(); draw(); });
  smoothIn.addEventListener("input", () => { updateLabels(); draw(); });
  if (ftypeSel) ftypeSel.addEventListener("change", draw);
  if (cutIn) cutIn.addEventListener("input", () => { updateLabels(); draw(); });
  if (bwIn) bwIn.addEventListener("input", () => { updateLabels(); draw(); });
  viewSel.addEventListener("change", () => { updateViews(); draw(); });

  document.getElementById("demo-animate").addEventListener("click", function () {
    animating = !animating;
    paused = false;
    this.textContent = animating ? "Stop" : "Animate";
    document.getElementById("demo-pause").disabled = !animating;
    if (animating) loop();
    else if (raf) cancelAnimationFrame(raf);
  });
  document.getElementById("demo-pause").addEventListener("click", function () {
    paused = !paused;
    this.textContent = paused ? "Resume" : "Pause";
    if (!paused && animating) loop();
  });
  document.getElementById("demo-reset").addEventListener("click", () => {
    animating = false; paused = false;
    if (raf) cancelAnimationFrame(raf);
    typeSel.value = "sine"; freqIn.value = 5; noiseIn.value = 0.12; smoothIn.value = 7;
    if (ftypeSel) ftypeSel.value = "lowpass";
    if (cutIn) cutIn.value = 0.4;
    if (bwIn) bwIn.value = 0.2;
    viewSel.value = "both";
    phase = 0; history.length = 0;
    updateLabels(); updateViews(); draw();
    document.getElementById("demo-animate").textContent = "Animate";
    document.getElementById("demo-pause").textContent = "Pause";
    document.getElementById("demo-pause").disabled = true;
  });

  updateLabels(); updateViews(); draw();
})();
