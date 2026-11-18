// Banco da lavoro e oggetti sopra. Tutta la geometria e' costruita in codice.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  woodTextures, noiseRoughness, CodeScreen, notepadTexture, panelTextures, panelEmissive,
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
function helix(a, b, radius, turns, wire, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const pts = [];
  const N = turns * 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N, ang = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(ang) * radius, t * len, Math.sin(ang) * radius));
  }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, wire, 5, false), mat);
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(_up, dir.normalize());
  return m;
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
    new THREE.MeshStandardMaterial({ map: wood.map, roughnessMap: wood.roughnessMap, roughness: 1, metalness: 0 })
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
  return { group: g, woodMap: wood.map };
}

// --- lampada da banco a braccio snodato ------------------------------------
export function createLamp() {
  const g = new THREE.Group();
  g.name = "lamp";
  const red = new THREE.MeshStandardMaterial({ color: 0xc8261b, roughness: 0.62, metalness: 0.05, roughnessMap: noiseRoughness(9, 150, 30) });
  const steel = new THREE.MeshStandardMaterial({ color: 0x8e9399, roughness: 0.3, metalness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.45, metalness: 0.4 });

  const base = V(-0.98, DESK.y, -0.27);
  const p0 = base.clone().add(V(0, 0.07, 0));
  const p1 = V(-0.88, 1.3, -0.26);
  const p2 = V(-0.3, 1.44, -0.06);
  const target = V(-0.24, DESK.y, 0.02);

  const baseGeo = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.095, 0), new THREE.Vector2(0.098, 0.006),
    new THREE.Vector2(0.094, 0.022), new THREE.Vector2(0.05, 0.03), new THREE.Vector2(0.03, 0.04), new THREE.Vector2(0, 0.04),
  ], 48);
  const b = new THREE.Mesh(baseGeo, red);
  b.position.copy(base);
  g.add(b);
  const pivot0 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 20), dark);
  pivot0.rotation.x = Math.PI / 2;
  pivot0.position.copy(p0);
  g.add(pivot0);
  g.add(rod(base.clone().add(V(0, 0.03, 0)), p0, 0.012, red));

  const side = V(0, 0, 0.016);
  for (const s of [1, -1]) {
    g.add(rod(p0.clone().addScaledVector(side, s), p1.clone().addScaledVector(side, s), 0.0065, red));
    g.add(rod(p1.clone().addScaledVector(side, s), p2.clone().addScaledVector(side, s), 0.0058, red));
  }
  g.add(helix(p0.clone().add(V(0.03, 0.04, 0)), p1.clone().add(V(0.05, -0.1, 0)), 0.006, 26, 0.0011, steel));
  g.add(helix(p1.clone().add(V(0.06, -0.01, 0)), p2.clone().add(V(-0.12, -0.03, 0)), 0.005, 22, 0.001, steel));
  const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 20), dark);
  knuckle.rotation.x = Math.PI / 2;
  knuckle.position.copy(p1);
  g.add(knuckle);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.016, 16), steel);
  knob.rotation.x = Math.PI / 2;
  knob.position.copy(p1).add(V(0, 0, 0.033));
  g.add(knob);

  // testa: paralume tornito (profilo dal bordo verso l'alto: normali verso l'esterno)
  const head = new THREE.Group();
  head.position.copy(p2);
  const axis = new THREE.Vector3().subVectors(target, p2).normalize();
  head.quaternion.setFromUnitVectors(V(0, -1, 0), axis);
  const prof = [
    [0.091, -0.118], [0.088, -0.11], [0.078, -0.075], [0.05, -0.02], [0.034, 0.012], [0.03, 0.03], [0.018, 0.035],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const shadeOut = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), red);
  const shadeIn = new THREE.Mesh(new THREE.LatheGeometry(prof, 64),
    new THREE.MeshStandardMaterial({ color: 0xeee6d8, roughness: 0.5, emissive: 0xffb877, emissiveIntensity: 0.35, side: THREE.BackSide }));
  shadeIn.scale.setScalar(0.985);
  head.add(shadeOut, shadeIn);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.02, 20), dark);
  cap.position.y = 0.045;
  head.add(cap);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd9a8, emissiveIntensity: 14, roughness: 0.2 }));
  bulb.position.y = -0.045;
  bulb.scale.set(1, 1.15, 1);
  head.add(bulb);
  g.add(head);
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.045, 16), dark);
  yoke.rotation.x = Math.PI / 2;
  yoke.position.copy(p2);
  g.add(yoke);

  shadow(g, true, true);
  bulb.castShadow = false; shadeIn.castShadow = false;

  // unica luce calda forte
  const spot = new THREE.SpotLight(0xffc690, 1.5, 4.5, 0.8, 0.75, 2);
  spot.position.copy(p2).addScaledVector(axis, 0.03);
  spot.target.position.copy(target);
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

  return { group: g, spot, bulb, head };
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
  vec3 col = vec3(0.004, 0.018, 0.012) + vec3(0.02, 0.06, 0.04) * gl;
  float t = uTime;
  float x = uv.x * 6.2831 * 2.0;
  float y = 0.5 + 0.22 * sin(x + t * 2.0) * (0.75 + 0.25 * sin(t * 0.7)) + 0.07 * sin(x * 3.0 - t * 3.1) + 0.03 * sin(x * 7.0 + t);
  float d = abs(uv.y - y);
  col += vec3(0.55, 1.0, 0.45) * (exp(-d * d / 0.00006) * 2.6 + exp(-d * d / 0.002) * 0.35);
  vec2 q = abs(uv - 0.5) * 2.0;
  col *= smoothstep(1.0, 0.86, max(pow(q.x, 6.0), pow(q.y, 6.0)));
  gl_FragColor = vec4(col, 1.0);
}`;

function createScope(M) {
  const g = new THREE.Group();
  g.name = "scope";
  const W = 0.21, H = 0.15, D = 0.23;
  const body = box(W, H, D, new THREE.MeshStandardMaterial({ color: 0xbcb8ad, roughness: 0.6 }), 0.008, 3);
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
function createMonitor(M) {
  const g = new THREE.Group();
  g.name = "monitor";
  const sw = 0.56, sh = 0.35;
  const code = new CodeScreen(1280, 800);
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
  const keys = new THREE.InstancedMesh(keyGeo, new THREE.MeshStandardMaterial({ color: 0x2f353c, roughness: 0.6, emissive: 0x0e5a6a, emissiveIntensity: 0.35 }), 4 * 14 + 1);
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
// Bloc-notes giallo con penna
// ---------------------------------------------------------------------------
function createNotepad(M, data) {
  const g = new THREE.Group();
  g.name = "notepad";
  const w = 0.165, d = w * 1088 / 768, t = 0.012;
  const block = box(w, t, d, new THREE.MeshStandardMaterial({ color: 0xe9d877, roughness: 0.9 }), 0.0015, 1);
  block.position.y = t / 2;
  g.add(block);
  const page = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: notepadTexture(data.about), roughness: 1 }));
  page.rotation.x = -Math.PI / 2;
  page.position.y = t + 0.0004;
  g.add(page);
  const loose = new THREE.Mesh(new THREE.PlaneGeometry(w, d * 0.96), new THREE.MeshStandardMaterial({ color: 0xf2e183, roughness: 0.9 }));
  loose.rotation.set(-Math.PI / 2, 0, 0.18);
  loose.position.set(0.03, 0.0008, 0.02);
  g.add(loose);
  const pen = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.3, metalness: 0.2 }));
  barrel.rotation.z = Math.PI / 2;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.018, 20), M.steel);
  tip.rotation.z = -Math.PI / 2; tip.position.x = 0.069;
  const clip = box(0.04, 0.0015, 0.003, M.steel, 0.0006);
  clip.position.set(-0.035, 0.005, 0);
  const capEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.0047, 0.0047, 0.012, 20), new THREE.MeshStandardMaterial({ color: 0xc8261b, roughness: 0.4 }));
  capEnd.rotation.z = Math.PI / 2; capEnd.position.x = -0.064;
  pen.add(barrel, tip, clip, capEnd);
  pen.position.set(w / 2 + 0.03, 0.0045, 0.01);
  pen.rotation.y = 1.2;
  g.add(pen);
  shadow(g);
  return { group: g, page };
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

function smallParts(M) {
  const g = new THREE.Group();
  g.name = "parts";
  let seed = 99;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = V(1, 1, 1);
  const Y = DESK.y;
  const screws = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.0022, 12), M.steel, 9);
  for (let i = 0; i < 9; i++) {
    m4.compose(V(-0.22 + r() * 0.17, Y + 0.0011, 0.26 + r() * 0.1), q.setFromEuler(e.set(0, r() * 3, 0)), one);
    screws.setMatrixAt(i, m4);
  }
  g.add(screws);
  const resBody = new THREE.CapsuleGeometry(0.0022, 0.006, 4, 10).rotateZ(Math.PI / 2);
  const resLead = new THREE.CylinderGeometry(0.00035, 0.00035, 0.036, 5).rotateZ(Math.PI / 2);
  const resM = new THREE.InstancedMesh(resBody, new THREE.MeshStandardMaterial({ color: 0xd8c193, roughness: 0.6 }), 6);
  const leadM = new THREE.InstancedMesh(resLead, M.steel, 6);
  for (let i = 0; i < 6; i++) {
    m4.compose(V(-0.2 + r() * 0.16, Y + 0.0024, 0.27 + r() * 0.09), q.setFromEuler(e.set(0, r() * 3.14, 0)), one);
    resM.setMatrixAt(i, m4); leadM.setMatrixAt(i, m4);
  }
  g.add(resM, leadM);
  const caps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.009, 14), new THREE.MeshStandardMaterial({ color: 0x23395b, roughness: 0.4 }), 4);
  for (let i = 0; i < 4; i++) {
    m4.compose(V(-0.12 + r() * 0.1, Y + 0.0035, 0.3 + r() * 0.06), q.setFromEuler(e.set(Math.PI / 2, r() * 3, 0)), one);
    caps.setMatrixAt(i, m4);
  }
  g.add(caps);
  // un circuito stampato in lavorazione
  const pcb = box(0.09, 0.0016, 0.06, new THREE.MeshStandardMaterial({ color: 0x1f5a3a, roughness: 0.45, metalness: 0.1 }), 0.0006, 1);
  pcb.position.set(-0.3, Y + 0.0008, 0.33); pcb.rotation.y = 0.3;
  const chip = box(0.022, 0.004, 0.01, M.black, 0.0008, 1);
  chip.position.set(-0.3, Y + 0.0035, 0.33); chip.rotation.y = 0.3;
  g.add(pcb, chip);
  shadow(g);
  return g;
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

  const monitor = createMonitor(M);
  place(monitor.group, -0.45, -0.2, 0.12);
  updaters.push(monitor.update);
  sections.dev = monitor.group;

  const pad = createNotepad(M, data);
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
  root.add(smallParts(M));

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
  root.add(patchCable(M, 0x2f6fb0, [V(-0.12, Y + 0.004, 0.36), V(-0.08, Y + 0.004, 0.3), V(-0.16, Y + 0.004, 0.27), V(-0.2, Y + 0.004, 0.33), V(-0.13, Y + 0.004, 0.37), V(-0.04, Y + 0.004, 0.35)]));
  onProgress(1);

  // --- tocco cyberpunk: insegna al neon a forma d'onda e striscia LED sul fondo del banco ---
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

// insegna al neon: una forma d'onda rosso-magenta sotto il davanzale, dietro i synth,
// e una striscia LED ciano lungo il bordo posteriore del banco
function createNeon() {
  const g = new THREE.Group();
  g.name = "neon";
  const Y = DESK.y, z = -0.488;
  const pts = [];
  for (let i = 0; i <= 160; i++) {
    const u = i / 160, x = 0.26 + u * 0.66;
    const env = Math.sin(u * Math.PI);
    pts.push(V(x, Y + 0.16 + Math.sin(u * Math.PI * 7) * 0.045 * env + Math.sin(u * Math.PI * 19) * 0.008 * env, z));
  }
  const wave = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.0035, 8),
    new THREE.MeshStandardMaterial({ color: 0x220008, emissive: 0xff1f55, emissiveIntensity: 3.2 }));
  g.add(wave);
  // supporti trasparenti e cavetto
  const clipMat = new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: 0.2, transparent: true, opacity: 0.5 });
  for (const x of [0.32, 0.59, 0.86]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 10), clipMat);
    c.rotation.x = Math.PI / 2; c.position.set(x, Y + 0.16, z - 0.006);
    g.add(c);
  }
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.006, 0.008),
    new THREE.MeshStandardMaterial({ color: 0x001018, emissive: 0x19d9ff, emissiveIntensity: 3.2 }));
  strip.position.set(-0.44, Y + 0.004, DESK.z0 + 0.006);
  g.add(strip);
  // luce colorata sul muro
  const pink = new THREE.PointLight(0xff2a6a, 0.22, 0.9, 2);
  pink.position.set(0.59, Y + 0.26, z + 0.025);
  const cyan = new THREE.PointLight(0x19c8ff, 0.22, 1.0, 2);
  cyan.position.set(-0.2, Y + 0.12, z + 0.02);
  g.add(pink, cyan);
  const mat = wave.material;
  return {
    group: g,
    // un neon vero ogni tanto sfarfalla
    update(t) {
      const f = Math.sin(t * 0.7) > 0.985 ? 0.35 + 0.65 * Math.abs(Math.sin(t * 90)) : 1;
      mat.emissiveIntensity = 3.2 * f;
      pink.intensity = 0.22 * f;
    },
  };
}
