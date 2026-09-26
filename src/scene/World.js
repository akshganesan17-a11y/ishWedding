import * as THREE from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { createSky } from './sky.js';
import { createTerrain } from './terrain.js';
import { createTimeState, sampleCamera, sampleTime } from './timeline.js';
import { createWater } from './water.js';

// The 3D river valley. Owns the renderer, scene graph, post-processing and
// render loop; the page tells it where the story is via setStory().

export async function createWorld({ container, tier, reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    stencil: false,
    depth: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: Boolean(tier.capture),
  });
  let dpr = Math.min(window.devicePixelRatio || 1, tier.dpr);
  renderer.setPixelRatio(dpr);
  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, 0.0017);
  const camera = new THREE.PerspectiveCamera(52, container.clientWidth / container.clientHeight, 0.5, 3000);

  const uniforms = { uTime: { value: 0 }, uWind: { value: reducedMotion ? 0.3 : 1 } };

  const sun = new THREE.DirectionalLight(0xffffff, 2);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(sun, sun.target, hemi);

  const sky = createSky();
  scene.add(sky.mesh);

  const terrain = createTerrain(tier.terrain);
  scene.add(terrain.mesh);

  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const water = createWater({
    reflect: tier.reflect,
    width: Math.round(size.x * tier.reflScale),
    height: Math.round(size.y * tier.reflScale),
  });
  scene.add(water.mesh);

  const layers = [];
  for (const build of tier.layers ?? []) {
    const layer = await build({ scene, uniforms, tier, camera, renderer });
    if (layer) layers.push(layer);
  }

  // Petals drift right past the lens; leave them out of the reflection.
  let reflecting = tier.reflect;
  if (tier.reflect) {
    const hidden = [];
    scene.traverse((o) => o.userData.noReflect && hidden.push(o));
    const renderReflection = water.mesh.onBeforeRender;
    water.mesh.onBeforeRender = (...args) => {
      if (!reflecting) return;
      for (const o of hidden) o.visible = false;
      renderReflection.apply(water.mesh, args);
      for (const o of hidden) o.visible = true;
    };
  }
  // Falls back to the cheaper sky-only water when the device is struggling.
  function stopReflections() {
    if (!reflecting) return false;
    reflecting = false;
    water.uniforms.uUseRefl.value = 0;
  }

  // Post-processing: bloom on the sun, flames and glitter; ACES tone mapping.
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new BloomEffect({
    intensity: tier.bloom ? 1.1 : 0,
    luminanceThreshold: 0.82,
    luminanceSmoothing: 0.2,
    mipmapBlur: true,
    radius: 0.7,
  });
  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const effects = tier.bloom ? [bloom, toneMapping] : [toneMapping];
  const effectPass = new EffectPass(camera, ...effects);
  composer.addPass(effectPass);

  // ---------- Story state ----------

  const target = { chapter: 0, time: 0 };
  const shown = { chapter: 0, time: 0 };
  const cam = sampleCamera(0);
  const light = createTimeState();
  let cutIndex = 0;

  function setStory(s) {
    target.chapter = s.camera ?? s.chapter;
    target.time = s.time;
    if (reducedMotion) {
      // No camera travel: cut between fixed views with a short cross-fade.
      const idx = Math.round(s.chapter);
      if (idx !== cutIndex) {
        cutIndex = idx;
        container.classList.add('is-cut');
        setTimeout(() => {
          shown.chapter = idx;
          shown.time = idx;
          container.classList.remove('is-cut');
        }, 320);
      }
    }
  }

  function applyLight(dt) {
    sampleTime(shown.time, light);
    sky.uniforms.uTop.value.copy(light.top);
    sky.uniforms.uMid.value.copy(light.mid);
    sky.uniforms.uHorizon.value.copy(light.horizon);
    sky.uniforms.uSunColor.value.copy(light.sun);
    sky.uniforms.uSunDir.value.copy(light.sunDir);
    sky.uniforms.uSunDisc.value = light.disc;
    sky.uniforms.uGlow.value = light.glow;
    sky.uniforms.uStars.value = light.stars;
    sky.uniforms.uMoonDir.value.copy(light.moonDir);
    sky.uniforms.uMoon.value = light.moon;

    const w = water.uniforms;
    w.uSunDir.value.copy(light.sunDir);
    w.uSunColor.value.copy(light.sun);
    w.uTop.value.copy(light.top);
    w.uMid.value.copy(light.mid);
    w.uHorizon.value.copy(light.horizon);
    w.uDeep.value.copy(light.deep);
    w.uBank.value.copy(light.bank);
    w.uFogColor.value.copy(light.fog);
    w.uFogDensity.value = light.fogD;
    w.uGlitter.value = light.glitter;
    w.uMoonDir.value.copy(light.moonDir);
    w.uMoon.value = light.moon;

    scene.fog.color.copy(light.fog);
    scene.fog.density = light.fogD;
    sun.color.copy(light.sun);
    sun.intensity = light.sunI;
    sun.position.copy(camera.position).addScaledVector(light.sunDir, 400);
    sun.target.position.copy(camera.position);
    hemi.color.copy(light.hemiSky);
    hemi.groundColor.copy(light.hemiGround);
    hemi.intensity = light.hemiI;
    renderer.toneMappingExposure = light.exposure;

    for (const layer of layers) layer.update?.({ light, camera, renderer, time: uniforms.uTime.value, dt, chapter: shown.chapter });
  }

  const sway = new THREE.Vector3();
  function applyCamera(t) {
    sampleCamera(shown.chapter, cam);
    camera.position.copy(cam.pos);
    if (!reducedMotion) {
      sway.set(Math.sin(t * 0.21) * 0.6, Math.sin(t * 0.33) * 0.25, 0);
      camera.position.add(sway);
    }
    camera.lookAt(cam.target);
    sky.follow(camera);
  }

  // ---------- Loop, frame cap and adaptive quality ----------

  let raf = 0;
  let last = 0;
  let frameAvg = 16;
  let slowFrames = 0;
  let running = false;
  const minFrame = 1000 / tier.fpsCap - 2;

  const degrade = [
    () => setDpr(Math.max(1, dpr - 0.25)),
    stopReflections,
    () => setDpr(Math.max(1, dpr - 0.25)),
    () => {
      if (!tier.bloom) return false;
      bloom.intensity = 0;
      effectPass.setEffects?.([toneMapping]);
    },
    () => setDpr(0.85),
  ];

  function setDpr(value) {
    if (value >= dpr) return false;
    dpr = value;
    renderer.setPixelRatio(dpr);
    resize();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < minFrame) return;
    const dtMs = last ? now - last : 16;
    last = now;
    frameAvg = frameAvg * 0.94 + dtMs * 0.06;

    const dt = Math.min(dtMs / 1000, 0.1);
    uniforms.uTime.value += dt;
    water.uniforms.uTime.value = uniforms.uTime.value;

    if (!reducedMotion) {
      const k = 1 - Math.exp(-dt * 3.2);
      shown.chapter += (target.chapter - shown.chapter) * k;
      shown.time += (target.time - shown.time) * k;
    }
    applyCamera(uniforms.uTime.value);
    applyLight(dt);
    composer.render(dt);

    // Step quality down if we stay under ~28 fps for a couple of seconds.
    if (frameAvg > 36) {
      if (++slowFrames > 60 && degrade.length) {
        while (degrade.length && degrade.shift()() === false);
        slowFrames = 0;
        frameAvg = 20;
      }
    } else slowFrames = 0;
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    // Frame by horizontal field so a portrait phone still sees both banks.
    const hfov = THREE.MathUtils.degToRad(w > h ? 70 : 46);
    camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / camera.aspect)), 40, 80);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    composer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  resize();

  // Compile shaders and draw a first frame before revealing the canvas.
  applyCamera(0);
  applyLight(0);
  await renderer.compileAsync?.(scene, camera);
  composer.render(0.016);

  return {
    renderer,
    scene,
    setStory,
    start() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    snap() {
      shown.chapter = target.chapter;
      shown.time = target.time;
    },
    renderOnce() {
      applyCamera(uniforms.uTime.value);
      applyLight(0);
      composer.render(0.016);
    },
    fps: () => 1000 / frameAvg,
    dpr: () => dpr,
  };
}
