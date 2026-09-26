import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flameTexture, kolamTexture, stoneTexture } from './textures.js';
import { clamp, GHAT_Z, RIVER_HALF, riverX } from './util.js';

// The landing: granite ghat steps into the river, a white marble rotunda
// strung with lights for the reception, a kolam on the landing, and brass kuthu vilakku lamps along the edge
// that light one by one at dusk.

const STEPS = 10;
const RISE = 0.5;
const RUN = 1.3;
const TOP = 1.6;
const HALF_W = 22;
const LANDING = 22;

const flameVertex = /* glsl */ `
  attribute float aSize;
  attribute float aLamp;
  attribute float aKind;
  uniform float uLevel;
  uniform float uTime;
  uniform float uViewH;
  varying float vAlpha;
  varying float vKind;
  void main() {
    float lit = clamp(uLevel - aLamp, 0.0, 1.0);
    float flicker = 0.85 + 0.15 * sin(uTime * 13.0 + aLamp * 7.3 + position.x * 40.0) * sin(uTime * 7.1 + aLamp);
    vAlpha = lit * flicker;
    vKind = aKind;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = lit <= 0.0 ? 0.0 : aSize * (0.6 + 0.4 * lit) * flicker * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z;
  }
`;

const flameFragment = /* glsl */ `
  uniform sampler2D uFlame;
  varying float vAlpha;
  varying float vKind;
  void main() {
    vec2 uv = gl_PointCoord;
    vec3 col;
    float a;
    if (vKind < 0.5) {
      // Wick flame: teardrop texture, hot enough to bloom.
      vec4 t = texture2D(uFlame, vec2(uv.x, uv.y));
      col = t.rgb * 5.0;
      a = t.a;
    } else if (vKind > 1.5) {
      // String-light bulb: a small warm-white core with a tight glow.
      float d = length(uv - 0.5) * 2.0;
      a = exp(-d * d * 9.0);
      col = vec3(1.0, 0.82, 0.52) * (0.8 + 3.2 * smoothstep(0.35, 0.0, d));
    } else {
      // Soft halo around each lamp.
      float d = length(uv - 0.5) * 2.0;
      a = exp(-d * d * 4.0) * 0.55;
      col = vec3(1.0, 0.55, 0.18) * 1.6;
    }
    // Additive blending scales colour by alpha (SRC_ALPHA, ONE).
    gl_FragColor = vec4(col, a * vAlpha);
  }
`;

