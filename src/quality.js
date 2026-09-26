// Picks a quality tier before any 3D code is downloaded.
//   high:   planar water reflections, dense vegetation, full bloom
//   medium: cheaper water, fewer plants, 30 fps cap
//   low:    the still poster with CSS animation, no WebGL at all
// Override with ?tier=high|medium|low.

const WEAK_GPU = /(Mali-(4|T6|T7|G31|G51|G52))|(Adreno \(TM\) (3|4|50|505|506|508|509|510|512))|PowerVR (SGX|Rogue GE)|SwiftShader|llvmpipe|softpipe|Microsoft Basic/i;
const MID_GPU = /(Mali-G(57|68|71|72|76))|(Adreno \(TM\) (6[0-4]\d|5\d\d))|PowerVR/i;

function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return { webgl2: false, name: '' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { webgl2: true, name: String(name || '') };
  } catch {
    return { webgl2: false, name: '' };
  }
}

// Short CPU probe: how long a fixed chunk of float math takes. A modern
// phone finishes in 3-6 ms; old budget phones take 15 ms or more.
function cpuProbe() {
  const t0 = performance.now();
  let x = 0;
  for (let i = 0; i < 300000; i++) x += Math.sin(i * 0.001) * Math.sqrt(i);
  const ms = performance.now() - t0;
  return x === Infinity ? 999 : ms;
}

// Frame-time probe: median gap between a handful of animation frames. Flags
// devices that are already struggling (or on 30 Hz power-saving modes).
function frameProbe(frames = 12) {
  return new Promise((resolve) => {
    const gaps = [];
    let last = 0;
    const tick = (now) => {
      if (last) gaps.push(now - last);
      last = now;
      if (gaps.length < frames) requestAnimationFrame(tick);
      else resolve(gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)]);
    };
    requestAnimationFrame(tick);
    setTimeout(() => resolve(gaps.length ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 100), 1500);
  });
}

export async function detectTier() {
  const forced = new URLSearchParams(location.search).get('tier');
  const info = {};
  if (['high', 'medium', 'low'].includes(forced)) return { tier: forced, info: { forced } };

  const conn = navigator.connection;
  info.saveData = Boolean(conn?.saveData);
  info.memory = navigator.deviceMemory ?? null;
  info.cores = navigator.hardwareConcurrency ?? null;
  const gpu = gpuName();
  info.webgl2 = gpu.webgl2;
  info.gpu = gpu.name;
  info.mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
  info.cpuMs = Math.round(cpuProbe() * 10) / 10;
  info.frameMs = Math.round((await frameProbe()) * 10) / 10;

  const low =
    info.saveData ||
    !info.webgl2 ||
    WEAK_GPU.test(info.gpu) ||
    (info.memory !== null && info.memory < 2) ||
    (info.cores !== null && info.cores <= 2) ||
    info.cpuMs > 28 ||
    info.frameMs > 45;
  if (low) return { tier: 'low', info };

  const strong =
    !MID_GPU.test(info.gpu) &&
    (info.memory === null || info.memory >= 6) &&
    (info.cores === null || info.cores >= 6) &&
    info.cpuMs < 9 &&
    info.frameMs < 20;
  if (strong && (!info.mobile || /Apple|Adreno \(TM\) (7\d\d|8\d\d)|Mali-G(7[7-9]|710|715|720)|Immortalis|Xclipse/i.test(info.gpu) || info.memory >= 8)) {
    return { tier: 'high', info };
  }
  return { tier: 'medium', info };
}
