// Banco da lavoro e oggetti sopra. Tutta la geometria e' costruita in codice.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  woodTextures, noiseRoughness, CodeScreen, tabletTexture, panelTextures, panelEmissive,
  recorderTopTexture, grilleTexture, scopePanelTexture,
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
// Unisce le mesh statiche che condividono lo stesso materiale (meno chiamate di disegno).
// Restano separati: InstancedMesh, Points e tutto cio' che sta sotto un nodo con userData.dynamic.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    const key = o.material.uuid + (o.castShadow ? "c" : "") + (o.receiveShadow ? "r" : "");
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });
  const m4 = new THREE.Matrix4();
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = list.map((m) => {
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
      if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.morphAttributes = {};
      g.clearGroups();
      g.applyMatrix4(m4.multiplyMatrices(inv, m.matrixWorld));
      return g;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, list[0].material);
    mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow;
    root.add(mesh);
    for (const m of list) m.removeFromParent();
    for (const g of geos) g.dispose();
  }
  return root;
}

function box(w, h, d, mat, r = 0.004, seg = 2) {
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
  const barA = V(-0.99, 1.3, -0.3), barB = V(-0.16, 1.3, -0.1);
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

function knob3d(M, r, h, angleDeg) {
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
// Oscilloscopio con traccia viva (shader)
// ---------------------------------------------------------------------------
const SCOPE_FRAG = /* glsl */ `
uniform float uTime; varying vec2 vUv;
void main(){
  vec2 uv = vUv;
  vec2 grid = abs(fract(uv * vec2(10.0, 8.0)) - 0.5);
  float gl = smoothstep(0.485, 0.5, max(grid.x, grid.y));
  vec3 col = vec3(0.016, 0.011, 0.004) + vec3(0.06, 0.04, 0.015) * gl;
  float t = uTime;
  float x = uv.x * 6.2831 * 2.0;
  float y = 0.5 + 0.22 * sin(x + t * 2.0) * (0.75 + 0.25 * sin(t * 0.7)) + 0.07 * sin(x * 3.0 - t * 3.1) + 0.03 * sin(x * 7.0 + t);
  float d = abs(uv.y - y);
  col += vec3(1.0, 0.66, 0.25) * (exp(-d * d / 0.00006) * 2.6 + exp(-d * d / 0.002) * 0.35);
  vec2 q = abs(uv - 0.5) * 2.0;
  col *= smoothstep(1.0, 0.86, max(pow(q.x, 6.0), pow(q.y, 6.0)));
  gl_FragColor = vec4(col, 1.0);
}`;

function createScope(M) {
  const g = new THREE.Group();
  g.name = "scope";
  const W = 0.21, H = 0.15, D = 0.23;
  const body = box(W, H, D, new THREE.MeshStandardMaterial({ color: 0x1b2129, roughness: 0.45, metalness: 0.55 }), 0.008, 3);
  body.position.y = H / 2 + 0.01;
  g.add(body);
  const fw = W - 0.012, fh = H - 0.012;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.MeshStandardMaterial({ map: scopePanelTexture(), roughness: 0.6 }));
  front.position.set(0, H / 2 + 0.01, D / 2 + 0.0006);
  g.add(front);
  const at = (px, py) => V((px / 512 - 0.5) * fw, H / 2 + 0.01 - (py / 360 - 0.5) * fh, D / 2);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry((280 / 512) * fw, (210 / 360) * fh), new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: SCOPE_FRAG,
  }));
  screen.position.copy(at(170, 135)).add(V(0, 0, 0.0012));
  g.add(screen);
  for (const [px, py, r] of [[375, 100, 0.012], [465, 100, 0.012], [375, 215, 0.009], [465, 215, 0.009]]) {
    const k = knob3d(M, r, 0.012, 40 + px * 0.3);
    k.rotation.x = Math.PI / 2;
    k.position.copy(at(px, py));
    g.add(k);
  }
  for (const px of [60, 160, 260]) {
    const bnc = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.012, 16), M.steel);
    bnc.rotation.x = Math.PI / 2;
    bnc.position.copy(at(px, 268)).add(V(0, 0, 0.006));
    g.add(bnc);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.01, 12), M.black);
    f.position.set(sx * (W / 2 - 0.02), 0.005, sz * (D / 2 - 0.025));
    g.add(f);
  }
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.005, 8, 24, Math.PI), M.black);
  handle.position.set(0, H + 0.01, 0.02);
  handle.rotation.y = Math.PI / 2;
  g.add(handle);
  shadow(g);
  screen.castShadow = false;
  return { group: g, update: (t) => { screen.material.uniforms.uTime.value = t; } };
}

