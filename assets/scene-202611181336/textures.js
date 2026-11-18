// Texture generate a runtime su canvas: niente immagini da scaricare.
import * as THREE from "three";

export const INK = "#1C2733", GRAF = "#2B3440", SILK = "#E9ECE6", RED = "#C8261B", AMB = "#F2A33A";
const FONT = '"Archivo Variable", Archivo, system-ui, sans-serif';

let maxAniso = 4;
export function setAnisotropy(n) { maxAniso = n; }

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

export function tex(c, { srgb = true, repeat = null, mips = true, mirror = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (repeat) {
    t.wrapS = t.wrapT = mirror ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  if (!mips) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; }
  return t;
}

// --- rumore ---------------------------------------------------------------
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeValueNoise(seed) {
  const r = rng(seed), N = 256, perm = new Uint8Array(N * 2), vals = new Float32Array(N);
  for (let i = 0; i < N; i++) { perm[i] = i; vals[i] = r(); }
  for (let i = N - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < N; i++) perm[i + N] = perm[i];
  const v = (x, y) => vals[perm[(x & 255) + perm[y & 255]]];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
}

export function fbmField(seed, octaves = 4) {
  const n = makeValueNoise(seed);
  return (x, y) => {
    let s = 0, a = 0.5, f = 1;
    for (let i = 0; i < octaves; i++) { s += a * n(x * f, y * f); f *= 2.03; a *= 0.5; }
    return s;
  };
}

// --- legno del banco ------------------------------------------------------
// Venature disegnate a tratti (veloce) + grana fine per pixel + segni d'uso.
export function woodTextures(seed = 7) {
  const W = 1024, H = 512, r = rng(seed), n = fbmField(seed + 1, 3);
  const c = canvas(W, H), g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#241c18"); grad.addColorStop(0.5, "#2b221d"); grad.addColorStop(1, "#211a16");
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  // tavole: tre doghe con tono leggermente diverso
  const planks = [0, 170, 345, 512];
  for (let i = 0; i < 3; i++) {
    g.fillStyle = `rgba(${i === 1 ? "90,60,35" : "30,18,10"},${0.08 + r() * 0.08})`;
    g.fillRect(0, planks[i], W, planks[i + 1] - planks[i]);
  }
  // venature
  for (let i = 0; i < 520; i++) {
    const y0 = r() * H, amp = 2 + r() * 10, freq = 0.002 + r() * 0.006, ph = r() * 6.28;
    const dark = r() < 0.7;
    g.strokeStyle = dark ? `rgba(20,11,5,${0.05 + r() * 0.16})` : `rgba(120,82,48,${0.04 + r() * 0.1})`;
    g.lineWidth = 0.6 + r() * 2.2;
    g.beginPath();
    for (let x = -10; x <= W + 10; x += 8) {
      const y = y0 + Math.sin(x * freq + ph) * amp + (n(x * 0.004, y0 * 0.02) - 0.5) * 26;
      x < 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  // nodi
  for (let k = 0; k < 3; k++) {
    const kx = 120 + r() * (W - 240), ky = 40 + r() * (H - 80);
    for (let j = 0; j < 14; j++) {
      g.strokeStyle = `rgba(22,12,6,${0.18 - j * 0.01})`;
      g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(kx, ky, 4 + j * 5, 2 + j * 1.6, 0, 0, Math.PI * 2); g.stroke();
    }
  }
  // giunti tra le doghe
  g.fillStyle = "rgba(10,6,3,.55)";
  for (const y of planks.slice(1, -1)) g.fillRect(0, y - 1, W, 2);
  // grana fine
  const img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const k = (r() - 0.5) * 10;
    d[i] += k; d[i + 1] += k * 0.8; d[i + 2] += k * 0.6;
  }
  g.putImageData(img, 0, 0);

  // rugosità: base satinata, zone più lucide consumate davanti, graffi e un alone di tazza
  const rc = canvas(512, 256), rg = rc.getContext("2d");
  rg.fillStyle = "rgb(150,150,150)"; rg.fillRect(0, 0, 512, 256);
  const wear = rg.createLinearGradient(0, 0, 0, 256);
  wear.addColorStop(0, "rgba(255,255,255,0)"); wear.addColorStop(0.7, "rgba(60,60,60,.0)"); wear.addColorStop(1, "rgba(70,70,70,.45)");
  rg.fillStyle = wear; rg.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 90; i++) {
    rg.strokeStyle = `rgba(${r() < 0.5 ? "230,230,230" : "80,80,80"},${0.15 + r() * 0.3})`;
    rg.lineWidth = 0.5 + r();
    const x = r() * 512, y = r() * 256, a = (r() - 0.5) * 0.6, l = 10 + r() * 60;
    rg.beginPath(); rg.moveTo(x, y); rg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); rg.stroke();
  }
  rg.strokeStyle = "rgba(210,210,210,.35)"; rg.lineWidth = 3;
  rg.beginPath(); rg.arc(300, 150, 18, 0.3, 5.6); rg.stroke();
  return { map: tex(c), roughnessMap: tex(rc, { srgb: false }) };
}

