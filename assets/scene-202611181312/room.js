// Stanza: pareti, finestra sul Mar Piccolo con pioggia sul vetro, tende, poster ICHOS.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { plasterTextures, fabricTexture, posterTexture } from "./textures.js";

export const ROOM = {
  wallZ: -0.5, left: -1.6, right: 1.3, height: 2.7,
  win: { x0: -0.8, x1: 0.8, y0: 1.05, y1: 2.25 },
  glassZ: -0.6,
};

// --- Shader del vetro: fuori (cielo, costa, luci, acqua) + gocce -----------
const GLASS_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const GLASS_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uSize;
uniform float uRain;
varying vec2 vUv;
varying vec3 vWorld;

float h11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float a = .5, s = 0.;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; }
  return s;
}
float fbm3(vec2 p) {
  float a = .5, s = 0.;
  for (int i = 0; i < 3; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; }
  return s;
}

// Fuori: tutto e' funzione della direzione (azimut az, elevazione el in radianti),
// come un panorama all'infinito: muovendo la camera la vista cambia in modo credibile.
const float HOR = -0.045;          // linea dell'acqua sotto la costa opposta
const vec3 SODIUM = vec3(1.0, 0.56, 0.20);
const vec3 COLD = vec3(0.75, 0.86, 1.0);
const vec3 NEON_M = vec3(1.0, 0.12, 0.55);
const vec3 NEON_C = vec3(0.08, 0.85, 1.0);
// colore di una luce: sodio, bianco freddo e qualche insegna al neon
vec3 lightCol(float sd, out float boost) {
  float r = h11(sd + 9.7);
  boost = 1.0;
  if (r < 0.07) { boost = 1.8; return NEON_M; }
  if (r < 0.14) { boost = 1.8; return NEON_C; }
  if (r < 0.28) return COLD;
  return SODIUM;
}

float coast(float az) {
  float n = fbm3(vec2(az * 2.6 + 3.0, 0.5));
  float d = vnoise(vec2(az * 22.0, 7.0));
  return HOR + 0.016 + 0.075 * n * n + 0.004 * d;
}

vec3 sky(float az, float el, float t) {
  float h = max(el - HOR, 0.0);
  vec3 col = mix(vec3(0.018, 0.024, 0.045), vec3(0.006, 0.009, 0.020), smoothstep(0.0, 0.35, h));
  // bagliore della citta' sotto le nubi
  col += vec3(0.075, 0.034, 0.05) * exp(-h / 0.06);
  // nubi basse che scorrono piano
  float c = fbm(vec2(az * 3.2 - t * 0.012, el * 9.0 + 2.0));
  c = smoothstep(0.42, 0.78, c);
  vec3 cloud = mix(vec3(0.03, 0.034, 0.055), vec3(0.12, 0.06, 0.085), exp(-h / 0.1));
  col = mix(col, cloud, c * 0.85);
  return col;
}

// luci della costa: celle lungo l'azimut, due file sul lungomare + sparse sulle colline
vec3 lightsAt(float az, float el, float blur, float coastEl, float t) {
  vec3 acc = vec3(0.0);
  float cell = 0.0075;
  float id0 = floor(az / cell);
  float rad = 0.0009 + blur * 0.0013;
  for (int k = -1; k <= 1; k++) {
    float id = id0 + float(k);
    for (int row = 0; row < 2; row++) {
      float sd = id * 1.37 + float(row) * 17.1;
      if (h11(sd) > (row == 0 ? 0.42 : 0.2)) continue;
      float a = (id + 0.5 + (h11(sd + 3.1) - 0.5) * 0.7) * cell;
      float e = HOR + 0.0022 + float(row) * 0.0045 + h11(sd + 5.3) * 0.0022;
      vec2 d = vec2(az - a, el - e);
      float g = exp(-dot(d, d) / (rad * rad));
      float boost;
      vec3 c = lightCol(sd, boost);
      float flick = 0.88 + 0.12 * sin(t * (3.0 + h11(sd) * 5.0) + sd);
      acc += c * g * (0.9 + h11(sd + 1.9) * 1.3) * flick * boost;
    }
  }
  // colline: punti sparsi sotto il profilo
  vec2 gc = vec2(az / 0.008, (el - HOR) / 0.006);
  vec2 gi = floor(gc);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 id = gi + vec2(i, j);
    float hs = h21(id + 31.0);
    if (hs > 0.16) continue;
    vec2 p = (id + 0.5 + (h22(id) - 0.5) * 0.8) * vec2(0.008, 0.006);
    float pe = HOR + p.y;
    if (pe > coastEl - 0.003 || pe < HOR + 0.011) continue;
    vec2 d = vec2(az - p.x, el - pe);
    float g = exp(-dot(d, d) / (rad * rad * 0.7));
    acc += (hs < 0.04 ? COLD : SODIUM) * g * 0.7;
  }
  return acc;
}