function kuthuVilakku() {
  const profile = [
    [0, 0], [0.3, 0], [0.32, 0.04], [0.26, 0.09], [0.12, 0.16], [0.07, 0.24], [0.1, 0.3], [0.06, 0.34],
    [0.055, 0.7], [0.1, 0.74], [0.055, 0.78], [0.055, 0.9], [0.1, 0.93], [0.24, 0.98], [0.27, 1.02],
    [0.2, 1.04], [0.05, 1.05], [0.04, 1.2], [0.09, 1.24], [0.04, 1.3], [0.07, 1.36], [0, 1.46],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(profile, 14);
}

export function createGhat({ scene, uniforms, tier }) {
  const group = new THREE.Group();
  const lipX = riverX(GHAT_Z) - (RIVER_HALF + 1);
  const dxdz = (riverX(GHAT_Z + 1) - riverX(GHAT_Z - 1)) / 2;
  group.position.set(lipX, 0, GHAT_Z);
  group.rotation.y = Math.atan(dxdz);

  const stoneTex = stoneTexture();
  stoneTex.repeat.set(6, 1);
  const stone = new THREE.MeshLambertMaterial({ map: stoneTex, color: 0xd8cbb8 });
  const stoneDark = new THREE.MeshLambertMaterial({ map: stoneTex, color: 0xa89a88 });

  // Steps down into the water, each a solid block so there are no gaps.
  const stepGeos = [];
  for (let i = 0; i < STEPS; i++) {
    const top = TOP - RISE * (i + 1);
    const h = top + 5;
    const g = new THREE.BoxGeometry(RUN, h, HALF_W * 2);
    g.translate(i * RUN + RUN / 2, top - h / 2, 0);
    stepGeos.push(g);
  }
  const landing = new THREE.BoxGeometry(LANDING, TOP + 2, HALF_W * 2 + 4);
  landing.translate(-LANDING / 2, TOP / 2 - 1, 0);
  stepGeos.push(landing);
  group.add(new THREE.Mesh(mergeGeometries(stepGeos), stone));

  // Side walls and corner pillars.
  const wallGeos = [];
  for (const s of [-1, 1]) {
    // Low parapet along the landing only, so the stepped profile shows.
    const wall = new THREE.BoxGeometry(LANDING, 2.2, 1.4);
    wall.translate(-LANDING / 2, TOP - 0.3, s * (HALF_W + 1.4));
    wallGeos.push(wall);
    const pillar = new THREE.BoxGeometry(1.8, 2.6, 1.8);
    pillar.translate(0.2, TOP + 1.3, s * (HALF_W + 1.4));
    wallGeos.push(pillar);
  }
  group.add(new THREE.Mesh(mergeGeometries(wallGeos), stoneDark));

  // Reception rotunda: a western classical pavilion in white marble. Stepped
  // round plinth, eight fluted columns with bases and capitals, a moulded
  // entablature ring and a shallow dome with a lantern.
  const mx = -13.5;
  const colR = 3.9;
  const cols = 8;
  const marble = new THREE.MeshLambertMaterial({ color: 0xf2ece2 });
  const rGeos = [];
  const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  // Plinth: three circular steps.
  rGeos.push(lathe([[0, 0], [5.4, 0], [5.4, 0.3], [4.95, 0.3], [4.95, 0.6], [4.5, 0.6], [4.5, 0.9], [0, 0.9]]));
  const base = 0.9;
  const shaftH = 4.3;
  for (let i = 0; i < cols; i++) {
    const a = (i / cols) * Math.PI * 2 + Math.PI / cols;
    const cx = Math.cos(a) * colR;
    const cz = Math.sin(a) * colR;
    // Attic base, fluted shaft, capital with a square abacus.
    const foot = lathe([[0, 0], [0.5, 0], [0.5, 0.12], [0.42, 0.18], [0.44, 0.26], [0.36, 0.32], [0, 0.32]], 16);
    foot.translate(cx, base, cz);
    const shaft = new THREE.CylinderGeometry(0.29, 0.33, shaftH, 24, 6);
    const p = shaft.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k);
      const z = p.getZ(k);
      const f = 1 - 0.05 * Math.abs(Math.cos(Math.atan2(z, x) * 12));
      p.setX(k, x * f);
      p.setZ(k, z * f);
    }
    shaft.translate(cx, base + 0.32 + shaftH / 2, cz);
    const capital = lathe([[0, 0], [0.3, 0], [0.34, 0.1], [0.46, 0.26], [0, 0.26]], 16);
    capital.translate(cx, base + 0.32 + shaftH, cz);
    const abacus = new THREE.BoxGeometry(0.95, 0.16, 0.95);
    abacus.rotateY(-a);
    abacus.translate(cx, base + 0.32 + shaftH + 0.34, cz);
    rGeos.push(foot, shaft, capital, abacus);
  }
  const top = base + 0.32 + shaftH + 0.42;
  // Entablature: architrave, frieze and a projecting cornice.
  rGeos.push(lathe([[3.3, 0], [4.45, 0], [4.45, 0.34], [4.5, 0.4], [4.5, 0.72], [4.75, 0.82], [4.75, 1.0], [3.3, 1.0]]));
  rGeos[rGeos.length - 1].translate(0, top, 0);
  // Dome and lantern.
  const dome = new THREE.SphereGeometry(4.3, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.62, 1);
  dome.translate(0, top + 1.0, 0);
  const lantern = lathe([[0, 0], [0.7, 0], [0.7, 0.9], [0.9, 1.0], [0.25, 1.35], [0.12, 1.9], [0, 2.0]], 16);
  lantern.translate(0, top + 1.0 + 4.3 * 0.62 - 0.1, 0);
  rGeos.push(dome, lantern);
  const rotunda = new THREE.Mesh(mergeGeometries(rGeos.map((g) => (g.index ? g.toNonIndexed() : g))), marble);
  rotunda.position.set(mx, TOP, 0);
  group.add(rotunda);

  // String lights swagged between the column tops.
  const bulbs = [];
  const swagY = TOP + base + 0.32 + shaftH - 0.1;
  for (let i = 0; i < cols; i++) {
    const a0 = (i / cols) * Math.PI * 2 + Math.PI / cols;
    const a1 = ((i + 1) / cols) * Math.PI * 2 + Math.PI / cols;
    for (let k = 1; k < 7; k++) {
      const t = k / 7;
      const a = a0 + (a1 - a0) * t;
      bulbs.push([mx + Math.cos(a) * (colR + 0.15), swagY - 0.75 * 4 * t * (1 - t), Math.sin(a) * (colR + 0.15)]);
    }
  }

  // Kolam on the landing between the steps and the mandapam.
  const kolamMap = kolamTexture(tier.dpr > 1.3 ? 1024 : 512);
  const kolam = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 7.4),
    new THREE.MeshLambertMaterial({
      map: kolamMap,
      // Rice flour catches whatever light there is; keep it readable at dusk.
      emissiveMap: kolamMap,
      emissive: 0x4a3a2a,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  kolam.rotation.x = -Math.PI / 2;
  kolam.position.set(-4.3, TOP + 0.02, 0);
  group.add(kolam);

  // Lamps along the lip of the landing, nearest the camera first, then a
  // pair at the mandapam steps.
  const lampSpots = [];
  for (let z = HALF_W - 2; z >= -HALF_W + 2; z -= 5) lampSpots.push([-0.9, z]);
  lampSpots.push([mx + 6.2, 3.2], [mx + 6.2, -3.2]);
  const lampGeo = kuthuVilakku();
  const brass = new THREE.MeshPhongMaterial({ color: 0xc8963e, specular: 0xffd890, shininess: 60, emissive: 0x1a0e02 });
  const lamps = new THREE.InstancedMesh(lampGeo, brass, lampSpots.length);
  const m = new THREE.Matrix4();
  const S = 1.45;
  lampSpots.forEach(([x, z], i) => {
    m.makeScale(S, S, S).setPosition(x, TOP, z);
    lamps.setMatrixAt(i, m);
  });
  group.add(lamps);

  // Flames and halos as one point cloud.
  const pos = [];
  const size = [];
  const lampIdx = [];
  const kind = [];
  lampSpots.forEach(([x, z], i) => {
    const y = TOP + 1.03 * S;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      pos.push(x + Math.cos(a) * 0.24 * S, y + 0.1, z + Math.sin(a) * 0.24 * S);
      size.push(0.36);
      lampIdx.push(i);
      kind.push(0);
    }
    pos.push(x, y + 0.1, z);
    size.push(5.5);
    lampIdx.push(i);
    kind.push(1);
  });
  // Bulbs come on around the ring while the lamps are being lit.
  bulbs.forEach(([x, y, z], i) => {
    pos.push(x, y, z);
    size.push(0.8);
    lampIdx.push(1 + (i / bulbs.length) * (lampSpots.length - 2));
    kind.push(2);
  });
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  fGeo.setAttribute('aLamp', new THREE.Float32BufferAttribute(lampIdx, 1));
  fGeo.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  const flameUniforms = {
    uLevel: { value: 0 },
    uTime: uniforms.uTime,
    uViewH: { value: 800 },
    uFlame: { value: flameTexture() },
  };
  const flames = new THREE.Points(
    fGeo,
    new THREE.ShaderMaterial({
      uniforms: flameUniforms,
      vertexShader: flameVertex,
      fragmentShader: flameFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  flames.frustumCulled = false;
  group.add(flames);

  // Two warm lights carry the lamp glow onto the stone and the water.
  const glowA = new THREE.PointLight(0xffa447, 0, 46, 1.3);
  const glowB = new THREE.PointLight(0xffa447, 0, 46, 1.3);
  glowA.position.set(4, TOP + 3.5, 12);
  glowB.position.set(-5, TOP + 3.5, -10);
  // Warm light inside the rotunda from the string lights.
  const glowC = new THREE.PointLight(0xffc27a, 0, 16, 1.2);
  glowC.position.set(mx, TOP + 4.2, 0);
  group.add(glowA, glowB, glowC);

  scene.add(group);

  const n = lampSpots.length;
  const size2 = new THREE.Vector2();
  return {
    group,
    update({ light, renderer }) {
      // `lamps` rises 0..1 through dusk; each lamp takes its turn.
      const level = light.lamps * (n + 0.6);
      flameUniforms.uLevel.value = level;
      const glow = clamp(level / n, 0, 1);
      glowA.intensity = glow * 60;
      glowC.intensity = glow * 12;
      glowB.intensity = glow * 45;
      if (renderer) flameUniforms.uViewH.value = renderer.getDrawingBufferSize(size2).y;
    },
  };
}
