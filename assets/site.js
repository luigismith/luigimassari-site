/* luigimassari.com */
(function () {
  "use strict";

  // Tema chiaro o scuro: la scelta resta salvata nel browser. La scena 3D ascolta l'evento "lm-theme".
  (function () {
    var root = document.documentElement;
    var btns = Array.prototype.slice.call(document.querySelectorAll("[data-theme-toggle]"));
    function current() { return root.dataset.theme === "light" ? "light" : "dark"; }
    function paint() { // il pulsante mostra il tema a cui si passa
      btns.forEach(function (b) { b.textContent = current() === "light" ? b.dataset.labelDark : b.dataset.labelLight; });
    }
    function set(theme) {
      if (theme === "light") root.dataset.theme = "light"; else delete root.dataset.theme;
      try { localStorage.setItem("lm-theme", theme); } catch (e) { /* storage bloccato */ }
      paint();
      window.dispatchEvent(new CustomEvent("lm-theme", { detail: theme }));
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { set(current() === "light" ? "dark" : "light"); }); });
    paint();
  })();

  // Navigazione "sintonia": l'ago va sulla stazione corrente, o su quella sotto il puntatore o il focus
  function initTuner(nav) {
    var needle = nav.querySelector(".tuner-needle");
    var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
    if (!needle || !links.length) return;
    var spy = null; // sezione in vista (solo nella home classica)
    function current() {
      return nav.querySelector("a[aria-current]") || (spy ? nav.querySelector('a[data-station="' + spy + '"]') : null);
    }
    function moveTo(a) {
      if (!a || !a.offsetParent) { nav.classList.remove("is-tuned"); return; }
      needle.style.transform = "translateX(" + (a.offsetLeft + a.offsetWidth / 2) + "px)";
      nav.classList.add("is-tuned");
    }
    function rest() { moveTo(current()); }
    links.forEach(function (a) {
      a.addEventListener("mouseenter", function () { moveTo(a); });
      a.addEventListener("focus", function () { moveTo(a); });
    });
    nav.addEventListener("mouseleave", rest);
    nav.addEventListener("focusout", function () {
      setTimeout(function () { if (!nav.contains(document.activeElement)) rest(); }, 0);
    });
    window.addEventListener("resize", rest);
    if ("ResizeObserver" in window) new ResizeObserver(rest).observe(nav); // es. compare la barra di scorrimento
    new MutationObserver(rest).observe(nav, { attributes: true, subtree: true, attributeFilter: ["aria-current"] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rest);
    var sections = document.querySelectorAll("main [data-station]");
    if (sections.length && "IntersectionObserver" in window && !nav.classList.contains("scene-nav")) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { visible[e.target.dataset.station] = e.isIntersecting; });
        spy = null;
        Array.prototype.forEach.call(sections, function (sec) { if (!spy && visible[sec.dataset.station]) spy = sec.dataset.station; });
        if (!nav.matches(":hover") && !nav.contains(document.activeElement)) rest();
      }, { rootMargin: "-35% 0px -55% 0px" });
      Array.prototype.forEach.call(sections, function (sec) { io.observe(sec); });
    }
    rest();
    var cur = current();
    if (cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2;
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-tuner]"), initTuner);

  // Modulo contatti: compone una mail
  var form = document.querySelector(".contact-form");
  if (form) {
    var fName = form.elements.namedItem("name"), fEmail = form.elements.namedItem("email");
    var fTopic = form.elements.namedItem("topic"), fMsg = form.elements.namedItem("message");
    // argomento preselezionato da ?topic=n
    var q = new URLSearchParams(location.search).get("topic");
    if (q !== null && fTopic.options[+q]) fTopic.selectedIndex = +q;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = form.querySelector(".form-error");
      var name = fName.value.trim(), email = fEmail.value.trim(), msg = fMsg.value.trim();
      var problem = "";
      if (!name || !email || !msg) problem = form.dataset.errRequired;
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problem = form.dataset.errEmail;
      if (problem) {
        err.textContent = problem; err.hidden = false;
        (!name ? fName : !email || problem === form.dataset.errEmail ? fEmail : fMsg).focus();
        return;
      }
      err.hidden = true;
      var subject = fTopic.value + " — " + name;
      var body = msg + "\n\n" + name + "\n" + email;
      location.href = "mailto:" + form.dataset.mailto + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  }

  // Home 3D ("Il banco"): decide se partire e carica i moduli solo quando serve
  (function () {
    var dataEl = document.getElementById("scene-data");
    var root = document.getElementById("scene");
    if (!dataEl || !root) return;
    var data = JSON.parse(dataEl.textContent);
    var params = new URLSearchParams(location.search);
    var force = params.get("scene") === "force"; // per i test: salta controlli di larghezza, CPU e fps
    var KEY = "lm-view";
    var enterBtn = document.querySelector("[data-enter-3d]");
    var toast = document.querySelector("[data-scene-toast]");
    var lofiEls = [document.querySelector(".skip"), document.querySelector(".site-header"), document.getElementById("main"), document.querySelector(".site-footer")];
    var api = null, loading = null;

    function getPref() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
    function setPref(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* storage bloccato: pazienza */ } }
    function hasWebGL2() {
      try {
        var c = document.createElement("canvas");
        var gl = c.getContext("webgl2");
        if (!gl) return false;
        var lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
        return true;
      } catch (e) { return false; }
    }
    function eligible() {
      if (!hasWebGL2()) return false;
      if (force) return true;
      return window.innerWidth >= 820 && (navigator.hardwareConcurrency || 4) >= 4;
    }
    function setLofiInert(on) {
      lofiEls.forEach(function (el) { if (el) { if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert"); } });
    }
    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg; toast.hidden = false;
      setTimeout(function () { toast.hidden = true; }, 7000);
    }

    function toLofi(opts) {
      opts = opts || {};
      document.documentElement.classList.remove("scene-mode");
      root.hidden = true;
      setLofiInert(false);
      if (api) api.pause();
      if (!opts.auto) setPref("lofi");
      if (opts.message) showToast(opts.message);
      if (enterBtn && !opts.auto) enterBtn.focus();
    }
    function to3D() {
      document.documentElement.classList.add("scene-mode");
      root.hidden = false;
      setLofiInert(true);
      if (api) { api.resume(); return; }
      if (loading) return;
      root.classList.add("is-intro");
      var bar = root.querySelector("[data-scene-bar]");
      if (bar) bar.style.width = "8%";
      loading = import(data.base + "main.js").then(function (mod) {
        return mod.start({ data: data, root: root, force: force, toLofi: toLofi });
      }).then(function (a) { api = a; }).catch(function (err) {
        console.error("Scena 3D non disponibile:", err);
        loading = null;
        toLofi({ auto: true });
      });
    }

    var ok = eligible();
    if (ok && enterBtn) {
      enterBtn.hidden = false;
      enterBtn.addEventListener("click", function () { setPref("3d"); to3D(); });
    }
    if (ok && (getPref() !== "lofi" || force)) to3D();
  })();
})();
