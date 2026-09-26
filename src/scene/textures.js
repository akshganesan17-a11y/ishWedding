import * as THREE from 'three';
import { mulberry32 } from './util.js';

// Every texture is drawn on a canvas at startup: no image downloads.

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat = false, srgb = true, mipmaps = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = mipmaps;
  t.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.anisotropy = 4;
  return t;
}

// Tileable normal map from a sum of integer-frequency waves.
export function waterNormalTexture(size = 256) {
  const rnd = mulberry32(77);
  const waves = [];
  for (let i = 0; i < 28; i++) {
    const k = 1 + Math.floor(rnd() * (i < 8 ? 4 : 11));
    const ang = rnd() * Math.PI * 2;
    const kx = Math.round(Math.cos(ang) * k);
    const ky = Math.round(Math.sin(ang) * k) || 1;
    waves.push({ kx, ky, a: 1 / (1 + Math.hypot(kx, ky) * 0.9), p: rnd() * Math.PI * 2 });
  }
  const [c, g] = canvas(size);
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dx = 0;
      let dy = 0;
      const u = x / size;
      const v = y / size;
      for (const w of waves) {
        const ph = Math.PI * 2 * (w.kx * u + w.ky * v) + w.p;
        const cs = Math.cos(ph) * w.a;
        dx += cs * w.kx;
        dy += cs * w.ky;
      }
      const n = new THREE.Vector3(-dx * 0.09, -dy * 0.09, 1).normalize();
      const i = (y * size + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return toTexture(c, { repeat: true, srgb: false });
}

// Soft, tileable ground grain (grass, soil).
export function groundTexture(size = 256) {
  const rnd = mulberry32(5);
  const [c, g] = canvas(size);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 1 + rnd() * 5;
    const l = 96 + rnd() * 70;
    g.fillStyle = `rgba(${l},${l},${l},${0.12 + rnd() * 0.2})`;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        g.beginPath();
        g.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  return toTexture(c, { repeat: true, srgb: false });
}

// Paddy plots: rows of rice seedlings between raised bunds.
export function paddyTexture(size = 256) {
  const rnd = mulberry32(12);
  const [c, g] = canvas(size);
  const plots = 2;
  const cell = size / plots;
  for (let py = 0; py < plots; py++) {
    for (let px = 0; px < plots; px++) {
      const tone = 0.82 + rnd() * 0.3;
      const x0 = px * cell;
      const y0 = py * cell;
      g.fillStyle = `rgb(${Math.round(150 * tone)},${Math.round(190 * tone)},${Math.round(92 * tone)})`;
      g.fillRect(x0, y0, cell, cell);
      g.strokeStyle = `rgba(40,70,20,0.28)`;
      g.lineWidth = 1.2;
      const vertical = rnd() > 0.5;
      for (let r = 3; r < cell; r += 5) {
        g.beginPath();
        if (vertical) {
          g.moveTo(x0 + r, y0 + 2);
          g.lineTo(x0 + r, y0 + cell - 2);
        } else {
          g.moveTo(x0 + 2, y0 + r);
          g.lineTo(x0 + cell - 2, y0 + r);
        }
        g.stroke();
      }
      g.strokeStyle = 'rgba(205,185,140,0.9)';
      g.lineWidth = 3;
      g.strokeRect(x0 + 1.5, y0 + 1.5, cell - 3, cell - 3);
    }
  }
  return toTexture(c, { repeat: true, srgb: true });
}

// Coconut frond: a midrib with many narrow leaflets. Alpha-tested.
export function frondTexture() {
  const rnd = mulberry32(8);
  const [c, g] = canvas(64, 256);
  g.clearRect(0, 0, 64, 256);
  g.strokeStyle = '#b8c07a';
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(32, 256);
  g.lineTo(32, 0);
  g.stroke();
  for (let y = 250; y > 4; y -= 5) {
    const t = 1 - y / 256;
    const len = 30 * Math.sin(Math.min(1, t * 1.15) * Math.PI) * (0.75 + 0.25 * rnd()) + 4;
    const shade = 90 + rnd() * 60;
    g.strokeStyle = `rgb(${shade * 0.55},${shade},${shade * 0.35})`;
    g.lineWidth = 2.2;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(32, y);
      g.quadraticCurveTo(32 + s * len * 0.5, y - 5, 32 + s * len, y - 12);
      g.stroke();
    }
  }
  return toTexture(c, { mipmaps: true });
}

