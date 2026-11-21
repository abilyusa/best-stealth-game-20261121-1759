// Stage a scene for a screenshot: ?shot=title|play|tense|win (with &seed=N)
// puts the world in that pose, paints it twice and sets window.__shotReady.
// The staged scenes are real play states, not mock-ups: the guards, cones,
// cover and exit are the game's own.
import { SCREEN_LEVEL_DONE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY, loadLevel } from './world.js';
import { SUSPICION_FULL } from './config.js';

export function stageShot(name, world) {
  if (name === 'title') {
    world.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE };
  }
  if (name === 'win') {
    loadLevel(world, 2);
    world.shards.forEach((shard) => { shard.taken = true; });
    world.exit.open = true;
    world.score = 2840;
    world.timeSec = 187;
    world.detections = 1;
    world.screen = SCREEN_VICTORY;
    world.best = 2840;
    world.messageTimer = 0;
    return { screen: SCREEN_VICTORY };
  }
  if (name === 'tense') {
    // Last floor, mid-chase: a guard has just spotted the thief near a bush.
    loadLevel(world, 2);
    world.screen = SCREEN_PLAY;
    world.player.x = world.offsetX * 0 + 8.5 * 48;
    world.player.y = 9.5 * 48;
    world.player.sneaking = true;
    world.player.angle = Math.PI;
    const guard = world.guards[2];
    guard.x = 17.5 * 48;
    guard.y = 9.5 * 48;
    guard.angle = Math.PI;
    guard.state = 'alarmed';
    guard.suspicion = SUSPICION_FULL;
    guard.lastSeenX = world.player.x;
    guard.lastSeenY = world.player.y;
    world.shards[0].taken = true;
    world.shardsCollected = 1;
    world.player.shards = 1;
    world.score = 640;
    world.timeSec = 96;
    world.message = 'SPOTTED! Break line of sight!';
    world.messageTimer = 5;
    world.flash = 0.35;
    return { screen: SCREEN_PLAY };
  }
  // Default: 'play' — first floor, the thief behind a crate, a guard's cone
  // sweeping past, one shard already taken.
  loadLevel(world, 0);
  world.screen = SCREEN_PLAY;
  world.player.x = 4.5 * 48;
  world.player.y = 10.5 * 48;
  world.player.sneaking = true;
  world.player.angle = 0;
  const guard = world.guards[0];
  guard.x = 10.5 * 48;
  guard.y = 3.5 * 48;
  guard.angle = Math.PI / 2;
  guard.state = 'suspicious';
  guard.suspicion = 55;
  world.shards[0].taken = true;
  world.shardsCollected = 1;
  world.player.shards = 1;
  world.score = 150;
  world.timeSec = 42;
  world.message = 'Ember shard 1 of 3 — keep going.';
  world.messageTimer = 5;
  return { screen: SCREEN_PLAY };
}
