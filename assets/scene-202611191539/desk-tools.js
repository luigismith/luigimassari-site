// Attrezzi e oggetti di lavoro che riempiono il banco: tappetino da taglio con tronchesino, pinzette,
// cacciavite, scheda in montaggio e rocchetto di stagno; calibro; pannello e scatola tagliati al laser;
// microfono; quaderno con penna. Nessuno e' una sezione del sito.
import * as THREE from "three";
import { box, rod } from "./desk-objects.js";
import { canvas, tex } from "./textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Materiali condivisi: stessi parametri, stesso materiale. Cosi' mergeStatic puo' unire in una sola mesh
// i pezzi di oggetti diversi (ogni materiale in piu' e' una chiamata di disegno in piu', due con le ombre).
const stdCache = new Map();
export const std = (color, roughness = 0.5, metalness = 0) => {
  const key = color + "|" + roughness + "|" + metalness;
  if (!stdCache.has(key)) stdCache.set(key, new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  return stdCache.get(key);
};
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const flat = (geo, mat, x, y, z) => { const m = mesh(geo, mat, x, y, z); m.rotation.x = -Math.PI / 2; return m; };
export const MAT_TOP = 0.0026; // spessore del tappetino: quello che ci sta sopra va alzato di tanto

// tappetino da taglio: griglia al centimetro, righe piu' marcate ogni cinque, linee degli angoli
function cuttingMat() {
  const g = new THREE.Group();
  g.name = "mat";
  const W = 0.3, D = 0.2, c = canvas(900, 600), x = c.getContext("2d");
  x.fillStyle = "#1B2627";
  x.fillRect(0, 0, 900, 600);
  const line = (k) => (k % 5 ? "rgba(140, 170, 170, 0.16)" : "rgba(160, 190, 190, 0.38)");
  for (let i = 0; i <= 30; i++) { x.fillStyle = line(i); x.fillRect(i * 30 - 1, 0, i % 5 ? 1 : 2, 600); }
  for (let j = 0; j <= 20; j++) { x.fillStyle = line(j); x.fillRect(0, j * 30 - 1, 900, j % 5 ? 1 : 2); }
  x.strokeStyle = "rgba(255, 180, 74, 0.45)";
  x.lineWidth = 2;
  x.strokeRect(30, 30, 840, 540);
  x.beginPath(); x.moveTo(30, 570); x.lineTo(330, 270); x.moveTo(30, 570); x.lineTo(203, 270); x.stroke();
  const body = box(W, MAT_TOP - 0.0001, D, std(0x172021, 0.9), 0.0012, 1);
  body.position.y = MAT_TOP / 2;
  g.add(body, flat(new THREE.PlaneGeometry(W - 0.004, D - 0.004), new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.92 }), 0, MAT_TOP + 0.0001, 0));
  return g;
}

// tronchesino: becchi in acciaio verso +z, manici con impugnatura ambra
function cutters(M) {
  const g = new THREE.Group();
  g.name = "cutters";
  const grip = std(0xf0a23a, 0.72);
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    const jaw = box(0.0062, 0.0042, 0.03, M.steel, 0.0012, 1);
    jaw.position.set(s * 0.0024, 0.0046, 0.013);
    const nose = mesh(new THREE.ConeGeometry(0.0036, 0.012, 4), M.steel, s * 0.0024, 0.0046, 0.033);
    nose.rotation.set(Math.PI / 2, Math.PI / 4, 0);
    nose.scale.set(0.9, 1, 0.6);
    const handle = box(0.0105, 0.0085, 0.08, grip, 0.004, 3);
    handle.position.set(s * 0.0042, 0.0046, -0.047);
    arm.add(jaw, nose, handle);
    arm.rotation.y = -s * 0.12; // manici aperti, becchi chiusi
    g.add(arm);
  }
  g.add(mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.0062, 18), M.steel, 0, 0.0048, 0));
  const spring = mesh(new THREE.TorusGeometry(0.0062, 0.0006, 6, 14, Math.PI), M.steel, 0, 0.0046, -0.013);
  spring.rotation.x = Math.PI / 2;
  g.add(spring);
  return g;
}

