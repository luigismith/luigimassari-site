// Camera: vola tra le viste (1,2 s, easing cubico) e sposta l'inquadratura quando a sinistra c'e' la scheda.
// Muovere il mouse non sposta nulla. L'inquadratura si cambia a mano: trascinando si gira intorno al punto
// guardato (drag), con la rotella ci si avvicina o allontana (zoomBy). Ogni cambio di vista la rimette a posto.
import * as THREE from "three";

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const RAD = THREE.MathUtils.degToRad;
const clamp = THREE.MathUtils.clamp;
const LIMIT = { yaw: RAD(20), up: RAD(16), down: RAD(13), near: 0.55, far: 1.2 };   // quanto ci si puo' spostare dalla vista
const ROOM = { x0: -1.42, x1: 1.14, y0: 0.86, y1: 2.45, z1: 3.3 };                  // la camera resta dentro la stanza
// Una vista puo' avere un suo "giro" (campo turn): yaw = quanto ci si gira, uguale a sinistra e a destra; pivot =
// intorno a che punto, in frazione del tratto camera-bersaglio (1 = il bersaglio, come un oggetto da girare; 0 = la
// camera stessa, come girare la testa). La vista d'insieme gira a meta' strada: la stanza ruota e la camera trasla un poco.

export class CameraRig {
  constructor(camera, views, { reducedMotion = false } = {}) {
    this.camera = camera;
    this.views = views;
    this.reduced = reducedMotion;
    this.pos = views.overview.pos.clone();
    this.target = views.overview.target.clone();
    this.fov = views.overview.fov || camera.fov;
    this.shift = 0;            // frazione della larghezza (0 = centro)
    this.anim = null;
    this.orbit = { yaw: 0, pitch: 0, zoom: 1 };     // spostamento a mano rispetto alla vista
    this.orbitTo = { yaw: 0, pitch: 0, zoom: 1 };
    this.current = "overview";
    this.turn = { yaw: views.overview.turn?.yaw ?? LIMIT.yaw, pivot: views.overview.turn?.pivot ?? 1 };   // giro della vista corrente
    this.size = { w: 1, h: 1 };
    this._dir = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._pivot = new THREE.Vector3();
    this._tgt = new THREE.Vector3();
    this._pos = new THREE.Vector3();
  }

  setSize(w, h) { this.size.w = w; this.size.h = h; }
  // trascinamento: dx e dy in pixel. La scena segue la mano: trascinando a destra la camera gira a sinistra.
  drag(dx, dy) {
    this.orbitTo.yaw = clamp(this.orbitTo.yaw - dx * RAD(0.13), -this.turn.yaw, this.turn.yaw);
    this.orbitTo.pitch = clamp(this.orbitTo.pitch + dy * RAD(0.11), -LIMIT.down, LIMIT.up);
  }
  // rotella: delta positivo allontana
  zoomBy(delta) { this.orbitTo.zoom = clamp(this.orbitTo.zoom * Math.exp(delta * 0.0011), LIMIT.near, LIMIT.far); }
  resetOrbit() { this.orbitTo.yaw = 0; this.orbitTo.pitch = 0; this.orbitTo.zoom = 1; }
  get orbited() { return Math.abs(this.orbitTo.yaw) + Math.abs(this.orbitTo.pitch) + Math.abs(this.orbitTo.zoom - 1) > 1e-3; }

  go(name, { shift = 0, instant = false } = {}) {
    const v = this.views[name];
    if (!v) return Promise.resolve();
    this.current = name;
    this.turn = { yaw: v.turn?.yaw ?? LIMIT.yaw, pivot: v.turn?.pivot ?? 1 };
    this.resetOrbit();
    const from = { pos: this.pos.clone(), target: this.target.clone(), fov: this.fov, shift: this.shift };
    const to = { pos: v.pos.clone(), target: v.target.clone(), fov: v.fov || from.fov, shift };
    if (this.anim) this.anim.resolve();
    if (instant || this.reduced) {
      this.pos.copy(to.pos); this.target.copy(to.target); this.fov = to.fov; this.shift = to.shift;
      this.anim = null;
      return Promise.resolve();
    }
    const dist = from.pos.distanceTo(to.pos);
    const duration = dist < 0.01 ? 0.5 : 1.2;
    return new Promise((resolve) => { this.anim = { from, to, t: 0, duration, resolve, lift: Math.min(dist * 0.12, 0.12) }; });
  }

