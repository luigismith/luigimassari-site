// Altri oggetti sul banco: tastiera MIDI, cuffie, console portatile, cassettiera dei componenti,
// breadboard, multimetro, portautensili, blocchetto. Non sono sezioni del sito: riempiono il banco.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { DESK, box, knob3d, shadow, mergeStatic } from "./desk-objects.js";
import { canvas, tex, FONT } from "./textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const std = (color, roughness = 0.5, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const lit = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });

// tastiera MIDI a 25 tasti con pad e manopole (senza marchi)
function midiKeyboard(M) {
  const g = new THREE.Group();
  g.name = "midi";
  const W = 0.34, D = 0.118, H = 0.02;
  const body = box(W, H, D, M.dark, 0.005, 2);
  body.position.y = H / 2;
  g.add(body);
  const kw = 0.0212, left = -kw * 7.5, m4 = new THREE.Matrix4();
  const white = new THREE.InstancedMesh(new RoundedBoxGeometry(kw - 0.0012, 0.008, 0.052, 1, 0.0012), std(0xdfe3e0, 0.38), 15);
  for (let i = 0; i < 15; i++) white.setMatrixAt(i, m4.makeTranslation(left + kw * (i + 0.5), H + 0.003, 0.028));
  const blacks = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12];
  const black = new THREE.InstancedMesh(new RoundedBoxGeometry(0.0115, 0.008, 0.031, 1, 0.0012), std(0x101214, 0.4), blacks.length);
  blacks.forEach((k, i) => black.setMatrixAt(i, m4.makeTranslation(left + kw * (k + 1), H + 0.008, 0.017)));
  const pad = new THREE.InstancedMesh(new RoundedBoxGeometry(0.023, 0.005, 0.02, 1, 0.002), std(0x2c323a, 0.75), 8);
  for (let i = 0; i < 8; i++) pad.setMatrixAt(i, m4.makeTranslation(-0.148 + (i % 4) * 0.028, H + 0.002, -0.044 + Math.floor(i / 4) * 0.025));
  g.add(white, black, pad);
  const padOn = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.001, 0.016), lit(1.6, 0.95, 0.3));
  padOn.position.set(-0.12, H + 0.0048, -0.044);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.012), lit(0.9, 0.55, 0.18));
  disp.rotation.x = -Math.PI / 2;
  disp.position.set(-0.03, H + 0.0006, -0.033);
  g.add(padOn, disp);
  for (let i = 0; i < 4; i++) {
    const k = knob3d(M, 0.0085, 0.011, -100 + i * 65);
    k.position.set(0.012 + i * 0.036, H, -0.033);
    g.add(k);
  }
  return g;
}

// cuffie appoggiate sul banco
function headphones(M) {
  const g = new THREE.Group();
  g.name = "headphones";
  const cushionMat = std(0x141518, 0.85), accent = std(0xffb44a, 0.4, 0.3);
  for (const sx of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.046, 0.028, 36), M.dark);
    cup.position.set(sx * 0.088, 0.014, 0);
    const cushion = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.011, 10, 30), cushionMat);
    cushion.rotation.x = Math.PI / 2;
    cushion.position.set(sx * 0.088, 0.03, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0445, 0.0014, 6, 36), accent);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(sx * 0.088, 0.006, 0);
    g.add(cup, cushion, ring);
  }
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.0065, 10, 40, Math.PI), M.dark);
  band.rotation.x = -Math.PI / 2;
  band.position.y = 0.018;
  g.add(band);
  return g;
}

