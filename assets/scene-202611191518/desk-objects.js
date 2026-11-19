// Banco da lavoro e oggetti sopra. Tutta la geometria e' costruita in codice.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createIchosynth } from "./ichosynth.js";
import { createStame } from "./stame.js";
import { createEremo } from "./eremo.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  woodTextures, noiseRoughness, CodeScreen, tabletTexture, panelTextures, panelEmissive,
  canvas, tex, FONT,
} from "./textures.js";

export const DESK = { y: 0.75, w: 2.2, d: 0.8, x0: -1.1, x1: 1.1, z0: -0.4, z1: 0.4 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// --- utilita' ---------------------------------------------------------------
const _up = new THREE.Vector3(0, 1, 0);
export function rod(a, b, r, mat, seg = 16) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(_up, dir.normalize());
  return m;
}
export function shadow(o, cast = true, receive = true) {
  o.traverse((c) => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; } });
  return o;
}
// Unisce le mesh statiche in poche mesh (meno chiamate di disegno: ognuna si paga tre volte, colore e due ombre).
// - Stesso materiale: una mesh sola.
// - Materiali diversi ma "semplici" (solo colore, ruvidezza e metallo): una mesh sola per aspetto, con il colore
//   scritto sui vertici. Ruvidezza e metallo si arrotondano a passi che a occhio non si distinguono.
// Restano separati: InstancedMesh, Points, materiali multipli e tutto cio' che sta sotto un nodo con userData.dynamic.
const lookMats = new Map();
const lookR = (r) => (r < 0.36 ? 0.3 : r < 0.66 ? 0.5 : 0.85);   // lucido, satinato, opaco
const lookM = (m) => (m < 0.3 ? 0.05 : m < 0.8 ? 0.55 : 1);       // plastica, verniciato metallizzato, metallo
const plain = (m) => m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && !m.map && !m.normalMap && !m.roughnessMap && !m.metalnessMap
  && !m.emissiveMap && !m.alphaMap && !m.transparent && m.opacity === 1 && m.emissive.getHex() === 0 && m.side === THREE.FrontSide
  && !m.vertexColors && !m.flatShading;
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    const m = o.material, flags = (o.castShadow ? "c" : "") + (o.receiveShadow ? "r" : "");
    const key = plain(m) ? "look|" + lookR(m.roughness) + "|" + lookM(m.metalness) + flags : m.uuid + flags;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });
  const m4 = new THREE.Matrix4();
  for (const [key, list] of buckets) {
    if (list.length < 2) continue;
    const byLook = key.startsWith("look|");
    const geos = list.map((m) => {
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (byLook) { // il colore del materiale passa sui vertici
        const n = g.attributes.position.count, col = new Float32Array(n * 3), c = m.material.color;
        for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      }
      g.morphAttributes = {};
      g.clearGroups();
      g.applyMatrix4(m4.multiplyMatrices(inv, m.matrixWorld));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    let material = list[0].material;
    if (byLook) {
      const lk = key.split("|").slice(0, 3).join("|");
      if (!lookMats.has(lk)) lookMats.set(lk, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: lookR(material.roughness), metalness: lookM(material.metalness) }));
      material = lookMats.get(lk);
    }
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow;
    root.add(mesh);
    for (const m of list) m.removeFromParent();
    for (const g of geos) g.dispose();
  }
  return root;
}

export function box(w, h, d, mat, r = 0.004, seg = 2) {
  return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)), mat);
}

// --- banco ------------------------------------------------------------------
export function createDesk() {
  const g = new THREE.Group();
  g.name = "desk";
  const wood = woodTextures();
  const top = new THREE.Mesh(
    new RoundedBoxGeometry(DESK.w, 0.05, DESK.d, 3, 0.012),
    new THREE.MeshStandardMaterial({ map: wood.map, roughnessMap: wood.roughnessMap, roughness: 0.78, metalness: 0 })
  );
  top.position.set(0, DESK.y - 0.025, 0);
  top.receiveShadow = true; top.castShadow = true;
  g.add(top);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.5, metalness: 0.6 });
  for (const x of [DESK.x0 + 0.07, DESK.x1 - 0.07]) {
    for (const z of [DESK.z0 + 0.07, DESK.z1 - 0.07]) {
      const leg = box(0.05, DESK.y - 0.05, 0.05, legMat, 0.008);
      leg.position.set(x, (DESK.y - 0.05) / 2, z);
      g.add(leg);
    }
    const stretcher = box(0.04, 0.04, DESK.d - 0.14, legMat, 0.006);
    stretcher.position.set(x, 0.18, 0);
    g.add(stretcher);
  }
  const apron = box(DESK.w - 0.1, 0.08, 0.02, legMat, 0.006);
  apron.position.set(0, DESK.y - 0.09, DESK.z1 - 0.06);
  g.add(apron);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(DESK.w - 0.06, 0.004, 0.004), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 1.2, 0.4) }));
  edge.position.set(0, DESK.y - 0.052, DESK.z1 - 0.003);
  g.add(edge);
  return { group: g, woodMap: wood.map };
}

