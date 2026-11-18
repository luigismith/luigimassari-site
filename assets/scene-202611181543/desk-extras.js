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

// stampante 3D chiusa, al lavoro: e' l'oggetto della sezione "Modellazione e stampa 3D"
function printer(M) {
  const g = new THREE.Group();
  g.name = "printer";
  const W = 0.34, H = 0.42, D = 0.34;
  const base = box(W, 0.05, D, M.dark, 0.008, 2);
  base.position.y = 0.025;
  const top = box(W, 0.03, D, M.dark, 0.008, 2);
  top.position.y = H - 0.015;
  g.add(base, top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = box(0.022, H - 0.08, 0.022, M.dark, 0.004, 1);
    post.position.set(sx * (W / 2 - 0.011), H / 2, sz * (D / 2 - 0.011));
    g.add(post);
  }
  // pannelli in vetro fume'
  const glassMat = new THREE.MeshBasicMaterial({ color: 0x0a1018, transparent: true, opacity: 0.28, depthWrite: false });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.044, H - 0.08), glassMat);
  front.position.set(0, H / 2, D / 2 - 0.004);
  const sideL = front.clone(); sideL.rotation.y = -Math.PI / 2; sideL.position.set(-W / 2 + 0.004, H / 2, 0);
  const sideR = front.clone(); sideR.rotation.y = Math.PI / 2; sideR.position.set(W / 2 - 0.004, H / 2, 0);
  for (const pane of [front, sideL, sideR]) pane.userData.noShadow = true;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.044, H - 0.08), std(0x10141a, 0.6));
  back.position.set(0, H / 2, -D / 2 + 0.004);
  g.add(back, sideL, sideR, front);
  // luce interna
  const led = new THREE.Mesh(new THREE.BoxGeometry(W - 0.08, 0.004, 0.006), lit(2.6, 1.9, 1.1));
  led.position.set(0, H - 0.034, D / 2 - 0.03);
  g.add(led); // niente luce vera qui dentro: ogni luce puntiforme in piu' pesa su tutta la scena
  // piatto e pezzo in stampa: un vaso arrivato a due terzi
  const bed = box(0.24, 0.006, 0.24, std(0x2a2f36, 0.35, 0.6), 0.003, 1);
  bed.position.y = 0.062;
  const pts = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push(new THREE.Vector2(0.03 + 0.022 * Math.sin(t * Math.PI * 1.15) + 0.004 * Math.sin(t * 16), t * 0.12)); }
  const vase = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), new THREE.MeshStandardMaterial({ color: 0xffb44a, roughness: 0.55, side: THREE.DoubleSide, emissive: 0xff9a2a, emissiveIntensity: 0.35 }));
  vase.position.y = 0.065;
  g.add(bed, vase);
  // ponte e carrello in movimento, con l'ugello caldo
  const bridge = new THREE.Group();
  bridge.userData.dynamic = true;
  bridge.position.y = 0.221;
  bridge.add(new THREE.Mesh(new THREE.BoxGeometry(W - 0.05, 0.012, 0.012), M.steel));
  const head = new THREE.Group();
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.014, 10), M.steel);
  nozzle.rotation.x = Math.PI; nozzle.position.y = -0.027;
  const hot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 6), lit(3, 1.2, 0.4));
  hot.position.y = -0.034;
  head.add(box(0.04, 0.04, 0.04, std(0x15181c, 0.5, 0.3), 0.006, 1), nozzle, hot);
  bridge.add(head);
  g.add(bridge);
  // display frontale
  const c = canvas(160, 56), x = c.getContext("2d");
  x.fillStyle = "#1a1206"; x.fillRect(0, 0, 160, 56);
  x.fillStyle = "#FFB44A"; x.font = `700 30px ${FONT}`; x.fillText("62%", 12, 38);
  x.fillRect(84, 22, 40, 6); x.strokeStyle = "#FFB44A"; x.strokeRect(84.5, 22.5, 63, 5);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.0245), new THREE.MeshBasicMaterial({ map: tex(c, { mips: false }), color: new THREE.Color(1.3, 1.3, 1.3) }));
  disp.position.set(-0.09, 0.025, D / 2 + 0.0006);
  g.add(disp);
  // bobina di filamento sul fianco
  const spool = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.02, 12, 36), std(0xffb44a, 0.5));
  spool.rotation.y = Math.PI / 2;
  spool.position.set(W / 2 + 0.024, 0.2, -0.02);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 20), M.dark);
  hub.rotation.z = Math.PI / 2;
  hub.position.copy(spool.position);
  g.add(spool, hub);
  return { group: g, update(t) { head.position.x = Math.sin(t * 1.3) * 0.045; bridge.position.z = Math.cos(t * 0.9) * 0.03; } };
}

