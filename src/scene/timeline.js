import * as THREE from 'three';
import { clamp, GHAT_Z, GOPURAM_Z, lerp, RIVER_HALF, riverX } from './util.js';

// Keyframes for the four chapters. `chapter` (0..3, continuous) moves the
// camera; `time` (0..3, held while a card is on screen) sets the light.

export const GOPURAM_POS = new THREE.Vector3(riverX(GOPURAM_Z) + 70, 0, GOPURAM_Z);
const GHAT_X = riverX(GHAT_Z) - RIVER_HALF;

const v = (x, y, z) => new THREE.Vector3(x, y, z);

// `key` marks the four chapter views; the others are waypoints that keep
// the glide smooth and well above the water.
const CAMERA = [
  { key: true, pos: v(riverX(70) + 11, 4.6, 70), target: v(riverX(-220) - 8, 9, -220) },
  { key: true, pos: v(riverX(-212) + 8, 12, -208), target: v(GHAT_X - 9, -12, GHAT_Z - 6) },
  { pos: v(riverX(-360) + 4, 9.5, -360), target: v(riverX(-660), 6, -660) },
  { pos: v(riverX(-470), 7, -470), target: v(GOPURAM_POS.x - 30, 4, GOPURAM_POS.z) },
  { key: true, pos: v(riverX(-560) - 4, 5.5, -560), target: v(GOPURAM_POS.x - 10, 2, GOPURAM_POS.z) },
  { key: true, pos: v(riverX(-610) - 16, 34, -610), target: v(riverX(-880) + 8, 4, -880) },
];
const KEY_INDEX = CAMERA.flatMap((k, i) => (k.key ? [i] : []));
const MIN_HEIGHT = 3.2;

const posCurve = new THREE.CatmullRomCurve3(CAMERA.map((k) => k.pos), false, 'centripetal');
const targetCurve = new THREE.CatmullRomCurve3(CAMERA.map((k) => k.target), false, 'centripetal');

const dawnFrom = CAMERA[KEY_INDEX[2]].pos;
const duskFrom = CAMERA[KEY_INDEX[1]];
const dawnAz = Math.atan2(GOPURAM_POS.x - dawnFrom.x, -(GOPURAM_POS.z - dawnFrom.z));

// The moon hangs over the ghat, in view of the reception camera.
const duskView = duskFrom.target.clone().sub(duskFrom.pos);
const moonAz = Math.atan2(duskView.x, -duskView.z) + 0.2;
const MOON_DIR = new THREE.Vector3(Math.sin(moonAz), 0, -Math.cos(moonAz)).multiplyScalar(Math.cos(0.2));
MOON_DIR.y = Math.sin(0.2);

const c = (hex) => new THREE.Color(hex);

// Times of day: golden hour, dusk, dawn, morning.
const TIMES = [
  {
    top: c('#4d6ea6'), mid: c('#f2ad72'), horizon: c('#ffd7a0'),
    sun: c('#ffc88a'), sunAz: -0.42, sunEl: 0.075, sunI: 2.6, disc: 12, glow: 0.8,
    hemiSky: c('#ffd9b0'), hemiGround: c('#4a3a2a'), hemiI: 1.1,
    fog: c('#e8b48c'), fogD: 0.0011, exposure: 0.6,
    deep: c('#2c5870'), bank: c('#231a12'), lamps: 0, stars: 0, glitter: 1, moon: 0,
  },
  {
    top: c('#0d1330'), mid: c('#4d3263'), horizon: c('#d8745c'),
    sun: c('#ff7040'), sunAz: -0.5, sunEl: -0.05, sunI: 0.12, disc: 0, glow: 0.9,
    hemiSky: c('#6a64a4'), hemiGround: c('#2a1e2a'), hemiI: 0.75,
    fog: c('#4a3558'), fogD: 0.0014, exposure: 1.0,
    deep: c('#0f2640'), bank: c('#07060a'), lamps: 1, stars: 0.8, glitter: 0, moon: 1,
  },
  {
    top: c('#25346c'), mid: c('#c08aa4'), horizon: c('#ffbf82'),
    sun: c('#ffb070'), sunAz: dawnAz + 0.032, sunEl: 0.088, sunI: 1.5, disc: 14, glow: 1.5,
    hemiSky: c('#b8a0c0'), hemiGround: c('#2a2030'), hemiI: 0.85,
    fog: c('#c89090'), fogD: 0.0012, exposure: 0.68,
    deep: c('#2d5a78'), bank: c('#140f18'), lamps: 0.5, stars: 0.15, glitter: 1, moon: 0,
  },
  {
    top: c('#5f93c8'), mid: c('#e9dcc4'), horizon: c('#fff0d8'),
    sun: c('#fff0d4'), sunAz: dawnAz + 0.1, sunEl: 0.3, sunI: 2.7, disc: 6, glow: 0.5,
    hemiSky: c('#dfe8f0'), hemiGround: c('#4a4a38'), hemiI: 1.25,
    fog: c('#d9dcd8'), fogD: 0.0009, exposure: 0.62,
    deep: c('#2a7096'), bank: c('#1c2416'), lamps: 0, stars: 0, glitter: 0.8, moon: 0,
  },
];

