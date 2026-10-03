import * as THREE from 'three';
import { std } from './models.js';

const V3 = THREE.Vector3;

const WAVE_GLSL = /* glsl */ `
float waveH(vec2 p, float t) {
  return 0.32 * sin(p.x * 0.16 + t * 1.1)
       + 0.24 * sin(p.y * 0.19 + t * 0.85 + p.x * 0.05)
       + 0.10 * sin((p.x + p.y) * 0.42 + t * 1.7)
       + 0.05 * sin(p.x * 0.9 - p.y * 0.7 + t * 2.4);
}`;

export function waveH(x, z, t) {
  return 0.32 * Math.sin(x * 0.16 + t * 1.1)
    + 0.24 * Math.sin(z * 0.19 + t * 0.85 + x * 0.05)
    + 0.1 * Math.sin((x + z) * 0.42 + t * 1.7)
    + 0.05 * Math.sin(x * 0.9 - z * 0.7 + t * 2.4);
}

const SUN_VIS = new V3(-0.25, 0.3, -0.92).normalize();
const LIGHT_DIR = new V3(0.45, 0.85, 0.5).normalize();

const PAL = {
  dirty: { deep: '#1f2b24', shallow: '#4f5c43', sky: '#8b9089', top: '#6b767c', horizon: '#a4a294', sun: '#d8c9a0', hemiSky: '#a5a596', hemiGround: '#3d3a2c', cloud: '#a3a29b', fogNear: 35, fogFar: 190, sunI: 1.6, hemiI: 0.8 },
  clean: { deep: '#0a4c8c', shallow: '#1dbfcf', sky: '#9ed8ff', top: '#2f80e0', horizon: '#c9ecff', sun: '#fff1d0', hemiSky: '#d6eeff', hemiGround: '#6f8f6a', cloud: '#ffffff', fogNear: 110, fogFar: 330, sunI: 2.8, hemiI: 1.1 },
};
const COLOR_KEYS = ['deep', 'shallow', 'sky', 'top', 'horizon', 'sun', 'hemiSky', 'hemiGround', 'cloud'];

