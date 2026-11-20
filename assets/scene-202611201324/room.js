// Stanza: pareti scure e vetrata panoramica sul Mar Grande con pioggia sul vetro.
import * as THREE from "three";
import { plasterTextures, canvas, tex, FONT } from "./textures.js";
import { PATCH, heavens } from "./sky.js";

export const ROOM = {
  wallZ: -0.5, left: -1.6, right: 1.3, height: 2.7,
  win: { x0: -1.45, x1: 1.1, y0: 0.85, y1: 2.5 },
  glassZ: -0.6,
};

// --- Poster sulla parete sinistra: tipografia e righe, tutto disegnato qui (niente immagini) ---
// "Elettrofoni, catalogo delle macchine sonore": il titolo, una pila di forme d'onda che passano piano da sinusoide
// a quadra (righe in rilievo, ognuna copre quella dietro) e le quattro onde di base. Ambra e rosa di sera, anni '70.
function posterCanvas(en) {
  const CW = 832, CH = 1184, PAD = 72, IN = CW - PAD * 2;
  const c = canvas(CW, CH), x = c.getContext("2d");
  const AMB = "#F2A33A", HOT = "#FF7A2E", ROSE = "#E0306F", PAPER = "#0d1119", INK = "#F1E7D3";
  const bg = x.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, "#0b1018"); bg.addColorStop(0.7, "#101520"); bg.addColorStop(1, "#1a1118");
  x.fillStyle = bg; x.fillRect(0, 0, CW, CH);
  for (let i = 0; i < 2600; i++) {                                  // grana della carta
    x.fillStyle = `rgba(255, 238, 210, ${Math.random() * 0.035})`;
    x.fillRect(Math.random() * CW, Math.random() * CH, 1.6, 1.6);
  }
  const mono = (size, weight = 600) => { x.font = `${weight} ${size}px ui-monospace, Consolas, "Courier New", monospace`; };
  const track = (text, px, y, size, color, align = "left", gap = 4) => {   // testo con spaziatura larga
    mono(size); x.fillStyle = color;
    let w = 0; for (const ch of text) w += x.measureText(ch).width + gap; w -= gap;
    let cx = align === "left" ? px : align === "right" ? px - w : px - w / 2;
    x.textAlign = "left"; x.textBaseline = "alphabetic";
    for (const ch of text) { x.fillText(ch, cx, y); cx += x.measureText(ch).width + gap; }
  };
  // testata: tre strisce e la sigla del foglio
  [[AMB, 0], [HOT, 11], [ROSE, 22]].forEach(([col, dy]) => { x.fillStyle = col; x.fillRect(PAD, 62 + dy, 92, 6); });
  track(en ? "CATALOGUE  VOL. I" : "CATALOGO  VOL. I", CW - PAD, 80, 24, "rgba(241, 231, 211, 0.62)", "right", 5);
  // titolo: il corpo piu' grande con cui sta in una riga
  x.textAlign = "left"; x.textBaseline = "alphabetic";
  let size = 130; do { size -= 4; x.font = `800 ${size}px ${FONT}`; } while (x.measureText("ELETTROFONI").width > IN && size > 40);
  x.fillStyle = INK; x.fillText("ELETTROFONI", PAD - 3, 214);
  x.fillStyle = AMB; x.fillRect(PAD, 244, IN, 3);
  x.fillStyle = "rgba(241, 231, 211, 0.9)"; x.font = `500 38px ${FONT}`;
  x.fillText(en ? "catalogue of sound machines" : "catalogo delle macchine sonore", PAD, 298);

  // pila di forme d'onda: a ogni riga la forma cambia un poco, dalla sinusoide alla quadra
  const shapes = [
    (p) => Math.sin(p),
    (p) => (2 / Math.PI) * Math.asin(Math.sin(p)),
    (p) => 2 * (((p / (2 * Math.PI)) % 1 + 1) % 1) - 1,
    (p) => Math.tanh(4.2 * Math.sin(p)),
  ];
  const N = 17, top = 380, step = 27, amp = 40, x0 = PAD, x1 = CW - PAD;
  for (let i = 0; i < N; i++) {
    const m = (i / (N - 1)) * (shapes.length - 1), a = Math.min(Math.floor(m), shapes.length - 2), f = m - a;
    const y0 = top + i * step, ph = 0.35 + i * 0.05;
    const wave = (px) => {
      const p = ((px - x0) / (x1 - x0)) * Math.PI * 2 * 3 + ph;
      return y0 - amp * ((1 - f) * shapes[a](p) + f * shapes[a + 1](p)) * (0.55 + 0.45 * Math.sin(((px - x0) / (x1 - x0)) * Math.PI));
    };
    x.beginPath(); x.moveTo(x0, y0 + 90);
    for (let px = x0; px <= x1; px += 3) x.lineTo(px, wave(px));
    x.lineTo(x1, y0 + 90); x.closePath();
    x.fillStyle = PAPER; x.fill();                                   // la riga copre quelle dietro
    const t = i / (N - 1);
    x.beginPath();
    for (let px = x0; px <= x1; px += 3) (px === x0 ? x.moveTo(px, wave(px)) : x.lineTo(px, wave(px)));
    x.lineWidth = 3.2; x.lineJoin = "round";
    x.strokeStyle = t < 0.5 ? `rgba(242, 163, 58, ${0.5 + t})` : `rgba(${Math.round(255 - (t - 0.5) * 70)}, ${Math.round(150 - (t - 0.5) * 190)}, ${Math.round(58 + (t - 0.5) * 100)}, 0.98)`;
    x.stroke();
  }
  // le quattro onde di base, ognuna con il suo nome
  const names = en ? ["SINE", "TRIANGLE", "SAWTOOTH", "SQUARE"] : ["SINUSOIDE", "TRIANGOLARE", "DENTE DI SEGA", "ONDA QUADRA"];
  const colW = IN / 4, baseY = 928;
  x.fillStyle = "rgba(241, 231, 211, 0.22)"; x.fillRect(PAD, baseY - 66, IN, 2);
  names.forEach((nm, i) => {
    const cx0 = PAD + i * colW + 6, w = colW - 36;
    x.beginPath();
    for (let px = 0; px <= w; px += 2) {
      const p = (px / w) * Math.PI * 4, v = shapes[i](p);
      (px === 0 ? x.moveTo : x.lineTo).call(x, cx0 + px, baseY - 6 - v * 26);
    }
    x.lineWidth = 4.5; x.lineJoin = "round"; x.strokeStyle = i % 2 ? HOT : AMB; x.stroke();
    track(`0${i + 1}`, cx0, baseY + 52, 20, ROSE, "left", 3);
    track(nm, cx0, baseY + 82, nm.length > 10 ? 15 : 18, "rgba(241, 231, 211, 0.82)", "left", 1.5);
  });
  // in fondo: i blocchi di una macchina sonora e le tre strisce
  x.fillStyle = "rgba(241, 231, 211, 0.22)"; x.fillRect(PAD, 1040, IN, 2);
  track(en ? "OSCILLATOR - FILTER - ENVELOPE - SEQUENCER" : "OSCILLATORE - FILTRO - INVILUPPO - SEQUENCER", PAD, 1086, 19, "rgba(241, 231, 211, 0.72)", "left", 2);
  [[AMB, 0], [HOT, 11], [ROSE, 22]].forEach(([col, dy]) => { x.fillStyle = col; x.fillRect(PAD, 1112 + dy, IN, 6); });
  return c;
}

function posterWall(frameMat, glowMat) {
  const g = new THREE.Group();
  g.name = "poster";
  const W = 0.52, H = 0.74;
  const en = (document.documentElement.lang || "it").startsWith("en");
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, map: tex(posterCanvas(en)) });
  material.emissiveMap = material.map; material.emissive = new THREE.Color(0xffffff); material.emissiveIntensity = 0.5;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(W, H), material);
  sheet.position.z = 0.012;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.03, H + 0.03, 0.02), frameMat);   // cornice nera sottile
  frame.position.z = 0.002;
  const light = new THREE.Mesh(new THREE.BoxGeometry(W * 0.7, 0.006, 0.006), glowMat);       // filo di luce ambra sopra
  light.position.set(0, H / 2 + 0.034, 0.014);
  // la luce ambra sbava un poco sul muro, solo di sera
  const gc = canvas(128, 128), gx = gc.getContext("2d"), gg = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gg.addColorStop(0, "rgba(255, 150, 60, 0.55)"); gg.addColorStop(0.55, "rgba(255, 120, 40, 0.16)"); gg.addColorStop(1, "rgba(255, 110, 40, 0)");
  gx.fillStyle = gg; gx.fillRect(0, 0, 128, 128);
  const spill = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.3, H * 1.9), new THREE.MeshBasicMaterial({ map: tex(gc, { mips: false }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.22 }));
  spill.position.z = 0.0015;
  spill.renderOrder = 1;
  g.add(spill, frame, sheet, light);
  g.userData.material = material;
  g.userData.spill = spill.material;
  return g;
}

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
uniform float uDay;   // 0 = notte (tema scuro), 1 = giorno (tema chiaro); in mezzo il crepuscolo (solo "dal vivo")
uniform float uCloud; // nuvolosita': 0 sereno, 1 coperto. Tema scuro 0.66, tema chiaro 1 (i cieli di sempre)
uniform float uDusk;  // 0..1: quanto l'orizzonte si scalda all'alba e al tramonto (0 nei temi scuro e chiaro)
uniform float uAlpha; // opacita': 1, tranne che per il panorama di giorno sovrapposto a quello di notte al crepuscolo
uniform sampler2D uStars; // cielo vero ("dal vivo"): le stelle disegnate da setHeavens
uniform float uStarAmt;   // 0 nei temi scuro e chiaro
uniform vec4 uMoon;       // Luna: azimut, altezza, frazione illuminata, presenza (0 o 1)
uniform vec2 uMoonDir;    // verso del lembo illuminato
uniform float uWind;      // vento: 0 calma piatta, 0.5 il mare di sempre (temi scuro e chiaro), 1 mare mosso
uniform float uWaveT;     // tempo delle onde: come uTime, ma scorre piu' piano con la calma e piu' in fretta con il vento
uniform vec4 uSun;        // sole vero ("dal vivo"), rispetto alla veduta: x = verso destra, y = verso il fondo (dietro la citta'), z = altezza (rad), w = 1 se c'e'
const float SKY_AZ = 0.7;
const float SKY_EL = 0.7;
const float MOON_R = 0.0075;
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