const ease = (t) => t * t * (3 - 2 * t);

export function sampleCamera(chapter, out = { pos: new THREE.Vector3(), target: new THREE.Vector3() }) {
  const c = clamp(chapter, 0, KEY_INDEX.length - 1);
  const i = Math.min(Math.floor(c), KEY_INDEX.length - 2);
  const idx = lerp(KEY_INDEX[i], KEY_INDEX[i + 1], c - i);
  const t = idx / (CAMERA.length - 1);
  posCurve.getPoint(t, out.pos);
  targetCurve.getPoint(t, out.target);
  // Height is eased point to point instead of splined, so it can never
  // overshoot below a waypoint (the spline dipped under the water here).
  const a = Math.min(Math.floor(idx), CAMERA.length - 2);
  out.pos.y = Math.max(MIN_HEIGHT, lerp(CAMERA[a].pos.y, CAMERA[a + 1].pos.y, ease(idx - a)));
  return out;
}

export function createTimeState() {
  return {
    top: new THREE.Color(), mid: new THREE.Color(), horizon: new THREE.Color(), sun: new THREE.Color(),
    hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), fog: new THREE.Color(),
    deep: new THREE.Color(), bank: new THREE.Color(), sunDir: new THREE.Vector3(), moonDir: MOON_DIR.clone(), moon: 0,
    sunI: 0, disc: 0, glow: 0, hemiI: 0, fogD: 0, exposure: 1, lamps: 0, stars: 0, glitter: 0,
  };
}

export function sampleTime(time, out) {
  const t = clamp(time, 0, TIMES.length - 1);
  const i = Math.min(Math.floor(t), TIMES.length - 2);
  const f = ease(t - i);
  const a = TIMES[i];
  const b = TIMES[i + 1];
  for (const k of ['top', 'mid', 'horizon', 'sun', 'hemiSky', 'hemiGround', 'fog', 'deep', 'bank']) {
    out[k].lerpColors(a[k], b[k], f);
  }
  for (const k of ['sunI', 'disc', 'glow', 'hemiI', 'fogD', 'exposure', 'glitter', 'moon']) {
    out[k] = lerp(a[k], b[k], f);
  }
  // Stars only once the sky is properly dark.
  out.stars = lerp(a.stars, b.stars, b.stars > a.stars ? f * f * f : 1 - (1 - f) * (1 - f) * (1 - f));
  // Lamps light during the approach to dusk and linger into dawn.
  out.lamps = lerp(a.lamps, b.lamps, clamp((t - i) * 1.4 - (i === 0 ? 0.25 : 0), 0, 1));
  const az = lerp(a.sunAz, b.sunAz, f);
  const el = lerp(a.sunEl, b.sunEl, f);
  out.sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  return out;
}
