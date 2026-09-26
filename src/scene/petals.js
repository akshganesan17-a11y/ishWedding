import * as THREE from 'three';
import { petalTexture } from './textures.js';
import { mulberry32 } from './util.js';

// Jasmine flowers and marigold petals drifting down around the camera.
// One point cloud; positions are computed on the GPU and wrap inside a box
// that follows the camera, so the drift never runs out.

const vertexShader = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform vec3 uCam;
  uniform vec3 uBox;
  uniform float uViewH;
  uniform float uSize;
  varying float vKind;
  varying float vAngle;
  varying float vFog;
  uniform float uFogDensity;
  void main() {
    float speed = 0.55 + aSeed.w * 0.5;
    vec3 p = aSeed.xyz * uBox;
    p.y -= uTime * speed;
    p.x += uTime * 0.35 + sin(uTime * 0.8 + aSeed.w * 30.0) * 0.9;
    p.z += cos(uTime * 0.6 + aSeed.x * 20.0) * 0.7;
    // Wrap into a box centred on the camera.
    vec3 origin = uCam - uBox * vec3(0.5, 0.35, 0.5);
    p = mod(p - origin, uBox) + origin;

    vKind = step(0.62, fract(aSeed.w * 7.13));
    vAngle = uTime * (0.8 + aSeed.x * 2.0) + aSeed.z * 6.28;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = -mv.z;
    vFog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist * 30.0);
    // Tumbling: petals shrink as they turn edge-on.
    float tumble = 0.55 + 0.45 * abs(sin(vAngle * 0.7));
    float px = uSize * (0.7 + aSeed.y * 0.6) * tumble * projectionMatrix[1][1] * uViewH * 0.5 / max(dist, 0.5);
    // A petal right at the lens would fill the screen; keep it a petal.
    gl_PointSize = min(px, uViewH * 0.035);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uLight;
  uniform vec3 uFogColor;
  varying float vKind;
  varying float vAngle;
  varying float vFog;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vAngle), s = sin(vAngle);
    uv = mat2(c, -s, s, c) * uv + 0.5;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
    vec4 t = texture2D(uMap, vec2(uv.x * 0.5 + vKind * 0.5, 1.0 - uv.y));
    if (t.a < 0.4) discard;
    vec3 col = t.rgb * uLight;
    col = mix(col, uFogColor, clamp(vFog, 0.0, 0.8));
    gl_FragColor = vec4(col, t.a);
  }
`;

export function createPetals({ scene, uniforms, tier }) {
  if (!tier.petals) return null;
  const rnd = mulberry32(2026);
  const seeds = new Float32Array(tier.petals * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tier.petals * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));

  const u = {
    uTime: uniforms.uTime,
    uCam: { value: new THREE.Vector3() },
    uBox: { value: new THREE.Vector3(34, 18, 34) },
    uViewH: { value: 800 },
    uSize: { value: 0.2 },
    uMap: { value: petalTexture() },
    uLight: { value: new THREE.Color() },
    uFogColor: { value: new THREE.Color() },
    uFogDensity: { value: 0.001 },
  };
  const points = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({ uniforms: u, vertexShader, fragmentShader, transparent: true, depthWrite: false }),
  );
  points.frustumCulled = false;
  points.renderOrder = 5;
  points.userData.noReflect = true;
  scene.add(points);

  const size = new THREE.Vector2();
  return {
    points,
    update({ light, camera, renderer }) {
      u.uCam.value.copy(camera.position);
      u.uViewH.value = renderer.getDrawingBufferSize(size).y;
      // Petals catch the ambient light, plus a little of the sun and lamps.
      const c = u.uLight.value;
      const sunK = Math.max(0, light.sunI) * 0.18;
      c.copy(light.hemiSky).multiplyScalar(light.hemiI * 0.75);
      c.r += light.sun.r * sunK + light.lamps * 0.25;
      c.g += light.sun.g * sunK + light.lamps * 0.14;
      c.b += light.sun.b * sunK;
      u.uFogColor.value.copy(light.fog);
      u.uFogDensity.value = light.fogD;
    },
  };
}