// --- lampada: barra LED su stelo sottile ---------------------------------------
export function createLamp() {
  const g = new THREE.Group();
  g.name = "lamp";
  const metal = new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.35, metalness: 0.85 });
  const base = V(-0.99, DESK.y, -0.3);
  const barA = V(-0.99, 1.56, -0.3), barB = V(-0.16, 1.56, -0.1);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.012, 40), metal);
  foot.position.copy(base).add(V(0, 0.006, 0));
  g.add(foot, rod(base, barA, 0.008, metal), rod(barA, barB, 0.011, metal, 12));
  // striscia luminosa sotto la barra: e' lei che fa bloom
  const dir = new THREE.Vector3().subVectors(barB, barA);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, dir.length() * 0.72), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 1.2) }));
  strip.position.copy(barA).addScaledVector(dir, 0.6).add(V(0, -0.012, 0));
  strip.lookAt(strip.position.clone().add(dir));
  g.add(strip);
  shadow(g, true, true);
  strip.castShadow = false;

  // unica luce calda forte
  const spot = new THREE.SpotLight(0xffd0a0, 1.7, 4.5, 0.85, 0.8, 2);
  spot.position.copy(strip.position).add(V(0, -0.012, 0));
  spot.target.position.set(-0.2, DESK.y, 0.04);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0003;
  spot.shadow.normalBias = 0.012;
  spot.shadow.radius = 5;
  spot.shadow.camera.near = 0.05;
  spot.shadow.camera.far = 3.2;
  g.add(spot, spot.target);
  const bounce = new THREE.PointLight(0xffb070, 0.22, 1.6, 2);
  bounce.position.set(-0.3, 1.3, 0.25);
  g.add(bounce);
  return { group: g, spot, bulb: strip, head: strip };
}

// ---------------------------------------------------------------------------
// Materiali condivisi
// ---------------------------------------------------------------------------
function materials(woodMap) {
  return {
    black: new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5, metalness: 0.2 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.55, metalness: 0.05 }),
    graphite: new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: 0.42, metalness: 0.55 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xb5babd, roughness: 0.32, metalness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8e9399, roughness: 0.28, metalness: 1 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc89b4a, roughness: 0.35, metalness: 1 }),
    silk: new THREE.MeshStandardMaterial({ color: 0xe9ece6, roughness: 0.5 }),
    knob: new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.38, metalness: 0.15 }),
    knobCap: new THREE.MeshStandardMaterial({ color: 0x9aa1a6, roughness: 0.42, metalness: 1 }),
    ledOff: new THREE.MeshStandardMaterial({ color: 0x4a2622, roughness: 0.25 }),
    wood: new THREE.MeshStandardMaterial({ map: woodMap, color: 0xc9a27e, roughness: 0.55 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18 }),
  };
}

// geometrie condivise per le manopole (raggio 1, altezza 1, poi in scala)
const KNOB_BODY = new THREE.CylinderGeometry(0.86, 1, 1, 40);
const KNOB_SKIRT = new THREE.CylinderGeometry(1.18, 1.22, 0.18, 40);
const KNOB_CAP = new THREE.CylinderGeometry(0.66, 0.66, 0.06, 32);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

export function knob3d(M, r, h, angleDeg) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(KNOB_BODY, M.knob);
  body.scale.set(r, h, r); body.position.y = h / 2;
  const skirt = new THREE.Mesh(KNOB_SKIRT, M.knob);
  skirt.scale.set(r, h, r); skirt.position.y = h * 0.09;
  const cap = new THREE.Mesh(KNOB_CAP, M.knobCap);
  cap.scale.set(r, h, r); cap.position.y = h + h * 0.03;
  const line = new THREE.Mesh(UNIT_BOX, M.silk);
  const a = THREE.MathUtils.degToRad(angleDeg - 90);
  line.scale.set(r * 0.62, h * 0.08, r * 0.14);
  line.position.set(Math.cos(a) * r * 0.45, h + h * 0.07, Math.sin(a) * r * 0.45);
  line.rotation.y = -a;
  g.add(body, skirt, cap, line);
  return g;
}