// --- intonaco scuro -------------------------------------------------------
export function plasterTextures(seed = 3) {
  const S = 512, c = canvas(S, S), g = c.getContext("2d"), n = fbmField(seed, 5), r = rng(seed);
  const img = g.createImageData(S, S), d = img.data;
  const bump = canvas(S, S), bg = bump.getContext("2d"), bimg = bg.createImageData(S, S), bd = bimg.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // ripetuta a specchio (MirroredRepeat): niente cuciture visibili
    const big = n(x / 64, y / 64);
    const fine = r();
    const val = big * 0.8 + fine * 0.2;
    const i = (y * S + x) * 4;
    const k = 0.82 + val * 0.36;
    d[i] = 38 * k; d[i + 1] = 42 * k; d[i + 2] = 48 * k; d[i + 3] = 255;
    const b = 90 + val * 120 + (fine - 0.5) * 50;
    bd[i] = bd[i + 1] = bd[i + 2] = b; bd[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); bg.putImageData(bimg, 0, 0);
  return { map: tex(c, { repeat: [4, 3], mirror: true }), bumpMap: tex(bump, { srgb: false, repeat: [4, 3], mirror: true }) };
}

// --- poster "ICHOS — Suoni a margine" -------------------------------------
export function posterTexture(ui) {
  const W = 768, H = 1088, c = canvas(W, H), g = c.getContext("2d"), r = rng(21);
  g.fillStyle = "#E6E1D3"; g.fillRect(0, 0, W, H);
  // carta: leggere macchie
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(90,70,40,${r() * 0.035})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 3);
  }
  const M = 34; // margine di carta
  // onde concentriche: il suono che si allarga "a margine" (solo nella parte alta)
  g.save();
  g.beginPath(); g.rect(250 + M, M, W - 250 - M * 2, H - 330); g.clip();
  g.translate(W * 0.70, H * 0.40);
  for (let i = 0; i < 24; i++) {
    g.strokeStyle = i % 5 === 0 ? RED : INK;
    g.globalAlpha = i % 5 === 0 ? 0.95 : 0.5 - i * 0.012;
    g.lineWidth = i % 5 === 0 ? 5 : 2;
    g.beginPath();
    const rad = 26 + i * 19;
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.03) {
      const wob = Math.sin(a * 6 + i * 0.7) * (i * 0.5);
      const px = Math.cos(a) * (rad + wob), py = Math.sin(a) * (rad + wob) * 0.92;
      a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.stroke();
  }
  g.restore();
  g.globalAlpha = 1;
  // fascia scura con il titolo, dentro il margine di carta
  g.fillStyle = INK; g.fillRect(M, M, 230, H - M * 2);
  g.save();
  g.translate(M + 182, H - M - 40); g.rotate(-Math.PI / 2);
  g.fillStyle = "#F1F2EE";
  g.font = `800 196px ${FONT}`;
  try { g.fontStretch = "expanded"; } catch (e) { /* non supportato */ }
  g.fillText(ui.poster_title, 0, 0);
  g.restore();
  g.fillStyle = RED; g.beginPath(); g.arc(M + 115, M + 60, 20, 0, Math.PI * 2); g.fill();
  // testi a destra
  const X = 300;
  g.fillStyle = "#E6E1D3"; g.fillRect(X - 10, M + 70, 330, 170);
  g.fillStyle = INK;
  try { g.fontStretch = "normal"; } catch (e) { /* */ }
  g.font = `800 58px ${FONT}`;
  g.fillText(ui.poster_sub.split(" ")[0], X, 150);
  g.fillText(ui.poster_sub.split(" ").slice(1).join(" "), X, 214);
  g.fillStyle = RED; g.fillRect(X, 238, 120, 8);
  g.fillStyle = INK; g.fillRect(X, H - 300, W - X - M - 10, 3);
  g.font = `600 30px ${FONT}`;
  const ls = ui.poster_lines;
  g.fillText(ls[0], X, H - 240); g.fillText(ls[1], X, H - 202);
  g.font = `800 44px ${FONT}`;
  g.fillText(ls[2], X, H - 126);
  g.font = `600 34px ${FONT}`;
  g.fillText(ls[3], X, H - 82);
  return tex(c);
}

