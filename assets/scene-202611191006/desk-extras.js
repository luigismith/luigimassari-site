// Altri oggetti sul banco: cuffie, console portatile, cassettiera dei componenti,
// breadboard, multimetro, portautensili, blocchetto. Non sono sezioni del sito: riempiono il banco.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { DESK, box, knob3d, rod, shadow, mergeStatic } from "./desk-objects.js";
import { addTools, std } from "./desk-tools.js";
import { canvas, tex, FONT } from "./textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const litCache = new Map();
const lit = (r, g, b) => { // materiale luminoso (non risente delle luci); condiviso come quelli di std()
  const key = r + "|" + g + "|" + b;
  if (!litCache.has(key)) litCache.set(key, new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) }));
  return litCache.get(key);
};

// cuffie appoggiate sul banco
function headphones(M) {
  // Cuffia chiusa appesa al suo stand: archetto largo e imbottito, forcelle in metallo, cuscinetti morbidi, cavo.
  // E' un comando della scena: toccandola si accende o si spegne il suono; gli anelli ambra sui padiglioni
  // e la spia sulla base dicono lo stato (userData.setOn). L'asse orecchio-orecchio e' x; il davanti e' +z.
  const g = new THREE.Group();
  g.name = "headphones";
  const shell = std(0x17191d, 0.42, 0.25), soft = std(0x24272c, 0.95), cloth = std(0x0b0c0e, 0.85);
  const plate = std(0x2f3842, 0.38, 0.75);
  const accent = new THREE.MeshStandardMaterial({ color: 0xffb44a, roughness: 0.35, metalness: 0.6, emissive: 0xff9a2a, emissiveIntensity: 0 });
  const R = 0.044, CX = 0.076, CY = 0.047;         // raggio del padiglione, distanza dal centro, quota del suo centro
  const BR = 0.078, BY = 0.122;                    // raggio e quota del centro dell'archetto
  const LIFT = 0.0622;                             // di quanto lo stand tiene sollevata la cuffia
  const hp = new THREE.Group();
  hp.position.y = LIFT;
  // guscio tornito: un disco bombato; l'asse del tornio (y) diventa l'asse orecchio-orecchio
  const prof = [[0, -0.013], [0.041, -0.013], [R, -0.008], [R, 0.001], [0.0422, 0.009], [0.036, 0.0155], [0.026, 0.0186], [0, 0.019]]
    .map(([r, h]) => new THREE.Vector2(r, h));
  const shellGeo = new THREE.LatheGeometry(prof, 48);
  const cushionGeo = new THREE.TorusGeometry(0.031, 0.0135, 14, 40);
  const yokeGeo = new THREE.TorusGeometry(R + 0.006, 0.0032, 8, 32, Math.PI);
  for (const sx of [-1, 1]) {
    const cup = new THREE.Group();
    const body = new THREE.Mesh(shellGeo, shell);
    body.rotation.z = -sx * Math.PI / 2;           // la faccia esterna guarda fuori
    const cushion = new THREE.Mesh(cushionGeo, soft);
    cushion.rotation.y = Math.PI / 2;
    cushion.position.x = -sx * 0.021;
    const grille = new THREE.Mesh(new THREE.CircleGeometry(0.03, 32), cloth);
    grille.rotation.y = -sx * Math.PI / 2;
    grille.position.x = -sx * 0.0145;
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.0245, 40), plate);   // piastra in metallo sul fianco
    cap.rotation.y = sx * Math.PI / 2;
    cap.position.x = sx * 0.0192;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0262, 0.0011, 8, 48), accent);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = sx * 0.0188;
    // forcella: mezzo anello intorno al padiglione, con i due perni
    const yoke = new THREE.Mesh(yokeGeo, M.steel);
    yoke.rotation.y = Math.PI / 2;
    yoke.position.x = sx * 0.003;
    cup.add(body, cushion, grille, cap, ring, yoke);
    for (const sz of [-1, 1]) {
      const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.009, 12), M.steel);
      pivot.rotation.x = Math.PI / 2;
      pivot.position.set(sx * 0.003, 0, sz * (R + 0.002));
      cup.add(pivot);
    }
    cup.position.set(sx * CX, CY, 0);
    cup.rotation.z = sx * 0.07;                    // in alto i padiglioni chiudono appena verso l'interno
    hp.add(cup);
    // asta che scorre nell'archetto e blocchetto della cerniera
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.034, 10), M.steel);
    stem.position.set(sx * (CX + 0.0005), CY + R + 0.02, 0);
    const hinge = box(0.012, 0.024, 0.03, shell, 0.004, 2);
    hinge.position.set(sx * BR, BY - 0.004, 0);
    hp.add(stem, hinge);
  }
  // archetto: mezzo anello schiacciato (largo e sottile) e, sotto, l'imbottitura
  const band = new THREE.Mesh(new THREE.TorusGeometry(BR, 0.0042, 12, 56, Math.PI), shell);
  band.scale.z = 3.4;
  band.position.y = BY;
  const padding = new THREE.Mesh(new THREE.TorusGeometry(BR - 0.0056, 0.0044, 10, 40, Math.PI * 0.6), soft);
  padding.scale.z = 2.9;
  padding.rotation.z = Math.PI * 0.2;
  padding.position.y = BY;
  hp.add(band, padding);
  g.add(hp);
  // stand: base tornita, asta che sale dietro e si piega in avanti, sella su cui poggia l'archetto
  const baseProf = [[0, 0], [0.058, 0], [0.062, 0.003], [0.062, 0.008], [0.056, 0.0125], [0, 0.0125]].map(([r, h]) => new THREE.Vector2(r, h));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(baseProf, 56), std(0x1b1e23, 0.4, 0.6)));
  const post = new THREE.CatmullRomCurve3([V(0, 0.012, -0.046), V(0, 0.11, -0.05), V(0, 0.2, -0.048), V(0, 0.232, -0.034), V(0, 0.2365, -0.014)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(post, 40, 0.0062, 14), std(0xb5babd, 0.3, 1)));
  const saddle = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.046, 6, 20), soft);
  saddle.rotation.x = Math.PI / 2;
  saddle.position.set(0, 0.2365, 0.004);
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.0024, 0.002), ledMat);
  led.position.set(0, 0.0056, 0.0616);
  g.add(saddle, led);
  // cavo che scende dal padiglione sinistro e si posa sul banco, con lo spinotto
  const pts = [[-CX, LIFT + 0.006, 0.012], [-CX - 0.006, LIFT - 0.03, 0.03], [-CX + 0.014, 0.016, 0.066], [-0.03, 0.0026, 0.094], [0.02, 0.0026, 0.087], [0.06, 0.0026, 0.112]];
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => V(x, y, z))), 56, 0.0016, 6), shell);
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.022, 10), M.steel);
  plug.rotation.set(Math.PI / 2, 0, -0.75);
  plug.position.set(0.068, 0.0028, 0.119);
  g.add(cable, plug);
  g.userData.setOn = (on) => {
    accent.emissiveIntensity = on ? 1.3 : 0;
    ledMat.color.setRGB(on ? 2.6 : 0.16, on ? 1.6 : 0.1, on ? 0.5 : 0.04);
  };
  g.userData.setOn(false);
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

