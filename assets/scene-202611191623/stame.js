// Stame com'e' davvero (github.com/luigismith/stame, hardware/case, versione stampata NES): una console bassa
// e lunga in PETG color crema, 583,5 x 240 x 45 mm. A sinistra la MPK mini IV sotto la mascherina nera con le
// scritte rosse (si vedono tasti, pad, manopole e ruote); a destra, davanti, il macro pad con quindici tasti
// meccanici trasparenti e tre manopole di alluminio; dietro, la Miyoo Flip aperta nella sua culla, con la
// visiera fume' e lo schermo acceso; sui fianchi le targhe grigie con il nome e il marchio dei tre stami.
// Le misure vengono da hardware/case/misure.py (millimetri: x da sinistra, y dal retro verso il musicista).
import * as THREE from "three";
import { box, shadow } from "./desk-objects.js";
import { canvas, tex, FONT } from "./textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S = 0.001;                                    // mm -> m
const W = 583.5, D = 240, H = 45;                   // la console
const RED = "#e4382c";
const CHORDS = [["C", "maj"], ["A", "m7"], ["F", "M7"], ["G", "sus"]];

// un pezzo a forma di scatola, dato con gli estremi in millimetri (x0..x1, y0..y1, z0..z1)
function part(mat, x0, x1, y0, y1, z0, z1, r = 1.2) {
  const m = box((x1 - x0) * S, (z1 - z0) * S, (y1 - y0) * S, mat, r * S, 2);
  m.position.set(((x0 + x1) / 2 - W / 2) * S, ((z0 + z1) / 2) * S, ((y0 + y1) / 2 - D / 2) * S);
  return m;
}
const at = (x, y, z) => V((x - W / 2) * S, z * S, (y - D / 2) * S);

// il marchio: tre stami che salgono da un ricettacolo, le antere come teste di nota
function stamens(x, cx, cy, s) {
  x.save();
  x.translate(cx, cy);
  x.scale(s, s);
  x.strokeStyle = x.fillStyle = RED;
  x.lineWidth = 2.2;
  x.lineCap = "round";
  for (const [dx, h] of [[-9, 20], [0, 26], [9, 20]]) {
    x.beginPath(); x.moveTo(0, 14); x.quadraticCurveTo(dx * 0.3, 0, dx, -h + 6); x.stroke();
    x.beginPath(); x.ellipse(dx, -h + 2, 4.2, 5.6, -0.35, 0, Math.PI * 2); x.fill();
  }
  x.fillRect(-8, 13, 16, 3);
  x.restore();
}

