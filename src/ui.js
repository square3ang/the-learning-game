import { CATS, CAT_ORDER, STEPS } from './data.js';

export function fmt(s) {
  return s
    .replace(/\[\[(.+?)\]\]/g, '<span class="sig">$1</span>')
    .replace(/__(.+?)__/g, '<span class="key">$1</span>');
}

export function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(audio) {
    this.audio = audio;
    this.stageChip = $('stageChip');
    this.stageNo = $('stageNo');
    this.stageName = $('stageName');
    this.healthEl = $('health');
    this.healthFill = $('healthFill');
    this.healthPct = $('healthPct');
    this.guideEl = $('guide');
    this.guideText = $('guideText');
    this.cardEl = $('card');
    this.sheetEl = $('sheet');
    this.sheetBody = $('sheetBody');
    this.modalEl = $('modal');
    this.modalBox = $('modalBox');
    this.flashEl = $('flash');
    this.btnSheet = $('btnSheet');
    this.btnSound = $('btnSound');
    this.btnFull = $('btnFull');
    this.sheetOpen = false;

    const koToggle = (e) => {
      const b = e.target.closest('[data-act="ko"]');
      if (!b) return;
      const root = b.closest('#card, .modal-box');
      const ko = root && root.querySelector('.ko');
      if (!ko) return;
      ko.classList.toggle('hidden');
      b.textContent = ko.classList.contains('hidden') ? '🔍 해석 보기' : '🙈 해석 숨기기';
      audio.click();
    };
    this.cardEl.addEventListener('click', koToggle);
    this.modalBox.addEventListener('click', koToggle);

    this.btnSound.onclick = () => {
      const m = audio.toggleMute();
      this.btnSound.textContent = m ? '🔇' : '🔊';
    };
    this.btnFull.onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    };
    this.btnSheet.onclick = () => {
      this.setSheet(!this.sheetOpen);
      audio.click();
    };
  }

  /* ---------- top bar ---------- */
  setStage(no, name) {
    this.stageChip.classList.remove('hidden');
    this.stageNo.textContent = no;
    this.stageName.textContent = name;
  }
  setHealth(v) {
    this.healthEl.classList.remove('hidden');
    const p = Math.round(v * 100);
    this.healthFill.style.width = p + '%';
    this.healthPct.textContent = p + '%';
  }

  insets() {
    const W = window.innerWidth, H = window.innerHeight, m = 12;
    const shown = (el) => !el.classList.contains('hidden');
    let t = 0;
    for (const el of [this.stageChip, this.healthEl, this.guideEl]) {
      if (shown(el)) t = Math.max(t, el.getBoundingClientRect().bottom);
    }
    const b = shown(this.cardEl) ? H - this.cardEl.getBoundingClientRect().top : 0;
    const r = shown(this.sheetEl) ? W - this.sheetEl.getBoundingClientRect().left : 0;
    const l = this.modalEl.classList.contains('side') ? this.modalBox.getBoundingClientRect().right : 0;
    return { t: t && t + m, b: b && b + m, l: l && l + m, r: r && r + m };
  }

  /* ---------- guide ---------- */
  guide(html) {
    const g = this.guideEl;
    if (!html) { g.classList.add('hidden'); return; }
    this.guideText.innerHTML = html;
    g.classList.remove('hidden', 'pop');
    void g.offsetWidth;
    g.classList.add('pop');
  }

  /* ---------- card ---------- */
  card(html) {
    const c = this.cardEl;
    c.className = '';
    c.innerHTML = html;
    void c.offsetWidth;
    c.classList.add('in');
    c.scrollTop = 0;
    return c;
  }
  hideCard() { this.cardEl.classList.add('hidden'); }

  /* ---------- modal ---------- */
  modal(html, cls = '') {
    this.modalEl.className = cls;
    this.modalBox.innerHTML = html;
    this.modalBox.style.animation = 'none';
    void this.modalBox.offsetWidth;
    this.modalBox.style.animation = '';
    this.modalBox.scrollTop = 0;
    return this.modalBox;
  }
  closeModal() { this.modalEl.className = 'hidden'; }

  /* ---------- events ---------- */
  on(root, sel, fn) {
    const h = (e) => {
      const b = e.target.closest(sel);
      if (b && root.contains(b) && !b.disabled) fn(b, e);
    };
    root.addEventListener('click', h);
    return () => root.removeEventListener('click', h);
  }
  waitClick(root, sel) {
    return new Promise((res) => {
      const off = this.on(root, sel, (b) => {
        off();
        this.audio.click();
        res(b);
      });
    });
  }
  feedback(root, html, kind = 'bad') {
    const f = root.querySelector('.feedback');
    if (f) f.innerHTML = `<div class="${kind}">${html}</div>`;
  }
  flash(kind) {
    const f = this.flashEl;
    f.className = '';
    void f.offsetWidth;
    f.className = kind;
  }

  /* ---------- worksheet ---------- */
  setSheet(open) {
    this.sheetOpen = open;
    this.sheetEl.classList.toggle('hidden', !open);
    document.body.classList.toggle('sheet-open', open);
    this.btnSheet.classList.remove('pulse');
    this.btnSheet.classList.toggle('on', open);
  }
  _showSheetButton() {
    if (!this.btnSheet.classList.contains('hidden')) return;
    this.btnSheet.classList.remove('hidden');
    if (window.innerWidth >= 1600) this.setSheet(true);
  }
  _nudge(el) {
    el.classList.remove('new');
    void el.offsetWidth;
    el.classList.add('new');
    if (this.sheetOpen) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    else {
      this.btnSheet.classList.remove('pulse');
      void this.btnSheet.offsetWidth;
      this.btnSheet.classList.add('pulse');
    }
  }
  sheetStage1() {
    const titles = {
      problem: '1. [문제 발생]',
      harm: '2. [구체적 피해]',
      solution: '3. [해결의 방향 (사전 예방)]',
      proposal: '4. [최종 제안 & 기대 효과]',
    };
    this.sheetBody.insertAdjacentHTML('beforeend', `
      <section class="ws" id="ws1">
        <h4><span>Reading #2</span> The Plastic Crisis</h4>
        ${CAT_ORDER.map((id) => `
          <div class="ws-row" data-cat="${id}" style="--c:${CATS[id].color}88">
            <div class="ws-tag">${titles[id]}</div>
            <ul class="ws-list"><li class="blank"></li></ul>
          </div>`).join('')}
      </section>`);
    this._showSheetButton();
  }
  sheetAdd1(cat, html) {
    const ul = this.sheetBody.querySelector(`#ws1 [data-cat="${cat}"] ul`);
    ul.querySelector('.blank')?.remove();
    ul.insertAdjacentHTML('beforeend', `<li>${html}</li>`);
    this._nudge(ul.lastElementChild);
  }
  sheetStage2() {
    this.sheetBody.insertAdjacentHTML('beforeend', `
      <section class="ws" id="ws2">
        <h4><span>Reading #3</span> <i id="ws2title">( 제목: ________ )</i></h4>
        <p class="ws-sub">※ 효과적인 재활용을 위한 4단계 절차</p>
        ${STEPS.map((s, i) => `
          <div class="ws-step" data-step="${i}" style="--c:${s.color}88">
            <div class="ws-tag">[Step ${i + 1}] ${s.sig}</div>
            <div class="ws-line s"></div>
            <div class="ws-line r">└ 이유: <span></span></div>
          </div>`).join('')}
      </section>`);
    this._showSheetButton();
    this.sheetEl.scrollTo({ top: this.sheetEl.scrollHeight, behavior: 'smooth' });
  }
  sheetStep(i, step, reason) {
    const row = this.sheetBody.querySelector(`#ws2 [data-step="${i}"]`);
    const s = row.querySelector('.ws-line.s');
    const r = row.querySelector('.ws-line.r');
    s.textContent = step;
    r.querySelector('span').textContent = reason;
    this._nudge(s);
    r.classList.remove('new'); void r.offsetWidth; r.classList.add('new');
  }
  sheetTitle(t) {
    const el = this.sheetBody.querySelector('#ws2title');
    el.textContent = t;
    el.classList.add('filled');
    this._nudge(el);
  }
}