// ---------------------------------------------------------------------------
// Monitor con codice vivo + tastiera
// ---------------------------------------------------------------------------
function createMonitor(M, data) {
  const g = new THREE.Group();
  g.name = "monitor";
  // pannello trasparente (come un OLED trasparente): attraverso lo schermo si intravede la vetrata
  const sw = 0.8, sh = 0.5;
  const code = new CodeScreen(1280, 800, data.ui.assistant);
  const head = new THREE.Group();
  head.position.set(0, 0.075 + sh / 2, -0.03);
  head.rotation.x = -0.05;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.35, metalness: 0.85 });
  const ft = 0.007;
  for (const [w, h, x, y] of [[sw + ft * 2, ft, 0, sh / 2 + ft / 2], [sw + ft * 2, ft * 2.4, 0, -sh / 2 - ft * 1.2], [ft, sh, -sw / 2 - ft / 2, 0], [ft, sh, sw / 2 + ft / 2, 0]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), frameMat);
    bar.position.set(x, y, 0);
    head.add(bar);
  }
  const glass = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.004),
    new THREE.MeshBasicMaterial({ color: 0x050b12, transparent: true, opacity: 0.34, depthWrite: false })); // velatura senza riflessi
  glass.renderOrder = 1;
  head.add(glass);
  // lo sfondo della texture e' semitrasparente (vedi CodeScreen): testo pieno, fondo che lascia intravedere
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh),
    new THREE.MeshBasicMaterial({ map: code.texture, color: new THREE.Color(1.5, 1.5, 1.5), transparent: true, depthWrite: false }));
  screen.position.set(0, 0, 0.0035);
  screen.renderOrder = 2;
  head.add(screen);
  const pled = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 10, 8), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xf2a33a, emissiveIntensity: 6 }));
  pled.position.set(sw / 2 - 0.012, -sh / 2 - ft * 1.2, 0.0065);
  head.add(pled);
  g.add(head);
  const neck = box(0.07, 0.085, 0.014, frameMat, 0.004);
  neck.position.set(0, 0.045, -0.04);
  g.add(neck);
  const foot = box(0.3, 0.01, 0.17, frameMat, 0.004);
  foot.position.set(0, 0.005, -0.03);
  g.add(foot);
  // tastiera
  const kb = new THREE.Group();
  kb.name = "keyboard";
  kb.userData.dynamic = true;   // resta un gruppo a se': il riquadro cliccabile del monitor la esclude
  const kbBase = box(0.4, 0.016, 0.135, M.plastic, 0.005, 2);
  kbBase.position.y = 0.008;
  kb.add(kbBase);
  const keyGeo = new RoundedBoxGeometry(0.0225, 0.008, 0.0215, 2, 0.003);
  // retroilluminazione appena accennata
  const keys = new THREE.InstancedMesh(keyGeo, new THREE.MeshStandardMaterial({ color: 0x2f353c, roughness: 0.6, emissive: 0x6a4a12, emissiveIntensity: 0.08 }), 4 * 14 + 1);
  const m4 = new THREE.Matrix4();
  let n = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) {
    m4.makeTranslation(-0.183 + c * 0.0262 + (r % 2) * 0.006, 0.019, -0.045 + r * 0.025);
    keys.setMatrixAt(n++, m4);
  }
  keys.setMatrixAt(n++, new THREE.Matrix4().compose(V(0, 0.019, 0.055), new THREE.Quaternion(), V(5.5, 1, 1)));
  kb.add(keys);
  kb.position.set(-0.06, 0, 0.29);
  kb.rotation.y = 0;            // dritta, parallela al bordo del banco come il monitor
  g.add(kb);
  const glow = new THREE.PointLight(0x8fb2e8, 0.5, 1.4, 2);
  glow.position.set(0, 0.22, 0.25);
  g.add(glow);
  shadow(g);
  screen.castShadow = false; glass.castShadow = false;
  return { group: g, screen, update: (t, dt) => code.update(dt) };
}

// ---------------------------------------------------------------------------
// Tablet con il profilo e i lavori in corso (schermo che si illumina da solo)
// ---------------------------------------------------------------------------
function createTablet(M, data) {
  const g = new THREE.Group();
  g.name = "tablet";
  const w = 0.16, d = w * 1088 / 768, t = 0.0075;
  const body = box(w + 0.012, t, d + 0.012, new THREE.MeshStandardMaterial({ color: 0x1a1f26, roughness: 0.35, metalness: 0.6 }), 0.006, 3);
  body.position.y = t / 2;
  g.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tabletTexture(data.about), color: new THREE.Color(1.25, 1.25, 1.25) }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.y = t + 0.0004;
  g.add(screen);
  // bordo luminoso sottile, come un dispositivo acceso
  const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.0125, 0.0008, d + 0.0125), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.55, 0.15) }));
  edge.position.y = t * 0.55;
  g.add(edge);
  // stilo
  const stylus = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.13, 20), M.alu);
  barrel.rotation.z = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0038, 0.014, 20), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.5 }));
  tip.rotation.z = -Math.PI / 2; tip.position.x = 0.072;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.65, 0.2) }));
  ring.rotation.z = Math.PI / 2; ring.position.x = -0.05;
  stylus.add(barrel, tip, ring);
  stylus.position.set(w / 2 + 0.03, 0.0038, 0.01);
  stylus.rotation.y = 1.2;
  g.add(stylus);
  shadow(g);
  screen.castShadow = false; edge.castShadow = false;
  return { group: g, screen };
}

// ---------------------------------------------------------------------------
// Synth Elettrofoni: il frontale e' lo stesso SVG di build.py (panel_svg)
// ---------------------------------------------------------------------------
const SYNTH_SIZE = { groove: [0.32, 0.05], tft: [0.2, 0.038], oled: [0.24, 0.042], knobs: [0.27, 0.046] };

async function createSynth(M, product, ledMats) {
  const [w, h] = SYNTH_SIZE[product.panel] || [0.25, 0.04];
  const d = w * 380 / 600;
  const g = new THREE.Group();
  g.name = "synth-" + product.slug;
  const inner = new THREE.Group();
  g.add(inner);
  const caseM = box(w + 0.012, h, d + 0.012, M.graphite, 0.006, 3);
  caseM.position.y = h / 2;
  inner.add(caseM);
  for (const sx of [-1, 1]) {
    const cheek = box(0.014, h + 0.012, d + 0.022, M.wood, 0.004, 2);
    cheek.position.set(sx * (w / 2 + 0.013), (h + 0.012) / 2, 0);
    inner.add(cheek);
  }
  const { canvas: pc, map, scale } = await panelTextures(product.svg, 2);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({
    map, emissiveMap: panelEmissive(pc, product.meta, scale), emissive: 0xffffff, emissiveIntensity: 2.2, roughness: 0.48, metalness: 0.35,
  }));
  panel.rotation.x = -Math.PI / 2;
  const top = h + 0.0006;
  panel.position.y = top;
  inner.add(panel);
  const at = (x, y) => V((x / 600 - 0.5) * w, top, (y / 380 - 0.5) * d);
  const k = w / 600;
  let lit = 0;
  for (const m of product.meta) {
    if (m.kind === "knob") {
      const kn = knob3d(M, m.r * k * 0.98, Math.max(0.008, m.r * k * 0.75), m.angle);
      kn.position.copy(at(m.x, m.y));
      inner.add(kn);
    } else if (m.kind === "led") {
      const mat = m.on ? ledMats[(lit++ + product.slug.length) % ledMats.length] : M.ledOff;
      const led = new THREE.Mesh(new THREE.SphereGeometry(m.r * k * 1.05, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      led.position.copy(at(m.x, m.y));
      led.scale.y = 0.7;
      inner.add(led);
    } else if (m.kind === "jack") {
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(11 * k, 11 * k, 0.003, 6), M.steel);
      nut.position.copy(at(m.x, m.y)).add(V(0, 0.0015, 0));
      inner.add(nut);
    }
  }
  // il frontale si inclina appena verso chi guarda
  inner.rotation.x = 0.07;
  inner.position.y = (d / 2) * Math.sin(0.07) + 0.004;
  shadow(g);
  const jacks = product.meta.filter((m) => m.kind === "jack").map((m) => at(m.x, m.y));
  return { group: g, inner, jacks, w, d, h, product };
}