// luci rosse intermittenti lontane (ciminiere, antenne)
vec3 redLights(float az, float el, float blur, float t) {
  vec3 acc = vec3(0.0);
  float rad = 0.0013 + blur * 0.0015;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float a = -0.42 + fi * 0.27 + h11(fi * 7.3) * 0.08;
    float e = coast(a) + 0.008 + h11(fi * 3.1) * 0.02;
    vec2 d = vec2(az - a, el - e);
    float on = smoothstep(0.0, 0.08, fract(t * 0.45 + fi * 0.31)) * (1.0 - smoothstep(0.42, 0.52, fract(t * 0.45 + fi * 0.31)));
    acc += vec3(1.0, 0.07, 0.03) * exp(-dot(d, d) / (rad * rad)) * on * 3.0;
  }
  return acc;
}

vec3 water(float az, float el, float blur, float t) {
  float dep = max(HOR - el, 0.0004);               // depressione sotto l'orizzonte
  vec2 wp = vec2(az / dep, 1.0 / dep);             // coordinate sul piano dell'acqua
  float rip = fbm3(vec2(wp.x * 0.9, wp.y * 0.55 - t * 0.35)) - 0.5;
  float fres = 0.04 + 0.96 * pow(1.0 - smoothstep(0.0, 0.35, dep), 5.0);
  vec3 col = vec3(0.004, 0.007, 0.012);
  col += sky(az + rip * dep * 0.6, HOR + dep * 0.9 + rip * 0.01, t) * (0.35 + 0.5 * fres);
  // riflessi allungati e tremolanti delle luci del lungomare
  float cell = 0.0075;
  float id0 = floor(az / cell);
  for (int k = -1; k <= 1; k++) {
    float id = id0 + float(k);
    for (int row = 0; row < 2; row++) {
      float sd = id * 1.37 + float(row) * 17.1;
      if (h11(sd) > (row == 0 ? 0.42 : 0.2)) continue;
      float a = (id + 0.5 + (h11(sd + 3.1) - 0.5) * 0.7) * cell;
      float wob = (vnoise(vec2(wp.y * 0.35 + id, t * 1.3)) - 0.5) * dep * 0.07;
      float w = 0.0006 + dep * 0.007 + blur * 0.0009;
      float dx = (az - a + wob) / w;
      float streak = exp(-dx * dx);
      float broken = smoothstep(0.38, 0.75, vnoise(vec2(id * 3.1 + float(row), wp.y * 0.45 - t * 1.8)));
      float len = exp(-dep / (0.028 + float(row) * 0.01));
      float boost;
      vec3 c = lightCol(sd, boost);
      col += c * streak * broken * len * (row == 0 ? 0.75 : 0.35) * boost;
    }
  }
  // riflesso rosso tremolante
  col += redLights(az + (vnoise(vec2(wp.y * 0.3, t)) - 0.5) * dep * 0.1, HOR + dep * 0.25 + 0.01, blur + 1.5, t) * 0.25 * exp(-dep / 0.05);
  return col;
}

vec3 outside(vec3 dir, float blur, float t) {
  float az = atan(dir.x, -dir.z);
  float el = asin(clamp(dir.y, -1.0, 1.0));
  vec3 col = vec3(0.0);
  if (el < HOR) {
    col = water(az, el, blur, t);
  } else {
    float ce = coast(az);
    float edge = 0.0012 + blur * 0.002;
    float land = 1.0 - smoothstep(ce - edge, ce + edge, el);
    vec3 hill = vec3(0.008, 0.008, 0.011) + vec3(0.025, 0.014, 0.008) * exp(-(el - HOR) / 0.02);
    col = mix(sky(az, el, t), hill, land);
    col += lightsAt(az, el, blur, ce, t);
    col += redLights(az, el, blur, t);
  }
  // foschia sul pelo dell'acqua
  col += vec3(0.05, 0.04, 0.035) * exp(-abs(el - HOR) / 0.006) * 0.5;
  return col;
}

