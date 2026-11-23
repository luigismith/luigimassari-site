// Stanza: pareti scure e vetrata panoramica sul Mar Grande con pioggia sul vetro.
import * as THREE from "three";
import { plasterTextures, parquetTextures, PARQUET, canvas, tex, FONT } from "./textures.js";
import { PATCH, heavens } from "./sky.js";
import { PANO } from "./taranto/pano.js";

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
  // board: il poster vero e proprio (cornice, carta, filo di luce), senza l'alone sul muro: e' lui che si clicca e
  // che si contorna al passaggio del mouse (main.js); con l'alone il contorno disegnava un rettangolo largo il doppio
  const board = new THREE.Group();
  board.name = "poster-board";
  board.userData.dynamic = true;   // mergeStatic non lo unisce al resto della stanza: deve restare intero per contorno e clic
  board.add(frame, sheet, light);
  g.add(spill, board);
  g.userData.board = board;
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

// --- Il panorama vero di Taranto, calcolato da tools/panorama.py dai dati di OpenStreetMap, Overture e del terreno ---
// Il punto di vista e' sul Mar Grande, sull'asse del Canale navigabile, a 800 m dall'imbocco, verso il Mar Piccolo.
// Per ogni direzione (azimut az, elevazione el) le tre immagini dicono che cosa c'e' e a che distanza:
// uPano (nearest): classe*16 + angolo della facciata, distanza (log), numero dell'edificio, quota del tetto (m/2);
// uLuci (lineare, con mipmap): luci della notte (rgb) e copertura della sagoma (a); uStrade (nearest): riga 0 la base
// della riva (per i riflessi), righe 1-3 le strade lungo l'acqua e sui ponti, dove passano le auto.
uniform sampler2D uPano;
uniform sampler2D uLuci;
uniform sampler2D uStrade;
const float PAZ0 = ${PANO.AZ0.toFixed(5)}, PAZ1 = ${PANO.AZ1.toFixed(5)}, PEL0 = ${PANO.EL0.toFixed(5)}, PEL1 = ${PANO.EL1.toFixed(5)};
const float PK = ${PANO.K.toFixed(3)}, PHV = ${PANO.HV.toFixed(2)};
const float LDMIN = ${Math.log(PANO.DMIN).toFixed(6)}, LDR = ${Math.log(PANO.DMAX / PANO.DMIN).toFixed(6)};
const float C_HILL = 1.0, C_GROUND = 2.0, C_QUAY = 3.0, C_STONE = 4.0, C_OLD = 5.0, C_RES = 6.0, C_TALL = 7.0, C_IND = 8.0;
const float C_CHIMNEY = 9.0, C_STEEL = 10.0, C_PALAZZO = 11.0, C_CHURCH = 12.0, C_GREEN = 13.0, C_DARK = 14.0, C_TANK = 15.0;
const float PI = 3.14159265;
const vec3 SAND = vec3(0.47, 0.32, 0.17);   // pietra calcarea (colori lineari: a schermo escono piu' chiari)

// quanto e' grande un pixel, in radianti (lo calcola main): i dettagli piu' piccoli di qualche pixel si vedono
// sfumati nella loro media, come in una foto da lontano, invece di sfarfallare
float PIX = 0.001;
float fineK(float size) { return smoothstep(1.3, 3.5, size / PIX); }

vec2 puv(float az, float el) { return vec2((az - PAZ0) / (PAZ1 - PAZ0), (el - PEL0) / (PEL1 - PEL0)); }
bool inPano(vec2 uv) { return uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0; }
// un texel del panorama: x = classe, y = angolo della facciata (0 = di fronte), z = distanza (m), w = edificio; roof = quota del tetto
vec4 pano(vec2 uv, out float roof) {
  vec4 t = textureLod(uPano, uv, 0.0);
  float r = floor(t.r * 255.0 + 0.5), c = floor(r / 16.0);
  roof = t.a * 510.0;
  return vec4(c, (r - c * 16.0 - 7.0) / 7.0 * 1.5708, exp(LDMIN + t.g * LDR), floor(t.b * 255.0 + 0.5));
}
bool isC(float c, float k) { return abs(c - k) < 0.5; }
// quota sul mare (m) del punto visto a elevazione el e distanza d (con la curvatura della Terra)
float hAt(float el, float d) { return (el - HOR) / PK * d + PHV + d * d * 6.83e-8; }
// la base della riva in questa colonna (dove la terra tocca l'acqua): da li' in giu' l'acqua specchia quello che c'e' sopra
float shoreEl(float az) {
  vec4 s = textureLod(uStrade, vec2((az - PAZ0) / (PAZ1 - PAZ0), 0.5 / 8.0), 0.0);
  return PEL0 + (s.r * 65280.0 + s.g * 255.0) / 65535.0 * (PEL1 - PEL0);
}
// finestre in griglia su una facciata: s, h in metri (lungo la facciata e in quota), passo bay x fl, vano fw x fh;
// ps, ph = metri per pixel. Troppo piccole per vederle: la loro media.
float facadeWin(float s, float h, float bay, float fl, float fw, float fh, float ps, float ph, out vec2 cell) {
  vec2 g = vec2(s / bay, h / fl);
  cell = floor(g);
  vec2 f = fract(g);
  float m = step(abs(f.x - 0.5), fw * 0.5) * step(abs(f.y - 0.55), fh * 0.5);
  return mix(fw * fh, m, smoothstep(1.3, 3.5, min(bay * fw / ps, fl * fh / ph)));
}
vec3 palOld(float id) {      // Citta' Vecchia: calce, ocra, rosa antico, pietra
  float r = fract(id * 0.137 + 0.11);
  return r < 0.25 ? vec3(0.66, 0.62, 0.55) : r < 0.45 ? vec3(0.62, 0.52, 0.38) : r < 0.6 ? vec3(0.60, 0.47, 0.42) : r < 0.8 ? vec3(0.56, 0.53, 0.48) : vec3(0.70, 0.67, 0.60);
}
vec3 palRes(float id) {      // Borgo: intonaci chiari, ocra, qualche rosso mattone
  float r = fract(id * 0.173 + 0.37);
  return r < 0.22 ? vec3(0.72, 0.63, 0.48) : r < 0.42 ? vec3(0.78, 0.75, 0.68) : r < 0.58 ? vec3(0.66, 0.60, 0.49) : r < 0.7 ? vec3(0.64, 0.42, 0.33) : r < 0.85 ? vec3(0.80, 0.78, 0.73) : vec3(0.70, 0.66, 0.56);
}