// console portatile con il gioco in pixel art (uno dei progetti personali)
function handheldScreen(title) {
  const c = canvas(320, 200), g = c.getContext("2d");
  g.fillStyle = "#0A1622"; g.fillRect(0, 0, 320, 200);
  let seed = 7;
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let x = 0; x < 320;) {
    const w = 14 + Math.floor(r() * 26), h = 30 + Math.floor(r() * 80);
    g.fillStyle = "#12283b"; g.fillRect(x, 150 - h, w, h + 50);
    g.fillStyle = "#FFB44A";
    for (let k = 0; k < 4; k++) if (r() < 0.5) g.fillRect(x + 3 + Math.floor(r() * (w - 8)), 156 - h + Math.floor(r() * (h - 12)), 3, 3);
    x += w + 2;
  }
  g.fillStyle = "#FF5A3D"; g.fillRect(40, 28, 12, 12);
  g.fillStyle = "#EEF1EC"; g.fillRect(150, 136, 8, 14);
  g.fillStyle = "#FF5A3D"; g.fillRect(158, 140, 6, 3);
  g.fillStyle = "#07101A"; g.fillRect(0, 150, 320, 50);
  g.fillStyle = "#EEF1EC"; g.font = `800 22px ${FONT}`; g.textAlign = "center";
  g.fillText(title, 160, 183);
  const t = tex(c, { mips: false });
  t.magFilter = THREE.NearestFilter;
  return t;
}
function handheld(M, title) {
  const g = new THREE.Group();
  g.name = "handheld";
  const body = box(0.165, 0.016, 0.072, std(0x242a32, 0.45, 0.35), 0.008, 3);
  body.position.y = 0.008;
  g.add(body);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.078, 0.049), new THREE.MeshBasicMaterial({ map: handheldScreen(title), color: new THREE.Color(1.25, 1.25, 1.25) }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.y = 0.0164;
  g.add(screen);
  const btn = std(0x0f1113, 0.5);
  for (const [w, d] of [[0.022, 0.007], [0.007, 0.022]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.003, d), btn);
    b.position.set(-0.06, 0.017, 0);
    g.add(b);
  }
  [[0.052, -0.008, 0xffb44a], [0.066, 0.004, 0xff5a3d], [0.052, 0.014, 0x9db0bf], [0.04, 0.003, 0x9db0bf]].forEach(([x, z, c]) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.003, 16), std(c, 0.4));
    b.position.set(x, 0.017, z);
    g.add(b);
  });
  return g;
}

// cassettiera dei componenti
function cabinet(M) {
  const g = new THREE.Group();
  g.name = "cabinet";
  const W = 0.13, H = 0.2, D = 0.13, cols = 3, rows = 5;
  const shell = box(W, H, D, M.dark, 0.004, 2);
  shell.position.y = H / 2;
  g.add(shell);
  const dw = (W - 0.012) / cols, dh = (H - 0.012) / rows, m4 = new THREE.Matrix4();
  const drawers = new THREE.InstancedMesh(new THREE.BoxGeometry(dw - 0.004, dh - 0.004, 0.006), std(0x4a3a22, 0.25), cols * rows);
  const labels = new THREE.InstancedMesh(new THREE.BoxGeometry(dw * 0.5, 0.006, 0.0015), std(0xdfe3e0, 0.6), cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = -W / 2 + 0.006 + dw * (c + 0.5), y = 0.006 + dh * (r + 0.5);
    drawers.setMatrixAt(r * cols + c, m4.makeTranslation(x, y, D / 2 + 0.002));
    labels.setMatrixAt(r * cols + c, m4.makeTranslation(x, y + dh * 0.18, D / 2 + 0.0055));
  }
  g.add(drawers, labels);
  return g;
}

// breadboard con una scheda, un potenziometro e qualche ponticello
function breadboard(M) {
  const g = new THREE.Group();
  g.name = "breadboard";
  const bb = box(0.165, 0.009, 0.055, std(0xd9dcd6, 0.7), 0.002, 1);
  bb.position.y = 0.0045;
  const groove = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.0006, 0.004), std(0x9aa1a6, 0.8));
  groove.position.y = 0.0092;
  const pcb = box(0.062, 0.0016, 0.019, std(0x153d2b, 0.45, 0.1), 0.0006, 1);
  pcb.position.set(-0.035, 0.0135, 0);
  const chip = box(0.014, 0.003, 0.014, std(0x0e0f11, 0.5), 0.0006, 1);
  chip.position.set(-0.03, 0.0158, 0);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 10, 8), lit(2.4, 0.5, 0.3));
  led.position.set(-0.058, 0.016, 0.004);
  const pot = knob3d(M, 0.007, 0.012, 30);
  pot.position.set(0.05, 0.009, 0.006);
  g.add(bb, groove, pcb, chip, led, pot);
  [[0xffb44a, 0.0, 0.03, -0.018, 0.016], [0xff5a3d, -0.01, 0.045, 0.016, -0.014], [0xeef1ec, 0.012, 0.07, -0.012, 0.014], [0x9db0bf, 0.02, 0.06, 0.018, 0.018]].forEach(([c, x0, x1, z0, z1]) => {
    const curve = new THREE.CatmullRomCurve3([V(x0, 0.009, z0), V((x0 + x1) / 2, 0.03, (z0 + z1) / 2), V(x1, 0.009, z1)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.0009, 5), std(c, 0.5)));
  });
  return g;
}