// pinzette posate di taglio: due lame unite in fondo, aperte verso +z
function tweezers(M) {
  const g = new THREE.Group();
  g.name = "tweezers";
  for (const s of [-1, 1]) {
    const arm = new THREE.Group();
    const blade = box(0.0011, 0.0058, 0.1, M.steel, 0.0004, 1);
    blade.position.set(0, 0.003, 0.052);
    const tip = box(0.0009, 0.003, 0.016, M.steel, 0.0003, 1);
    tip.position.set(0, 0.0022, 0.108);
    arm.add(blade, tip);
    arm.rotation.y = s * 0.034;
    g.add(arm);
  }
  g.add(mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.0058, 12), M.steel, 0, 0.003, 0.002));
  return g;
}

// cacciavite di precisione, steso lungo x
function screwdriver(M) {
  const g = new THREE.Group();
  g.name = "screwdriver";
  const R = 0.006, lay = (geo, mat, x) => { const m = mesh(geo, mat, x, R, 0); m.rotation.z = Math.PI / 2; return m; };
  g.add(
    lay(new THREE.CylinderGeometry(R, 0.0052, 0.06, 22), std(0x1c2733, 0.62), -0.03),
    lay(new THREE.CylinderGeometry(R + 0.0003, R + 0.0003, 0.0035, 22), std(0xffb44a, 0.5, 0.4), -0.008),
    lay(new THREE.CylinderGeometry(R + 0.0003, R + 0.0003, 0.0035, 22), std(0xffb44a, 0.5, 0.4), -0.016),
    lay(new THREE.CylinderGeometry(0.0052, 0.0052, 0.007, 22), M.steel, -0.0635),
    lay(new THREE.CylinderGeometry(0.0015, 0.0015, 0.056, 10), M.steel, 0.028),
  );
  const tip = box(0.006, 0.0008, 0.003, M.steel, 0.0002, 1);
  tip.position.set(0.058, R, 0);
  g.add(tip);
  return g;
}

// scheda elettronica in montaggio: piste, piazzole dorate, serigrafie; un integrato e tre condensatori gia' saldati
function looseBoard() {
  const g = new THREE.Group();
  g.name = "pcb";
  const W = 0.075, D = 0.048, CW = 600, CH = 384, c = canvas(CW, CH), x = c.getContext("2d");
  x.fillStyle = "#0F2431";
  x.fillRect(0, 0, CW, CH);
  x.strokeStyle = "#1A3E53";
  x.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const y = 44 + i * 22, bend = i % 2 ? 16 : -16, kx = 230 + (i % 3) * 44;
    x.beginPath(); x.moveTo(60, y); x.lineTo(kx, y); x.lineTo(kx + 34, y + bend); x.lineTo(540, y + bend); x.stroke();
  }
  x.fillStyle = "#D9B45A";
  for (let i = 0; i < 16; i++) { x.fillRect(52 + i * 32, 12, 14, 14); x.fillRect(52 + i * 32, 358, 14, 14); }
  const footprint = (cx, cy, n, w) => {
    x.fillStyle = "#0F2431"; x.fillRect(cx - w / 2 - 18, cy - n * 7 - 4, w + 36, n * 14 + 8);
    x.fillStyle = "#D9B45A";
    for (let k = 0; k < n; k++) { x.fillRect(cx - w / 2 - 14, cy - (n - 1) * 7 + k * 14 - 3, 12, 6); x.fillRect(cx + w / 2 + 2, cy - (n - 1) * 7 + k * 14 - 3, 12, 6); }
    x.strokeStyle = "#E8ECE6"; x.lineWidth = 2; x.strokeRect(cx - w / 2, cy - n * 7, w, n * 14);
  };
  footprint(170, 190, 8, 70); footprint(400, 140, 6, 56); footprint(430, 262, 4, 40);
  x.fillStyle = "#D9B45A";
  for (let k = 0; k < 6; k++) { x.fillRect(236 + k * 24, 296, 9, 10); x.fillRect(236 + k * 24, 314, 9, 10); }
  x.fillStyle = "#06090C";
  for (const [hx, hy] of [[24, 46], [576, 46], [24, 338], [576, 338]]) { x.beginPath(); x.arc(hx, hy, 9, 0, 7); x.fill(); }
  const at = (px, py, y) => V((px / CW - 0.5) * W, y, (py / CH - 0.5) * D);
  const body = box(W, 0.0016, D, std(0x0c1c26, 0.4, 0.1), 0.0006, 1);
  body.position.y = 0.0008;
  g.add(body, flat(new THREE.PlaneGeometry(W - 0.0012, D - 0.0012), new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.42, metalness: 0.15 }), 0, 0.00166, 0));
  const ic = std(0x0c0d0f, 0.45, 0.1), cap = std(0xb9966a, 0.6);
  const chip = box(0.0086, 0.0013, 0.0138, ic, 0.0003, 1);
  chip.position.copy(at(170, 190, 0.0023));
  g.add(chip);
  for (let k = 0; k < 3; k++) {
    const part = box(0.0011, 0.0009, 0.0026, cap, 0.0002, 1);
    part.position.copy(at(240.5 + k * 24, 310, 0.0021));
    g.add(part);
  }
  return g;
}