// Vento (uWind): con 0.5 ogni mix qui sotto vale esattamente il suo valore di mezzo, cioe' il mare di sempre.
// wm(calma, mezzo, mosso): il valore da usare con vento 0, 0.5 e 1; in mezzo si sfuma.
float wm(float calm, float mid, float storm) {
  return mix(mix(mid, calm, clamp(1.0 - uWind * 2.0, 0.0, 1.0)), storm, clamp(uWind * 2.0 - 1.0, 0.0, 1.0));
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

// --- Taranto: il canale navigabile visto dal Mar Grande, verso il Mar Piccolo -------------------------------
// u = distanza dal centro del canale in mezze larghezze: |u| < 1 e' acqua; in fondo, oltre il ponte, la riva bassa
// del Mar Piccolo. A sinistra il castello aragonese (la torre tonda sul canale, dietro i corpi di fabbrica con il
// tetto a falde, davanti la scarpa delle mura); a destra il borgo: il muraglione sull'acqua con il sottopasso, sopra
// il palazzo rosa e le case basse, dietro i palazzoni moderni a fasce di balconi. Quote in radianti sopra l'acqua.
const float AZB = 0.165;           // azimut del centro del canale: nella vista frontale cade nel riquadro destro della vetrata, sopra la proiezione del meteo (se si sposta, vedi FACING in sky.js)
const float DIST = 0.6;            // la citta' sta a qualche chilometro: tutta la veduta e' rimpicciolita di questo fattore
const float HW0 = 0.044;           // la meta' larghezza del canale a cui sono disegnati i dettagli sottili (antenna, palme, lampioni)
const float HWB = HW0 * DIST;      // meta' larghezza del canale
const float VS = 1.2 * DIST;              // scala delle quote: tutte le altezze della citta' qui sotto si moltiplicano per VS
const float DECK = 0.0176;         // piano stradale del ponte
const float RAIL = 0.0211;         // corrimano del parapetto
const float TW_U = -1.78, TW_R = 0.71, TW_TOP = 0.037, TW_CORD = 0.0197;   // torre tonda: centro e raggio (in u), cima, cordone
const float MAST_U = -2.0, MAST_TOP = 0.080;                                // l'antenna sul castello
float townU(float az) { return (az - AZB) / HWB; }
float townK(float u) { return smoothstep(-10.5, -8.8, u) * (1.0 - smoothstep(10.2, 11.6, u)); }
bool inTown(float u) { return u > -10.5 && u < 11.6; }
bool inCastle(float u) { return u > -6.6 && u < -1.03; }
// la riva del Mar Piccolo che si vede attraverso il canale: colline basse e velate
float shoreH(float u) { return 0.0180 + 0.0030 * vnoise(vec2(u * 2.5, 5.0)); }
float townProfile(float u) {
  float h = 0.045;                                                      // (un solo return: ANGLE su D3D se no avverte)
  if (u < 0.0) {
    if (u > -1.07) h = shoreH(u);
    else if (u > -2.38) h = TW_TOP;                                     // la torre tonda
    else if (u > -3.52) h = u < -3.45 ? 0.0495 : 0.048;                 // il corpo alto, con il pilastro d'angolo
    else if (u > -5.24) h = 0.044;                                      // la manica lunga
    else if (u > -6.2) { float d = (u + 6.03) / 0.2; h = 0.040 + 0.0055 * sqrt(max(1.0 - d * d, 0.0)); }   // case e cupola dietro il bastione
    else h = 0.024 + 0.016 * h11(floor(u * 2.5) + 40.0);                // la citta' vecchia
  }
  else if (u < 1.59) h = shoreH(u);
  else if (u < 2.07) h = 0.050;
  else if (u < 3.31) h = (u > 2.2 && u < 3.0) ? 0.079 : 0.075;          // i palazzoni del borgo
  else if (u < 4.0) h = 0.066;
  else if (u < 5.17) h = 0.0775;
  else if (u < 6.28) h = 0.057;
  else if (u < 7.3) h = 0.070;
  else if (u < 8.4) h = 0.061;
  else if (u < 9.6) h = 0.053;
  return h;
}
// profilo di tutto quello che sta sopra l'acqua: colline lontane e, intorno al canale, la citta'
float skyline(float az) {
  float u = townU(az);
  return mix(coast(az), HOR + VS * townProfile(u), townK(u));
}
// La citta' come un fondale di sagome piatte: per ogni punto (u, y) sotto il profilo, l'elemento piu' vicino che lo
// copre. Restituisce (id, coordinata locale, quota, variante).
const float P_SHORE = 1.0, P_TOWER = 2.0, P_STONE = 3.0, P_CASTLE = 4.0, P_ROOF = 5.0, P_QUAY = 6.0, P_LIGHT = 7.0;
const float P_PALAZZO = 8.0, P_HOUSE = 9.0, P_BLOCK = 10.0, P_GREEN = 11.0, P_ARCH = 12.0;
bool isP(float id, float k) { return abs(id - k) < 0.5; }
// vano ad arco a tutto sesto: centro c e semilarghezza w (in u), piedritti alti h0
float archIn(float u, float y, float c, float w, float h0) {
  float x = (u - c) / w;
  return step(abs(x), 1.0) * step((y - h0) / (w * HWB), sqrt(max(1.0 - x * x, 0.0)));
}
vec4 townPart(float u, float y) {
  float id = P_BLOCK, lu = u, w = 0.0;
  if (u < 0.0) {
    float x = (u - TW_U) / (TW_R + 0.05 * (1.0 - smoothstep(0.0, 0.009, y)));           // la torre si allarga al piede
    float gh = u < -6.2 ? 0.004 + 0.008 * vnoise(vec2(u * 9.0, 1.0)) : 0.0045 * smoothstep(0.35, 0.8, vnoise(vec2(u * 14.0, 4.0)));
    if (y < 0.0020 && u > -6.6 && u < -0.76) id = P_STONE;                            // la banchina bassa ai piedi del castello
    else if (abs(x) < 1.0 && y < TW_TOP) { id = P_TOWER; lu = x; }
    else if (u > -1.07) id = P_SHORE;
    else if (u > -7.0 && u < -5.3 && y < gh) id = P_GREEN;                            // palme basse e verde al piede
    else if (u > -5.14 && u < -3.31 && y < 0.0234) { id = P_STONE; w = 1.0; }         // la scarpa delle mura, davanti
    else if (u > -3.52 && u < -2.38) {
      if (y < 0.0455 || u < -3.45) { id = P_CASTLE; lu = u + 3.52; w = 1.0; } else id = P_ROOF;
    }
    else if (u > -6.2 && u < -5.14 && y < 0.034) { id = P_STONE; w = 2.0; }           // il bastione
    else if (u > -5.24 && u < -3.52) {                                                // la manica lunga
      if (y < 0.0405) { id = P_CASTLE; lu = u + 5.24; } else id = P_ROOF;
    }
    else { id = P_HOUSE; w = u > -6.2 ? 0.5 : h11(floor(u * 2.5) + 40.0); }
  }
  else if (u < 1.38 && y < 0.0123 && u - 1.0 > 4.9 * y) { id = P_STONE; w = 3.0; }   // la spalla del ponte, a scarpa
  else if (u >= 1.38 && u < 2.07 && y < 0.0128) {                                     // il casotto chiaro sotto l'impalcato
    id = P_LIGHT;
    if (archIn(u, y, 1.66, 0.085, 0.0048) > 0.5) id = P_ARCH;
    if (archIn(u, y, 1.92, 0.085, 0.0050) > 0.5) { id = P_ARCH; w = 1.0; }            // il sottopasso
  }
  else if (u < 1.59) id = P_SHORE;
  else if (u >= 2.07 && u < 6.4 && y < 0.016) id = P_QUAY;                            // il muraglione
  else if (u < 2.07) id = P_BLOCK;
  else if (u > 6.55 && u < 7.3 && y < 0.009) { id = P_LIGHT; w = 1.0; }               // casetta bianca sul pelo dell'acqua
  else if (u > 6.4 && u < 7.9 && y < 0.021 + 0.009 * vnoise(vec2(u * 7.0, 2.0))) { id = P_GREEN; w = 1.0; }
  else if (u >= 3.76 && u < 5.86 && y < 0.0455) { id = P_PALAZZO; lu = u - 3.76; }   // il palazzo rosa, con il tetto a padiglione
  else if (u >= 3.76 && u < 5.86 && y < 0.0455 + 0.0075 * min(1.0, min(u - 3.76, 5.86 - u) / 0.3)) { id = P_ROOF; w = 1.0; }
  else if (u < 3.0 && y < 0.046) { id = P_HOUSE; w = 0.31; }                          // le case basse sul muraglione
  else if (u >= 3.0 && u < 3.76 && y < 0.049) { id = P_HOUSE; w = 0.67; }
  else if (u >= 5.86 && u < 6.4 && y < 0.046) { id = P_HOUSE; w = 0.12; }
  else if (u >= 7.9 && y < 0.010) { id = P_QUAY; w = 1.0; }
  else if (u >= 7.9 && y < 0.026 + 0.012 * h11(floor(u * 2.2) + 7.0)) { id = P_HOUSE; w = h11(floor(u * 2.2) + 3.0); }
  else w = u < 3.31 ? 1.0 : u < 4.0 ? 2.0 : u < 5.17 ? 3.0 : u < 6.28 ? 4.0 : u < 7.3 ? 5.0 : u < 8.4 ? 6.0 : u < 9.6 ? 7.0 : 8.0;   // dietro, i palazzoni: la variante sceglie il colore
  return vec4(id, lu, y, w);
}
// quanto e' grande un pixel, in radianti (lo calcola main): i dettagli piu' piccoli di qualche pixel si vedono
// sfumati nella loro media, come in una foto da lontano, invece di sfarfallare
float PIX = 0.001;
float fineK(float size) { return smoothstep(1.3, 3.5, size / PIX); }
// finestre in griglia: passo du (in u) e dy (quote della citta') a partire dalla quota y0; fw, fh = frazione del passo occupata dal vano
float winGrid(float u, float y, float du, float dy, float y0, float fw, float fh, out vec2 cell) {
  vec2 g = vec2(u / du, (y - y0) / dy);
  cell = floor(g);
  vec2 f = fract(g);
  float m = step(abs(f.x - 0.5), fw * 0.5) * step(abs(f.y - 0.5), fh * 0.5);
  return mix(fw * fh, m, fineK(min(du * HWB * fw, dy * VS * fh))) * step(0.0, g.y);
}
// la torre del castello: qualche finestrella e, al piede, le aperture ad arco sul pelo dell'acqua
float towerWin(float x, float y) {
  float w = 0.0;
  w += step(abs(x + 0.55), 0.035) * step(abs(y - 0.0262), 0.0008);
  w += step(abs(x - 0.10), 0.035) * step(abs(y - 0.0228), 0.0008);
  w += step(abs(x - 0.62), 0.035) * step(abs(y - 0.0262), 0.0008);
  w += step(abs(x + 0.10), 0.035) * step(abs(y - 0.0300), 0.0008);
  return min(w, 1.0);
}
float towerDoor(float x, float y) {
  float d = min(min(abs(x + 0.62), abs(x + 0.05)), abs(x - 0.52));
  return step(d, 0.045) * step(0.0021, y) * step(y, 0.0046);
}
// ponte girevole: impalcato basso e sottile sull'acqua, con la travata ad arco ribassato tra la torre e la spalla
// del borgo; sopra il parapetto e una fila di lampioni a due bracci. A destra prosegue sopra il casotto fino al muraglione.
const float BR_L = -1.03, BR_R = 2.1;
float bridgeUnder(float u) { float a = (u - 0.16) / 1.19; return u < 1.35 ? 0.0150 - 0.0032 * a * a : 0.0128; }
float bridgeMask(float u, float y, float edge) {
  float yb = bridgeUnder(u);
  return step(BR_L, u) * step(u, BR_R) * smoothstep(yb - edge, yb + edge, y) * (1.0 - smoothstep(DECK - edge, DECK + edge, y));
}
// i vuoti della travata, tra la soletta, il corrente ad arco sotto e i montanti: da li' si vede quello che c'e' dietro
float trussGap(float u, float y) {
  float f = fract((u - BR_L) / 0.09);
  return step(u, 1.35) * step(0.13, f) * step(f, 0.87) * step(bridgeUnder(u) + 0.0009, y) * step(y, DECK - 0.0016);
}
const int LAMPS = 5;               // lampioni sul parapetto (ognuno con due lanterne)
float lampU(int i) { return -0.83 + float(i) * 0.71; }
const float LAMP_Y = RAIL + 0.0044;

// --- traffico: auto sul ponte e sul lungomare del borgo, nei due sensi ---
const int CARS = 6;
// auto i: x = posizione lungo la strada (in mezze larghezze di canale), y = quanto si vede (sfuma ai capi), z = verso.
// A sinistra la strada passa dietro la torre del castello: li' le auto spariscono.
vec3 carAt(int i, float t) {
  float fi = float(i);
  float dirn = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
  float ph = fract(t * (0.020 + 0.009 * h11(fi * 5.7 + 1.0)) + h11(fi * 9.1 + 4.0));
  float x = mix(-1.6, 6.3, dirn > 0.0 ? ph : 1.0 - ph);
  return vec3(x, smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.95, 1.0, ph)) * step(-1.02, x), dirn);
}
float roadY(float u) { return mix(DECK + 0.0009, 0.0168, smoothstep(2.0, 2.4, u)); }   // dal ponte scende sul muraglione
// --- palme sul muraglione del borgo: fusto sottile e un ciuffo di fronde che ricadono ---
float palm(float u, float y, float u0, float top, float edge) {
  if (abs(u - u0) > 0.25 || y < 0.016 || y > top + 0.006) return 0.0;
  float k = (y - 0.016) / (top - 0.016);
  float trunk = (1.0 - smoothstep(0.00022, 0.00022 + edge, abs(u - u0 - 0.05 * k * k) * HW0)) * step(y, top);
  vec2 p = vec2((u - u0 - 0.05) * HW0, y - top);
  float a = atan(p.y, p.x);
  float r = 0.0048 * (0.35 + 0.65 * pow(abs(cos(a * 3.5)), 0.6)) * (p.y < 0.0 ? 0.85 : 0.6);
  return max(trunk, 1.0 - smoothstep(r - edge, r + edge, length(p)));
}
// l'antenna del castello: un traliccio che si assottiglia, con due pennoni
float mast(float u, float y, float edge) {
  if (abs(u - MAST_U) > 0.12 || y < TW_TOP - 0.001 || y > MAST_TOP) return 0.0;
  float x = abs(u - MAST_U) * HW0, k = (y - TW_TOP) / (MAST_TOP - TW_TOP);
  float pole = 1.0 - smoothstep(0.0, edge, x - mix(0.00050, 0.00012, k));
  float yard = (1.0 - smoothstep(0.0, edge, abs(y - 0.0726) - 0.00012)) * step(x, 0.0028)
             + (1.0 - smoothstep(0.0, edge, abs(y - 0.0660) - 0.00012)) * step(x, 0.0021);
  return min(pole + yard, 1.0) * min(1.0, 0.0006 / edge);
}
// --- una barca attraversa piano lo specchio d'acqua, da sinistra a destra ---
const float BOAT_EL = -0.0585;     // sta sull'acqua, piu' vicina della costa di fronte
float boatAz(float t) { return -0.62 + fract(t / 150.0 + 0.2) * 1.5; }

