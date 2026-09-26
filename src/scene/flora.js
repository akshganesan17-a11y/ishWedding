import * as THREE from 'three';
import { bananaLeafTexture, frondTexture } from './textures.js';
import { addWind, capFog, GHAT_Z, heightAt, mulberry32, RIVER_HALF, riverX } from './util.js';

// Coconut palms and banana trees, one InstancedMesh each, swaying in a
// shared wind. Geometry is built procedurally in object space with y up.

// A ribbon along a curve: `center(s)` gives the spine, `side(s)` the
// half-width vector, `fold` pushes the edges down into a shallow V.
function ribbon(segments, center, side, fold = 0) {
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    const c = center(s);
    const w = side(s);
    for (const [u, sign] of [[0, -1], [0.5, 0], [1, 1]]) {
      pos.push(c.x + w.x * sign, c.y + w.y * sign - Math.abs(sign) * fold * w.length(), c.z + w.z * sign);
      uv.push(u, s);
    }
    if (i < segments) {
      const a = i * 3;
      idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  return { pos, uv, idx };
}

function merge(parts) {
  const pos = [];
  const uv = [];
  const col = [];
  const idx = [];
  const groups = [];
  for (const group of parts) {
    const start = idx.length;
    for (const p of group.items) {
      const base = pos.length / 3;
      pos.push(...p.pos);
      uv.push(...p.uv);
      const color = p.color ?? [1, 1, 1];
      for (let i = 0; i < p.pos.length / 3; i++) col.push(...(p.colors ? p.colors.slice(i * 3, i * 3 + 3) : color));
      for (const i of p.idx) idx.push(base + i);
    }
    groups.push([start, idx.length - start, group.material]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  for (const [s, c, m] of groups) g.addGroup(s, c, m);
  g.computeVertexNormals();
  return g;
}

// Tapered, slightly curved trunk with alternating growth rings.
function trunk({ height, r0, r1, lean, rings = 8, radial = 6, colorA, colorB }) {
  const pos = [];
  const uv = [];
  const idx = [];
  const colors = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const y = t * height;
    const x = lean * t * t;
    const r = r0 + (r1 - r0) * t;
    const c = i % 2 ? colorA : colorB;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      pos.push(x + Math.cos(a) * r, y, Math.sin(a) * r);
      uv.push(j / radial, t);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { pos, uv, idx, colors };
}

function palmGeometry(rnd) {
  const H = 10;
  const lean = 1.4;
  const top = new THREE.Vector3(lean, H, 0);
  const items = [];
  const fronds = 12;
  for (let i = 0; i < fronds; i++) {
    const yaw = (i / fronds) * Math.PI * 2 + rnd() * 0.3;
    const pitch = i % 3 === 0 ? 0.9 : 0.25 + rnd() * 0.45;
    const L = 4.2 + rnd() * 1.4;
    const dir = new THREE.Vector3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
    const sideV = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
    const droop = 0.9 + rnd() * 0.6;
    items.push(
      ribbon(
        7,
        (s) => {
          const d = s * L;
          return top.clone().addScaledVector(dir, d).add(new THREE.Vector3(0, -droop * d * d * 0.12, 0));
        },
        (s) => sideV.clone().multiplyScalar(0.62 * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, 0.15 + s)))),
        0.35,
      ),
    );
  }
  const trunkItem = trunk({
    height: H + 0.2,
    r0: 0.26,
    r1: 0.15,
    lean,
    colorA: new THREE.Color('#7a6a58'),
    colorB: new THREE.Color('#5e5042'),
  });
  // Coconut cluster under the crown.
  const nut = new THREE.IcosahedronGeometry(0.22, 0);
  const nuts = [];
  for (let k = 0; k < 5; k++) {
    const g = nut.clone();
    const a = (k / 5) * Math.PI * 2;
    g.translate(top.x + Math.cos(a) * 0.3, H - 0.35, Math.sin(a) * 0.3);
    nuts.push({
      pos: [...g.attributes.position.array],
      uv: [...g.attributes.uv.array],
      idx: g.index ? [...g.index.array] : [...Array(g.attributes.position.count).keys()],
      color: [0.42, 0.36, 0.16],
    });
  }
  return merge([
    { material: 0, items: [trunkItem, ...nuts] },
    { material: 1, items },
  ]);
}