// la mascherina: acrilico nero, i fori dei comandi della MK4 e le legende rosse di Stame (4 px per mm)
const PXM = 4, MX0 = 16, MX1 = 371.5, MY0 = 12, MY1 = 138, MK4X = 18, MK4Y = 44;
function maskCanvas() {
  const c = canvas((MX1 - MX0) * PXM, (MY1 - MY0) * PXM), x = c.getContext("2d");
  const p = (mx, my) => [(MK4X + mx - MX0) * PXM, (MK4Y + my - MY0) * PXM];
  x.fillStyle = "#18191c"; x.fillRect(0, 0, c.width, c.height);
  const hole = (mx, my, w, h, r) => {
    const [cx, cy] = p(mx, my);
    x.fillStyle = "#08090a";
    x.beginPath(); x.roundRect(cx - (w / 2) * PXM, cy - (h / 2) * PXM, w * PXM, h * PXM, r * PXM); x.fill();
  };
  const label = (t, mx, my, size = 3.2, align = "center") => {
    const [cx, cy] = p(mx, my);
    x.fillStyle = RED; x.textAlign = align; x.font = `600 ${size * PXM}px ${FONT}`;
    x.fillText(t, cx, cy);
  };
  for (const [mx, my] of [[22.9, 37.1], [53.7, 37.1]]) hole(mx, my, 14, 46, 4);                    // ruote
  for (let i = 0; i < 8; i++) hole(87.9 + (i % 4) * 28.6, i < 4 ? 18 : 46.3, 25.5, 25.5, 3);         // pad
  for (const mx of [88.5, 109.6, 130.4, 151.1, 171.9, 252.9, 273.8, 294.1, 314.2, 334.2]) hole(mx, 75.2, 17.8, 12, 2);
  for (const [mx, my] of [[24.4, 75.5], [50.3, 75.5], [203.8, 60], [224.4, 60], [203.5, 75.1], [224.3, 75.1]]) hole(mx, my, 17.8, 12, 2);
  hole(214.1, 16, 25, 12.5, 1.5);                                                                     // display
  hole(214.5, 34.9, 21, 21, 10.5);                                                                    // encoder
  for (let i = 0; i < 8; i++) hole(252.3 + (i % 4) * 27.8, i < 4 ? 18.3 : 50, 21, 21, 10.5);         // manopole
  // legende: le manopole sono i comandi di Stame, i pad suonano gli accordi
  ["SOUND", "PERFORM", "FX", "KEY", "BASS", "LOOP", "BPM", "VOLUME"].forEach((t, i) => label(t, 252.3 + (i % 4) * 27.8, (i < 4 ? 18.3 : 50) + 14.5, 2.9));
  ["DIM", "MIN", "MAJ", "SUS", "6", "m7", "M7", "9"].forEach((t, i) => label(t, 87.9 + (i % 4) * 28.6, (i < 4 ? 18 : 46.3) + 16, 2.6));
  ["UNDO", "LOOP", "PLAY", "REC", "DUB"].forEach((t, i) => label(t, [252.9, 273.8, 294.1, 314.2, 334.2][i], 85.5, 2.5));
  label("BEND", 22.9, 66, 2.6); label("MOD", 53.7, 66, 2.6);
  // il marchio e il nome, sulla zona dei cavi dietro la MK4
  stamens(x, 24 * PXM, 19 * PXM, 0.62 * PXM / 4 * 2);
  x.fillStyle = RED; x.textAlign = "left";
  x.font = `700 ${9 * PXM}px ${FONT}`; x.fillText("STAME", 34 * PXM, 22 * PXM);
  x.font = `500 ${3.4 * PXM}px ${FONT}`; x.fillText("STAMEN HARMONICUM", 34.5 * PXM, 28.5 * PXM);
  return c;
}

// la targa grigia di un fianco: il nome e il marchio, in rosso (3 px per mm; 200 x 32 mm)
function plateCanvas() {
  const c = canvas(600, 96), x = c.getContext("2d");
  x.fillStyle = "#4f5257"; x.fillRect(0, 0, 600, 96);
  x.fillStyle = RED; x.textAlign = "right";
  x.font = `700 40px ${FONT}`; x.fillText("STAME", 470, 54);
  x.font = `500 14px ${FONT}`; x.fillText("STAMEN HARMONICUM", 470, 76);
  stamens(x, 530, 52, 1.35);
  return c;
}

