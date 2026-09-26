import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sampleCamera } from './timeline.js';
import { riverX } from './util.js';

// Small wooden country boats moored in the stream, rocking on the current.
// The hull is lofted from U-shaped cross-sections with upswept ends; the
// water surface hides everything below the waterline.

const LENGTH = 6.2;

function hullGeometry() {
  const segL = 24;
  const segR = 10;
  const pos = [];
  const col = [];
  const idx = [];
  const plankA = new THREE.Color('#6b4428');
  const plankB = new THREE.Color('#57361f');
  const rim = new THREE.Color('#8a5a33');
  for (let i = 0; i <= segL; i++) {
    const u = (i / segL) * 2 - 1; // -1 bow .. 1 stern
    const taper = Math.max(0, 1 - u * u);
    const halfW = 0.82 * Math.pow(taper, 0.55) + 0.02;
    const depth = 0.55 * Math.pow(taper, 0.35) + 0.05;
    const top = 0.32 + 0.42 * Math.pow(Math.abs(u), 4);
    for (let j = 0; j <= segR; j++) {
      const th = (j / segR) * Math.PI;
      const x = -Math.cos(th) * halfW;
      const y = top - Math.sin(th) * (depth + (top - 0.32));
      pos.push(x, y, u * (LENGTH / 2));
      // Horizontal planks, with a lighter rubbing strip along the gunwale.
      const c = j === 0 || j === segR ? rim : Math.floor(j / 2) % 2 ? plankA : plankB;
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segL; i++) {
    for (let j = 0; j < segR; j++) {
      const a = i * (segR + 1) + j;
      const b = a + segR + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function paint(geo, hex) {
  const c = new THREE.Color(hex);
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  return g;
}

export function createBoat({ scene }) {
  const parts = [hullGeometry().toNonIndexed()];
  // Two thwarts (seats) across the hull.
  for (const z of [-1.1, 0.9]) {
    const seat = new THREE.BoxGeometry(1.5, 0.07, 0.34);
    seat.translate(0, 0.2, z);
    parts.push(paint(seat, '#7a5232'));
  }
  // An oar resting across the boat.
  const oar = new THREE.CylinderGeometry(0.035, 0.035, 3.4, 6);
  oar.rotateZ(Math.PI / 2);
  oar.rotateY(0.35);
  oar.translate(0.1, 0.36, 0.2);
  const blade = new THREE.BoxGeometry(0.5, 0.03, 0.2);
  blade.rotateY(0.35);
  blade.translate(1.7, 0.36, -0.42);
  parts.push(paint(oar, '#8a6a44'), paint(blade, '#8a6a44'));
  // A folded mat and a small brass pot for a touch of life.
  const mat = new THREE.BoxGeometry(0.9, 0.08, 0.6);
  mat.translate(0, 0.05, -2.0);
  const pot = new THREE.SphereGeometry(0.16, 10, 8);
  pot.translate(0.25, 0.12, 1.9);
  parts.push(paint(mat, '#b0463a'), paint(pot, '#c09040'));
  for (const p of parts) if (p.attributes.uv) p.deleteAttribute('uv');

  const geometry = mergeGeometries(parts);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });

  // Moored boats placed in the line of sight of two chapters: one off to the
  // right in the golden-hour view, one on the sunrise glitter path at dawn.
  // `distance` is metres downstream of the chapter's camera; `offset` is
  // metres from the river's centre line, so the boat always sits on water.
  const SPOTS = [
    { chapter: 0, distance: 50, offset: 6, turn: 0.5 },
    { chapter: 2, distance: 70, offset: -13, turn: -0.6 },
  ];
  const boats = SPOTS.map(({ chapter, distance, offset, turn }, i) => {
    const z0 = sampleCamera(chapter).pos.z - distance;
    const spot = new THREE.Vector3(riverX(z0) + offset, 0, z0);
    const heading = Math.atan((riverX(spot.z + 1) - riverX(spot.z - 1)) / 2) + turn;
    const boat = new THREE.Mesh(geometry, material);
    boat.scale.setScalar(1.25);
    const holder = new THREE.Group();
    holder.position.set(spot.x, 0, spot.z);
    holder.rotation.y = heading;
    holder.add(boat);
    scene.add(holder);
    return { boat, holder, heading, phase: i * 2.1 };
  });

  return {
    update({ time }) {
      for (const b of boats) {
        const t = time + b.phase;
        // Gentle bob, roll and pitch; a slow swing on the mooring.
        b.boat.position.y = -0.18 + Math.sin(t * 1.1) * 0.05;
        b.boat.rotation.z = Math.sin(t * 0.9 + 1.2) * 0.035;
        b.boat.rotation.x = Math.sin(t * 0.7) * 0.02;
        b.holder.rotation.y = b.heading + Math.sin(t * 0.15) * 0.12;
      }
    },
  };
}
