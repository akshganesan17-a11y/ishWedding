import { createNoise2D } from 'simplex-noise';

// Shared world definition. The river runs toward -Z; the camera glides
// downriver as the guest scrolls. Units are roughly metres.

export const RIVER_HALF = 22;
export const GHAT_Z = -250;
export const GOPURAM_Z = -1040;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const riverX = (z) => 24 * Math.sin(z * 0.0055) + 9 * Math.sin(z * 0.016 + 1.3);

const noise = createNoise2D(mulberry32(1029));
export const fbm = (x, z, oct = 4) => {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    sum += amp * noise(x * f, z * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return sum;
};

// Ground height. Riverbed below 0 (water level), a short bank, flat paddy
// plains, then low hills rising with distance from the river and far
// beyond the gopuram.
export function heightAt(x, z) {
  const d = Math.abs(x - riverX(z));
  const bank = smoothstep(RIVER_HALF - 8, RIVER_HALF + 6, d);
  let h = lerp(-3.2, 1.3, bank);
  h += bank * fbm(x * 0.02, z * 0.02, 2) * 0.35;
  const hillMask = Math.max(smoothstep(240, 620, d), smoothstep(-1200, -1500, z) * smoothstep(60, 220, d));
  if (hillMask > 0) {
    const n = fbm(x * 0.0026 + 7.1, z * 0.0026 - 3.4, 4);
    h += hillMask * (26 + 70 * Math.max(0, n + 0.35));
  }
  return h;
}

// Zone of a ground point, used for colouring: 0 = river edge, 1 = paddy.
export const paddyMask = (x, z) => {
  const d = Math.abs(x - riverX(z));
  return smoothstep(RIVER_HALF + 26, RIVER_HALF + 44, d) * (1 - smoothstep(230, 300, d));
};

// Keeps distant objects from dissolving fully into the haze, so the gopuram
// and far hills stay as soft silhouettes against the sky.
export function capFog(material, cap) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer);
    shader.uniforms.uFogCap = { value: cap };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <fog_pars_fragment>', '#include <fog_pars_fragment>\nuniform float uFogCap;')
      .replace(
        '#include <fog_fragment>',
        `#ifdef USE_FOG
          float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, min( fogFactor, uFogCap ) );
        #endif`,
      );
  };
  const prevKey = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}capfog-${cap}`;
  return material;
}

// Sways vertices above `from` metres (in object space) with a gust that
// travels across the world. Instance position gives each plant its phase.
export function addWind(material, uniforms, { from = 0, strength = 0.35, leaf = 0 } = {}) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev?.(shader, renderer);
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWind = uniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          vec3 base = vec3(0.0);
          #ifdef USE_INSTANCING
            base = instanceMatrix[3].xyz;
          #endif
          float h = max(0.0, position.y - ${from.toFixed(2)});
          float gust = sin(uTime * 0.9 + base.x * 0.05 + base.z * 0.03) * 0.6
                     + sin(uTime * 2.1 + base.z * 0.11) * 0.25;
          float sway = h * h * ${strength.toFixed(3)} * 0.01 * uWind * (1.0 + gust);
          transformed.x += sway;
          transformed.z += sway * 0.4;
          ${leaf ? `transformed.y += sin(uTime * 3.1 + position.x * 1.9 + position.z * 1.3 + base.x) * 0.014 * h * uWind;` : ''}
        }`,
      );
  };
  const key = `wind-${from}-${strength}-${leaf}`;
  const prevKey = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}${key}`;
  return material;
}