// --- breadboard --------------------------------------------------------------------------------
// Passo dei fori 2,54 mm. Colonne lungo x; righe a-e dietro il canale centrale, f-j davanti; due binari per lato.
const BB = {
  P: 0.00254, COLS: 47, W: 0.132, D: 0.056, TOP: 0.0085,
  x: (i) => (i - 23) * 0.00254,
  z: (r) => (r < 5 ? -0.00381 - (4 - r) * 0.00254 : 0.00381 + (r - 5) * 0.00254),
  rails: [-0.0232, -0.0206, 0.0206, 0.0232],
};
// disegno del piano: fori, canale, binari di alimentazione con la riga rossa e quella blu
function breadboardTop() {
  const S = 10000, c = canvas(BB.W * S, BB.D * S), x = c.getContext("2d");
  x.fillStyle = "#E7E3D6";
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = "#CDC8B9"; x.fillRect(0, c.height / 2 - 13, c.width, 26);
  x.fillStyle = "#B4AF9F"; x.fillRect(0, c.height / 2 - 13, c.width, 2); x.fillRect(0, c.height / 2 + 11, c.width, 2);
  const px = (m) => c.width / 2 + m * S, pz = (m) => c.height / 2 + m * S;
  const hole = (mx, mz) => {
    x.fillStyle = "#2E2E2A"; x.fillRect(px(mx) - 4.5, pz(mz) - 4.5, 9, 9);
    x.fillStyle = "#F7F4EA"; x.fillRect(px(mx) - 4.5, pz(mz) + 4.5, 9, 1.5);
  };
  for (let i = 0; i < BB.COLS; i++) {
    for (let r = 0; r < 10; r++) hole(BB.x(i), BB.z(r));
    if (i % 6 !== 5) for (const rz of BB.rails) hole(BB.x(i), rz);
  }
  x.fillStyle = "#C8432F"; for (const z of [-0.0256, 0.0183]) x.fillRect(px(-0.06), pz(z) - 1.5, 0.12 * S, 3);
  x.fillStyle = "#3D6FA8"; for (const z of [-0.0183, 0.0256]) x.fillRect(px(-0.06), pz(z) - 1.5, 0.12 * S, 3);
  return tex(c);
}

