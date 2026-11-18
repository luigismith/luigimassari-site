// Stanza: pareti scure e vetrata panoramica sul Mar Piccolo con pioggia sul vetro.
import * as THREE from "three";
import { plasterTextures } from "./textures.js";

export const ROOM = {
  wallZ: -0.5, left: -1.6, right: 1.3, height: 2.7,
  win: { x0: -1.45, x1: 1.1, y0: 0.85, y1: 2.5 },
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
uniform float uDay;   // 0 = notte (tema scuro), 1 = giorno (tema chiaro)
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

// --- Taranto: il canale navigabile con il ponte girevole e il castello aragonese ---------------
// u = distanza dal centro del canale in mezze larghezze: |u| < 1 e' acqua (dietro, il Mar Grande).
// A sinistra il borgo con i suoi isolati, a destra la citta' vecchia con le torri tonde del castello.
const float AZB = 0.42;            // azimut del centro del canale
const float HWB = 0.075;           // meta' larghezza del canale
const float DECK = 0.017;          // quota dell'impalcato sopra l'acqua
float townU(float az) { return (az - AZB) / HWB; }
float townK(float u) { return 1.0 - smoothstep(2.3, 3.1, abs(u)); }
const float T1 = 1.27, T2 = 1.87;  // centri delle due torri del castello
float towers(float u) {
  float a = 1.0 - smoothstep(0.150, 0.165, abs(u - T1));
  float b = 1.0 - smoothstep(0.125, 0.140, abs(u - T2));
  return max(a, b);
}
// luce su una torre tonda: piena al centro, in ombra ai bordi; piu' una riga scura sotto il coronamento
float towerShade(float u, float y) {
  float r = min(abs(u - T1) / 0.165, abs(u - T2) / 0.140);
  float round = sqrt(max(1.0 - r * r, 0.0));
  float cordon = 1.0 - 0.45 * (1.0 - smoothstep(0.0, 0.0011, abs(y - 0.0232)));
  return (0.30 + 0.70 * round) * cordon;
}
bool inCastle(float u) { return u > 1.0 && u < 2.08; }
float townProfile(float u) {
  float h = 0.022 + 0.007 * step(0.45, h11(floor(u * 6.0) + 40.0));    // isolati del borgo
  if (u > 0.0) h = 0.021 + 0.006 * step(0.5, h11(floor(u * 7.0) + 11.0)); // case della citta' vecchia
  if (inCastle(u)) h = mix(0.0185, 0.0285, towers(u));                 // cortina del castello e torri
  if (abs(u) < 1.0) h = 0.0;                                           // il canale
  return h;
}
// profilo di tutto quello che sta sopra l'acqua: colline lontane e, intorno al canale, la citta'
float skyline(float az) {
  float u = townU(az);
  return mix(coast(az), HOR + townProfile(u), townK(u));
}
// ponte girevole: due meta' che si incontrano al centro, con l'intradosso ad arco ribassato
float bridgeUnder(float u) { return DECK - 0.0036 - 0.0094 * u * u; }
float bridgeMask(float u, float y, float edge) {
  float yb = abs(u) < 1.0 ? bridgeUnder(u) : 0.0;
  return step(abs(u), 1.12) * smoothstep(yb - edge, yb + edge, y) * (1.0 - smoothstep(DECK - edge, DECK + edge, y));
}
const int LAMPS = 11;              // lampioni sul parapetto
float lampU(int i) { return -1.05 + float(i) * 0.21; }

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
      if (abs(townU(a)) < 1.03) continue;                       // il canale e' acqua
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
    if (inCastle(townU(p.x))) continue;                         // il castello non ha finestre accese
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
      if (abs(townU(a)) < 1.03) continue;
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
  // riflessi del ponte girevole e del castello
  float u = townU(az);
  if (abs(u) < 2.3) {
    float wobb = (vnoise(vec2(wp.y * 0.35 + 5.0, t * 1.3)) - 0.5) * dep * 0.07;
    float uu = u + wobb / HWB;
    float brk = smoothstep(0.3, 0.75, vnoise(vec2(u * 26.0, wp.y * 0.45 - t * 1.8)));
    float w = 0.0006 + dep * 0.007 + blur * 0.0009;
    for (int i = 0; i < LAMPS; i++) {
      float dx = (uu - lampU(i)) * HWB / w;
      col += SODIUM * exp(-dx * dx) * brk * exp(-dep / 0.03) * 0.26;
    }
    if (abs(uu) < 1.0) col *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, DECK, dep));   // sotto il ponte l'acqua e' piu' scura
    if (inCastle(uu)) col += vec3(0.085, 0.050, 0.020) * exp(-dep / 0.022) * (0.3 + 0.7 * brk);
  }
  // riflesso rosso tremolante
  col += redLights(az + (vnoise(vec2(wp.y * 0.3, t)) - 0.5) * dep * 0.1, HOR + dep * 0.25 + 0.01, blur + 1.5, t) * 0.25 * exp(-dep / 0.05);
  return col;
}