vec3 sky(float az, float el, float t) {
  float h = max(el - HOR, 0.0);
  vec3 col = mix(vec3(0.018, 0.024, 0.045), vec3(0.006, 0.009, 0.020), smoothstep(0.0, 0.35, h));
  // bagliore della citta' sotto le nubi
  col += vec3(0.075, 0.034, 0.05) * exp(-h / 0.06);
  // cielo vero (solo "dal vivo"): stelle e Luna nella posizione calcolata da sky.js. Si vedono con il cielo
  // sereno o poco nuvoloso; le nubi, disegnate dopo, le coprono. Nei temi scuro e chiaro non ci sono.
  float clearSky = 1.0 - smoothstep(0.15, 0.75, uCloud);
  if (uStarAmt > 0.0 && clearSky > 0.0 && el > 0.0) {
    vec2 suv = vec2(az / SKY_AZ * 0.5 + 0.5, el / SKY_EL);
    if (suv.x > 0.0 && suv.x < 1.0 && suv.y < 1.0) {
      float tw = 0.82 + 0.18 * sin(t * 2.6 + h21(floor(vec2(az, el) * 400.0)) * 40.0);   // scintillio
      col += texture2D(uStars, suv).rgb * uStarAmt * clearSky * tw * smoothstep(0.0, 0.05, el);
    }
    if (uMoon.w > 0.0) {                                                    // Luna: il lembo illuminato guarda verso il Sole
      vec2 md = vec2(az - uMoon.x, el - uMoon.y) / MOON_R;
      float r2 = dot(md, md);
      col += vec3(0.20, 0.22, 0.30) * exp(-sqrt(r2) / 5.0) * uMoon.z * clearSky;   // alone
      if (r2 < 1.0) {
        float px = dot(md, uMoonDir), py = dot(md, vec2(-uMoonDir.y, uMoonDir.x));
        float lit = smoothstep(-0.07, 0.07, px + (2.0 * uMoon.z - 1.0) * sqrt(max(1.0 - py * py, 0.0)));
        float mare = 0.80 + 0.20 * vnoise(md * 2.3 + 7.0);                  // i mari, appena accennati
        vec3 disc = mix(vec3(0.03, 0.035, 0.05), vec3(1.3, 1.25, 1.08) * mare, lit);
        col = mix(col, disc, (1.0 - smoothstep(0.85, 1.0, r2)) * clearSky);
      }
    }
  }
  // nubi basse che scorrono piano: piu' uCloud e' alto, piu' cielo coprono (con 0.66 la soglia e' 0.42, quella di sempre)
  float lo = 0.75 - 0.5 * uCloud;
  float c = fbm(vec2(az * 3.2 - t * 0.012, el * 9.0 + 2.0));
  c = smoothstep(lo, lo + 0.36, c);
  vec3 cloud = mix(vec3(0.03, 0.034, 0.055), vec3(0.12, 0.06, 0.085), exp(-h / 0.1));
  col = mix(col, cloud, c * 0.85);
  return col;
}

// quota (sopra l'acqua) della luce del lungomare nella fila row all'azimut a; negativa se li' non ce n'e'.
// Nel canale e sotto il ponte niente (ci sono i lampioni del ponte); sul castello solo i fari al piede delle mura,
// che lo illuminano dal basso; sul borgo i lampioni in cima al muraglione.
float shoreLightY(float a, int row, float jit) {
  float u = townU(a);
  if (u > -1.03 && u < BR_R) return -1.0;
  if (inCastle(u)) return row == 0 ? 0.0016 * VS : -1.0;
  if (u >= BR_R && u < 6.4) return row == 0 ? (0.0174 + jit * 0.0004) * VS : -1.0;
  return 0.0022 + float(row) * 0.0045 + jit * 0.0022;
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
      float e = shoreLightY(a, row, h11(sd + 5.3));
      if (e < 0.0) continue;
      e += HOR;
      float far = townK(townU(a));                              // in citta' le luci sono lontane: piu' piccole e deboli
      vec2 d = vec2(az - a, el - e);
      float rr = rad * (1.0 - 0.3 * far);
      float g = exp(-dot(d, d) / (rr * rr)) * (1.0 - 0.3 * far);
      float boost;
      vec3 c = lightCol(sd, boost);
      if (inCastle(townU(a))) { c = SODIUM; boost = 1.0; }       // i fari del castello sono tutti caldi
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
    if (townK(townU(p.x)) > 0.5) continue;                      // in citta' le finestre accese sono sulle facciate (townNight); il castello non ne ha
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
    // mai sopra il canale: li' non c'e' niente che li regga. Una e' in cima all'antenna del castello, una sul palazzone piu' alto del borgo
    float a = i == 0 ? -0.42 : i == 1 ? -0.15 : i == 2 ? AZB + MAST_U * HWB : 0.376;
    float e = i == 2 ? HOR + VS * MAST_TOP + 0.0006 : skyline(a) + 0.0045;       // appena sopra un crinale o un tetto: un'antenna
    vec2 d = vec2(az - a, el - e);
    float on = smoothstep(0.0, 0.08, fract(t * 0.45 + fi * 0.31)) * (1.0 - smoothstep(0.42, 0.52, fract(t * 0.45 + fi * 0.31)));
    float r = i >= 2 ? rad * 0.6 : rad;                                   // quelle sulla citta' sono lontane: piccole
    acc += vec3(1.0, 0.07, 0.03) * exp(-dot(d, d) / (r * r)) * on * (i >= 2 ? 2.2 : 3.0);
  }
  return acc;
}

vec3 water(float az, float el, float blur, float t) {
  float dep = max(HOR - el, 0.0004);               // depressione sotto l'orizzonte
  vec2 wp = vec2(az / dep, 1.0 / dep);             // coordinate sul piano dell'acqua
  // il vento cambia le onde: con la calma poche increspature, larghe e lente; con il vento fitte, alte e svelte
  float tw = uWaveT, rf = wm(0.55, 1.0, 1.7), rh = wm(0.3, 1.0, 1.7);
  float big = fbm3(vec2(wp.x * 0.9 * rf, wp.y * 0.55 * rf - tw * 0.35));
  float rip = (big - 0.5) * rh;
  float wobA = wm(0.6, 1.0, 2.6), wobF = wm(0.6, 1.0, 2.2);    // quanto e quanto in fretta il riflesso trema di lato
  float wid = wm(0.85, 1.0, 1.9);                              // larghezza dei riflessi
  float gap = wm(0.8, 1.0, 0.8);                               // i riflessi larghi si spalmano e perdono luce
  float bLo = wm(0.0, 0.38, 0.52), bHi = wm(0.55, 0.75, 0.82), bF = wm(0.6, 1.0, 2.4);   // soglie e frequenza delle rotture
  float lenK = wm(1.5, 1.0, 0.6);                              // lunghezza dei riflessi: lunghi con la calma, corti con il vento
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
      if (shoreLightY(a, row, 0.0) < 0.0) continue;
      float wob = (vnoise(vec2(wp.y * 0.35 * wobF + id, tw * 1.3)) - 0.5) * dep * 0.07 * wobA;
      float far = townK(townU(a));                              // le luci della citta' lontana: riflessi piu' sottili e deboli
      float w = (0.0006 + dep * 0.007 + blur * 0.0009) * wid * (1.0 - 0.25 * far);
      float dx = (az - a + wob) / w;
      float streak = exp(-dx * dx) * (1.0 - 0.3 * far);
      float broken = smoothstep(bLo, bHi, vnoise(vec2(id * 3.1 + float(row), wp.y * 0.45 * bF - tw * 1.8)));
      float len = exp(-dep / ((0.028 + float(row) * 0.01) * lenK));
      float boost;
      vec3 c = lightCol(sd, boost);
      if (inCastle(townU(a))) { c = SODIUM; boost = 1.0; }
      col += c * streak * broken * len * (row == 0 ? 0.75 : 0.35) * boost * gap;
    }
  }
  // riflessi del ponte girevole, del castello illuminato e del muraglione
  float u = townU(az);
  if (u > -7.0 && u < 7.0) {
    float wobb = (vnoise(vec2(wp.y * 0.35 * wobF + 5.0, tw * 1.3)) - 0.5) * dep * 0.07 * wobA;
    float uu = u + wobb / HWB;
    float brk = smoothstep(wm(0.0, 0.3, 0.5), bHi, vnoise(vec2(u * 26.0, wp.y * 0.45 * bF - tw * 1.8)));
    float w = (0.0006 + dep * 0.007 + blur * 0.0009) * wid;
    if (uu > BR_L - 0.2 && uu < BR_R + 0.2) {
      for (int i = 0; i < LAMPS; i++) {
        float dx = (uu - lampU(i)) * HWB / w;
        col += SODIUM * exp(-dx * dx) * brk * exp(-dep / (0.03 * lenK)) * 0.28 * gap;
      }
      // il ponte capovolto scurisce l'acqua con la sua sagoma (arcata e impalcato), non con una fascia rettangolare
      col *= 1.0 - 0.4 * bridgeMask(uu, dep * 1.1 / VS, 0.0014 + dep * 0.06) * exp(-dep / 0.09) * (0.55 + 0.45 * brk);
      for (int i = 0; i < CARS; i++) {                           // i fari delle auto che passano sul ponte
        vec3 c = carAt(i, t);
        if (c.x < 1.1) { float dx = (uu - c.x) * HWB / w; col += vec3(1.0, 0.93, 0.78) * exp(-dx * dx) * brk * exp(-dep / (0.025 * lenK)) * 0.16 * c.y * gap; }
      }
    }
    // la pietra calda del castello (piu' forte sotto la torre) e, piu' tenue, il muraglione del borgo
    float stoneK = inCastle(uu) ? (uu > TW_U - TW_R ? 1.15 : 0.8) : (uu > 1.0 && uu < 6.4 ? 0.4 : 0.0);
    col += vec3(0.085, 0.050, 0.020) * stoneK * 0.8 * exp(-dep / (0.016 * lenK)) * (0.3 + 0.7 * brk);
  }
  if (uMoon.w > 0.0) {                                           // la scia della Luna sull'acqua
    float mx = (az - uMoon.x) / ((0.012 + dep * 0.45) * wm(0.6, 1.0, 1.6));        // calma: scia stretta; vento: larga
    float glit = smoothstep(wm(0.0, 0.35, 0.55), wm(0.4, 0.8, 0.9), vnoise(vec2(wp.x * 2.0 * wm(0.7, 1.0, 2.2), wp.y * 0.6 * wm(0.7, 1.0, 1.9) - tw * 1.2)));
    col += vec3(0.55, 0.58, 0.62) * exp(-mx * mx) * glit * uMoon.z * (1.0 - smoothstep(0.15, 0.75, uCloud)) * 0.35 * wm(1.4, 1.0, 0.9) * exp(-dep / (0.25 * wm(1.4, 1.0, 0.8)));
  }
  // riflesso rosso tremolante
  col += redLights(az + (vnoise(vec2(wp.y * 0.3, tw)) - 0.5) * dep * 0.1 * wobA, HOR + dep * 0.25 + 0.01, blur + 1.5, t) * 0.25 * exp(-dep / 0.05);
  return col;
}