// ---------------------------------------------------------------------------
// Registratore a cassette portatile (da reportage, senza marchi)
// ---------------------------------------------------------------------------
// Contatti: una segreteria telefonica anni '90. A sinistra la cornetta sulla sua base, con il filo a spirale;
// a destra la microcassetta dei messaggi (i rocchetti girano), il display rosso con il numero dei messaggi, la spia
// che lampeggia, il tasto PLAY, la tastiera numerica e l'altoparlante. Nella vista Contatti registra: i rocchetti
// corrono e la spia resta accesa.
function answerTopTexture(label) {
  const c = canvas(920, 680), x = c.getContext("2d");
  x.fillStyle = "#2b2e33"; x.fillRect(0, 0, 920, 680);
  // incavo della cornetta
  x.fillStyle = "#1d1f23"; x.beginPath(); x.roundRect(28, 30, 330, 620, 60); x.fill();
  // altoparlante: una griglia di fori
  x.fillStyle = "#15171a";
  for (let r = 0; r < 7; r++) for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(440 + k * 22, 470 + r * 22, 6, 0, Math.PI * 2); x.fill(); }
  // cornice della cassetta e del display
  x.fillStyle = "#111316"; x.beginPath(); x.roundRect(560, 60, 320, 190, 14); x.fill();
  x.beginPath(); x.roundRect(410, 300, 170, 100, 10); x.fill();
  x.fillStyle = "#e9ece6"; x.font = `700 26px ${FONT}`; x.textAlign = "center";
  x.fillText("MESSAGGI", 495, 430);
  for (const [t, px, py] of [["PLAY", 700, 418], ["REC", 640, 258], ["ERASE", 760, 258]]) {
    x.font = `600 22px ${FONT}`; x.fillText(t, px, py);
  }
  x.font = `800 24px ${FONT}`; x.textAlign = "left"; x.fillStyle = "#c9ccc6";
  x.fillText(label.toUpperCase(), 400, 110);
  x.font = `500 15px ${FONT}`; x.fillStyle = "#8e949a";
  x.fillText("SEGRETERIA", 400, 136);
  return tex(c);
}
function digitsTexture(text) {
  const c = canvas(160, 90), x = c.getContext("2d");
  x.fillStyle = "#1a0503"; x.fillRect(0, 0, 160, 90);
  x.fillStyle = "#ff3b24"; x.font = `700 70px ui-monospace, Consolas, monospace`; x.textAlign = "center";
  x.fillText(text, 80, 72);
  return tex(c, { mips: false });
}

