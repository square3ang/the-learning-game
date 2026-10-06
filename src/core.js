import * as THREE from 'three';
import { tween, Ease } from './tween.js';

export class Rig {
  constructor(camera) {
    this.cam = camera;
    this.pos = new THREE.Vector3(0, 12, 30);
    this.look = new THREE.Vector3(0, 0, -5);
    this.orbitCfg = null;
    this.shakeAmt = 0;
    this.W = 1;
    this.H = 1;
    this.ins = { t: 0, b: 0, l: 0, r: 0 };
    this.insT = { t: 0, b: 0, l: 0, r: 0 };
    this.mouse = new THREE.Vector2();
    this._off = new THREE.Vector3();
  }
  setSize(w, h) { this.W = w; this.H = h; }
  // 화면 가장자리를 가리는 UI 영역(px). 카메라는 남은 빈 영역에 장면을 맞춘다.
  setInsets(ins) { this.insT = ins; }
  _frame(dt) {
    const i = this.ins;
    for (const k of ['t', 'b', 'l', 'r']) {
      const d = this.insT[k] - i[k];
      i[k] += d * Math.min(1, dt * (d > 0 ? 6 : 2));
    }
    const { W, H } = this;
    const fw = W - i.l - i.r, fh = H - i.t - i.b;
    const Wf = Math.max(W * 0.4, fw), Hf = Math.max(H * 0.35, fh);
    const cx = i.l + fw / 2, cy = i.t + fh / 2;
    this.cam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    this.cam.updateProjectionMatrix();
    return Math.min(2.4, Math.pow(H / Hf, 0.75) * Math.max(1, (1.5 * Hf) / Wf));
  }
  set(pos, look) { this.orbitCfg = null; this.pos.copy(pos); this.look.copy(look); }
  orbit(center, radius, height, speed) {
    this.orbitCfg = {
      center: center.clone(), radius, height, speed,
      angle: Math.atan2(this.pos.x - center.x, this.pos.z - center.z),
    };
  }
  go(pos, look, dur = 2, ease = Ease.inOut) {
    this.orbitCfg = null;
    const p0 = this.pos.clone(), l0 = this.look.clone();
    return tween(dur, (k) => {
      this.pos.lerpVectors(p0, pos, k);
      this.look.lerpVectors(l0, look, k);
    }, ease);
  }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  update(dt, t, ndc) {
    const o = this.orbitCfg;
    if (o) {
      o.angle += o.speed * dt;
      this.pos.set(o.center.x + Math.sin(o.angle) * o.radius, o.height, o.center.z + Math.cos(o.angle) * o.radius);
      this.look.copy(o.center);
    }
    this.mouse.lerp(ndc, Math.min(1, dt * 2));
    const c = this.cam;
    this._off.subVectors(this.pos, this.look).multiplyScalar(this._frame(dt));
    c.position.copy(this.look).add(this._off);
    c.position.x += Math.sin(t * 0.31) * 0.25 + this.mouse.x * 0.45;
    c.position.y += Math.sin(t * 0.23) * 0.18 + this.mouse.y * 0.25;
    if (this.shakeAmt > 0.001) {
      c.position.x += (Math.random() - 0.5) * this.shakeAmt;
      c.position.y += (Math.random() - 0.5) * this.shakeAmt;
      this.shakeAmt *= Math.exp(-dt * 9);
    }
    c.lookAt(this.look);
  }
}

export class Input {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.ray = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.handlers = null;
    this.plane = new THREE.Plane();
    const up = (e) => { this._ndc(e); this.handlers?.up?.(e); };
    dom.addEventListener('pointerdown', (e) => { this._ndc(e); this.handlers?.down?.(e); });
    window.addEventListener('pointermove', (e) => { this._ndc(e); this.handlers?.move?.(e); });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
  _ndc(e) {
    const r = this.dom.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }
  set(h) { this.handlers = h; this.cursor(''); }
  cursor(c) { this.dom.style.cursor = c || ''; }
  pick(objects) {
    this.ray.setFromCamera(this.ndc, this.camera);
    const hits = this.ray.intersectObjects(objects, true);
    return hits[0] || null;
  }
  planeY(y) {
    this.plane.set(new THREE.Vector3(0, 1, 0), -y);
    this.ray.setFromCamera(this.ndc, this.camera);
    return this.ray.ray.intersectPlane(this.plane, new THREE.Vector3());
  }
}

export function isInside(obj, root) {
  for (let o = obj; o; o = o.parent) if (o === root) return true;
  return false;
}