// facciate di notte: castello illuminato dal basso (pietra calda), case appena schiarite dai lampioni
vec3 townNight(float u, float y) {
  vec3 c = vec3(0.012, 0.011, 0.013) + vec3(0.07, 0.042, 0.02) * exp(-y / 0.007);
  if (inCastle(u)) {
    float shade = mix(0.42, towerShade(u, y), towers(u));          // cortina in ombra, torri tonde in luce
    float foot = 0.35 + 0.65 * exp(-y / 0.014);
    float stone = 0.85 + 0.15 * vnoise(vec2(u * 60.0, y * 1400.0));
    c = vec3(0.012, 0.011, 0.013) + vec3(0.30, 0.175, 0.075) * shade * foot * stone * 0.5;   // luce bassa e calda, non un faro
  }
  return c;
}
// Ponte di notte: una sagoma in controluce sul chiarore dell'orizzonte, con i lampioni dello stesso colore
// e della stessa forza di quelli del lungomare. Deve stare dentro il paesaggio, non staccarsi.
vec3 bridgeNight(vec3 col, float u, float y, float blur, float t) {
  float edge = 0.0005 + blur * 0.0010;
  float yb = abs(u) < 1.0 ? bridgeUnder(u) : 0.0;
  vec3 steel = vec3(0.015, 0.016, 0.021) + vec3(0.040, 0.024, 0.011) * exp(-max(DECK - y, 0.0) / 0.004);
  col = mix(col, steel, bridgeMask(u, y, edge));
  if (abs(u) < 1.0) {                                           // un filo di luce calda sotto l'arco, riflessa dall'acqua
    float da = (y - yb) / (0.0008 + blur * 0.0011);
    col += vec3(0.085, 0.050, 0.020) * exp(-da * da);
  }
  float rad = 0.0009 + blur * 0.0012;
  for (int i = 0; i < LAMPS; i++) {
    float fi = float(i);
    vec2 d = vec2((u - lampU(i)) * HWB, y - (DECK + 0.0036));
    float flick = 0.9 + 0.1 * sin(t * (2.0 + h11(fi + 2.0) * 3.0) + fi);
    col += SODIUM * exp(-dot(d, d) / (rad * rad)) * (0.50 + 0.35 * h11(fi + 4.0)) * flick;
  }
  return col;
}

vec3 outside(vec3 dir, float blur, float t) {
  float az = atan(dir.x, -dir.z);
  float el = asin(clamp(dir.y, -1.0, 1.0));
  vec3 col = vec3(0.0);
  if (el < HOR) {
    col = water(az, el, blur, t);
  } else {
    float u = townU(az), y = el - HOR;
    float ce = skyline(az);
    float edge = 0.0012 + blur * 0.002;
    float land = 1.0 - smoothstep(ce - edge, ce + edge, el);
    vec3 hill = vec3(0.008, 0.008, 0.011) + vec3(0.025, 0.014, 0.008) * exp(-(el - HOR) / 0.02);
    if (abs(u) < 3.1) hill = mix(hill, townNight(u, y), townK(u));
    col = mix(sky(az, el, t), hill, land);
    col += lightsAt(az, el, blur, ce, t);
    col += redLights(az, el, blur, t);
    if (abs(u) < 1.4) col = bridgeNight(col, u, y, blur, t);
  }
  // foschia sul pelo dell'acqua
  col += vec3(0.05, 0.04, 0.035) * exp(-abs(el - HOR) / 0.006) * 0.5;
  return col;
}

