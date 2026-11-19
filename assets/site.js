/* luigimassari.com */
(function () {
  "use strict";

  // Tema: scuro, chiaro oppure "dal vivo". La scelta resta salvata nel browser (lm-theme).
  // "Dal vivo" nelle pagine classiche sceglie chiaro o scuro dall'ora del visitatore (chiaro dalle 7 alle 19),
  // senza chiedere nulla; nella scena 3D segue il sole e il meteo veri (static/scene/live.js), che ascolta
  // l'evento "lm-theme". Comandi: pulsanti [data-theme-choice] (scena) e menu [data-theme-select] (intestazione).
  var themeSync = null;
  (function () {
    var root = document.documentElement;
    var choices = Array.prototype.slice.call(document.querySelectorAll("[data-theme-choice]"));
    var selects = Array.prototype.slice.call(document.querySelectorAll("[data-theme-select]"));
    function mode() { return root.dataset.themeMode === "live" ? "live" : root.dataset.theme === "light" ? "light" : "dark"; }
    function byHour() { var h = new Date().getHours(); return h >= 7 && h < 19 ? "light" : "dark"; }
    function show(theme) { if (theme === "light") root.dataset.theme = "light"; else delete root.dataset.theme; }
    function paint() {
      var m = mode();
      choices.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.themeChoice === m)); });
      selects.forEach(function (s) { s.value = m; });
    }
    function set(m) {
      if (m !== "light" && m !== "live") m = "dark";
      if (m === "live") root.dataset.themeMode = "live"; else delete root.dataset.themeMode;
      show(m === "live" ? byHour() : m);
      try { localStorage.setItem("lm-theme", m); } catch (e) { /* storage bloccato */ }
      paint();
      window.dispatchEvent(new CustomEvent("lm-theme", { detail: m }));
    }
    // riscegliere "dal vivo" quando e' gia' attivo vale come nuova scelta: la scena puo' chiedere la posizione
    choices.forEach(function (b) { b.addEventListener("click", function () { if (b.dataset.themeChoice !== mode() || mode() === "live") set(b.dataset.themeChoice); }); });
    selects.forEach(function (s) { s.addEventListener("change", function () { set(s.value); }); });
    // "dal vivo" fuori dalla scena: il tema segue l'ora (nella scena lo decide la scena, con il sole vero)
    themeSync = function () { if (mode() === "live" && !root.classList.contains("scene-mode")) show(byHour()); };
    setInterval(themeSync, 60000);
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
      if (themeSync) themeSync();
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

  // Scheda prodotto: un clic su una miniatura la porta nel riquadro grande. Senza JavaScript la miniatura
  // e' un link all'immagine intera.
  (function () {
    var main = document.querySelector("[data-gallery-main]");
    var thumbs = Array.prototype.slice.call(document.querySelectorAll("[data-gallery] .gallery-thumb"));
    if (!main || !thumbs.length) return;
    thumbs.forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;   // apri in una nuova scheda: lascia fare
        e.preventDefault();
        main.src = a.getAttribute("href");
        main.alt = a.dataset.alt || "";
        thumbs.forEach(function (t) { if (t === a) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current"); });
      });
    });
  })();

  // Gallerie dei lavori: la miniatura apre una galleria in sovraimpressione, con la didascalia, le frecce per
  // scorrere (anche con i tasti freccia) ed Esc per chiudere. window.lmLightbox(foto, indice, testi) la apre anche
  // dalla scena 3D (static/scene/ui.js): foto = [{src, alt}], testi = {close, prev, next}.
  (function () {
    if (typeof HTMLDialogElement === "undefined") return;
    var d = null, items = [], at = 0, img, cap, count, opener = null;
    function build(t) {
      d = document.createElement("dialog");
      d.className = "lightbox";
      d.innerHTML = '<figure><img alt=""><figcaption><span class="lb-cap"></span><span class="lb-n"></span></figcaption></figure>' +
        '<button type="button" class="lb-close"></button><button type="button" class="lb-prev"><span aria-hidden="true">‹</span></button>' +
        '<button type="button" class="lb-next"><span aria-hidden="true">›</span></button>';
      document.body.appendChild(d);
      img = d.querySelector("img"); cap = d.querySelector(".lb-cap"); count = d.querySelector(".lb-n");
      d.querySelector(".lb-close").addEventListener("click", function () { d.close(); });
      d.querySelector(".lb-prev").addEventListener("click", function () { show(at - 1); });
      d.querySelector(".lb-next").addEventListener("click", function () { show(at + 1); });
      d.addEventListener("click", function (e) { if (e.target === d) d.close(); });
      d.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1); }
      });
      d.addEventListener("close", function () { if (opener && opener.focus) opener.focus(); });
    }
    function labels(t) {
      d.querySelector(".lb-close").textContent = t.close || "×";
      d.querySelector(".lb-prev").setAttribute("aria-label", t.prev || "");
      d.querySelector(".lb-next").setAttribute("aria-label", t.next || "");
    }
    function show(i) {
      at = (i + items.length) % items.length;
      img.src = items[at].src; img.alt = items[at].alt || "";
      cap.textContent = items[at].alt || "";
      count.textContent = items.length > 1 ? (at + 1) + " / " + items.length : "";
      d.classList.toggle("lb-single", items.length < 2);
    }
    window.lmLightbox = function (list, i, t) {
      if (!d) build();
      labels(t || {});
      items = list; opener = document.activeElement;
      show(i || 0);
      if (!d.open) d.showModal();
    };
    Array.prototype.slice.call(document.querySelectorAll("[data-gallery-set]")).forEach(function (set) {
      var links = Array.prototype.slice.call(set.querySelectorAll("a[data-lightbox]"));
      var list = links.map(function (a) { return { src: a.getAttribute("href"), alt: a.dataset.caption || "" }; });
      var t = { close: set.dataset.close, prev: set.dataset.prev, next: set.dataset.next };
      links.forEach(function (a, i) {
        a.addEventListener("click", function (e) {
          if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
          e.preventDefault();
          window.lmLightbox(list, i, t);
        });
      });
    });
  })();
})();
