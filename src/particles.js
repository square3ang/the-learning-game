import * as THREE from 'three';

const VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
varying vec3 vC;
varying float vA;
void main() {
  vC = aColor;
  vA = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
varying vec3 vC;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vC, smoothstep(0.5, 0.15, d) * vA);
  #include <colorspace_fragment>
}`;

export class Particles {
  constructor(scene, max = 2400) {
    this.max = max;
    this.i = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.size0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 500 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.c = new THREE.Color();
    this.active = 0;
  }

  setScale(heightPx, fovDeg) {
    this.mat.uniforms.uScale.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
  }

  emit({ pos, count = 20, color = '#ffffff', speed = 4, up = 1, spread = 1, gravity = -9, life = 1, size = 0.3, jitter = 0.15 }) {
    const colors = Array.isArray(color) ? color : [color];
    for (let n = 0; n < count; n++) {
      const i = this.i;
      this.i = (this.i + 1) % this.max;
      const i3 = i * 3;
      this.pos[i3] = pos.x + (Math.random() - 0.5) * jitter * 2;
      this.pos[i3 + 1] = pos.y + (Math.random() - 0.5) * jitter * 2;
      this.pos[i3 + 2] = pos.z + (Math.random() - 0.5) * jitter * 2;
      this.vel[i3] = (Math.random() * 2 - 1) * spread * speed;
      this.vel[i3 + 1] = up * (0.6 + Math.random() * 0.6) * speed;
      this.vel[i3 + 2] = (Math.random() * 2 - 1) * spread * speed;
      this.c.set(colors[(Math.random() * colors.length) | 0]);
      this.col[i3] = this.c.r; this.col[i3 + 1] = this.c.g; this.col[i3 + 2] = this.c.b;
      const l = life * (0.7 + Math.random() * 0.6);
      this.life[i] = l; this.maxLife[i] = l;
      this.grav[i] = gravity;
      this.size0[i] = size * (0.6 + Math.random() * 0.8);
    }
    this.active = this.max;
  }

  update(dt) {
    if (!this.active) return;
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; }
        continue;
      }
      alive++;
      this.life[i] -= dt;
      const i3 = i * 3;
      this.vel[i3 + 1] += this.grav[i] * dt;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alpha[i] = Math.min(1, k * 2.5);
      this.size[i] = this.size0[i] * (0.4 + 0.6 * k);
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = true;
    a.aColor.needsUpdate = true;
    a.aSize.needsUpdate = true;
    a.aAlpha.needsUpdate = true;
    if (!alive) this.active = 0;
  }
}
