import * as THREE from 'three';
import { CRISIS, CATS, CAT_ORDER, QUIZ1 } from './data.js';
import { makeIsland, makeMessageBottle } from './models.js';
import { tween, wait, Ease, lerp, clamp } from './tween.js';
import { fmt } from './ui.js';
import { stageIntro, structureQuiz } from './screens.js';
import { isInside } from './core.js';

const V3 = THREE.Vector3;
const ISLAND_POS = { problem: [-13.5, -13], harm: [-4.7, -15.8], solution: [4.7, -15.8], proposal: [13.5, -13] };
const HOME = new V3(0, 0, -1.5);
const CAM = { pos: new V3(0, 10.5, 16), look: new V3(0, 0.5, -5.5) };

function arc(obj, from, to, h, dur, spin = 0) {
  const rx0 = obj.rotation.x;
  return tween(dur, (k) => {
    obj.position.lerpVectors(from, to, k);
    obj.position.y += 4 * h * k * (1 - k);
    if (spin) obj.rotation.x = rx0 + k * spin;
  }, Ease.linear);
}

export async function runStage1(ctx) {
  const { scene, world, ui, audio, rig, particles, input } = ctx;
  ui.setStage('STAGE 1', 'The Plastic Crisis');
  ctx.setHealth(0);
  audio.setMood('ocean');

  /* ---------- islands rise ---------- */
  const islands = {};
  for (const id of CAT_ORDER) {
    const isl = makeIsland(id, CATS[id]);
    const [x, z] = ISLAND_POS[id];
    isl.root.position.set(x, -6, z);
    isl.labelObj.visible = false;
    scene.add(isl.root);
    islands[id] = isl;
  }
  const islandRoots = CAT_ORDER.map((id) => islands[id].root);
  ctx.addUpdater((dt, t) => { for (const id of CAT_ORDER) islands[id].update(dt, t); });

  await rig.go(CAM.pos, CAM.look, 3);
  for (const id of CAT_ORDER) {
    const isl = islands[id];
    audio.splash(0.8);
    particles.emit({ pos: isl.root.position.clone().setY(0.3), count: 40, color: ['#ffffff', '#cfefff'], speed: 5, up: 1.2, spread: 0.7, gravity: -12, life: 1.1, size: 0.35, jitter: 2 });
    tween(1.2, (k) => { isl.root.position.y = lerp(-6, 0, k); }, Ease.backOut).then(() => {
      isl.labelObj.visible = true;
      audio.pop();
    });
    await wait(0.4);
  }
  await wait(1.2);
  ui.sheetStage1();

  await stageIntro(ctx, {
    badge: 'STAGE 1 · Reading #2',
    title: '바다 청소: <em>The Plastic Crisis</em>',
    body: `
      <p>바다에 떠다니는 <b>문장 병</b>을 열어 읽고, 그 문장이 글의 <b>어느 부분</b>인지 알맞은 섬으로 보내세요.</p>
      <div class="chip-flow">${CAT_ORDER.map((id) => `<span class="fchip" style="--c:${CATS[id].color}"><b>${CATS[id].ko}</b><em>${CATS[id].en}</em></span>`).join('<i>→</i>')}</div>
      <p>병은 <b>글의 순서대로</b> 떠내려와요. <span class="sig">However</span> <span class="sig">Therefore</span> 같은 <b>신호어</b>가 나오면 흐름이 바뀌는 곳이에요!</p>`,
    btn: '병 건지기 시작 ▶',
  });

  /* ---------- bottle helpers ---------- */
  const nearest = (p) => {
    let best = null, bd = 6;
    for (const id of CAT_ORDER) {
      const q = islands[id].root.position;
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  };
  const islandOf = (obj) => CAT_ORDER.find((id) => isInside(obj, islands[id].root));
  const clearHot = () => CAT_ORDER.forEach((id) => islands[id].setHot(false));

  function clickOn(b, s) {
    s.glow = true;
    return new Promise((res) => {
      input.set({
        down() {
          if (input.pick([b.root])) { input.set(null); s.glow = false; res(); }
        },
        move() { input.cursor(input.pick([b.root]) ? 'pointer' : ''); },
      });
    });
  }

  async function openBottle(b) {
    audio.pop();
    const wp = new V3();
    b.cork.getWorldPosition(wp);
    particles.emit({ pos: wp, count: 30, color: ['#fff3bf', '#ffffff', '#8ff7ff'], speed: 3, up: 1, spread: 1, gravity: -3, life: 1, size: 0.25 });
    await tween(0.6, (k) => {
      b.cork.position.y = 0.83 + k * 2.2;
      b.cork.rotation.x = k * 8;
      b.cork.scale.setScalar(1 - k * 0.99);
    }, Ease.out);
    b.cork.visible = false;
  }

  function waitDrop(b, s) {
    return new Promise((res) => {
      const offs = [];
      let done = false;
      const finish = (id) => {
        if (done) return;
        done = true;
        input.set(null);
        offs.forEach((f) => f());
        clearHot();
        res(id);
      };
      for (const id of CAT_ORDER) {
        const el = islands[id].labelInner;
        const h = () => { if (s.mode !== 'drag') { audio.click(); finish(id); } };
        el.addEventListener('click', h);
        offs.push(() => el.removeEventListener('click', h));
      }
      input.set({
        down() {
          if (input.pick([b.root])) {
            s.mode = 'drag';
            s.target.copy(b.root.position).setY(1.6);
            audio.grab();
            input.cursor('grabbing');
            return;
          }
          const hit = input.pick(islandRoots);
          if (hit) { const id = islandOf(hit.object); if (id) { audio.click(); finish(id); } }
        },
        move() {
          if (s.mode === 'drag') {
            const p = input.planeY(1.6);
            if (p) s.target.set(clamp(p.x, -22, 22), 1.6, clamp(p.z, -24, 7));
            const near = nearest(b.root.position);
            CAT_ORDER.forEach((id) => islands[id].setHot(id === near));
          } else {
            input.cursor(input.pick([b.root]) ? 'grab' : input.pick(islandRoots) ? 'pointer' : '');
          }
        },
        up() {
          if (s.mode !== 'drag') return;
          input.cursor('');
          const near = nearest(b.root.position);
          if (near) finish(near);
          else { s.mode = 'float'; clearHot(); }
        },
      });
    });
  }

  async function bounceBack(b, s, id) {
    s.mode = 'anim';
    const isl = islands[id];
    const from = b.root.position.clone();
    const to = isl.root.position.clone().setY(2.4);
    await arc(b.root, from, from.clone().lerp(to, 0.8), 2.0, 0.35);
    audio.wrong();
    isl.shake();
    rig.shake(0.2);
    const back = HOME.clone().setY(world.waveAt(HOME.x, HOME.z) + 0.2);
    await arc(b.root, b.root.position.clone(), back, 3.2, 0.7, Math.PI * 2);
    audio.splash(0.4);
    world.splashAt(back, 1);
    s.mode = 'float';
  }

  async function plant(b, s, id) {
    s.mode = 'anim';
    s.glow = false;
    const isl = islands[id];
    const from = b.root.position.clone();
    const to = isl.root.position.clone().add(new V3(0, 3.2, 0));
    audio.whoosh();
    await arc(b.root, from, to, 3.5, 0.75, Math.PI * 2);
    audio.correct();
    audio.splash(0.5);
    ui.flash('good');
    particles.emit({ pos: to, count: 60, color: [CATS[id].color, '#ffffff'], speed: 6, up: 1, spread: 1, gravity: -8, life: 1.2, size: 0.35 });
    scene.remove(b.ring);
    await isl.addBottle(b);
  }

  /* ---------- main loop ---------- */
  const N = CRISIS.length;
  for (let i = 0; i < N; i++) {
    const item = CRISIS[i];
    const b = makeMessageBottle();
    scene.add(b.root, b.ring);
    const s = { mode: 'anim', target: new V3(), glow: false };
    const off = ctx.addUpdater((dt, t) => {
      const p = b.root.position;
      if (s.mode === 'float') {
        const k = Math.min(1, dt * 3);
        p.x += (HOME.x - p.x) * k;
        p.z += (HOME.z - p.z) * k;
        p.y = world.waveAt(p.x, p.z) + 0.2;
        b.root.rotation.set(Math.cos(t * 1.1) * 0.12, b.root.rotation.y * 0.98, Math.sin(t * 1.3) * 0.15);
      } else if (s.mode === 'drag') {
        p.lerp(s.target, 1 - Math.exp(-dt * 14));
        b.root.rotation.x *= 0.9;
        b.root.rotation.z = Math.sin(t * 8) * 0.12;
      }
      b.ring.position.set(p.x, world.waveAt(p.x, p.z) + 0.08, p.z);
      const want = s.glow ? 0.45 + 0.25 * Math.sin(t * 4) : s.mode === 'float' || s.mode === 'drag' ? 0.15 : 0;
      b.ring.material.opacity += (want - b.ring.material.opacity) * Math.min(1, dt * 6);
      b.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.08);
    });

    const sx = (Math.random() * 2 - 1) * 10, sz = -46;
    audio.whoosh();
    await tween(2.6, (k) => {
      const x = lerp(sx, HOME.x, k), z = lerp(sz, HOME.z, k);
      b.root.position.set(x, world.waveAt(x, z) + 0.2, z);
      b.root.rotation.y = (1 - k) * 2;
    }, Ease.out);
    s.mode = 'float';

    ui.guide(i === 0
      ? '반짝이는 <b>문장 병</b>을 클릭해서 열어 보세요!'
      : `<b>${i + 1}번째</b> 병이 떠내려왔어요. 클릭해서 열어 보세요!`);
    await clickOn(b, s);
    ui.guide(null);
    await openBottle(b);

    const card = ui.card(`
      <div class="card-head"><span class="pill">🍾 병 ${i + 1} / ${N}</span><span class="q">이 문장은 글의 어느 부분일까요?</span></div>
      <p class="en">${fmt(item.text)}</p>
      <div class="ko hidden">${item.ko}</div>
      <div class="card-foot">
        <button class="btn ghost" data-act="ko">🔍 해석 보기</button>
        <span class="hint-txt">🖐️ 병을 끌어서 알맞은 섬에 던지세요</span>
      </div>
      <div class="feedback"></div>`);
    ui.guide(i === 0
      ? '🖐️ 병을 <b>끌어서</b> 알맞은 섬에 던지세요! (섬 이름표를 클릭해도 돼요)'
      : i === 1 ? '💡 빨간 박스 <span class="sig">신호어</span>가 결정적 단서예요!' : null);

    let tries = 0;
    for (;;) {
      const id = await waitDrop(b, s);
      tries++;
      if (id === item.cat) break;
      ui.flash('bad');
      ui.feedback(card, `✖ <b>${CATS[id].ko}</b> 섬이 아니에요. 💡 ${fmt(item.hint)}`);
      await bounceBack(b, s, id);
    }
    ui.guide(null);
    ctx.record(tries === 1);
    await plant(b, s, item.cat);
    off();

    ctx.setHealth(((i + 1) / N) * 0.6);
    ui.sheetAdd1(item.cat, item.sum);
    const cat = CATS[item.cat];
    const done = ui.card(`
      <div class="card-head"><span class="pill c" style="--c:${cat.color}">✔ ${cat.ko}</span><span class="q">${tries === 1 ? '한 번에 정답! 🎉' : '정답!'} 바다가 조금 맑아졌어요.</span></div>
      <p class="en">${fmt(item.text)}</p>
      <div class="ko">${item.ko}</div>
      <div class="note"><b>🔑 단서</b> ${fmt(item.note)}</div>
      <div class="card-foot"><button class="btn primary" data-next>${i === N - 1 ? '결과 보기 ▶' : '다음 병 ▶'}</button></div>`);
    await ui.waitClick(done, '[data-next]');
  }

  /* ---------- wrap-up ---------- */
  ui.hideCard();
  ui.guide('🎉 모든 병이 제자리를 찾았어요! 네 개의 섬이 <b>글의 흐름</b>을 보여 주고 있어요.');
  audio.fanfare();
  CAT_ORDER.forEach((id, k) => setTimeout(() => {
    islands[id].flashRing();
    particles.emit({ pos: islands[id].root.position.clone().setY(5), count: 50, color: [CATS[id].color, '#ffffff'], speed: 5, up: 1, spread: 1, gravity: -6, life: 1.4, size: 0.35 });
  }, k * 250));
  await rig.go(new V3(0, 15, 22), new V3(0, 0, -10), 2.4);
  await wait(1.4);
  ui.guide(null);
  await structureQuiz(ctx, QUIZ1);
  input.set(null);
}