// Banana leaf: broad paddle with a pale midrib and a few wind tears.
export function bananaLeafTexture() {
  const rnd = mulberry32(9);
  const [c, g] = canvas(64, 256);
  const grad = g.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, '#3f7a2a');
  grad.addColorStop(0.5, '#6aa43a');
  grad.addColorStop(1, '#3f7a2a');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(32, 256);
  g.bezierCurveTo(-4, 200, 0, 40, 32, 0);
  g.bezierCurveTo(64, 40, 68, 200, 32, 256);
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    const y = 40 + rnd() * 180;
    const s = rnd() > 0.5 ? 1 : -1;
    g.fillRect(s > 0 ? 36 : 0, y, 28, 1.5);
  }
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#c9d98a';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(32, 256);
  g.lineTo(32, 0);
  g.stroke();
  g.strokeStyle = 'rgba(30,60,20,0.35)';
  g.lineWidth = 1;
  for (let y = 250; y > 10; y -= 6) {
    g.beginPath();
    g.moveTo(32, y);
    g.lineTo(4, y - 10);
    g.moveTo(32, y);
    g.lineTo(60, y - 10);
    g.stroke();
  }
  return toTexture(c);
}

// Weathered granite blocks for the ghat steps and mandapam.
export function stoneTexture(size = 256) {
  const rnd = mulberry32(31);
  const [c, g] = canvas(size);
  g.fillStyle = '#9a8f80';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 1800; i++) {
    const l = 110 + rnd() * 70;
    g.fillStyle = `rgba(${l},${l * 0.95},${l * 0.86},0.35)`;
    g.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 3, 1 + rnd() * 3);
  }
  g.strokeStyle = 'rgba(50,40,30,0.45)';
  g.lineWidth = 2;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const y = (r * size) / rows;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(size, y);
    g.stroke();
    const off = r % 2 ? size / 6 : 0;
    for (let x = off; x < size; x += size / 3) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + size / rows);
      g.stroke();
    }
  }
  return toTexture(c, { repeat: true });
}

// Gopuram tier facade: rows of niches with sculpted figures, a cornice band
// at the top. Tiles horizontally around each tier.
export function gopuramTexture() {
  const [c, g] = canvas(256, 128);
  g.fillStyle = '#c9a57c';
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#8a6a4c';
  g.fillRect(0, 0, 256, 16);
  g.fillStyle = '#e3c89f';
  g.fillRect(0, 16, 256, 5);
  for (let i = 0; i < 8; i++) {
    const x = i * 32 + 4;
    g.fillStyle = '#6f5238';
    g.beginPath();
    g.moveTo(x, 118);
    g.lineTo(x, 44);
    g.quadraticCurveTo(x + 12, 26, x + 24, 44);
    g.lineTo(x + 24, 118);
    g.fill();
    g.fillStyle = i % 2 ? '#d9b98e' : '#c2946a';
    g.beginPath();
    g.arc(x + 12, 56, 5, 0, Math.PI * 2);
    g.fill();
    g.fillRect(x + 7, 62, 10, 34);
    g.fillRect(x + 5, 96, 14, 16);
  }
  g.fillStyle = '#a07e5a';
  g.fillRect(0, 118, 256, 10);
  return toTexture(c, { repeat: true });
}