function createRecorder(M, label) {
  const g = new THREE.Group();
  g.name = "recorder";
  const W = 0.23, D = 0.17, H = 0.04;
  const shell = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.55, metalness: 0.15 });
  const body = box(W, H, D, shell, 0.008, 3);
  body.position.y = H / 2 + 0.003;
  g.add(body);
  const topY = H + 0.003 + 0.0006;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.008, D - 0.008), new THREE.MeshStandardMaterial({ map: answerTopTexture(label), roughness: 0.5, metalness: 0.2 }));
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = topY;
  g.add(plate);
  const pw = W - 0.008, pd = D - 0.008;
  const at = (px, py, y = topY) => V((px / 920 - 0.5) * pw, y, (py / 680 - 0.5) * pd);
  // la cornetta: impugnatura e le due capsule, posata nell'incavo
  const handsetMat = new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.42, metalness: 0.1 });
  const handset = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.1, 6, 16), handsetMat);
  grip.rotation.x = Math.PI / 2;
  grip.position.y = 0.019;
  handset.add(grip);
  for (const sz of [-1, 1]) {
    const cup = box(0.042, 0.022, 0.05, handsetMat, 0.009, 3);
    cup.position.set(0, 0.012, sz * 0.058);
    handset.add(cup);
    const holes = new THREE.Mesh(new THREE.CircleGeometry(0.012, 20), new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.8 }));
    holes.rotation.x = -Math.PI / 2;
    holes.position.set(0, 0.0232, sz * 0.058);
    handset.add(holes);
  }
  handset.position.copy(at(193, 340, topY - 0.001));
  g.add(handset);
  // il filo a spirale: dalla capsula davanti scende lungo il fianco ed entra nella base
  const start = handset.position.clone().add(V(-0.012, 0.006, 0.082)), coils = [];
  const path = new THREE.CatmullRomCurve3([start, V(-W / 2 - 0.012, topY - 0.01, D / 2 - 0.005), V(-W / 2 - 0.03, 0.006, D * 0.15), V(-W / 2 - 0.006, 0.012, -D * 0.25)]);
  const N = 420, turns = 46;
  for (let i = 0; i <= N; i++) {
    const t = i / N, p0 = path.getPointAt(t), tan = path.getTangentAt(t);
    const n1 = new THREE.Vector3().crossVectors(tan, V(0, 1, 0)); if (n1.lengthSq() < 1e-6) n1.set(1, 0, 0); n1.normalize();
    const n2 = new THREE.Vector3().crossVectors(tan, n1).normalize(), a = t * turns * Math.PI * 2;
    coils.push(p0.addScaledVector(n1, Math.cos(a) * 0.0045).addScaledVector(n2, Math.sin(a) * 0.0045));
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coils), 900, 0.0011, 5), handsetMat));
  // la microcassetta dei messaggi, dietro un vetro
  const glass = new THREE.Mesh(new THREE.PlaneGeometry((300 / 920) * pw, (170 / 680) * pd), M.glass);
  glass.rotation.x = -Math.PI / 2;
  glass.position.copy(at(720, 155, topY + 0.0016));
  g.add(glass);
  const cassette = new THREE.Mesh(new THREE.PlaneGeometry((260 / 920) * pw, (140 / 680) * pd), new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.6 }));
  cassette.rotation.x = -Math.PI / 2;
  cassette.position.copy(at(720, 155, topY + 0.0004));
  g.add(cassette);
  const hubs = [];
  for (const px of [660, 780]) {
    const hub = new THREE.Group();
    hub.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.0012, 6), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.5 })));
    hub.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.0016, 12), M.black));
    hub.position.copy(at(px, 155, topY + 0.0009));
    hub.userData.dynamic = true; // gira: non si unisce al resto
    g.add(hub);
    hubs.push(hub);
  }
  // display dei messaggi e spia
  const disp = new THREE.Mesh(new THREE.PlaneGeometry((150 / 920) * pw, (80 / 680) * pd), new THREE.MeshBasicMaterial({ map: digitsTexture("02"), color: new THREE.Color(1.6, 1.6, 1.6) }));
  disp.rotation.x = -Math.PI / 2;
  disp.position.copy(at(495, 350, topY + 0.0006));
  g.add(disp);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 12, 8), new THREE.MeshStandardMaterial({ color: 0x200404, emissive: 0xff2a14, emissiveIntensity: 2 }));
  led.position.copy(at(600, 350, topY + 0.001));
  led.userData.dynamic = true;
  g.add(led);
  // tasti: PLAY grande, REC ed ERASE, la tastiera numerica 3 x 4
  const keyMat = new THREE.MeshStandardMaterial({ color: 0xd9dcd8, roughness: 0.45 });
  const play = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.004, 24), new THREE.MeshStandardMaterial({ color: 0xff7a2a, roughness: 0.4, emissive: 0x8a2a00, emissiveIntensity: 0.4 }));
  play.position.copy(at(700, 350, topY + 0.002));
  g.add(play);
  for (const [px, color] of [[640, 0xc8261b], [760, 0x8e949a]]) {
    const k = box(0.016, 0.004, 0.009, new THREE.MeshStandardMaterial({ color, roughness: 0.45 }), 0.0015, 1);
    k.position.copy(at(px, 285, topY + 0.002));
    g.add(k);
  }
  const keys = new THREE.InstancedMesh(box(0.012, 0.004, 0.009, keyMat, 0.0015, 1).geometry, keyMat, 12), m4 = new THREE.Matrix4();
  for (let i = 0; i < 12; i++) keys.setMatrixAt(i, m4.makeTranslation(at(640 + (i % 3) * 70, 480 + Math.floor(i / 3) * 50, topY + 0.002)));
  g.add(keys);
  shadow(g);
  glass.castShadow = false;
  let spin = 0, rec = 0;
  return {
    group: g,
    setRecording(on) { rec = on ? 1 : 0; },
    update(t, dt) {
      spin += dt * (0.25 + rec * 5);
      hubs[0].rotation.y = spin; hubs[1].rotation.y = spin * 0.9;
      // nuovi messaggi: la spia lampeggia piano; registrando resta accesa
      led.material.emissiveIntensity = rec ? 3.2 : (Math.sin(t * 3.2) > 0 ? 2.6 : 0.15);
    },
  };
}

// ---------------------------------------------------------------------------
// Dettagli: saldatore con fumo, stagno, tazza, cavi patch, minuteria
// ---------------------------------------------------------------------------
const SMOKE_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime; uniform float uScale;
varying float vA;
void main() {
  float life = fract(uTime * 0.16 + aSeed);
  vec3 p = position;
  float h = life * 0.24;
  p.y += h;
  p.x += sin(life * 6.0 + aSeed * 20.0 + uTime * 0.6) * 0.022 * life + h * 0.18;
  p.z += cos(life * 5.0 + aSeed * 13.0) * 0.016 * life;
  vA = smoothstep(0.0, 0.12, life) * (1.0 - life) * 0.22;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.004 + life * 0.03) * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const SMOKE_FRAG = /* glsl */ `
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  gl_FragColor = vec4(vec3(0.62, 0.57, 0.52), smoothstep(0.5, 0.05, d) * vA);
}`;

