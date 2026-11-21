// The painter: one canvas, drawn top-down. Stone floor, warm lamp pools,
// crates and bushes you can read at a glance, guards with raycast-clipped
// vision cones, and the menus. Nothing here changes the world; it only
// shows it.
import { TILE, VIEW_H, VIEW_W } from './config.js';
import { SUSPICION_FULL } from './config.js';
import { conePolygon } from './guards.js';
import { tileAt } from './levels.js';
import {
  SCREEN_CAUGHT,
  SCREEN_GAMEOVER,
  SCREEN_LEVEL_DONE,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_VICTORY,
} from './world.js';

const FLOOR_A = '#2a2620';
const FLOOR_B = '#26221c';
const WALL = '#17130f';
const WALL_TOP = '#3a2f24';
const CRATE = '#6b4a26';
const CRATE_EDGE = '#8a6234';
const BUSH = '#1e4d2a';
const BUSH_LEAF = '#2f7a3e';
const LAMP_GLOW = 'rgba(255, 190, 90, 0.16)';
const EXIT_CLOSED = '#3f6b4a';
const EXIT_OPEN = '#37d67a';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  function drawTile(state, col, row) {
    const x = state.offsetX + col * TILE;
    const y = state.offsetY + row * TILE;
    const tile = tileAt(state.level, col, row);
    if (tile === '#') {
      ctx.fillStyle = WALL;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = WALL_TOP;
      ctx.fillRect(x, y, TILE, 6);
      return;
    }
    ctx.fillStyle = (col + row) % 2 === 0 ? FLOOR_A : FLOOR_B;
    ctx.fillRect(x, y, TILE, TILE);
    if (tile === 'C') {
      ctx.fillStyle = CRATE;
      ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
      ctx.strokeStyle = CRATE_EDGE;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 5);
      ctx.lineTo(x + TILE - 5, y + TILE - 5);
      ctx.moveTo(x + TILE - 5, y + 5);
      ctx.lineTo(x + 5, y + TILE - 5);
      ctx.stroke();
    } else if (tile === 'B') {
      ctx.fillStyle = BUSH;
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2, TILE * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = BUSH_LEAF;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.arc(
          x + TILE / 2 + Math.cos(a) * 11,
          y + TILE / 2 + Math.sin(a) * 11,
          8, 0, Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  function drawLamps(state) {
    state.level.lamps.forEach(([col, row]) => {
      const x = state.offsetX + (col + 0.5) * TILE;
      const y = state.offsetY + (row + 0.5) * TILE;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, 120);
      glow.addColorStop(0, 'rgba(255, 200, 100, 0.20)');
      glow.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 120, y - 120, 240, 240);
      ctx.fillStyle = '#ffd98a';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a5a22';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x, y + 14);
      ctx.stroke();
    });
  }

  function drawShards(state) {
    state.shards.forEach((shard) => {
      if (shard.taken) return;
      const x = state.offsetX + shard.x;
      const y = state.offsetY + shard.y;
      const pulse = 1 + Math.sin(Date.now() / 300) * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ff7a2f';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#ffc46b';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    });
  }

  function drawExit(state) {
    const x = state.offsetX + state.exit.x;
    const y = state.offsetY + state.exit.y;
    ctx.fillStyle = state.exitOpen ? EXIT_OPEN : EXIT_CLOSED;
    ctx.fillRect(x - 20, y - 20, 40, 40);
    ctx.strokeStyle = state.exitOpen ? '#baffce' : '#9fb8a6';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 20, y - 20, 40, 40);
    ctx.fillStyle = '#0c1a10';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.exitOpen ? 'EXIT' : 'LOCK', x, y);
    if (state.exitOpen) {
      const glow = ctx.createRadialGradient(x, y, 4, x, y, 70);
      glow.addColorStop(0, 'rgba(55, 214, 122, 0.25)');
      glow.addColorStop(1, 'rgba(55, 214, 122, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 70, y - 70, 140, 140);
    }
  }

  function drawGuard(state, guard) {
    const x = state.offsetX + guard.x;
    const y = state.offsetY + guard.y;
    const cone = conePolygon(guard).map((p) => ({
      x: state.offsetX + p.x,
      y: state.offsetY + p.y,
    }));
    const alarmed = guard.state === 'alarmed';
    const suspicious = guard.suspicion > 35;
    ctx.beginPath();
    ctx.moveTo(cone[0].x, cone[0].y);
    cone.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = alarmed
      ? 'rgba(255, 60, 50, 0.34)'
      : suspicious
        ? 'rgba(255, 190, 60, 0.26)'
        : 'rgba(255, 220, 120, 0.18)';
    ctx.fill();
    // The guard: a watchman in a red coat with a brass helmet.
    ctx.fillStyle = '#8c2f26';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8b25c';
    ctx.beginPath();
    ctx.arc(x, y, 15, Math.PI * 0.15, Math.PI * 0.85, true);
    ctx.fill();
    ctx.fillStyle = '#f3e2b8';
    ctx.beginPath();
    ctx.arc(x + Math.cos(guard.angle) * 8, y + Math.sin(guard.angle) * 8, 5, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion arc above the guard's head.
    if (guard.suspicion > 1) {
      ctx.strokeStyle = alarmed ? '#ff3c32' : '#ffbe3c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / SUSPICION_FULL) * Math.PI * 2);
      ctx.stroke();
    }
    if (alarmed) {
      ctx.fillStyle = '#ff3c32';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', x, y - 28);
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    if (!player.alive) return;
    const x = state.offsetX + player.x;
    const y = state.offsetY + player.y;
    // A soft lantern glow follows the thief.
    const glow = ctx.createRadialGradient(x, y, 4, x, y, 90);
    glow.addColorStop(0, 'rgba(255, 220, 140, 0.14)');
    glow.addColorStop(1, 'rgba(255, 220, 140, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 90, y - 90, 180, 180);
    ctx.fillStyle = player.hiddenInBush ? '#3f7a4d' : '#3b6ea5';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
    // Hood point and the direction the thief faces.
    ctx.fillStyle = '#24486b';
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(player.angle) * 20, y + Math.sin(player.angle) * 20);
    ctx.lineTo(
      x + Math.cos(player.angle + 2.4) * 12,
      y + Math.sin(player.angle + 2.4) * 12,
    );
    ctx.lineTo(
      x + Math.cos(player.angle - 2.4) * 12,
      y + Math.sin(player.angle - 2.4) * 12,
    );
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f3e2b8';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    if (player.pebble) {
      ctx.fillStyle = '#c9c9c9';
      ctx.beginPath();
      ctx.arc(state.offsetX + player.pebble.x, state.offsetY + player.pebble.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (player.hiddenInBush) {
      ctx.fillStyle = '#baffce';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', x, y - 24);
    }
  }

  function drawNoiseRings(state) {
    state.noiseRings.forEach((ring) => {
      const progress = ring.age / 0.8;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        state.offsetX + ring.x,
        state.offsetY + ring.y,
        12 + progress * ring.radius,
        0, Math.PI * 2,
      );
      ctx.stroke();
    });
  }

  function drawHud(state) {
    ctx.fillStyle = 'rgba(10, 8, 6, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, 46);
    ctx.fillStyle = '#f3e2b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${state.levelIndex + 1}/${state.levelCount}  ${state.levelName}`, 16, 24);
    ctx.fillText(`Shards ${state.shardsTaken}/${state.shardsTotal}`, 330, 24);
    ctx.fillText(`Pebbles ${state.player.pebbles}`, 470, 24);
    ctx.fillText(`Lives ${'●'.repeat(state.lives)}${'○'.repeat(Math.max(0, 3 - state.lives))}`, 600, 24);
    ctx.fillText(`Score ${state.score}`, 760, 24);
    const mins = Math.floor(state.timeSec / 60);
    const secs = Math.floor(state.timeSec % 60).toString().padStart(2, '0');
    ctx.fillText(`${mins}:${secs}`, 900, 24);
    // The eye: how close the nearest guard is to spotting you.
    const sus = state.maxSuspicion;
    ctx.fillStyle = sus > 75 ? '#ff3c32' : sus > 35 ? '#ffbe3c' : '#8a8a7a';
    ctx.beginPath();
    ctx.arc(1000, 23, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0c0a08';
    ctx.beginPath();
    ctx.arc(1000, 23, 4 + (sus / 100) * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3e2b8';
    ctx.fillText(sus > 75 ? 'SEEN!' : sus > 35 ? 'Suspicious' : 'Unseen', 1022, 24);
    if (state.message) {
      ctx.fillStyle = 'rgba(10, 8, 6, 0.72)';
      const w = ctx.measureText(state.message).width + 32;
      ctx.fillRect((VIEW_W - w) / 2, VIEW_H - 58, w, 34);
      ctx.fillStyle = '#ffd98a';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, VIEW_W / 2, VIEW_H - 40);
    }
  }

  function drawNight(state) {
    // Darkness settles over the floor; lamps and the thief's lantern cut through it.
    const g = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35,
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85,
    );
    g.addColorStop(0, 'rgba(4, 6, 14, 0)');
    g.addColorStop(1, 'rgba(4, 6, 14, 0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 40, 30, ${state.flash * 0.35})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function panel(title, lines, hint) {
    ctx.fillStyle = 'rgba(8, 6, 4, 0.82)';
    ctx.fillRect(240, 150, VIEW_W - 480, 500);
    ctx.strokeStyle = '#8a6234';
    ctx.lineWidth = 2;
    ctx.strokeRect(240, 150, VIEW_W - 480, 500);
    ctx.fillStyle = '#ffd98a';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW_W / 2, 230);
    ctx.fillStyle = '#f3e2b8';
    ctx.font = '19px sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 300 + i * 34));
    if (hint) {
      ctx.fillStyle = '#ffd98a';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(hint, VIEW_W / 2, 600);
    }
  }

  function drawTitle(state) {
    drawWorld(state);
    panel('EMBER VAULT', [
      'A stealth game in three floors.',
      'Take every ember shard, then reach the green exit unseen.',
      'WASD / arrows — move      Shift — sneak (slow, quiet, hidden in bushes)',
      'Click — throw a pebble to pull a guard away      P — pause      M — mute',
      'A guard’s cone fills your suspicion. Full means alarm — and a chase.',
    ], 'Press Enter or click to begin');
    ctx.fillStyle = '#8a8a7a';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Best score: ${state.best}`, VIEW_W / 2, 630);
  }

  function drawWorld(state) {
    ctx.fillStyle = '#0c0a08';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let row = 0; row < state.level.map.length; row += 1) {
      for (let col = 0; col < state.level.map[row].length; col += 1) {
        drawTile(state, col, row);
      }
    }
    drawLamps(state);
    drawShards(state);
    drawExit(state);
    state.guards.forEach((guard) => drawGuard(state, guard));
    drawPlayer(state);
    drawNoiseRings(state);
    drawNight(state);
  }

  function draw(state) {
    if (state.screen === SCREEN_TITLE) {
      drawTitle(state);
      return;
    }
    drawWorld(state);
    drawHud(state);
    if (state.screen === SCREEN_PAUSED) {
      panel('PAUSED', ['Take a breath. The guards wait for no one,', 'but they will wait for you.'], 'Press P or Enter to keep going');
    } else if (state.screen === SCREEN_LEVEL_DONE) {
      panel(`${state.levelName} — CLEAR`, [
        `Score ${state.score}   ·   Time ${Math.floor(state.timeSec / 60)}:${Math.floor(state.timeSec % 60).toString().padStart(2, '0')}`,
        state.levelIndex + 1 < state.levelCount
          ? 'The next floor is darker, and its guards are quicker.'
          : 'That was the last floor. The vault is yours.',
      ], 'Press Enter for the next floor');
    } else if (state.screen === SCREEN_CAUGHT) {
      panel('CAUGHT!', [
        'A guard laid hands on you in the dark.',
        `${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left — the floor resets,`,
        'but the shards you took are gone with you. Try a quieter route.',
      ], 'Press Enter to try the floor again');
    } else if (state.screen === SCREEN_VICTORY) {
      panel('THE VAULT IS YOURS', [
        `Every shard recovered. Final score ${state.score}.`,
        `Spotted ${state.detections} ${state.detections === 1 ? 'time' : 'times'} along the way.`,
        'Wren slips into the night, three embers richer.',
      ], 'Press Enter to play again');
    } else if (state.screen === SCREEN_GAMEOVER) {
      panel('THE NIGHT WINS', [
        'Out of lives. The watch keeps the vault tonight.',
        `Score ${state.score} — best ${state.best}.`,
      ], 'Press Enter to start over');
    }
    if (state.screen === SCREEN_PLAY) {
      // Aim hint: a faint line from the thief toward the mouse, only while
      // the mouse is over the game.
      const mouseIn = state.mouseX >= 0 && state.mouseX <= VIEW_W
        && state.mouseY >= 0 && state.mouseY <= VIEW_H;
      if (mouseIn) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(state.offsetX + state.player.x, state.offsetY + state.player.y);
        ctx.lineTo(state.mouseX, state.mouseY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  return { draw };
}