// lo schermo della Flip, tema Giorno: l'accordo, il tempo, la tastiera con le note accese, il suono in uso
function screenCanvas() {
  const c = canvas(320, 240), x = c.getContext("2d");
  const draw = (i) => {
    const [root, kind] = CHORDS[i % CHORDS.length];
    x.fillStyle = "#e7e4d8"; x.fillRect(0, 0, 320, 240);
    x.fillStyle = "#1f2226";
    x.font = `700 72px ui-monospace, Consolas, monospace`; x.textAlign = "left"; x.fillText(root, 18, 86);
    x.font = `700 30px ui-monospace, Consolas, monospace`; x.fillText(kind, 18 + 46, 86);
    x.textAlign = "right"; x.font = `700 40px ui-monospace, Consolas, monospace`; x.fillText("120", 300, 60);
    x.font = `600 14px ui-monospace, Consolas, monospace`; x.fillText("BPM", 300, 80);
    // tastiera: due ottave, le note dell'accordo accese
    const lit = { C: [0, 4, 7], A: [9, 12, 16, 19], F: [5, 9, 12, 16], G: [7, 12, 14] }[root];
    const wk = [0, 2, 4, 5, 7, 9, 11], kx = 14, ky = 122, kw = 292 / 14;
    for (let o = 0; o < 2; o++) wk.forEach((n, j) => {
      const on = lit.includes(n + o * 12);
      x.fillStyle = on ? "#3aa6a0" : "#fbfaf4";
      x.fillRect(kx + (o * 7 + j) * kw + 1, ky, kw - 2, 60);
    });
    for (let o = 0; o < 2; o++) [1, 3, 6, 8, 10].forEach((n) => {
      const j = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6][n];
      x.fillStyle = lit.includes(n + o * 12) ? "#3aa6a0" : "#1f2226";
      x.fillRect(kx + (o * 7 + j + 1) * kw - kw * 0.32, ky, kw * 0.64, 36);
    });
    x.fillStyle = "#1f2226"; x.textAlign = "left"; x.font = `700 20px ui-monospace, Consolas, monospace`;
    x.fillText("03 Anther Keys", 16, 220);
    x.fillStyle = "#c8261b"; x.fillRect(250, 206, 54, 14);
  };
  draw(0);
  return { c, draw };
}

