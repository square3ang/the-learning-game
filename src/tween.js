const list = [];

export const Ease = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  backOut: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function tween(duration, fn, ease = Ease.inOut) {
  return new Promise((resolve) => {
    fn(ease(0));
    list.push({ t: 0, d: Math.max(0.0001, duration), fn, ease, resolve });
  });
}

export const wait = (s) => tween(s, () => {}, Ease.linear);

export function updateTweens(dt) {
  const cur = list.slice();
  for (const tw of cur) {
    tw.t += dt;
    const k = Math.min(1, tw.t / tw.d);
    tw.fn(tw.ease(k));
    if (k >= 1) {
      list.splice(list.indexOf(tw), 1);
      tw.resolve();
    }
  }
}
