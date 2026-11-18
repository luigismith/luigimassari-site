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

  ready(onEnter) {
    this.enterBtn.disabled = false;
    this.enterBtn.focus({ preventScroll: true });
    this.enterBtn.addEventListener("click", () => {
      this.root.classList.remove("is-intro");
      onEnter({ sound: this.sound });
    }, { once: true });
  }

  bindControls() {
    this.root.querySelectorAll("[data-scene-lofi]").forEach((b) => b.addEventListener("click", () => this.emit("lofi")));
    this.soundBtn.addEventListener("click", () => this.emit("sound", this.soundBtn.getAttribute("aria-pressed") !== "true"));
    this.q("[data-scene-back]").addEventListener("click", () => this.emit("back"));
    this.q("[data-scene-home]").addEventListener("click", (e) => { e.preventDefault(); this.emit("back"); });
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
    const build = { dev: () => this.devPanel(), shop: () => this.shopPanel(), about: () => this.aboutPanel(), contact: () => this.contactPanel(), lab: () => this.labPanel(), print: () => this.printPanel() }[view];
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
        h("h3", { class: "sp-h" }, d.work_h),
        h("ul", { class: "sp-list" }, d.work.map(([t, p]) => h("li", {}, h("h3", {}, t), h("p", {}, p))))),
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
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, s.pick),
        h("ul", { class: "sp-products" }, this.productButtons.map((b) => h("li", {}, b)))),
      this.card,
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
    const primary = h("a", { class: "btn btn-primary", href: p.primary_href, rel: p.stripe ? "noopener" : null }, p.primary_label);
    const card = h("article", { class: "sp-card", "aria-labelledby": "sp-card-h" },
      p.image ? h("img", { class: "sp-card-img", src: p.image, alt: p.image_alt, loading: "lazy" }) : null,
      h("p", { class: "status status-" + p.status }, p.status_label),
      h("h3", { id: "sp-card-h", tabindex: "-1" }, p.name),
      h("p", {}, p.tagline),
      h("p", { class: "price" }, p.price_label),
      h("div", { class: "sp-actions" },
        primary,
        h("a", { class: "btn btn-light", href: p.url }, p.view_label),
      ),
      p.site ? h("p", { class: "note" }, h("a", { href: p.site, rel: "noopener" }, p.site_label, h("span", { "aria-hidden": "true" }, " ↗"))) : null,
      h("p", { class: "note" }, h("a", { href: p.ask_href }, p.ask_label), " · ", this.data.shop.shipping));
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
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, a.explore_h),
        h("ul", { class: "sp-doors" }, a.explore.map((x) => h("li", {},
          h("a", { href: "#" + hash[x.view] }, h("span", { class: "dh" }, x.h, h("span", { "aria-hidden": "true" }, " →")), h("span", { class: "dp" }, x.p)))))),
      h("div", { class: "sp-section" },
        h("h3", { class: "sp-h" }, a.projects_h),
        h("ul", { class: "sp-list" }, a.projects.map(([n, u, d]) => h("li", {},
          h("h3", {}, h("a", { class: "sp-link", href: u, rel: "noopener" }, n, h("span", { "aria-hidden": "true" }, " ↗"))), h("p", {}, d))))),
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
      c.whatsapp ? h("p", {}, h("a", { class: "sp-link", href: "https://wa.me/" + c.whatsapp }, "WhatsApp")) : null,
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
  printPanel() { return this.itemsPanel(this.data.print); }
}
