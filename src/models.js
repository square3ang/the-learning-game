import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { tween, Ease, lerp } from './tween.js';

const V3 = THREE.Vector3;

export const std = (color, o = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, flatShading: true, ...o });

export function shadow(root, cast = true, recv = true) {
  root.traverse((o) => {
    if (o.isMesh) { o.castShadow = cast; o.receiveShadow = recv; }
  });
  return root;
}

export function label(html, cls, clickable = false) {
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  const inner = el.firstElementChild || el;
  if (!clickable) inner.style.pointerEvents = 'none';
  return { obj: new CSS2DObject(el), el, inner };
}

export function removeObject(obj) {
  obj.traverse((o) => { if (o.isCSS2DObject && o.element.parentNode) o.element.remove(); });
  obj.removeFromParent();
}

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ---------------- Island (Stage 1) ---------------- */
function makePalm() {
  const g = new THREE.Group();
  const tm = std('#9a6a3c');
  let x = 0, y = 0;
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.15 - i * 0.01, 0.19 - i * 0.01, 0.55, 7), tm);
    s.position.set(x, y + 0.27, 0);
    s.rotation.z = -0.06 * i;
    g.add(s);
    x += 0.04 * i;
    y += 0.5;
  }
  const lm = std('#3fa34d');
  const top = new V3(x, y + 0.1, 0);
  for (let k = 0; k < 7; k++) {
    const geo = new THREE.ConeGeometry(0.34, 2.4, 4);
    geo.translate(0, 1.2, 0);
    geo.scale(1, 1, 0.22);
    const leaf = new THREE.Mesh(geo, lm);
    leaf.position.copy(top);
    leaf.rotation.order = 'YXZ';
    leaf.rotation.y = (k / 7) * Math.PI * 2;
    leaf.rotation.x = 1.2 + Math.random() * 0.25;
    g.add(leaf);
  }
  for (let k = 0; k < 3; k++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), std('#6b4423'));
    c.position.set(x + Math.cos(k * 2.1) * 0.18, y - 0.05, Math.sin(k * 2.1) * 0.18);
    g.add(c);
  }
  return g;
}

export function makeIsland(id, cat) {
  const root = new THREE.Group();
  root.userData.islandId = id;
  const inner = new THREE.Group();
  root.add(inner);

  const sand = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 4.4, 1.8, 10), std('#ecd29a'));
  sand.position.y = -0.1;
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.0, 0.4, 10), std('#74b96e'));
  grass.position.y = 0.95;
  inner.add(sand, grass);
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.3), std('#8d8d86'));
    const a = i * 2.1 + 0.4;
    r.position.set(Math.cos(a) * 3.6, 0.5, Math.sin(a) * 3.6);
    inner.add(r);
  }
  const palm = makePalm();
  palm.position.set(-1.1, 1.1, -0.7);
  inner.add(palm);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.8, 6), std('#dee2e6'));
  pole.position.set(1.4, 1.1 + 1.9, 0.3);
  const fgeo = new THREE.PlaneGeometry(1.4, 0.9, 12, 1);
  fgeo.translate(0.7, 0, 0);
  const flag = new THREE.Mesh(fgeo, new THREE.MeshStandardMaterial({
    color: cat.color, side: THREE.DoubleSide, roughness: 0.6, emissive: cat.color, emissiveIntensity: 0.2,
  }));
  flag.position.set(1.46, 1.8, 0.3);
  inner.add(pole, flag);
  const base = fgeo.attributes.position.array.slice();
  shadow(inner);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.7, 5.4, 48),
    new THREE.MeshBasicMaterial({ color: cat.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.35;
  root.add(ring);

  const { obj: labelObj, el: labelEl, inner: labelInner } = label(
    `<div class="il" style="--c:${cat.color}"><b>${cat.ko}</b><span>${cat.en}</span><i class="cnt"></i></div>`,
    'island-label', true,
  );
  labelObj.position.set(0, 5.8, 0);
  root.add(labelObj);

  const slots = [new V3(0.3, 1.4, 1.7), new V3(-1.4, 1.4, 1.0), new V3(1.7, 1.4, 1.5), new V3(-0.1, 1.4, -1.7)];
  let count = 0, flagY = 1.8, hot = false, shakeT = 0, pulse = 0;

  return {
    id, root, inner, labelObj, labelEl, labelInner,
    setHot(v) { hot = v; labelInner.classList.toggle('hot', v); },
    shake() { shakeT = 0.5; },
    flashRing() { pulse = 1; },
    addBottle(b) {
      const obj = b.root;
      inner.attach(obj);
      const slot = slots[count % slots.length];
      count++;
      flagY = Math.min(1.8 + count * 0.55, 4.35);
      labelInner.querySelector('.cnt').textContent = '●'.repeat(count);
      pulse = 1;
      const p0 = obj.position.clone(), s0 = obj.scale.x, r0 = obj.rotation.clone(), bz0 = b.body.rotation.z;
      const ry = Math.random() * Math.PI * 2;
      return tween(0.5, (k) => {
        obj.position.lerpVectors(p0, slot, k);
        obj.scale.setScalar(lerp(s0, 0.85, k));
        obj.rotation.set(lerp(r0.x, 0, k), lerp(r0.y, ry, k), lerp(r0.z, 0, k));
        b.body.rotation.z = lerp(bz0, 0.18, k);
      }, Ease.backOut);
    },
    update(dt, t) {
      const pa = fgeo.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        const x = base[i * 3];
        pa.array[i * 3 + 2] = Math.sin(x * 3 - t * 6) * 0.12 * (x / 1.4);
      }
      pa.needsUpdate = true;
      flag.position.y += (flagY - flag.position.y) * Math.min(1, dt * 3);
      pulse = Math.max(0, pulse - dt * 1.2);
      const o = Math.max(hot ? 0.75 : 0, pulse * 0.9);
      ring.material.opacity += (o - ring.material.opacity) * Math.min(1, dt * 10);
      ring.scale.setScalar(1 + Math.sin(t * 5) * 0.03 + pulse * 0.25);
      shakeT = Math.max(0, shakeT - dt);
      inner.position.x = Math.sin(t * 50) * 0.25 * shakeT;
    },
  };
}