// A sikku kolam: a dot grid threaded by continuous loops, drawn in rice
// flour white with a marigold and kumkum border.
export function kolamTexture(size = 1024) {
  const [c, g] = canvas(size);
  g.clearRect(0, 0, size, size);
  const cx = size / 2;
  const n = 7;
  const step = size / (n + 3);
  const start = cx - (step * (n - 1)) / 2;

  // Outer petal rings in marigold, kumkum red and turmeric.
  const ring = (r, color, petals, w) => {
    g.fillStyle = color;
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2;
      g.save();
      g.translate(cx + Math.cos(a) * r, cx + Math.sin(a) * r);
      g.rotate(a);
      g.beginPath();
      g.ellipse(0, 0, w, w * 0.55, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  };
  ring(size * 0.475, '#f28a1a', 48, size * 0.03);
  ring(size * 0.44, '#c8202a', 40, size * 0.018);
  ring(size * 0.415, '#f6c431', 36, size * 0.012);

  g.strokeStyle = '#fbf6ea';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.lineWidth = size * 0.009;
  g.fillStyle = '#fbf6ea';

  // Diamond of dots; loops around each dot and linking curves between them.
  const dots = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (Math.abs(i - (n - 1) / 2) + Math.abs(j - (n - 1) / 2) <= (n - 1) / 2 + 0.01) {
        dots.push([start + i * step, start + j * step]);
      }
    }
  }
  for (const [x, y] of dots) {
    g.beginPath();
    g.arc(x, y, size * 0.007, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(x, y - step * 0.5);
    g.quadraticCurveTo(x + step * 0.5, y - step * 0.5, x + step * 0.5, y);
    g.quadraticCurveTo(x + step * 0.5, y + step * 0.5, x, y + step * 0.5);
    g.quadraticCurveTo(x - step * 0.5, y + step * 0.5, x - step * 0.5, y);
    g.quadraticCurveTo(x - step * 0.5, y - step * 0.5, x, y - step * 0.5);
    g.stroke();
  }
  // Four lotus petals from the centre.
  for (let k = 0; k < 4; k++) {
    g.save();
    g.translate(cx, cx);
    g.rotate((k * Math.PI) / 2 + Math.PI / 4);
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(step * 0.9, -step * 0.6, step * 2.6, -step * 0.2, step * 3.1, 0);
    g.bezierCurveTo(step * 2.6, step * 0.2, step * 0.9, step * 0.6, 0, 0);
    g.stroke();
    g.restore();
  }
  g.beginPath();
  g.arc(cx, cx, size * 0.4, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(cx, cx, size * 0.39, 0, Math.PI * 2);
  g.stroke();
  return toTexture(c);
}

// Soft teardrop flame for the lamp wicks.
export function flameTexture() {
  const [c, g] = canvas(64, 128);
  const grad = g.createRadialGradient(32, 84, 2, 32, 76, 46);
  grad.addColorStop(0, 'rgba(255,255,235,1)');
  grad.addColorStop(0.25, 'rgba(255,214,120,0.95)');
  grad.addColorStop(0.6, 'rgba(255,130,30,0.45)');
  grad.addColorStop(1, 'rgba(255,90,10,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(32, 4);
  g.bezierCurveTo(46, 44, 60, 76, 52, 100);
  g.bezierCurveTo(46, 122, 18, 122, 12, 100);
  g.bezierCurveTo(4, 76, 18, 44, 32, 4);
  g.fill();
  return toTexture(c);
}

// Petal atlas: left half a jasmine flower, right half a marigold petal.
export function petalTexture() {
  const [c, g] = canvas(128, 64);
  g.clearRect(0, 0, 128, 64);
  g.save();
  g.translate(32, 32);
  for (let i = 0; i < 5; i++) {
    g.rotate((Math.PI * 2) / 5);
    const grad = g.createLinearGradient(0, 0, 0, -26);
    grad.addColorStop(0, '#f4ecc8');
    grad.addColorStop(1, '#ffffff');
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, -14, 6.5, 13, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#e8d890';
  g.beginPath();
  g.arc(0, 0, 3.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
  const grad = g.createRadialGradient(96, 40, 2, 96, 32, 26);
  grad.addColorStop(0, '#ffb31a');
  grad.addColorStop(0.7, '#f07f10');
  grad.addColorStop(1, '#d95f06');
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(96, 58);
  g.bezierCurveTo(70, 44, 74, 10, 86, 8);
  g.quadraticCurveTo(91, 13, 96, 7);
  g.quadraticCurveTo(101, 13, 106, 8);
  g.bezierCurveTo(118, 10, 122, 44, 96, 58);
  g.fill();
  return toTexture(c);
}
