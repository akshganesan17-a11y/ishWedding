import './styles.css';
import content from './content.json';
import { isPlaceholder } from './lib/content.js';
import { renderApp } from './ui/render.js';
import { createStory } from './ui/story.js';

const root = document.documentElement;
const app = document.getElementById('app');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- Language ----------

const LANG_KEY = 'invite-lang';
const readLang = () => {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
};

// ---------- Guest name ----------
// A personal link (?to=Ravi%20Uncle) greets that guest by name.

function readGuest() {
  const params = new URLSearchParams(location.search);
  const raw = params.get('to') ?? params.get('name') ?? '';
  const name = raw.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim();
  if (name.length <= 60) return name;
  // Cut long names at a word boundary rather than mid-word.
  const cut = name.slice(0, 60);
  return cut.slice(0, cut.lastIndexOf(' ') > 30 ? cut.lastIndexOf(' ') : 60);
}
const guest = readGuest();

function setTitle(lang) {
  const t = content.text[lang];
  document.title = guest ? t.pageTitleGuest.replace('{name}', guest) : t.pageTitle;
}

// Fade the couple in once their pictures have loaded (also after a
// language switch re-renders them; cached images come in immediately).
function revealCouple() {
  for (const img of app.querySelectorAll('.couple img')) {
    const show = () => img.classList.add('is-in');
    if (img.complete && img.naturalWidth) show();
    else img.addEventListener('load', show, { once: true });
  }
}

function setLang(lang, { save = true } = {}) {
  if (!content.text[lang]) return;
  const focusLang = document.activeElement?.dataset?.action === 'lang';
  app.innerHTML = renderApp(content, lang, { guest });
  revealCouple();
  root.lang = lang;
  setTitle(lang);
  if (save) {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {}
  }
  syncMusicButton();
  story?.measure();
  if (focusLang) app.querySelector('[data-action="lang"]')?.focus();
}

// ---------- Music ----------

const audio = document.getElementById('music');
const hasMusic = !isPlaceholder(content.music.src);
let playing = false;

function syncMusicButton() {
  const btn = app.querySelector('[data-action="music"]');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(playing));
  btn.setAttribute('aria-label', playing ? btn.dataset.labelPause : btn.dataset.labelPlay);
}

async function toggleMusic() {
  if (!hasMusic) return;
  if (!audio.src) audio.src = content.music.src;
  if (playing) {
    audio.pause();
    playing = false;
  } else {
    try {
      audio.volume = 0.7;
      await audio.play();
      playing = true;
    } catch {
      playing = false;
    }
  }
  syncMusicButton();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing) audio.pause();
  else if (!document.hidden && playing) audio.play().catch(() => {});
});

// ---------- Actions ----------

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'lang') setLang(el.dataset.lang);
  else if (action === 'music') toggleMusic();
  else if (action === 'skip') {
    e.preventDefault();
    const details = document.getElementById('details');
    details.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    details.focus({ preventScroll: true });
  }
});

// ---------- Boot ----------

const listeners = new Set();
export const onStory = (fn) => listeners.add(fn);
const story = createStory({ onChange: (s) => listeners.forEach((fn) => fn(s)) });

const saved = readLang();
if ((saved && saved !== 'en') || guest) setLang(saved || 'en', { save: false });
syncMusicButton();
revealCouple();

// ---------- 3D scene ----------
// The poster is already on screen. Once the page has painted, pick a tier
// and, unless it is low, fetch the 3D scene and cross-fade into it.

const scene = document.getElementById('scene');
const poster = document.querySelector('.poster');

async function startScene() {
  const { detectTier } = await import('./quality.js');
  const { tier, info } = await detectTier();
  root.dataset.tier = tier;
  window.__tier = { tier, info };
  if (tier === 'low') return;

  let world;
  try {
    const { bootWorld } = await import('./scene/boot.js');
    world = await bootWorld({
      container: scene,
      tier,
      reducedMotion: reducedMotion.matches,
      capture: new URLSearchParams(location.search).has('capture'),
    });
  } catch (err) {
    console.warn('[invite] 3D scene unavailable, keeping the poster', err);
    root.dataset.tier = 'low';
    return;
  }
  world.setStory(story.state);
  world.snap();
  onStory((s) => world.setStory(s));
  world.start();
  window.__world = world;
  window.__fps = () => Math.round(world.fps());

  scene.classList.add('is-ready');
  scene.addEventListener(
    'transitionend',
    () => {
      poster.classList.add('is-hidden');
      root.classList.add('is-3d');
    },
    { once: true },
  );

  // Frame-time check on the real scene: fall back to the poster if even
  // the medium tier cannot hold a watchable frame rate.
  setTimeout(() => {
    if (world.fps() < 20 && !new URLSearchParams(location.search).has('tier')) {
      world.stop();
      poster.classList.remove('is-hidden');
      root.classList.remove('is-3d');
      scene.classList.remove('is-ready');
      root.dataset.tier = 'low';
    }
  }, 4000);

  document.addEventListener('visibilitychange', () => (document.hidden ? world.stop() : root.dataset.tier !== 'low' && world.start()));
}

const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
window.addEventListener('load', () => idle(startScene, { timeout: 1200 }), { once: true });

if (import.meta.env.DEV) {
  const left = JSON.stringify({ ...content, _help: null }).match(/\[[A-Z][A-Z0-9 ,'’]+\]/g);
  if (left) console.info('[invite] placeholders still to fill:', [...new Set(left)].join(', '));
}