// --- pioggia sul vetro (p in metri) ---
// restituisce: xy = deviazione della vista, z = quanto e' pulito il vetro (gocce e scie)
vec3 slidingDrops(vec2 p, float t, float scale) {
  vec2 cellSize = vec2(0.028, 0.20) * scale;
  vec2 g = p / cellSize;
  vec2 id = floor(g);
  vec2 f = fract(g);
  float hs = h21(id + scale * 13.0);
  float speed = 0.18 + hs * 0.25;
  float ph = fract(t * speed + h21(id + 4.7));
  float y = 0.95 - ph * 0.9 + 0.035 * sin(ph * 31.0 + hs * 6.0);  // scende a scatti
  float x = 0.5 + (hs - 0.5) * 0.45 + 0.05 * sin(y * 9.0 + hs * 20.0);
  float present = step(0.35, h21(id + 1.3));
  float fade = smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(0.88, 1.0, ph));
  vec2 asp = vec2(1.0, cellSize.y / cellSize.x);
  vec2 d = (f - vec2(x, y)) * asp;
  d.y *= 0.82;
  float r = 0.20 + hs * 0.08;
  float l = length(d);
  float drop = smoothstep(r, r * 0.7, l) * present * fade;
  // scia: goccioline lasciate sopra
  float above = f.y - y;
  float trailBand = smoothstep(0.0, 0.015, above) * (1.0 - smoothstep(0.1, 0.55, above)) * present * fade;
  float tx = (f.x - x) * asp.x;
  float slot = fract(f.y * 9.0) - 0.5;
  vec2 td = vec2(tx, slot * asp.y / 9.0 * 0.85);
  float tr = r * 0.38 * (1.0 - smoothstep(0.0, 0.5, above));
  float tdrop = smoothstep(tr, tr * 0.6, length(td)) * trailBand * step(0.25, h21(vec2(floor(f.y * 9.0), id.x)));
  float clear = max(drop, smoothstep(r * 0.9, r * 0.3, abs(tx)) * trailBand);
  vec2 off = d / r * drop + td / max(tr, 1e-3) * tdrop * 0.6;
  return vec3(off * cellSize.x * 2.4, clear);
}

vec3 staticDrops(vec2 p, float t) {
  vec2 g = p / 0.012;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  vec2 rnd = h22(id);
  float life = fract(t * 0.07 + h21(id + 9.1));
  float r = (0.12 + rnd.x * 0.22) * smoothstep(1.0, 0.75, life) * smoothstep(0.0, 0.05, life);
  vec2 d = f - (rnd - 0.5) * 0.5;
  float m = smoothstep(r, r * 0.6, length(d)) * step(0.87, h21(id + 2.2));
  return vec3(d / max(r, 1e-3) * m * 0.012, m);
}