// finestra accesa di notte: una su tre circa, calda o fredda, di forza diversa
vec3 litWin(vec2 cell, float seed, float prob) {
  float r = h21(cell + seed * 17.3);
  if (r > prob) return vec3(0.0);
  vec3 c = h21(cell + seed * 5.1 + 3.0) < 0.72 ? vec3(1.0, 0.62, 0.30) : vec3(0.70, 0.80, 1.0);
  return c * (0.30 + 0.45 * h21(cell + 7.7));
}
// facciate di notte: il castello illuminato dal basso (pietra calda), il muraglione dai lampioni che ha sopra,
// le case e i palazzoni del borgo scuri con le finestre accese
vec3 townNight(float u, float y) {
  vec4 p = townPart(u, y);
  float id = p.x;
  vec3 dark = vec3(0.012, 0.011, 0.013);
  vec3 c = dark + vec3(0.07, 0.042, 0.02) * exp(-y / 0.007);
  float stone = 0.85 + 0.15 * vnoise(vec2(u * 60.0, y * 1400.0));
  vec2 cell;
  if (u < 0.0 && (isP(id, P_TOWER) || isP(id, P_STONE) || isP(id, P_CASTLE))) {
    float shade = 0.34;                                           // muri in ombra, la torre tonda in luce
    if (isP(id, P_TOWER)) {
      float x = p.y, rnd = sqrt(max(1.0 - x * x, 0.0));
      shade = (0.18 + 0.95 * rnd * rnd) * (1.0 - 0.5 * (1.0 - smoothstep(0.0, 0.0011, abs(y - TW_CORD))));
      shade *= 1.0 - 0.3 * step(TW_TOP - 0.0013, y) - 0.7 * towerWin(x, y);
    } else if (isP(id, P_STONE)) shade = p.w < 0.5 ? 0.75 : p.w < 1.5 ? 0.62 : 0.5;
    else { float w = winGrid(p.y, y, 0.30, 0.0058, 0.0255, 0.17, 0.25, cell); shade *= 1.0 - 0.6 * w * step(0.3, h21(cell + p.w * 9.0)); }
    float foot = 0.28 + 0.72 * exp(-y / 0.012);
    c = dark + vec3(0.30, 0.175, 0.075) * shade * foot * stone * 0.95;  // luce bassa e calda, non un faro
    if (isP(id, P_TOWER)) c += vec3(0.30, 0.17, 0.06) * towerDoor(p.y, y);   // le aperture al piede, accese
  } else if (isP(id, P_ROOF)) {
    c = dark * 1.2;
  } else if (isP(id, P_QUAY) || isP(id, P_STONE)) {
    float top = isP(id, P_QUAY) && p.w < 0.5 ? 0.016 : 0.0123;
    c = dark + vec3(0.30, 0.175, 0.075) * 0.5 * 0.55 * (0.35 + 0.65 * exp(-max(top - y, 0.0) / 0.005)) * stone;   // schiarito dall'alto, dai lampioni
    if (isP(id, P_QUAY) && u > 2.62 && u < 3.52 - 28.0 * y && y < 0.0105) c *= 0.6;   // lo scivolo, piu' scuro
  } else if (isP(id, P_LIGHT)) {
    c = dark + vec3(0.30, 0.20, 0.11) * 0.22 * stone;
  } else if (isP(id, P_ARCH)) {
    c = p.w > 0.5 ? vec3(0.20, 0.11, 0.04) * (0.6 + 0.4 * exp(-y / 0.004)) : dark;   // il sottopasso e' illuminato dentro
  } else if (isP(id, P_PALAZZO)) {
    c = dark + vec3(0.11, 0.045, 0.04) * (0.2 + 0.6 * exp(-(y - 0.016) / 0.008));
    float w = winGrid(p.y, y, 0.16, 0.0068, 0.0245, 0.42, 0.52, cell);
    c += litWin(cell, 2.0, 0.26) * w * 0.8;
  } else if (isP(id, P_HOUSE)) {
    float w = winGrid(u, y, 0.14, 0.0058, u < 0.0 ? 0.004 : 0.017, 0.45, 0.5, cell);
    c += litWin(cell, p.w * 9.0 + 1.0, 0.22) * w;
  } else if (isP(id, P_BLOCK)) {
    float fy = fract((y - 0.016) / 0.0048);
    c = dark + vec3(0.010, 0.009, 0.010) * mix(0.2, step(fy, 0.2), fineK(0.0048 * VS * 0.2));          // i frontalini dei balconi, appena schiariti
    float w = winGrid(u, y, 0.11, 0.0048, 0.016, 0.45, 0.5, cell);
    c += litWin(cell, p.w + 3.0, 0.22) * w * step(0.2, fy) * 0.85;
  } else if (isP(id, P_GREEN)) {
    c = vec3(0.006, 0.008, 0.007);
  } else if (isP(id, P_SHORE)) {                                   // la riva del Mar Piccolo: buia, con qualche luce lontana
    c = vec3(0.014, 0.012, 0.018);
    vec2 g = vec2(u / 0.06, y / 0.0022), f = fract(g) - 0.5, gi = floor(g);
    if (y < 0.0066 && h21(gi + 51.0) < 0.16) c += SODIUM * (1.0 - smoothstep(0.12, 0.3, length(f * vec2(1.0, 0.5)))) * 0.45;
  }
  return c;
}
// Ponte di notte: una sagoma in controluce sul chiarore dell'orizzonte, con i lampioni dello stesso colore
// e della stessa forza di quelli del lungomare. Deve stare dentro il paesaggio, non staccarsi.
vec3 bridgeNight(vec3 col, float u, float y, float blur, float t) {
  float edge = (0.0005 + blur * 0.0010) / DIST;                  // in quote della citta': da lontano i bordi sono piu' morbidi
  float yb = bridgeUnder(u);
  vec3 steel = vec3(0.015, 0.016, 0.021) + vec3(0.040, 0.024, 0.011) * exp(-max(DECK - y, 0.0) / 0.004);
  col = mix(col, mix(steel, col, 0.6 * trussGap(u, y)), bridgeMask(u, y, edge));
  float rail = (1.0 - smoothstep(0.0, 0.0003 + edge, abs(y - RAIL))) + 0.35 * step(DECK, y) * step(y, RAIL);   // il parapetto
  col = mix(col, steel, rail * step(BR_L, u) * step(u, BR_R) * 0.7);
  if (u > BR_L && u < 1.35) {                                    // un filo di luce calda sotto l'arco, riflessa dall'acqua
    float da = (y - yb) * VS / (0.0007 + blur * 0.0011);
    col += vec3(0.085, 0.050, 0.020) * exp(-da * da);
  }
  float rad = 0.0007 + blur * 0.0010;                            // luci lontane: piccole
  for (int i = 0; i < LAMPS; i++) {
    float fi = float(i);
    float post = (1.0 - smoothstep(0.0, edge, abs(u - lampU(i)) * HW0 - 0.00012)) * step(RAIL, y) * step(y, LAMP_Y + 0.0006);
    col = mix(col, steel, post * 0.8);
    float flick = 0.9 + 0.1 * sin(t * (2.0 + h11(fi + 2.0) * 3.0) + fi);
    for (int s = -1; s <= 1; s += 2) {                           // due lanterne per lampione
      vec2 d = vec2((u - lampU(i) - float(s) * 0.05) * HWB, (y - LAMP_Y) * VS);
      col += SODIUM * exp(-dot(d, d) / (rad * rad)) * (0.36 + 0.26 * h11(fi + 4.0)) * flick;
    }
  }
  return col;
}

// luci di via della barca: bianca in testa d'albero, verde sul fianco che ci guarda, con un riflesso corto
vec3 boatNight(float az, float el, float blur, float t) {
  float a = boatAz(t), rad = 0.0008 + blur * 0.0011;
  vec2 d1 = vec2(az - a, el - (BOAT_EL + 0.0052)), d2 = vec2(az - a - 0.0022, el - (BOAT_EL + 0.0022));
  vec3 c = vec3(1.0, 0.95, 0.85) * exp(-dot(d1, d1) / (rad * rad)) * 0.9 + vec3(0.15, 1.0, 0.45) * exp(-dot(d2, d2) / (rad * rad)) * 0.5;
  float below = BOAT_EL - el;
  if (below > 0.0) {
    float dx = (az - a) / (0.0009 + below * 0.05);
    c += vec3(1.0, 0.95, 0.85) * exp(-dx * dx) * exp(-below / 0.006) * 0.25 * (0.6 + 0.4 * sin(t * 5.0 + below * 900.0));
  }
  return c;
}

