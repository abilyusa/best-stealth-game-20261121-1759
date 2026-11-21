// The world: one level at a time, its guards and loot, the screens around
// play (title, pause, level complete, caught, victory) and the score.
// The world owns the rules; the renderer only paints what is here.
import {
  LIVES_START,
  NOISE_RING_SEC,
  PEBBLE_NOISE_RADIUS,
  SUSPICION_FULL,
  TILE,
  VIEW_H,
  VIEW_W,
} from './config.js';
import { LEVELS, findTiles, tileAt } from './levels.js';
import { createGuard, hearNoise, updateGuard } from './guards.js';
import { createPlayer, throwPebble, updatePlayer } from './player.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL_DONE = 'level-done';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_GAMEOVER = 'gameover';

export function createWorld(random) {
  const world = {
    random,
    levelIndex: 0,
    screen: SCREEN_TITLE,
    level: null,
    player: null,
    guards: [],
    shards: [],
    exit: null,
    lives: LIVES_START,
    score: 0,
    timeSec: 0,
    detections: 0,
    alarmsRaised: 0,
    noiseRings: [],
    flash: 0,
    message: '',
    messageTimer: 0,
    best: 0,
    offsetX: 0,
    offsetY: 0,
    state: null,
  };
  loadLevel(world, 0);
  return world;
}

export function loadLevel(world, index) {
  const level = LEVELS[index];
  world.levelIndex = index;
  world.level = level;
  const start = findTiles(level, 'S')[0];
  world.player = createPlayer(level, start);
  world.shardsCollected = 0;
  world.player.shards = 0;
  world.guards = level.guards.map((def) => createGuard(def, level));
  world.shards = findTiles(level, '*').map((tile) => ({
    x: (tile.col + 0.5) * TILE,
    y: (tile.row + 0.5) * TILE,
    taken: false,
  }));
  const exitTile = findTiles(level, 'E')[0];
  world.exit = {
    x: (exitTile.col + 0.5) * TILE,
    y: (exitTile.row + 0.5) * TILE,
    open: false,
  };
  world.noiseRings = [];
  world.flash = 0;
  const mapW = level.map[0].length * TILE;
  const mapH = level.map.length * TILE;
  world.offsetX = Math.max(0, (VIEW_W - mapW) / 2);
  world.offsetY = Math.max(0, (VIEW_H - mapH) / 2);
  world.message = level.intro;
  world.messageTimer = 5;
}

function shardsLeft(world) {
  return world.shards.filter((shard) => !shard.taken).length;
}

function showMessage(world, text, seconds) {
  world.message = text;
  world.messageTimer = seconds;
}

function startLevel(world, index) {
  loadLevel(world, index);
  world.screen = SCREEN_PLAY;
}

// Handle one event the player or a guard raised this frame.
function handleEvent(world, audio, event) {
  if (event.type === 'step') {
    audio.step(event.sneaking);
  } else if (event.type === 'pebble-land') {
    audio.clink();
    world.noiseRings.push({ x: event.x, y: event.y, age: 0, radius: PEBBLE_NOISE_RADIUS });
    world.guards.forEach((guard) => hearNoise(guard, event.x, event.y, PEBBLE_NOISE_RADIUS));
  } else if (event.type === 'alarm') {
    world.alarmsRaised += 1;
    world.detections += 1;
    world.flash = 0.6;
    audio.alarm();
    showMessage(world, 'SPOTTED! Break line of sight!', 2.5);
  } else if (event.type === 'caught') {
    world.lives -= 1;
    world.player.alive = false;
    audio.caught();
    if (world.lives <= 0) {
      world.screen = SCREEN_GAMEOVER;
      world.best = Math.max(world.best, world.score);
    } else {
      world.screen = SCREEN_CAUGHT;
      showMessage(world, `Caught! ${world.lives} ${world.lives === 1 ? 'life' : 'lives'} left.`, 2);
    }
  }
}

