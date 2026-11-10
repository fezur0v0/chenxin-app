// Reference behavior: Whynotmetoo/water-ripples at 0d86747.
// Coordinates run from the top-left. Simulate its nominal 60 Hz cadence.
const STEP = 1 / 60;

export function createSurface(width, height) {
  const columns = 160;
  const rows = Math.max(90, Math.min(288, Math.round(columns * height / width)));
  let current = new Float32Array(columns * rows);
  let previous = new Float32Array(current.length);
  const pixels = new Uint8Array(current.length);
  let accumulator = 0;

  function drop(x, y, radius, strength) {
    const centerX = x * columns, centerY = y * rows;
    const reach = Math.ceil(radius);
    for (let dy = -reach; dy <= reach; dy++) {
      const row = Math.floor(centerY) + dy;
      if (row <= 0 || row >= rows - 1) continue;
      for (let dx = -reach; dx <= reach; dx++) {
        const column = Math.floor(centerX) + dx;
        if (column <= 0 || column >= columns - 1) continue;
        const distance = Math.hypot(column - centerX, row - centerY);
        if (distance >= radius) continue;
        const weight = Math.cos(distance / radius * Math.PI / 2);
        current[row * columns + column] += strength * weight * weight;
      }
    }
  }

  function advance(seconds) {
    accumulator += Math.max(0, Math.min(seconds, .05));
    while (accumulator + 1e-9 >= STEP) {
      accumulator -= STEP;
      for (let row = 1; row < rows - 1; row++) {
        for (let column = 1; column < columns - 1; column++) {
          const i = row * columns + column;
          const neighbors = current[i - columns] + current[i + columns] + current[i - 1] + current[i + 1];
          previous[i] = .979 * (neighbors / 2 - previous[i]);
        }
      }
      [current, previous] = [previous, current];
    }
  }

  function heights() {
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = Math.max(1, Math.min(254, 128 + current[i] * 26));
    }
    return pixels;
  }

  return {
    columns, rows, advance, heights,
    tap: (x, y) => drop(x, y, 6, 2.2),
    trail: (x, y) => drop(x, y, 2.4, .45),
    breathe: (x, y) => drop(x, y, 2, .14),
  };
}