// due pezzi stampati accanto alla stampante: un ingranaggio e il guscio di una custodia
function prints() {
  const g = new THREE.Group();
  g.name = "prints";
  const shape = new THREE.Shape(), n = 12;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 0.026 : 0.032;
    i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.008, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const gear = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: false }), std(0xdfe3e0, 0.6));
  gear.rotation.x = -Math.PI / 2;
  gear.position.set(0, 0, 0.06);
  const shell = box(0.07, 0.03, 0.05, std(0xffb44a, 0.55), 0.006, 2);
  shell.position.set(0.01, 0.015, -0.03);
  const cavity = box(0.058, 0.02, 0.038, std(0x7a4a12, 0.8), 0.004, 1);
  cavity.position.set(0.01, 0.0225, -0.03);
  g.add(gear, shell, cavity);
  return g;
}

// richiami anni '60: lampada a fungo, base arancio lucida e cupola opalina accesa
function mushroomLamp() {
  const g = new THREE.Group();
  g.name = "mushroom";
  const prof = [[0, 0], [0.05, 0], [0.052, 0.006], [0.03, 0.016], [0.014, 0.05], [0.012, 0.12], [0.02, 0.135], [0, 0.135]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 40), new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.22, metalness: 0.05 })));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.085, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xfff4e0, emissive: 0xffc98a, emissiveIntensity: 1.25, roughness: 0.4 }));
  dome.scale.y = 0.72;
  dome.position.y = 0.125;
  const under = new THREE.Mesh(new THREE.CircleGeometry(0.085, 40), lit(1.6, 1.1, 0.6));
  under.rotation.x = Math.PI / 2;
  under.position.y = 0.1255;
  g.add(dome, under);
  return g;
}

