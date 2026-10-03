import * as THREE from 'three';
import { tween, Ease } from './tween.js';

export class Rig {
  constructor(camera) {
    this.cam = camera;
    this.pos = new THREE.Vector3(0, 12, 30);
    this.look = new THREE.Vector3(0, 0, -5);
    this.orbitCfg = null;
    this.shakeAmt = 0;
    this.aspectK = 1;
    this.mouse = new THREE.Vector2();
    this._off = new THREE.Vector3();
  }
  setAspect(a) { this.aspectK = a < 1.5 ? Math.min(1.9, 1.5 / a) : 1; }
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
    this._off.subVectors(this.pos, this.look).multiplyScalar(this.aspectK);
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