function createSolderingStation(M) {
  // Saldatore nel suo supporto: base pesante con la spugna e la paglietta d'ottone, molla conica,
  // saldatore a stilo con flangia, impugnatura e cavo. L'asse della molla sta nel piano x-y.
  const g = new THREE.Group();
  g.name = "soldering";
  const dark = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.45, metalness: 0.4 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.8 });
  const base = box(0.118, 0.012, 0.078, dark, 0.005, 3);
  base.position.y = 0.006;
  const tray = box(0.052, 0.003, 0.037, M.black, 0.0025, 2);
  tray.position.set(-0.026, 0.0128, 0.016);
  const sponge = box(0.046, 0.007, 0.031, new THREE.MeshStandardMaterial({ color: 0xc9a23f, roughness: 1 }), 0.003, 2);
  sponge.position.set(-0.026, 0.0165, 0.016);
  g.add(base, tray, sponge);
  // paglietta d'ottone nel suo barattolo
  const potProf = [[0, 0], [0.017, 0], [0.0195, 0.02], [0.0168, 0.02], [0.0158, 0.004], [0, 0.004]].map(([r, h]) => new THREE.Vector2(r, h));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(potProf, 32), dark);
  pot.position.set(0.036, 0.012, 0.018);
  g.add(pot);
  [[2, 5, 0, 0.0215], [3, 4, 1.1, 0.0245], [2, 7, 2.3, 0.0275]].forEach(([pp, qq, rz, y]) => {
    const curl = new THREE.Mesh(new THREE.TorusKnotGeometry(0.0078, 0.002, 90, 5, pp, qq), M.brass);
    curl.rotation.set(Math.PI / 2, 0, rz);
    curl.scale.z = 0.55;
    curl.position.set(0.036, y, 0.018);
    g.add(curl);
  });
  // molla conica e i due sostegni
  const A = V(-0.03, 0.03, -0.02), B = V(0.045, 0.082, -0.02);
  const dir = new THREE.Vector3().subVectors(B, A);
  const len = dir.length();
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
  const TURNS = 19, pts = [];
  for (let i = 0; i <= 380; i++) {
    const t = i / 380, a = t * TURNS * Math.PI * 2, r = 0.0052 + t * 0.0058;
    pts.push(V(Math.cos(a) * r, t * len, Math.sin(a) * r).applyQuaternion(q).add(A));
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 760, 0.00075, 5), M.steel));
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.0112, 0.0012, 8, 28), M.steel);
  mouth.quaternion.setFromUnitVectors(V(0, 0, 1), dir);
  mouth.position.copy(B);
  g.add(mouth, rod(V(-0.03, 0.012, -0.02), V(-0.0285, 0.0256, -0.02), 0.0024, M.steel), rod(V(0.05, 0.012, -0.02), V(0.0514, 0.0728, -0.02), 0.0024, M.steel));
  // saldatore: y e' il suo asse, la punta verso -y
  const iron = new THREE.Group();
  const part = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; iron.add(m); return m; };
  part(new THREE.ConeGeometry(0.0022, 0.016, 14), new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.35, metalness: 0.9 }), -0.066).rotation.z = Math.PI;
  part(new THREE.CylinderGeometry(0.0032, 0.0028, 0.05, 14), M.steel, -0.033);
  part(new THREE.CylinderGeometry(0.0056, 0.0056, 0.004, 20), M.steel, -0.006);
  part(new THREE.CylinderGeometry(0.0092, 0.0058, 0.02, 24), rubber, 0.006);
  part(new THREE.CylinderGeometry(0.0086, 0.0092, 0.07, 24), rubber, 0.051);
  part(new THREE.CylinderGeometry(0.0068, 0.0086, 0.012, 24), rubber, 0.092);
  part(new THREE.CylinderGeometry(0.0028, 0.0052, 0.02, 14), M.black, 0.108);
  part(new THREE.TorusGeometry(0.0093, 0.0011, 8, 28), new THREE.MeshStandardMaterial({ color: 0xffb44a, roughness: 0.4, metalness: 0.5 }), 0.0165).rotation.x = Math.PI / 2;
  for (let k = 0; k < 5; k++) part(new THREE.TorusGeometry(0.0092, 0.0008, 6, 24), M.black, 0.026 + k * 0.0056).rotation.x = Math.PI / 2;
  iron.position.copy(B).addScaledVector(dir, -0.004);
  iron.quaternion.copy(q);
  g.add(iron);
  const tipPos = V(0, -0.074, 0).applyQuaternion(q).add(iron.position);
  const end = V(0, 0.118, 0).applyQuaternion(q).add(iron.position);
  const cable = new THREE.CatmullRomCurve3([
    end, end.clone().addScaledVector(dir, 0.016).add(V(0.004, -0.008, 0)), V(0.176, 0.108, -0.022), V(0.186, 0.05, -0.026),
    V(0.1765, 0.006, -0.0314), V(0.107, 0.0035, -0.0887), V(0.057, 0.0035, -0.142),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 60, 0.0021, 6), M.black));
  // fumo: particelle leggere che salgono dalla punta
  const N = 48;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = tipPos.x; pos[i * 3 + 1] = tipPos.y; pos[i * 3 + 2] = tipPos.z; }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(Float32Array.from({ length: N }, (_, i) => i / N + Math.random() * 0.02), 1));
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 800 } },
    vertexShader: SMOKE_VERT, fragmentShader: SMOKE_FRAG, transparent: true, depthWrite: false,
  });
  const smoke = new THREE.Points(geo, smokeMat);
  smoke.frustumCulled = false;
  shadow(g);
  g.add(smoke);
  return { group: g, update: (t, dt, c) => { smokeMat.uniforms.uTime.value = t; smokeMat.uniforms.uScale.value = c.heightPx; } };
}