/* ---------------- Message bottle (Stage 1) ---------------- */
export function makeMessageBottle() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const pts = [[0, 0], [0.34, 0], [0.38, 0.06], [0.38, 0.95], [0.33, 1.12], [0.16, 1.28], [0.13, 1.5], [0.15, 1.56], [0.15, 1.6], [0, 1.6]]
    .map(([x, y]) => new THREE.Vector2(x, y - 0.8));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), new THREE.MeshPhysicalMaterial({
    color: '#b8f0e4', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false,
  }));
  glass.renderOrder = 2;
  const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 16), std('#f6e7c1', { flatShading: false }));
  scroll.position.y = -0.15;
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.035, 8, 20), std('#e03131'));
  ribbon.rotation.x = Math.PI / 2;
  ribbon.position.y = -0.15;
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.11, 0.26, 12), std('#b07a45'));
  cork.position.y = 0.83;
  body.add(scroll, ribbon, cork, glass);
  body.rotation.z = 1.2;
  shadow(body, true, false);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  root.add(hit);
  root.scale.setScalar(1.6);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 2.0, 48),
    new THREE.MeshBasicMaterial({ color: '#8ff7ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  return { root, body, glass, cork, ring };
}

/* ---------------- PET bottle (Stage 2) ---------------- */
export function makeCap(color = '#1c7ed6') {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.14, 18), std(color, { flatShading: false, roughness: 0.4 }));
  m.castShadow = true;
  return m;
}

export function makePetBottle({ tint = null, dirty = false, parts = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const pts = [[0, 0], [0.28, 0], [0.35, 0.06], [0.36, 0.22], [0.32, 0.3], [0.36, 0.38], [0.36, 0.95], [0.3, 1.14], [0.15, 1.3], [0.13, 1.36], [0.13, 1.46], [0, 1.46]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshPhysicalMaterial({
    color: tint || '#e3f6ff', roughness: 0.08, transparent: true, opacity: tint ? 0.85 : 0.42, clearcoat: 1, depthWrite: !!tint,
  }));
  glass.renderOrder = 2;
  glass.castShadow = true;
  body.add(glass);
  const api = { root, body, glass, clear: !tint };

  if (dirty) {
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 1, 20).translate(0, 0.5, 0),
      std('#7a4f24', { transparent: true, opacity: 0.88, flatShading: false }),
    );
    liquid.position.y = 0.04;
    liquid.scale.y = 0.75;
    body.add(liquid);
    const dirt = [];
    const dm = std('#5c3d1e', { transparent: true, opacity: 0.9, flatShading: false });
    for (let k = 0; k < 8; k++) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.05 + Math.random() * 0.06, 10), dm);
      const a = (k / 8) * Math.PI * 2 + Math.random() * 0.5;
      const y = 0.1 + Math.random() * 0.85;
      const r = 0.39;
      d.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
      d.lookAt(Math.sin(a) * 2, y, Math.cos(a) * 2);
      body.add(d);
      dirt.push(d);
    }
    api.setLevel = (l) => { liquid.scale.y = Math.max(0.001, 0.75 * l); liquid.visible = l > 0.01; };
    api.setDirt = (o) => { dm.opacity = 0.9 * o; dirt.forEach((d) => (d.visible = o > 0.02)); };
  }

  if (parts) {
    const ltex = canvasTex(512, 128, (g, w, h) => {
      g.fillStyle = '#e8590c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.fillRect(0, 18, w, 8); g.fillRect(0, h - 26, w, 8);
      g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('FRESH SODA', w / 2, h / 2 + 2);
    });
    api.label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.372, 0.372, 0.42, 28, 1, true),
      new THREE.MeshStandardMaterial({ map: ltex, side: THREE.DoubleSide, roughness: 0.8 }),
    );
    api.label.position.y = 0.66;
    const stex = canvasTex(128, 128, (g) => {
      g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c92a2a'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('SALE', 64, 66);
    });
    api.sticker = new THREE.Mesh(
      new THREE.PlaneGeometry(0.26, 0.26),
      new THREE.MeshStandardMaterial({ map: stex, transparent: true, alphaTest: 0.1, roughness: 0.6, side: THREE.DoubleSide }),
    );
    api.sticker.position.set(0, 0.17, 0.375);
    api.metalCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.14, 18),
      new THREE.MeshStandardMaterial({ color: '#ced4da', metalness: 0.9, roughness: 0.25 }),
    );
    api.metalCap.position.y = 1.43;
    body.add(api.label, api.sticker, api.metalCap);
  }
  shadow(root, true, false);
  return api;
}