void main() {
  vec2 p = vUv * uSize;
  float t = uTime;
  vec3 a = slidingDrops(p, t, 1.0);
  vec3 b = slidingDrops(p + vec2(0.37, 0.11), t * 0.8, 0.72);
  vec3 s = staticDrops(p, t);
  vec2 off = (a.xy + b.xy + s.xy) * uRain;
  float clear = clamp(max(max(a.z, b.z), s.z) * uRain, 0.0, 1.0);

  vec3 dir = normalize(vWorld - cameraPosition);
  // le gocce fanno da lenti: deviano (e capovolgono) la vista
  dir = normalize(dir - vec3(off.x * 9.0, off.y * 9.0, 0.0));
  float blur = mix(1.0, 0.15, clear);
  vec3 col = outside(dir, blur, t);

  // vetro appannato: foschia fredda dove non passano gocce
  float fog = 0.32 * (1.0 - clear) * uRain;
  vec3 fogCol = vec3(0.016, 0.020, 0.028) + col * 0.4;
  col = mix(col, fogCol, fog);
  // bordo delle gocce: leggero scuro + riflesso della lampada in alto a sinistra
  float rim = smoothstep(0.55, 1.0, length(off) * 45.0) * clear;
  col *= 1.0 - 0.12 * rim;
  col += vec3(0.20, 0.13, 0.07) * smoothstep(0.6, 1.0, dot(normalize(off + 1e-5), normalize(vec2(-0.6, 0.8)))) * rim * 0.5;
  col += vec3(0.010, 0.007, 0.004) * (1.0 - vUv.y);
  gl_FragColor = vec4(col, 1.0);
}`;

export function createGlass() {
  const w = ROOM.win.x1 - ROOM.win.x0, h = ROOM.win.y1 - ROOM.win.y0;
  const mat = new THREE.ShaderMaterial({
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    uniforms: { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(w, h) }, uRain: { value: 1 } },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set((ROOM.win.x0 + ROOM.win.x1) / 2, (ROOM.win.y0 + ROOM.win.y1) / 2, ROOM.glassZ);
  mesh.name = "glass";
  return mesh;
}

// --- tende con leggera ondulazione da vertex shader ------------------------
function curtain(x0, x1, y0, y1, z, mat, seed) {
  const w = x1 - x0, h = y1 - y0;
  const geo = new THREE.PlaneGeometry(w, h, 48, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const u = (x + w / 2) / w, v = (y + h / 2) / h; // v=1 in alto
    const folds = Math.sin(u * Math.PI * 9 + seed) * 0.022 + Math.sin(u * Math.PI * 3.3 + seed * 2) * 0.012;
    const gather = 1 - 0.22 * v;  // un po' raccolta in alto
    pos.setX(i, x * gather);
    pos.setZ(i, folds * (0.75 + 0.25 * v));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  return m;
}

function curtainMaterial(timeUniform) {
  const mat = new THREE.MeshStandardMaterial({ map: fabricTexture(), roughness: 0.95, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = timeUniform;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float sway = (1.0 - (position.y + 0.72) / 1.45);
      transformed.z += sin(position.x * 14.0 + uTime * 0.7) * 0.006 * sway + sin(uTime * 0.31 + position.y * 2.0) * 0.004 * sway;`
    );
  };
  return mat;
}