vec3 outside(vec3 dir, float blur, float t) {
  float az = atan(dir.x, -dir.z);
  float el = asin(clamp(dir.y, -1.0, 1.0));
  vec3 col = vec3(0.0);
  if (el < HOR) {
    col = water(az, el, blur, t) + boatNight(az, el, blur, t);
  } else {
    float u = townU(az), y = (el - HOR) / VS;   // y: quota sopra l'acqua, nella scala della citta'
    float ce = skyline(az);
    float edge = 0.0012 + blur * 0.002;
    float land = 1.0 - smoothstep(ce - edge, ce + edge, el);
    vec3 hill = vec3(0.008, 0.008, 0.011) + vec3(0.025, 0.014, 0.008) * exp(-(el - HOR) / 0.02);
    float yc = min(y, (ce - HOR) / VS - 0.0002);                 // sul bordo del profilo il colore e' quello dell'elemento sotto
    vec3 skyc = sky(az, el, t);
    // la citta' e' lontana: l'aria in mezzo la vela del chiarore dell'orizzonte (meno contrasto, finestre piu' deboli)
    vec3 veil = skyc * 1.2 + vec3(0.016, 0.010, 0.012);
    if (inTown(u)) hill = mix(hill, mix(townNight(u, yc), veil, 0.32), townK(u));
    col = mix(skyc, hill, land);
    if (u > -2.2 && u < 7.0) {                                   // l'antenna del castello e le palme del borgo, in controluce
      vec3 sil = vec3(0.016, 0.014, 0.017) + vec3(0.05, 0.03, 0.012) * exp(-max(y - TW_TOP, 0.0) / 0.006);
      float e2 = edge * 0.5 / DIST;
      col = mix(col, mix(sil, veil, 0.3), max(mast(u, y, e2), max(palm(u, y, 6.3, 0.049, e2), palm(u, y, 6.85, 0.046, e2))));
    }
    col += lightsAt(az, el, blur, ce, t);
    col += redLights(az, el, blur, t);
    if (u > BR_L - 0.1 && u < BR_R + 0.1) col = bridgeNight(col, u, y, blur, t);
    if (u > -1.1 && u < 6.5 && y < 0.03) {                               // auto: fari chiari davanti, luci rosse dietro
      float cr = 0.0006 + blur * 0.0010;
      for (int i = 0; i < CARS; i++) {
        vec3 c = carAt(i, t);
        float ry = roadY(c.x);
        vec2 dh = vec2((u - c.x - c.z * 0.05) * HWB, (y - ry) * VS), dr = vec2((u - c.x + c.z * 0.05) * HWB, (y - ry) * VS);
        col += (vec3(1.0, 0.93, 0.78) * exp(-dot(dh, dh) / (cr * cr)) + vec3(1.0, 0.10, 0.05) * exp(-dot(dr, dr) / (cr * cr)) * 0.6) * c.y * 0.75;
      }
    }
  }
  // foschia sul pelo dell'acqua
  col += vec3(0.05, 0.04, 0.035) * exp(-abs(el - HOR) / 0.006) * 0.5;
  return col;
}