// vapore del caffe': poche particelle chiare che salgono piano dalla superficie e si allargano
const STEAM_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime; uniform float uScale;
varying float vA;
void main() {
  float life = fract(uTime * 0.085 + aSeed);
  vec3 p = position;
  float h = life * 0.15;
  p.y += h;
  p.x += sin(life * 4.0 + aSeed * 31.0 + uTime * 0.5) * 0.012 * life;
  p.z += cos(life * 3.5 + aSeed * 17.0 + uTime * 0.4) * 0.01 * life;
  vA = smoothstep(0.0, 0.2, life) * (1.0 - life) * 0.13;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = (0.012 + life * 0.045) * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const STEAM_FRAG = /* glsl */ `
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  gl_FragColor = vec4(vec3(0.93, 0.92, 0.9), smoothstep(0.5, 0.0, d) * vA);
}`;

function createMug() {
  const g = new THREE.Group();
  g.name = "mug";
  const prof = [[0.0, 0.01], [0.035, 0.01], [0.036, 0.088], [0.038, 0.092], [0.041, 0.09], [0.04, 0.004], [0.036, 0.0], [0.0, 0.0]].map(([x, y]) => new THREE.Vector2(x, y));
  const glaze = new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.22, metalness: 0.05, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glaze));
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.035, 32), new THREE.MeshStandardMaterial({ color: 0x1a0e07, roughness: 0.12 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.07;
  g.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0065, 12, 24, Math.PI * 1.1), glaze);
  handle.rotation.z = -Math.PI / 2 - 0.05; handle.position.set(0.04, 0.047, 0);
  g.add(handle);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.006, 20), new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.3 }));
  dot.position.set(0, 0.055, 0.0412);
  g.add(dot);
  shadow(g);
  const N = 36, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = i * 2.39996, r = 0.026 * Math.sqrt((i + 0.5) / N);
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.072; pos[i * 3 + 2] = Math.sin(a) * r;
    seed[i] = (i * 0.618) % 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const steamMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uScale: { value: 800 } }, vertexShader: STEAM_VERT, fragmentShader: STEAM_FRAG, transparent: true, depthWrite: false });
  const steam = new THREE.Points(geo, steamMat);
  steam.frustumCulled = false;
  steam.castShadow = steam.receiveShadow = false;
  g.add(steam);
  return { group: g, update: (t, dt, c) => { steamMat.uniforms.uTime.value = t; steamMat.uniforms.uScale.value = c.heightPx; } };
}

function patchCable(M, color, pts) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(pts);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.0022, 8), mat));
  for (const end of [0, 1]) {
    // direzione verso l'interno del cavo: il cappuccio sta da quella parte, il manicotto entra nel jack
    const p = curve.getPointAt(end), out = curve.getTangentAt(end).multiplyScalar(end ? -1 : 1);
    const plug = new THREE.Group();
    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0044, 0.018, 14), mat);
    boot.position.y = 0.012;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.008, 12), M.steel);
    sleeve.position.y = 0.0;
    plug.add(boot, sleeve);
    plug.position.copy(p);
    plug.quaternion.setFromUnitVectors(V(0, 1, 0), out.normalize());
    g.add(plug);
  }
  return shadow(g);
}

