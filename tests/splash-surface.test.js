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

test('the edge leaves only a faint return wave', () => {
  const pool = createSurface(320, 320);
  const extended = createSurface(640, 320);
  pool.tap(20 / 99, 50 / 99);
  extended.tap(120 / 199, 50 / 99);

  // A matched open section lets us separate the return from the outgoing wave.
  function measure() {
    const actual = slopes(pool), open = slopes(extended);
    let incident = 0, reflected = 0;
    for (let y = 35; y <= 65; y++) {
      for (let x = 14; x < 40; x++) {
        for (let axis = 0; axis < 2; axis++) {
          const a = actual[(y * 100 + x) * 2 + axis];
          const b = open[(y * 200 + x + 100) * 2 + axis];
          incident += b * b;
          reflected += (a - b) ** 2;
        }
      }
    }
    return { incident, reflected };
  }

  advance(pool, .6);
  advance(extended, .6);
  const initial = measure();
  advance(pool, .6);
  advance(extended, .6);
  const { reflected } = measure();
  assert.ok(reflected > initial.reflected * 10, 'some motion returns from the edge');
  assert.ok(reflected < initial.incident * .01, 'the return is much weaker than the outgoing wave');
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
  advance(fast, 8);
  assert.equal(fast.active, false);
  fast.tap(.5, .5);
  assert.equal(fast.active, true);
});

test('stroke force changes wave energy and repeated strong sweeps remain finite', () => {
  const light = createSurface(390, 740), heavy = createSurface(390, 740);
  const start = { x: .2, y: .5 }, end = { x: .8, y: .5 };
  light.stroke(start, end, .5);
  heavy.stroke(start, end, 2);
  advance(light, .2);
  advance(heavy, .2);
  const energy = field => slopes(field).reduce((total, slope) => total + slope * slope, 0);
  assert.ok(energy(heavy) > energy(light) * 10);
  for (let i = 0; i < 100; i++) {
    heavy.stroke(i % 2 ? start : end, i % 2 ? end : start, 3.63);
    heavy.advance(1 / 120);
  }
  assert.ok(slopes(heavy).every(Number.isFinite));
  advance(heavy, 60);
  assert.equal(heavy.active, false);
});

test('a reversed stroke leaves opposite momentum even after the contact ends', () => {
  const right = createSurface(390, 740), left = createSurface(390, 740);
  const a = { x: .3, y: .5 }, b = { x: .7, y: .5 };
  right.stroke(a, b);
  left.stroke(b, a);
  const first = slopes(right), reversed = slopes(left);
  assert.ok(first.every((value, i) => Math.abs(value - reversed[i]) < .0001));
  advance(right, .15);
  advance(left, .15);
  const moving = slopes(right), opposite = slopes(left);
  assert.ok(moving.some((value, i) => Math.abs(value - opposite[i]) > .01));
  assert.equal(right.active, true);
  assert.equal(left.active, true);
});