function bananaGeometry(rnd) {
  const H = 2.6;
  const items = [];
  const leaves = 8;
  for (let i = 0; i < leaves; i++) {
    const yaw = (i / leaves) * Math.PI * 2 + rnd() * 0.5;
    const pitch = 0.75 + rnd() * 0.5;
    const L = 2.2 + rnd() * 0.8;
    const base = new THREE.Vector3(0, H - rnd() * 0.3, 0);
    const dir = new THREE.Vector3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
    const sideV = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
    items.push(
      ribbon(
        6,
        (s) => {
          const d = s * L;
          return base.clone().addScaledVector(dir, d).add(new THREE.Vector3(0, -d * d * 0.28, 0));
        },
        () => sideV.clone().multiplyScalar(0.36),
        0.2,
      ),
    );
  }
  const stem = trunk({
    height: H,
    r0: 0.17,
    r1: 0.12,
    lean: 0.1,
    rings: 3,
    colorA: new THREE.Color('#6b7a3c'),
    colorB: new THREE.Color('#5a6a34'),
  });
  return merge([
    { material: 0, items: [stem] },
    { material: 1, items },
  ]);
}

// Riverbank placement: dense along the water, sparse across the paddy,
// clear of the ghat landing.
function scatter(count, rnd, { near = 0.72, minD = RIVER_HALF + 5, zMin = -1250, zMax = 160, scale = [0.95, 1.55] }) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 20) {
    // Most plants where the camera looks: the first 900 m downriver.
    const z = rnd() < 0.7 ? -760 + rnd() * (zMax + 760) : zMin + rnd() * (zMax - zMin);
    const side = rnd() < 0.5 ? -1 : 1;
    const d = rnd() < near ? minD + Math.pow(rnd(), 1.6) * 26 : minD + 26 + rnd() * 220;
    const x = riverX(z) + side * d;
    if (side < 0 && Math.abs(z - GHAT_Z) < 30 && d < RIVER_HALF + 26) continue;
    const y = heightAt(x, z);
    if (y > 8) continue;
    const s = scale[0] + rnd() * (scale[1] - scale[0]);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * Math.PI * 2);
    m.compose(new THREE.Vector3(x, y - 0.2, z), q, new THREE.Vector3(s, s * (0.85 + rnd() * 0.3), s));
    out.push(m.clone());
  }
  return out;
}

export function createFlora({ scene, uniforms, tier }) {
  const rnd = mulberry32(404);

  const trunkMat = capFog(addWind(new THREE.MeshLambertMaterial({ vertexColors: true }), uniforms, { from: 0, strength: 0.35 }), 0.8);
  const frondMat = capFog(
    addWind(
      new THREE.MeshLambertMaterial({ map: frondTexture(), alphaTest: 0.45, side: THREE.DoubleSide, color: 0xd8e0b0 }),
      uniforms,
      { from: 0, strength: 0.35, leaf: 1 },
    ),
    0.8,
  );
  const palmGeo = palmGeometry(rnd);
  const palms = new THREE.InstancedMesh(palmGeo, [trunkMat, frondMat], tier.palms);
  const palmMatrices = scatter(tier.palms, rnd, {});
  palmMatrices.forEach((m, i) => palms.setMatrixAt(i, m));
  palms.count = palmMatrices.length;
  palms.computeBoundingSphere();

  const leafMat = capFog(
    addWind(
      new THREE.MeshLambertMaterial({ map: bananaLeafTexture(), alphaTest: 0.45, side: THREE.DoubleSide }),
      uniforms,
      { from: 0, strength: 0.6, leaf: 1 },
    ),
    0.8,
  );
  const stemMat = capFog(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.8);
  const bananas = new THREE.InstancedMesh(bananaGeometry(rnd), [stemMat, leafMat], tier.bananas);
  const bananaMatrices = scatter(tier.bananas, rnd, { near: 0.85, minD: RIVER_HALF + 4, scale: [0.9, 1.4] });
  bananaMatrices.forEach((m, i) => bananas.setMatrixAt(i, m));
  bananas.count = bananaMatrices.length;
  bananas.computeBoundingSphere();

  scene.add(palms, bananas);
  return { palms, bananas };
}
