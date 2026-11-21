// The player: Wren, the relic thief. Movement, sneaking, pebble throws and
// the bush-hiding rule live here; the world decides what the movement means.
import {
  PEBBLES_START,
  PEBBLE_FLIGHT_SEC,
  PEBBLE_SPEED,
  SNEAK_SPEED,
  TILE,
  WALK_SPEED,
} from './config.js';
import { blocksMove, tileAt } from './levels.js';

export function createPlayer(level, start) {
  return {
    x: (start.col + 0.5) * TILE,
    y: (start.row + 0.5) * TILE,
    angle: 0,
    moving: false,
    sneaking: false,
    alive: true,
    hiddenInBush: false,
    pebbles: PEBBLES_START,
    shards: 0,
    stepTimer: 0,
    pebble: null,
    level,
  };
}

// Try to move the player by (dx, dy); walls and crates stop each axis alone
// so sliding along a wall feels smooth instead of sticky.
export function movePlayer(player, dx, dy) {
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (!blocksMove(tileAt(player.level, Math.floor(nx / TILE), Math.floor(player.y / TILE)))) {
    player.x = nx;
  }
  if (!blocksMove(tileAt(player.level, Math.floor(player.x / TILE), Math.floor(ny / TILE)))) {
    player.y = ny;
  }
}

export function updatePlayer(player, input, dt, events) {
  if (!player.alive) return;
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  player.moving = mx !== 0 || my !== 0;
  player.sneaking = Boolean(input.sneak);
  if (player.moving) {
    const len = Math.hypot(mx, my);
    const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const step = speed * dt;
    movePlayer(player, (mx / len) * step, (my / len) * step);
    player.angle = Math.atan2(my, mx);
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = player.sneaking ? 0.62 : 0.34;
      events.push({
        type: 'step',
        x: player.x,
        y: player.y,
        sneaking: player.sneaking,
      });
    }
  }

  // A pebble flies toward the mouse click and lands with a clink.
  if (player.pebble) {
    const pebble = player.pebble;
    pebble.flown += dt;
    const total = Math.hypot(pebble.tx - pebble.sx, pebble.ty - pebble.sy);
    const travelled = Math.min(total, PEBBLE_SPEED * pebble.flown);
    const ratio = total === 0 ? 1 : travelled / total;
    pebble.x = pebble.sx + (pebble.tx - pebble.sx) * ratio;
    pebble.y = pebble.sy + (pebble.ty - pebble.sy) * ratio;
    if (pebble.flown >= PEBBLE_FLIGHT_SEC || travelled >= total) {
      player.pebble = null;
      events.push({ type: 'pebble-land', x: pebble.tx, y: pebble.ty });
    }
  }

  // Standing in a bush while sneaking hides the player from every cone.
  const tile = tileAt(
    player.level,
    Math.floor(player.x / TILE),
    Math.floor(player.y / TILE),
  );
  player.hiddenInBush = tile === 'B' && player.sneaking;
}

export function throwPebble(player, targetX, targetY) {
  if (!player.alive || player.pebbles <= 0 || player.pebble) return false;
  player.pebbles -= 1;
  player.pebble = {
    sx: player.x,
    sy: player.y,
    tx: targetX,
    ty: targetY,
    x: player.x,
    y: player.y,
    flown: 0,
  };
  return true;
}
