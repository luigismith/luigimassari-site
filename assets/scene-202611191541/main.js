// "Il banco": home 3D di luigimassari.com. Caricato solo quando serve (import dinamico da site.js).
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createRoom } from "./room.js";
import { createDesk, createLamp, createObjects, mergeStatic } from "./desk-objects.js";
import { createExtras } from "./desk-extras.js";
import { CameraRig } from "./camera-rig.js";
import { setAnisotropy } from "./textures.js";
import { UI } from "./ui.js";
import { SceneAudio } from "./audio.js";
import { LiveMode } from "./live.js";
import { heavens } from "./sky.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const VIEWS = {
  overview: { pos: V(-0.64, 1.6, 2.02), target: V(-0.02, 1.02, -0.14), fov: 41 },
  dev: { pos: V(-0.06, 1.24, 1.5), target: V(-0.15, 1.07, -0.2), fov: 40 },
  print: { pos: V(-0.5, 1.28, 1.0), target: V(-0.9, 0.95, 0.08), fov: 40 },
  shop: { pos: V(0.64, 1.42, 1.0), target: V(0.64, 0.8, -0.08), fov: 40 },     // anche Stame, appoggiato al gradino
  about: { pos: V(0.2, 1.2, 0.68), target: V(0.245, 0.77, 0.21), fov: 40 },
  contact: { pos: V(0.84, 1.1, 0.86), target: V(0.95, 0.79, 0.27), fov: 38 },
  laser: { pos: V(-0.38, 1.16, 0.6), target: V(-0.5, 0.77, -0.01), fov: 36 },
  game: { pos: V(-0.05, 1.08, 0.78), target: V(-0.125, 0.77, 0.335), fov: 34 },
  lab: { pos: V(0.02, 1.36, 0.1), target: V(1.3, 1.33, -0.2), fov: 42 },
};

