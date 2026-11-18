// input.js — keyboard and mouse state, exposed as plain data the world
// update reads each frame. Also collects one-shot key presses (start,
// pause, restart, mute) into a queue the main loop drains.

const held = new Set();
const pressed = [];
const mouse = { x: 0, y: 0, down: false };

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
};

export function attachInput(canvas) {
  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (action) {
      held.add(action);
      e.preventDefault();
    }
    if (!e.repeat) pressed.push(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (action) held.delete(action);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });

  const toGame = (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  };
  canvas.addEventListener('mousemove', toGame);
  canvas.addEventListener('mousedown', (e) => { toGame(e); mouse.down = true; });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Normalised movement vector from the held keys (diagonals are not faster).
export function moveVector() {
  let x = 0;
  let y = 0;
  if (held.has('left')) x -= 1;
  if (held.has('right')) x += 1;
  if (held.has('up')) y -= 1;
  if (held.has('down')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = Math.SQRT1_2;
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

export function getMouse() {
  return mouse;
}

// Returns the one-shot key codes seen since the last call and clears them.
export function drainPressed() {
  return pressed.splice(0, pressed.length);
}
