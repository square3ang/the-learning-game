import * as THREE from 'three';
import { STEPS, REASONS, TOOLS, RECYCLE_INTRO, RECYCLE_OUTRO, QUIZ2 } from './data.js';
import { makeFactory, makePetBottle, makeCap, label, removeObject } from './models.js';
import { tween, wait, Ease, lerp } from './tween.js';
import { fmt, shuffle } from './ui.js';
import { stageIntro, structureQuiz, titleQuiz } from './screens.js';
import { isInside } from './core.js';

const V3 = THREE.Vector3;
const FP = new V3(62, 0, -42);
const SX = [-9, -3, 3, 9];
const BELT_Y = 2.03;
const BS = 1.75;

export async function runStage2(ctx) {
  const { scene, ui, audio, rig, particles, input } = ctx;
  const W = (x, y, z) => new V3(x, y, z).add(FP);

  const fac = makeFactory(SX);
  fac.root.position.copy(FP);
  scene.add(fac.root);
  ctx.addUpdater((dt, t) => fac.update(dt, t));

  ui.setStage('STAGE 2', 'Recycling Steps');
  ui.guide('♻️ 다음 목적지: <b>재활용 공장</b>!');
  audio.whoosh();
  audio.gull();
  audio.setMood('factory');
  await rig.go(W(0, 13, 26), W(0, 2.5, -1), 3.6);
  ui.guide(null);
  ui.sheetStage2();

  await stageIntro(ctx, {
    badge: 'STAGE 2 · Reading #3',
    title: '재활용 공장: <em>올바른 처리 절차</em>',
    body: `
      <p class="en">${fmt(RECYCLE_INTRO.text)}</p>
      <div class="ko hidden">${RECYCLE_INTRO.ko}</div>
      <button class="btn ghost" data-act="ko">🔍 해석 보기</button>
      <p>지저분한 페트병 하나를 <b>올바른 순서(procedure)</b>대로 처리해 보세요.<br>
      정류장마다 <span class="sig">First,</span> <span class="sig">Second,</span> <span class="sig">Third,</span> <span class="sig">Finally,</span> 신호어가 순서를 알려 줘요.</p>`,
    btn: '공장 가동 ▶',
  });

  /* ---------- bottle ---------- */
  const bot = makePetBottle({ dirty: true, parts: true });
  bot.root.scale.setScalar(BS);
  bot.root.position.set(-16, BELT_Y, 0);
  fac.root.add(bot.root);
  let wob = 0;
  ctx.addUpdater((dt, t) => {
    wob *= Math.exp(-dt * 4);
    bot.body.rotation.z = Math.sin(t * 26) * wob * 0.12;
    if (fac.showerOn) {
      particles.emit({ pos: W(SX[0], 4.9, 0), count: 3, color: ['#a5d8ff', '#d0ebff', '#74c0fc'], speed: 3, up: -1, spread: 0.12, gravity: -14, life: 0.45, size: 0.14, jitter: 0.2 });
    }
  });

  async function moveTo(obj, x, dur) {
    fac.beltOn = true;
    audio.setHum(true);
    audio.clunk();
    const x0 = obj.position.x;
    await tween(dur, (k) => { obj.position.x = lerp(x0, x, k); }, Ease.inOut);
    fac.beltOn = false;
    audio.setHum(false);
  }
  const camFor = (i) => (i === 3
    ? [W(SX[3] + 1, 7, 13), W(SX[3], 2.8, 1.2)]
    : [W(SX[i] + 1.8, 6.4, 12.5), W(SX[i], 3.6, 0)]);
  const bottleTop = (y) => W(bot.root.position.x, BELT_Y + y, 0);

  /* ---------- step 1: choose tool ---------- */
  async function chooseTool(i) {
    const st = STEPS[i];
    const order = shuffle(Object.keys(TOOLS));
    const card = ui.card(`
      <div class="card-head"><span class="pill c" style="--c:${st.color}">STEP ${i + 1} / 4</span><span class="q">문장을 읽고, 이 정류장에서 할 작업을 고르세요.</span></div>
      <p class="en"><span class="sig">${st.sig}</span> ${fmt(st.text)}</p>
      <div class="ko hidden">${st.ko}</div>
      <div class="tool-row">${order.map((k) => `<button class="tool" data-tool="${k}"><span class="ti">${TOOLS[k].icon}</span>${TOOLS[k].ko}</button>`).join('')}</div>
      <div class="card-foot"><button class="btn ghost" data-act="ko">🔍 해석 보기</button></div>
      <div class="feedback"></div>`);
    if (i === 0) ui.guide('🏭 신호어 <span class="sig">First,</span> 가장 먼저 할 일! 문장 속 <b>동사</b>를 찾아보세요.');
    let tries = 0;
    for (;;) {
      const b = await ui.waitClick(card, '[data-tool]');
      tries++;
      if (b.dataset.tool === st.tool) { b.classList.add('ok'); break; }
      b.classList.remove('no'); void b.offsetWidth; b.classList.add('no');
      audio.beep();
      fac.alarm(i);
      rig.shake(0.15);
      ui.flash('bad');
      const doneBefore = STEPS.findIndex((s) => s.tool === b.dataset.tool) < i;
      ui.feedback(card, `🚨 삐빅! ${doneBefore ? '이미 끝낸 작업이에요.' : '이 단계의 작업이 아니에요.'} 💡 ${st.toolHint}`);
    }
    ui.guide(null);
    ctx.record(tries === 1);
    audio.correct();
    await wait(0.4);
  }

  /* ---------- actions ---------- */
  async function actRinse() {
    const card = ui.card(`
      <div class="card-head"><span class="pill">🚿 ACTION</span><span class="q">병을 <span class="key">thoroughly emptied</span> and <span class="key">rinsed</span>! (완전히 비우고 헹구기)</span></div>
      <div class="meter"><i></i></div>
      <p class="hint-txt">🖱️ 화면을 <b>누른 채로 문질러</b> 병을 씻어 주세요. (터치도 가능)</p>`);
    const bar = card.querySelector('.meter i');
    fac.showerOn = true;
    audio.splash(0.3);
    await new Promise((res) => {
      let prog = 0, down = false, lx = 0, ly = 0, acc = 0;
      input.set({
        down(e) { down = true; lx = e.clientX; ly = e.clientY; input.cursor('grabbing'); },
        move(e) {
          if (!down) { input.cursor('grab'); return; }
          const d = Math.hypot(e.clientX - lx, e.clientY - ly);
          lx = e.clientX; ly = e.clientY;
          prog = Math.min(1, prog + d / 2400);
          acc += d;
          if (acc > 35) {
            acc = 0;
            audio.scrub();
            wob = Math.min(1, wob + 0.25);
            particles.emit({ pos: bottleTop(1.0 + Math.random()), count: 6, color: ['#a5d8ff', '#e7f5ff', '#74c0fc'], speed: 2.5, up: 0.8, spread: 0.8, gravity: -9, life: 0.6, size: 0.18 });
          }
          bot.setLevel(1 - Math.min(1, prog * 2));
          bot.setDirt(1 - Math.max(0, (prog - 0.35) / 0.65));
          bar.style.width = prog * 100 + '%';
          if (prog >= 1) { input.set(null); res(); }
        },
        up() { down = false; input.cursor('grab'); },
      });
    });
    fac.showerOn = false;
    audio.sparkle();
    particles.emit({ pos: bottleTop(1.2), count: 40, color: ['#ffffff', '#fff3bf', '#8ff7ff'], speed: 3, up: 0.6, spread: 1, gravity: -2, life: 1, size: 0.25 });
  }

  async function actPeel() {
    const parts = [
      { mesh: bot.label, en: 'paper label', ko: '종이 라벨', tag: new V3(-0.75, 0, 0) },
      { mesh: bot.sticker, en: 'adhesive sticker', ko: '접착 스티커', tag: new V3(-0.7, -0.12, 0.2) },
      { mesh: bot.metalCap, en: 'metal cap', ko: '금속 뚜껑', tag: new V3(0, 0.38, 0) },
    ];
    const card = ui.card(`
      <div class="card-head"><span class="pill">🏷️ ACTION</span><span class="q"><span class="key">non-plastic attachments</span>(플라스틱이 아닌 부착물)를 모두 떼어내세요!</span></div>
      <div class="part-row">${parts.map((p, k) => `<button class="part" data-k="${k}"><b>${p.en}</b><small>${p.ko}</small></button>`).join('')}</div>
      <p class="hint-txt">병에 붙은 이름표(또는 위 버튼)를 클릭하세요.</p>`);
    await new Promise((res) => {
      const offs = [];
      let left = parts.length;
      const peel = (k) => {
        const p = parts[k];
        if (p.done) return;
        p.done = true;
        left--;
        audio.peel();
        wob = 1;
        card.querySelector(`.part[data-k="${k}"]`).classList.add('done');
        removeObject(p.tagObj);
        fac.root.attach(p.mesh);
        const from = p.mesh.position.clone();
        const to = fac.bins.non.mouth.clone().add(new V3(0, -0.4, 0));
        const r0 = p.mesh.rotation.clone(), s0 = p.mesh.scale.clone();
        tween(0.75, (t) => {
          p.mesh.position.lerpVectors(from, to, t);
          p.mesh.position.y += 4 * 2.2 * t * (1 - t);
          p.mesh.rotation.set(r0.x + t * 6, r0.y + t * 3, r0.z);
          p.mesh.scale.copy(s0).multiplyScalar(1 - t * 0.4);
        }, Ease.linear).then(() => {
          removeObject(p.mesh);
          audio.clunk();
          particles.emit({ pos: W(to.x, to.y + 0.3, to.z), count: 12, color: ['#dee2e6', '#adb5bd'], speed: 2, up: 1, spread: 0.6, gravity: -6, life: 0.6, size: 0.15 });
        });
        if (left === 0) {
          offs.forEach((f) => f());
          input.set(null);
          wait(1.0).then(res);
        }
      };
      parts.forEach((p, k) => {
        const { obj, inner } = label(`<div class="ti3">${p.en}</div>`, 'tag3d', true);
        obj.position.copy(p.tag);
        p.mesh.add(obj);
        p.tagObj = obj;
        const h = () => peel(k);
        inner.addEventListener('click', h);
        offs.push(() => inner.removeEventListener('click', h));
      });
      offs.push(ui.on(card, '.part', (b) => peel(+b.dataset.k)));
      const live = () => parts.filter((p) => !p.done).map((p) => p.mesh);
      input.set({
        down() {
          const h = input.pick(live());
          if (h) { const k = parts.findIndex((p) => !p.done && isInside(h.object, p.mesh)); if (k >= 0) peel(k); }
        },
        move() { input.cursor(input.pick(live()) ? 'pointer' : ''); },
      });
    });
    audio.sparkle();
  }

  async function actPress() {
    const L = [[1, 1], [0.7, 1.12], [0.48, 1.22], [0.32, 1.3]];
    const topOf = (sy) => BELT_Y + 1.46 * BS * sy;
    const card = ui.card(`
      <div class="card-head"><span class="pill">🗜️ ACTION</span><span class="q">병을 <span class="key">as much as possible</span>(최대한) <span class="key">compress</span>(압축)하세요!</span></div>
      <div class="press-row"><button class="btn primary big" data-press>🗜️ 꾹 누르기 <span class="pc">0 / 3</span></button></div>
      <p class="hint-txt">버튼이나 프레스 기계를 클릭하세요.</p>`);
    await new Promise((res) => {
      const offs = [];
      let n = 0, busy = false;
      const press = async () => {
        if (busy || n >= 3) return;
        busy = true;
        const [sy0, sx0] = L[n], [sy1, sx1] = L[n + 1];
        n++;
        audio.clunk();
        await tween(0.22, (k) => fac.press.setBottom(lerp(fac.press.restBottom, topOf(sy0), k)), Ease.in);
        audio.crush();
        rig.shake(0.35);
        wob = 0.6;
        particles.emit({ pos: W(SX[2], BELT_Y + 0.3, 0), count: 18, color: ['#ffffff', '#dee2e6'], speed: 3, up: 0.6, spread: 1.2, gravity: -6, life: 0.6, size: 0.18 });
        await tween(0.14, (k) => {
          const sy = lerp(sy0, sy1, k), sx = lerp(sx0, sx1, k);
          bot.body.scale.set(sx, sy, sx);
          fac.press.setBottom(topOf(sy));
        }, Ease.out);
        await tween(0.45, (k) => fac.press.setBottom(lerp(topOf(sy1), fac.press.restBottom, k)), Ease.inOut);
        card.querySelector('.pc').textContent = `${n} / 3`;
        busy = false;
        if (n >= 3) { offs.forEach((f) => f()); input.set(null); res(); }
      };
      offs.push(ui.on(card, '[data-press]', () => press()));
      input.set({
        down() { if (input.pick([fac.press.head, bot.root])) press(); },
        move() { input.cursor(input.pick([fac.press.head, bot.root]) ? 'pointer' : ''); },
      });
    });
    audio.sparkle();

    const cap = makeCap('#1c7ed6');
    cap.position.set(0.9, 2.0, 0.3);
    bot.root.add(cap);
    const tag = label(`<div class="ti3">plastic cap</div>`, 'tag3d', true);
    tag.obj.position.set(0, 0.32, 0);
    cap.add(tag.obj);
    let floating = true;
    const offF = ctx.addUpdater((dt, t) => {
      if (!floating) return;
      cap.position.y = 2.0 + Math.sin(t * 3) * 0.08;
      cap.rotation.y += dt * 2;
    });
    const card2 = ui.card(`
      <div class="card-head"><span class="pill">🔵 ACTION</span><span class="q">이제 <span class="key">plastic cap</span>(플라스틱 뚜껑)으로 <span class="key">secure</span>(고정)하세요!</span></div>
      <div class="press-row"><button class="btn primary big" data-cap>🔵 뚜껑 닫기</button></div>
      <p class="hint-txt">버튼이나 떠 있는 뚜껑을 클릭하세요.</p>`);
    await new Promise((res) => {
      const offs = [];
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        offs.forEach((f) => f());
        input.set(null);
        audio.click();
        res();
      };
      offs.push(ui.on(card2, '[data-cap]', go));
      tag.inner.addEventListener('click', go);
      offs.push(() => tag.inner.removeEventListener('click', go));
      input.set({
        down() { if (input.pick([cap])) go(); },
        move() { input.cursor(input.pick([cap]) ? 'pointer' : ''); },
      });
    });
    floating = false;
    offF();
    removeObject(tag.obj);
    const p0 = cap.position.clone();
    const p1 = new V3(0, 1.46 * 0.32 + 0.05, 0);
    await tween(0.5, (k) => cap.position.lerpVectors(p0, p1, k), Ease.inOut);
    audio.capTwist();
    await tween(0.5, (k) => { cap.rotation.y = k * Math.PI * 4; }, Ease.out);
    audio.sparkle();
  }

  async function actSort() {
    const tints = [null, '#2f9e44', null, '#9c6644', '#1c7ed6'];
    const total = tints.length;
    for (let k = 0; k < total; k++) {
      let cur;
      if (k === 0) cur = { root: bot.root, clear: true };
      else {
        const tint = tints[k];
        const nb = makePetBottle({ tint });
        nb.body.scale.set(1.3, 0.32, 1.3);
        const cap = makeCap(tint ? '#f08c00' : '#1c7ed6');
        cap.position.y = 1.46 * 0.32 + 0.05;
        nb.root.add(cap);
        nb.root.scale.setScalar(BS);
        nb.root.position.set(SX[3] - 7, BELT_Y, 0);
        fac.root.add(nb.root);
        cur = { root: nb.root, clear: !tint };
        await moveTo(nb.root, SX[3], 1.0);
      }
      const card = ui.card(`
        <div class="card-head"><span class="pill">🔀 ACTION ${k + 1} / ${total}</span><span class="q"><span class="key">clear PET bottles</span>(투명 페트병)와 <span class="key">colored plastics</span>(유색 플라스틱)를 나누세요!</span></div>
        <div class="sort-row">
          <button class="sort-btn clear" data-bin="clear">⬅ 🧊 Clear PET<small>투명</small></button>
          <button class="sort-btn colored" data-bin="colored">🎨 Colored ➡<small>유색</small></button>
        </div>
        <p class="hint-txt">통을 클릭하거나 ← → 키를 눌러도 돼요.</p>
        <div class="feedback"></div>`);
      for (;;) {
        const bin = await waitBin(card);
        if ((bin === 'clear') === cur.clear) {
          await dropInBin(cur.root, bin);
          break;
        }
        audio.wrong();
        ui.flash('bad');
        const y0 = cur.root.position.y;
        tween(0.4, (t) => { cur.root.position.y = y0 + Math.sin(t * Math.PI) * 0.8; }, Ease.linear);
        ui.feedback(card, '✖ 병의 색을 잘 보세요! <b>투명(clear)</b>한가요, <b>색(colored)</b>이 있나요?');
      }
    }
  }

  function waitBin(card) {
    return new Promise((res) => {
      const offs = [];
      let done = false;
      const fin = (b) => {
        if (done) return;
        done = true;
        offs.forEach((f) => f());
        input.set(null);
        audio.click();
        res(b);
      };
      offs.push(ui.on(card, '[data-bin]', (b) => fin(b.dataset.bin)));
      for (const key of ['clear', 'colored']) {
        const el = fac.bins[key].labelEl;
        const h = () => fin(key);
        el.addEventListener('click', h);
        offs.push(() => el.removeEventListener('click', h));
      }
      const kh = (e) => {
        if (e.key === 'ArrowLeft') fin('clear');
        if (e.key === 'ArrowRight') fin('colored');
      };
      window.addEventListener('keydown', kh);
      offs.push(() => window.removeEventListener('keydown', kh));
      const roots = [fac.bins.clear.root, fac.bins.colored.root];
      input.set({
        down() {
          const h = input.pick(roots);
          if (h) fin(isInside(h.object, fac.bins.clear.root) ? 'clear' : 'colored');
        },
        move() { input.cursor(input.pick(roots) ? 'pointer' : ''); },
      });
    });
  }

  async function dropInBin(obj, bin) {
    const b = fac.bins[bin];
    const from = obj.position.clone();
    const to = b.mouth.clone().add(new V3((Math.random() - 0.5) * 0.9, -0.9, (Math.random() - 0.5) * 0.7));
    audio.whoosh();
    await tween(0.6, (k) => {
      obj.position.lerpVectors(from, to, k);
      obj.position.y += 4 * 1.8 * k * (1 - k);
      obj.rotation.z = k * Math.PI * 1.5;
    }, Ease.linear);
    audio.pluck();
    audio.sparkle();
    particles.emit({ pos: W(b.mouth.x, b.mouth.y + 0.2, b.mouth.z), count: 26, color: bin === 'clear' ? ['#a5d8ff', '#ffffff'] : ['#f783ac', '#ffa94d', '#69db7c'], speed: 3.5, up: 1, spread: 0.7, gravity: -8, life: 0.9, size: 0.22 });
  }

  const ACTIONS = { rinse: actRinse, peel: actPeel, press: actPress, sort: actSort };

  /* ---------- reason ---------- */
  async function chooseReason(i) {
    const st = STEPS[i];
    const right = st.reason;
    const others = Object.keys(REASONS).filter((r) => r !== right);
    const opts = shuffle([right, others[(Math.random() * others.length) | 0]]);
    const card = ui.card(`
      <div class="card-head"><span class="pill c" style="--c:#ffd43b">WHY?</span><span class="q">왜 이렇게 해야 할까요? 알맞은 <b>이유</b>를 고르세요.</span></div>
      <div class="reason-row">${opts.map((r) => `<button class="reason" data-r="${r}">${REASONS[r].en}</button>`).join('')}</div>
      <div class="feedback"></div>`);
    let tries = 0;
    for (;;) {
      const b = await ui.waitClick(card, '[data-r]');
      tries++;
      if (b.dataset.r === right) break;
      b.classList.remove('no'); void b.offsetWidth; b.classList.add('no');
      audio.wrong();
      ui.flash('bad');
      ui.feedback(card, `✖ 그건 다른 단계의 이유예요. 방금 한 작업(<b>${TOOLS[st.tool].ko}</b>)과 관련된 이유를 찾아보세요.`);
    }
    ctx.record(tries === 1);
    audio.correct();
    ui.flash('good');
    fac.setLamp(i, '#2bd96b');
    const R = REASONS[right];
    ui.sheetStep(i, st.step, R.short);
    ctx.setHealth(0.6 + 0.1 * (i + 1));
    const done = ui.card(`
      <div class="card-head"><span class="pill ok">✔ STEP ${i + 1} 완료</span><span class="q">${st.step}</span></div>
      <p class="en"><span class="sig">${st.sig}</span> ${fmt(st.text)}</p>
      <p class="en">${fmt(R.hl)}</p>
      <div class="ko">${st.ko}<br>→ ${R.ko}</div>
      <div class="note"><b>🔗 이유 정리</b> ${R.tip}</div>
      <div class="card-foot"><button class="btn primary" data-next>${i < 3 ? '다음 정류장 ▶' : '계속 ▶'}</button></div>`);
    await ui.waitClick(done, '[data-next]');
  }

  /* ---------- run steps ---------- */
  for (let i = 0; i < 4; i++) {
    ui.hideCard();
    fac.activeSign(i);
    const [cp, cl] = camFor(i);
    const moves = [rig.go(cp, cl, 2)];
    if (i < 3 || bot.root.position.x !== SX[3]) moves.push(moveTo(bot.root, SX[i], i === 0 ? 2.4 : 1.8));
    await Promise.all(moves);
    fac.setLamp(i, '#ffd43b');
    await chooseTool(i);
    await ACTIONS[STEPS[i].tool](i);
    await chooseReason(i);
  }
  fac.activeSign(-1);

  /* ---------- wrap-up ---------- */
  ui.hideCard();
  audio.fanfare();
  await rig.go(W(0, 13, 26), W(0, 2.5, -1), 2.4);
  const card = ui.card(`
    <div class="card-head"><span class="pill">🌱 마무리</span><span class="q">글의 마지막 문장</span></div>
    <p class="en">${fmt(RECYCLE_OUTRO.text)}</p>
    <div class="ko">${RECYCLE_OUTRO.ko}</div>
    <div class="card-foot"><button class="btn primary" data-next>계속 ▶</button></div>`);
  await ui.waitClick(card, '[data-next]');
  ui.hideCard();
  await structureQuiz(ctx, QUIZ2);
  await titleQuiz(ctx);
  input.set(null);
}