// rocchetto di stagno, con il capo che esce
function solderReel(M) {
  const g = new THREE.Group();
  g.name = "solder";
  const dark = std(0x15171a, 0.5, 0.2), tin = std(0xc6cbd0, 0.38, 1);
  g.add(
    mesh(new THREE.CylinderGeometry(0.0205, 0.0205, 0.002, 30), dark, 0, 0.001, 0),
    mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 30), tin, 0, 0.014, 0),
    mesh(new THREE.CylinderGeometry(0.0205, 0.0205, 0.002, 30), dark, 0, 0.027, 0),
    mesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.0006, 18), std(0x050607, 0.9), 0, 0.0283, 0),
  );
  const end = new THREE.CatmullRomCurve3([V(0.0155, 0.021, 0.004), V(0.03, 0.014, 0.012), V(0.044, 0.003, 0.026), V(0.058, 0.0012, 0.028), V(0.074, 0.0012, 0.02)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(end, 30, 0.0006, 6), tin));
  return g;
}

// calibro digitale: asta con la scala incisa, becchi, corsoio con il display (segna l'apertura vera: 12,70 mm)
function caliper(M) {
  const g = new THREE.Group();
  g.name = "caliper";
  const steel = std(0x9aa0a6, 0.46, 1), L = 0.23, T = 0.003, GAP = 0.0127; // satinato: lucido faceva un riflesso abbagliante
  const c = canvas(1024, 64), x = c.getContext("2d");
  x.fillStyle = "#B4BABF";
  x.fillRect(0, 0, 1024, 64);
  x.fillStyle = "#2A2D30";
  for (let i = 0; i <= 200; i++) x.fillRect(12 + i * 5, 0, 1, i % 10 === 0 ? 30 : i % 5 === 0 ? 22 : 14);
  const beam = box(L, T, 0.016, steel, 0.0005, 1);
  beam.position.set(L / 2 - 0.012, T / 2, 0);
  g.add(beam, flat(new THREE.PlaneGeometry(L - 0.004, 0.0145), new THREE.MeshStandardMaterial({ map: tex(c), roughness: 0.5, metalness: 0.8 }), L / 2 - 0.012, T + 0.0001, 0));
  // becco: faccia di misura in x = 0, corpo verso s (-1 il fisso, +1 il mobile); becchi grandi verso +z, piccoli verso -z
  const jaw = (s) => {
    const big = new THREE.Shape([[0, 0.008], [0, 0.048], [s * 0.004, 0.048], [s * 0.012, 0.02], [s * 0.012, 0.008]].map(([a, b]) => new THREE.Vector2(a, b)));
    const small = new THREE.Shape([[0, -0.008], [0, -0.022], [s * 0.003, -0.022], [s * 0.008, -0.012], [s * 0.008, -0.008]].map(([a, b]) => new THREE.Vector2(a, b)));
    const j = new THREE.Group();
    for (const sh of [big, small]) {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }), steel);
      m.rotation.x = Math.PI / 2; // la forma (x, y) va sul piano del banco, lo spessore verso il basso
      m.position.y = T;
      j.add(m);
    }
    return j;
  };
  const fixed = jaw(-1), moving = jaw(1);
  moving.position.x = GAP;
  g.add(fixed, moving);
  const slider = box(0.052, 0.0078, 0.0245, std(0x1b1e23, 0.5, 0.2), 0.0016, 2);
  slider.position.set(GAP + 0.026, 0.0041, 0);
  const lc = canvas(192, 72), lx = lc.getContext("2d");
  lx.fillStyle = "#AEB8A8"; lx.fillRect(0, 0, 192, 72);
  lx.fillStyle = "#1C211B"; lx.textAlign = "right";
  lx.font = "700 46px ui-monospace, Consolas, monospace"; lx.fillText("12.70", 150, 52);
  lx.font = "700 16px ui-monospace, Consolas, monospace"; lx.fillText("mm", 184, 52);
  g.add(slider,
    flat(new THREE.PlaneGeometry(0.03, 0.0112), new THREE.MeshBasicMaterial({ map: tex(lc, { mips: false }), color: new THREE.Color(0.8, 0.8, 0.8) }), GAP + 0.021, 0.0081, -0.001),
    mesh(new THREE.CylinderGeometry(0.0017, 0.0017, 0.001, 12), std(0xffb44a, 0.5), GAP + 0.043, 0.0083, -0.004),
    mesh(new THREE.CylinderGeometry(0.0017, 0.0017, 0.001, 12), std(0x8e9399, 0.5), GAP + 0.043, 0.0083, 0.003));
  const wheel = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.007, 16), steel, GAP + 0.03, 0.004, 0.0142);
  wheel.rotation.z = Math.PI / 2;
  const depth = box(0.03, 0.001, 0.003, steel, 0.0003, 1);
  depth.position.set(L - 0.012 + 0.014, 0.0012, 0);
  g.add(wheel, depth);
  return g;
}

