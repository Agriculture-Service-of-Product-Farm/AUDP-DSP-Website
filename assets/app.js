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
