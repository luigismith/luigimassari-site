// Interfaccia HTML sopra la scena: ingresso, menu, etichetta di hover, pannelli.
// Tutti i testi arrivano da content.py (JSON in <script id="scene-data">).

// piccolo costruttore di DOM: niente innerHTML con i dati
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid instanceof Node ? kid : String(kid));
  return el;
}

// Link verso altri siti: si aprono in una nuova scheda, cosi' la scena resta aperta.
// La freccia lo mostra a chi vede; il testo nascosto lo dice a chi usa un lettore di schermo.
const EXT = { target: "_blank", rel: "noopener" };
const extMark = (text) => [h("span", { "aria-hidden": "true" }, " ↗"), h("span", { class: "visually-hidden" }, " (" + text + ")")];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UI {
  constructor(root, data) {
    this.root = root;
    this.data = data;
    this.q = (s) => root.querySelector(s);
    this.bar = this.q("[data-scene-bar]");
    this.progressEl = this.q("[data-scene-progress]");
    this.enterBtn = this.q("[data-scene-enter]");
    this.panel = this.q("[data-scene-panel]");
    this.panelBody = this.q("[data-scene-panel-body]");
    this.label = this.q("[data-scene-label]");
    this.live = this.q("[data-scene-live]");
    this.weatherBox = this.q("[data-scene-weather]");
    this.weatherMain = this.q("[data-scene-weather-main]");
    this.weatherSub = this.q("[data-scene-weather-sub]");
    this.weatherCredit = this.q("[data-scene-weather-credit]");
    this.soundBtn = this.q("[data-scene-sound]");
    this.soundLabel = this.q("[data-scene-sound-label]");
    this.langLink = this.q("[data-scene-lang]");
    this.navLinks = [...root.querySelectorAll(".scene-nav [data-view]")];
    this.sound = true;
    this.closeTimer = 0;
    this.selected = null;
    this.handlers = {};
    root.classList.add("is-intro");
    this.trapIntro();
    root.querySelectorAll("[data-sound-choice]").forEach((b) => {
      b.addEventListener("click", () => {
        this.sound = b.dataset.soundChoice === "1";
        root.querySelectorAll("[data-sound-choice]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      });
    });
  }

  on(name, fn) { this.handlers[name] = fn; }
  emit(name, ...args) { if (this.handlers[name]) this.handlers[name](...args); }

  progress(f) {
    const pct = Math.round(Math.max(0, Math.min(1, f)) * 100);
    this.bar.style.width = pct + "%";
    this.progressEl.setAttribute("aria-valuenow", String(pct));
  }

  // l'ingresso e' un dialogo modale: Tab resta dentro
  trapIntro() {
    const intro = this.q("[data-scene-intro]");
    intro.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const f = [...intro.querySelectorAll("button:not([disabled]), a[href]")].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
  }

  // Chi e' gia' entrato in questa sessione del browser (per esempio torna alla home dal nome nell'intestazione
  // di una pagina classica) arriva direttamente sul banco, con la scelta del suono fatta all'ingresso.
  ready(onEnter) {
    let saved = null;
    try { saved = sessionStorage.getItem("lm-entered"); } catch (e) { /* storage bloccato */ }
    const go = (auto) => {
      try { sessionStorage.setItem("lm-entered", this.sound ? "1" : "0"); } catch (e) { /* storage bloccato */ }
      this.root.classList.remove("is-intro");
      onEnter({ sound: this.sound, auto });
    };
    if (saved === "1" || saved === "0") { this.sound = saved === "1"; go(true); return; }
    this.enterBtn.disabled = false;
    this.enterBtn.focus({ preventScroll: true });
    this.enterBtn.addEventListener("click", () => go(false), { once: true });
  }

  bindControls() {
    this.root.querySelectorAll("[data-scene-lofi]").forEach((b) => b.addEventListener("click", () => this.emit("lofi")));
    this.soundBtn.addEventListener("click", () => this.emit("sound", this.soundBtn.getAttribute("aria-pressed") !== "true"));
    this.q("[data-scene-back]").addEventListener("click", () => this.emit("back"));
    this.q("[data-scene-home]").addEventListener("click", (e) => { e.preventDefault(); this.emit("back"); });
  }

  // Stato della modalita' "dal vivo": che tempo fa, che ora e' e dove (la zona del visitatore oppure Taranto),
  // piu' la citazione di MET Norway. Il testo si legge proiettato sul vetro della scena (room.setProjection);
  // il riquadro HTML resta solo per i lettori di schermo. Con null sparisce tutto.
  setWeather(s) {
    if (!s) { this.weatherBox.hidden = true; return { text: "", lines: null }; }
    const u = this.data.ui, here = s.where === "you", ok = s.weather === "ok";
    const lang = document.documentElement.lang || "it", zone = here ? {} : { timeZone: "Europe/Rome" };
    const time = s.date.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", ...zone });
    const kind = ok ? u.live_kinds[s.kind] : s.weather === "wait" ? u.live_wait : u.live_none;
    const temp = ok && s.temp !== null ? s.temp + " °C" : "";
    const main = kind + (temp ? ", " + temp : "");
    const sub = (here ? u.live_you : u.live_taranto).replace("{time}", time) + (s.weather === "none" ? " " + u.live_light : "");
    this.weatherMain.textContent = main;
    this.weatherSub.textContent = sub;
    this.weatherCredit.hidden = s.weather === "none";
    this.weatherBox.hidden = false;
    // text: per l'annuncio ai lettori di schermo; lines: quello che la scena proietta sul vetro
    // le prossime ore, per la curva: ora locale del posto, temperatura e pioggia
    const hours = ok && s.hours && s.hours.length >= 4
      ? s.hours.map((x) => ({ temp: x.temp, mm: x.mm, label: new Date(x.time).toLocaleTimeString(lang, { hour: "2-digit", hourCycle: "h23", ...zone }).replace(/\D/g, "") }))
      : null;
    const place = (here ? u.live_at_you : u.live_at_taranto).replace("{time}", time) + (s.weather === "none" ? ". " + u.live_light : "");
    return { text: main + ". " + sub, lines: { big: temp, main: kind, sub: place, credit: s.weather === "none" ? "" : u.live_credit, hours } };
  }

  setSound(on) {
    this.soundBtn.setAttribute("aria-pressed", String(on));
    this.soundLabel.textContent = on ? this.data.ui.sound_on : this.data.ui.sound_off;
  }

  // vista corrente: menu, selettore lingua
  setView(view) {
    for (const a of this.navLinks) {
      if (a.dataset.view === view) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
    const oh = this.data.other_hash[view];
    this.langLink.href = this.data.other_home + (oh ? "#" + oh : "");
  }

  announce(text) {
    this.live.textContent = "";
    requestAnimationFrame(() => { this.live.textContent = text; });
  }

  // --- etichetta di hover ---
  showLabel(x, y, title, sub) {
    this.label.replaceChildren(...[h("span", { class: "dot" }), title, sub ? h("small", {}, sub) : null].filter(Boolean));
    this.label.style.left = x + "px";
    this.label.style.top = y + "px";
    this.label.classList.add("on");
  }
  hideLabel() { this.label.classList.remove("on"); }

  // --- pannello ---
  get panelOpen() { return !this.panel.hidden; }
  // bordo destro della colonna di testo: a destra di questo resta visibile la scena
  panelRight() {
    const r = this.panelBody.getBoundingClientRect();
    if (r.width) return r.right;
    const w = window.innerWidth, left = Math.min(130, Math.max(28, w * 0.09));
    return Math.min(w * 0.6, 760 + left);
  }

  openPanel(view, { focus = true } = {}) {
    clearTimeout(this.closeTimer);
    const build = { dev: () => this.devPanel(), shop: () => this.shopPanel(), about: () => this.aboutPanel(), contact: () => this.contactPanel(), lab: () => this.labPanel(), print: () => this.printPanel(), laser: () => this.laserPanel(), game: () => this.gamePanel() }[view];
    if (!build) return;
    this.view = view;
    this.panelBody.replaceChildren(...build().filter(Boolean));
    this.panelBody.scrollTop = 0;
    this.panel.hidden = false;
    requestAnimationFrame(() => this.panel.classList.add("open"));
    const title = this.panelBody.querySelector("h2");
    this.announce(title ? title.textContent : "");
    if (focus && title) title.focus({ preventScroll: true });
  }

  closePanel() {
    if (this.panel.hidden) return;
    this.panel.classList.remove("open");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.closeTimer = setTimeout(() => { this.panel.hidden = true; this.panelBody.replaceChildren(); }, reduce ? 0 : 300);
    this.view = null;
  }

  title(text) { return h("h2", { id: "scene-panel-h", tabindex: "-1" }, text); }

  devPanel() {
    const d = this.data.dev;
    return [
      this.title(d.h),
      h("p", { class: "lead" }, d.p),
      h("div", { class: "sp-actions" },
        h("a", { class: "btn btn-primary", href: d.cta_href }, d.cta),
        h("a", { class: "btn btn-secondary", href: d.page }, d.page_label)),
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, d.services_h),
        h("ul", { class: "sp-list" }, d.services.map((s) => h("li", {}, h("h3", {}, s.h), h("p", {}, s.p))))),
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, d.process_h),
        h("ol", { class: "sp-steps" }, d.process.map(([t, p], i) => h("li", {}, h("span", { class: "n", "aria-hidden": "true" }, i + 1), h("h3", {}, t), h("p", {}, p))))),
      h("div", { class: "sp-actions" }, h("a", { class: "btn btn-primary", href: d.cta_href }, d.cta)),
    ];
  }

  shopPanel() {
    const s = this.data.shop;
    this.card = h("div", { class: "sp-card-slot" });
    this.productButtons = s.products.map((p) => h("button", {
      type: "button", "data-slug": p.slug,
      onclick: () => this.emit("pick", p.slug),
    }, h("span", { class: "nm" }, p.name), h("span", { class: "status status-" + p.status }, p.status_label)));
    const out = [
      this.title(s.h),
      h("p", { class: "lead" }, s.p),
      h("div", { class: "sp-actions" }, h("a", { class: "btn btn-primary", href: s.cta_href }, s.cta)),
      h("div", { class: "sp-section" },
        h("ul", { class: "sp-list" }, s.items.map(([t, p]) => h("li", {}, h("h3", {}, t), h("p", {}, p))))),
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, s.pick),
        h("ul", { class: "sp-products" }, this.productButtons.map((b) => h("li", {}, b)))),
      this.card,
      this.galleryBlock("synth", this.data.gallery.hsynth),
      this.galleryBlock("console", this.data.gallery.hconsole, this.data.gallery.pconsole),
      h("div", { class: "sp-actions" }, h("a", { class: "sp-link", href: s.page }, s.page_label)),
    ];
    if (this.selected) queueMicrotask(() => this.showProduct(this.selected, false));
    return out;
  }

  showProduct(slug, focus = true) {
    this.selected = slug;
    if (this.view !== "shop" || !this.card) return;
    const p = this.data.shop.products.find((x) => x.slug === slug);
    if (!p) return;
    for (const b of this.productButtons) {
      if (b.dataset.slug === slug) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    }
    const primary = h("a", { class: "btn btn-primary", href: p.primary_href, rel: p.stripe ? "noopener" : null, target: p.stripe ? "_blank" : null }, p.primary_label);
    const card = h("article", { class: "sp-card", "aria-labelledby": "sp-card-h" },
      p.image ? h("img", { class: "sp-card-img", src: p.image, alt: p.image_alt, loading: "lazy" }) : null,
      h("p", { class: "status status-" + p.status }, p.status_label),
      h("h3", { id: "sp-card-h", tabindex: "-1" }, p.name),
      h("p", {}, p.tagline),
      p.highlights && p.highlights.length ? h("ul", { class: "sp-highlights" }, p.highlights.map((x) => h("li", {}, x))) : null,
      p.status === "aperto" ? null : h("p", { class: "price" }, p.price_label),
      h("div", { class: "sp-actions" },
        primary,
        h("a", { class: "btn btn-light", href: p.url }, p.view_label),
      ),
      p.site ? h("p", { class: "note" }, h("a", { href: p.site, ...EXT }, p.site_label, extMark(this.data.ui.new_tab))) : null,
      p.status === "aperto" ? null : h("p", { class: "note" }, h("a", { href: p.ask_href }, p.ask_label), " · ", this.data.shop.shipping));
    this.card.replaceChildren(card);
    this.announce(`${p.name}. ${p.status_label}. ${p.price_label}`);
    if (focus) card.querySelector("h3").focus({ preventScroll: true });
    card.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  aboutPanel() {
    const a = this.data.about, hash = this.data.hash;
    return [
      this.title(a.h),
      ...a.p.map((p, i) => h("p", { class: i === 0 ? "lead" : null }, p)),
      a.portfolio ? h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, a.portfolio.h),
        h("p", {}, a.portfolio.p),
        h("ul", { class: "sp-gallery" }, a.portfolio.works.filter((w) => w.i.length).slice(0, 6).map((w, i, arr) => h("li", {},
          h("a", { href: a.portfolio.page, onclick: (e) => { if (window.lmPortfolio) { e.preventDefault(); const all = a.portfolio.works.filter((x) => x.i.length); window.lmPortfolio(all, all.indexOf(w), { close: this.data.gallery.close, prev: this.data.gallery.prev, next: this.data.gallery.next }); } } },
            h("img", { src: w.thumb, alt: w.t, loading: "lazy", width: "600", height: "400" })),
          h("p", { "aria-hidden": "true" }, w.t)))),
        h("div", { class: "sp-actions" },
          h("button", { type: "button", class: "btn btn-primary", onclick: () => { const all = a.portfolio.works.filter((x) => x.i.length); window.lmPortfolio && window.lmPortfolio(all, 0, { close: this.data.gallery.close, prev: this.data.gallery.prev, next: this.data.gallery.next }); } }, a.portfolio.cta),
          h("a", { class: "btn btn-secondary", href: a.portfolio.page }, a.portfolio.h))) : null,
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, a.skills_h),
        h("ul", { class: "sp-list" }, a.skills.map(([t, p]) => h("li", {}, h("h3", {}, t), h("p", {}, p))))),
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, a.open_h),
        h("ul", { class: "sp-list" }, a.open.map(([t, p]) => h("li", {}, h("h3", {}, t), h("p", {}, p))))),
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, a.explore_h),
        h("ul", { class: "sp-doors" }, a.explore.map((x) => h("li", {},
          h("a", { href: "#" + hash[x.view] }, h("span", { class: "dh" }, x.h, h("span", { "aria-hidden": "true" }, " →")), h("span", { class: "dp" }, x.p)))))),
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, a.projects_h),
        h("ul", { class: "sp-list" }, a.projects.map(([n, u, d]) => h("li", {},
          h("h3", {}, h("a", { class: "sp-link", href: u, ...EXT }, n, extMark(this.data.ui.new_tab))), h("p", {}, d))))),
      a.cv ? h("div", { class: "sp-actions" }, h("a", { class: "sp-link", href: a.cv }, a.cv_label)) : null,
    ];
  }

  contactPanel() {
    const c = this.data.contact, f = c.form;
    const err = h("p", { class: "form-error", role: "alert", hidden: true });
    const fName = h("input", { id: "sp-name", name: "name", autocomplete: "name", required: true });
    const fEmail = h("input", { id: "sp-email", name: "email", type: "email", autocomplete: "email", required: true });
    const fTopic = h("select", { id: "sp-topic", name: "topic" }, f.topics.map((t) => h("option", {}, t)));
    const fMsg = h("textarea", { id: "sp-msg", name: "message", rows: "4", placeholder: f.msg_ph, required: true });
    // stessa logica del modulo di /contatti/ (site.js): compone una mail
    const form = h("form", {
      class: "sp-form", novalidate: true,
      onsubmit: (e) => {
        e.preventDefault();
        const name = fName.value.trim(), email = fEmail.value.trim(), msg = fMsg.value.trim();
        let problem = "";
        if (!name || !email || !msg) problem = f.err_required;
        else if (!EMAIL_RE.test(email)) problem = f.err_email;
        if (problem) {
          err.textContent = problem; err.hidden = false;
          (!name ? fName : !email || problem === f.err_email ? fEmail : fMsg).focus();
          return;
        }
        err.hidden = true;
        const subject = fTopic.value + " — " + name;
        const body = msg + "\n\n" + name + "\n" + email;
        location.href = "mailto:" + c.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      },
    },
      h("div", { class: "field" }, h("label", { for: "sp-name" }, f.name), fName),
      h("div", { class: "field" }, h("label", { for: "sp-email" }, f.email), fEmail),
      h("div", { class: "field" }, h("label", { for: "sp-topic" }, f.topic), fTopic),
      h("div", { class: "field" }, h("label", { for: "sp-msg" }, f.msg), fMsg),
      err,
      h("button", { class: "btn btn-primary", type: "submit" }, f.send),
      h("p", { class: "small", style: "margin-top:10px" }, f.note));
    return [
      this.title(c.h),
      h("p", { class: "lead" }, c.p),
      h("p", { class: "kicker" }, c.direct),
      h("p", {}, h("a", { class: "sp-direct sp-link", href: "mailto:" + c.email }, c.email)),
      c.whatsapp ? h("p", {}, h("a", { class: "sp-link", href: "https://wa.me/" + c.whatsapp, ...EXT }, "WhatsApp", extMark(this.data.ui.new_tab))) : null,
      h("div", { class: "sp-section" }, form),
      h("div", { class: "sp-section" }, h("h3", { class: "sp-h" }, c.profile_h), h("p", {}, c.profile)),
    ];
  }

  // scheda con testo, invito e un elenco di voci (Stampa 3D, Formazione)
  itemsPanel(d, more) {
    return [
      this.title(d.h),
      ...[].concat(d.p).map((p, i) => h("p", { class: i === 0 ? "lead" : null }, p)),
      h("div", { class: "sp-actions" },
        h("a", { class: "btn btn-primary", href: d.cta_href }, d.cta),
        more ? h("a", { class: "btn btn-secondary", href: more.href }, more.label) : null),
      h("div", { class: "sp-section" },
        h("ul", { class: "sp-list" }, d.items.map(([t, p]) => h("li", {}, h("h3", {}, t), h("p", {}, p))))),
    ];
  }
  labPanel() { const l = this.data.lab; return this.itemsPanel(l, { href: l.more_href, label: l.more }); }
  // foto dei lavori: miniature con didascalia; un clic apre la foto intera in una nuova scheda
  // foto dei lavori: miniature con didascalia; un clic apre la galleria in sovraimpressione (window.lmLightbox, site.js)
  galleryBlock(key, title, intro = null) {
    const g = this.data.gallery;
    if (!g || !g[key] || !g[key].length) return null;
    const list = g[key].map((x) => ({ src: x.src, alt: x.alt }));
    const labels = { close: g.close, prev: g.prev, next: g.next };
    return h("div", { class: "sp-section" },
      h("h3", { class: "sp-h" }, title),
      intro ? h("p", {}, intro) : null,
      h("ul", { class: "sp-gallery" }, g[key].map((x, i) => h("li", {},
        h("a", {
          href: x.src,
          onclick: (e) => { if (window.lmLightbox && !(e.ctrlKey || e.metaKey || e.shiftKey)) { e.preventDefault(); window.lmLightbox(list, i, labels); } },
        }, h("img", { src: x.thumb, alt: x.alt, loading: "lazy", width: "600", height: "400" })),
        h("p", { "aria-hidden": "true" }, x.alt)))),
      h("p", { class: "note" }, g.note));
  }
  printPanel() { return [...this.itemsPanel(this.data.print), this.galleryBlock("3d", this.data.gallery.h3d)]; }

  // il taglio laser: i pezzi sul banco (pannello e scatola a incastri), con un esempio vero
  laserPanel() {
    const l = this.data.laser;
    return [
      ...this.itemsPanel(l),
      this.galleryBlock("laser", this.data.gallery.hlaser),
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, l.example_h),
        h("p", {}, l.example),
        h("p", {}, h("a", { class: "sp-link", href: l.example_href }, l.example_link))),
    ];
  }

  // la console portatile: Ctrl-Alt-Revenge, il videogioco in sviluppo
  gamePanel() {
    const g = this.data.game, ext = (href, text) => h("a", { class: "btn btn-primary", href, ...EXT }, text, extMark(this.data.ui.new_tab));
    return [
      this.title(g.name),
      h("p", { class: "status" }, g.status),
      h("p", { class: "lead" }, g.lead),
      h("figure", { class: "sp-figure" },
        h("img", { src: g.image, alt: g.image_alt, loading: "lazy", width: "1000", height: "469" }),
        h("figcaption", {}, g.image_note)),
      h("div", { class: "sp-actions" }, ext(g.site, g.site_label)),
      h("div", { class: "sp-section" }, h("h3", { class: "sp-h" }, g.world_h), ...g.world.map((p) => h("p", {}, p))),
      h("div", { class: "sp-section" }, h("h3", { class: "sp-h" }, g.hero_h), h("p", {}, g.hero)),
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, g.play_h),
        h("ul", { class: "sp-list" }, g.play.map(([t, p]) => h("li", {}, h("h3", {}, t), h("p", {}, p))))),
      h("div", { class: "sp-section" }, h("h3", { class: "sp-h" }, g.made_h), h("p", {}, g.made), h("p", { class: "note" }, g.note)),
    ];
  }
}
