import { createBirds } from './birds.js';
import { createFlora } from './flora.js';
import { createGhat } from './ghat.js';
import { createGopuram } from './gopuram.js';
import { createPetals } from './petals.js';
import { createWorld } from './World.js';

// Per-tier settings. Everything that costs GPU time scales from here.
const TIERS = {
  high: {
    dpr: 1.5,
    fpsCap: 60,
    reflect: true,
    reflScale: 0.5,
    bloom: true,
    terrain: { rows: 220, cols: 110 },
    palms: 460,
    bananas: 160,
    petals: 700,
  },
  medium: {
    dpr: 1.25,
    fpsCap: 30,
    // Real reflections at low resolution; dropped first if frames run slow.
    reflect: true,
    reflScale: 0.3,
    bloom: true,
    terrain: { rows: 150, cols: 76 },
    palms: 260,
    bananas: 90,
    petals: 320,
  },
};

export async function bootWorld({ container, tier, reducedMotion, capture = false }) {
  const config = { ...TIERS[tier], capture, layers: [createFlora, createGopuram, createGhat, createPetals, createBirds] };
  if (reducedMotion) config.petals = 0;
  config.reducedMotion = reducedMotion;
  return createWorld({ container, tier: config, reducedMotion });
}