// --- texture per piccoli oggetti ------------------------------------------
export function noiseRoughness(seed = 5, base = 140, spread = 50) {
  const S = 128, c = canvas(S, S), g = c.getContext("2d"), r = rng(seed);
  const img = g.createImageData(S, S), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = base + (r() - 0.5) * spread; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return tex(c, { srgb: false, repeat: [2, 2] });
}

export { FONT };

// --- schermo del monitor: codice che si scrive da solo ----------------------
const CODE_FILES = [
  {
    name: "sequencer.js",
    lang: "js",
    text: `// sequencer.js — scheduler a 8 step per Ichosynth Mini
const NOTE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];

export function creaSequencer(ctx, uscita) {
  const stato = { passo: 0, prossimo: 0, bpm: 104, attivi: new Set([0, 3, 5]) };

  // programma le note un po' in anticipo: il tempo resta preciso
  function pianifica() {
    const durata = 60 / stato.bpm / 2;
    while (stato.prossimo < ctx.currentTime + 0.12) {
      if (stato.attivi.has(stato.passo)) suona(NOTE[stato.passo], stato.prossimo);
      stato.prossimo += durata;
      stato.passo = (stato.passo + 1) % 8;
    }
  }

  function suona(freq, t) {
    const osc = ctx.createOscillator();
    const filtro = ctx.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    filtro.frequency.setValueAtTime(2600, t);
    filtro.frequency.exponentialRampToValueAtTime(380, t + 0.3);
    osc.connect(filtro).connect(uscita);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  return { stato, avvia: () => setInterval(pianifica, 25) };
}
`,
  },
  {
    name: "alloggi.py",
    lang: "py",
    text: `# alloggi.py — scadenze dei contratti degli alloggi aziendali
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass
class Contratto:
    alloggio: str
    inquilino: str
    fine: date
    firmato: bool = False


def in_scadenza(contratti, giorni=30):
    """Contratti che scadono entro \`giorni\`, i piu' vicini per primi."""
    oggi = date.today()
    limite = oggi + timedelta(days=giorni)
    vicini = [c for c in contratti if oggi <= c.fine <= limite]
    return sorted(vicini, key=lambda c: c.fine)


def promemoria(contratti):
    # una riga per contratto, pronta per la mail del lunedi'
    for c in in_scadenza(contratti):
        stato = "firmato" if c.firmato else "da firmare"
        yield f"{c.alloggio}: {c.inquilino}, scade il {c.fine:%d/%m} ({stato})"
`,
  },
  {
    name: "preventivo.ts",
    lang: "js",
    text: `// preventivo.ts — prezzo fisso, concordato prima di iniziare
type Voce = { descrizione: string; giorni: number };

const TARIFFA_GIORNO = 0; // la tariffa e' quella della proposta firmata

export function totale(voci: Voce[]): number {
  // niente sorprese: si somma solo quello che e' scritto
  return voci.reduce((somma, v) => somma + v.giorni * TARIFFA_GIORNO, 0);
}

export const fasi: Voce[] = [
  { descrizione: "Chiamata conoscitiva", giorni: 0 },
  { descrizione: "Proposta a prezzo fisso", giorni: 1 },
  { descrizione: "Sviluppo con anteprime", giorni: 12 },
  { descrizione: "Consegna e formazione", giorni: 2 },
];
`,
  },
];
const KW = {
  js: new Set("const let var function return export import from type new while for if else of in true false null undefined async await class extends".split(" ")),
  py: new Set("from import def return for in if else class yield lambda True False None and or not with as while".split(" ")),
};
const C_BG = "#0d1218", C_TXT = "#cfd8dc", C_KW = "#f2a33a", C_STR = "#9ccf8a", C_COM = "#6b7a86", C_NUM = "#ff8a73", C_FN = "#8fc2ff";