  setShift(shift) {
    this._shiftTo = shift;
    if (this.reduced) this.shift = shift;
  }

  get moving() { return !!this.anim; }

  update(dt) {
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.duration);
      const k = ease(a.t);
      this.pos.lerpVectors(a.from.pos, a.to.pos, k);
      this.pos.y += Math.sin(Math.PI * k) * a.lift;
      this.target.lerpVectors(a.from.target, a.to.target, k);
      this.fov = THREE.MathUtils.lerp(a.from.fov, a.to.fov, k);
      this.shift = THREE.MathUtils.lerp(a.from.shift, a.to.shift, k);
      if (a.t >= 1) { this.anim = null; this._shiftTo = a.to.shift; a.resolve(); }
    } else if (this._shiftTo !== undefined && Math.abs(this._shiftTo - this.shift) > 1e-4) {
      this.shift = this.reduced ? this._shiftTo : THREE.MathUtils.damp(this.shift, this._shiftTo, 6, dt);
    }

    // spostamento a mano: prima si ruota la coppia (camera, bersaglio) di yaw intorno al perno della vista, poi si
    // applicano inclinazione e zoom intorno al bersaglio ruotato; la camera resta comunque dentro la stanza
    const o = this.orbit, to = this.orbitTo, k = this.reduced ? 1 : 1 - Math.exp(-dt * 10);
    o.yaw += (to.yaw - o.yaw) * k; o.pitch += (to.pitch - o.pitch) * k; o.zoom += (to.zoom - o.zoom) * k;
    const cam = this.camera;
    const P = this._pivot.lerpVectors(this.pos, this.target, this.turn.pivot), cy = Math.cos(o.yaw), sy = Math.sin(o.yaw);
    const turn = (v, out) => out.set(P.x + (v.x - P.x) * cy + (v.z - P.z) * sy, v.y, P.z - (v.x - P.x) * sy + (v.z - P.z) * cy);
    const tgt = turn(this.target, this._tgt), pos = turn(this.pos, this._pos);
    this._dir.subVectors(pos, tgt);                            // dal punto guardato alla camera
    const len = this._dir.length(), dist = len * o.zoom;
    const yaw = Math.atan2(this._dir.x, this._dir.z);
    const pitch = clamp(Math.asin(this._dir.y / len) + o.pitch, RAD(2), RAD(80));
    cam.position.set(
      clamp(tgt.x + dist * Math.cos(pitch) * Math.sin(yaw), ROOM.x0, ROOM.x1),
      clamp(tgt.y + dist * Math.sin(pitch), ROOM.y0, ROOM.y1),
      Math.min(tgt.z + dist * Math.cos(pitch) * Math.cos(yaw), ROOM.z1));
    cam.lookAt(tgt);
    // a parita' di inquadratura orizzontale: sugli schermi meno larghi si allarga il campo verticale
    const aspect = this.size.w / this.size.h;
    let fov = this.fov;
    if (aspect < 1.6) {
      const half = THREE.MathUtils.degToRad(this.fov / 2);
      fov = Math.min(60, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) * 1.6 / aspect)));
    }
    if (Math.abs(cam.fov - fov) > 1e-4) { cam.fov = fov; cam.updateProjectionMatrix(); }

    const { w, h } = this.size;
    if (Math.abs(this.shift) > 1e-4) cam.setViewOffset(w, h, this.shift * w, 0, w, h);
    else if (cam.view && cam.view.enabled) cam.clearViewOffset();
  }
}