// --- una barca attraversa piano lo specchio d'acqua, da sinistra a destra ---
const float BOAT_EL = -0.0585;
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
  SUN_AZ = atan(uSun.x, uSun.y) / 4.0;           // uSun e' rispetto alla normale della vetrata
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


// facciate di notte: tutto scuro, con le finestre accese; il castello e le chiese illuminati dal basso, i muraglioni
// dai lampioni che hanno sopra. veil = il chiarore dell'aria della citta', che vela le cose lontane.
vec3 panoNight(vec4 P, float roof, float az, float el, vec3 veil, bool fine) {
  float c = P.x, phi = P.y, d = P.z, id = P.w;
  float h = hAt(el, d), cph = max(cos(phi), 0.3);
  float s = az * d / cph, ps = PIX * d / cph, ph = PIX * d / PK;
  vec3 dark = vec3(0.012, 0.011, 0.013), col = dark;
  vec3 warm = vec3(0.30, 0.175, 0.075);
  float stone = fine ? 0.85 + 0.15 * vnoise(vec2(s * 1.3, h * 2.0)) : 1.0;
  vec2 cell;
  if (isC(c, C_HILL)) col = vec3(0.007, 0.007, 0.009);
  else if (isC(c, C_QUAY)) col = dark + warm * 0.30 * (0.12 + 0.88 * exp(-max(roof - h, 0.0) / 2.5)) * stone;   // schiarito dall'alto, dai lampioni
  else if (isC(c, C_STONE)) col = dark + warm * 1.05 * (0.30 + 0.70 * exp(-max(h, 0.0) / 9.0)) * stone * (0.45 + 0.55 * cph * cph);   // il castello coi fari dal basso: piu' luce dove la pietra ci guarda
  else if (isC(c, C_CHURCH)) col = dark + warm * 0.5 * (0.35 + 0.65 * exp(-max(h - 4.0, 0.0) / 12.0)) * stone;
  else if (isC(c, C_STEEL)) col = vec3(0.015, 0.016, 0.021) + warm * (id < 2.0 ? 0.26 * exp(-max(h - 5.0, 0.0) / 3.5) : 0.05 * exp(-max(roof - h, 0.0) / 1.5));   // il Ponte Girevole: la travata illuminata da sotto
  else if (isC(c, C_IND) || isC(c, C_TANK) || isC(c, C_CHIMNEY)) col = dark * 1.4;
  else if (isC(c, C_GREEN)) col = vec3(0.006, 0.008, 0.007);
  else if (c > 4.5 && fine) {
    // case: finestre accese, calde o fredde, una su quattro circa (meno negli uffici e nei palazzoni)
    float bay = isC(c, C_OLD) ? 3.1 : 3.8, fl = isC(c, C_OLD) ? 3.2 : 3.3;
    float w = facadeWin(s, h, bay, fl, 0.4, 0.5, ps, ph, cell) * step(h, roof - 0.9);
    float r = h21(cell + id * 7.13);
    float lit = step(r, isC(c, C_TALL) ? 0.30 : 0.36);
    vec3 lc = h21(cell + id * 3.7 + 3.0) < 0.72 ? vec3(1.0, 0.62, 0.30) : vec3(0.70, 0.80, 1.0);
    col += lc * (0.28 + 0.42 * h21(cell + 7.7)) * w * lit;
    if (isC(c, C_PALAZZO)) col += warm * 0.22 * exp(-max(h - 10.0, 0.0) / 6.0);
    col += warm * 0.11 * exp(-max(h - 11.0, 0.0) / 6.0) * (1.0 - smoothstep(1500.0, 3800.0, d));   // i piani bassi sul lungomare, nella luce dei lampioni
  }
  return mix(col, veil, (1.0 - exp(-d / 9000.0)) * 0.6);
}

