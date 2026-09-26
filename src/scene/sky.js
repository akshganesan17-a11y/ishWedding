import * as THREE from 'three';

// Gradient sky dome with a sun disc, a warm scattering glow around it, a
// hazy horizon band and faint stars after dusk. Follows the camera.

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform float uSunDisc;
  uniform float uGlow;
  uniform float uStars;
  uniform vec3 uMoonDir;
  uniform float uMoon;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    float up = max(h, 0.0);
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, up));
    col = mix(col, uTop, smoothstep(0.16, 0.75, up));
    // Below the horizon the dome is hidden by hills; keep it horizon-coloured.
    col = mix(col, uHorizon * 0.92, smoothstep(0.0, -0.08, h));

    float sd = max(dot(dir, normalize(uSunDir)), 0.0);
    float horizonBoost = 1.0 - smoothstep(0.0, 0.5, up);
    col += uSunColor * (pow(sd, 5.0) * 0.35 * horizonBoost + pow(sd, 48.0) * 0.55) * uGlow;
    col += uSunColor * smoothstep(0.99925, 0.99965, sd) * uSunDisc;

    // Haze band that hugs the horizon.
    col = mix(col, uHorizon * 1.05, exp(-abs(h) * 22.0) * 0.35);

    // Moon: a softly lit disc with darker maria and a halo.
    if (uMoon > 0.0) {
      vec3 md = normalize(uMoonDir);
      float m = dot(dir, md);
      float disc = smoothstep(0.99955, 0.99968, m);
      vec3 side = normalize(cross(md, vec3(0.0, 1.0, 0.0)));
      vec3 upv = cross(side, md);
      vec2 q = vec2(dot(dir, side), dot(dir, upv)) / 0.0254;
      float maria = smoothstep(0.35, 0.05, length(q - vec2(-0.25, 0.2))) * 0.28
                  + smoothstep(0.3, 0.05, length(q - vec2(0.3, -0.15))) * 0.22
                  + smoothstep(0.22, 0.02, length(q - vec2(0.05, 0.45))) * 0.18;
      vec3 moonCol = vec3(1.0, 0.95, 0.86) * (1.0 - maria) * 2.2;
      col = mix(col, moonCol, disc * uMoon);
      col += vec3(0.75, 0.8, 1.0) * (pow(max(m, 0.0), 900.0) * 0.35 + pow(max(m, 0.0), 60.0) * 0.06) * uMoon;
    }

    if (uStars > 0.0 && h > 0.04) {
      vec3 cell = floor(dir * 260.0);
      float s = hash(cell);
      float star = step(0.9965, s) * smoothstep(0.04, 0.35, h);
      col += vec3(0.9, 0.92, 1.0) * star * uStars * (0.5 + 0.5 * hash(cell + 3.1));
    }
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSky() {
  const uniforms = {
    uTop: { value: new THREE.Color() },
    uMid: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uSunColor: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 0.1, -1) },
    uSunDisc: { value: 6 },
    uGlow: { value: 1 },
    uStars: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(0, 0.2, -1) },
    uMoon: { value: 0 },
  };
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1000, 32, 16),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return {
    mesh,
    uniforms,
    follow(camera) {
      mesh.position.copy(camera.position);
    },
  };
}
