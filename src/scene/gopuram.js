import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gopuramTexture, stoneTexture } from './textures.js';
import { capFog, heightAt } from './util.js';
import { GOPURAM_POS } from './timeline.js';

// A Dravidian temple tower: a granite base with a doorway, seven tapering
// storeys of sculpted niches, a barrel-vault crown and a row of kalasams.
// Seen from far away, so it is built for silhouette first.

export function createGopuram({ scene }) {
  const group = new THREE.Group();

  const facade = gopuramTexture();
  facade.repeat.set(3, 1);
  const stone = stoneTexture();
  stone.repeat.set(4, 1);

  const tierMat = capFog(new THREE.MeshLambertMaterial({ map: facade, color: 0xe6c8a0 }), 0.62);
  const stoneMat = capFog(new THREE.MeshLambertMaterial({ map: stone, color: 0xb8a288 }), 0.62);
  const ledgeMat = capFog(new THREE.MeshLambertMaterial({ color: 0x9a7a58 }), 0.62);
  const goldMat = capFog(new THREE.MeshLambertMaterial({ color: 0xd9a441, emissive: 0x3a2204 }), 0.62);

  // Granite base with a tall doorway.
  const baseW = 38;
  const baseD = 22;
  const baseH = 11;
  const doorW = 6;
  const sideW = (baseW - doorW) / 2;
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sideW, baseH, baseD), stoneMat);
    b.position.set(s * (doorW / 2 + sideW / 2), baseH / 2, 0);
    group.add(b);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW, 3, baseD), stoneMat);
  lintel.position.set(0, baseH - 1.5, 0);
  group.add(lintel);

  // Storeys.
  const tiers = 7;
  let y = baseH;
  const tierGeos = [];
  const ledgeGeos = [];
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const w = baseW * (1 - t * 0.56);
    const d = baseD * (1 - t * 0.5);
    const h = 6.4 - i * 0.35;
    const ledge = new THREE.BoxGeometry(w + 1.6, 0.9, d + 1.6);
    ledge.translate(0, y + 0.45, 0);
    ledgeGeos.push(ledge);
    const box = new THREE.BoxGeometry(w, h, d);
    // Slight inward taper on each storey.
    const p = box.attributes.position;
    for (let k = 0; k < p.count; k++) {
      if (p.getY(k) > 0) {
        p.setX(k, p.getX(k) * 0.93);
        p.setZ(k, p.getZ(k) * 0.93);
      }
    }
    box.translate(0, y + 0.9 + h / 2, 0);
    tierGeos.push(box);
    y += h + 0.9;
  }
  group.add(new THREE.Mesh(mergeGeometries(tierGeos), tierMat));
  group.add(new THREE.Mesh(mergeGeometries(ledgeGeos), ledgeMat));

  // Barrel-vault crown (shala) with horned ends.
  const topW = baseW * (1 - 0.56) * 0.93 + 2;
  const vault = new THREE.CylinderGeometry(4.2, 4.2, topW, 16, 1, false, 0, Math.PI);
  vault.rotateZ(Math.PI / 2);
  vault.translate(0, y, 0);
  const crown = new THREE.Mesh(vault, tierMat);
  group.add(crown);
  for (const s of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.5, 6), ledgeMat);
    horn.position.set(s * (topW / 2 + 0.4), y + 1.6, 0);
    horn.rotation.z = -s * 0.5;
    group.add(horn);
  }

  // Kalasams: gilded finials along the ridge.
  const kalasam = new THREE.LatheGeometry(
    [
      [0, 0], [0.9, 0.1], [1.1, 0.6], [0.7, 1.1], [0.35, 1.4], [0.6, 1.8], [0.35, 2.3], [0.2, 2.8], [0, 3.2],
    ].map(([r, h]) => new THREE.Vector2(r, h)),
    10,
  );
  const n = 7;
  const kalasams = new THREE.InstancedMesh(kalasam, goldMat, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m.makeTranslation(-topW / 2 + 2 + (i * (topW - 4)) / (n - 1), y + 3.9, 0);
    kalasams.setMatrixAt(i, m);
  }
  group.add(kalasams);

  // Compound wall stretching either side of the tower.
  const wallMat = capFog(new THREE.MeshLambertMaterial({ map: stone, color: 0xb8a288 }), 0.85);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(160, 5, 2.2), wallMat);
  wall.position.set(0, 3, -4);
  group.add(wall);

  const ground = heightAt(GOPURAM_POS.x, GOPURAM_POS.z);
  group.position.set(GOPURAM_POS.x, ground - 0.5, GOPURAM_POS.z);
  // Face the approaching river.
  group.rotation.y = -0.12;
  scene.add(group);
  return { group, height: y + 7 };
}
