// Keyboard and mouse state, read every frame. WASD and arrows move, Shift
// sneaks, click throws a pebble at the mouse, P or Escape pauses, M mutes,
// Enter confirms on menus.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';

const KEY_BINDINGS = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ShiftLeft: 'sneak',
  ShiftRight: 'sneak',
};

export function createInput(canvas) {
  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
    mouseX: 0,
    mouseY: 0,
    clicked: null,
    pressed: [],
  };

  function actionFor(code) {
    if (code === 'Enter' || code === 'Space') return ACTION_CONFIRM;
    if (code === 'KeyP' || code === 'Escape') return ACTION_PAUSE;
    if (code === 'KeyM') return ACTION_MUTE;
    if (code === 'KeyR') return ACTION_RESTART;
    return null;
  }

  window.addEventListener('keydown', (event) => {
    const field = KEY_BINDINGS[event.code];
    if (field) {
      input[field] = true;
      event.preventDefault();
    }
    const action = actionFor(event.code);
    if (action) {
      input.pressed.push(action);
      event.preventDefault();
    }
  });

  window.addEventListener('keyup', (event) => {
    const field = KEY_BINDINGS[event.code];
    if (field) input[field] = false;
  });

  window.addEventListener('blur', () => {
    input.up = false;
    input.down = false;
    input.left = false;
    input.right = false;
    input.sneak = false;
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });

  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.clicked = {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      button: event.button,
    };
  });

  // Take the actions pressed since the last frame, then clear them.
  input.takePressed = function takePressed() {
    const pressed = input.pressed;
    input.pressed = [];
    return pressed;
  };

  // Take the mouse click since the last frame, then clear it.
  input.takeClick = function takeClick() {
    const clicked = input.clicked;
    input.clicked = null;
    return clicked;
  };

  return input;
}
