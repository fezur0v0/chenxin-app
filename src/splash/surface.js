// A damped height field with closed, reflecting walls. Units are grid cells.
const STEP = 1 / 120;
const WAVE_SPEED_SQUARED = .09;
const DAMPING = Math.exp(-.72 * STEP);

export function createSurface(width, height) {
  const scale = Math.min(100 / Math.min(width, height), 240 / Math.max(width, height));
  const columns = Math.max(8, Math.round(width * scale));
  const rows = Math.max(8, Math.round(height * scale));
  const heights = new Float32Array(columns * rows);
  const velocities = new Float32Array(heights.length);
  const next = new Float32Array(heights.length);
  const pixels = new Uint8Array(heights.length * 4);
  let accumulator = 0;
  let active = false;
  let quietSteps = 0;

  function disturb(x, y, amplitude, pushX = 0, pushY = 0) {
    const radius = 1.45;
    const reach = Math.ceil(radius * 3);
    for (let row = Math.max(0, Math.floor(y) - reach); row <= Math.min(rows - 1, Math.ceil(y) + reach); row++) {
      for (let column = Math.max(0, Math.floor(x) - reach); column <= Math.min(columns - 1, Math.ceil(x) + reach); column++) {
        const squared = ((column - x) ** 2 + (row - y) ** 2) / (radius * radius);
        // A depression with a displaced rim keeps the total water level stable.
        const displacement = amplitude * (1 - squared / 2) * Math.exp(-squared / 2);
        const index = row * columns + column;
        heights[index] = Math.max(-3, Math.min(3, heights[index] + displacement));
        // A moving finger pushes water ahead and leaves a wake behind it.
        // This signed impulse keeps travelling after the finger lifts/turns.
        const along = ((column - x) * pushX + (row - y) * pushY) / radius;
        velocities[index] = Math.max(-.5, Math.min(.5,
          velocities[index] - amplitude * .12 * along * Math.exp(-squared / 2)));
      }
    }
    active = true;
    quietSteps = 0;
  }

  function tap(x, y, strength = 1) {
    disturb(x * (columns - 1), y * (rows - 1), -.65 * strength);
  }

  function stroke(from, to, strength = 1) {
    const startX = from.x * (columns - 1), startY = from.y * (rows - 1);
    const dx = (to.x - from.x) * (columns - 1), dy = (to.y - from.y) * (rows - 1);
    const distance = Math.hypot(dx, dy);
    if (distance < .01) return;
    // Swept, overlapping pressure, including long/coalesced pointer segments.
    // The injected energy follows distance, not pointer event frequency.
    const samples = Math.ceil(distance / .65);
    const amplitude = -.13 * distance / samples * strength;
    for (let i = 1; i <= samples; i++) {
      const fraction = (i - .5) / samples;
      disturb(startX + dx * fraction, startY + dy * fraction, amplitude, dx / distance, dy / distance);
    }
  }

  function step() {
    let motion = 0;
    for (let y = 0; y < rows; y++) {
      // Mirrored ghost cells impose zero normal slope at the pool walls.
      const above = (y === 0 ? 1 : y - 1) * columns;
      const below = (y === rows - 1 ? rows - 2 : y + 1) * columns;
      const row = y * columns;
      for (let x = 0; x < columns; x++) {
        const left = x === 0 ? 1 : x - 1;
        const right = x === columns - 1 ? columns - 2 : x + 1;
        const index = row + x, center = heights[index];
        const cardinal = heights[row + left] + heights[row + right] + heights[above + x] + heights[below + x];
        const diagonal = heights[above + left] + heights[above + right] + heights[below + left] + heights[below + right];
        // Nine-point Laplacian reduces the square-grid imprint on circular waves.
        const laplacian = (4 * cardinal + diagonal - 20 * center) / 6;
        const velocity = (velocities[index] + WAVE_SPEED_SQUARED * laplacian) * DAMPING;
        velocities[index] = velocity;
        next[index] = center + velocity;
        motion = Math.max(motion, Math.abs(velocity), Math.abs(laplacian));
      }
    }
    heights.set(next);
    quietSteps = motion < .00015 ? quietSteps + 1 : 0;
    if (quietSteps >= 30) {
      active = false;
      heights.fill(0);
      velocities.fill(0);
      accumulator = 0;
    }
  }

  function advance(seconds) {
    if (!active) return;
    accumulator += Math.max(0, Math.min(seconds, .05));
    while (accumulator + 1e-9 >= STEP && active) {
      accumulator -= STEP;
      step();
    }
  }

  function encode(value, offset) {
    const packed = Math.round(Math.max(0, Math.min(1, .5 + value * .25)) * 65535);
    pixels[offset] = packed >>> 8;
    pixels[offset + 1] = packed & 255;
  }

  function normals() {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const index = y * columns + x;
        const dx = x === 0 || x === columns - 1 ? 0 : (heights[index + 1] - heights[index - 1]) / 2;
        const dy = y === 0 || y === rows - 1 ? 0 : (heights[index + columns] - heights[index - columns]) / 2;
        encode(dx, index * 4);
        encode(dy, index * 4 + 2);
      }
    }
    return pixels;
  }

  return { columns, rows, tap, stroke, advance, normals, get active() { return active; } };
}
