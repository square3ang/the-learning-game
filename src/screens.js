import * as THREE from 'three';
import { STRUCTURES, TITLE_QUIZ, FLOW1, FLOW2 } from './data.js';
import { shuffle } from './ui.js';
import { wait } from './tween.js';

const V3 = THREE.Vector3;

export async function titleScreen(ctx) {
  const { ui, audio, rig } = ctx;
  rig.set(new V3(0, 9, 26), new V3(0, 0, -6));
  rig.orbit(new V3(0, 0, -6), 28, 9, 0.05);
  const box = ui.modal(`
    <div class="title">
      <div class="title-kicker">Common English 2 · Lesson 4</div>
      <h1>Ocean <span>Recovery</span></h1>
      <p class="title-sub">신호어를 따라가면 <b>글의 구조</b>가 보인다!</p>
      <ul class="title-how">
        <li><span class="sig">However</span> <span class="sig">Therefore</span> <span class="sig">First,</span> 처럼 빨간 박스는 <b>신호어</b>예요. 글의 흐름을 알려 주는 단서랍니다.</li>
        <li>문장을 읽고 <b>끌어다 놓기 · 클릭</b>으로 글의 흐름을 완성하세요.</li>
        <li>맞힐수록 오염된 바다가 점점 <b>깨끗하게 회복</b>돼요. 🐟</li>
      </ul>
      <button class="btn primary big" data-start>🌊 시작하기</button>
      <p class="title-foot">🔊 소리를 켜고 플레이하세요 · Reading #2 The Plastic Crisis &amp; Reading #3</p>
    </div>`, 'clear');
  const btn = box.querySelector('[data-start]');
  btn.addEventListener('click', () => {
    audio.init();
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, { once: true });
  await ui.waitClick(box, '[data-start]');
  audio.setIntensity(1);
  audio.whoosh();
  ui.closeModal();
}

export async function stageIntro(ctx, { badge, title, body, btn }) {
  const { ui } = ctx;
  const box = ui.modal(`
    <div class="intro">
      <span class="badge">${badge}</span>
      <h2>${title}</h2>
      ${body}
      <div class="modal-actions"><button class="btn primary big" data-go>${btn}</button></div>
    </div>`);
  await ui.waitClick(box, '[data-go]');
  ui.closeModal();
}

export async function structureQuiz(ctx, q) {
  const { ui, audio } = ctx;
  const box = ui.modal(`
    <div class="sq">
      <span class="badge">🧭 글의 구조 찾기 · ${q.reading}</span>
      <h2><em>${q.title}</em>은(는) 어떤 구조의 글일까요?</h2>
      <p class="center" style="color:var(--muted);margin:0">방금 완성한 글의 흐름</p>
      ${q.flow}
      <div class="struct-grid">${STRUCTURES.map((s) => `<button class="struct" data-id="${s.id}"><b>${s.en}</b><small>${s.ko}</small></button>`).join('')}</div>
      <div class="feedback"></div>
      <div class="modal-actions hidden" data-nextwrap><button class="btn primary" data-next>계속 ▶</button></div>
    </div>`);
  let tries = 0;
  for (;;) {
    const b = await ui.waitClick(box, '.struct');
    tries++;
    if (b.dataset.id === q.correct) {
      b.classList.add('ok');
      box.querySelectorAll('.struct').forEach((x) => (x.disabled = true));
      audio.stamp();
      ui.flash('good');
      const s = STRUCTURES.find((x) => x.id === q.correct);
      ui.feedback(box, `<b>✔ ${s.en} · ${q.genre}</b><br>${q.explain}`, 'good');
      break;
    }
    b.classList.add('no');
    b.disabled = true;
    audio.wrong();
    ui.flash('bad');
    ui.feedback(box, `✖ ${q.partial[b.dataset.id] || q.hint}`);
  }
  ctx.record(tries === 1);
  box.querySelector('[data-nextwrap]').classList.remove('hidden');
  await ui.waitClick(box, '[data-next]');
  ui.closeModal();
}

export async function titleQuiz(ctx) {
  const { ui, audio } = ctx;
  const opts = shuffle(TITLE_QUIZ);
  const box = ui.modal(`
    <div class="sq">
      <span class="badge">📝 제목 붙이기 · Reading #3</span>
      <h2>학습지의 <em>제목 칸</em>이 비어 있어요!</h2>
      <p>글 전체 내용을 가장 잘 나타내는 제목을 골라 보세요.</p>
      <div class="title-opts">${opts.map((o, i) => `<button class="struct" data-i="${i}"><b>${o.t}</b></button>`).join('')}</div>
      <div class="feedback"></div>
      <div class="modal-actions hidden" data-nextwrap><button class="btn primary" data-next>마무리 ▶</button></div>
    </div>`);
  let tries = 0;
  let pick;
  for (;;) {
    const b = await ui.waitClick(box, '.struct');
    tries++;
    pick = opts[+b.dataset.i];
    if (pick.ok) {
      b.classList.add('ok');
      box.querySelectorAll('.struct').forEach((x) => (x.disabled = true));
      audio.stamp();
      ui.flash('good');
      ui.feedback(box, `✔ ${pick.fb}`, 'good');
      break;
    }
    b.classList.add('no');
    b.disabled = true;
    audio.wrong();
    ui.flash('bad');
    ui.feedback(box, `✖ ${pick.fb}`);
  }
  ctx.record(tries === 1);
  ui.sheetTitle(pick.t);
  ctx.titleText = pick.t;
  box.querySelector('[data-nextwrap]').classList.remove('hidden');
  await ui.waitClick(box, '[data-next]');
  ui.closeModal();
}

export async function ending(ctx) {
  const { ui, audio, rig, world, particles } = ctx;
  ui.hideCard();
  ui.guide(null);
  ui.setStage('CLEAR', 'Ocean Recovered!');
  ctx.setHealth(1);
  audio.setMood('ending');
  audio.setIntensity(4);
  world.ending = true;
  world.onSplash = (b) => audio.splash(b);
  world.onWhale = () => audio.whale();
  const center = new V3(0, 0, -6);
  rig.go(new V3(0, 16, 34), center, 2.5).then(() => rig.orbit(center, 40, 16, 0.05));
  await wait(1.2);
  audio.fanfare();
  const confetti = () => particles.emit({
    pos: new V3(rig.look.x, 16, rig.look.z), count: 180,
    color: ['#ff6b9a', '#ff9f43', '#40d986', '#ffd43b', '#4fd1ff', '#ffffff'],
    speed: 8, up: 0.8, spread: 1, gravity: -4, life: 3.5, size: 0.45, jitter: 2,
  });
  confetti();
  let wt = 1.5;
  ctx.addUpdater((dt) => {
    wt -= dt;
    if (wt <= 0) {
      wt = 8 + Math.random() * 3;
      world.breach(new V3((Math.random() * 2 - 1) * 10, 0, 4 + Math.random() * 6));
    }
  });

  const s = ctx.stats;
  const box = ui.modal(`
    <div class="ending">
      <span class="badge">CLEAR! 🐋</span>
      <h2>바다가 회복되었어요!</h2>
      <p class="stat">한 번에 맞힌 문제 <b>${s.first}</b> / ${s.total}</p>
      <div class="sum-card">
        <h4>Reading #2 · The Plastic Crisis <small>Problem &amp; Solving · 논설문</small></h4>
        ${FLOW1}
      </div>
      <div class="sum-card">
        <h4>Reading #3 · ${ctx.titleText || ''} <small>Sequence · 설명문</small></h4>
        ${FLOW2}
      </div>
      <div class="center"><p class="takeaway">🔑 신호어를 따라가면 글의 구조가 보인다!</p></div>
      <div class="modal-actions">
        <button class="btn ghost" data-sheet>📋 내용 정리 보기</button>
        <button class="btn primary" data-restart>↻ 다시 하기</button>
      </div>
    </div>`, 'side');
  ui.on(box, '[data-sheet]', () => { ui.setSheet(true); audio.click(); });
  ui.on(box, '[data-restart]', () => { audio.click(); location.reload(); });
  setInterval(() => { if (Math.random() < 0.5) confetti(); }, 9000);
}