// ---------------------------------------------------------------------------
// Monitor con codice vivo + tastiera
// ---------------------------------------------------------------------------
function createMonitor(M, data) {
  const g = new THREE.Group();
  g.name = "monitor";
  const sw = 0.56, sh = 0.35;
  const code = new CodeScreen(1280, 800, data.ui.assistant);
  const head = new THREE.Group();
  head.position.set(0, 0.25, -0.03);
  head.rotation.x = -0.06;
  head.add(box(sw + 0.026, sh + 0.03, 0.032, M.plastic, 0.008, 3));
  const back = box(sw * 0.7, sh * 0.6, 0.05, M.plastic, 0.02, 3);
  back.position.set(0, -0.01, -0.035);
  head.add(back);
  // schermo opaco (niente riflessi delle luci): solo la sua luce
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh),
    new THREE.MeshBasicMaterial({ map: code.texture, color: new THREE.Color(1.5, 1.5, 1.5) }));
  screen.position.set(0, 0.004, 0.0165);
  head.add(screen);
  const pled = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 10, 8), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xf2a33a, emissiveIntensity: 6 }));
  pled.position.set(sw / 2 - 0.01, -sh / 2 - 0.008, 0.016);
  head.add(pled);
  g.add(head);
  const neck = box(0.05, 0.2, 0.025, M.graphite, 0.006);
  neck.position.set(0, 0.11, -0.07);
  g.add(neck);
  const foot = box(0.22, 0.012, 0.16, M.graphite, 0.005);
  foot.position.set(0, 0.006, -0.05);
  g.add(foot);
  // tastiera
  const kb = new THREE.Group();
  kb.name = "keyboard";
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
  kb.position.set(0.02, 0, 0.29);
  kb.rotation.y = -0.07;
  g.add(kb);
  const glow = new THREE.PointLight(0x8fb2e8, 0.5, 1.4, 2);
  glow.position.set(0, 0.22, 0.25);
  g.add(glow);
  shadow(g);
  screen.castShadow = false;
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
function createRecorder(M, label) {
  const g = new THREE.Group();
  g.name = "recorder";
  const W = 0.225, H = 0.058, D = 0.158;
  const body = box(W, H, D, new THREE.MeshStandardMaterial({ color: 0x2a2d32, roughness: 0.5, metalness: 0.3 }), 0.007, 3);
  body.position.y = H / 2 + 0.004;
  g.add(body);
  const topY = H + 0.004 + 0.0006;
  const pw = W - 0.01, pd = D - 0.01;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), new THREE.MeshStandardMaterial({ map: recorderTopTexture(label), roughness: 0.38, metalness: 0.75 }));
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = topY;
  g.add(plate);
  const at = (px, py, y = topY) => V((px / 1024 - 0.5) * pw, y, (py / 720 - 0.5) * pd);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry((620 / 1024) * pw, (420 / 720) * pd), M.glass);
  glass.rotation.x = -Math.PI / 2;
  glass.position.copy(at(370, 270, topY + 0.002));
  g.add(glass);
  const hubs = [];
  for (const px of [290, 450]) {
    const hub = new THREE.Group();
    hub.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.002, 6), new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.5 })));
    hub.add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.0025, 12), M.black));
    hub.position.copy(at(px, 277, topY + 0.001));
    hub.userData.dynamic = true; // gira: non si unisce al resto
    g.add(hub);
    hubs.push(hub);
  }
  const recMat = new THREE.MeshStandardMaterial({ color: 0xc8261b, roughness: 0.45 });
  ["rec", "play", "rew", "ff", "stop", "pause"].forEach((key, i) => {
    const kk = box(0.026, 0.008, 0.02, key === "rec" ? recMat : M.alu, 0.002);
    kk.position.copy(at(128 + i * 150, 585, topY + (key === "play" ? 0.001 : 0.003)));
    g.add(kk);
  });
  const grilleMap = grilleTexture();
  const grille = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.62, H * 0.6), new THREE.MeshStandardMaterial({ map: grilleMap, roughness: 0.6, metalness: 0.4 }));
  grille.position.set(-W * 0.12, H / 2 + 0.004, D / 2 + 0.0008);
  g.add(grille);
  const recLed = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 10, 8), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff3322, emissiveIntensity: 0 }));
  recLed.position.set(W * 0.32, H * 0.65, D / 2 + 0.001);
  g.add(recLed);
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.003, 20), new THREE.MeshStandardMaterial({ map: grilleMap, roughness: 0.6 }));
  mic.rotation.x = Math.PI / 2;
  mic.position.set(W * 0.32, H * 0.38, D / 2 + 0.0015);
  g.add(mic);
  // tracolla in cuoio
  const pts = [
    V(-W / 2 - 0.004, H * 0.7, -D * 0.2), V(-W / 2 - 0.03, H * 0.4, -D * 0.1), V(-W / 2 - 0.06, 0.004, D * 0.3),
    V(-W / 2 + 0.02, 0.004, D * 0.8), V(W / 2 + 0.02, 0.004, D * 0.75), V(W / 2 + 0.03, H * 0.35, D * 0.1), V(W / 2 + 0.004, H * 0.7, -D * 0.2),
  ];
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.0035, 6, false), new THREE.MeshStandardMaterial({ color: 0x4a2c1a, roughness: 0.7 })));
  shadow(g);
  glass.castShadow = false;
  let spin = 0, rec = 0;
  return {
    group: g,
    setRecording(on) { rec = on ? 1 : 0; },
    update(t, dt) {
      spin += dt * (0.3 + rec * 5);
      hubs[0].rotation.y = spin; hubs[1].rotation.y = spin * 0.9;
      recLed.material.emissiveIntensity = rec * (3 + Math.sin(t * 6) * 1.5);
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
  const g = new THREE.Group();
  g.name = "soldering";
  const base = box(0.1, 0.014, 0.075, M.black, 0.004);
  base.position.y = 0.007;
  g.add(base);
  const sponge = box(0.04, 0.008, 0.03, new THREE.MeshStandardMaterial({ color: 0xb98a3c, roughness: 1 }), 0.002);
  sponge.position.set(-0.025, 0.018, 0.012);
  g.add(sponge);
  const wool = new THREE.Mesh(new THREE.TorusKnotGeometry(0.009, 0.0035, 48, 6, 3, 5), M.brass);
  wool.position.set(0.03, 0.02, 0.015);
  g.add(wool);
  const holderA = V(0.0, 0.016, -0.02), holderB = V(0.07, 0.07, -0.02);
  g.add(rod(V(0.0, 0.014, -0.02), V(0.015, 0.04, -0.02), 0.0025, M.steel));
  const dir = new THREE.Vector3().subVectors(holderB, holderA);
  const len = dir.length(); dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir);
  const off = V(0.012, 0.022, 0);
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120, a = t * 14 * Math.PI, r = 0.007 + t * 0.006;
    pts.push(V(Math.cos(a) * r, t * len, Math.sin(a) * r).applyQuaternion(q).add(holderA).add(off));
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.0011, 5), M.steel));
  const iron = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0075, 0.08, 20), new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.7 }));
  grip.position.y = 0.06;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.0085, 0.012, 20), new THREE.MeshStandardMaterial({ color: 0xc8261b, roughness: 0.5 }));
  collar.position.y = 0.014;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.06, 14), M.steel);
  shaft.position.y = -0.02;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0028, 0.016, 12), new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 0.4, metalness: 0.9 }));
  tip.rotation.z = Math.PI; tip.position.y = -0.058;
  iron.add(grip, collar, shaft, tip);
  iron.position.copy(holderA).add(holderB).multiplyScalar(0.5).add(off);
  iron.quaternion.copy(q);
  g.add(iron);
  const tipPos = V(0, -0.066, 0).applyQuaternion(q).add(iron.position);
  const cable = new THREE.CatmullRomCurve3([
    V(0, 0.1, 0).applyQuaternion(q).add(iron.position), V(0.11, 0.09, -0.03), V(0.16, 0.003, -0.08), V(0.25, 0.003, -0.05),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 40, 0.0022, 6), M.black));
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

