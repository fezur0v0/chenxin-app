import test from 'node:test';
import assert from 'node:assert/strict';
import { createSurface } from '../src/splash/surface.js';

function slopes(surface) {
  const bytes = surface.normals();
  const result = [];
  for (let i = 0; i < bytes.length; i += 2) result.push(((bytes[i] * 256 + bytes[i + 1]) / 65535 - .5) * 4);
  return result;
}

function advance(surface, seconds, fps = 120) {
  for (let i = 0; i < seconds * fps; i++) surface.advance(1 / fps);
}

test('pool wall reflects a wave like a mirrored source outside the wall', () => {
  const pool = createSurface(100, 100);
  const extended = createSurface(200, 100);
  pool.tap(5 / 99, 50 / 99);
  extended.tap(105 / 199, 50 / 99);
  extended.tap(95 / 199, 50 / 99);
  advance(pool, .6);
  advance(extended, .6);
  const actual = slopes(pool), expected = slopes(extended);
  let amplitude = 0;
  for (let y = 20; y < 80; y++) {
    for (let x = 1; x < 45; x++) {
      for (let axis = 0; axis < 2; axis++) {
        const a = actual[(y * 100 + x) * 2 + axis];
        const b = expected[(y * 200 + x + 100) * 2 + axis];
        assert.ok(Math.abs(a - b) < .001);
        amplitude = Math.max(amplitude, Math.abs(a));
      }
    }
    assert.ok(Math.abs(actual[y * 100 * 2]) < .0001);
  }
  assert.ok(amplitude > .005, 'the comparison includes a moving reflected wave');
});

test('swept strokes stay continuous with sparse or frequent pointer events', () => {
  const sparse = createSurface(390, 740), dense = createSurface(390, 740);
  sparse.stroke({ x: .1, y: .5 }, { x: .9, y: .5 });
  for (let i = 0; i < 80; i++) dense.stroke({ x: .1 + i / 100, y: .5 }, { x: .1 + (i + 1) / 100, y: .5 });
  const a = slopes(sparse), b = slopes(dense);
  for (let i = 0; i < a.length; i++) assert.ok(Math.abs(a[i] - b[i]) < .003);
  const nearTrack = Math.floor(sparse.rows / 2) + 2;
  for (let x = 15; x < 85; x++) assert.ok(Math.abs(a[(nearTrack * sparse.columns + x) * 2 + 1]) > .01);
});

test('propagation is frame-rate independent and settles after repeated strokes', () => {
  const slow = createSurface(390, 740), fast = createSurface(390, 740);
  slow.tap(.3, .4);
  fast.tap(.3, .4);
  advance(slow, 1, 30);
  advance(fast, 1, 120);
  assert.deepEqual(slow.normals(), fast.normals());
  for (let i = 0; i < 100; i++) {
    fast.stroke({ x: .05, y: .2 + (i % 7) / 10 }, { x: .95, y: .8 - (i % 7) / 10 });
    fast.advance(1 / 60);
  }
  advance(fast, 60);
  assert.equal(fast.active, false);
  fast.tap(.5, .5);
  assert.equal(fast.active, true);
});