function tokenize(line, lang) {
  const out = [];
  const com = lang === "py" ? "#" : "//";
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    if (rest.startsWith(com)) { out.push([rest, C_COM]); break; }
    const ch = line[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== ch) j++;
      out.push([line.slice(i, j + 1), C_STR]); i = j + 1; continue;
    }
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (m) {
      const w = m[0];
      const isFn = line[i + w.length] === "(";
      out.push([w, KW[lang].has(w) ? C_KW : isFn ? C_FN : C_TXT]); i += w.length; continue;
    }
    const n = /^\d+(\.\d+)?/.exec(rest);
    if (n) { out.push([n[0], C_NUM]); i += n[0].length; continue; }
    out.push([ch, C_TXT]); i++;
  }
  return out;
}

// Si disegna in coordinate logiche 1536x960 e si scala sul canvas reale (piu' piccolo:
// caricare la texture sulla GPU costa, quindi canvas 1280x800 e al massimo 12 aggiornamenti al secondo).
const LW = 1536, LH = 960;
export class CodeScreen {
  // chat: { title, q, a: [righe] } da content.py: l'assistente AI nel riquadro di destra
  constructor(w = 1280, h = 800, chat = null) {
    this.chat = chat; this.chatT = 0; this.chatKey = "";
    this.c = canvas(w, h);
    this.g = this.c.getContext("2d");
    this.k = w / LW;
    this.texture = tex(this.c, { mips: false });
    this.file = 0; this.pos = Math.floor(CODE_FILES[0].text.length * 0.55); this.wait = 0.6; this.acc = 0; this.blink = 0; this.dirty = true;
    this.lineH = 34; this.top = 92; this.left = 96;
    this.rows = Math.floor((LH - this.top - 56) / this.lineH);
    this.draw();
  }
  // quanti caratteri di domanda e risposta sono gia' "scritti" (ciclo di 16 secondi)
  chatProgress() {
    if (!this.chat) return [0, 0];
    const t = this.chatT % 16;
    const q = Math.floor(Math.max(0, Math.min(1, (t - 1) / 1.6)) * this.chat.q.length);
    const total = this.chat.a.reduce((n, line) => n + line.length + 1, 0);
    const a = Math.floor(Math.max(0, Math.min(1, (t - 3.6) / 4.5)) * total);
    return [q, a];
  }
  drawChat(g, x, y, w, h) {
    const [qn, an] = this.chatProgress();
    g.fillStyle = "#0F1A26"; g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(157,176,191,.25)"; g.fillRect(x, y, 2, h);
    g.fillStyle = "#FFB44A"; g.beginPath(); g.arc(x + 42, y + 46, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#EEF1EC"; g.font = `700 30px ${FONT}`; g.fillText(this.chat.title, x + 64, y + 56);
    let yy = y + 104;
    if (qn) {
      g.font = `500 26px ${FONT}`;
      const lines = wrap(g, this.chat.q.slice(0, qn), w - 130);
      const bh = lines.length * 36 + 26;
      g.fillStyle = "rgba(255,180,74,.14)"; g.fillRect(x + 62, yy, w - 92, bh);
      g.fillStyle = "#FFD9A3"; lines.forEach((l, i) => g.fillText(l, x + 80, yy + 38 + i * 36));
      yy += bh;
    }
    yy += 58;
    let left = an;
    g.font = `500 25px ${FONT}`;
    this.chat.a.forEach((line, i) => {
      if (left <= 0) return;
      g.fillStyle = i === 0 ? "#EEF1EC" : i === this.chat.a.length - 1 ? "#9DB0BF" : "#C9D4DC";
      g.fillText(line.slice(0, left), x + 42, yy);
      left -= line.length + 1; yy += i === 0 ? 50 : 40;
    });
  }
  update(dt) {
    this.blink += dt;
    this.chatT += dt;
    const key = this.chatProgress().join(",");
    if (key !== this.chatKey) { this.chatKey = key; this.dirty = true; }
    const f = CODE_FILES[this.file];
    if (this.wait > 0) { this.wait -= dt; }
    else if (this.pos < f.text.length) {
      this.acc += dt * 32;
      while (this.acc >= 1 && this.pos < f.text.length) {
        this.acc -= 1;
        const ch = f.text[this.pos++];
        if (ch === "\n") { this.wait = 0.08 + Math.random() * 0.25; this.acc = 0; break; }
      }
      this.dirty = true;
    } else {
      this.wait = 3.5; this.file = (this.file + 1) % CODE_FILES.length; this.pos = 0;
    }
    this.frameAcc = (this.frameAcc || 0) + dt;
    if (this.frameAcc > 1 / 12 && (this.dirty || Math.floor(this.blink * 2) !== this.lastBlink)) {
      this.frameAcc = 0; this.draw(); this.dirty = false;
    }
  }
  draw() {
    const { g } = this;
    const W = LW, H = LH, f = CODE_FILES[this.file];
    g.setTransform(this.k, 0, 0, this.k, 0, 0);
    g.fillStyle = C_BG; g.fillRect(0, 0, W, H);
    // barra delle schede
    g.fillStyle = "#151c24"; g.fillRect(0, 0, W, 56);
    g.font = `500 22px ui-monospace, "Cascadia Mono", Consolas, monospace`;
    let x = 0;
    CODE_FILES.forEach((cf, i) => {
      const w = g.measureText(cf.name).width + 56;
      if (i === this.file) { g.fillStyle = C_BG; g.fillRect(x, 0, w, 56); g.fillStyle = AMB; g.fillRect(x, 52, w, 4); }
      g.fillStyle = i === this.file ? "#e8eef0" : "#7c8a96";
      g.fillText(cf.name, x + 28, 36);
      x += w;
    });
    const typed = f.text.slice(0, this.pos);
    const lines = typed.split("\n");
    const first = Math.max(0, lines.length - this.rows);
    g.font = `400 21px ui-monospace, "Cascadia Mono", Consolas, monospace`;
    const cw = g.measureText("M").width;
    for (let r = first; r < lines.length; r++) {
      const y = this.top + (r - first) * this.lineH + 24;
      g.fillStyle = "#3d4955"; g.textAlign = "right";
      g.fillText(String(r + 1), this.left - 26, y);
      g.textAlign = "left";
      let cx = this.left;
      for (const [txt, col] of tokenize(lines[r], f.lang)) { g.fillStyle = col; g.fillText(txt, cx, y); cx += txt.length * cw; }
      if (r === lines.length - 1) {
        this.lastBlink = Math.floor(this.blink * 2);
        if (this.lastBlink % 2 === 0 || this.wait <= 0) { g.fillStyle = "#e8eef0"; g.fillRect(cx + 2, y - 22, cw * 0.9, 28); }
      }
    }
    if (this.chat) this.drawChat(g, 968, 56, W - 968, H - 96);
    // barra di stato
    g.fillStyle = "#1c2733"; g.fillRect(0, H - 40, W, 40);
    g.fillStyle = "#aeb6bb"; g.font = `500 20px ui-monospace, Consolas, monospace`;
    g.fillText(`${f.name}  ·  ${lines.length}:${(lines[lines.length - 1] || "").length + 1}  ·  UTF-8`, 24, H - 13);
    g.fillStyle = RED; g.beginPath(); g.arc(W - 30, H - 20, 7, 0, Math.PI * 2); g.fill();
    this.texture.needsUpdate = true;
  }
}

// --- bloc-notes giallo a righe, scritto a mano -----------------------------
function wrap(g, text, maxW) {
  const words = text.split(" "), lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function tabletTexture(about) {
  const W = 768, H = 1088, c = canvas(W, H), g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0B1826"); bg.addColorStop(1, "#07101A");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // griglia tecnica
  g.strokeStyle = "rgba(255,180,74,0.07)"; g.lineWidth = 1;
  for (let x = 0; x <= W; x += 32) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); g.stroke(); }
  for (let y = 0; y <= H; y += 32) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke(); }
  // barra in alto
  g.fillStyle = "rgba(255,180,74,0.08)"; g.fillRect(0, 0, W, 72);
  g.fillStyle = "#FFB44A"; g.font = `700 24px ${FONT}`;
  g.fillText("Luigi Massari", 40, 47);
  g.textAlign = "right"; g.fillStyle = "#9DB0BF"; g.font = `500 22px ${FONT}`; g.fillText("Taranto", W - 40, 47); g.textAlign = "left";
  g.fillStyle = "#FFB44A"; g.fillRect(0, 72, W, 2);
  // titolo
  g.fillStyle = "#FFFFFF"; g.font = `800 58px ${FONT}`;
  try { g.fontStretch = "expanded"; } catch (e) { /* */ }
  g.fillText(about.notepad_h, 40, 170);
  try { g.fontStretch = "normal"; } catch (e) { /* */ }
  g.fillStyle = "#FF5A3D"; g.fillRect(40, 192, 96, 4);
  // elenco dei lavori in corso, come un pannello di stato
  const colors = ["#FFB44A", "#FFB44A", "#9DB0BF", "#FF5A3D", "#FFB44A", "#9DB0BF"];
  let y = 270;
  about.notepad.forEach((item, i) => {
    const [name, state] = item.split(" — ");
    g.fillStyle = "rgba(255,255,255,0.03)"; g.fillRect(40, y - 44, W - 80, 104);
    g.strokeStyle = "rgba(150,180,210,0.18)"; g.strokeRect(40.5, y - 43.5, W - 81, 103);
    g.fillStyle = colors[i % colors.length];
    g.shadowColor = colors[i % colors.length]; g.shadowBlur = 14;
    g.beginPath(); g.arc(76, y + 8, 9, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    g.fillStyle = "#E6EBF0"; g.font = `700 34px ${FONT}`;
    g.fillText(name, 108, y + 2);
    if (state) { g.fillStyle = "#9DB0BF"; g.font = `500 24px ${FONT}`; g.fillText(state.charAt(0).toUpperCase() + state.slice(1), 108, y + 40); }
    y += 124;
  });
  // traccia in basso
  g.strokeStyle = "#FFB44A"; g.lineWidth = 2.5; g.shadowColor = "#FFB44A"; g.shadowBlur = 10;
  g.beginPath();
  for (let x = 40; x <= W - 40; x += 4) {
    const t = (x - 40) / (W - 80);
    const yy = H - 70 + Math.sin(t * Math.PI * 9) * 18 * Math.sin(t * Math.PI) + Math.sin(t * 61) * 3;
    x === 40 ? g.moveTo(x, yy) : g.lineTo(x, yy);
  }
  g.stroke(); g.shadowBlur = 0;
  return tex(c);
}