// luce del giorno su una facciata: il sole vero col sereno ("dal vivo"), altrimenti la luce piatta del cielo.
// nAz = dove guarda la facciata rispetto alla vetrata (0 = verso il fondo, la stessa direzione dello sguardo).
vec3 dayLight(float nAz, float facing) {
  float ca = cos(uSun.z), sAz = atan(uSun.x, uSun.y);
  float lam = max(ca * cos(nAz - sAz), 0.0);
  vec3 sun = vec3(0.52, 0.60, 0.78) * 0.5 + SUNCOL * lam * 0.78;     // al sole circa 0,85, in ombra 0,3: contrasto da giornata limpida
  return mix(vec3(0.72 + 0.2 * facing), sun, SUNK);
}
// facciate di giorno: pietra del castello e dei muraglioni, intonaci della Citta' Vecchia e del Borgo, i palazzoni a
// fasce di balconi, l'Ilva, i ponti. haze = il colore dell'aria verso l'orizzonte: vela secondo la distanza vera.
vec3 panoDay(vec4 P, float roof, float az, float el, vec3 haze, bool fine) {
  float c = P.x, phi = P.y, d = P.z, id = P.w;
  float h = hAt(el, d), cph = max(cos(phi), 0.3);
  float s = az * d / cph, ps = PIX * d / cph, ph = PIX * d / PK;
  float n = fine ? vnoise(vec2(s * 0.8, h * 1.3)) : 0.5;
  vec3 col = vec3(0.6);
  vec2 cell;
  float w = 0.0;
  if (isC(c, C_HILL)) {
    col = mix(vec3(0.16, 0.21, 0.15), vec3(0.31, 0.33, 0.26), vnoise(vec2(az * 240.0, el * 700.0)));
    if (fine) col *= 0.85 + 0.3 * vnoise(vec2(az * 1300.0, el * 2600.0));
  } else if (isC(c, C_GROUND)) col = vec3(0.42, 0.39, 0.33) * (0.9 + 0.2 * n);
  else if (isC(c, C_QUAY)) {
    col = SAND * 0.92 * (0.84 + 0.16 * (fine ? vnoise(vec2(s * 0.25, h * 1.6)) : 0.5));
    col = mix(col, col * vec3(0.55, 0.62, 0.52), 1.0 - smoothstep(0.3, 1.2, h));                  // la pietra bagnata sul pelo dell'acqua
    if (fine) col *= 1.0 - 0.12 * smoothstep(0.55, 0.85, vnoise(vec2(s * 0.6, h * 0.25)));     // colature
    if (fine) col *= 1.0 - 0.06 * step(fract(h / 0.9), 0.13) * smoothstep(1.3, 3.5, 0.12 / ph);    // i corsi dei conci
    col *= 1.0 + 0.08 * step(roof - 0.6, h);                                                       // la cimasa
  } else if (isC(c, C_STONE)) {
    col = SAND * (0.92 + 0.08 * n);
    if (fine) {
      col *= 1.0 - 0.05 * step(fract(h / 0.8), 0.14) * smoothstep(1.3, 3.5, 0.11 / ph);
      col *= 1.0 - 0.28 * (1.0 - smoothstep(0.0, 0.5, abs(h - (roof - 6.5))));                    // il cordone
      w = facadeWin(s, h, 9.0, 4.2, 0.12, 0.32, ps, ph, cell) * step(4.0, h) * step(h, roof - 2.0);
      col = mix(col, vec3(0.12, 0.10, 0.08), w * step(0.55, h21(cell + id)) * 0.85);               // feritoie e finestrelle
    }
  } else if (isC(c, C_CHURCH)) {
    col = vec3(0.66, 0.58, 0.46) * (0.92 + 0.08 * n);
  } else if (isC(c, C_IND)) {
    col = fract(id * 0.31) < 0.5 ? vec3(0.36, 0.35, 0.34) : vec3(0.42, 0.31, 0.23);
    if (fine) col *= 1.0 - 0.10 * step(0.5, fract(s / 1.4)) * smoothstep(1.3, 3.5, 0.7 / ps);       // lamiera grecata
  } else if (isC(c, C_CHIMNEY)) {
    col = vec3(0.55, 0.54, 0.52);
    float top = roof;                                                                               // bande rosse e bianche in cima
    if (top > 80.0 && h > top - 0.35 * top) col = fract(h / 7.0) < 0.5 ? vec3(0.62, 0.10, 0.07) : vec3(0.86, 0.85, 0.82);
  } else if (isC(c, C_STEEL)) {
    col = id > 250.0 ? vec3(0.58, 0.57, 0.54) : id > 150.0 ? vec3(0.48, 0.47, 0.45) : id > 30.0 ? vec3(0.45, 0.46, 0.48) : vec3(0.10, 0.12, 0.15);
  } else if (isC(c, C_GREEN)) col = vec3(0.10, 0.16, 0.08);
  else if (isC(c, C_DARK)) col = vec3(0.05);
  else if (isC(c, C_TANK)) col = vec3(0.74, 0.74, 0.72);
  else {
    // case: Citta' Vecchia, Borgo, palazzoni, il palazzo rosa
    bool old = isC(c, C_OLD), tall = isC(c, C_TALL), pink = isC(c, C_PALAZZO);
    col = (old ? palOld(id) : tall ? mix(vec3(0.78, 0.78, 0.75), vec3(0.70, 0.67, 0.60), fract(id * 0.29)) : pink ? vec3(0.62, 0.30, 0.25) : palRes(id)) * (0.93 + 0.07 * n);
    float fl = old ? 3.2 : 3.3, bay = old ? 3.1 : tall ? 3.4 : 3.8;
    if (fine) {
      if (tall) {                                                                                  // le fasce dei balconi
        float fy = fract(h / fl);
        col = mix(col * 0.6, col * 1.05, mix(0.25, step(fy, 0.25), smoothstep(1.3, 3.5, fl * 0.25 / ph)));
      } else col *= 1.0 - 0.07 * step(fract(h / fl), 0.1) * smoothstep(1.3, 3.5, fl * 0.1 / ph);   // i marcapiani
      w = facadeWin(s, h, bay, fl, old ? 0.34 : 0.42, old ? 0.48 : 0.55, ps, ph, cell) * step(h, roof - 1.0);
      float r = h21(cell + id * 1.31);
      vec3 pane = vec3(0.16, 0.17, 0.19);
      if (old || pink) pane = r < 0.22 ? vec3(0.20, 0.31, 0.22) : r < 0.34 ? vec3(0.36, 0.24, 0.16) : pane;   // persiane
      else pane = mix(pane, col * 0.82 + 0.05, r < 0.3 ? 0.9 : r < 0.55 ? 0.45 : 0.0);                       // tapparelle
      if (pink) col = mix(col, vec3(0.80, 0.75, 0.68), facadeWin(s, h, bay, fl, 0.56, 0.68, ps, ph, cell) * 0.6);   // cornici
      col = mix(col, pane, w * 0.85);
      col *= 1.0 + 0.07 * step(roof - 0.9, h);                                                    // il parapetto del terrazzo
    }
  }
  // luce e aria
  float nAz = az + PI - phi;
  col *= (isC(c, C_HILL) || isC(c, C_QUAY)) ? mix(dayLight(PI, 1.0), dayLight(nAz, cph), 0.45) : dayLight(nAz, cph);   // muraglioni e colline: il chiaroscuro piu' dolce (la costa e' fatta di tanti tratti)
  float hz = 1.0 - exp(-d / mix(30000.0, 8000.0, uCloud));          // col sereno l'aria e' limpida: la citta' a 1-2 km si vede netta
  return mix(col, haze, clamp(0.03 + hz, 0.0, 0.93));
}

