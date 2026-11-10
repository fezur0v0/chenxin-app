const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function pressureGain(point) {
  // Pointer Events specifies .5 for active devices without pressure support.
  // Neutral at .5 also avoids a jump when a real pen crosses that value.
  if (!['pen', 'touch'].includes(point.pointerType) ||
      !Number.isFinite(point.pressure) || point.pressure <= 0) return 1;
  return .5 + clamp(point.pressure, 0, 1);
}

// One instance per contact: smoothing never leaks between fingers or gestures.
// Coordinates are normalized; speed uses CSS pixels, independent of render DPR.
export function createGesture(field, start, width, height) {
  let previous = start;
  let force = .20 * pressureGain(start);
  field.tap(start.x, start.y, .40 * pressureGain(start));

  return {
    move(current) {
      const elapsed = current.time - previous.time;
      // Coalesced lists can include the dispatched event itself. Ignore duplicate
      // or older timestamps rather than manufacturing a high-speed impulse.
      if (!Number.isFinite(elapsed) || elapsed <= 0) return;
      const distance = Math.hypot((current.x - previous.x) * width, (current.y - previous.y) * height);
      const speed = Math.min(2800, distance * 1000 / elapsed);
      const target = (.20 + .95 * (1 - Math.exp(-speed / 950))) * pressureGain(current);
      // Integrate the exponential response over this segment, not once per event.
      const duration = elapsed / 1000;
      const decay = Math.exp(-duration / .045);
      const average = target + (force - target) * .045 / duration * (1 - decay);
      if (distance > 0) field.stroke(previous, current, average);
      force = target + (force - target) * decay;
      previous = current;
    },
  };
}