// --- lo stesso panorama di giorno, con cielo coperto ---
vec3 daySky(float az, float el, float t) {
  float h = max(el - HOR, 0.0);
  vec3 col = mix(vec3(0.60, 0.65, 0.69), vec3(0.34, 0.44, 0.58), smoothstep(0.0, 0.45, h));
  float c = fbm(vec2(az * 3.2 - t * 0.012, el * 9.0 + 2.0));
  return mix(col, vec3(0.72, 0.74, 0.76), smoothstep(0.42, 0.78, c) * 0.7);
}
vec3 townDay(float u, float y) {
  // case chiare con le file di finestre
  float win = step(0.55, fract(u * 18.0)) * step(0.5, fract(y / 0.0042)) * step(0.006, y);
  vec3 c = mix(vec3(0.62, 0.61, 0.58), vec3(0.36, 0.38, 0.40), win * 0.7) * (0.9 + 0.1 * h11(floor(u * 6.0)));
  if (inCastle(u)) {
    float shade = mix(0.74, 0.55 + 0.45 * towerShade(u, y), towers(u));
    c = vec3(0.56, 0.50, 0.41) * shade * (0.92 + 0.08 * vnoise(vec2(u * 60.0, y * 1400.0)));
  }
  return c;
}
vec3 dayOutside(vec3 dir, float blur, float t) {
  float az = atan(dir.x, -dir.z);
  float el = asin(clamp(dir.y, -1.0, 1.0));
  vec3 col = vec3(0.0);
  if (el < HOR) {
    float dep = max(HOR - el, 0.0004);
    vec2 wp = vec2(az / dep, 1.0 / dep);
    float rip = fbm3(vec2(wp.x * 0.9, wp.y * 0.55 - t * 0.35)) - 0.5;
    col = mix(vec3(0.30, 0.38, 0.44), vec3(0.15, 0.22, 0.28), smoothstep(0.0, 0.3, dep)) + rip * 0.07;
    col = mix(col, daySky(az, HOR + dep, t), 0.25);
    float u = townU(az) + rip * 0.25;                            // riflesso scuro del ponte e chiaro del castello
    if (abs(u) < 1.0) col *= 1.0 - 0.28 * smoothstep(bridgeUnder(u) - 0.004, bridgeUnder(u), dep) * (1.0 - smoothstep(DECK, DECK + 0.006, dep));
    if (inCastle(u)) col = mix(col, vec3(0.50, 0.47, 0.42), 0.22 * exp(-dep / 0.03));
  } else {
    float u = townU(az), y = el - HOR;
    float ce = skyline(az);
    float edge = 0.0012 + blur * 0.002;
    float land = 1.0 - smoothstep(ce - edge, ce + edge, el);
    vec3 hill = mix(vec3(0.20, 0.26, 0.29), vec3(0.36, 0.42, 0.45), smoothstep(0.0, 0.05, el - HOR));
    if (abs(u) < 3.1) hill = mix(hill, mix(townDay(u, y), daySky(az, HOR + 0.02, t), 0.42), townK(u));   // velati dalla distanza
    col = mix(daySky(az, el, t), hill, land);
    if (abs(u) < 1.4) {                                          // ponte girevole: acciaio grigio azzurro, parapetto e lampioni
      float be = 0.0005 + blur * 0.0010;
      float yb = abs(u) < 1.0 ? bridgeUnder(u) : 0.0;
      vec3 steel = mix(vec3(0.12, 0.16, 0.20), vec3(0.26, 0.33, 0.38), smoothstep(yb, DECK, y));
      steel *= 1.0 - 0.4 * exp(-abs(u) / 0.012);
      steel = mix(steel, daySky(az, HOR + 0.02, t), 0.36);
      col = mix(col, steel, bridgeMask(u, y, be));
      float rail = (1.0 - smoothstep(0.0, 0.0012 + be, abs(y - DECK - 0.0012))) * step(abs(u), 1.12);
      col = mix(col, vec3(0.30, 0.34, 0.38), rail * 0.6);
      for (int i = 0; i < LAMPS; i++) {
        float post = (1.0 - smoothstep(0.0, 0.0011 + be, abs(u - lampU(i)) * HWB)) * step(DECK, y) * (1.0 - smoothstep(DECK + 0.0048, DECK + 0.0056, y));
        col = mix(col, vec3(0.30, 0.34, 0.38), post * 0.6);
      }
    }
  }
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
  // MODE: 0 = notte, 1 = giorno: due varianti dello shader, ogni tema calcola solo il suo panorama
#if MODE == 0
  vec3 col = outside(dir, blur, t);
#else
  vec3 col = dayOutside(dir, blur, t);
#endif

  // vetro appannato: foschia fredda dove non passano gocce
  float fog = 0.32 * (1.0 - clear) * uRain;
  vec3 fogCol = mix(vec3(0.016, 0.020, 0.028), vec3(0.30, 0.33, 0.35), uDay) + col * 0.4;
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
  // due varianti dello stesso shader con le stesse uniform: notte e giorno
  const uniforms = { uTime: { value: 0 }, uSize: { value: new THREE.Vector2(w, h) }, uRain: { value: 1 }, uDay: { value: 0 } };
  const variants = [0, 1].map((MODE) => new THREE.ShaderMaterial({ vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG, uniforms, defines: { MODE } }));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), variants[0]);
  mesh.userData.variants = variants;
  mesh.position.set((ROOM.win.x0 + ROOM.win.x1) / 2, (ROOM.win.y0 + ROOM.win.y1) / 2, ROOM.glassZ);
  mesh.name = "glass";
  return mesh;
}