// auto sulle strade lungo l'acqua e sui ponti (strade.png): due corsie, una per verso, ogni auto un po' sopra il
// parapetto. Di giorno piccole sagome colorate; di notte fari chiari davanti e luci rosse dietro. a = copertura.
vec3 cars(float az, float el, float t, float night, out float a) {
  a = 0.0;
  vec3 acc = vec3(0.0);
  float u = (az - PAZ0) / (PAZ1 - PAZ0);
  if (u <= 0.0 || u >= 1.0) return acc;
  for (int k = 0; k < 3; k++) {
    vec4 r = textureLod(uStrade, vec2(u, (float(k) + 1.5) / 8.0), 0.0);
    if (r.a < 0.002) continue;
    float d = exp(LDMIN + r.a * LDR);
    float y = (el - (PEL0 + r.b * (PEL1 - PEL0))) / PK * d;                      // metri sopra la strada
    float py = PIX * d / PK;
    if (y < 0.7 - py || y > 1.7 + py) continue;
    float s = (r.r * 65280.0 + r.g * 255.0) * 0.25;
    for (int l = 0; l < 2; l++) {
      float dirn = l == 0 ? 1.0 : -1.0;
      float x = s - dirn * t * 11.0 + float(k) * 37.0 + float(l) * 11.0;
      float slot = floor(x / 23.0), lx = fract(x / 23.0) * 23.0;
      if (h11(slot * 1.37 + float(l) * 7.1 + float(k) * 3.3) > 0.45) continue;
      float body = (1.0 - smoothstep(4.2, 4.4, lx)) * smoothstep(0.85 - py, 0.85, y) * (1.0 - smoothstep(1.5, 1.5 + py, y));
      float kind = h11(slot * 5.1 + float(l));
      vec3 paint = kind < 0.3 ? vec3(0.85, 0.86, 0.87) : kind < 0.5 ? vec3(0.62, 0.12, 0.09) : kind < 0.75 ? vec3(0.12, 0.14, 0.18) : vec3(0.45, 0.46, 0.47);
      float front = dirn > 0.0 ? lx : 4.3 - lx;                                 // 4.3 = il muso, 0 = la coda
      float lamp = (1.0 - smoothstep(0.0, 0.55 + py, abs(y - 1.0))) * body;
      vec3 lights = (vec3(1.0, 0.93, 0.78) * smoothstep(3.5, 4.2, front) * 1.6 + vec3(1.0, 0.08, 0.04) * (1.0 - smoothstep(0.1, 0.8, front)) * 0.9) * lamp;
      acc += mix(paint * body, lights, night);
      a = max(a, body * (1.0 - night * 0.6));
    }
  }
  return acc;
}

// le luci della notte: lampioni, porto, Ilva, luci rosse in cima a ciminiere e torri (quelle lampeggiano: le riconosce
// il rosso pieno, e il blu ne da' la fase). Un alone dalla mipmap, piu' largo quando il vetro e' bagnato.
vec3 nightLights(vec2 uv, float blur, float t) {
  vec3 l0 = textureLod(uLuci, uv, 0.0).rgb;
  vec3 l1 = textureLod(uLuci, uv, 2.2 + blur * 2.2).rgb;
  vec3 l2 = textureLod(uLuci, uv, 4.0 + blur * 1.5).rgb;
  float red = step(0.2, l0.r) * step(l0.g, 0.03);
  float ph = fract(t * 0.45 + l0.b * 3.1);
  float blink = smoothstep(0.0, 0.08, ph) * (1.0 - smoothstep(0.42, 0.52, ph));
  float flick = 0.92 + 0.08 * sin(t * 3.0 + uv.x * 900.0);
  return (l0 * 1.5 + l1 * 3.2 + l2 * 2.5) * mix(flick, blink * 1.6, red);
}

vec3 water(float az, float el, float blur, float t) {
  float dep = max(HOR - el, 0.0004);               // depressione sotto l'orizzonte
  vec2 wp = vec2(az / dep, 1.0 / dep);             // coordinate sul piano dell'acqua
  // il vento cambia le onde: con la calma poche increspature, larghe e lente; con il vento fitte, alte e svelte
  float tw = uWaveT, rf = wm(0.55, 1.0, 1.7), rh = wm(0.3, 1.0, 1.7);
  float big = fbm3(vec2(wp.x * 0.9 * rf, wp.y * 0.55 * rf - tw * 0.35));
  float rip = (big - 0.5) * rh;
  float wobA = wm(0.6, 1.0, 2.6), wobF = wm(0.6, 1.0, 2.2);    // quanto e quanto in fretta il riflesso trema di lato
  float gap = wm(0.8, 1.0, 0.8);
  float bLo = wm(0.0, 0.38, 0.52), bHi = wm(0.55, 0.75, 0.82), bF = wm(0.6, 1.0, 2.4);   // soglie e frequenza delle rotture
  float lenK = wm(1.5, 1.0, 0.6);                              // lunghezza dei riflessi: lunghi con la calma, corti con il vento
  float fres = 0.04 + 0.96 * pow(1.0 - smoothstep(0.0, 0.35, dep), 5.0);
  vec3 col = vec3(0.004, 0.007, 0.012);
  col += sky(az + rip * dep * 0.6, HOR + dep * 0.9 + rip * 0.01, t) * (0.35 + 0.5 * fres);
  // la riva specchiata: le luci si allungano in strisce tremolanti e spezzate, la pietra illuminata si rovescia
  float eb = shoreEl(az), below = eb - el;
  if (below > 0.0 && az > PAZ0 && az < PAZ1) {
    float wob = (vnoise(vec2(wp.y * 0.35 * wobF, tw * 1.3)) - 0.5) * dep * 0.07 * wobA;
    float brk = smoothstep(bLo, bHi, vnoise(vec2(az * 700.0, wp.y * 0.45 * bF - tw * 1.8)));
    vec2 us = puv(az + wob, eb + below * 0.16 / lenK);
    col += nightLights(us, blur + 0.6, t) * brk * 0.55 * exp(-below / (0.06 * lenK)) * gap;
    vec2 um = puv(az + wob, eb + below);
    if (inPano(um)) {
      float rr; vec4 q = pano(um, rr);
      if (q.x > 0.5) col = mix(col, panoNight(q, rr, az, eb + below, col, false), textureLod(uLuci, um, 0.0).a * 0.55 * (0.4 + 0.6 * brk) * exp(-below / 0.03));
    }
  }
  if (uMoon.w > 0.0) {                                           // la scia della Luna sull'acqua
    float mx = (az - uMoon.x) / ((0.012 + dep * 0.45) * wm(0.6, 1.0, 1.6));
    float glit = smoothstep(wm(0.0, 0.35, 0.55), wm(0.4, 0.8, 0.9), vnoise(vec2(wp.x * 2.0 * wm(0.7, 1.0, 2.2), wp.y * 0.6 * wm(0.7, 1.0, 1.9) - tw * 1.2)));
    col += vec3(0.55, 0.58, 0.62) * exp(-mx * mx) * glit * uMoon.z * (1.0 - smoothstep(0.15, 0.75, uCloud)) * 0.35 * wm(1.4, 1.0, 0.9) * exp(-dep / (0.25 * wm(1.4, 1.0, 0.8)));
  }
  return col;
}

