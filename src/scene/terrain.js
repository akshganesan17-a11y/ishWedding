import * as THREE from 'three';
import { groundTexture, paddyTexture } from './textures.js';
import { capFog, fbm, heightAt, paddyMask, RIVER_HALF, riverX, smoothstep } from './util.js';

// A grid that follows the river: rows run along Z, columns are offsets from
// the river centreline, packed densely near the banks and sparsely far away.

const cMud = new THREE.Color('#6e5a42');
const cSand = new THREE.Color('#a48a64');
const cGrass = new THREE.Color('#4d6e30');
const cGrassDry = new THREE.Color('#7a7a3a');
const cHill = new THREE.Color('#44583a');
const cHillFar = new THREE.Color('#5d6650');

export function createTerrain({ rows = 200, cols = 96, zNear = 260, zFar = -1700, span = 1400 } = {}) {
  const half = cols / 2;
  const positions = new Float32Array((rows + 1) * (cols + 1) * 3);
  const colors = new Float32Array((rows + 1) * (cols + 1) * 3);
  const paddy = new Float32Array((rows + 1) * (cols + 1));
  const uvs = new Float32Array((rows + 1) * (cols + 1) * 2);
  const col = new THREE.Color();

  let k = 0;
  for (let r = 0; r <= rows; r++) {
    const z = zNear + (zFar - zNear) * (r / rows);
    const cx = riverX(z);
    for (let c = 0; c <= cols; c++) {
      const u = (c - half) / half; // -1..1
      const off = Math.sign(u) * Math.pow(Math.abs(u), 2.2) * span;
      const x = cx + off;
      const y = heightAt(x, z);
      positions[k * 3] = x;
      positions[k * 3 + 1] = y;
      positions[k * 3 + 2] = z;
      uvs[k * 2] = x / 36;
      uvs[k * 2 + 1] = z / 36;

      const d = Math.abs(off);
      const n = fbm(x * 0.01, z * 0.01, 2);
      col.copy(cMud);
      col.lerp(cSand, smoothstep(RIVER_HALF - 6, RIVER_HALF + 1, d) * (1 - smoothstep(RIVER_HALF + 2, RIVER_HALF + 8, d)) * 0.8);
      col.lerp(cGrass.clone().lerp(cGrassDry, 0.5 + n * 0.8), smoothstep(RIVER_HALF + 4, RIVER_HALF + 12, d));
      const hill = smoothstep(4, 30, y);
      col.lerp(cHill, hill);
      col.lerp(cHillFar, smoothstep(40, 90, y) * 0.6);
      colors[k * 3] = col.r;
      colors[k * 3 + 1] = col.g;
      colors[k * 3 + 2] = col.b;
      paddy[k] = paddyMask(x, z) * (1 - hill);
      k++;
    }
  }

  const index = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + cols + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('aPaddy', new THREE.BufferAttribute(paddy, 1));
  geo.setIndex(index);
  geo.computeVertexNormals();

  const detail = groundTexture();
  const paddyMap = paddyTexture();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: detail });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uPaddy = { value: paddyMap };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aPaddy;\nvarying float vPaddy;\nvarying vec2 vWorldUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvPaddy = aPaddy;\nvWorldUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uPaddy;\nvarying float vPaddy;\nvarying vec2 vWorldUv;')
      .replace('#include <map_fragment>', 'vec4 grain = texture2D(map, vWorldUv * 0.6);')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        diffuseColor.rgb *= 0.7 + grain.r * 0.6;
        vec3 paddyCol = texture2D(uPaddy, vWorldUv * 0.35).rgb;
        diffuseColor.rgb = mix(diffuseColor.rgb, paddyCol * (0.8 + grain.r * 0.4), vPaddy);`,
      );
  };
  capFog(mat, 0.9);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = false;
  return { mesh };
}