// --- taglio laser: compensato chiaro con i bordi bruciati -------------------------------------
function plywood() {
  const c = canvas(256, 256), x = c.getContext("2d");
  x.fillStyle = "#DDBE8E";
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    x.fillStyle = `rgba(${i % 2 ? "120, 84, 40" : "255, 240, 205"}, ${0.04 + Math.random() * 0.07})`;
    x.fillRect(0, Math.random() * 256, 256, 1 + Math.random() * 2.5);
  }
  // le UV dell'estrusione sono in metri: 8 ripetizioni = un riquadro di venatura ogni 12,5 cm
  return { face: new THREE.MeshStandardMaterial({ map: tex(c, { repeat: [8, 8] }), roughness: 0.78 }), edge: std(0x3a2414, 0.9), draw: c };
}
const roundRect = (w, h, r) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(w / 2, h / 2 - r); s.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
  s.lineTo(-w / 2 + r, h / 2); s.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-w / 2, -h / 2 + r); s.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
};
const lay = (m, y, ry = 0) => { m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.y = y; return m; }; // estrusione stesa sul banco

// frontale di uno strumento tagliato e inciso al laser, posato su un foglio ancora intero
function laserPanel(ply) {
  const g = new THREE.Group();
  g.name = "laserpanel";
  const W = 0.15, H = 0.1, T = 0.003, panel = roundRect(W, H, 0.004);
  const hole = (x, y, r) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); panel.holes.push(p); };
  const knobs = [0, 1, 2, 3, 4, 5].map((i) => [-0.055 + i * 0.022, -0.022]);
  const leds = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [-0.056 + i * 0.016, 0.004]);
  const jacks = [[0.03, 0.03], [0.046, 0.03], [0.062, 0.03]];
  knobs.forEach(([x, y]) => hole(x, y, 0.0052));
  leds.forEach(([x, y]) => hole(x, y, 0.002));
  jacks.forEach(([x, y]) => hole(x, y, 0.0032));
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) hole(sx * 0.068, sy * 0.043, 0.0017);
  const win = new THREE.Path();
  win.moveTo(-0.062, 0.02); win.lineTo(-0.062, 0.04); win.lineTo(-0.008, 0.04); win.lineTo(-0.008, 0.02); win.closePath();
  panel.holes.push(win);
  // incisioni: tacche intorno alle manopole, cornice del display, righe guida
  const S = 5000, c = canvas(W * S, H * S), x = c.getContext("2d");
  x.drawImage(ply.draw, 0, 0, c.width, c.height);
  const px = (m) => (m / W + 0.5) * c.width, py = (m) => (0.5 - m / H) * c.height;
  x.strokeStyle = "rgba(92, 56, 26, 0.9)"; x.fillStyle = "rgba(92, 56, 26, 0.9)"; x.lineWidth = 2.5;
  for (const [kx, ky] of knobs) {
    x.beginPath(); x.arc(px(kx), py(ky), 0.0085 * S, Math.PI * 0.75, Math.PI * 2.25); x.stroke();
    for (let t = 0; t <= 10; t++) {
      const a = Math.PI * 0.75 + (t / 10) * Math.PI * 1.5;
      x.beginPath(); x.moveTo(px(kx) + Math.cos(a) * 0.0085 * S, py(ky) + Math.sin(a) * 0.0085 * S);
      x.lineTo(px(kx) + Math.cos(a) * 0.0102 * S, py(ky) + Math.sin(a) * 0.0102 * S); x.stroke();
    }
  }
  x.strokeRect(px(-0.065), py(0.043), 0.06 * S, 0.026 * S);
  x.fillRect(px(-0.066), py(-0.004), 0.132 * S, 2.5);
  x.fillRect(px(0.02), py(0.0215), 0.05 * S, 2.5);
  for (const [jx, jy] of jacks) { x.beginPath(); x.arc(px(jx), py(jy), 0.0048 * S, 0, 7); x.stroke(); }
  const map = tex(c);
  map.repeat.set(1 / W, 1 / H);
  map.offset.set(0.5, 0.5);
  const engraved = new THREE.MeshStandardMaterial({ map, roughness: 0.78 });
  const sheet = new THREE.Mesh(new THREE.ExtrudeGeometry(roundRect(0.168, 0.114, 0.002), { depth: T, bevelEnabled: false }), [ply.face, ply.edge]);
  const cut = new THREE.Mesh(new THREE.ExtrudeGeometry(panel, { depth: T, bevelEnabled: false, curveSegments: 20 }), [engraved, ply.edge]);
  g.add(lay(sheet, 0, 0.1), lay(cut, T + 0.0002, -0.07));
  // sagoma invisibile per il contorno al passaggio del mouse: i fogli, piatti e sottili, a bassa risoluzione non lo mostrano
  const halo = new THREE.Mesh(new THREE.BoxGeometry(0.172, 0.036, 0.12), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  halo.position.y = 0.018;
  halo.rotation.y = 0.015;
  halo.userData.noShadow = true;
  halo.userData.dynamic = true;
  g.add(halo);
  return g;
}

