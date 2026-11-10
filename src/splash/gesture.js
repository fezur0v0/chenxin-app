// Match the reference's small fixed drop for moves over two CSS pixels.
export function createGesture(field, start, width, height, tap = true) {
  let previous = start;
  if (tap) field.tap(start.x, start.y);
  return {
    move(current) {
      const distance = Math.hypot((current.x - previous.x) * width, (current.y - previous.y) * height);
      if (distance > 2) field.trail(current.x, current.y);
      previous = current;
    },
  };
}