const C3 = (hex) => new THREE.Color(hex);
const NIGHT = { moon: C3(0x5f86d8), sky: C3(0x2c3466), ground: C3(0x0b0710), floor: C3(0x17130f), ceil: C3(0x1d2026) };
const DAY = { moon: C3(0xfff3e2), sky: C3(0xd5dee8), ground: C3(0x8f887b), floor: C3(0x6b6156), ceil: C3(0xc4c9cc) };

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

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x17130f, roughness: 0.8 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.4), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((left + right) / 2, 0, wallZ + 1.7);
  floor.receiveShadow = true;
  group.add(floor);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1d2026, roughness: 1 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.4), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set((left + right) / 2, height, wallZ + 1.7);
  group.add(ceil);

  // vetrata panoramica: telaio sottile in metallo nero, due montanti
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.35, metalness: 0.8 });
  const fz = ROOM.glassZ + 0.02;
  const W = win.x1 - win.x0, H = win.y1 - win.y0, cx = (win.x0 + win.x1) / 2, cy = (win.y0 + win.y1) / 2;
  const bar = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat);
    m.position.set(x, y, z); m.castShadow = true;
    group.add(m);
  };
  const ft = 0.028;
  bar(W, ft, 0.05, cx, win.y1 - ft / 2, fz);
  bar(W, ft, 0.05, cx, win.y0 + ft / 2, fz);
  bar(ft, H, 0.05, win.x0 + ft / 2, cy, fz);
  bar(ft, H, 0.05, win.x1 - ft / 2, cy, fz);
  for (const k of [1, 2]) bar(0.022, H - ft * 2, 0.045, win.x0 + (W * k) / 3, cy, fz);
  // mensola sottile sotto la vetrata
  const sill = new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.018, 0.16), frameMat);
  sill.position.set(cx, win.y0 - 0.009, wallZ - 0.03);
  sill.receiveShadow = true;
  group.add(sill);

  // vetro
  const glass = createGlass();
  group.add(glass);

  // filo di luce ambra sopra la vetrata
  const cove = new THREE.Mesh(new THREE.BoxGeometry(W, 0.006, 0.006), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.3, 0.45) }));
  cove.position.set(cx, win.y1 + 0.03, wallZ + 0.004);
  group.add(cove);

  // luce fredda dalla finestra
  const moon = new THREE.DirectionalLight(0x5f86d8, 0.6);
  moon.position.set(-0.6, 2.6, -3.2);
  moon.target.position.set(0.2, 0.75, 0.4);
  group.add(moon, moon.target);
  const fill = new THREE.HemisphereLight(0x2c3466, 0x0b0710, 0.62);
  group.add(fill);
  return {
    group,
    glass,
    // k: 0 = notte, 1 = giorno. Di giorno entra luce chiara dalla vetrata e le pareti schiariscono.
    setDay(k) {
      const L = THREE.MathUtils.lerp;
      glass.material = glass.userData.variants[k < 0.5 ? 0 : 1];
      glass.material.uniforms.uDay.value = k;
      moon.color.lerpColors(NIGHT.moon, DAY.moon, k);
      moon.intensity = L(0.6, 1.4, k);
      fill.color.lerpColors(NIGHT.sky, DAY.sky, k);
      fill.groundColor.lerpColors(NIGHT.ground, DAY.ground, k);
      fill.intensity = L(0.62, 1.9, k);
      wallMat.color.setScalar(L(1, 3.3, k));
      floorMat.color.lerpColors(NIGHT.floor, DAY.floor, k);
      ceilMat.color.lerpColors(NIGHT.ceil, DAY.ceil, k);
      cove.material.color.setRGB(L(2.2, 0.9, k), L(1.3, 0.6, k), L(0.45, 0.3, k));
    },
    update(t) {
      glass.material.uniforms.uTime.value = t;
    },
  };
}
