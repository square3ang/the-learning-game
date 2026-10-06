import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { World } from './world.js';
import { Particles } from './particles.js';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';
import { Rig, Input } from './core.js';
import { updateTweens } from './tween.js';
import { titleScreen, ending } from './screens.js';
import { runStage1 } from './stage1.js';
import { runStage2 } from './stage2.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.domElement.className = 'labels';
app.appendChild(labels.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1500);
const particles = new Particles(scene);
const world = new World(scene, particles);
const audio = new AudioEngine();
const ui = new UI(audio);
const rig = new Rig(camera);
const input = new Input(camera, renderer.domElement);

const ctx = {
  scene, camera, renderer, world, particles, audio, ui, rig, input,
  updaters: new Set(),
  stats: { first: 0, total: 0 },
  titleText: '',
};
if (location.search.includes('debug')) window.__game = ctx;
ctx.addUpdater = (fn) => { ctx.updaters.add(fn); return () => ctx.updaters.delete(fn); };
ctx.record = (ok) => { ctx.stats.total++; if (ok) ctx.stats.first++; };
ctx.setHealth = (v) => {
  world.setHealth(v);
  ui.setHealth(v);
  audio.setIntensity(v < 0.15 ? 1 : v < 0.35 ? 2 : v < 0.6 ? 3 : 4);
};

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  labels.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  rig.setSize(w, h);
  particles.setScale(h * renderer.getPixelRatio(), camera.fov);
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let T = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  T += dt;
  updateTweens(dt);
  rig.setInsets(ui.insets());
  rig.update(dt, T, input.ndc);
  world.update(dt, camera, rig.look);
  for (const f of ctx.updaters) f(dt, T);
  particles.update(dt);
  renderer.render(scene, camera);
  labels.render(scene, camera);
});

(async () => {
  await titleScreen(ctx);
  if (new URLSearchParams(location.search).get('stage') === '2') ctx.setHealth(0.6);
  else await runStage1(ctx);
  await runStage2(ctx);
  await ending(ctx);
})();
