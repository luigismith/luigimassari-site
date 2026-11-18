// Camera: vola tra le viste (1,2 s, easing cubico), segue di poco il mouse (max ±2°)
// e sposta l'inquadratura a sinistra quando a destra c'e' il pannello.
import * as THREE from "three";

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const MAX_PARALLAX = THREE.MathUtils.degToRad(2);

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
    this.pointer = new THREE.Vector2();
    this.smooth = new THREE.Vector2();
    this.current = "overview";
    this.size = { w: 1, h: 1 };
    this._dir = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._look = new THREE.Vector3();
  }

  setSize(w, h) { this.size.w = w; this.size.h = h; }
  setPointer(nx, ny) { this.pointer.set(nx, ny); }

  go(name, { shift = 0, instant = false } = {}) {
    const v = this.views[name];
    if (!v) return Promise.resolve();
    this.current = name;
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

    // parallasse: ruota appena la direzione di vista verso il mouse
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 3.5);
    this.smooth.lerp(this.pointer, k);
    const cam = this.camera;
    cam.position.copy(this.pos);
    this._dir.subVectors(this.target, this.pos);
    const dist = this._dir.length();
    this._dir.normalize();
    this._right.crossVectors(this._dir, THREE.Object3D.DEFAULT_UP).normalize();
    this._up.crossVectors(this._right, this._dir).normalize();
    const amt = Math.tan(MAX_PARALLAX) * dist;
    this._look.copy(this.target)
      .addScaledVector(this._right, this.smooth.x * amt)
      .addScaledVector(this._up, this.smooth.y * amt);
    cam.lookAt(this._look);
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