const OCEAN_VERT = /* glsl */ `
uniform float uTime;
varying vec3 vWorld;
varying float vH;
${WAVE_GLSL}
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float h = waveH(wp.xz, uTime);
  wp.y += h;
  vH = h;
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const OCEAN_FRAG = /* glsl */ `
uniform float uTime, uFogNear, uFogFar, uMurk;
uniform vec3 uDeep, uShallow, uSky, uSunDir, uSunCol, uFogColor;
varying vec3 vWorld;
varying float vH;
${WAVE_GLSL}
void main() {
  vec2 p = vWorld.xz;
  float e = 0.2;
  float hx = waveH(p + vec2(e, 0.0), uTime) - waveH(p - vec2(e, 0.0), uTime);
  float hz = waveH(p + vec2(0.0, e), uTime) - waveH(p - vec2(0.0, e), uTime);
  vec3 n = normalize(vec3(-hx, 2.0 * e, -hz));
  float d1 = sin(p.x * 1.9 + uTime * 2.2 + sin(p.y * 0.7)) * cos(p.y * 2.3 - uTime * 1.7);
  float d2 = sin(p.y * 3.1 + uTime * 2.9) * cos(p.x * 2.7 + uTime * 1.3 + sin(p.y * 1.1));
  n = normalize(n + vec3(d1, 0.0, d2) * 0.09);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 4.0);
  vec3 base = mix(uDeep, uShallow, clamp(vH * 0.9 + 0.45, 0.0, 1.0));
  float scum = smoothstep(0.3, 0.9, sin(p.x * 0.21 + uTime * 0.15 + sin(p.y * 0.13)) * sin(p.y * 0.17 - uTime * 0.1));
  base = mix(base, vec3(0.28, 0.25, 0.16), scum * uMurk * 0.65);
  vec3 col = mix(base, uSky, clamp(fres * 0.85 + 0.08, 0.0, 1.0));
  vec3 R = reflect(-uSunDir, n);
  float spec = pow(max(dot(R, V), 0.0), 180.0);
  col += uSunCol * spec * 2.2;
  col += uShallow * pow(max(vH * 0.9 + 0.2, 0.0), 2.0) * 0.25;
  float foam = smoothstep(0.52, 0.72, vH + d1 * 0.06);
  col = mix(col, mix(vec3(0.95), vec3(0.62, 0.6, 0.5), uMurk), foam * 0.55);
  float dist = length(cameraPosition - vWorld);
  col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, dist));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const SKY_FRAG = /* glsl */ `
uniform vec3 uTop, uHorizon, uSunDir, uSunCol;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.55, h));
  if (h < 0.0) col = uHorizon;
  float s = max(dot(d, uSunDir), 0.0);
  col += uSunCol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.25 + pow(s, 3.0) * 0.08);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class World {
  constructor(scene, particles) {
    this.scene = scene;
    this.particles = particles;
    this.time = 0;
    this.h = 0;
    this.target = 0;
    this.ending = false;
    this.onSplash = null;
    this.onWhale = null;
    this.p0 = {}; this.p1 = {}; this.cur = {};
    for (const k of COLOR_KEYS) {
      this.p0[k] = new THREE.Color(PAL.dirty[k]);
      this.p1[k] = new THREE.Color(PAL.clean[k]);
      this.cur[k] = new THREE.Color();
    }
    scene.fog = new THREE.Fog(0xffffff, 50, 200);
    this.birdCenter = new V3(0, 0, -14);
    this.fishT = 2;

    this._buildSky();
    this._buildOcean();
    this._buildLights();
    this._buildClouds();
    this._buildTrash();
    this._buildFish();
    this._buildBirds();
    this._buildWhale();
    this._buildRainbow();
    this._apply(0);
  }

  setHealth(v) { this.target = THREE.MathUtils.clamp(v, 0, 1); }
  waveAt(x, z) { return waveH(x, z, this.time); }

  /* ---------- build ---------- */
  _buildSky() {
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
        uSunDir: { value: SUN_VIS }, uSunCol: { value: new THREE.Color() },
      },
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      side: THREE.BackSide, depthWrite: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  _buildOcean() {
    const geo = new THREE.PlaneGeometry(900, 900, 220, 220);
    geo.rotateX(-Math.PI / 2);
    this.oceanMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color() }, uShallow: { value: new THREE.Color() }, uSky: { value: new THREE.Color() },
        uSunDir: { value: SUN_VIS }, uSunCol: { value: new THREE.Color() }, uFogColor: { value: new THREE.Color() },
        uFogNear: { value: 50 }, uFogFar: { value: 200 }, uMurk: { value: 1 },
      },
      vertexShader: OCEAN_VERT, fragmentShader: OCEAN_FRAG,
    });
    this.ocean = new THREE.Mesh(geo, this.oceanMat);
    this.ocean.frustumCulled = false;
    this.scene.add(this.ocean);
  }

  _buildLights() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = -30; c.right = 30; c.top = 30; c.bottom = -30; c.near = 1; c.far = 200;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
  }

  _buildClouds() {
    this.cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, fog: false });
    const geo = new THREE.IcosahedronGeometry(1, 1);
    this.clouds = [];
    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group();
      const n = 4 + ((Math.random() * 3) | 0);
      for (let j = 0; j < n; j++) {
        const m = new THREE.Mesh(geo, this.cloudMat);
        const s = 5 + Math.random() * 6;
        m.scale.set(s * 1.4, s * 0.75, s);
        m.position.set((j - n / 2) * s * 1.1 + Math.random() * 3, Math.random() * 3, Math.random() * 4);
        g.add(m);
      }
      const a = Math.random() * Math.PI * 2, r = 150 + Math.random() * 120;
      g.position.set(Math.cos(a) * r, 45 + Math.random() * 40, Math.sin(a) * r - 60);
      g.rotation.y = Math.random() * Math.PI;
      g.userData.v = 1 + Math.random() * 2;
      this.scene.add(g);
      this.clouds.push(g);
    }
  }

  _buildTrash() {
    const geos = [
      new THREE.CylinderGeometry(0.17, 0.17, 0.62, 8),
      new THREE.BoxGeometry(0.55, 0.32, 0.42),
      new THREE.PlaneGeometry(0.85, 0.7, 2, 2),
      new THREE.TorusGeometry(0.24, 0.07, 6, 12),
      new THREE.CylinderGeometry(0.12, 0.12, 0.36, 8),
    ];
    const mats = ['#e03131', '#f1f3f5', '#74c0fc', '#ffd43b', '#868e96', '#94d82d', '#e599f7', '#fd7e14']
      .map((c) => std(c, { side: THREE.DoubleSide }));
    const avoid = [[-13.5, -13, 6], [-4.7, -15.8, 6], [4.7, -15.8, 6], [13.5, -13, 6], [0, -1.5, 5]];
    this.trash = [];
    let tries = 0;
    while (this.trash.length < 90 && tries++ < 3000) {
      let x, z;
      if (Math.random() < 0.72) { x = (Math.random() * 2 - 1) * 38; z = -48 + Math.random() * 58; }
      else { x = 38 + Math.random() * 52; z = -74 + Math.random() * 54; }
      if (avoid.some(([ax, az, r]) => Math.hypot(x - ax, z - az) < r)) continue;
      if (x > 41 && x < 83 && z > -51 && z < -33) continue;
      const m = new THREE.Mesh(geos[(Math.random() * geos.length) | 0], mats[(Math.random() * mats.length) | 0]);
      m.userData = {
        x, z, thr: 0.04 + Math.random() * 0.92, p: 1, s: 0.8 + Math.random() * 0.7, off: -0.05 + Math.random() * 0.1,
        rx: Math.random() * Math.PI, rz: Math.random() * Math.PI, ph: Math.random() * 6, spin: (Math.random() - 0.5) * 0.4,
      };
      m.position.set(x, 0, z);
      this.scene.add(m);
      this.trash.push(m);
    }
  }

  _buildFish() {
    this.fishPool = [];
    const colors = ['#ff922b', '#c5d4e0', '#ffd43b', '#74c0fc', '#f783ac'];
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      const m = std(colors[i % colors.length]);
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m);
      body.scale.set(0.22, 0.32, 0.62);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 4), m);
      tail.rotation.x = Math.PI / 2;
      tail.scale.set(0.3, 1, 1);
      tail.position.z = -0.72;
      g.add(body, tail);
      g.visible = false;
      this.scene.add(g);
      this.fishPool.push(g);
    }
  }

  _buildBirds() {
    this.birds = [];
    const white = std('#ffffff'), gray = std('#868e96'), orange = std('#ff922b');
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), white);
      body.scale.set(0.24, 0.22, 0.62);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), white);
      head.position.set(0, 0.12, 0.55);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), orange);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, 0.1, 0.78);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3), white);
      tail.position.set(0, 0, -0.65);
      g.add(body, head, beak, tail);
      const wings = [];
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(0.1 * side, 0.08, 0);
        const w = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.42), white);
        w.position.x = 0.65 * side;
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.045, 0.3), gray);
        tip.position.set(1.5 * side, 0, -0.04);
        pivot.add(w, tip);
        g.add(pivot);
        wings.push({ pivot, side });
      }
      g.scale.setScalar(1.1);
      g.userData = { r: 8 + i * 3, hgt: 5.5 + i * 1.3, sp: (0.28 + i * 0.07) * (i % 2 ? -1 : 1), ph: i * 2.1, wings };
      this.scene.add(g);
      this.birds.push(g);
    }
  }

  _buildWhale() {
    const g = new THREE.Group();
    const dark = std('#2f4f75'), light = std('#dbe4ec'), black = std('#111111');
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), dark);
    body.scale.set(1.5, 1.35, 4.6);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), light);
    belly.scale.set(1.25, 1.0, 4.0);
    belly.position.set(0, -0.45, 0.2);
    const stalk = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 10), dark);
    stalk.rotation.x = -Math.PI / 2;
    stalk.position.set(0, 0.1, -5.2);
    g.add(body, belly, stalk);
    for (const s of [-1, 1]) {
      const fluke = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 1.1), dark);
      fluke.position.set(1.0 * s, 0.1, -6.4);
      fluke.rotation.y = 0.35 * s;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.8), dark);
      fin.position.set(1.6 * s, -0.6, 1.4);
      fin.rotation.set(0, 0.3 * s, -0.4 * s);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), black);
      eye.position.set(1.22 * s, 0.05, 2.9);
      g.add(fluke, fin, eye);
    }
    g.visible = false;
    this.whale = g;
    this.whaleAnim = null;
    this.scene.add(g);
  }

  _buildRainbow() {
    this.rainbowMat = new THREE.ShaderMaterial({
      uniforms: { uO: { value: 0 } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uO; varying vec2 vP;
        void main(){
          float t = (length(vP) - 150.0) / 22.0;
          vec3 c = 0.5 + 0.5 * cos(6.2831 * ((1.0 - t) * 0.8 + vec3(0.0, 0.33, 0.67)));
          float a = uO * smoothstep(0.0, 0.2, t) * smoothstep(1.0, 0.8, t) * 0.45;
          gl_FragColor = vec4(c, a);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.rainbow = new THREE.Mesh(new THREE.RingGeometry(150, 172, 96, 1, 0, Math.PI), this.rainbowMat);
    this.rainbow.position.set(0, -30, -300);
    this.rainbow.visible = false;
    this.scene.add(this.rainbow);
  }

  /* ---------- runtime ---------- */
  _apply(h) {
    const c = this.cur;
    for (const k of COLOR_KEYS) c[k].lerpColors(this.p0[k], this.p1[k], h);
    const L = (key) => PAL.dirty[key] + (PAL.clean[key] - PAL.dirty[key]) * h;
    const u = this.oceanMat.uniforms;
    u.uDeep.value.copy(c.deep);
    u.uShallow.value.copy(c.shallow);
    u.uSky.value.copy(c.sky);
    u.uSunCol.value.copy(c.sun);
    u.uFogColor.value.copy(c.horizon);
    u.uFogNear.value = L('fogNear');
    u.uFogFar.value = L('fogFar');
    u.uMurk.value = 1 - h;
    const s = this.skyMat.uniforms;
    s.uTop.value.copy(c.top);
    s.uHorizon.value.copy(c.horizon);
    s.uSunCol.value.copy(c.sun).multiplyScalar(0.5 + 0.5 * h);
    this.scene.fog.color.copy(c.horizon);
    this.scene.fog.near = u.uFogNear.value;
    this.scene.fog.far = u.uFogFar.value;
    this.hemi.color.copy(c.hemiSky);
    this.hemi.groundColor.copy(c.hemiGround);
    this.hemi.intensity = L('hemiI');
    this.sun.color.copy(c.sun);
    this.sun.intensity = L('sunI');
    this.cloudMat.color.copy(c.cloud);
  }

  splashAt(p, s = 1) {
    this.particles.emit({
      pos: new V3(p.x, this.waveAt(p.x, p.z) + 0.1, p.z),
      count: Math.round(14 * s), color: ['#ffffff', '#d0f0ff'],
      speed: 3.2 * Math.sqrt(s), up: 1.3, spread: 0.6, gravity: -11, life: 0.8, size: 0.22 * Math.sqrt(s),
    });
  }

  breach(center) {
    const a = (Math.random() - 0.5) * 0.8 + (Math.random() < 0.5 ? 0 : Math.PI);
    const dir = new V3(Math.cos(a), 0, Math.sin(a));
    this.whaleAnim = {
      t: 0, dur: 3.6, above: false,
      p0: center.clone().addScaledVector(dir, -7),
      p1: center.clone().addScaledVector(dir, 7),
    };
    this.whale.visible = true;
  }
  _whalePos(k) {
    const w = this.whaleAnim;
    const p = w.p0.clone().lerp(w.p1, k);
    p.y = -6 + 40 * k * (1 - k);
    return p;
  }

  update(dt, camera, focus) {
    this.time += dt;
    const t = this.time;
    this.h += (this.target - this.h) * Math.min(1, dt * 1.2);
    this._apply(this.h);
    this.oceanMat.uniforms.uTime.value = t;
    this.sky.position.copy(camera.position);
    this.sun.position.copy(focus).addScaledVector(LIGHT_DIR, 80);
    this.sun.target.position.copy(focus);

    for (const g of this.clouds) {
      g.position.x += dt * g.userData.v;
      if (g.position.x > 320) g.position.x = -320;
    }

    for (const m of this.trash) {
      const d = m.userData;
      const want = this.h < d.thr ? 1 : 0;
      d.p += (want - d.p) * Math.min(1, dt * 1.5);
      m.visible = d.p > 0.02;
      if (!m.visible) continue;
      m.position.y = this.waveAt(d.x, d.z) + d.off - (1 - d.p) * 1.2;
      m.scale.setScalar(d.s * d.p);
      m.rotation.x = d.rx + Math.sin(t * 1.2 + d.ph) * 0.25;
      m.rotation.z = d.rz + Math.cos(t + d.ph) * 0.25;
      m.rotation.y += dt * d.spin;
    }

    // fish
    this.fishT -= dt;
    if (this.fishT <= 0) {
      if (this.ending || this.h > 0.3) {
        const rate = this.ending ? 0.35 : THREE.MathUtils.lerp(6, 1.3, (this.h - 0.3) / 0.7);
        this.fishT = rate * (0.6 + Math.random() * 0.8);
        const f = this.fishPool.find((x) => !x.visible);
        if (f) {
          const a = Math.random() * Math.PI * 2;
          const spread = this.ending ? 30 : 20;
          const p0 = new V3(focus.x + (Math.random() * 2 - 1) * spread, 0, focus.z - 6 - Math.random() * 16);
          if (this.ending) p0.z = focus.z + (Math.random() * 2 - 1) * 25;
          const p1 = p0.clone().add(new V3(Math.cos(a) * 5, 0, Math.sin(a) * 5));
          f.userData = { p0, p1, t: 0, dur: 1 + Math.random() * 0.4, hgt: 1.8 + Math.random() * 1.8 };
          f.visible = true;
          this.splashAt(p0, 0.8);
        }
      } else this.fishT = 1;
    }
    const tmp = new V3();
    for (const f of this.fishPool) {
      if (!f.visible) continue;
      const d = f.userData;
      d.t += dt;
      const k = d.t / d.dur;
      if (k >= 1) { f.visible = false; this.splashAt(d.p1, 0.8); continue; }
      const pos = (kk) => tmp.copy(d.p0).lerp(d.p1, kk).setY(4 * d.hgt * kk * (1 - kk) - 0.2);
      f.position.copy(pos(k));
      f.lookAt(pos(Math.min(1, k + 0.02)));
    }

    // birds
    this.birdCenter.lerp(tmp.copy(focus).add(new V3(0, 0, -16)), Math.min(1, dt * 0.3));
    for (const b of this.birds) {
      const d = b.userData;
      const a = d.ph + t * d.sp;
      const sgn = Math.sign(d.sp);
      b.position.set(this.birdCenter.x + Math.cos(a) * d.r, d.hgt + focus.y * 2.5 + Math.sin(t * 0.7 + d.ph) * 0.8, this.birdCenter.z + Math.sin(a) * d.r);
      tmp.set(-Math.sin(a) * sgn, 0, Math.cos(a) * sgn).add(b.position);
      b.lookAt(tmp);
      b.rotateZ(-0.3 * sgn);
      const f = Math.sin(t * 7 + d.ph) * 0.55;
      for (const w of d.wings) w.pivot.rotation.z = f * w.side;
    }

    // whale
    const w = this.whaleAnim;
    if (w) {
      w.t += dt;
      const k = w.t / w.dur;
      if (k >= 1) { this.whale.visible = false; this.whaleAnim = null; }
      else {
        const pos = this._whalePos(k);
        this.whale.position.copy(pos);
        this.whale.lookAt(this._whalePos(Math.min(1, k + 0.02)));
        const above = pos.y > 0;
        if (above !== w.above) {
          w.above = above;
          this.splashAt(pos, 6);
          this.onSplash?.(1.4);
          if (above) this.onWhale?.();
        }
      }
    }

    const ro = this.rainbowMat.uniforms.uO;
    ro.value += ((this.ending ? 1 : 0) - ro.value) * Math.min(1, dt * 0.4);
    this.rainbow.visible = ro.value > 0.01;
  }
}