// vignettatura e grana leggere, dopo l'OutputPass (spazio sRGB)
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: 1.6 }, uVig: { value: 0.5 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uAspect; uniform float uVig; varying vec2 vUv;
    float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec2 d = vUv - 0.5;
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = d * vec2(uAspect, 1.0);
      c.rgb *= mix(uVig, 1.0, smoothstep(1.05, 0.25, length(q)));
      c.rgb += (h(gl_FragCoord.xy + fract(uTime * 7.3) * 431.0) - 0.5) * 0.022;
      gl_FragColor = c;
    }`,
};

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export async function start({ data, root, force, toLofi }) {
  const ui = new UI(root, data);
  ui.progress(0.3);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const debug = new URLSearchParams(location.search).has("debug");

  // --- renderer ---
  const holder = root.querySelector("[data-scene-canvas]");
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", stencil: false });
  let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.shadowMap.enabled = true;
  // PCFSoftShadowMap e' stato rimosso in Three r18x (ora ricade su PCF con un avviso):
  // PCFShadowMap con shadow.radius da' la stessa ombra morbida.
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // le mappe delle ombre si rifanno solo quando serve (vedi refreshShadows)
  holder.appendChild(renderer.domElement);
  setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050608);
  const camera = new THREE.PerspectiveCamera(VIEWS.overview.fov, 1.6, 0.03, 60);
  const rig = new CameraRig(camera, VIEWS, { reducedMotion: reduced });

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.14;
  pmrem.dispose();

  // --- font per le texture ---
  await Promise.all([
    document.fonts.load('800 60px "Archivo Variable"'),
    document.fonts.load('600 30px "Archivo Variable"'),
  ]).catch(() => {});
  ui.progress(0.38);
  await nextFrame();

  // --- scena ---
  const ctx = { ui: data.ui, data, renderer };
  const room = createRoom(ctx);
  scene.add(room.group);
  ui.progress(0.55);
  await nextFrame();
  const desk = createDesk();
  scene.add(desk.group);
  const lamp = createLamp();
  scene.add(lamp.group);
  ui.progress(0.6);
  await nextFrame();
  const objects = await createObjects(ctx, desk.woodMap, (f) => ui.progress(0.6 + f * 0.3));
  scene.add(objects.group);
  const extras = createExtras(data);
  scene.add(extras.group);
  mergeStatic(desk.group);
  mergeStatic(room.group);
  mergeStatic(lamp.group);
  await nextFrame();

  // --- post-processing ---
  const size = new THREE.Vector2(1, 1);
  const frameCtx = { heightPx: 800 };
  // MSAA: 4 campioni a densita' 1x; sugli schermi ad alta densita' ne bastano 2
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: dpr > 1.25 ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const outline = new OutlinePass(new THREE.Vector2(256, 256), scene, camera);
  outline.edgeStrength = 3.2; outline.edgeGlow = 0.6; outline.edgeThickness = 1.2;
  outline.visibleEdgeColor.set(0xf2a33a); outline.hiddenEdgeColor.set(0x3a2410);
  outline.enabled = false;
  composer.addPass(outline);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.72, 0.55, 1.35);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);

  // --- tema: scuro = notte (la luce di sempre), chiaro = giorno coperto, "dal vivo" = sole e meteo veri ---
  // Un "aspetto" e' { day, rain, cloud, warm } (vedi room.setSky). I due temi fissi sono due aspetti costanti;
  // nella modalita' "dal vivo" l'aspetto arriva da live.js, che calcola il sole e legge il meteo.
  const html = document.documentElement;
  const FIXED = { dark: { day: 0, rain: 1, cloud: 0.66, warm: 0 }, light: { day: 1, rain: 1, cloud: 1, warm: 0 } };
  const themeMode = () => (html.dataset.themeMode === "live" ? "live" : html.dataset.theme === "light" ? "light" : "dark");
  const BG_NIGHT = new THREE.Color(0x050608), BG_DAY = new THREE.Color(0xdfe3e0);
  let look = null, rendered = false, fadeTimer = 0, fadeTo = null;
  function applyLook(s) {
    look = s;
    const L = THREE.MathUtils.lerp, k = s.day;
    room.setSky(s);
    renderer.toneMappingExposure = L(1.45, 1.0, k);
    bloom.strength = L(0.72, 0.25, k);
    bloom.threshold = L(1.35, 2.2, k);
    finish.uniforms.uVig.value = L(0.5, 0.86, k);
    lamp.spot.intensity = L(1.7, 1.0, k);
    scene.background.lerpColors(BG_NIGHT, BG_DAY, k);
    // "dal vivo": anche le scritte sopra la scena passano al chiaro quando fuori e' giorno
    if (themeMode() === "live") { if (k > 0.5) html.dataset.theme = "light"; else delete html.dataset.theme; }
  }
  // cambio netto (tema, arrivo del meteo): la scena sfuma un attimo, cambia e riappare, cosi' non si vede lo scatto
  function fadeLook(s) {
    if (reduced || !rendered || root.hidden) { applyLook(s); return; }
    fadeTo = s;
    if (fadeTimer) return;
    root.classList.add("is-switching");
    fadeTimer = setTimeout(() => {
      fadeTimer = 0;
      applyLook(fadeTo);
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("is-switching")));
    }, 260);
  }
  // in ?debug l'orologio si puo' fissare (window.__lmNow = istante in millisecondi o data ISO): serve alle verifiche
  const clock = () => (debug && window.__lmNow ? new Date(window.__lmNow) : new Date());
  let spoken = "";
  const live = new LiveMode({
    clock,
    onChange(s) {
      const { text, lines } = ui.setWeather(s), key = s.kind + "|" + s.temp + "|" + s.where;
      room.setProjection(lines);   // il meteo si legge sul vetro della finestra
      updateHeavens(s.day);
      if (s.weather === "ok" && key !== spoken) { spoken = key; ui.announce(text); } // si annuncia quando cambia il tempo, non a ogni minuto
      const jump = !look || Math.abs(look.day - s.day) > 0.12 || Math.abs(look.rain - s.rain) > 0.2 || Math.abs(look.cloud - s.cloud) > 0.3;
      if (jump) fadeLook(s); else if (fadeTimer) fadeTo = s; else applyLook(s);
    },
  });
  // cielo vero (stelle e Luna, vedi sky.js): solo "dal vivo" e solo quando fuori non e' giorno pieno
  function updateHeavens(day = look ? look.day : 1) {
    const on = themeMode() === "live" && live.active && day < 0.98;
    room.setHeavens(on ? heavens(clock(), live.place.lat, live.place.lon) : null);
  }
  setInterval(() => { if (themeMode() === "live" && !root.hidden) updateHeavens(); }, 15000);   // le stelle si spostano piano: basta ogni 15 secondi
  function setTheme(mode, { ask = false } = {}) {
    if (mode === "live") { live.start({ ask }); return; }
    live.stop();
    spoken = "";
    ui.setWeather(null);
    room.setProjection(null);
    room.setHeavens(null);
    const next = FIXED[mode];
    if (look !== next) fadeLook(next);
  }
  setTheme(themeMode());
  // la scelta del visitatore arriva da site.js; solo qui, e solo per "dal vivo", il browser puo' chiedere la posizione
  let themeDirty = false;
  window.addEventListener("lm-theme", (e) => {
    if (root.hidden) { themeDirty = true; return; } // scena nascosta (versione classica): si applica al rientro, senza chiedere nulla
    setTheme(e.detail === "live" || e.detail === "light" ? e.detail : "dark", { ask: true });
  });

  function resize() {
    const w = holder.clientWidth || window.innerWidth, h = holder.clientHeight || window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    rig.setSize(w, h);
    finish.uniforms.uAspect.value = w / h;
    size.set(w, h);
    frameCtx.heightPx = h * dpr;
    if (state.view !== "overview") rig.setShift(panelShift());
  }

  // --- oggetti cliccabili: scatole invisibili attorno a ogni sezione ---
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hits = [];
  // skip: nomi dei pezzi da non contare nel riquadro (la tastiera davanti al monitor coprirebbe il tablet del profilo)
  function addHit(obj, view, slug = null, skip = []) {
    obj.updateMatrixWorld(true);
    const b = new THREE.Box3();
    if (!skip.length) b.setFromObject(obj);
    else obj.traverse((o) => {
      if (!o.isMesh) return;
      for (let p = o; p && p !== obj; p = p.parent) if (skip.includes(p.name)) return;
      b.expandByObject(o);
    });
    b.expandByScalar(0.01);
    const s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), hitMat);
    m.position.copy(c);
    m.userData = { view, slug, obj, top: V(c.x, b.max.y, c.z) };
    scene.add(m);
    hits.push(m);
  }
  addHit(objects.sections.dev, "dev", null, ["keyboard"]);
  addHit(extras.printer, "print");
  addHit(objects.sections.about, "about");
  addHit(objects.sections.contact, "contact");
  addHit(extras.board, "lab");
  addHit(extras.headphones, "sound"); // non e' una sezione: la cuffia accende e spegne il suono
  addHit(extras.laser, "laser");      // i pezzi tagliati al laser: la scheda del taglio laser
  addHit(extras.handheld, "game");    // la console portatile: la scheda Videogames
  for (const s of objects.synths) addHit(s.group, "shop", s.product.slug);

  // --- etichette sempre visibili sugli oggetti: link veri, solo nella vista d'insieme ---
  const tagLayer = root.querySelector("[data-scene-tags]");
  const tags = [];
  tagLayer.inert = true;
  function addTag(view, point, lead) {
    const a = document.createElement("a");
    a.className = "scene-tag";
    a.href = "#" + data.hash[view];
    a.textContent = data.ui.labels[view];
    a.style.setProperty("--lead", lead + "px");
    tagLayer.appendChild(a);
    tags.push({ a, point });
  }
  const hitOf = (view) => hits.filter((m) => m.userData.view === view);
  addTag("dev", hitOf("dev")[0].userData.top, 26);
  addTag("print", hitOf("print")[0].userData.top, 24);
  const synthTops = hitOf("shop").map((m) => m.userData.top);
  addTag("shop", synthTops.reduce((acc, p) => acc.add(p), V(0, 0, 0)).multiplyScalar(1 / synthTops.length).setY(Math.max(...synthTops.map((p) => p.y))), 44);
  { // la lavagna arriva quasi alla barra: la sua etichetta sta sotto, come una didascalia
    const h = hitOf("lab")[0];
    addTag("lab", V(h.position.x, h.position.y - h.geometry.parameters.height / 2 - 0.1, h.position.z), 0);
  }
  addTag("contact", hitOf("contact")[0].userData.top, 22);
  addTag("about", hitOf("about")[0].userData.top, 18);   // il tablet: Portfolio
  addTag("laser", hitOf("laser")[0].userData.top, 18);
  addTag("game", hitOf("game")[0].userData.top, 16);
  const tagPos = new THREE.Vector3();
  const TAG_MIN_Y = 132; // px dal bordo alto: barra (circa 80) + altezza dell'etichetta
  function updateTags() {
    const on = state.entered && state.view === "overview" && !rig.moving;
    if (tagLayer.classList.contains("on") !== on) { tagLayer.classList.toggle("on", on); tagLayer.inert = !on; }
    if (!on) return;
    for (const t of tags) {
      tagPos.copy(t.point).project(camera);
      // le etichette restano sotto la barra di navigazione anche quando la parallasse sposta l'inquadratura
      const x = (tagPos.x + 1) / 2 * size.x, y = Math.max((1 - tagPos.y) / 2 * size.y, TAG_MIN_Y);
      t.a.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  // --- stato e navigazione con hash ---
  const state = { view: "overview", entered: false, hover: null, nav: 0 };
  const viewByHash = Object.fromEntries(Object.entries(data.hash).map(([v, hsh]) => [hsh, v]));
  const hashView = () => viewByHash[decodeURIComponent(location.hash.slice(1))] || "overview";
  const products = Object.fromEntries(data.shop.products.map((p) => [p.slug, p]));
  // la scheda sta a sinistra: l'inquadratura si sposta a destra, al centro dello spazio libero
  // (non del tutto: come nell'apertura classica, l'oggetto puo' stare in parte sotto la velatura)
  const panelShift = () => -Math.min(0.2, (ui.panelRight() / 2 / Math.max(1, size.x)) * 0.7);
  const audio = new SceneAudio();

  async function goTo(view) {
    if (!state.entered) return;
    if (view === state.view) {
      if (view !== "overview" && !ui.panelOpen && !rig.moving) ui.openPanel(view);
      return;
    }
    const token = ++state.nav;
    state.view = view;
    ui.setView(view);
    ui.hideLabel();
    objects.recorder.setRecording(view === "contact");
    ui.closePanel();
    if (view === "overview") { await rig.go("overview", { shift: 0 }); return; }
    await rig.go(view, { shift: panelShift() });
    if (token !== state.nav) return;
    ui.openPanel(view);
  }
  function back() {
    const prev = state.view;
    if (prev === "overview") return;
    history.pushState(null, "", location.pathname + location.search);
    goTo("overview");
    const link = ui.navLinks.find((a) => a.dataset.view === prev);
    if (link) link.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", () => goTo(hashView()));
  window.addEventListener("popstate", () => goTo(hashView()));
  document.addEventListener("keydown", (e) => {
    if (document.querySelector("dialog.lightbox[open]")) return;   // Esc chiude prima la galleria di foto
    if (e.key === "Escape" && state.entered && !root.hidden) { e.preventDefault(); back(); }
  });

  function pick(slug, { play = true } = {}) {
    const p = products[slug];
    if (!p) return;
    if (play) audio.playSynth(slug);
    ui.showProduct(slug);
  }
  ui.on("pick", (slug) => pick(slug));
  ui.on("back", back);
  ui.on("lofi", () => toLofi());
  // il suono si comanda dal pulsante, dalla scelta all'ingresso e dalla cuffia sul banco: lo stato e' uno solo
  const setSound = (on) => {
    audio.setEnabled(on); ui.setSound(on); extras.headphones.userData.setOn(on);
    try { sessionStorage.setItem("lm-entered", on ? "1" : "0"); } catch (e) { /* storage bloccato */ }
  };
  ui.on("sound", setSound);
  ui.bindControls();

  // --- puntatore: hover e clic; l'inquadratura si sposta solo trascinando o con la rotella ---
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pointerDirty = false, pointerIn = false, downAt = null, lastAt = null, dragging = false;
  const canvas = renderer.domElement;
  const endDrag = () => { lastAt = null; if (dragging) { dragging = false; root.classList.remove("is-dragging"); pointerDirty = true; } };
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    pointerDirty = true; pointerIn = true;
    if (!lastAt || !state.entered) return;
    // oltre sei pixel dal punto di partenza e' un trascinamento, non un clic
    if (!dragging && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) { dragging = true; root.classList.add("is-dragging"); setHover(null); }
    if (dragging) rig.drag(e.clientX - lastAt[0], e.clientY - lastAt[1]);
    lastAt = [e.clientX, e.clientY];
  });
  canvas.addEventListener("pointerleave", () => { pointerIn = false; setHover(null); });
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    downAt = lastAt = [e.clientX, e.clientY];
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* puntatore non catturabile */ }
  });
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("lostpointercapture", endDrag);
  canvas.addEventListener("wheel", (e) => { if (!state.entered) return; e.preventDefault(); rig.zoomBy(e.deltaY * (e.deltaMode === 1 ? 33 : 1)); }, { passive: false });
  canvas.addEventListener("dblclick", () => { if (!state.hover) rig.resetOrbit(); });   // doppio clic nel vuoto: l'inquadratura torna a posto
  canvas.addEventListener("pointerup", (e) => {
    const wasDrag = dragging;
    endDrag();
    if (wasDrag || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) { downAt = null; return; }
    downAt = null;
    const hit = state.hover;
    if (!hit || !state.entered) return;
    const { view, slug } = hit.userData;
    if (view === "sound") { setSound(!audio.enabled); return; }
    if (slug) {
      ui.selected = slug;
      if (state.view === "shop") pick(slug);
      else { audio.playSynth(slug); location.hash = data.hash.shop; }
      return;
    }
    if (view !== state.view) location.hash = data.hash[view];
  });

  function setHover(m) {
    if (state.hover === m) return;
    state.hover = m;
    root.classList.toggle("is-hover", !!m);
    outline.enabled = !!m;
    outline.selectedObjects = m ? [m.userData.obj] : [];
    if (!m) ui.hideLabel();
  }
  const tmp = new THREE.Vector3();
  function updateHover() {
    if (!state.entered || rig.moving || dragging) { if (state.hover) setHover(null); return; }
    if (pointerDirty && pointerIn) {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(hits, false)[0];
      setHover(hit ? hit.object : null);
      pointerDirty = false;
    }
    const m = state.hover;
    if (!m) return;
    const { view, slug, top } = m.userData;
    tmp.copy(top).project(camera);
    const x = (tmp.x + 1) / 2 * size.x, y = (1 - tmp.y) / 2 * size.y;
    if (slug && state.view === "shop") ui.showLabel(x, y, products[slug].name, products[slug].status_label);
    else if (view === "sound") ui.showLabel(x, y, audio.enabled ? data.ui.sound_on : data.ui.sound_off, audio.enabled ? data.ui.sound_hint_off : data.ui.sound_hint_on);
    else ui.hideLabel(); // per le sezioni ci sono gia' le etichette fisse
  }

  resize();
  new ResizeObserver(resize).observe(holder);
  renderer.compile(scene, camera);
  ui.progress(0.95);
  await nextFrame();

  // --- loop ---
  const timer = new THREE.Timer();
  let t = 0, running = false;
  const fps = { frames: 0, acc: 0, value: 0, samples: [] };
  // Le luci sono ferme e gli oggetti che fanno ombra non si muovono: le ombre si disegnano nei primi fotogrammi
  // e poi restano. Ridisegnarle a ogni fotogramma raddoppiava e triplicava le chiamate di disegno.
  let shadowFrames = 4;
  const refreshShadows = () => { shadowFrames = 4; };
  function frame(time) {
    rendered = true;
    if (shadowFrames > 0) { renderer.shadowMap.needsUpdate = true; shadowFrames--; }
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 0.1);
    t += dt;
    room.update(t);
    objects.update(t, dt, frameCtx);
    extras.update(t);
    rig.update(dt);
    updateHover();
    updateTags();
    finish.uniforms.uTime.value = t;
    composer.render(dt);
    fps.frames++; fps.acc += dt;
    if (fps.acc >= 0.5) {
      fps.value = fps.frames / fps.acc;
      fps.samples.push(fps.value);
      if (fps.samples.length > 8) fps.samples.shift();
      fps.frames = 0; fps.acc = 0;
      adapt();
    }
  }
  // se gli fps scendono, abbassa la risoluzione (fino a 1x)
  let lowStreak = 0;
  function adapt() {
    if (fps.value < 45 && dpr > 1) {
      if (++lowStreak >= 3) { dpr = Math.max(1, dpr - 0.25); resize(); lowStreak = 0; }
    } else lowStreak = 0;
  }
  function run(on) {
    if (on === running) return;
    running = on;
    if (on) { timer.reset(); renderer.setAnimationLoop(frame); } else renderer.setAnimationLoop(null);
  }
  document.addEventListener("visibilitychange", () => {
    const visible = !document.hidden && !root.hidden;
    run(visible);
    audio.setVisible(visible);
    if (visible) live.resume(); else live.pause();
  });

  // primo secondo di render: sotto i 30 fps si passa da soli alla versione Lo-Fi
  async function measureFirstSecond() {
    for (let i = 0; i < 3; i++) await nextFrame(); // riscaldamento (shader, upload texture)
    const t0 = performance.now(); let n = 0;
    while (performance.now() - t0 < 1000) { await nextFrame(); n++; }
    return n / ((performance.now() - t0) / 1000);
  }

  run(true);
  ui.progress(1);
  // sotto i 30 fps nel primo secondo si passa alla versione classica; un singhiozzo iniziale
  // (shader, texture, GPU occupata) non basta: si conferma con un secondo in piu'
  let firstFps = await measureFirstSecond();
  if (firstFps < 30 && !force) firstFps = Math.max(firstFps, await measureFirstSecond());
  const api = {
    pause() { run(false); audio.setVisible(false); live.pause(); },
    resume() {
      run(true); audio.setVisible(true);
      if (themeDirty) { themeDirty = false; setTheme(themeMode()); } else live.resume(); // tema cambiato dalla versione classica
    },
    get fps() { return fps.value; },
    firstFps,
  };
  if (debug) window.__banco = { api, renderer, scene, camera, rig, VIEWS, fps, composer, objects, state, audio, refreshShadows, live, get look() { return look; } };
  if (firstFps < 30 && !force) {
    run(false);
    toLofi({ auto: true, message: data.ui.too_slow });
    return api;
  }
  ui.ready(({ sound, auto }) => {
    state.entered = true;
    if (auto && sound) {
      // senza un gesto il browser non lascia partire l'audio: il suono resta scelto e parte al primo tocco o tasto
      // (in cattura, prima del clic: toccare subito la cuffia la spegne, come ci si aspetta)
      ui.setSound(true);
      extras.headphones.userData.setOn(true);
      const start = () => { removeEventListener("pointerdown", start, true); removeEventListener("keydown", start, true); audio.setEnabled(true); };
      addEventListener("pointerdown", start, true);
      addEventListener("keydown", start, true);
    } else {
      audio.setEnabled(sound);
      ui.setSound(sound);
    }
    ui.setView("overview");
    // si arriva sulla plancia (il banco intero con le sezioni); un hash nell'URL apre subito quella sezione
    const v = hashView();
    if (v !== "overview") goTo(v);
    else root.focus({ preventScroll: true });
  });
  return api;
}
