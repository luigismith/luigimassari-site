// Ichosynth com'e' davvero (github.com/luigismith/ichosynth): una scatola piatta con la griglia di 16x16 LED
// sotto un diffusore satinato e, a destra, il pannello con lo schermo OLED, quattro manopole colorate e i
// tre tasti PLAY, MENU, REC. Sulla griglia ogni riga e' una voce e ogni colonna un passo: qui il cursore
// di riproduzione avanza davvero, a tempo.
import * as THREE from "three";
import { box, shadow } from "./desk-objects.js";
import { canvas, tex, FONT } from "./textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const N = 16, PX = 16;                       // celle per lato, pixel per cella nella texture
const ROWS = ["#ff4b3e", "#ff8a2a", "#ffc93c", "#9be15d", "#3ddc97", "#35c9e8", "#4d8dff", "#8f6bff", "#d15bff", "#ff5fa8", "#ff7a59"];

// disegno dei passi accesi (fisso, con un seme) e del cursore
function pattern() {
  let seed = 404;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cells = [];
  for (let r = 0; r < N; r++) {
    const voice = r < ROWS.length;
    for (let c = 0; c < N; c++) {
      const on = voice && (r < 3 ? c % 4 === (r === 1 ? 2 : 0) || rnd() < 0.12 : rnd() < 0.2);
      if (on) cells.push([r, c, ROWS[r]]);
    }
  }
  return cells;
}

function gridCanvas() {
  const c = canvas(N * PX, N * PX), x = c.getContext("2d"), cells = pattern();
  const draw = (step) => {
    x.fillStyle = "#000";
    x.fillRect(0, 0, c.width, c.height);
    // il cursore: una colonna appena schiarita
    x.fillStyle = "rgba(255, 255, 255, 0.10)";
    x.fillRect(step * PX, 0, PX, c.height);
    for (const [r, col, color] of cells) {
      const cx = (col + 0.5) * PX, cy = (r + 0.5) * PX, hot = col === step;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, PX * (hot ? 1.15 : 0.85)); // il diffusore allarga e sfuma ogni LED
      g.addColorStop(0, hot ? "#ffffff" : color);
      g.addColorStop(0.35, color);
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      x.globalAlpha = hot ? 1 : 0.62;
      x.fillStyle = g;
      x.fillRect(cx - PX * 1.2, cy - PX * 1.2, PX * 2.4, PX * 2.4);
    }
    x.globalAlpha = 1;
  };
  draw(0);
  return { c, draw };
}

function oledCanvas() {
  const c = canvas(256, 128), x = c.getContext("2d");
  x.fillStyle = "#02060a";
  x.fillRect(0, 0, 256, 128);
  x.fillStyle = "#dff3ff";
  x.font = "700 26px ui-monospace, Consolas, monospace";
  x.fillText("CH1 DRUM", 10, 30);
  x.fillText("PLAY 120 BPM", 10, 62);
  x.fillText("VOL", 10, 94);
  x.fillRect(70, 76, 120, 16);
  x.fillText("PAGE 1/4", 10, 122);
  return c;
}

export function createIchosynth(M, product) {
  const W = 0.215, D = 0.172, H = 0.026;
  const g = new THREE.Group();
  g.name = "synth-" + product.slug;
  const inner = new THREE.Group();
  g.add(inner);
  const shell = new THREE.MeshStandardMaterial({ color: 0x5b5e63, roughness: 0.72, metalness: 0.05 });   // PLA grigio
  const dark = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.6, metalness: 0.1 });
  const body = box(W, H, D, shell, 0.006, 3);
  body.position.y = H / 2;
  inner.add(body);
  // diffusore satinato sopra la matrice di LED
  const GW = 0.16, gx = -W / 2 + 0.006 + GW / 2;
  const grid = gridCanvas(), gmap = tex(grid.c, { mips: false });
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(GW, 0.003, GW), [shell, shell,
    new THREE.MeshStandardMaterial({ color: 0x70757a, roughness: 0.5, emissive: 0xffffff, emissiveMap: gmap, emissiveIntensity: 2.1 }),   // satinato, scuro a luci basse: i LED si leggono
    shell, shell, shell]);
  diffuser.position.set(gx, H + 0.0012, 0);
  diffuser.userData.dynamic = true;
  inner.add(diffuser);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.001, 10), M.steel);
    screw.position.set(gx + sx * (GW / 2 - 0.006), H + 0.0031, sz * (GW / 2 - 0.006));
    inner.add(screw);
  }
  // pannello dei comandi, un gradino piu' alto
  const PW = 0.043, px = W / 2 - 0.004 - PW / 2, top = H + 0.006;
  const panel = box(PW, 0.008, D - 0.008, dark, 0.003, 2);
  panel.position.set(px, H + 0.002, 0);
  inner.add(panel);
  const nc = canvas(256, 48), nx = nc.getContext("2d");
  nx.fillStyle = "#26282c"; nx.fillRect(0, 0, 256, 48);
  nx.fillStyle = "#6f747b"; nx.font = `700 34px ${FONT}`; nx.textAlign = "center";
  nx.fillText("ichosynth", 128, 36);
  const name = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.0064), new THREE.MeshStandardMaterial({ map: tex(nc), roughness: 0.6 }));
  name.rotation.x = -Math.PI / 2;
  name.position.set(px, top + 0.0002, -0.068);
  const bezel = box(0.03, 0.002, 0.016, M.black, 0.0008, 1);
  bezel.position.set(px, top + 0.0006, -0.046);
  const oled = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.012), new THREE.MeshBasicMaterial({ map: tex(oledCanvas(), { mips: false }), color: new THREE.Color(1.5, 1.5, 1.5) }));
  oled.rotation.x = -Math.PI / 2;
  oled.position.set(px, top + 0.0018, -0.046);
  inner.add(name, bezel, oled);
  // quattro manopole: E2 verde ed E3 gialla sopra, E1 blu ed E4 rosa sotto
  [[-1, -0.014, 0x8fd69a], [1, -0.014, 0xf0dc8a], [-1, 0.02, 0x8fb0f0], [1, 0.02, 0xf09ac0]].forEach(([sx, z, color]) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.0074, 0.0078, 0.012, 22), mat);
    knob.position.set(px + sx * 0.0098, top + 0.006, z);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0062, 0.0074, 0.0016, 22), mat);
    cap.position.set(px + sx * 0.0098, top + 0.0128, z);
    inner.add(knob, cap);
  });
  // tre tasti: PLAY, MENU, REC
  for (let i = -1; i <= 1; i++) {
    const key = box(0.0098, 0.004, 0.02, M.black, 0.001, 1);
    key.position.set(px + i * 0.0122, top + 0.002, 0.06);
    inner.add(key);
  }
  inner.position.y = 0.003;                     // piedini
  shadow(g);
  let last = -1;
  return {
    group: g, inner, w: W, d: D, h: H, product,
    jacks: [V(W / 2 - 0.03, H * 0.55, -D / 2 - 0.002)],   // le uscite sono sul retro
    // il cursore avanza di un sedicesimo alla volta, a 96 battiti al minuto
    update(t) {
      const step = Math.floor(t / (60 / 96 / 4)) % N;
      if (step === last) return;
      last = step;
      grid.draw(step);
      gmap.needsUpdate = true;
    },
  };
}