// ---------------------------------------------------------------------------
// Tutti gli oggetti del banco
// ---------------------------------------------------------------------------
export async function createObjects(ctx, woodMap, onProgress = () => {}) {
  const { data } = ctx;
  const M = materials(woodMap);
  const root = new THREE.Group();
  root.name = "objects";
  const updaters = [];
  const sections = {};
  const place = (o, x, z, ry = 0, y = DESK.y) => { o.position.set(x, y, z); o.rotation.y = ry; root.add(o); return o; };

  const monitor = createMonitor(M, data);
  place(monitor.group, -0.15, -0.2, 0);    // parallelo al bordo del banco, a destra della stampante 3D
  updaters.push(monitor.update);
  sections.dev = monitor.group;

  const pad = createTablet(M, data);
  place(pad.group, 0.11, 0.13, -0.1);
  sections.about = pad.group;
  onProgress(0.3);

  // strumenti: due sul gradino in legno, uno sul banco
  const riser = box(0.66, 0.07, 0.27, M.wood, 0.008, 3);
  riser.position.set(0.63, DESK.y + 0.035, -0.235);
  shadow(riser);
  root.add(riser);
  const ledMats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: 0x5a1410, emissive: 0xff2a1a, emissiveIntensity: 3, roughness: 0.3 }));
  const spots = {
    ichosynth: [0.47, -0.24, 0.05, DESK.y + 0.07],
    eremo: [0.745, -0.25, -0.18, DESK.y + 0.07],
    stame: [0.62, 0.035, 0],               // sul banco, appoggiato al gradino degli altri due strumenti
  };
  const synths = [];
  let i = 0;
  for (const p of data.shop.products) {
    // Ichosynth, Eremo e Stame hanno il loro modello, fatto sulle misure vere; un prodotto nuovo nasce dal frontale SVG
    const MODELS = { ichosynth: createIchosynth, eremo: createEremo, stame: createStame };
    const s = MODELS[p.slug] ? MODELS[p.slug](M, p) : await createSynth(M, p, ledMats);
    if (s.update) updaters.push(s.update);
    const [x, z, ry, y] = spots[p.slug] || [0.3 + i * 0.2, 0.0, 0];
    place(s.group, x, z, ry, y ?? DESK.y);
    s.group.userData.slug = p.slug;
    synths.push(s);
    onProgress(0.3 + 0.4 * (++i / data.shop.products.length));
  }
  sections.shop = synths.map((s) => s.group);

  const recorder = createRecorder(M, data.ui.cassette);
  place(recorder.group, 0.95, 0.27, -0.38);   // la segreteria dei contatti, in disparte nell'angolo davanti
  updaters.push(recorder.update);
  sections.contact = recorder.group;

  const station = createSolderingStation(M);
  place(station.group, -0.37, 0.305, 0.35); // sul tappetino da taglio, dove non copre il tablet
  updaters.push(station.update);
  const mug = createMug();
  place(mug.group, 0.14, -0.08, 2.4);
  updaters.push(mug.update);

  // cavi patch tra gli strumenti
  const Y = DESK.y;
  root.updateMatrixWorld(true);
  const bySlug = Object.fromEntries(synths.map((s) => [s.product.slug, s]));
  const jackW = (slug, i) => {
    const s = bySlug[slug];
    return s && s.jacks[i] ? s.inner.localToWorld(s.jacks[i].clone()).add(V(0, 0.004, 0)) : null;
  };
  const up = (p, h) => p.clone().add(V(0, h, 0));
  const a1 = jackW("ichosynth", 0), b1 = jackW("eremo", 0);
  if (a1 && b1) root.add(patchCable(M, 0xc8261b, [a1, V(a1.x, a1.y + 0.004, a1.z - 0.03), V(a1.x + 0.07, a1.y + 0.03, a1.z - 0.04), up(a1.clone().lerp(b1, 0.6), 0.08), up(b1, 0.035), b1]));
  onProgress(1);

  // --- ologramma dello spettro e striscia LED sul fondo del banco ---
  const neon = createNeon();
  root.add(neon.group);
  updaters.push(neon.update);

  // meno chiamate di disegno: ogni oggetto unisce le sue parti statiche
  for (const child of root.children) if (child.isGroup) mergeStatic(child);

  const ledPhase = [0, 2.1, 4.2];
  return {
    group: root,
    sections,
    synths,
    recorder,
    monitor,
    update(t, dt, c) {
      for (const u of updaters) u(t, dt, c);
      ledMats.forEach((m, k) => { m.emissiveIntensity = 2.4 + Math.sin(t * 1.4 + ledPhase[k]) * 1.1; });
    },
  };
}

// ologramma dello spettro sopra i synth (proiettato da una barra sulla mensola della vetrata)
// e striscia LED ambra lungo il bordo posteriore del banco
const HOLO_FRAG = /* glsl */ `
uniform float uTime; varying vec2 vUv;
float h(float x) { return fract(sin(x * 127.1) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  float n = 30.0, i = floor(uv.x * n), fx = fract(uv.x * n);
  float lvl = (0.18 + 0.5 * abs(sin(uTime * (0.7 + h(i) * 1.6) + i * 0.6))) * (0.45 + 0.55 * h(i + 3.0)) * sin(uv.x * 3.14159);
  float bar = step(0.2, fx) * step(fx, 0.8) * step(uv.y, lvl * 0.78) * step(0.3, fract(uv.y * 24.0));
  float y = 0.7 + 0.07 * sin(uv.x * 20.0 + uTime * 2.0) * sin(uv.x * 3.14159);
  float line = exp(-pow((uv.y - y) / 0.012, 2.0));
  vec3 amber = vec3(1.0, 0.66, 0.25), red = vec3(1.0, 0.32, 0.2);
  float edge = smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x);
  float scan = 0.82 + 0.18 * sin(uv.y * 260.0 + uTime * 5.0);
  vec3 col = (mix(amber, red, smoothstep(0.25, 0.55, uv.y)) * bar * 0.6 + amber * line * 1.1) * edge * scan;
  gl_FragColor = vec4(col, (bar * 0.7 + line) * edge);
}`;

function createNeon() {
  const g = new THREE.Group();
  g.name = "neon";
  const Y = DESK.y;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: HOLO_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.26), mat);
  holo.position.set(0.61, 0.875 + 0.13, -0.46);
  holo.userData.dynamic = true;
  g.add(holo);
  const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.012, 0.016), new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.4, metalness: 0.8 }));
  emitter.position.set(0.61, 0.856, -0.46);
  g.add(emitter);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.006, 0.008),
    new THREE.MeshStandardMaterial({ color: 0x140a00, emissive: 0xffa23c, emissiveIntensity: 2.4 }));
  strip.position.set(-0.44, Y + 0.004, DESK.z0 + 0.006);
  g.add(strip);
  // luce morbida sugli strumenti: sono i prodotti, devono leggersi bene
  const key = new THREE.PointLight(0xffe2c2, 0.5, 1.7, 2);
  key.position.set(0.62, 1.32, 0.32);
  g.add(key);
  return { group: g, update(t) { mat.uniforms.uTime.value = t; } };
}