export function createStame(M, product) {
  const g = new THREE.Group();
  g.name = "synth-" + product.slug;
  const inner = new THREE.Group();
  g.add(inner);
  const std = (color, roughness, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const cream = std(0xe4d6b6, 0.74), grey = std(0x55585d, 0.62), deck = std(0x2d2f34, 0.42, 0.05);
  const mkBody = std(0xd6d8d6, 0.55), mkDark = std(0x2a2c30, 0.6), red = std(0xc8261b, 0.5);
  const white = std(0xf1f1ec, 0.36), black = std(0x141518, 0.42), alu = std(0xc9ccd0, 0.26, 1);
  const knobGrey = std(0x9a9ea3, 0.48, 0.2), padTop = std(0x1a1b1e, 0.7);

  // --- la console stampata: base, fianchi, retro, costola, parete davanti a destra ---
  inner.add(
    part(cream, 0, W, 0, D, 0, 6, 1.5),
    part(cream, 0, 16, 0, D, 0, H, 6),
    part(cream, W - 16, W, 0, D, 0, H, 6),
    part(cream, 16, W - 16, 8, 16, 0, H),
    part(cream, 367.5, 375.5, 16, 236, 0, H),
    part(cream, 375.5, W - 16, 152, D, 0, H - 0.4),           // la culla del pad, a filo del piano
  );
  // targhe grigie sui fianchi, con il nome e il marchio
  const plateMat = std(0xffffff, 0.6, 0, { map: tex(plateCanvas()) });
  for (const side of [-1, 1]) {           // ruotata verso l'esterno, la targa si legge dritta su tutti e due i fianchi
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(200 * S, 32 * S), plateMat);
    plate.position.copy(at(side > 0 ? W + 0.25 : -0.25, 122, 23));
    plate.rotation.y = side * Math.PI / 2;
    inner.add(plate);
  }

  // --- MPK mini IV: corpo, guance, tasti, la striscia rossa ---
  inner.add(
    part(mkBody, 18, 365.5, 44, 144, 6, 42.6),
    part(mkDark, 31.5, 352, 144, 236, 6, 23.5, 1),
    part(mkBody, 18, 31.5, 138, 236, 6, 38, 2),
    part(mkBody, 352, 365.5, 138, 236, 6, 38, 2),
    part(red, 18, 365.5, 138, 143, 6, 43.4, 0.6),
  );
  const kw = 320.5 / 15, m4 = new THREE.Matrix4();
  const whites = new THREE.InstancedMesh(box((kw - 1.1) * S, 10 * S, 86 * S, white, 1 * S, 1).geometry, white, 15);
  for (let i = 0; i < 15; i++) whites.setMatrixAt(i, m4.makeTranslation(at(31.5 + kw * (i + 0.5), 191, 30)));
  const bk = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12];
  const blacks = new THREE.InstancedMesh(box(11 * S, 9 * S, 52 * S, black, 1 * S, 1).geometry, black, bk.length);
  bk.forEach((k, i) => blacks.setMatrixAt(i, m4.makeTranslation(at(31.5 + kw * (k + 1), 174, 38.5))));
  inner.add(whites, blacks);

  // --- la mascherina nera con le legende, e i comandi della MK4 che ci passano attraverso ---
  const maskMat = std(0xffffff, 0.4, 0.05, { map: tex(maskCanvas()) });
  const mask = new THREE.Mesh(new THREE.BoxGeometry((MX1 - MX0) * S, 2 * S, (MY1 - MY0) * S),
    [deck, deck, maskMat, deck, deck, deck]);
  mask.position.copy(at((MX0 + MX1) / 2, (MY0 + MY1) / 2, 44));
  inner.add(mask);
  const padMat = std(0xd2f1ec, 0.5, 0, { emissive: 0x6fd6cc, emissiveIntensity: 0.32 });
  for (let i = 0; i < 8; i++) {
    const cx = MK4X + 87.9 + (i % 4) * 28.6, cy = MK4Y + (i < 4 ? 18 : 46.3);
    inner.add(part(padMat, cx - 11, cx + 11, cy - 11, cy + 11, 44.6, 45.8, 2.5));
  }
  for (let i = 0; i < 8; i++) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(7.6 * S, 8.2 * S, 8 * S, 24), knobGrey);
    k.position.copy(at(MK4X + 252.3 + (i % 4) * 27.8, MK4Y + (i < 4 ? 18.3 : 50), 49));
    inner.add(k);
  }
  const nav = new THREE.Mesh(new THREE.CylinderGeometry(8.5 * S, 9 * S, 6 * S, 24), knobGrey);
  nav.position.copy(at(MK4X + 214.5, MK4Y + 34.9, 48));
  inner.add(nav);
  for (const mx of [22.9, 53.7]) inner.add(part(knobGrey, MK4X + mx - 5, MK4X + mx + 5, MK4Y + 20, MK4Y + 54, 40, 48, 3));
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(22 * S, 10 * S), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 1.05, 1.15) }));
  lcd.rotation.x = -Math.PI / 2;
  lcd.position.copy(at(MK4X + 214.1, MK4Y + 16, 45.15));
  inner.add(lcd);

  // --- a destra: il piano della Flip, il macro pad con i tasti trasparenti e le tre manopole ---
  inner.add(part(deck, 371.5, W - 16, 12, 152, 43, H, 0.6));
  const PX0 = 379, PY0 = 155.3;
  inner.add(part(padTop, PX0, PX0 + 185, PY0, PY0 + 77.2, 40, H + 0.4, 5));
  const clear = new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32, depthWrite: false });
  const legend = std(0xc9cbc8, 0.5), legendDark = std(0x26282c, 0.5);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const kx = PX0 + 15.5 + c * 21.4, ky = PY0 + 12.6 + r * 22.1;
    inner.add(part(clear, kx - 9, kx + 9, ky - 9, ky + 9, H + 0.4, H + 10, 1.6));
    inner.add(part((r * 5 + c) % 6 === 4 ? legendDark : legend, kx - 5, kx + 5, ky - 3.5, ky + 3.5, H + 5.5, H + 6.2, 0.8));   // l'etichetta sta dentro il tasto
  }
  for (const [kx, ky, kr] of [[133.5, 18, 10.4], [169, 18, 10.4], [151.5, 62, 14.6]]) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(kr * 0.94 * S, kr * S, 21 * S, 32), alu);
    k.position.copy(at(PX0 + kx, PY0 + ky, H + 0.4 + 10.5));
    inner.add(k);
  }

  // --- la Miyoo Flip nella sua culla: la meta' con i tasti e il coperchio aperto a 65 gradi ---
  const FX = 471.5, FY0 = 50.6, FW = 84, FD = 80.35, FH = 12.25;
  inner.add(part(cream, FX - 45, FX + 45, FY0 - 3, FY0 + FD + 3, H, H + 7, 2));
  const flipWhite = std(0xeeeeea, 0.42);
  inner.add(part(flipWhite, FX - FW / 2, FX + FW / 2, FY0, FY0 + FD, H + 2, H + 2 + FH, 5));
  const top = H + 2 + FH;
  const dpad = std(0xd2d3d0, 0.5);
  inner.add(part(dpad, FX - 30, FX - 14, FY0 + 22, FY0 + 28, top, top + 1.2, 1), part(dpad, FX - 25, FX - 19, FY0 + 17, FY0 + 33, top, top + 1.2, 1));
  [[0x9fd8a8, 22, 0], [0xa8c4f0, 28, -6], [0xf2dc8c, 28, 6], [0xf2a8c0, 34, 0]].forEach(([color, dx, dy]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * S, 2.4 * S, 1.6 * S, 14), std(color, 0.4));
    b.position.copy(at(FX + dx - 6, FY0 + 25 + dy, top + 0.8));
    inner.add(b);
  });
  for (const dx of [-22, 22]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(6 * S, 1.1 * S, 8, 28), black);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(at(FX + dx, FY0 + 56, top + 0.6));
    inner.add(ring);
  }
  // il coperchio: incernierato sul bordo di dietro, sale e si piega indietro di 25 gradi
  const lid = new THREE.Group();
  lid.position.copy(at(FX, FY0, top));
  lid.rotation.x = -25 * Math.PI / 180;
  inner.add(lid);
  const lidBox = box(FW * S, FD * S, FH * S, flipWhite, 5 * S, 2);
  lidBox.position.set(0, (FD / 2) * S, (FH / 2 - FH) * S);
  const bezel = box(78 * S, 62 * S, 0.8 * S, black, 2 * S, 1);
  bezel.position.set(0, 44 * S, 0.3 * S);
  lid.add(lidBox, bezel);
  const scr = screenCanvas(), smap = tex(scr.c, { mips: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(70 * S, 52.5 * S), new THREE.MeshBasicMaterial({ map: smap, color: new THREE.Color(1.15, 1.15, 1.15) }));
  screen.position.set(0, 44 * S, 0.75 * S);
  screen.userData.dynamic = true;
  lid.add(screen);
  // la visiera fume': copre il dorso e i fianchi del coperchio aperto
  const smoke = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.18, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });
  const back = box(92 * S, 86 * S, 2.4 * S, smoke, 2 * S, 1);
  back.position.set(0, 42 * S, (-FH - 3) * S);
  lid.add(back);
  for (const sx of [-1, 1]) {
    const side = box(2.4 * S, 86 * S, 20 * S, smoke, 1 * S, 1);
    side.position.set(sx * 46 * S, 42 * S, -6 * S);
    lid.add(side);
  }
  for (const sx of [-1, 1]) inner.add(part(smoke, FX + sx * 46 - 1.5, FX + sx * 46 + 1.5, FY0 - 22, FY0 + 2, H, top + 2, 1));

  inner.position.y = 0.002;                          // piedini
  shadow(g);
  [screen, back].forEach((m) => { m.castShadow = false; });
  let last = -1;
  return {
    group: g, inner, w: W * S, d: D * S, h: H * S, product,
    jacks: [at(W - 40, 4, 30)],                     // l'uscita audio della Flip passa dal retro, a destra
    // l'accordo sullo schermo cambia ogni due battute a 120
    update(t) {
      const i = Math.floor(t / 4) % CHORDS.length;
      if (i === last) return;
      last = i;
      scr.draw(i);
      smap.needsUpdate = true;
    },
  };
}
