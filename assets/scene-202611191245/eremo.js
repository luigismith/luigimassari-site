// Eremo com'e' davvero: il sintetizzatore generativo nella scatola nera stampata in 3D (150 x 110 x 30 mm) con il
// pannello di compensato inciso al laser. Le scritte sono in gotico: shift/mode e drums/rhythm sopra i due tasti
// quadrati, Spheres, Light, Breath e Sparks sopra le quattro manopole. Al centro il display rotondo con l'onda
// fatta di punti, che qui si muove davvero. Le prese (uscita audio, microfono, USB-C) stanno sul fianco sinistro.
import * as THREE from "three";
import { box, shadow } from "./desk-objects.js";
import { canvas, tex } from "./textures.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S = 0.001;
const W = 150, D = 110, H = 30;
const at = (x, y, z) => V((x - W / 2) * S, z * S, (y - D / 2) * S);   // x da sinistra, y dal retro, z in su (mm)
const GOTHIC = '"Old English Text MT", "UnifrakturMaguntia", "Goudy Old Style", Georgia, serif';

// il pannello: compensato chiaro un po' invecchiato, bordi bruciati, scritte incise scure (6 px per mm)
function panelCanvas() {
  const P = 6, c = canvas(W * P, D * P), x = c.getContext("2d");
  const g = x.createRadialGradient(c.width * 0.45, c.height * 0.4, 40, c.width / 2, c.height / 2, c.width * 0.7);
  g.addColorStop(0, "#d2ad72"); g.addColorStop(0.7, "#bf9659"); g.addColorStop(1, "#8a6436");
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  // venatura leggera
  x.globalAlpha = 0.08; x.strokeStyle = "#5a3a18";
  for (let i = 0; i < 46; i++) { x.lineWidth = 1 + (i % 3); x.beginPath(); x.moveTo(0, i * 15 + (i % 5) * 3); x.bezierCurveTo(c.width * 0.3, i * 15 + 9, c.width * 0.7, i * 15 - 7, c.width, i * 15 + 4); x.stroke(); }
  x.globalAlpha = 1;
  // bordo bruciato dal laser
  x.strokeStyle = "rgba(40, 20, 6, 0.75)"; x.lineWidth = 9; x.strokeRect(4, 4, c.width - 8, c.height - 8);
  const word = (t, mx, my, size) => {
    x.font = `${size * P}px ${GOTHIC}`; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "rgba(30, 16, 6, 0.92)"; x.fillText(t, mx * P, my * P);
  };
  word("shift", 25, 18, 8); word("mode", 25, 58, 8);
  word("drums", 125, 18, 8); word("rhythm", 125, 58, 8);
  [["Spheres", 24], ["Light", 58], ["Breath", 92], ["Sparks", 126]].forEach(([t, mx]) => word(t, mx, 76, 8.5));
  // alone scuro attorno al foro del display e alle cornici dei tasti
  x.fillStyle = "rgba(25, 14, 5, 0.55)";
  x.beginPath(); x.arc(75 * P, 38 * P, 25 * P, 0, Math.PI * 2); x.fill();
  return c;
}

// il display: una superficie d'onda fatta di punti chiari, ridisegnata pochi fotogrammi al secondo
function screenCanvas() {
  const c = canvas(256, 256), x = c.getContext("2d");
  const draw = (t) => {
    x.fillStyle = "#06070a"; x.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 18; row++) {
      const depth = row / 17;
      for (let col = 0; col < 42; col++) {
        const u = col / 41 - 0.5;
        const h = Math.sin(u * 7 + t * 0.9 + row * 0.35) * 0.5 + Math.sin(u * 13 - t * 0.6 + row * 0.2) * 0.25;
        const env = Math.exp(-u * u * 7);
        const px = 128 + u * (150 + depth * 70), py = 90 + depth * 90 - h * env * (38 - depth * 14);
        x.globalAlpha = 0.35 + 0.65 * depth;
        x.fillStyle = "#e9eef2";
        x.fillRect(px, py, 2.2, 2.2);
      }
    }
    x.globalAlpha = 1;
  };
  draw(0);
  return { c, draw };
}