function createSpool(M) {
  const g = new THREE.Group();
  g.name = "spool";
  const prof = [[0, 0], [0.028, 0], [0.028, 0.004], [0.012, 0.005], [0.012, 0.031], [0.028, 0.032], [0.028, 0.036], [0, 0.036]].map(([x, y]) => new THREE.Vector2(x, y));
  const sp = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: 0.5 }));
  sp.rotation.x = Math.PI / 2; sp.position.set(0, 0.028, -0.018);
  g.add(sp);
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.026, 40), new THREE.MeshStandardMaterial({ color: 0xbfc4c6, roughness: 0.3, metalness: 1 }));
  wire.rotation.x = Math.PI / 2; wire.position.set(0, 0.028, 0);
  g.add(wire);
  const tail = new THREE.CatmullRomCurve3([V(0.02, 0.04, 0.0), V(0.05, 0.02, 0.03), V(0.09, 0.001, 0.06), V(0.12, 0.001, 0.05)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(tail, 30, 0.0007, 5), M.steel));
  shadow(g);
  return { group: g };
}

function createMug() {
  const g = new THREE.Group();
  g.name = "mug";
  const prof = [[0.0, 0.01], [0.035, 0.01], [0.036, 0.088], [0.038, 0.092], [0.041, 0.09], [0.04, 0.004], [0.036, 0.0], [0.0, 0.0]].map(([x, y]) => new THREE.Vector2(x, y));
  const glaze = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.22, metalness: 0.05, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glaze));
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.035, 32), new THREE.MeshStandardMaterial({ color: 0x1a0e07, roughness: 0.12 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.07;
  g.add(coffee);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.0065, 12, 24, Math.PI * 1.1), glaze);
  handle.rotation.z = -Math.PI / 2 - 0.05; handle.position.set(0.04, 0.047, 0);
  g.add(handle);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.006, 20), new THREE.MeshStandardMaterial({ color: 0xc8261b, roughness: 0.3 }));
  dot.position.set(0, 0.055, 0.0412);
  g.add(dot);
  shadow(g);
  return { group: g };
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

  const scope = createScope(M);
  place(scope.group, -0.83, 0.13, 0.42);
  updaters.push(scope.update);

  const monitor = createMonitor(M, data);
  place(monitor.group, -0.45, -0.2, 0.12);
  updaters.push(monitor.update);
  sections.dev = monitor.group;

  const pad = createTablet(M, data);
  place(pad.group, 0.05, 0.13, -0.1);
  sections.about = pad.group;
  onProgress(0.3);

  // synth: due sul gradino in legno, due sul banco
  const riser = box(0.66, 0.07, 0.27, M.wood, 0.008, 3);
  riser.position.set(0.63, DESK.y + 0.035, -0.235);
  shadow(riser);
  root.add(riser);
  const ledMats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: 0x5a1410, emissive: 0xff2a1a, emissiveIntensity: 3, roughness: 0.3 }));
  const spots = {
    ichosynth: [0.47, -0.24, 0.05, DESK.y + 0.07],
    "open-orc": [0.81, -0.24, -0.1, DESK.y + 0.07],
    "ichosynth-mini": [0.37, 0.14, 0.1],
    stame: [0.68, 0.15, -0.08],
  };
  const synths = [];
  let i = 0;
  for (const p of data.shop.products) {
    const s = await createSynth(M, p, ledMats);
    const [x, z, ry, y] = spots[p.slug] || [0.3 + i * 0.2, 0.0, 0];
    place(s.group, x, z, ry, y ?? DESK.y);
    s.group.userData.slug = p.slug;
    synths.push(s);
    onProgress(0.3 + 0.4 * (++i / data.shop.products.length));
  }
  sections.shop = synths.map((s) => s.group);

  const recorder = createRecorder(M, data.ui.cassette);
  place(recorder.group, 0.98, 0.13, -0.32);
  updaters.push(recorder.update);
  sections.contact = recorder.group;

  const station = createSolderingStation(M);
  place(station.group, 0.12, 0.32, 0.15);
  updaters.push(station.update);
  place(createSpool(M).group, 0.22, -0.3, 0.4);
  place(createMug().group, -0.1, -0.19, 2.4);

  // cavi patch tra gli strumenti
  const Y = DESK.y;
  root.updateMatrixWorld(true);
  const bySlug = Object.fromEntries(synths.map((s) => [s.product.slug, s]));
  const jackW = (slug, i) => {
    const s = bySlug[slug];
    return s && s.jacks[i] ? s.inner.localToWorld(s.jacks[i].clone()).add(V(0, 0.004, 0)) : null;
  };
  const up = (p, h) => p.clone().add(V(0, h, 0));
  const a1 = jackW("ichosynth", 0), b1 = jackW("open-orc", 0);
  if (a1 && b1) root.add(patchCable(M, 0xc8261b, [a1, up(a1, 0.035), up(a1.clone().lerp(b1, 0.5), 0.07), up(b1, 0.035), b1]));
  const a2 = jackW("stame", 0);
  const recIn = recorder.group.localToWorld(V(-0.1125, 0.032, 0.035));
  const recOut = recorder.group.localToWorld(V(-0.15, 0.032, 0.035));
  if (a2) root.add(patchCable(M, 0xf2a33a, [a2, up(a2, 0.04), V(a2.x + 0.06, Y + 0.03, a2.z + 0.09), V(0.84, Y + 0.004, 0.27), V(recOut.x - 0.02, Y + 0.006, recOut.z + 0.05), recOut, recIn]));
  const a3 = jackW("open-orc", 1);
  if (a3) root.add(patchCable(M, 0xe9ece6, [a3, up(a3, 0.03), V(a3.x + 0.05, Y + 0.09, -0.36), V(a3.x + 0.12, Y + 0.004, -0.3), V(a3.x + 0.16, Y + 0.004, -0.2), V(a3.x + 0.12, Y + 0.004, -0.15)]));
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
  const glow = new THREE.PointLight(0xff6a3d, 0.06, 0.9, 2);
  glow.position.set(0.61, 1.05, -0.42);
  const amber = new THREE.PointLight(0xffa64a, 0.18, 1.0, 2);
  amber.position.set(-0.2, Y + 0.12, -0.468);
  // luce morbida sugli strumenti: sono i prodotti, devono leggersi bene
  const key = new THREE.PointLight(0xffe2c2, 0.5, 1.7, 2);
  key.position.set(0.62, 1.32, 0.32);
  g.add(glow, amber, key);
  return { group: g, update(t) { mat.uniforms.uTime.value = t; } };
}