/* ---------------- Recycling factory (Stage 2) ---------------- */
function makeBin(w, h, d, color, opacity = 1) {
  const g = new THREE.Group();
  const m = std(color, { transparent: opacity < 1, opacity, flatShading: false });
  const th = 0.08;
  const add = (bw, bh, bd, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
    b.position.set(x, y, z);
    b.castShadow = opacity === 1;
    b.receiveShadow = true;
    g.add(b);
  };
  add(w, th, d, 0, th / 2, 0);
  add(w, h, th, 0, h / 2, d / 2);
  add(w, h, th, 0, h / 2, -d / 2);
  add(th, h, d, w / 2, h / 2, 0);
  add(th, h, d, -w / 2, h / 2, 0);
  return g;
}

export function makeFactory(SX) {
  const root = new THREE.Group();
  const api = { root, beltOn: false, showerOn: false, stations: [], bins: {} };
  const add = (geo, mat, x, y, z, parent = root) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };

  add(new THREE.BoxGeometry(38, 1.2, 15), std('#a3acb6', { flatShading: false, roughness: 0.9 }), 0, 0.4, 0);
  add(new THREE.BoxGeometry(38.2, 0.22, 0.3), std('#ffd43b'), 0, 1.0, 7.5);
  for (const x of [-17, -6, 6, 17]) for (const z of [-6.5, 6.5]) {
    add(new THREE.CylinderGeometry(0.45, 0.55, 8, 8), std('#6c757d'), x, -3.8, z);
  }

  add(new THREE.BoxGeometry(38, 4.2, 0.5), std('#e9ecef', { flatShading: false }), 0, 3.1, -7.2);
  const signTex = canvasTex(1024, 205, (g, w, h) => {
    g.fillStyle = '#2b8a3e'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d3f9d8'; g.lineWidth = 10; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#fff'; g.font = 'bold 100px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('♻ RECYCLING CENTER', w / 2, h / 2 + 6);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(15, 3), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.7 }));
  sign.position.set(0, 3.3, -6.93);
  root.add(sign);

  // conveyor
  add(new THREE.BoxGeometry(30, 0.9, 2.7), std('#343a40', { flatShading: false }), -1, 1.5, 0);
  const beltTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#2b2f33'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#4a5056'; g.fillRect(0, 0, 12, 64);
  });
  beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping;
  beltTex.repeat.set(30, 1);
  add(new THREE.BoxGeometry(30, 0.1, 2.3), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.9 }), -1, 1.98, 0);
  for (const z of [-1.22, 1.22]) add(new THREE.BoxGeometry(30, 0.18, 0.12), std('#ffd43b'), -1, 2.1, z);
  for (const x of [-16, 14]) {
    const r = add(new THREE.CylinderGeometry(0.5, 0.5, 2.7, 14), std('#495057'), x, 1.5, 0);
    r.rotation.x = Math.PI / 2;
  }

  const sigs = ['First,', 'Second,', 'Third,', 'Finally,'];
  const colors = ['#4dabf7', '#f783ac', '#ffa94d', '#69db7c'];
  SX.forEach((x, i) => {
    const m = std(colors[i]);
    add(new THREE.BoxGeometry(0.45, 5.6, 0.45), m, x, 3.8, -1.9);
    add(new THREE.BoxGeometry(0.6, 0.5, 2.9), m, x, 6.35, -0.7);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#333333', emissiveIntensity: 2 });
    add(new THREE.SphereGeometry(0.25, 12, 8), lampMat, x, 6.8, 0);
    const { obj, inner } = label(`<div class="ss" style="--c:${colors[i]}"><span class="sig">${sigs[i]}</span><em>STEP ${i + 1}</em></div>`, 'station-sign');
    obj.position.set(x, 7.7, 0);
    root.add(obj);
    api.stations.push({ x, lampMat, sign: inner, alarmT: 0, base: '#333333' });
  });

  // station 1: shower
  add(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 8), std('#adb5bd'), SX[0], 5.6, 0);
  add(new THREE.CylinderGeometry(0.42, 0.3, 0.16, 14), std('#ced4da', { metalness: 0.6, roughness: 0.3 }), SX[0], 5.05, 0);

  // station 2: non-plastic bin
  const non = makeBin(1.6, 1.3, 1.4, '#868e96');
  non.position.set(SX[1] + 3.2, 1.0, 2.7);
  root.add(non);
  const nl = label(`<div class="bl static">Non-plastic<small>종이 · 스티커 · 금속</small></div>`, 'bin-label');
  nl.obj.position.set(0, 1.9, 0);
  non.add(nl.obj);
  api.bins.non = { root: non, mouth: new V3(SX[1] + 3.2, 2.3, 2.7) };

  // station 3: press
  const head = new THREE.Group();
  add(new THREE.BoxGeometry(1.7, 0.6, 1.7), std('#495057'), 0, 0.42, 0, head);
  add(new THREE.BoxGeometry(1.85, 0.12, 1.85), std('#ffd43b'), 0, 0.06, 0, head);
  head.position.set(SX[2], 4.9, 0);
  root.add(head);
  const piston = add(new THREE.CylinderGeometry(0.2, 0.2, 1, 12), std('#ced4da', { metalness: 0.7, roughness: 0.3 }), SX[2], 5.5, 0);
  api.press = {
    head,
    restBottom: 4.9,
    setBottom(b) {
      head.position.y = b;
      const top = b + 0.72;
      const len = Math.max(0.01, 6.1 - top);
      piston.scale.y = len;
      piston.position.y = top + len / 2;
    },
  };
  api.press.setBottom(4.9);

  // station 4: clear / colored bins
  const mk = (key, color, opacity, x, html) => {
    const b = makeBin(2.0, 1.4, 1.8, color, opacity);
    b.position.set(x, 1.0, 3.0);
    root.add(b);
    const l = label(`<div class="bl">${html}</div>`, 'bin-label', true);
    l.obj.position.set(0, 2.1, 0);
    b.add(l.obj);
    api.bins[key] = { root: b, mouth: new V3(x, 2.4, 3.0), labelEl: l.inner };
  };
  mk('clear', '#a5d8ff', 0.55, SX[3] - 2.6, '🧊 Clear PET<small>투명</small>');
  mk('colored', '#e64980', 1, SX[3] + 2.6, '🎨 Colored<small>유색</small>');

  // decor
  [[-17, -5, '#1971c2'], [-15.7, -5.6, '#2f9e44'], [16.6, -5.2, '#f08c00'], [-17.2, 4.5, '#1971c2']].forEach(([x, z, c]) =>
    add(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 14), std(c, { flatShading: false }), x, 1.7, z));
  add(new THREE.BoxGeometry(1.4, 1.2, 1.4), std('#c69c6d'), 16.5, 1.6, 4.6);
  add(new THREE.BoxGeometry(1.0, 0.9, 1.0), std('#b08050'), 16.6, 2.65, 4.5);
  add(new THREE.CylinderGeometry(0.9, 1.1, 9, 14), std('#40c057', { flatShading: false }), -14, 5.5, -6.2);

  api.update = (dt, t) => {
    if (api.beltOn) beltTex.offset.x -= dt * 1.6;
    for (const st of api.stations) {
      if (st.alarmT > 0) {
        st.alarmT -= dt;
        st.lampMat.emissive.set(Math.sin(t * 30) > 0 ? '#ff2020' : '#300000');
        if (st.alarmT <= 0) st.lampMat.emissive.set(st.base);
      }
    }
  };
  api.alarm = (i) => { api.stations[i].alarmT = 0.9; };
  api.setLamp = (i, color) => { const st = api.stations[i]; st.base = color; st.lampMat.emissive.set(color); };
  api.activeSign = (i) => api.stations.forEach((s, k) => s.sign.classList.toggle('active', k === i));
  return api;
}