// multimetro con display ambra e puntali
function multimeter(M) {
  const g = new THREE.Group();
  g.name = "multimeter";
  const bumper = box(0.078, 0.022, 0.141, std(0xd98a1f, 0.7), 0.01, 3);
  bumper.position.y = 0.011;
  const body = box(0.072, 0.03, 0.135, std(0x23282f, 0.55, 0.1), 0.008, 3);
  body.position.y = 0.015;
  const c = canvas(160, 64), x = c.getContext("2d");
  x.fillStyle = "#1a1206"; x.fillRect(0, 0, 160, 64);
  x.fillStyle = "#FFB44A"; x.textAlign = "right";
  x.font = "700 44px ui-monospace, Consolas, monospace"; x.fillText("3.30", 128, 48);
  x.font = `700 18px ${FONT}`; x.fillText("V", 152, 48);
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.02), new THREE.MeshBasicMaterial({ map: tex(c, { mips: false }), color: new THREE.Color(1.3, 1.3, 1.3) }));
  lcd.rotation.x = -Math.PI / 2;
  lcd.position.set(0, 0.0303, -0.04);
  const dial = knob3d(M, 0.017, 0.01, 140);
  dial.position.set(0, 0.03, 0.012);
  g.add(bumper, body, lcd, dial);
  [[0xff5a3d, -0.012, -0.12, -0.02], [0x15171a, 0.012, -0.12, 0.035]].forEach(([col, jx, ex, ez]) => {
    const curve = new THREE.CatmullRomCurve3([V(jx, 0.02, 0.066), V(jx - 0.02, 0.004, 0.07), V(ex + 0.07, 0.004, ez + 0.03), V(ex + 0.045, 0.004, ez)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.0016, 6), std(col, 0.5)));
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.0025, 0.09, 10), std(col, 0.5));
    probe.rotation.z = Math.PI / 2;
    probe.position.set(ex, 0.005, ez);
    g.add(probe);
  });
  return g;
}

// portautensili con cacciaviti
function toolCup(M) {
  const g = new THREE.Group();
  g.name = "toolcup";
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.03, 0.09, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }));
  cup.position.y = 0.045;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), M.dark);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.002;
  g.add(cup, bottom);
  [[0xffb44a, 0.012, 0.004, 0.16], [0xff5a3d, -0.012, 0.01, -0.14], [0x9db0bf, 0.0, -0.014, 0.1], [0x2c323a, -0.006, -0.004, -0.2], [0xeef1ec, 0.014, -0.012, 0.22]].forEach(([c, x, z, tilt]) => {
    const t = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.09, 8), M.steel);
    shaft.position.y = 0.05;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0045, 0.05, 12), std(c, 0.5));
    handle.position.y = 0.118;
    t.add(shaft, handle);
    t.position.set(x, 0.004, z);
    t.rotation.set(tilt * 0.6, 0, tilt);
    g.add(t);
  });
  return g;
}

export function createExtras(data) {
  const M = {
    dark: std(0x1a1d22, 0.5, 0.3), steel: std(0x8e9399, 0.28, 1),
    knob: std(0x1c2733, 0.38, 0.15), knobCap: std(0x9aa1a6, 0.42, 1), silk: std(0xe9ece6, 0.5),
  };
  const root = new THREE.Group();
  root.name = "extras";
  const place = (o, x, z, ry = 0) => { o.position.set(x, DESK.y, z); o.rotation.y = ry; shadow(o); root.add(o); return o; };
  place(midiKeyboard(M), 0.6, 0.335, 0.03);
  place(headphones(M), -0.6, 0.31, 0.5);
  place(handheld(M, data.about.projects[0][0]), -0.13, 0.31, -0.2);
  place(cabinet(M), 1.035, -0.27, -0.1);
  place(breadboard(M), 0.27, 0.3, 0.25);
  place(multimeter(M), 0.97, 0.325, 0.35);
  place(toolCup(M), 0.17, -0.15);
  const notes = new THREE.Group();
  notes.name = "notes";
  const block = box(0.05, 0.007, 0.05, std(0xe9a23b, 0.9), 0.0015, 1);
  block.position.y = 0.0035;
  notes.add(block);
  place(notes, -0.115, 0.1, 0.12);
  for (const child of root.children) mergeStatic(child);
  return { group: root };
}