// breadboard con una scheda a microcontrollore, un integrato, due LED, resistenze, un pulsante, un trimmer e i ponticelli
function breadboard(M) {
  const g = new THREE.Group();
  g.name = "breadboard";
  const { TOP, P } = BB;
  const body = box(BB.W, TOP, BB.D, std(0xe4e0d3, 0.75), 0.0015, 1);
  body.position.y = TOP / 2;
  const top = new THREE.Mesh(new THREE.PlaneGeometry(BB.W - 0.002, BB.D - 0.002), new THREE.MeshStandardMaterial({ map: breadboardTop(), roughness: 0.8 }));
  top.rotation.x = -Math.PI / 2;
  top.position.y = TOP + 0.00015;
  g.add(body, top);
  const at = (i, r, y = TOP) => V(BB.x(i), y, BB.z(r));
  const rail = (i, k) => V(BB.x(i), TOP, BB.rails[k]);
  const ic = std(0x0c0d0f, 0.5, 0.1), gold = std(0xd9b45a, 0.35, 1);
  const leg = (x, z, h = 0.003) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.0006, h, 0.0009), M.steel); m.position.set(x, TOP + h / 2, z); g.add(m); };

  // scheda a microcontrollore innestata a cavallo del canale (piedini nelle righe c e h), con la presa USB a destra
  const x0 = BB.x(31), x1 = BB.x(44), cx = (x0 + x1) / 2, len = x1 - x0 + P;
  for (const r of [2, 7]) {
    const strip = box(len, 0.0026, 0.0025, ic, 0.0004, 1);
    strip.position.set(cx, TOP + 0.0013, BB.z(r));
    g.add(strip);
  }
  const pcb = box(len + 0.003, 0.0016, 0.0205, std(0x0d2a20, 0.45, 0.2), 0.0008, 1);
  pcb.position.set(cx + 0.0015, TOP + 0.0034, 0);
  const pads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.0004, 10), gold, 28);
  const m4 = new THREE.Matrix4();
  let n = 0;
  for (const r of [2, 7]) for (let i = 31; i <= 44; i++) pads.setMatrixAt(n++, m4.makeTranslation(BB.x(i), TOP + 0.0044, BB.z(r)));
  const cpu = box(0.0085, 0.0011, 0.0085, ic, 0.0003, 1);
  cpu.position.set(cx - 0.002, TOP + 0.0048, 0);
  const mem = box(0.004, 0.0009, 0.005, ic, 0.0003, 1);
  mem.position.set(cx - 0.012, TOP + 0.0047, 0.002);
  const usb = box(0.0075, 0.0028, 0.0078, M.steel, 0.0006, 1);
  usb.position.set(x1 + 0.0035, TOP + 0.0056, 0);
  const reset = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 0.0012, 12), M.silk);
  reset.position.set(cx + 0.008, TOP + 0.0049, -0.004);
  const power = new THREE.Mesh(new THREE.BoxGeometry(0.0016, 0.0007, 0.0009), lit(2.6, 1.5, 0.4));
  power.position.set(cx + 0.008, TOP + 0.0046, 0.005);
  g.add(pcb, pads, cpu, mem, usb, reset, power);
  g.userData.usb = V(x1 + 0.0073, TOP + 0.0056, 0); // da qui parte il cavo (lo posa createExtras)

  // integrato a otto piedini a cavallo del canale
  const dip = box(P * 4, 0.0032, 0.0066, ic, 0.0004, 1);
  dip.position.set((BB.x(20) + BB.x(23)) / 2, TOP + 0.0024, 0);
  const notch = new THREE.Mesh(new THREE.CircleGeometry(0.0007, 12), std(0x3a3d42, 0.6));
  notch.rotation.x = -Math.PI / 2;
  notch.position.set(BB.x(20) + 0.0002, TOP + 0.00405, 0.0018);
  g.add(dip, notch);
  for (let i = 20; i <= 23; i++) for (const z of [-0.0037, 0.0037]) leg(BB.x(i), z, 0.0028);

  // due LED: il rosso e' acceso
  const leds = [
    [26, 7, new THREE.MeshStandardMaterial({ color: 0xff5a3d, emissive: 0xff3a22, emissiveIntensity: 2.2, roughness: 0.3 })],
    [28, 7, new THREE.MeshStandardMaterial({ color: 0xffb44a, emissive: 0xff9a2a, emissiveIntensity: 0.12, roughness: 0.3 })],
  ];
  for (const [i, r, mat] of leds) {
    const dome = new THREE.Mesh(new THREE.CapsuleGeometry(0.0024, 0.0034, 6, 14), mat);
    dome.position.set(BB.x(i) + P / 2, TOP + 0.0085, BB.z(r));
    g.add(dome);
    for (const dx of [0, P]) leg(BB.x(i) + dx, BB.z(r), 0.006);
  }

  // due resistenze con le fascette colorate
  const resBody = std(0xd9bd8f, 0.6), bands = [std(0x7a4a22, 0.6), std(0x15171a, 0.6), std(0xc8432f, 0.6)];
  for (const [i, r, span] of [[24, 8, 4], [14, 2, 4]]) {
    const a = at(i, r), b = at(i + span, r), y = TOP + 0.0026, mid = a.clone().lerp(b, 0.5).setY(y);
    const res = new THREE.Mesh(new THREE.CapsuleGeometry(0.0011, 0.0042, 4, 10), resBody);
    res.rotation.z = Math.PI / 2;
    res.position.copy(mid);
    g.add(res, rod(a, V(a.x, y, a.z), 0.00022, M.steel, 5), rod(b, V(b.x, y, b.z), 0.00022, M.steel, 5), rod(V(a.x, y, a.z), V(b.x, y, b.z), 0.00022, M.steel, 5));
    bands.forEach((mat, k) => {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.00118, 0.00118, 0.0005, 10), mat);
      band.rotation.z = Math.PI / 2;
      band.position.set(mid.x - 0.0012 + k * 0.0011, y, mid.z);
      g.add(band);
    });
  }

  // pulsante e trimmer
  const sw = box(0.006, 0.0034, 0.006, ic, 0.0005, 1);
  sw.position.set(BB.x(8) + P / 2, TOP + 0.0017, 0);
  const swCap = new THREE.Mesh(new THREE.CylinderGeometry(0.0017, 0.0017, 0.0016, 14), M.silk);
  swCap.position.set(sw.position.x, TOP + 0.0042, 0);
  const trim = box(0.0066, 0.0048, 0.0066, std(0x2a2f36, 0.5), 0.0006, 1);
  trim.position.set(BB.x(3), TOP + 0.0024, BB.z(7));
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0021, 0.0021, 0.0012, 14), gold);
  screw.position.set(BB.x(3), TOP + 0.0054, BB.z(7));
  g.add(sw, swCap, trim, screw);

  // ponticelli: archi di filo tra un foro e l'altro
  const wireMat = { amber: std(0xffb44a, 0.45), red: std(0xd8432f, 0.45), cream: std(0xeef1ec, 0.45), dark: std(0x22262b, 0.45) };
  const wire = (color, a, b, h) => {
    const side = V(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(0.004); // un po' di pancia di lato
    const curve = new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.12).setY(TOP + h * 0.75), a.clone().lerp(b, 0.5).setY(TOP + h).add(side), a.clone().lerp(b, 0.88).setY(TOP + h * 0.75), b]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.00062, 6), wireMat[color]));
  };
  wire("red", rail(18, 0), at(20, 0), 0.011);
  wire("dark", rail(25, 1), at(23, 1), 0.009);
  wire("amber", at(22, 9), at(35, 9), 0.017);
  wire("cream", at(10, 1), at(21, 0), 0.014);
  wire("cream", at(27, 8), rail(30, 2), 0.008);
  wire("dark", at(7, 8), rail(5, 3), 0.008);
  wire("amber", at(9, 1), at(33, 0), 0.02);
  wire("red", at(4, 9), rail(1, 2), 0.007);
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
// bobina di filamento: due flange forate, il filo avvolto in mezzo, il mozzo. L'asse della bobina e' x.
function filamentSpool(hex = 0xf0a53a, glow = 0.12) {
  const g = new THREE.Group();
  g.name = "spool";
  const RF = 0.092, RW = 0.073, RH = 0.028, WID = 0.058, FT = 0.0035;
  const flange = new THREE.Shape();
  flange.absarc(0, 0, RF, 0, Math.PI * 2, false);
  const cut = (x, y, r) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); flange.holes.push(p); };
  cut(0, 0, 0.012);
  for (let i = 0; i < 6; i++) cut(Math.cos((i / 6) * Math.PI * 2) * 0.058, Math.sin((i / 6) * Math.PI * 2) * 0.058, 0.019);
  const flangeGeo = new THREE.ExtrudeGeometry(flange, { depth: FT, bevelEnabled: false, curveSegments: 40 });
  const plastic = std(0x14161a, 0.45, 0.15);
  for (const x of [WID / 2, -WID / 2 - FT]) {
    const f = new THREE.Mesh(flangeGeo, plastic);
    f.rotation.y = Math.PI / 2; // lo spessore dell'estrusione va lungo x
    f.position.x = x;
    g.add(f);
  }
  // filo avvolto: righe sottili intorno al rocchetto, una per spira
  const col = new THREE.Color(hex), c = canvas(8, 8), x = c.getContext("2d");
  x.fillStyle = "#" + col.getHexString(); x.fillRect(0, 0, 8, 8);
  x.fillStyle = "rgba(0, 0, 0, 0.26)"; x.fillRect(0, 0, 8, 2);
  x.fillStyle = "rgba(255, 255, 255, 0.24)"; x.fillRect(0, 4, 8, 1);
  const filament = new THREE.MeshStandardMaterial({ map: tex(c, { repeat: [1, 30] }), roughness: 0.5, emissive: col, emissiveIntensity: glow });
  const wound = new THREE.Mesh(new THREE.CylinderGeometry(RW, RW, WID, 72, 1, true), filament);
  wound.rotation.z = Math.PI / 2;
  g.add(wound);
  const sideMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.8), roughness: 0.6, emissive: col, emissiveIntensity: glow * 0.6 });
  for (const sx of [-1, 1]) {   // i fianchi dell'avvolgimento, che si vedono dai fori delle flange
    const ring = new THREE.Mesh(new THREE.RingGeometry(RH, RW, 64), sideMat);
    ring.rotation.y = sx * Math.PI / 2;
    ring.position.x = sx * (WID / 2 - 0.0004);
    g.add(ring);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(RH, RH, WID + FT * 2 + 0.004, 32), plastic);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

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
  // bobina di filamento sul fianco destro, sul suo perno; il filo sale e rientra dall'alto verso la testina
  const SX = W / 2 + 0.052, SY = 0.225, SZ = -0.02;
  const spool = filamentSpool();
  spool.position.set(SX, SY, SZ);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.104, 16), M.steel);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(W / 2 + 0.05, SY, SZ);
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 20), M.dark);
  nut.rotation.z = Math.PI / 2;
  nut.position.set(W / 2 + 0.094, SY, SZ);
  const strandMat = new THREE.MeshStandardMaterial({ color: 0xf0a53a, roughness: 0.5, emissive: 0xf0a53a, emissiveIntensity: 0.3 });
  // il filo lascia la bobina dall'alto, fa una curva breve ed entra dal fianco attraverso un passacavo
  const IN = V(W / 2 + 0.002, H - 0.075, SZ + 0.05);
  const path = new THREE.CatmullRomCurve3([V(SX, SY + 0.073, SZ), V(SX + 0.004, SY + 0.098, SZ + 0.022), V(SX - 0.014, SY + 0.118, SZ + 0.042), V(IN.x + 0.014, IN.y + 0.004, IN.z), IN]);
  const strand = new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.0009, 6), strandMat);
  const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0046, 0.016, 14), M.silk);
  inlet.rotation.z = Math.PI / 2;
  inlet.position.copy(IN);
  g.add(spool, axle, nut, strand, inlet);
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
  // titolo: il corpo piu' grande con cui sta in tre righe al massimo
  const countLines = (text) => {
    let line = "", n = 1;
    for (const word of text.split(" ")) {
      const probe = line ? line + " " + word : word;
      if (line && x.measureText(probe).width > INNER) { n++; line = word; } else line = probe;
    }
    return n;
  };
  let size = 82;
  for (const s of [82, 72, 64, 56, 50]) { size = s; x.font = `800 ${s}px ${FONT}`; if (countLines(lab.h) <= (s === 82 ? 2 : 3)) break; }
  const lh = Math.round(size * 1.06);
  let y = wrap(lab.h, 150 + size * 0.72, lh, 3) - lh + 44;
  const itemH = Math.min(172, Math.floor((CH - 110 - y) / lab.items.length)), descLines = itemH >= 160 ? 3 : 2;
  for (const [title, text] of lab.items) {
    x.fillStyle = "rgba(238, 241, 236, 0.28)"; x.fillRect(PAD, y, INNER, 2);
    x.fillStyle = "#EEF1EC"; x.font = `650 36px ${FONT}`;
    x.fillText(title, PAD, y + 50);
    x.fillStyle = "#9DB0BF"; x.font = `400 22px ${FONT}`;
    wrap(text, y + 86, 28, descLines);
    y += itemH;
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
  // Gli oggetti di contorno stanno tutti in "props" e alla fine si uniscono per materiale in poche mesh.
  // Restano gruppi a se' solo quelli cliccabili o animati (stampante, cuffia, lavagna).
  const props = new THREE.Group();
  props.name = "props";
  root.add(props);
  const place = (o, x, z, ry = 0, parent = props) => {
    o.position.set(x, DESK.y, z); o.rotation.y = ry;
    shadow(o);
    o.traverse((c) => { if (c.userData.noShadow) c.castShadow = false; });
    parent.add(o);
    return o;
  };
  const printerObj = printer(M);
  place(printerObj.group, -0.9, 0.08, 0.28, root);
  place(prints(), -0.63, 0.1, 0.4);
  const hp = place(headphones(M), -0.6, 0.33, 0.5, root);
  place(handheld(M, data.about.projects[0][0]), -0.125, 0.335, -0.2);
  place(cabinet(M), 1.035, -0.27, -0.1);
  const bb = place(breadboard(M), 0.19, 0.315, 0.12);
  { // cavo USB della scheda: dalla breadboard gira dietro e sparisce sotto il rialzo degli strumenti
    bb.updateMatrixWorld(true);
    const a = bb.localToWorld(bb.userData.usb.clone()), y = DESK.y + 0.003;
    const usb = new THREE.Group();
    usb.name = "usbcable";
    usb.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, V(a.x + 0.022, a.y - 0.004, a.z - 0.004), V(0.286, y, 0.272), V(0.247, y, 0.22), V(0.232, y, 0.1), V(0.24, y, -0.02), V(0.288, y, -0.088)]), 60, 0.0017, 6), M.dark));
    shadow(usb);
    props.add(usb);
  }
  place(multimeter(M), 0.97, 0.325, 0.35);
  place(toolCup(M), 0.255, -0.14);
  const notes = new THREE.Group();
  notes.name = "notes";
  const block = box(0.05, 0.007, 0.05, std(0xe9a23b, 0.9), 0.0015, 1);
  block.position.y = 0.0035;
  notes.add(block);
  place(notes, 0.025, 0.335, 0.12);
  place(mushroomLamp(), -0.665, -0.31); // tra la stampante e il monitor
  const board = glassBoard(M, data.lab, data.ui.labels.lab);
  board.position.set(1.3 - 0.043, 1.33, -0.02);   // parete destra, rivolta verso la stanza
  board.rotation.y = -Math.PI / 2;
  root.add(board);
  addTools(place, M);
  props.updateMatrixWorld(true);
  for (const child of root.children) mergeStatic(child);
  return { group: root, printer: printerObj.group, board, headphones: hp, update: printerObj.update };
}