// --- frontali dei synth: stesso SVG di build.py (panel_svg) ------------------
// I <text> si tolgono dall'SVG e si ridisegnano su canvas con Archivo, perche' un SVG
// usato come immagine non puo' caricare i font della pagina.
const STRETCH = (v) => {
  const n = parseFloat(v) || 100;
  if (n <= 80) return "condensed";
  if (n <= 92) return "semi-condensed";
  if (n <= 106) return "normal";
  if (n <= 116) return "semi-expanded";
  return "expanded";
};
export async function panelTextures(svgText, scale = 2) {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.documentElement;
  const texts = [...svg.querySelectorAll("text")].map((t) => {
    const o = {
      x: +t.getAttribute("x"), y: +t.getAttribute("y"), text: t.textContent,
      size: +t.getAttribute("font-size"), weight: t.getAttribute("font-weight") || 400,
      stretch: t.getAttribute("font-stretch"), anchor: t.getAttribute("text-anchor") || "start",
      fill: t.getAttribute("fill"), op: +(t.getAttribute("fill-opacity") || 1),
      mono: (t.getAttribute("font-family") || "").includes("mono"),
    };
    t.remove();
    return o;
  });
  const vb = svg.getAttribute("viewBox").split(/\s+/).map(Number);
  const W = vb[2] * scale, H = vb[3] * scale;
  svg.setAttribute("width", W); svg.setAttribute("height", H);
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  await img.decode();
  URL.revokeObjectURL(url);
  const c = canvas(W, H), g = c.getContext("2d");
  g.fillStyle = GRAF; g.fillRect(0, 0, W, H);
  g.drawImage(img, 0, 0, W, H);
  for (const t of texts) {
    g.save();
    g.globalAlpha = t.op;
    g.fillStyle = t.fill;
    g.font = t.mono ? `${t.size * scale}px ui-monospace, Consolas, monospace` : `${t.weight} ${t.size * scale}px ${FONT}`;
    try { g.fontStretch = t.mono ? "normal" : STRETCH(t.stretch); } catch (e) { /* */ }
    g.textAlign = t.anchor === "middle" ? "center" : t.anchor === "end" ? "right" : "left";
    g.fillText(t.text, t.x * scale, t.y * scale);
    g.restore();
  }
  return { canvas: c, map: tex(c), scale };
}