// scatola a incastri (i "dentelli" tipici del taglio laser), aperta
function fingerBox(ply) {
  const g = new THREE.Group();
  g.name = "laserbox";
  const W = 0.09, D = 0.064, H = 0.054, T = 0.004, N = 5, seg = H / N;
  const side = (w, phase) => {
    const off = (k) => (k % 2 === phase ? 0 : T), s = new THREE.Shape();
    s.moveTo(-w / 2 + off(0), 0);
    for (let k = 0; k < N; k++) { s.lineTo(-w / 2 + off(k), k * seg); s.lineTo(-w / 2 + off(k), (k + 1) * seg); }
    s.lineTo(w / 2 - off(N - 1), H);
    for (let k = N - 1; k >= 0; k--) { s.lineTo(w / 2 - off(k), (k + 1) * seg); s.lineTo(w / 2 - off(k), k * seg); }
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false });
  };
  const mats = [ply.face, ply.edge], long = side(W, 0), short = side(D, 1);
  const front = new THREE.Mesh(long, mats), back = new THREE.Mesh(long, mats);
  front.position.z = D / 2 - T;
  back.position.z = -D / 2;
  const left = new THREE.Mesh(short, mats), right = new THREE.Mesh(short, mats);
  left.rotation.y = right.rotation.y = Math.PI / 2;
  left.position.x = -W / 2;
  right.position.x = W / 2 - T;
  const floor = box(W - T * 2, T, D - T * 2, ply.face, 0.0004, 1);
  floor.position.y = T / 2 + 0.0004;
  g.add(front, back, left, right, floor);
  return g;
}

