// Guards: patrols, vision cones, suspicion and the chase.
// A guard walks its waypoints, pauses and scans at each end, and watches a
// cone in front of it. Sight is checked by raycasting: a ray marches from
// the guard's eyes until it hits a wall or a crate, so cover really hides you.
import {
  ALARM_HOLD_SEC,
  CATCH_RADIUS,
  GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_VIEW_RANGE,
  PEBBLE_NOISE_RADIUS,
  STEP_NOISE_RADIUS,
  SNEAK_NOISE_RADIUS,
  SUSPICION_DECAY_ALARMED,
  SUSPICION_DECAY_PER_SEC,
  SUSPICION_FULL,
  SUSPICION_GAIN_FAR,
  SUSPICION_GAIN_PER_SEC,
  SUSPICION_GAIN_SNEAKING,
  TILE,
} from './config.js';
import { blocksMove, blocksSight, tileAt } from './levels.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALARMED = 'alarmed';
export const GUARD_INVESTIGATE = 'investigate';

// How many rays shape one vision cone; more rays make a smoother cone.
const CONE_RAYS = 26;

export function createGuard(def, level) {
  const [startCol, startRow] = def.waypoints[0];
  return {
    waypoints: def.waypoints.map(([col, row]) => ({
      x: (col + 0.5) * TILE,
      y: (row + 0.5) * TILE,
    })),
    waypointIndex: 1 % def.waypoints.length,
    pauseSec: def.pauseSec ?? 1.2,
    x: (startCol + 0.5) * TILE,
    y: (startRow + 0.5) * TILE,
    angle: 0,
    state: GUARD_PATROL,
    suspicion: 0,
    pauseLeft: 0,
    scanPhase: 0,
    scanBase: 0,
    alarmLeft: 0,
    investigateX: 0,
    investigateY: 0,
    lastSeenX: 0,
    lastSeenY: 0,
    heardX: 0,
    heardY: 0,
    level,
  };
}

// March a ray from (x, y) along an angle until it hits something that blocks
// sight or reaches the guard's view range; returns the distance travelled.
export function castRay(level, x, y, angle) {
  const step = 6;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let px = x;
  let py = y;
  for (let d = 0; d < GUARD_VIEW_RANGE; d += step) {
    px += dx;
    py += dy;
    const tile = tileAt(level, Math.floor(px / TILE), Math.floor(py / TILE));
    if (blocksSight(tile)) return d;
  }
  return GUARD_VIEW_RANGE;
}

// The cone's outline as a list of points, clipped by walls and crates.
export function conePolygon(guard) {
  const points = [{ x: guard.x, y: guard.y }];
  for (let i = 0; i <= CONE_RAYS; i += 1) {
    const a = guard.angle - GUARD_VIEW_HALF_ANGLE
      + (2 * GUARD_VIEW_HALF_ANGLE * i) / CONE_RAYS;
    const dist = castRay(guard.level, guard.x, guard.y, a);
    points.push({ x: guard.x + Math.cos(a) * dist, y: guard.y + Math.sin(a) * dist });
  }
  return points;
}

// True when nothing blocks sight between the guard and a point.
export function hasLineOfSight(level, fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const x = fromX + (dx * i) / steps;
    const y = fromY + (dy * i) / steps;
    if (blocksSight(tileAt(level, Math.floor(x / TILE), Math.floor(y / TILE)))) return false;
  }
  return true;
}

// True when a point lies inside the guard's cone and in open sight.
export function canSee(guard, x, y) {
  const dx = x - guard.x;
  const dy = y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VIEW_RANGE) return false;
  let diff = Math.atan2(dy, dx) - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > GUARD_VIEW_HALF_ANGLE) return false;
  return hasLineOfSight(guard.level, guard.x, guard.y, x, y);
}