// emissivo: solo i display del frontale
export function panelEmissive(panelCanvas, meta, scale) {
  const c = canvas(panelCanvas.width / 2, panelCanvas.height / 2), g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
  const k = 0.5;
  for (const m of meta) {
    if (m.kind !== "screen") continue;
    g.drawImage(panelCanvas, m.x * scale, m.y * scale, m.w * scale, m.h * scale, m.x * scale * k, m.y * scale * k, m.w * scale * k, m.h * scale * k);
  }
  return tex(c);
}

// --- registratore a cassette: piastra superiore ----------------------------
export function recorderTopTexture(label) {
  const W = 1024, H = 720, c = canvas(W, H), g = c.getContext("2d"), r = rng(77);
  // alluminio spazzolato
  g.fillStyle = "#9da3a6"; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.07})`; g.fillRect(0, y, W, 1); }
  // finestra della cassetta
  const wx = 70, wy = 70, ww = 600, wh = 400;
  g.fillStyle = "#15181b"; roundRect(g, wx - 10, wy - 10, ww + 20, wh + 20, 18); g.fill();
  // cassetta
  g.fillStyle = "#2a2d31"; roundRect(g, wx, wy, ww, wh, 10); g.fill();
  g.fillStyle = "#EDE6CF"; roundRect(g, wx + 30, wy + 26, ww - 60, wh - 150, 6); g.fill();
  g.fillStyle = RED; g.fillRect(wx + 30, wy + 26, ww - 60, 22);
  g.fillStyle = "#1C2733"; g.font = `800 46px ${FONT}`; g.textAlign = "center";
  g.fillText(label, wx + ww / 2, wy + 112);
  g.font = `500 26px ui-monospace, Consolas, monospace`; g.fillText("A  ·  60 MIN", wx + ww / 2, wy + 150);
  // finestrella del nastro
  g.fillStyle = "#0b0c0e"; roundRect(g, wx + 150, wy + 172, ww - 300, 70, 30); g.fill();
  g.fillStyle = "#4a2f20"; g.fillRect(wx + 190, wy + 190, ww - 380, 34);
  g.textAlign = "left";
  // VU meter
  for (let i = 0; i < 2; i++) {
    const vx = 720, vy = 80 + i * 200, vw = 240, vh = 160;
    g.fillStyle = "#15181b"; roundRect(g, vx - 8, vy - 8, vw + 16, vh + 16, 10); g.fill();
    g.fillStyle = "#F2C46A"; roundRect(g, vx, vy, vw, vh, 6); g.fill();
    g.strokeStyle = "#2a1d0e"; g.lineWidth = 3;
    g.beginPath(); g.arc(vx + vw / 2, vy + vh + 40, 150, -Math.PI * 0.78, -Math.PI * 0.22); g.stroke();
    g.strokeStyle = RED; g.lineWidth = 6;
    g.beginPath(); g.arc(vx + vw / 2, vy + vh + 40, 150, -Math.PI * 0.36, -Math.PI * 0.22); g.stroke();
    for (let k = 0; k <= 8; k++) {
      const a = -Math.PI * 0.78 + k * (Math.PI * 0.56 / 8);
      g.strokeStyle = "#2a1d0e"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(vx + vw / 2 + Math.cos(a) * 150, vy + vh + 40 + Math.sin(a) * 150);
      g.lineTo(vx + vw / 2 + Math.cos(a) * 166, vy + vh + 40 + Math.sin(a) * 166); g.stroke();
    }
    g.fillStyle = "#2a1d0e"; g.font = `700 20px ${FONT}`; g.fillText(i ? "R" : "L", vx + 12, vy + vh - 14);
    g.fillText("VU", vx + vw - 44, vy + vh - 14);
  }
  // serigrafie dei tasti (senza marchi)
  g.fillStyle = "#1C2733"; g.font = `600 24px ${FONT}`;
  try { g.fontStretch = "condensed"; } catch (e) { /* */ }
  ["Rec", "Play", "Rew", "FF", "Stop", "Pause"].forEach((s, i) => g.fillText(s, 88 + i * 150, 640));
  g.fillStyle = RED; g.beginPath(); g.arc(70, 632, 8, 0, Math.PI * 2); g.fill();
  return tex(c);
}

export function grilleTexture() {
  const W = 512, H = 128, c = canvas(W, H), g = c.getContext("2d");
  g.fillStyle = "#26292d"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#0a0b0c";
  for (let y = 12; y < H; y += 14) for (let x = 12 + ((y / 14) % 2) * 7; x < W; x += 14) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
  return tex(c);
}

// --- frontale dell'oscilloscopio -----------------------------------------
export function scopePanelTexture() {
  const W = 512, H = 360, c = canvas(W, H), g = c.getContext("2d");
  g.fillStyle = "#161D26"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#070B10"; roundRect(g, 20, 20, 300, 230, 10); g.fill(); // cornice schermo
  g.fillStyle = "#C9D4DC";
  g.font = `600 20px ${FONT}`;
  try { g.fontStretch = "condensed"; } catch (e) { /* */ }
  [["Volts/div", 340, 52], ["Time/div", 430, 52], ["Pos", 340, 172], ["Trig", 430, 172]].forEach(([s, x, y]) => g.fillText(s, x, y));
  g.fillText("CH1", 40, 300); g.fillText("CH2", 140, 300); g.fillText("Ext", 240, 300);
  g.fillStyle = RED; g.fillRect(20, 330, 80, 6);
  return tex(c);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