vec3 outside(vec3 dir, float blur, float t) {
  float az = atan(dir.x, -dir.z);
  float el = asin(clamp(dir.y, -1.0, 1.0));
  vec3 col = el < HOR ? water(az, el, blur, t) + boatNight(az, el, blur, t) : sky(az, el, t);
  vec2 uv = puv(az, el);
  if (inPano(uv)) {
    float roof; vec4 P = pano(uv, roof);
    float cov = textureLod(uLuci, uv, blur * 1.5).a;
    if (P.x > 0.5) {
      vec3 veil = vec3(0.030, 0.024, 0.034) + vec3(0.075, 0.034, 0.05) * 0.6;
      col = mix(col, panoNight(P, roof, az, el, veil, true), cov);
      // sulle colline lontane, qualche luce sparsa: case, strade, paesi
      if (isC(P.x, C_HILL)) {
        vec2 gc = vec2(az / 0.004, el / 0.0016), gi = floor(gc), f = fract(gc) - 0.5 - (h22(gi + 31.0) - 0.5) * 0.6;
        float hs = h21(gi + 31.0);
        col += (hs < 0.03 ? COLD : SODIUM) * step(hs, 0.12) * exp(-dot(f, f) * 18.0) * 0.35 * cov;
      }
    }
    col += nightLights(uv, blur, t);
    float ca; vec3 cc = cars(az, el, t, 1.0, ca);
    col += cc;
  }
  // foschia sul pelo dell'acqua
  col += vec3(0.05, 0.04, 0.035) * exp(-abs(el - HOR) / 0.006) * 0.5;
  return col;
}


