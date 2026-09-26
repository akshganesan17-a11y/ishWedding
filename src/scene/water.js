import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { waterNormalTexture } from './textures.js';
import { RIVER_HALF } from './util.js';

// River surface. High tier: true planar reflection (half resolution).
// Medium tier: analytic sky reflection plus darkened bank reflections near
// the edges, which reads as trees mirrored in calm water at a fraction of
// the cost.

const vertexShader = /* glsl */ `
  uniform mat4 textureMatrix;
  varying vec4 vReflUv;
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vReflUv = textureMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D uNormal;
  uniform float uUseRefl;
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uDeep;
  uniform vec3 uBank;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uGlitter;
  uniform vec3 uMoonDir;
  uniform float uMoon;
  varying vec4 vReflUv;
  varying vec3 vWorld;

  float riverX(float z) { return 24.0 * sin(z * 0.0055) + 9.0 * sin(z * 0.016 + 1.3); }

  vec3 sky(vec3 d) {
    float up = max(d.y, 0.0);
    vec3 c = mix(uHorizon, uMid, smoothstep(0.0, 0.22, up));
    c = mix(c, uTop, smoothstep(0.16, 0.75, up));
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    c += uSunColor * (pow(sd, 5.0) * 0.3 + pow(sd, 48.0) * 0.5);
    float md = max(dot(d, normalize(uMoonDir)), 0.0);
    c += vec3(0.8, 0.85, 1.0) * pow(md, 60.0) * 0.08 * uMoon;
    return c;
  }

  void main() {
    vec3 toCam = cameraPosition - vWorld;
    float dist = length(toCam);
    vec3 v = toCam / dist;

    vec2 p = vWorld.xz;
    vec3 n1 = texture2D(uNormal, p * 0.045 + vec2(0.004, -0.018) * uTime).rgb * 2.0 - 1.0;
    vec3 n2 = texture2D(uNormal, p * 0.11 + vec2(-0.012, -0.03) * uTime).rgb * 2.0 - 1.0;
    vec3 n3 = texture2D(uNormal, p * 0.31 + vec2(0.02, -0.05) * uTime).rgb * 2.0 - 1.0;
    float near = 1.0 - smoothstep(10.0, 90.0, dist);
    vec2 slope = n1.xy * 0.45 + n2.xy * 0.4 + n3.xy * 0.35 * near;
    // Calm the ripples with distance so the far river turns to a mirror.
    slope *= mix(0.22, 0.04, smoothstep(40.0, 600.0, dist));
    vec3 n = normalize(vec3(slope.x, 1.0, slope.y));

    float fres = 0.03 + 0.97 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
    vec3 r = reflect(-v, n);
    r.y = abs(r.y);

    vec3 refl = sky(r);
    if (uUseRefl > 0.5) {
      vec4 uv = vReflUv;
      uv.xy += slope * uv.w * 0.25;
      refl = texture2DProj(tDiffuse, uv).rgb;
    } else {
      // Banks and palms mirrored near the edges of the river.
      float side = abs(vWorld.x - riverX(vWorld.z)) / ${RIVER_HALF.toFixed(1)};
      float lowAngle = 1.0 - smoothstep(0.02, 0.5, r.y);
      float bank = smoothstep(0.35, 0.95, side + slope.x * 1.5) * lowAngle;
      refl = mix(refl, uBank, bank * 0.8);
    }

    // Water body: the river's own green-brown tint, lit a little by the sky.
    vec3 body = uDeep * (0.75 + 0.25 * n.y) + uHorizon * 0.06;
    vec3 col = mix(body, refl, clamp(fres * 1.1 + 0.28, 0.0, 1.0));

    vec3 sd = normalize(uSunDir);
    float s = max(dot(r, sd), 0.0);
    col += uSunColor * (pow(s, 600.0) * 18.0 + pow(s, 90.0) * 1.2) * uGlitter * step(0.0, sd.y + 0.02);
    // Moonlight path shimmering across the river.
    float ms = max(dot(r, normalize(uMoonDir)), 0.0);
    col += vec3(0.85, 0.88, 1.0) * (pow(ms, 700.0) * 6.0 + pow(ms, 120.0) * 0.35) * uMoon;

    float fog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
    col = mix(col, uFogColor, min(fog, 0.92));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createWater({ reflect = false, width = 1024, height = 1024 } = {}) {
  const normal = waterNormalTexture();
  const uniforms = {
    // Reflector writes these three.
    color: { value: new THREE.Color() },
    tDiffuse: { value: null },
    textureMatrix: { value: new THREE.Matrix4() },
    uNormal: { value: normal },
    uUseRefl: { value: reflect ? 1 : 0 },
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0, 0.1, -1) },
    uSunColor: { value: new THREE.Color() },
    uTop: { value: new THREE.Color() },
    uMid: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uDeep: { value: new THREE.Color('#1c2a2c') },
    uBank: { value: new THREE.Color('#1a1a12') },
    uFogColor: { value: new THREE.Color() },
    uFogDensity: { value: 0.0015 },
    uGlitter: { value: 1 },
    uMoonDir: { value: new THREE.Vector3(0, 0.2, -1) },
    uMoon: { value: 0 },
  };
  const plane = new THREE.PlaneGeometry(2400, 2400);
  let mesh;
  if (reflect) {
    mesh = new Reflector(plane, {
      textureWidth: width,
      textureHeight: height,
      clipBias: 0.02,
      multisample: 0,
      shader: { name: 'RiverShader', uniforms, vertexShader, fragmentShader },
    });
    // Reflector clones the uniforms; point ours at the live copies.
    for (const k of Object.keys(uniforms)) uniforms[k] = mesh.material.uniforms[k];
    uniforms.uNormal.value = normal;
  } else {
    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    blank.needsUpdate = true;
    uniforms.tDiffuse.value = blank;
    mesh = new THREE.Mesh(plane, new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader }));
  }
  // Reflector mirrors about the mesh's local XY plane, so the plane stays
  // unrotated and the mesh is laid flat instead.
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0, -600);
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}