// Formazione: lavagna di vetro sulla parete destra, con il programma scritto in luce (e' l'oggetto di quella sezione).
// Stessa famiglia del monitor traslucido: vetro fume', scritte piene, un filo di luce ambra sul bordo alto.
function glassBoard(M, lab, label) {
  const g = new THREE.Group();
  g.name = "board";
  const W = 0.46, H = 0.62, CW = 736, CH = 992, PAD = 56, INNER = CW - PAD * 2;
  const c = canvas(CW, CH), x = c.getContext("2d");
  x.fillStyle = "rgba(8, 15, 24, 0.5)";
  x.fillRect(0, 0, CW, CH);
  // va a capo sulle parole e restituisce la quota della riga successiva
  const wrap = (text, y, lineH, maxLines = 9) => {
    let line = "", n = 0;
    for (const word of text.split(" ")) {
      const probe = line ? line + " " + word : word;
      if (line && x.measureText(probe).width > INNER) {
        if (++n === maxLines) { x.fillText(line + "…", PAD, y); return y + lineH; }
        x.fillText(line, PAD, y); y += lineH; line = word;
      } else line = probe;
    }
    x.fillText(line, PAD, y);
    return y + lineH;
  };
  x.fillStyle = "#9DB0BF"; x.font = `650 30px ${FONT}`;
  x.fillText(label, PAD, 82);
  x.fillStyle = "#FFB44A"; x.fillRect(PAD, 104, INNER, 3);
  x.font = `800 82px ${FONT}`;
  let y = wrap(lab.h, 204, 86, 3) - 86 + 62;
  for (const [title, text] of lab.items) {
    x.fillStyle = "rgba(238, 241, 236, 0.28)"; x.fillRect(PAD, y, INNER, 2);
    x.fillStyle = "#EEF1EC"; x.font = `650 36px ${FONT}`;
    x.fillText(title, PAD, y + 50);
    x.fillStyle = "#9DB0BF"; x.font = `400 22px ${FONT}`;
    wrap(text, y + 86, 28, 3);
    y += 172;
  }
  // in basso la scala di sintonia del sito, con l'ago
  const step = INNER / 52, y0 = CH - 92;
  x.fillStyle = "rgba(238, 241, 236, 0.5)";
  for (let i = 0; i <= 52; i++) x.fillRect(PAD + i * step - 1, y0, 2, i % 6 === 0 ? 30 : 15);
  x.fillStyle = "#FFB44A"; x.fillRect(PAD + 30 * step - 2, y0 - 14, 4, 58);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.006),
    new THREE.MeshBasicMaterial({ color: 0x050b12, transparent: true, opacity: 0.42, depthWrite: false }));
  glass.renderOrder = 1;
  glass.userData.dynamic = true; // vetro e scritte restano mesh separate: le trasparenze si disegnano in ordine
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({ map: tex(c), color: new THREE.Color(1.35, 1.35, 1.35), transparent: true, depthWrite: false }));
  face.position.z = 0.0045;
  face.renderOrder = 2;
  face.userData.dynamic = true;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(W, 0.004, 0.008), lit(2.2, 1.3, 0.45));
  edge.position.y = H / 2 + 0.002;
  g.add(glass, face, edge);
  // quattro distanziali cromati la tengono staccata dal muro
  const pinGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.04, 14), capGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.004, 20);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const pin = new THREE.Mesh(pinGeo, M.steel), cap = new THREE.Mesh(capGeo, M.steel);
    pin.rotation.x = cap.rotation.x = Math.PI / 2;
    pin.position.set(sx * (W / 2 - 0.028), sy * (H / 2 - 0.028), -0.02);
    cap.position.set(sx * (W / 2 - 0.028), sy * (H / 2 - 0.028), 0.006);
    g.add(pin, cap);
  }
  return g;
}

export function createExtras(data) {
  const M = {
    dark: std(0x1a1d22, 0.5, 0.3), steel: std(0x8e9399, 0.28, 1),
    knob: std(0x1c2733, 0.38, 0.15), knobCap: std(0x9aa1a6, 0.42, 1), silk: std(0xe9ece6, 0.5),
  };
  const root = new THREE.Group();
  root.name = "extras";
  const place = (o, x, z, ry = 0) => {
    o.position.set(x, DESK.y, z); o.rotation.y = ry;
    shadow(o);
    o.traverse((c) => { if (c.userData.noShadow) c.castShadow = false; });
    root.add(o);
    return o;
  };
  const printerObj = printer(M);
  place(printerObj.group, -0.9, 0.08, 0.28);
  place(prints(), -0.63, 0.1, 0.4);
  place(midiKeyboard(M), 0.6, 0.335, 0.03);
  place(headphones(M), -0.6, 0.31, 0.5);
  place(handheld(M, data.about.projects[0][0]), -0.2, 0.33, -0.2);
  place(cabinet(M), 1.035, -0.27, -0.1);
  place(breadboard(M), 0.27, 0.3, 0.25);
  place(multimeter(M), 0.97, 0.325, 0.35);
  place(toolCup(M), 0.255, -0.14);
  const notes = new THREE.Group();
  notes.name = "notes";
  const block = box(0.05, 0.007, 0.05, std(0xe9a23b, 0.9), 0.0015, 1);
  block.position.y = 0.0035;
  notes.add(block);
  place(notes, -0.03, 0.32, 0.12);
  place(mushroomLamp(), -0.665, -0.31); // tra la stampante e il monitor
  const board = glassBoard(M, data.lab, data.ui.labels.lab);
  board.position.set(1.3 - 0.043, 1.33, -0.02);   // parete destra, rivolta verso la stanza
  board.rotation.y = -Math.PI / 2;
  root.add(board);
  for (const child of root.children) mergeStatic(child);
  return { group: root, printer: printerObj.group, board, update: printerObj.update };
}