// --- lo stesso panorama di giorno, con cielo coperto ---
vec3 daySky(float az, float el, float t) {
  float h = max(el - HOR, 0.0);
  float c = fbm(vec2(az * 3.2 - t * 0.012, el * 9.0 + 2.0));
  // coperto: il cielo di sempre del tema chiaro
  vec3 col = mix(vec3(0.60, 0.65, 0.69), vec3(0.34, 0.44, 0.58), smoothstep(0.0, 0.45, h));
  col = mix(col, vec3(0.72, 0.74, 0.76), smoothstep(0.42, 0.78, c) * 0.7);
  if (uCloud < 0.995) {
    // sereno: azzurro, piu' chiaro verso l'orizzonte, con le nubi bianche che il meteo dichiara
    vec3 blue = mix(vec3(0.40, 0.60, 0.86), vec3(0.06, 0.22, 0.58), smoothstep(0.0, 0.45, h));   // valori saturi: la resa finale li schiarisce
    float lo = mix(0.80, 0.34, uCloud);
    blue = mix(blue, vec3(0.96, 0.97, 0.98), smoothstep(lo, lo + 0.22, c) * 0.9);
    col = mix(blue, col, smoothstep(0.55, 1.0, uCloud));
  }
  return col;
}
// --- il sole vero sulla veduta ("dal vivo", con il sereno). Li calcola dayOutside una volta per pixel ---
float SUNK = 0.0;                 // quanto conta il sole: 0 con il coperto, nei temi fissi e con il sole sotto l'orizzonte
vec3 SUNCOL = vec3(1.0);          // il suo colore: bianco caldo a mezzogiorno, arancio quando e' basso
float SUN_AZ = 0.0, SUN_EL = 0.0; // dove sta nel panorama (compresso come il cielo vero, vedi sky.js)
void sunSetup() {
  float clearSky = 1.0 - smoothstep(0.25, 0.85, uCloud);
  SUNK = uSun.w * clearSky * smoothstep(-0.02, 0.07, uSun.z);
  SUNCOL = mix(vec3(1.0, 0.92, 0.80), vec3(1.0, 0.58, 0.30), 1.0 - smoothstep(0.04, 0.5, uSun.z));
  SUN_AZ = AZB + atan(uSun.x, uSun.y) / 4.0;
  SUN_EL = HOR + uSun.z / 4.0;
}
// Il "filtro" del sereno, come in una foto: una fascia di foschia luminosa sul pelo dell'orizzonte (piu' chiara dalla
// parte del sole), il bagliore del sole quando e' davanti e basso, e una correzione colore leggera, luci calde e ombre
// fredde. Con il coperto, nei temi fissi e di notte SUNK e' zero e non cambia niente.
vec3 clearFilter(vec3 col, float az, float el) {
  if (SUNK <= 0.0) return col;
  float h = el - HOR;
  float sd = (az - SUN_AZ) / 0.7, side = exp(-sd * sd);                         // la foschia e' piu' luminosa verso il sole
  float band = h > 0.0 ? exp(-h / 0.012) : exp(h / 0.006);
  vec3 hazeCol = mix(vec3(0.70, 0.75, 0.80), SUNCOL * 0.85, 0.35);
  col = mix(col, hazeCol, band * SUNK * (0.08 + 0.14 * side));
  float front = smoothstep(0.0, 0.35, uSun.y);                                  // il sole sta dalla parte della citta'
  if (front > 0.0) {
    float d = length(vec2(az - SUN_AZ, el - SUN_EL));
    col += SUNCOL * (exp(-d / 0.05) * 0.35 + exp(-d / 0.008) * 1.4) * SUNK * front;          // alone e disco abbagliante
    col += SUNCOL * exp(-abs(h) / 0.01) * exp(-abs(az - SUN_AZ) / 0.35) * SUNK * front * 0.25 * (1.0 - smoothstep(0.05, 0.4, uSun.z));   // riverbero radente
  }
  col += SUNCOL * vec3(0.025, 0.022, 0.02) * band * SUNK;                      // il velo chiaro dell'aria al sole
  float luma = dot(col, vec3(0.3, 0.55, 0.15));
  return mix(col, col * mix(vec3(0.95, 0.99, 1.05), vec3(1.05, 1.0, 0.93), smoothstep(0.1, 0.6, luma)), SUNK * 0.7);
}
// facciate di giorno, con la luce piatta del coperto: la pietra color sabbia del castello e del muraglione, il palazzo
// rosa, i palazzoni chiari a fasce di balconi. haze = il colore della foschia, che vela tutto (la riva lontana di piu').
const vec3 SAND = vec3(0.47, 0.32, 0.17);   // colori lineari: a schermo escono piu' chiari
vec3 townDay(float u, float y, vec3 haze) {
  vec4 p = townPart(u, y);
  float id = p.x, n = vnoise(vec2(u * 60.0, y * 1400.0));
  vec3 c = vec3(0.6);
  float hz = 0.26;                                                  // la foschia dei chilometri d'aria in mezzo
  vec2 cell;
  if (isP(id, P_TOWER)) {
    float x = p.y;
    float shade = 0.52 + 0.48 * sqrt(max(1.0 - x * x, 0.0)) - 0.14 * x;        // tonda: piu' chiara al centro e verso la luce
    shade *= 1.0 - 0.32 * step(TW_CORD - 0.0009, y) * step(y, TW_CORD) + 0.10 * step(TW_CORD, y) * step(y, TW_CORD + 0.0006);   // il cordone
    shade *= 1.0 - 0.08 * step(TW_TOP - 0.0012, y);
    c = SAND * shade * (0.92 + 0.08 * n);
    c = mix(c, vec3(0.12, 0.10, 0.08), max(towerWin(x, y), towerDoor(x, y)) * 0.85);
  } else if (isP(id, P_STONE)) {
    c = SAND * (p.w < 0.5 ? 1.04 : p.w < 1.5 ? 0.84 : p.w < 2.5 ? 0.92 : 0.86) * (0.9 + 0.1 * n);   // banchina, scarpa, bastione, spalla
    if (p.w > 1.5 && p.w < 2.5) {                                                                  // il bastione e' tondo anche lui, con il suo cordone
      float bx = (u + 5.67) / 0.53;
      c *= (0.75 + 0.25 * sqrt(max(1.0 - bx * bx, 0.0))) * (1.0 - 0.25 * step(abs(y - 0.027), 0.0005));
    }
  } else if (isP(id, P_CASTLE)) {
    c = SAND * (p.w < 0.5 ? 1.0 : 0.94) * (0.92 + 0.08 * n);
    float w = winGrid(p.y, y, 0.30, 0.0058, 0.0255, 0.17, 0.25, cell);
    c = mix(c, vec3(0.12, 0.10, 0.08), w * step(0.3, h21(cell + p.w * 9.0)) * 0.85);
  } else if (isP(id, P_ROOF)) {
    c = u < 0.0 ? vec3(0.30, 0.19, 0.13) : vec3(0.42, 0.17, 0.12);
  } else if (isP(id, P_QUAY)) {
    c = SAND * (p.w < 0.5 ? 1.0 : 0.9) * (0.88 + 0.12 * vnoise(vec2(u * 30.0, y * 260.0)));      // macchie e colature
    c *= 1.0 - 0.06 * step(fract(y / 0.0016), 0.12);                                           // i corsi dei conci
    if (p.w < 0.5) {
      c *= 1.0 + 0.08 * step(0.0148, y);                                                         // la cimasa del parapetto
      if (u > 2.62 && u < 3.52 - 28.0 * y && y < 0.0105) c *= 0.62 + 0.18 * vnoise(vec2(u * 50.0, 3.0));   // lo scivolo, piu' scuro e rigato
      c *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.0004, abs(y - (0.0155 - (u - 4.95) * 0.023)))) * step(4.95, u) * step(u, 5.45);   // la scala in diagonale
    }
  } else if (isP(id, P_LIGHT)) {
    c = vec3(0.70, 0.66, 0.58) * (0.94 + 0.06 * n);
  } else if (isP(id, P_ARCH)) {
    c = p.w > 0.5 ? vec3(0.05, 0.045, 0.04) : vec3(0.48, 0.44, 0.38);
  } else if (isP(id, P_PALAZZO)) {
    float lu = p.y;
    c = y < 0.0235 ? vec3(0.68, 0.42, 0.34) : vec3(0.62, 0.29, 0.25);                          // il piano terra bugnato, piu' chiaro
    float w = winGrid(lu, y, 0.16, 0.0068, 0.0245, 0.42, 0.52, cell);
    float fr = winGrid(lu, y, 0.16, 0.0068, 0.0245, 0.56, 0.66, cell);
    c = mix(c, vec3(0.80, 0.75, 0.68), (fr - w) * 0.8);                                         // le cornici bianche
    c = mix(c, vec3(0.14, 0.11, 0.12), w);
    c = mix(c, vec3(0.78, 0.72, 0.64), step(0.0440, y) + step(abs(y - 0.0240), 0.0005) + step(lu, 0.07) + step(2.03, lu));   // cornicione, marcapiano, paraste d'angolo
  } else if (isP(id, P_HOUSE)) {
    c = mix(vec3(0.62, 0.53, 0.40), vec3(0.55, 0.52, 0.47), p.w);
    float w = winGrid(u, y, 0.14, 0.0058, u < 0.0 ? 0.004 : 0.017, 0.45, 0.5, cell);
    c = mix(c, vec3(0.16, 0.15, 0.15), w * 0.8);
  } else if (isP(id, P_BLOCK)) {
    float b = p.w;
    c = b < 0.5 ? vec3(0.48, 0.32, 0.22) : b < 1.5 ? vec3(0.72, 0.63, 0.48) : b < 2.5 ? vec3(0.78, 0.78, 0.75) : b < 3.5 ? vec3(0.56, 0.33, 0.20)
      : b < 4.5 ? vec3(0.66, 0.60, 0.48) : b < 5.5 ? vec3(0.80, 0.80, 0.77) : mix(vec3(0.70, 0.64, 0.52), vec3(0.78, 0.77, 0.73), fract(b * 0.37));
    float fy = fract((y - 0.016) / 0.0048);
    float w = winGrid(u, y, 0.11, 0.0048, 0.016, 0.55, 0.55, cell);
    vec3 recess = c * 0.58;                                                                       // in ombra sotto il balcone di sopra
    c = mix(recess, c * 1.05, mix(0.22, step(fy, 0.22), fineK(0.0048 * VS * 0.22)));              // le fasce chiare dei balconi
    c = mix(c, vec3(0.18, 0.19, 0.21), w * step(0.22, fy) * 0.45);
  } else if (isP(id, P_GREEN)) {
    c = vec3(0.11, 0.17, 0.09) * (0.75 + 0.35 * vnoise(vec2(u * 40.0, y * 900.0)));
  } else if (isP(id, P_SHORE)) {                                    // la riva del Mar Piccolo: alberi bassi, qualche casa bianca, colline velate
    float strip = 0.0062 + 0.0016 * vnoise(vec2(u * 14.0, 2.0));
    if (y < strip) {
      c = vec3(0.17, 0.23, 0.17);
      vec2 g = vec2(u / 0.05, (y - 0.0035) / 0.0016), f = fract(g);
      if (y > 0.0035 && h21(floor(g) + 23.0) < 0.14 && f.x < 0.5 && f.y < 0.6) c = mix(c, vec3(0.66, 0.67, 0.65), 0.7);
      hz = 0.45;
    } else { c = vec3(0.40, 0.46, 0.50); hz = 0.6; }
  }
  // il sole vero, con il sereno: la faccia verso il sole si scalda, l'ombra prende l'azzurro del cielo.
  // La normale: le torri tonde girano da -1 (sinistra) a 1 (destra), il resto guarda verso di noi.
  if (SUNK > 0.0) {
    float nx = isP(id, P_TOWER) ? p.y : isP(id, P_STONE) && p.w > 1.5 && p.w < 2.5 ? clamp((u + 5.67) / 0.53, -1.0, 1.0) : 0.0;
    vec3 N = vec3(nx, 0.0, -sqrt(max(1.0 - nx * nx, 0.0)));
    float ca = cos(uSun.z);
    float lam = max(dot(N, vec3(uSun.x * ca, sin(uSun.z), uSun.y * ca)), 0.0);
    if (isP(id, P_ROOF) || isP(id, P_GREEN)) lam = max(lam, 0.15 + 0.8 * sin(uSun.z));   // tetti e chiome lo prendono dall'alto
    vec3 lit = vec3(0.52, 0.60, 0.78) * 0.75 + SUNCOL * lam * 1.2;
    c *= mix(vec3(1.0), lit, SUNK);
    hz = mix(hz, 0.17, SUNK);
  }
  return mix(c, haze, hz);
}
vec3 dayOutside(vec3 dir, float blur, float t) {
  float az = atan(dir.x, -dir.z);
  float el = asin(clamp(dir.y, -1.0, 1.0));
  vec3 col = vec3(0.0);
  sunSetup();
  if (el < HOR) {
    float dep = max(HOR - el, 0.0004);
    vec2 wp = vec2(az / dep, 1.0 / dep);
    // il vento cambia le onde (vedi water): calma = specchio liscio e chiaro; vento = increspature fitte, acqua piu' scura
    float tw = uWaveT, rf = wm(0.55, 1.0, 1.7), rh = wm(0.3, 1.0, 3.0);
    float big = fbm3(vec2(wp.x * 0.9 * rf, wp.y * 0.55 * rf - tw * 0.35));
    float rip = (big - 0.5) * rh;
    col = mix(vec3(0.30, 0.38, 0.44), vec3(0.15, 0.22, 0.28), smoothstep(0.0, 0.3, dep)) * wm(1.0, 1.0, 0.62) + rip * 0.07;
    col = mix(col, daySky(az, HOR + dep, t), 0.25 + 0.25 * (1.0 - uCloud) + wm(0.22, 0.0, -0.1));   // con il sereno l'acqua prende l'azzurro del cielo; con la calma ne e' lo specchio
    // Il ponte capovolto nell'acqua: la stessa sagoma (arcata, impalcato, spalle) specchiata sotto la linea di riva,
    // mossa dalle onde e sempre piu' sbiadita e rotta allontanandosi. Prima era una fascia scura dai bordi netti.
    float u = townU(az) + rip * (0.03 + dep * 3.0);
    // creste bianche, rade e piccole verso il largo: solo con vento forte, dove l'onda grossa e' alta e una seconda grana e' accesa
    float ws = clamp(uWind * 2.0 - 1.0, 0.0, 1.0);
    if (ws > 0.0) {
      float fine = vnoise(vec2(wp.x * 2.6, wp.y * 1.5 - tw * 0.9));
      float far = smoothstep(0.012, 0.05, dep) * (1.0 - 0.5 * smoothstep(0.1, 0.25, dep));
      float swell = vnoise(vec2(wp.x * 0.3, wp.y * 1.2 - tw * 0.6));          // lunghe ondulazioni: bande scure e chiare di traverso
      col *= 1.0 - 0.22 * ws * (swell - 0.4) * far;
      col += vec3(0.07, 0.09, 0.10) * ws * smoothstep(0.50, 0.68, big) * far;   // il fianco dell'onda rivolto al cielo si schiarisce
      float cap = smoothstep(0.57, 0.70, big) * smoothstep(0.60, 0.80, fine) * far;
      col = mix(col, vec3(0.82, 0.87, 0.90), cap * 0.7 * ws);
    }
    if (u > BR_L - 0.2 && u < BR_R + 0.2) {
      float ry = dep * 1.1 / VS;
      float brk = 0.5 + 0.5 * smoothstep(0.3, 0.7, fbm3(vec2(wp.x * 2.3 * rf, wp.y * 1.4 * rf - tw * 0.5)));
      brk = mix(brk, 1.0, 0.6 * clamp(1.0 - uWind * 2.0, 0.0, 1.0));       // con la calma il ponte si specchia quasi intero
      float yb = bridgeUnder(u);
      vec3 steel = mix(mix(vec3(0.12, 0.16, 0.20), vec3(0.26, 0.33, 0.38), smoothstep(yb, DECK, ry)), daySky(az, HOR + 0.02, t), 0.3);
      col = mix(col, steel * 0.78, bridgeMask(u, ry, 0.0014 + dep * 0.06) * brk * 0.85 * exp(-dep / 0.09));
    }
    // la citta' specchiata: la pietra del castello e del muraglione, sbiadita e mossa
    if (u > -7.0 && u < 7.0 && dep < 0.1 && (u < -1.03 || u > 1.0)) col = mix(col, townDay(u, dep * 1.05 / VS, col), 0.2 * exp(-dep / 0.02));
    // la barca: scafo chiaro, cabina e una scia corta
    float ba = boatAz(t);
    float hull = (1.0 - smoothstep(0.0062, 0.0074, abs(az - ba))) * (1.0 - smoothstep(0.0009, 0.0013, abs(el - BOAT_EL - 0.0008)));
    float cabin = (1.0 - smoothstep(0.0019, 0.0026, abs(az - ba + 0.0015))) * (1.0 - smoothstep(0.0010, 0.0014, abs(el - BOAT_EL - 0.0028)));
    float wake = step(az, ba - 0.007) * (1.0 - smoothstep(0.0, 0.03, ba - az)) * (1.0 - smoothstep(0.0003, 0.0007, abs(el - BOAT_EL + 0.0003)));
    col = mix(col, vec3(0.78, 0.82, 0.84), wake * 0.35);
    col = mix(col, vec3(0.90, 0.90, 0.88), max(hull, cabin) * 0.85);
    // col sole davanti e basso, la sua scia luccica sull'acqua (solo "dal vivo", con il sereno)
    float front = smoothstep(0.0, 0.35, uSun.y) * SUNK;
    if (front > 0.0) {
      float mx = (az - SUN_AZ) / (0.012 + dep * 0.5);
      col += SUNCOL * exp(-mx * mx) * smoothstep(0.48, 0.72, big) * front * 0.9 * exp(-dep / 0.12);
    }
  } else {
    float u = townU(az), y = (el - HOR) / VS;   // y: quota sopra l'acqua, nella scala della citta'
    float ce = skyline(az);
    float edge = 0.0012 + blur * 0.002;
    float land = 1.0 - smoothstep(ce - edge, ce + edge, el);
    vec3 hill = mix(vec3(0.20, 0.26, 0.29), vec3(0.36, 0.42, 0.45), smoothstep(0.0, 0.05, el - HOR)) * (1.0 + 0.22 * (1.0 - uCloud));
    vec3 haze = daySky(az, HOR + 0.02, t);
    float yc = min(y, (ce - HOR) / VS - 0.0002);                 // sul bordo del profilo il colore e' quello dell'elemento sotto
    if (inTown(u)) hill = mix(hill, townDay(u, yc, haze), townK(u));   // velati dalla distanza
    col = mix(daySky(az, el, t), hill, land);
    if (u > -2.2 && u < 7.0) {                                   // l'antenna e la bandiera sul castello, le palme sul muraglione
      float e2 = edge * 0.5 / DIST;
      col = mix(col, mix(vec3(0.42, 0.44, 0.46), haze, 0.3), mast(u, y, e2));
      float fx = (u - MAST_U - 0.105) / 0.065, fy = y - 0.0447 + 0.0006 * sin(fx * 4.0 + t * 2.0);
      float flag = step(0.0, fx) * step(fx, 1.0) * step(abs(fy), 0.0022);
      vec3 tri = fx < 0.333 ? vec3(0.10, 0.50, 0.25) : fx < 0.667 ? vec3(0.92, 0.92, 0.90) : vec3(0.80, 0.14, 0.16);
      col = mix(col, mix(tri, haze, 0.4), flag);
      col = mix(col, mix(vec3(0.70, 0.70, 0.70), haze, 0.4), (1.0 - smoothstep(0.0, e2, abs(u - MAST_U - 0.105) * HW0 - 0.0001)) * step(TW_TOP, y) * step(y, 0.0475));
      float pm = max(palm(u, y, 6.3, 0.049, e2), palm(u, y, 6.85, 0.046, e2));
      col = mix(col, mix(vec3(0.10, 0.15, 0.08), haze, 0.35), pm);
    }
    if (u > BR_L - 0.1 && u < BR_R + 0.1) {                      // ponte girevole: acciaio scuro, travata, parapetto e lampioni
      float be = (0.0005 + blur * 0.0010) / DIST;                 // in quote della citta': da lontano i bordi sono piu' morbidi
      float yb = bridgeUnder(u);
      vec3 steel = mix(vec3(0.06, 0.07, 0.09), vec3(0.16, 0.19, 0.22), smoothstep(DECK - 0.0018, DECK, y));
      steel = mix(steel, haze, 0.38);
      col = mix(col, mix(steel, col, 0.75 * trussGap(u, y)), bridgeMask(u, y, be));
      float inB = step(BR_L, u) * step(u, BR_R);
      float bars = 0.35 + 0.65 * step(fract(u / 0.045), 0.3);                                     // la grata: sbarre fitte
      float rail = max(1.0 - smoothstep(0.0, 0.00025 + be, abs(y - RAIL)), 0.32 * bars * step(DECK, y) * step(y, RAIL));   // corrimano e grata
      col = mix(col, mix(vec3(0.08, 0.09, 0.11), haze, 0.38), rail * inB * 0.8);
      for (int i = 0; i < LAMPS; i++) {
        float d = abs(u - lampU(i));
        float post = (1.0 - smoothstep(0.0, be, d * HW0 - 0.00012)) * step(RAIL, y) * step(y, LAMP_Y + 0.0007);
        float arm = step(d, 0.06) * (1.0 - smoothstep(0.0, be, abs(y - LAMP_Y - 0.0004) - 0.00015));
        float head = (1.0 - smoothstep(0.0, be, length(vec2((d - 0.05) * HW0, y - LAMP_Y)) - 0.00035));
        col = mix(col, mix(vec3(0.14, 0.16, 0.19), haze, 0.38), max(post, max(arm, head)) * 0.8);
      }
    }
    if (u > -1.1 && u < 6.5 && y < 0.03) {                               // auto di giorno: piccole sagome colorate
      for (int i = 0; i < CARS; i++) {
        vec3 c = carAt(i, t);
        float body = (1.0 - smoothstep(0.045, 0.060, abs(u - c.x))) * (1.0 - smoothstep(0.0007, 0.0012, abs(y - roadY(c.x) - 0.0005)));
        float kind = mod(float(i), 3.0);
        vec3 paint = kind < 0.5 ? vec3(0.72, 0.16, 0.12) : kind < 1.5 ? vec3(0.88, 0.89, 0.90) : vec3(0.16, 0.20, 0.26);
        col = mix(col, mix(paint, haze, 0.4), body * c.y * 0.8);
      }
    }
  }
  return clearFilter(col, az, el);
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
  float present = step(mix(0.80, 0.35, uRain), h21(id + 1.3));   // con la pioggia debole scendono meno gocce
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
  float m = smoothstep(r, r * 0.6, length(d)) * step(mix(0.965, 0.87, uRain), h21(id + 2.2));
  return vec3(d / max(r, 1e-3) * m * 0.012, m);
}