export function createEremo(M, product) {
  const g = new THREE.Group();
  g.name = "synth-" + product.slug;
  const inner = new THREE.Group();
  g.add(inner);
  const std = (color, roughness, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  const pla = std(0x1d1d20, 0.82), black = std(0x121214, 0.55), steel = std(0xb9bcc0, 0.3, 1), brass = std(0x8a6a2c, 0.45, 0.8);

  const body = box(W * S, H * S, D * S, pla, 5 * S, 3);
  body.position.y = (H / 2) * S;
  inner.add(body);
  // il pannello di legno, appena sopra la scatola
  const wood = std(0xffffff, 0.78, 0, { map: tex(panelCanvas()) });
  const panel = new THREE.Mesh(new THREE.BoxGeometry((W - 6) * S, 3 * S, (D - 6) * S), [pla, pla, wood, pla, pla, pla]);
  panel.position.copy(at(W / 2, D / 2, H + 1.5));
  inner.add(panel);
  const top = H + 3;
  for (const [sx, sy] of [[7, 7], [W - 7, 7], [7, D - 7], [W - 7, D - 7]]) {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * S, 2.4 * S, 1 * S, 12), steel);
    screw.position.copy(at(sx, sy, top + 0.5));
    inner.add(screw);
  }
  // display rotondo nella sua cornice nera
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(23 * S, 23 * S, 1.6 * S, 48), black);
  ring.position.copy(at(75, 38, top + 0.8));
  inner.add(ring);
  const scr = screenCanvas(), smap = tex(scr.c, { mips: false });
  const screen = new THREE.Mesh(new THREE.CircleGeometry(20.5 * S, 48), new THREE.MeshBasicMaterial({ map: smap, color: new THREE.Color(1.2, 1.2, 1.2) }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.copy(at(75, 38, top + 1.7));
  screen.userData.dynamic = true;
  inner.add(screen);
  for (const lx of [57, 93]) {           // le due spie sotto il display, con l'anello d'acciaio
    const r = new THREE.Mesh(new THREE.CylinderGeometry(2.2 * S, 2.2 * S, 1 * S, 16), steel);
    r.position.copy(at(lx, 58, top + 0.5));
    inner.add(r);
  }
  // due tasti quadrati in una cornice di ottone
  for (const bx of [25, 125]) {
    const frame = box(15 * S, 2 * S, 15 * S, brass, 1.5 * S, 1), cap = box(11 * S, 5 * S, 11 * S, black, 2 * S, 2);
    frame.position.copy(at(bx, 38, top + 1));
    cap.position.copy(at(bx, 38, top + 3));
    inner.add(frame, cap);
  }
  // quattro manopole nere sui dadi d'acciaio
  for (const kx of [24, 58, 92, 126]) {
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(7.5 * S, 7.5 * S, 2.5 * S, 6), steel);
    nut.position.copy(at(kx, 92, top + 1.25));
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(6.3 * S, 6.8 * S, 9 * S, 20), black);
    knob.position.copy(at(kx, 92, top + 2.5 + 4.5));
    inner.add(nut, knob);
  }
  // prese sul fianco sinistro: uscita audio, ingresso microfono, USB-C
  for (const [y, w] of [[30, 6], [55, 6], [80, 9]]) {
    const hole = new THREE.Mesh(new THREE.BoxGeometry(0.6 * S, (w === 9 ? 3.5 : 6) * S, w * S), black);
    hole.position.copy(at(-0.1, y, 15));
    inner.add(hole);
  }
  // inclinato verso chi guarda, su un cuneo nero: il pannello si legge anche da lontano
  const tilt = 0.24;
  inner.rotation.x = tilt;
  inner.position.y = (D / 2) * S * Math.sin(tilt) + 0.002;
  const wedge = new THREE.Mesh(new THREE.BoxGeometry((W - 20) * S, (D / 2) * S * Math.sin(tilt) * 2, 8 * S), pla);
  wedge.position.set(0, (D / 2) * S * Math.sin(tilt), -(D / 2 - 6) * S);
  g.add(wedge);
  shadow(g);
  let last = -1;
  return {
    group: g, inner, w: W * S, d: D * S, h: H * S, product,
    jacks: [at(-1, 30, 15), at(-1, 55, 15)],
    update(t) {
      const f = Math.floor(t * 12);
      if (f === last) return;
      last = f;
      scr.draw(t);
      smap.needsUpdate = true;
    },
  };
}