vec3 dayOutside(vec3 dir, float blur, float t) {
  float az = atan(dir.x, -dir.z);
  float el = asin(clamp(dir.y, -1.0, 1.0));
  vec3 col = vec3(0.0);
  sunSetup();
  vec3 haze = daySky(az, HOR + 0.02, t);
  if (el < HOR) {
    float dep = max(HOR - el, 0.0004);
    vec2 wp = vec2(az / dep, 1.0 / dep);
    // il vento cambia le onde (vedi water): calma = specchio liscio e chiaro; vento = increspature fitte, acqua piu' scura
    float tw = uWaveT, rf = wm(0.55, 1.0, 1.7), rh = wm(0.3, 1.0, 3.0);
    float big = fbm3(vec2(wp.x * 0.9 * rf, wp.y * 0.55 * rf - tw * 0.35));
    float rip = (big - 0.5) * rh;
    // con il sereno il Mar Grande e' blu: profondo sotto la finestra, sempre piu' specchio del cielo verso l'orizzonte
    // (Fresnel). Con il coperto (tema chiaro) clr e' zero e l'acqua resta quella grigio-azzurra di sempre.
    float clr = 1.0 - smoothstep(0.3, 0.9, uCloud);
    vec3 farW = mix(vec3(0.30, 0.38, 0.44), vec3(0.10, 0.22, 0.34), clr), nearW = mix(vec3(0.15, 0.22, 0.28), vec3(0.012, 0.065, 0.13), clr);
    col = mix(farW, nearW, smoothstep(0.0, 0.3, dep)) * wm(1.0, 1.0, 0.62) + rip * mix(0.07, 0.035, clr);
    float refl = 0.25 + 0.25 * (1.0 - uCloud) + wm(0.22, 0.0, -0.1);
    refl = mix(refl, mix(0.75, 0.12, smoothstep(0.0, 0.2, dep)) + wm(0.12, 0.0, -0.05), clr);   // al sereno: Fresnel, specchio solo verso l'orizzonte
    // le onde inclinano lo specchio: al sereno l'acqua riflette il cielo piu' alto, piu' blu, non solo il chiarore dell'orizzonte
    col = mix(col, daySky(az, HOR + mix(dep, dep * 2.5 + 0.06, clr), t), clamp(refl, 0.0, 1.0));
    // da vicino si vedono le increspature piccole sopra l'onda lunga
    col *= 1.0 + (vnoise(vec2(wp.x * 3.1, wp.y * 2.2 - tw * 1.1)) - 0.5) * 0.16 * smoothstep(0.04, 0.25, dep) * wm(0.5, 1.0, 1.3);
    // creste bianche, rade e piccole verso il largo: solo con vento forte
    float ws = clamp(uWind * 2.0 - 1.0, 0.0, 1.0);
    if (ws > 0.0) {
      float fine = vnoise(vec2(wp.x * 2.6, wp.y * 1.5 - tw * 0.9));
      float far = smoothstep(0.012, 0.05, dep) * (1.0 - 0.5 * smoothstep(0.1, 0.25, dep));
      float swell = vnoise(vec2(wp.x * 0.3, wp.y * 1.2 - tw * 0.6));
      col *= 1.0 - 0.22 * ws * (swell - 0.4) * far;
      col += vec3(0.07, 0.09, 0.10) * ws * smoothstep(0.50, 0.68, big) * far;
      col = mix(col, vec3(0.82, 0.87, 0.90), smoothstep(0.57, 0.70, big) * smoothstep(0.60, 0.80, fine) * far * 0.7 * ws);
    }
    // la riva specchiata, mossa dalle onde e sempre piu' sbiadita e rotta allontanandosi dalla base
    float eb = shoreEl(az), below = eb - el;
    if (below > 0.0 && az > PAZ0 && az < PAZ1) {
      vec2 um = puv(az + rip * dep * 0.05, eb + below + rip * 0.0015);
      if (inPano(um)) {
        float rr; vec4 q = pano(um, rr);
        float brk = 0.5 + 0.5 * smoothstep(0.3, 0.7, fbm3(vec2(wp.x * 2.3 * rf, wp.y * 1.4 * rf - tw * 0.5)));
        brk = mix(brk, 1.0, 0.6 * clamp(1.0 - uWind * 2.0, 0.0, 1.0));       // con la calma la riva si specchia quasi intera
        if (q.x > 0.5) col = mix(col, panoDay(q, rr, az, eb + below, col, false) * 0.8, textureLod(uLuci, um, 0.0).a * 0.42 * brk * exp(-below / 0.025));
      }
    }
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
  } else col = daySky(az, el, t);
  vec2 uv = puv(az, el);
  float land = 0.0;
  if (inPano(uv)) {
    float roof; vec4 P = pano(uv, roof);
    float cov = textureLod(uLuci, uv, blur * 1.5).a;
    if (P.x > 0.5) { col = mix(col, panoDay(P, roof, az, el, haze, true), cov); land = cov; }
    float ca; vec3 cc = cars(az, el, t, 0.0, ca);
    col = mix(col, mix(cc, haze, 0.25), ca);
  }
  // tre gabbiani planano piano sopra l'acqua, con le ali ad M; ogni tanto le battono
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float ph = fract(t * (0.0045 + 0.0015 * fi) + fi * 0.37);
    vec2 g0 = vec2(mix(-0.7, 0.7, ph), HOR + 0.010 + 0.009 * fi + 0.004 * sin(t * 0.21 + fi * 2.0));
    float s = 0.0065 - 0.0012 * fi;
    vec2 q = (vec2(az, el) - g0) / s;
    float ax = abs(q.x);
    if (ax < 1.0 && abs(q.y) < 1.0) {
      float flap = sin(t * 8.0 + fi * 3.0) * smoothstep(0.6, 0.8, sin(t * 0.45 + fi * 1.7));
      float wy = (1.0 + 0.8 * flap) * (0.6 * sqrt(ax) - 0.62 * ax);
      float a = (1.0 - smoothstep(0.5 * PIX, 1.5 * PIX, abs(q.y - wy) * s)) * (1.0 - smoothstep(0.85, 1.0, ax));
      col = mix(col, mix(vec3(0.30, 0.32, 0.35), vec3(0.88, 0.89, 0.88), land), a * 0.85);
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
  // il panorama vero di Taranto (tools/panorama.py): tre immagini di dati, non di colori. Si leggono senza
  // premoltiplicare l'alfa (che porta dati anche lui) e senza conversioni di colore; quella delle luci con le mipmap
  // (gli aloni), le altre "nearest" (classi e distanze non si possono mediare).
  const loader = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none", colorSpaceConversion: "none" });
  const dataTex = (name, smooth) => new Promise((resolve, reject) => loader.load(new URL("./taranto/" + name, import.meta.url).href, (img) => {
    const t = new THREE.Texture(img);
    t.flipY = false; t.premultiplyAlpha = false; t.colorSpace = THREE.NoColorSpace;
    t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
    t.minFilter = smooth ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
    t.generateMipmaps = smooth;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    resolve(t);
  }, undefined, reject));
  const empty = new THREE.DataTexture(new Uint8Array(4), 1, 1);
  empty.needsUpdate = true;
  const shared = { uPano: { value: empty }, uLuci: { value: empty }, uStrade: { value: empty }, uStars: { value: skyTex }, uStarAmt: { value: 0 }, uMoon: { value: new THREE.Vector4(0, 0, 0, 0) }, uMoonDir: { value: new THREE.Vector2(1, 0) }, uTime: { value: 0 }, uSize: { value: new THREE.Vector2(w, h) }, uRain: { value: 1 }, uDay: { value: 0 }, uCloud: { value: 0.66 }, uDusk: { value: 0 }, uWind: { value: 0.5 }, uWaveT: { value: 0 }, uSun: { value: new THREE.Vector4(0, 0, 0, 0) } };
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
  mesh.userData.ready = Promise.all([dataTex("pano.png", false), dataTex("luci.png", true), dataTex("strade.png", false)])
    .then(([p, l, st]) => { shared.uPano.value = p; shared.uLuci.value = l; shared.uStrade.value = st; });
  mesh.position.set((ROOM.win.x0 + ROOM.win.x1) / 2, (ROOM.win.y0 + ROOM.win.y1) / 2, ROOM.glassZ);
  mesh.name = "glass";
  return mesh;
}

// la direzione vera (gradi da nord) della normale della vetrata: dal Mar Grande quasi verso nord, con il canale un
// po' a destra (tools/panorama.py). Serve alla luce del sole sulle facciate; stelle e Luna la seguono in sky.js.
const CITY_BEARING = PANO.BEARING;
const C3 = (hex) => new THREE.Color(hex);
const NIGHT = { moon: C3(0x5f86d8), sky: C3(0x2c3466), ground: C3(0x0b0710), floor: C3(0x31261f), ceil: C3(0x1d2026) };
const DAY = { moon: C3(0xfff3e2), sky: C3(0xd5dee8), ground: C3(0x8f887b), floor: C3(0xd9d0c6), ceil: C3(0xc4c9cc) };
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

  // parquet di rovere a spina di pesce (textures.js). Le coordinate della texture sono in metri e ruotate di 45
  // gradi sulla geometria (non con texture.rotation, che sul piano 3,2 x 4,1 deformerebbe le doghe): la spina corre
  // verso la vetrata. Il colore del materiale fa da tinta: scuro di notte, quasi neutro di giorno (setSky).
  const parquet = parquetTextures();
  const floorMat = new THREE.MeshStandardMaterial({
    color: NIGHT.floor, map: parquet.map, bumpMap: parquet.relief, bumpScale: 0.9, roughnessMap: parquet.relief, roughness: 1,
  });
  const floorGeo = new THREE.PlaneGeometry(3.2, DEPTH), fp = floorGeo.attributes.position, fuv = floorGeo.attributes.uv;
  for (let i = 0; i < fuv.count; i++) {
    const x = fp.getX(i) / PARQUET.size, y = fp.getY(i) / PARQUET.size;
    fuv.setXY(i, (x - y) * Math.SQRT1_2, (x + y) * Math.SQRT1_2);
  }
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((left + right) / 2, 0, wallZ + DEPTH / 2);
  floor.receiveShadow = true;
  group.add(floor);
  // battiscopa scuro lungo le tre pareti: chiude il pavimento contro l'intonaco
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.55 });
  const skirt = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), skirtMat); m.position.set(x, 0.035, z); m.receiveShadow = true; group.add(m); };
  skirt(right - left, 0.014, (left + right) / 2, wallZ + 0.007);
  skirt(0.014, DEPTH, left + 0.007, wallZ + DEPTH / 2);
  skirt(0.014, DEPTH, right - 0.007, wallZ + DEPTH / 2);
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
  // l'icona del tempo, disegnata a parte e poi copiata: le nuvole "bucano" il sole o la luna che hanno dietro, con un
  // bordo vuoto che le stacca. Sole o luna (di notte) in ambra, nuvole nel colore del testo, gocce, fiocchi e fulmine.
  const icon = canvas(180, 180), icx = icon.getContext("2d");
  function drawIcon(kind, night, main, ink) {
    const x = icx;
    x.clearRect(0, 0, 180, 180);
    x.lineCap = x.lineJoin = "round";
    x.globalCompositeOperation = "source-over";
    const sun = (cx, cy, r) => {
      x.fillStyle = x.strokeStyle = main;
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
      x.lineWidth = 8;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
        x.beginPath(); x.moveTo(cx + c * r * 1.42, cy + s * r * 1.42); x.lineTo(cx + c * r * 1.85, cy + s * r * 1.85); x.stroke();
      }
    };
    const moon = (cx, cy, r) => {                                      // la falce: un disco a cui se ne toglie un altro
      x.fillStyle = main;
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
      x.globalCompositeOperation = "destination-out";
      x.beginPath(); x.arc(cx + r * 0.5, cy - r * 0.32, r * 0.84, 0, Math.PI * 2); x.fill();
      x.globalCompositeOperation = "source-over";
    };
    const lum = (cx, cy, r) => (night ? moon(cx, cy, r * 1.15) : sun(cx, cy, r));
    const cloudPath = (cx, cy, w) => {
      x.beginPath();
      const c = (ox, oy, r) => { x.moveTo(cx + ox + r, cy + oy); x.arc(cx + ox, cy + oy, r, 0, Math.PI * 2); };
      c(-w * 0.28, w * 0.04, w * 0.22); c(w * 0.04, -w * 0.1, w * 0.3); c(w * 0.32, w * 0.06, w * 0.2);
      x.rect(cx - w * 0.28, cy, w * 0.6, w * 0.26);
    };
    const cloud = (cx, cy, w, col) => {
      x.globalCompositeOperation = "destination-out";
      x.lineWidth = 14; cloudPath(cx, cy, w); x.stroke(); x.fill();
      x.globalCompositeOperation = "source-over";
      x.fillStyle = col; cloudPath(cx, cy, w); x.fill();
    };
    const drops = (cx, cy, n) => {
      x.strokeStyle = main; x.lineWidth = 8;
      for (let i = 0; i < n; i++) { const dx = cx + (i - (n - 1) / 2) * 24; x.beginPath(); x.moveTo(dx + 6, cy); x.lineTo(dx - 4, cy + 24); x.stroke(); }
    };
    const flakes = (cx, cy, n) => {
      x.strokeStyle = main; x.lineWidth = 5;
      for (let i = 0; i < n; i++) {
        const fx = cx + (i - (n - 1) / 2) * 30, fy = cy + 12 + (i % 2) * 8;
        for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3, c = Math.cos(a) * 11, s = Math.sin(a) * 11; x.beginPath(); x.moveTo(fx - c, fy - s); x.lineTo(fx + c, fy + s); x.stroke(); }
      }
    };
    const bolt = (cx, cy) => {
      x.fillStyle = "#FF5A3D";
      x.beginPath();
      [[6, -4], [-14, 24], [-1, 24], [-8, 48], [18, 14], [4, 14], [12, -4]].forEach(([px, py], i) => (i ? x.lineTo(cx + px, cy + py) : x.moveTo(cx + px, cy + py)));
      x.closePath(); x.fill();
    };
    const ghost = night ? "rgba(255, 233, 200, 0.5)" : "rgba(22, 34, 45, 0.45)";
    if (kind === "clear") lum(90, 90, 34);
    else if (kind === "fair") { lum(70, 66, 28); cloud(112, 116, 96, ink); }
    else if (kind === "partly") { lum(64, 60, 28); cloud(100, 104, 130, ink); }
    else if (kind === "cloudy") { cloud(66, 70, 92, ghost); cloud(102, 104, 130, ink); }
    else if (kind === "fog") {
      cloud(90, 66, 120, ghost);
      x.strokeStyle = ink; x.lineWidth = 8;
      [[34, 120, 146], [50, 138, 130], [28, 156, 150]].forEach(([x0, y, x1]) => { x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke(); });
    } else {
      cloud(90, 70, 130, ink);
      if (kind === "lightrain") drops(90, 118, 2);
      else if (kind === "rain") drops(90, 118, 3);
      else if (kind === "heavyrain") drops(90, 118, 4);
      else if (kind === "sleet") { drops(70, 118, 1); flakes(110, 112, 1); }
      else if (kind === "snow") flakes(90, 112, 3);
      else if (kind === "thunder") { drops(58, 118, 1); drops(126, 118, 1); bolt(92, 100); }
    }
  }
  function drawProjection() {
    const x = pjCtx, W = PJ.cw, H = PJ.ch;
    x.clearRect(0, 0, W, H);
    if (pjLines) {
      const N = pjNight;
      const amber = N ? "#FFB44A" : "#7A3E00", ink = N ? "#FFE9C8" : "#16222D", soft = N ? "rgba(255, 226, 186, 0.86)" : "rgba(22, 34, 45, 0.86)";
      const faint = N ? "rgba(255, 226, 186, 0.62)" : "rgba(22, 34, 45, 0.7)";
      const glow = (c, b) => { x.shadowColor = N ? c : "rgba(255, 255, 255, 0.75)"; x.shadowBlur = N ? b : 4; };
      const fit = (text, size, weight, max) => { let s = size + 4; do { s -= 4; x.font = `${weight} ${s}px ${FONT}`; } while (x.measureText(text).width > max && s > 26); };
      x.textBaseline = "alphabetic";
      x.lineCap = x.lineJoin = "round";
      // niente sfondo, neanche di giorno: le scritte stanno direttamente sul vetro (un vetro smerigliato chiaro
      // dietro, provato il 2026-11-23, a Luigi non piaceva). Gli angoli del riquadro, come in un mirino
      x.shadowBlur = 0;
      x.strokeStyle = N ? "rgba(255, 180, 74, 0.6)" : "rgba(122, 62, 0, 0.6)"; x.lineWidth = 4;
      x.beginPath();
      for (const [cx, cy, sx, sy] of [[36, 16, 1, 1], [W - 36, 16, -1, 1], [36, H - 12, 1, -1], [W - 36, H - 12, -1, -1]]) {
        x.moveTo(cx + sx * 30, cy); x.lineTo(cx, cy); x.lineTo(cx, cy + sy * 30);
      }
      x.stroke();
      // in alto: l'icona, la temperatura grande; a destra che tempo fa, il posto con l'ora, il vento e la fonte dei dati
      let left = 48;
      if (pjLines.icon) {
        drawIcon(pjLines.icon, N, amber, ink);
        glow("rgba(255, 160, 60, 0.8)", 18);
        x.drawImage(icon, 34, 24, 168, 168);
        left = 34 + 168 + 16;
      }
      if (pjLines.big) {
        fit(pjLines.big, 190, 800, 330);
        glow("rgba(255, 160, 60, 0.85)", 22);
        x.fillStyle = amber;
        x.fillText(pjLines.big, left, 184);
        left += x.measureText(pjLines.big).width + 34;
      }
      const max = W - left - 48;
      fit(pjLines.main, 80, 700, max);
      glow("rgba(255, 200, 130, 0.7)", 14);
      x.fillStyle = ink;
      x.fillText(pjLines.main, left, 86);
      fit(pjLines.sub, 50, 600, max);
      x.fillStyle = soft;
      x.fillText(pjLines.sub, left, 142);
      // la riga piccola: il vento (tre fili di vento e i metri al secondo) e la fonte; si stringe se non ci sta
      const credit = pjLines.credit || "", wind = pjLines.wind || "";
      let fs = 34, gw = 0;
      const width = () => { x.font = `500 ${fs}px ${FONT}`; gw = wind ? fs * 1.3 : 0; return gw + (wind ? x.measureText(wind + "   ·   ").width : 0) + x.measureText(credit).width; };
      while (width() > max && fs > 24) fs -= 2;
      let cx = left;
      x.fillStyle = faint;
      if (wind) {
        x.shadowBlur = 0;
        const gy = 190 - fs * 0.34, s = fs / 34;
        x.strokeStyle = faint; x.lineWidth = 3.5 * s;
        x.beginPath(); x.moveTo(cx, gy - 9 * s); x.lineTo(cx + 24 * s, gy - 9 * s); x.arc(cx + 24 * s, gy - 15 * s, 6 * s, Math.PI / 2, -Math.PI * 0.85, true); x.stroke();
        x.beginPath(); x.moveTo(cx + 4 * s, gy); x.lineTo(cx + 34 * s, gy); x.stroke();
        x.beginPath(); x.moveTo(cx, gy + 9 * s); x.lineTo(cx + 20 * s, gy + 9 * s); x.arc(cx + 20 * s, gy + 15 * s, 6 * s, -Math.PI / 2, Math.PI * 0.85, false); x.stroke();
        cx += gw;
        x.fillText(wind + (credit ? "   ·   " : ""), cx, 192);
        cx += x.measureText(wind + (credit ? "   ·   " : "")).width;
      }
      if (credit) x.fillText(credit, cx, 192);
      const hrs = pjLines.hours;
      if (hrs) {
        // in basso la curva: temperatura ora per ora (linea) e pioggia (barre a tacche, come lo spettro)
        const X0 = 100, X1 = W - 100, top = 276, bottom = 346, floor = 396;
        const px = (i) => X0 + ((X1 - X0) * i) / (hrs.length - 1);
        let lo = Math.min(...hrs.map((h) => h.temp)), hi = Math.max(...hrs.map((h) => h.temp));
        if (hi - lo < 4) { const m = (hi + lo) / 2; lo = m - 2; hi = m + 2; }
        const py = (t) => bottom - ((t - lo) / (hi - lo)) * (bottom - top);
        x.shadowBlur = 0;
        // la griglia: ogni tre ore un filo a puntini dalla curva alle barre della pioggia
        x.strokeStyle = N ? "rgba(255, 190, 120, 0.26)" : "rgba(22, 34, 45, 0.25)"; x.lineWidth = 2;
        x.setLineDash([2, 8]);
        for (let i = 0; i < hrs.length; i += 3) { x.beginPath(); x.moveTo(px(i), py(hrs[i].temp) + 14); x.lineTo(px(i), floor - 62); x.stroke(); }
        x.setLineDash([]);
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
        glow("rgba(255, 160, 60, 0.95)", 20);
        x.strokeStyle = amber; x.lineWidth = 7; path(); x.stroke();
        if (N) { x.shadowBlur = 0; x.strokeStyle = "#FFF0D8"; x.lineWidth = 2.5; path(); x.stroke(); }
        // ogni tre ore: il punto, i gradi sopra e l'ora sotto; l'ora attuale ha un anello in piu'
        x.textAlign = "center";
        for (let i = 0; i < hrs.length; i += 3) {
          const cx = px(i), cy = py(hrs[i].temp);
          glow("rgba(255, 160, 60, 0.9)", 12);
          x.fillStyle = N ? "#FFF0D8" : amber;
          x.beginPath(); x.arc(cx, cy, 7, 0, Math.PI * 2); x.fill();
          if (i === 0) { x.strokeStyle = amber; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, 15, 0, Math.PI * 2); x.stroke(); }
          x.font = `700 40px ${FONT}`;
          x.fillStyle = ink;
          x.fillText(Math.round(hrs[i].temp) + "°", cx, cy - 20);
          x.shadowBlur = 0;
          x.font = `600 38px ${FONT}`;
          x.fillStyle = soft;
          x.fillText(hrs[i].label, cx, 440);
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
    ready: glass.userData.ready,   // il panorama vero e' arrivato (le sue immagini si caricano a parte)
    poster,   // si clicca: apre il catalogo delle macchine sonore (main.js)
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
    // testo proiettato sul vetro: { big, main, sub, credit, icon (tipo di tempo), wind, hours: [{ temp, mm, label }] | null }; null lo spegne
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
      // Taranto dal Mar Grande, verso nord (CITY_BEARING): il sole si calcola li', qualunque sia il posto del visitatore.
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