export function updateWorld(world, input, audio, dt) {
  if (world.flash > 0) world.flash -= dt;
  if (world.messageTimer > 0) world.messageTimer -= dt;
  world.noiseRings.forEach((ring) => { ring.age += dt; });
  world.noiseRings = world.noiseRings.filter((ring) => ring.age < NOISE_RING_SEC);

  const pressed = input.takePressed();
  const click = input.takeClick();

  if (world.screen === SCREEN_TITLE) {
    if (pressed.includes('confirm') || click) {
      audio.ensure();
      audio.click();
      world.lives = LIVES_START;
      world.score = 0;
      world.timeSec = 0;
      world.detections = 0;
      world.alarmsRaised = 0;
      startLevel(world, 0);
    }
    return;
  }

  if (world.screen === SCREEN_PAUSED) {
    if (pressed.includes('pause') || pressed.includes('confirm')) {
      world.screen = SCREEN_PLAY;
      audio.click();
    }
    return;
  }

  if (world.screen === SCREEN_LEVEL_DONE) {
    if (pressed.includes('confirm') || click) {
      audio.click();
      if (world.levelIndex + 1 < LEVELS.length) startLevel(world, world.levelIndex + 1);
      else {
        world.screen = SCREEN_VICTORY;
        world.best = Math.max(world.best, world.score);
        audio.win();
      }
    }
    return;
  }

  if (world.screen === SCREEN_CAUGHT) {
    if (pressed.includes('confirm') || click) {
      audio.click();
      loadLevel(world, world.levelIndex);
      world.screen = SCREEN_PLAY;
    }
    return;
  }

  if (world.screen === SCREEN_VICTORY || world.screen === SCREEN_GAMEOVER) {
    if (pressed.includes('confirm') || click) {
      audio.click();
      world.screen = SCREEN_TITLE;
      world.lives = LIVES_START;
      world.score = 0;
      world.timeSec = 0;
      world.detections = 0;
      world.alarmsRaised = 0;
      startLevel(world, 0);
      world.screen = SCREEN_TITLE;
    }
    return;
  }

  // SCREEN_PLAY from here.
  if (pressed.includes('pause')) {
    world.screen = SCREEN_PAUSED;
    audio.click();
    return;
  }
  if (pressed.includes('mute')) {
    const muted = audio.toggleMute();
    showMessage(world, muted ? 'Sound off (M to turn back on)' : 'Sound on', 1.5);
  }
  if (pressed.includes('restart')) {
    loadLevel(world, world.levelIndex);
    showMessage(world, 'Level restarted.', 1.5);
    return;
  }
  if (click && click.button === 0) {
    const worldX = click.x - world.offsetX;
    const worldY = click.y - world.offsetY;
    if (throwPebble(world.player, worldX, worldY)) audio.pebble();
  }

  world.timeSec += dt;
  const events = [];
  updatePlayer(world.player, input, dt, events);
  world.guards.forEach((guard) => updateGuard(guard, dt, world.player, events));
  events.forEach((event) => handleEvent(world, audio, event));
  if (world.screen !== SCREEN_PLAY) return;

  // Pick up an ember shard by walking over it.
  world.shards.forEach((shard) => {
    if (!shard.taken
      && Math.hypot(shard.x - world.player.x, shard.y - world.player.y) < TILE * 0.55) {
      shard.taken = true;
      world.shardsCollected = (world.shardsCollected ?? 0) + 1;
      world.player.shards = world.shardsCollected;
      world.score += 150;
      audio.pickup();
      showMessage(world, `Ember shard ${world.shardsCollected} of ${world.shards.length} — keep going.`, 2);
      if (shardsLeft(world) === 0) {
        world.exit.open = true;
        showMessage(world, 'All shards taken — the exit is open. Reach it unseen!', 3);
      }
    }
  });

  // Reach the open exit to finish the level.
  if (world.exit.open
    && Math.hypot(world.exit.x - world.player.x, world.exit.y - world.player.y) < TILE * 0.6) {
    const timeBonus = Math.max(0, 600 - Math.floor(world.timeSec) * 2);
    world.score += 400 + timeBonus;
    audio.win();
    world.screen = SCREEN_LEVEL_DONE;
  }
}

// A plain snapshot for the renderer and for tests: no functions, no cycles.
export function snapshot(world) {
  return {
    screen: world.screen,
    levelName: world.level.name,
    levelIndex: world.levelIndex,
    levelCount: LEVELS.length,
    lives: world.lives,
    score: world.score,
    timeSec: world.timeSec,
    detections: world.detections,
    shardsTaken: world.shards.filter((s) => s.taken).length,
    shardsTotal: world.shards.length,
    exitOpen: world.exit.open,
    message: world.messageTimer > 0 ? world.message : '',
    flash: world.flash,
    best: world.best,
    player: world.player,
    guards: world.guards,
    shards: world.shards,
    exit: world.exit,
    noiseRings: world.noiseRings,
    level: world.level,
    offsetX: world.offsetX,
    offsetY: world.offsetY,
    maxSuspicion: Math.max(0, ...world.guards.map((g) => g.suspicion)),
    anyAlarmed: world.guards.some((g) => g.state === 'alarmed'),
  };
}

// True when the player stands on a shard, a bush or the exit tile.
export function playerTileKind(world) {
  return tileAt(
    world.level,
    Math.floor(world.player.x / TILE),
    Math.floor(world.player.y / TILE),
  );
}
