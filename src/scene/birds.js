import * as THREE from 'three';
import { mulberry32 } from './util.js';

// Small flocks flying in loose V formations across the sky ahead of the
// camera. Each bird is one instance of a tiny winged mesh; the wings flap
// in the vertex shader, the flight paths are updated on the CPU.

function birdGeometry() {
  // Body along -Z (forward), wings along ±X with a bent wrist.
  const v = [
    // body
    0, 0, -0.35, 0.07, 0, 0.1, -0.07, 0, 0.1,
    0, 0, 0.1, 0.1, 0, 0.42, -0.1, 0, 0.42,
  ];
  for (const s of [1, -1]) {
    // inner wing, outer wing
    v.push(0.05 * s, 0, -0.12, 0.55 * s, 0.04, -0.02, 0.05 * s, 0, 0.12);
    v.push(0.55 * s, 0.04, -0.02, 1.1 * s, 0, 0.22, 0.05 * s, 0, 0.12);
    v.push(0.55 * s, 0.04, -0.02, 1.1 * s, 0, 0.22, 0.55 * s, 0.04, 0.12);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

const FLOCKS = [
  // lateral speed (m/s), distance ahead, height above camera, start offset, birds
  { speed: 7, ahead: 70, up: 16, offset: 0, count: 7 },
  { speed: -6, ahead: 110, up: 26, offset: 150, count: 5 },
  { speed: 8, ahead: 50, up: 11, offset: 260, count: 3 },
];
// Long enough that a flock wraps well outside the frame.
const SPAN = 260;

export function createBirds({ scene, uniforms, tier }) {
  if (tier.reducedMotion) return null;
  const rnd = mulberry32(88);
  const total = FLOCKS.reduce((n, f) => n + f.count, 0);

  const material = new THREE.MeshBasicMaterial({ color: 0x1a1512, side: THREE.DoubleSide, fog: true });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float phase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
        float flap = sin(uTime * 7.5 + phase);
        float reach = abs(position.x);
        transformed.y += flap * reach * reach * 0.55;
        transformed.x *= 1.0 - 0.12 * max(flap, 0.0);`,
      );
  };
  const mesh = new THREE.InstancedMesh(birdGeometry(), material, total);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // Per-bird slot in its flock's V, plus a little individual wobble.
  const birds = [];
  FLOCKS.forEach((f, fi) => {
    for (let i = 0; i < f.count; i++) {
      const rank = Math.ceil(i / 2);
      const side = i === 0 ? 0 : i % 2 ? 1 : -1;
      birds.push({ fi, back: rank * 5, side: side * rank * 4, bob: rnd() * 6.28, scale: 2.2 + rnd() * 0.6 });
    }
  });

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const look = new THREE.Matrix4();

  return {
    mesh,
    update({ camera, time, light }) {
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, up).normalize();
      // Silhouettes against the sky, softened by the haze of the hour.
      material.color.set(0x16110e).lerp(light.fog, 0.18);

      birds.forEach((b, i) => {
        const f = FLOCKS[b.fi];
        const travel = ((((time * f.speed + f.offset) % SPAN) + SPAN) % SPAN) - SPAN / 2;
        const heading = Math.sign(f.speed);
        dir.copy(right).multiplyScalar(heading);
        p.copy(camera.position)
          .addScaledVector(forward, f.ahead + b.side * 0.8)
          .addScaledVector(right, travel - heading * b.back)
          .addScaledVector(forward, b.side);
        p.y = camera.position.y + f.up + Math.sin(time * 0.9 + b.bob) * 0.6;
        look.lookAt(p, p.clone().add(dir), up);
        q.setFromRotationMatrix(look);
        s.setScalar(b.scale);
        m.compose(p, q, s);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      // Birds head home once the lamps are lit.
      mesh.visible = light.lamps < 0.9;
    },
  };
}
