/* luigimassari.com */
(function () {
  "use strict";

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

  // Sequencer
  var seq = document.querySelector("[data-seq]");
  if (!seq) return;

  var steps = Array.prototype.slice.call(seq.querySelectorAll(".step"));
  var heads = seq.querySelectorAll(".ph");
  var playBtn = seq.querySelector("[data-play]");
  var playLabel = seq.querySelector("[data-play-label]");
  var tempo = seq.querySelector("[data-tempo]");
  var tempoOut = seq.querySelector("[data-tempo-out]");
  var clearBtn = seq.querySelector("[data-clear]");
  // Pentatonica minore in La, una nota per step
  var NOTES = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];

  var ctx = null, master = null, noiseBuf = null;
  var playing = false, current = 0, nextTime = 0, timer = null, queue = [];

  steps.forEach(function (b) {
    b.addEventListener("click", function () {
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
    });
  });
  clearBtn.addEventListener("click", function () {
    steps.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
  });
  tempo.addEventListener("input", function () {
    tempoOut.textContent = tempo.value;
    tempo.setAttribute("aria-valuetext", tempo.value + " BPM");
  });

  function initAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    var comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function kick(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.36);
  }
  function hat(t) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = 7000;
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.07);
  }
  function synth(t, step, len) {
    var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = NOTES[step];
    f.type = "lowpass"; f.Q.value = 6;
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(380, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.02);
  }

  function on(track, i) {
    var b = seq.querySelector('.step[data-track="' + track + '"][data-step="' + i + '"]');
    return b && b.getAttribute("aria-pressed") === "true";
  }

  function scheduler() {
    var stepDur = 60 / +tempo.value / 2; // crome
    while (nextTime < ctx.currentTime + 0.12) {
      if (on("kick", current)) kick(nextTime);
      if (on("hat", current)) hat(nextTime);
      if (on("synth", current)) synth(nextTime, current, stepDur * 1.6);
      queue.push({ step: current, time: nextTime });
      nextTime += stepDur;
      current = (current + 1) % 8;
    }
  }

  var lastDrawn = -1;
  function draw() {
    if (!playing) return;
    while (queue.length && queue[0].time <= ctx.currentTime) {
      lastDrawn = queue.shift().step;
    }
    for (var i = 0; i < 8; i++) {
      heads[i].classList.toggle("on", i === lastDrawn);
    }
    steps.forEach(function (b) { b.classList.toggle("now", +b.dataset.step === lastDrawn); });
    requestAnimationFrame(draw);
  }

  function start() {
    if (!ctx && !initAudio()) return;
    if (ctx.state === "suspended") ctx.resume();
    playing = true; current = 0; queue = []; nextTime = ctx.currentTime + 0.05;
    timer = setInterval(scheduler, 25);
    scheduler();
    requestAnimationFrame(draw);
    playBtn.setAttribute("aria-pressed", "true");
    playLabel.textContent = playBtn.dataset.labelStop;
  }
  function stop() {
    playing = false; clearInterval(timer);
    for (var i = 0; i < 8; i++) heads[i].classList.remove("on");
    steps.forEach(function (b) { b.classList.remove("now"); });
    playBtn.setAttribute("aria-pressed", "false");
    playLabel.textContent = playBtn.dataset.labelPlay;
  }
  playBtn.setAttribute("aria-pressed", "false");
  playBtn.addEventListener("click", function () { playing ? stop() : start(); });
  document.addEventListener("visibilitychange", function () { if (document.hidden && playing) stop(); });
})();
