// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there.
//
// ?seed=N fixes the level's patrol jitter. ?shot=title|play|tense|win (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, snapshot, updateWorld } from './world.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();

function announce(text) {
  if (status) status.textContent = text;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    const state = snapshot(world);
    state.mouseX = -100;
    state.mouseY = -100;
    renderer.draw(state);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
  return scene;
}

if (shot) {
  runShot(shot);
} else {
  let last = performance.now();
  let lag = 0;
  let lastScreen = world.screen;
  let lastAnnounce = '';
  announce('Ember Vault. Press Enter to begin.');
  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    lag += elapsed;
    while (lag >= STEP) {
      updateWorld(world, input, audio, STEP);
      lag -= STEP;
    }
    const state = snapshot(world);
    state.mouseX = input.mouseX;
    state.mouseY = input.mouseY;
    renderer.draw(state);
    if (state.screen !== lastScreen) {
      lastScreen = state.screen;
      const lines = {
        title: 'Ember Vault. Press Enter to begin.',
        play: `${state.levelName}. Take ${state.shardsTotal} shards, reach the exit unseen.`,
        paused: 'Paused.',
        'level-done': `${state.levelName} clear.`,
        caught: 'Caught! Press Enter to try the floor again.',
        victory: 'The vault is yours.',
        gameover: 'Out of lives.',
      };
      announce(lines[state.screen] ?? '');
    }
    if (state.message !== lastAnnounce) {
      lastAnnounce = state.message;
      if (state.message) announce(state.message);
    }
  }
  requestAnimationFrame(frame);
}