function angleTo(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function turnToward(guard, targetAngle, rate, dt) {
  let diff = targetAngle - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const step = Math.max(-rate * dt, Math.min(rate * dt, diff));
  guard.angle += step;
}

function moveToward(guard, targetX, targetY, speed, dt) {
  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const move = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * move;
  const ny = guard.y + (dy / dist) * move;
  // Guards never walk through walls or crates: try each axis on its own.
  if (!blocksMove(tileAt(guard.level, Math.floor(nx / TILE), Math.floor(guard.y / TILE)))) {
    guard.x = nx;
  }
  if (!blocksMove(tileAt(guard.level, Math.floor(guard.x / TILE), Math.floor(ny / TILE)))) {
    guard.y = ny;
  }
  guard.angle = angleTo(guard.x, guard.y, targetX, targetY);
  return dist - move < 2;
}

// A noise at (x, y) pulls a patrolling or suspicious guard over to look.
export function hearNoise(guard, x, y, radius) {
  if (guard.state === GUARD_ALARMED) return;
  const dist = Math.hypot(x - guard.x, y - guard.y);
  if (dist > radius) return;
  guard.heardX = x;
  guard.heardY = y;
  guard.investigateX = x;
  guard.investigateY = y;
  if (guard.state !== GUARD_INVESTIGATE) {
    guard.state = GUARD_INVESTIGATE;
    guard.suspicion = Math.max(guard.suspicion, 35);
  }
}

export function updateGuard(guard, dt, player, events) {
  const seesPlayer = player.alive && !player.hiddenInBush && canSee(guard, player.x, player.y);

  if (seesPlayer) {
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    let gain = SUSPICION_GAIN_PER_SEC;
    if (player.sneaking) gain = SUSPICION_GAIN_SNEAKING;
    else if (dist > GUARD_VIEW_RANGE * 0.62) gain = SUSPICION_GAIN_FAR;
    guard.suspicion = Math.min(SUSPICION_FULL, guard.suspicion + gain * dt);
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    if (guard.suspicion >= SUSPICION_FULL && guard.state !== GUARD_ALARMED) {
      guard.state = GUARD_ALARMED;
      guard.alarmLeft = ALARM_HOLD_SEC;
      events.push({ type: 'alarm', x: guard.x, y: guard.y });
    } else if (guard.suspicion > 35 && guard.state === GUARD_PATROL) {
      guard.state = GUARD_SUSPICIOUS;
    }
  } else if (guard.state !== GUARD_ALARMED) {
    const decay = guard.state === GUARD_SUSPICIOUS
      ? SUSPICION_DECAY_ALARMED : SUSPICION_DECAY_PER_SEC;
    guard.suspicion = Math.max(0, guard.suspicion - decay * dt);
    if (guard.suspicion <= 0 && guard.state === GUARD_SUSPICIOUS) {
      guard.state = GUARD_PATROL;
    }
  }

  // A running player's footsteps carry; a sneaking player's barely do.
  if (player.alive && player.moving) {
    const radius = player.sneaking ? SNEAK_NOISE_RADIUS : STEP_NOISE_RADIUS;
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (dist < radius && guard.state === GUARD_PATROL) {
      hearNoise(guard, player.x, player.y, radius);
    }
  }

  if (guard.state === GUARD_ALARMED) {
    turnToward(guard, angleTo(guard.x, guard.y, guard.lastSeenX, guard.lastSeenY), 7, dt);
    const arrived = moveToward(guard, guard.lastSeenX, guard.lastSeenY, GUARD_CHASE_SPEED, dt);
    if (arrived) {
      guard.alarmLeft -= dt;
      if (guard.alarmLeft <= 0) {
        guard.state = GUARD_PATROL;
        guard.suspicion = 45;
        guard.waypointIndex = nearestWaypoint(guard);
      }
    } else {
      guard.alarmLeft = ALARM_HOLD_SEC;
    }
    if (player.alive && Math.hypot(player.x - guard.x, player.y - guard.y) < CATCH_RADIUS) {
      events.push({ type: 'caught', x: guard.x, y: guard.y });
    }
    return;
  }

  if (guard.state === GUARD_INVESTIGATE) {
    const arrived = moveToward(
      guard, guard.investigateX, guard.investigateY, GUARD_INVESTIGATE_SPEED, dt,
    );
    if (arrived) {
      guard.pauseLeft = 1.6;
      guard.scanBase = guard.angle;
      guard.scanPhase = 0;
      guard.state = GUARD_SUSPICIOUS;
    }
    return;
  }

  if (guard.state === GUARD_SUSPICIOUS && guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    guard.scanPhase += dt;
    guard.angle = guard.scanBase + Math.sin(guard.scanPhase * 2.2) * 1.1;
    if (guard.pauseLeft <= 0 && guard.suspicion <= 0) guard.state = GUARD_PATROL;
    return;
  }

  // Patrol: walk to the next waypoint, pause and scan, then turn back.
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    guard.scanPhase += dt;
    guard.angle = guard.scanBase + Math.sin(guard.scanPhase * 2.2) * 1.1;
    if (guard.pauseLeft <= 0) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    }
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const arrived = moveToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt);
  if (arrived) {
    guard.pauseLeft = guard.pauseSec;
    guard.scanBase = guard.angle;
    guard.scanPhase = 0;
  }
}

function nearestWaypoint(guard) {
  let best = 0;
  let bestDist = Infinity;
  guard.waypoints.forEach((point, index) => {
    const dist = Math.hypot(point.x - guard.x, point.y - guard.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = index;
    }
  });
  return best;
}
