// Scroll controller. Maps the page scroll to:
//   chapter: continuous 0..3 across the four sections
//   camera:  like chapter, but lingering while a card is on screen and
//            gliding between chapters (drives the camera)
//   time:    0..3 held steady while a chapter's card is on screen and
//            eased between chapters (drives the time of day)
// and fades each chapter's panel in and out.

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function createStory({ onChange }) {
  let sections = [];
  let panels = [];
  let skip = null;
  let tops = [];
  let vh = window.innerHeight;
  let maxScroll = 1;
  let frame = 0;
  const state = { chapter: 0, camera: 0, time: 0, timeIndex: 0 };

  function measure() {
    sections = [...document.querySelectorAll('.ch')];
    panels = sections.map((s) => s.querySelector('.panel'));
    skip = document.querySelector('.skip');
    vh = window.innerHeight;
    tops = sections.map((s) => s.getBoundingClientRect().top + window.scrollY);
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    update();
  }

  function update() {
    frame = 0;
    const y = window.scrollY;
    const last = tops.length - 1;
    const end = Math.min(tops[last], maxScroll);

    // Continuous chapter position, one unit per section.
    let chapter = last;
    let camera = last;
    let timePos = last;
    for (let i = 0; i < last; i++) {
      const a = tops[i];
      const b = i + 1 === last ? end : tops[i + 1];
      if (y < b) {
        const u = clamp01((y - a) / (b - a));
        chapter = i + u;
        camera = i + 0.1 * u + 0.9 * smoothstep(0.36, 0.97, u);
        timePos = i + smoothstep(0.4, 0.95, u);
        break;
      }
    }
    state.chapter = chapter;
    state.camera = camera;
    state.time = timePos;

    // Panel fades: sticky chapters fade in on approach and out as they leave.
    sections.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      let vis;
      if (i === last) {
        vis = 1 - smoothstep(vh * 0.2, vh * 0.75, r.top);
      } else {
        const t = -r.top / Math.max(1, r.height - vh);
        vis = i === 0 ? 1 - smoothstep(0.7, 1.15, t) : smoothstep(-0.6, -0.1, t) * (1 - smoothstep(0.7, 1.15, t));
      }
      panels[i]?.style.setProperty('--vis', vis.toFixed(3));
      if (i === 0) panels[0]?.style.setProperty('--hint', (1 - smoothstep(0, 0.25, t0(r))).toFixed(3));
    });

    const details = sections[last].getBoundingClientRect();
    skip?.classList.toggle('is-hidden', details.top < vh * 0.6);

    const idx = Math.round(timePos);
    if (idx !== state.timeIndex) {
      state.timeIndex = idx;
      document.documentElement.dataset.time = ['golden', 'dusk', 'dawn', 'morning'][idx];
    }
    onChange?.(state);
  }

  const t0 = (r) => -r.top / Math.max(1, r.height - vh);

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('orientationchange', measure);
  measure();

  return { state, measure };
}