void main() {
  vec2 p = vUv * uSize;
  float t = uTime;
  // uRain: 0 vetro asciutto, 0.5 pioggia debole, 1 pioggia (i temi scuro e chiaro usano sempre 1)
  float wet = clamp(uRain * 2.0, 0.0, 1.0);      // quanto il vetro e' bagnato: pieno gia' con la pioggia debole
  vec3 a = vec3(0.0), b = vec3(0.0), s = vec3(0.0);
  if (uRain > 0.001) {
    a = slidingDrops(p, t, 1.0);
    b = slidingDrops(p + vec2(0.37, 0.11), t * 0.8, 0.72);
    s = staticDrops(p, t);
  }
  vec2 off = (a.xy + b.xy + s.xy) * wet;
  float clear = clamp(max(max(a.z, b.z), s.z) * wet, 0.0, 1.0);

  vec3 dir = normalize(vWorld - cameraPosition);
  // le gocce fanno da lenti: deviano (e capovolgono) la vista
  dir = normalize(dir - vec3(off.x * 9.0, off.y * 9.0, 0.0));
  PIX = clamp(length(fwidth(dir)), 0.00005, 0.01);                // dentro le gocce la vista e' piu' "larga": i dettagli si sfumano
  float blur = mix(0.15, mix(1.0, 0.15, clear), wet);   // vetro asciutto: si vede nitido come dentro una goccia
  // MODE: 0 = notte, 1 = giorno: due varianti dello shader, ognuna calcola solo il suo panorama.
  // Al crepuscolo (solo nella modalita' "dal vivo") si disegnano tutte e due: il giorno sopra la notte, con uAlpha.
#if MODE == 0
  vec3 col = outside(dir, blur, t);
#else
  vec3 col = dayOutside(dir, blur, t);
#endif
  if (uDusk > 0.001) {                                                    // alba e tramonto: l'orizzonte si scalda
    float tel = asin(clamp(dir.y, -1.0, 1.0)) - HOR;
    col += vec3(0.95, 0.42, 0.16) * exp(-abs(tel) / 0.09) * uDusk * (0.55 - 0.3 * uCloud) * (tel > 0.0 ? 1.0 : 0.45);
  }

  // vetro appannato: foschia fredda dove non passano gocce
  float fog = 0.32 * (1.0 - clear) * wet;
  vec3 fogCol = mix(vec3(0.016, 0.020, 0.028), vec3(0.30, 0.33, 0.35), uDay) + col * 0.4;
  col = mix(col, fogCol, fog);
  // bordo delle gocce: leggero scuro + riflesso della lampada in alto a sinistra
  float rim = smoothstep(0.55, 1.0, length(off) * 45.0) * clear;
  col *= 1.0 - 0.12 * rim;
  col += vec3(0.20, 0.13, 0.07) * smoothstep(0.6, 1.0, dot(normalize(off + 1e-5), normalize(vec2(-0.6, 0.8)))) * rim * 0.5;
  col += vec3(0.010, 0.007, 0.004) * (1.0 - vUv.y);
  gl_FragColor = vec4(col, uAlpha);
}`;

export function createGlass() {
  const w = ROOM.win.x1 - ROOM.win.x0, h = ROOM.win.y1 - ROOM.win.y0;
  // Due varianti dello stesso shader (notte e giorno) con le stesse uniform, piu' un terzo materiale che riusa
  // il programma del giorno: e' il panorama diurno che al crepuscolo si sovrappone, in trasparenza, a quello notturno.
  // Tutti "transparent" (con opacita' 1 non cambia nulla): cosi' il terzo non richiede un programma in piu'.
  // Una terza variante che mescolasse i due panorami nello stesso shader e' stata provata e scartata: al primo
  // uso bloccava la pagina per 7-8 secondi (compilazione), e prepararla prima con compileAsync non serviva.
  // cielo vero ("dal vivo"): le stelle si disegnano su questa tela (room.setHeavens) e lo shader le legge come texture
  const skyCanvas = canvas(1536, 768), skyTex = tex(skyCanvas, { mips: false });
  const shared = { uStars: { value: skyTex }, uStarAmt: { value: 0 }, uMoon: { value: new THREE.Vector4(0, 0, 0, 0) }, uMoonDir: { value: new THREE.Vector2(1, 0) }, uTime: { value: 0 }, uSize: { value: new THREE.Vector2(w, h) }, uRain: { value: 1 }, uDay: { value: 0 }, uCloud: { value: 0.66 }, uDusk: { value: 0 }, uWind: { value: 0.5 }, uWaveT: { value: 0 }, uSun: { value: new THREE.Vector4(0, 0, 0, 0) } };
  const material = (MODE) => new THREE.ShaderMaterial({ vertexShader: GLASS_VERT, fragmentShader: GLASS_FRAG, uniforms: { ...shared, uAlpha: { value: 1 } }, defines: { MODE }, transparent: true });
  const variants = [0, 1].map(material);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), variants[0]);
  mesh.renderOrder = -2; // la vetrata e' la cosa piu' lontana: si disegna prima di ogni altra trasparenza
  mesh.userData.variants = variants;
  const over = new THREE.Mesh(mesh.geometry, material(1));
  over.name = "glass-day";
  over.position.z = 0.0008;
  over.renderOrder = -1;
  over.visible = false;
  mesh.add(over);
  mesh.userData.over = over;
  mesh.userData.sky = { canvas: skyCanvas, ctx: skyCanvas.getContext("2d"), texture: skyTex, uniforms: shared };
  mesh.position.set((ROOM.win.x0 + ROOM.win.x1) / 2, (ROOM.win.y0 + ROOM.win.y1) / 2, ROOM.glassZ);
  mesh.name = "glass";
  return mesh;
}

// direzione vera (gradi da nord) in cui si guarda la citta' dal Mar Grande, lungo il canale verso il Mar Piccolo.
// Serve solo alla luce del sole sulle facciate; il cielo della vetrata (stelle, Luna) segue FACING in sky.js.
const CITY_BEARING = 45;
const C3 = (hex) => new THREE.Color(hex);
const NIGHT = { moon: C3(0x5f86d8), sky: C3(0x2c3466), ground: C3(0x0b0710), floor: C3(0x17130f), ceil: C3(0x1d2026) };
const DAY = { moon: C3(0xfff3e2), sky: C3(0xd5dee8), ground: C3(0x8f887b), floor: C3(0x6b6156), ceil: C3(0xc4c9cc) };
const DUSK = C3(0xff9a52); // luce radente di alba e tramonto

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

  const DEPTH = 4.1;                      // la stanza arriva fin dietro la camera della vista d'insieme
  const sideGeo = new THREE.PlaneGeometry(DEPTH, height);
  const rightWall = new THREE.Mesh(sideGeo, wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(right, height / 2, wallZ + DEPTH / 2);
  rightWall.receiveShadow = true;
  group.add(rightWall);
  const leftWall = new THREE.Mesh(sideGeo, wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(left, height / 2, wallZ + DEPTH / 2);
  group.add(leftWall);

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x17130f, roughness: 0.8 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3.2, DEPTH), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((left + right) / 2, 0, wallZ + DEPTH / 2);
  floor.receiveShadow = true;
  group.add(floor);
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x1d2026, roughness: 1 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(3.2, DEPTH), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set((left + right) / 2, height, wallZ + DEPTH / 2);
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
  // --- proiezione sul vetro: nella modalita' "dal vivo" il meteo si legge qui, come proiettato sulla vetrata ---
  // Stessa luce dell'ologramma dello spettro sopra i synth: ambra che si somma al panorama, righe di scansione,
  // bordi che sfumano e una curva luminosa, che qui e' la temperatura delle prossime ore con la pioggia in barre.
  // Sta nel riquadro di destra, sotto il ponte e sopra l'ologramma dello spettro. Di giorno una luce proiettata non si vedrebbe:
  // allora diventa una scritta scura sul vetro.
  const PJ = { w: 0.72, h: 0.315, cw: 1024, ch: 448 };
  const pjCanvas = canvas(PJ.cw, PJ.ch), pjCtx = pjCanvas.getContext("2d"), pjMap = tex(pjCanvas, { mips: false });
  const pjMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: pjMap }, uTime: { value: 0 }, uGain: { value: 1.7 }, uNight: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: /* glsl */ `