// microfono a condensatore da tavolo, sulla sua forcella
function microphone(M) {
  const g = new THREE.Group();
  g.name = "mic";
  const graphite = std(0x1b1e23, 0.4, 0.6);
  const baseProf = [[0, 0], [0.044, 0], [0.046, 0.003], [0.044, 0.009], [0.012, 0.012], [0, 0.012]].map(([r, h]) => new THREE.Vector2(r, h));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(baseProf, 48), graphite), rod(V(0, 0.012, 0), V(0, 0.075, 0), 0.0045, M.steel));
  const PY = 0.106, yoke = mesh(new THREE.TorusGeometry(0.031, 0.003, 8, 28, Math.PI), M.steel, 0, PY, 0);
  yoke.rotation.z = Math.PI; // la U aperta verso l'alto
  g.add(yoke);
  for (const s of [-1, 1]) {
    const pivot = mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.009, 14), M.steel, s * 0.029, PY, 0);
    pivot.rotation.z = Math.PI / 2;
    g.add(pivot);
  }
  const gc = canvas(64, 64), x = gc.getContext("2d");
  x.fillStyle = "#70767A"; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = "#22262A"; x.lineWidth = 2.2;
  for (let i = -64; i < 128; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 64, 64); x.moveTo(i + 64, 0); x.lineTo(i, 64); x.stroke(); }
  const grille = new THREE.MeshStandardMaterial({ map: tex(gc, { repeat: [14, 5] }), roughness: 0.45, metalness: 0.85 });
  const head = new THREE.Group();
  head.position.y = PY;
  head.rotation.x = -0.26; // inclinato all'indietro, verso chi parla
  const dome = mesh(new THREE.SphereGeometry(0.0243, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), grille, 0, 0.064, 0);
  dome.scale.y = 0.45;
  head.add(
    mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.07, 32), graphite, 0, -0.02, 0),
    mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.012, 20), graphite, 0, -0.061, 0),
    mesh(new THREE.CylinderGeometry(0.0247, 0.0247, 0.004, 32), std(0xffb44a, 0.35, 0.6), 0, 0.017, 0),
    mesh(new THREE.CylinderGeometry(0.0243, 0.0243, 0.045, 32), grille, 0, 0.0415, 0),
    dome);
  g.add(head);
  const cable = new THREE.CatmullRomCurve3([V(0, 0.042, 0.018), V(0, 0.022, 0.046), V(0.02, 0.004, 0.06), V(0.06, 0.003, 0.05), V(0.095, 0.003, -0.02)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 30, 0.002, 6), std(0x101114, 0.7)));
  return g;
}

// quaderno con l'elastico e una penna appoggiata sopra
function notebook(M) {
  const g = new THREE.Group();
  g.name = "notebook";
  const cover = std(0x141a22, 0.65), W = 0.105, D = 0.148;
  const bottom = box(W, 0.0016, D, cover, 0.0007, 1), top = box(W, 0.0016, D, cover, 0.0007, 1);
  bottom.position.y = 0.0008;
  top.position.y = 0.0109;
  const pages = box(W - 0.005, 0.0086, D - 0.004, std(0xe9e4d6, 0.9), 0.0005, 1);
  pages.position.set(-0.0012, 0.0059, 0);
  const spine = box(0.004, 0.0117, D, cover, 0.0015, 2);
  spine.position.set(-W / 2 + 0.002, 0.00585, 0);
  const band = box(0.0065, 0.0122, D + 0.0012, std(0xffb44a, 0.7), 0.0005, 1);
  band.position.set(0.034, 0.0061, 0);
  g.add(bottom, pages, top, spine, band);
  const pen = new THREE.Group(), R = 0.0042, body = std(0x23272c, 0.35, 0.7);
  const part = (geo, mat, x) => { const m = mesh(geo, mat, x, 0, 0); m.rotation.z = Math.PI / 2; return m; };
  pen.add(
    part(new THREE.CylinderGeometry(R, R, 0.112, 18), body, 0),
    part(new THREE.CylinderGeometry(R * 0.35, R, 0.018, 18), M.steel, -0.065),
    part(new THREE.CylinderGeometry(R, R * 0.8, 0.006, 18), M.steel, 0.059));
  const clip = box(0.036, 0.0009, 0.0026, M.steel, 0.0003, 1);
  clip.position.set(0.036, R + 0.0004, 0);
  pen.add(clip);
  pen.position.set(-0.008, 0.0117 + R, 0.012);
  pen.rotation.y = 0.9;
  g.add(pen);
  return g;
}

// place(oggetto, x, z, rotazione) lo posa sul banco; chi sta sul tappetino va alzato del suo spessore
export function addTools(place, M, laser) {
  const ply = plywood();
  const onMat = (o) => { o.position.y += MAT_TOP; return o; };
  place(caliper(M), -1.0, 0.338, 0.03); // display leggibile da chi guarda, becchi grandi verso il bordo del banco
  place(laserPanel(ply), -0.5, 0.062, 0.06, laser);     // i pezzi tagliati al laser: si cliccano (scheda del taglio laser)
  place(fingerBox(ply), -0.49, -0.078, 0.34, laser);
  place(microphone(M), 1.0, -0.075, -0.5);
  place(notebook(M), 0.44, 0.32, -0.1);
}