export function createRoom(ctx) {
  const { ui } = ctx;
  const group = new THREE.Group();
  group.name = "room";
  const { wallZ, left, right, height, win } = ROOM;

  // pareti intonacate scure
  const plaster = plasterTextures();
  plaster.map.repeat.set(1.3, 1.3); plaster.bumpMap.repeat.set(1.3, 1.3);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: plaster.map, bumpMap: plaster.bumpMap, bumpScale: 1.2, roughness: 0.94 });

  const shape = new THREE.Shape();
  shape.moveTo(left, 0); shape.lineTo(right, 0); shape.lineTo(right, height); shape.lineTo(left, height); shape.lineTo(left, 0);
  const hole = new THREE.Path();
  hole.moveTo(win.x0, win.y0); hole.lineTo(win.x0, win.y1); hole.lineTo(win.x1, win.y1); hole.lineTo(win.x1, win.y0); hole.lineTo(win.x0, win.y0);
  shape.holes.push(hole);
  const depth = 0.22;
  const back = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), wallMat);
  back.position.z = wallZ - depth;
  back.receiveShadow = true;
  group.add(back);

  const sideGeo = new THREE.PlaneGeometry(3.2, height);
  const rightWall = new THREE.Mesh(sideGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(right, height / 2, wallZ + 1.6);
  rightWall.receiveShadow = true;
  group.add(rightWall);
  const leftWall = new THREE.Mesh(sideGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(left, height / 2, wallZ + 1.6);
  group.add(leftWall);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.4), new THREE.MeshStandardMaterial({ color: 0x17130f, roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((left + right) / 2, 0, wallZ + 1.7);
  floor.receiveShadow = true;
  group.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.4), new THREE.MeshStandardMaterial({ color: 0x1d2026, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set((left + right) / 2, height, wallZ + 1.7);
  group.add(ceil);

  // finestra: telaio in legno verniciato, montante centrale, traversi delle ante
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x847b6e, roughness: 0.6 });
  const fz = ROOM.glassZ + 0.02;
  const W = win.x1 - win.x0, H = win.y1 - win.y0, cx = (win.x0 + win.x1) / 2, cy = (win.y0 + win.y1) / 2;
  const bar = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.008), frameMat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  };
  const ft = 0.075;
  bar(W, ft, 0.07, cx, win.y1 - ft / 2, fz);
  bar(W, ft, 0.07, cx, win.y0 + ft / 2, fz);
  bar(ft, H, 0.07, win.x0 + ft / 2, cy, fz);
  bar(ft, H, 0.07, win.x1 - ft / 2, cy, fz);
  bar(0.09, H - ft * 2, 0.08, cx, cy, fz + 0.01);           // battuta centrale delle ante
  bar(W / 2 - ft, 0.045, 0.05, cx - W / 4, win.y0 + 0.38, fz); // traversi
  bar(W / 2 - ft, 0.045, 0.05, cx + W / 4, win.y0 + 0.38, fz);
  // maniglia
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.11, 12), new THREE.MeshStandardMaterial({ color: 0x9a8f7c, metalness: 0.9, roughness: 0.35 }));
  handle.position.set(cx + 0.03, cy - 0.05, fz + 0.06);
  group.add(handle);

  // davanzale in pietra
  const sill = new THREE.Mesh(new RoundedBoxGeometry(W + 0.16, 0.035, 0.3, 2, 0.008), new THREE.MeshStandardMaterial({ color: 0x8f8a82, roughness: 0.42 }));
  sill.position.set(cx, win.y0 - 0.015, wallZ - 0.08);
  sill.receiveShadow = true; sill.castShadow = true;
  group.add(sill);

  // vetro
  const glass = createGlass();
  group.add(glass);

  // tende e bastone
  const curtainTime = { value: 0 };
  const cMat = curtainMaterial(curtainTime);
  const cl = curtain(win.x0 - 0.52, win.x0 + 0.06, 0.95, 2.42, wallZ + 0.06, cMat, 0.4);
  const cr = curtain(win.x1 - 0.06, win.x1 + 0.45, 0.95, 2.42, wallZ + 0.06, cMat, 2.1);
  for (const c of [cl, cr]) { c.castShadow = true; c.receiveShadow = true; c.userData.dynamic = true; group.add(c); }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, W + 1.15, 16), new THREE.MeshStandardMaterial({ color: 0x2a221b, metalness: 0.6, roughness: 0.4 }));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(cx - 0.03, 2.44, wallZ + 0.07);
  group.add(rod);

  // poster ICHOS sulla parete destra
  const pw = 0.52, ph = pw * 1088 / 768;
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: posterTexture(ui), roughness: 0.82 }));
  poster.rotation.y = -Math.PI / 2;
  poster.position.set(right - 0.004, 1.62, -0.05);
  poster.rotation.z = 0.012;
  poster.receiveShadow = true;
  group.add(poster);
  // nastro adesivo agli angoli
  const tapeMat = new THREE.MeshStandardMaterial({ color: 0xd9cfb5, roughness: 0.7, transparent: true, opacity: 0.8 });
  for (const [dz, dy, rot] of [[-pw / 2, ph / 2, 0.6], [pw / 2, ph / 2, -0.5]]) {
    const tp = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.022), tapeMat);
    tp.rotation.y = -Math.PI / 2; tp.rotation.x = rot;
    tp.position.set(right - 0.006, 1.62 + dy - 0.005, -0.05 + dz * 0.96);
    group.add(tp);
  }

  // luce fredda dalla finestra
  const moon = new THREE.DirectionalLight(0x5f86d8, 0.6);
  moon.position.set(-0.6, 2.6, -3.2);
  moon.target.position.set(0.2, 0.75, 0.4);
  group.add(moon, moon.target);
  const fill = new THREE.HemisphereLight(0x2c3466, 0x0b0710, 0.5);
  group.add(fill);
  // la finestra stessa illumina appena il davanzale e il fondo del banco
  const winGlow = new THREE.PointLight(0x5a7bb3, 0.35, 2.4, 2);
  winGlow.position.set(cx, cy - 0.2, wallZ + 0.1);
  group.add(winGlow);

  return {
    group,
    glass,
    poster,
    update(t) {
      glass.material.uniforms.uTime.value = t;
      curtainTime.value = t;
    },
  };
}