uniform sampler2D uMap; uniform float uTime, uGain, uNight; varying vec2 vUv;
void main() {
  vec4 c = texture2D(uMap, vUv);
  float edge = smoothstep(0.0, 0.025, vUv.x) * smoothstep(1.0, 0.975, vUv.x);
  float scan = 0.8 + 0.2 * sin(vUv.y * 470.0 + uTime * 5.0);                         // righe che scorrono, come l'ologramma
  float flick = 0.97 + 0.03 * sin(uTime * 23.0) * sin(uTime * 3.7);
  float pass = fract(uTime * 0.065) * 1.3 - 0.15;                                     // un'onda di luce percorre la curva
  float sweep = 1.0 + 0.7 * exp(-pow((vUv.x - pass) / 0.045, 2.0)) * step(vUv.y, 0.47);
  float k = mix(0.85 + 0.15 * scan, scan * flick * sweep, uNight);
  gl_FragColor = vec4(c.rgb * mix(1.0, uGain, uNight) * k, c.a * edge);
}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const projection = new THREE.Mesh(new THREE.PlaneGeometry(PJ.w, PJ.h), pjMat);
  projection.name = "projection";
  projection.userData.canvas = pjCanvas;
  projection.position.set(0.68, 1.262, ROOM.glassZ + 0.012);
  projection.renderOrder = 3;
  projection.visible = false;
  group.add(projection);
  let pjLines = null, pjNight = true;
  let windTarget = 0.5, waveExtra = 0;   // vento verso cui il mare si porta; scarto accumulato del tempo delle onde
  function drawProjection() {
    const x = pjCtx, W = PJ.cw;
    x.clearRect(0, 0, W, PJ.ch);
    if (pjLines) {
      const N = pjNight;
      const amber = N ? "#FFB44A" : "#7A3E00", ink = N ? "#FFE9C8" : "#16222D", soft = N ? "rgba(255, 226, 186, 0.86)" : "rgba(22, 34, 45, 0.86)";
      const glow = (c, b) => { x.shadowColor = N ? c : "rgba(255, 255, 255, 0.75)"; x.shadowBlur = N ? b : 4; };
      const fit = (text, size, weight, max) => { let s = size + 4; do { s -= 4; x.font = `${weight} ${s}px ${FONT}`; } while (x.measureText(text).width > max && s > 26); };
      x.textBaseline = "alphabetic";
      // in alto: la temperatura grande a sinistra; a destra che tempo fa, il posto con l'ora e la fonte dei dati
      let left = 44;
      if (pjLines.big) {
        fit(pjLines.big, 196, 800, 440);
        glow("rgba(255, 160, 60, 0.85)", 22);
        x.fillStyle = amber;
        x.fillText(pjLines.big, left, 186);
        left += x.measureText(pjLines.big).width + 40;
      }
      const max = W - left - 40;
      fit(pjLines.main, 84, 700, max);
      glow("rgba(255, 200, 130, 0.7)", 14);
      x.fillStyle = ink;
      x.fillText(pjLines.main, left, 88);
      fit(pjLines.sub, 54, 600, max);
      x.fillStyle = soft;
      x.fillText(pjLines.sub, left, 148);
      if (pjLines.credit) {
        x.font = `500 34px ${FONT}`;
        x.fillStyle = N ? "rgba(255, 226, 186, 0.62)" : "rgba(22, 34, 45, 0.7)";
        x.fillText(pjLines.credit, left, 192);
      }
      const hrs = pjLines.hours;
      if (hrs) {
        // in basso la curva: temperatura ora per ora (linea) e pioggia (barre a tacche, come lo spettro)
        const X0 = 100, X1 = W - 100, top = 276, bottom = 346, floor = 396;
        const px = (i) => X0 + ((X1 - X0) * i) / (hrs.length - 1);
        let lo = Math.min(...hrs.map((h) => h.temp)), hi = Math.max(...hrs.map((h) => h.temp));
        if (hi - lo < 4) { const m = (hi + lo) / 2; lo = m - 2; hi = m + 2; }
        const py = (t) => bottom - ((t - lo) / (hi - lo)) * (bottom - top);
        x.shadowBlur = 0;
        hrs.forEach((h, i) => {
          const bw = 18, bx = px(i) - bw / 2, mm = Math.min(4, h.mm), tall = mm > 0 ? 10 + 46 * Math.sqrt(mm / 4) : 4;
          for (let y = floor; y > floor - tall; y -= 8) {
            x.fillStyle = mm > 0 ? (y < floor - 30 ? "rgba(255, 92, 60, 0.9)" : N ? "rgba(255, 170, 80, 0.85)" : "rgba(122, 62, 0, 0.8)") : N ? "rgba(255, 190, 120, 0.32)" : "rgba(22, 34, 45, 0.3)";
            x.fillRect(bx, y - 5, bw, Math.min(5, y - (floor - tall)));
          }
        });
        // la linea: morbida, con un'anima chiara e l'alone ambra
        const path = () => {
          x.beginPath();
          x.moveTo(px(0), py(hrs[0].temp));
          for (let i = 1; i < hrs.length; i++) {
            const mx = (px(i - 1) + px(i)) / 2;
            x.bezierCurveTo(mx, py(hrs[i - 1].temp), mx, py(hrs[i].temp), px(i), py(hrs[i].temp));
          }
        };
        x.lineCap = x.lineJoin = "round";
        glow("rgba(255, 160, 60, 0.95)", 20);
        x.strokeStyle = amber; x.lineWidth = 7; path(); x.stroke();
        if (N) { x.shadowBlur = 0; x.strokeStyle = "#FFF0D8"; x.lineWidth = 2.5; path(); x.stroke(); }
        // ogni tre ore: il punto, i gradi sopra e l'ora sotto
        x.textAlign = "center";
        for (let i = 0; i < hrs.length; i += 3) {
          const cx = px(i), cy = py(hrs[i].temp);
          glow("rgba(255, 160, 60, 0.9)", 12);
          x.fillStyle = N ? "#FFF0D8" : amber;
          x.beginPath(); x.arc(cx, cy, 7, 0, Math.PI * 2); x.fill();
          x.font = `700 40px ${FONT}`;
          x.fillStyle = ink;
          x.fillText(Math.round(hrs[i].temp) + "°", cx, cy - 18);
          x.shadowBlur = 0;
          x.font = `600 38px ${FONT}`;
          x.fillStyle = soft;
          x.fillText(hrs[i].label, cx, 442);
        }
        x.textAlign = "left";
      }
      x.shadowBlur = 0;
    }
    pjMap.needsUpdate = true;
  }

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

  // parete sinistra: un poster, con il suo filo di luce
  const poster = posterWall(frameMat, cove.material);
  poster.position.set(left + 0.004, 1.34, 0.78);
  poster.rotation.y = Math.PI / 2;
  group.add(poster);

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
    // day: 0 = notte, 1 = giorno (di giorno entra luce chiara dalla vetrata e le pareti schiariscono).
    // rain: 0 vetro asciutto .. 1 pioggia. cloud: 0 sereno .. 1 coperto. warm: 0..1, alba e tramonto.
    // Tema scuro = { day 0, rain 1, cloud 0.66 }, tema chiaro = { day 1, rain 1, cloud 1 }: sono i due aspetti di sempre.
    // cielo vero: stelle e Luna calcolate da sky.js (solo "dal vivo", al buio); null lo spegne
    setHeavens(h) {
      const S = glass.userData.sky, u = S.uniforms;
      u.uStarAmt.value = h ? 1 : 0;
      u.uMoon.value.set(0, 0, 0, 0);
      if (!h) return;
      const x = S.ctx, W = S.canvas.width, H = S.canvas.height;
      x.globalCompositeOperation = "source-over";
      x.fillStyle = "#000";
      x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = "lighter";
      for (const [az, el, mag, warm] of h.stars) {
        const flux = Math.pow(2.512, -mag);                       // 1 per una stella di magnitudine 0
        const px = (az / PATCH.az * 0.5 + 0.5) * W, py = (1 - el / PATCH.el) * H;
        const c = warm ? "255, 205, 150" : "222, 233, 255", a = Math.min(1, 0.2 + 0.95 * Math.sqrt(flux));
        if (mag > 3.4) { x.fillStyle = `rgba(${c}, ${a})`; x.fillRect(px - 0.9, py - 0.9, 1.8, 1.8); continue; }
        const r = Math.min(9, 2.6 + 3.4 * Math.sqrt(flux)), g = x.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, `rgba(${c}, ${a})`); g.addColorStop(0.3, `rgba(${c}, ${a * 0.6})`); g.addColorStop(1, `rgba(${c}, 0)`);
        x.fillStyle = g;
        x.fillRect(px - r, py - r, r * 2, r * 2);
      }
      S.texture.needsUpdate = true;
      const m = h.moon;
      if (m.el > -0.008 && Math.abs(m.az) < PATCH.az) { u.uMoon.value.set(m.az, m.el, m.lit, 1); u.uMoonDir.value.set(m.dir[0], m.dir[1]); }
    },
    // testo proiettato sul vetro: { big, main, sub, credit, hours: [{ temp, mm, label }] | null }; null lo spegne
    setProjection(lines) {
      pjLines = lines;
      projection.visible = !!lines;
      drawProjection();
    },
    setSky({ day: k, rain = 1, cloud = 1, warm = 0, wind = 0.5, date = null }) {
      windTarget = wind;   // il vento arriva piano: lo porta update
      if ((k < 0.5) !== pjNight) {   // la proiezione cambia veste tra notte e giorno
        pjNight = k < 0.5;
        pjMat.uniforms.uNight.value = pjNight ? 1 : 0;
        pjMat.blending = pjNight ? THREE.AdditiveBlending : THREE.NormalBlending;   // di notte luce che si somma, di giorno inchiostro
        pjMat.needsUpdate = true;
        drawProjection();
      }
      const L = THREE.MathUtils.lerp, open = (1 - cloud) * k;   // quanto cielo sereno si vede, di giorno
      // notte o giorno pieni: una sola variante. In mezzo (crepuscolo): la notte sotto e il giorno sopra, opaco quanto k
      const twilight = k > 0.02 && k < 0.98, over = glass.userData.over;
      glass.material = glass.userData.variants[k >= 0.98 ? 1 : 0];
      over.visible = twilight;
      over.material.uniforms.uAlpha.value = k;
      const u = glass.material.uniforms;
      u.uDay.value = k; u.uRain.value = rain; u.uCloud.value = cloud; u.uDusk.value = twilight ? warm : 0;
      // il sole vero sulla veduta ("dal vivo"): da dove arriva rispetto a chi guarda la citta'. La veduta e' quella di
      // Taranto dal Mar Grande, verso nord-est (CITY_BEARING): il sole si calcola li', qualunque sia il posto del visitatore.
      // Nei temi fissi non c'e' (date null) e lo shader resta quello di sempre.
      const sun = date ? heavens(date, 40.47, 17.24).sun : null;
      if (sun) { const r = (sun.bearing - CITY_BEARING) * Math.PI / 180; u.uSun.value.set(Math.sin(r), Math.cos(r), sun.alt, 1); }
      else u.uSun.value.set(0, 0, 0, 0);
      moon.color.lerpColors(NIGHT.moon, DAY.moon, k).lerp(DUSK, warm * 0.6);
      moon.intensity = L(0.6, 1.4, k) * (1 + 0.6 * open);
      fill.color.lerpColors(NIGHT.sky, DAY.sky, k);
      fill.groundColor.lerpColors(NIGHT.ground, DAY.ground, k);
      fill.intensity = L(0.62, 1.9, k) * (1 + 0.12 * open);
      wallMat.color.setScalar(L(1, 3.3, k));
      floorMat.color.lerpColors(NIGHT.floor, DAY.floor, k);
      ceilMat.color.lerpColors(NIGHT.ceil, DAY.ceil, k);
      poster.userData.material.color.setScalar(L(1, 2.1, k));            // la carta prende luce come il muro
      poster.userData.material.emissiveIntensity = L(0.5, 0.06, k);
      poster.userData.spill.opacity = L(0.22, 0, k);
      cove.material.color.setRGB(L(2.2, 0.9, k), L(1.3, 0.6, k), L(0.45, 0.3, k));
    },
    update(t, dt = 0) {
      const U = glass.material.uniforms;
      // il vento cambia piano (circa due secondi): niente scatti. Il tempo delle onde accumula solo lo scarto dalla
      // velocita' di sempre (con vento 0.5 e' zero, e uWaveT resta uguale a t), cosi' un cambio di vento non fa saltare le onde.
      const wd = windTarget - U.uWind.value;
      U.uWind.value = Math.abs(wd) < 0.0005 ? windTarget : U.uWind.value + wd * (1 - Math.exp(-dt / 1.6));
      const v = U.uWind.value;
      waveExtra += dt * (v < 0.5 ? -(0.5 - v) * 1.2 : (v - 0.5) * 2.4);
      U.uWaveT.value = t + waveExtra;
      glass.material.uniforms.uTime.value = t;
      pjMat.uniforms.uTime.value = t;
    },
  };
}
