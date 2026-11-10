import test from 'node:test';
import assert from 'node:assert/strict';
import { createGesture } from '../src/splash/gesture.js';

const point = (x, time, extras = {}) => ({ x, y: .5, time, pointerType: 'touch', pressure: .5, ...extras });

function trace(duration, count, extras = {}) {
  let amount = 0, taps = 0;
  const forces = [];
  const field = {
    tap(x, y, strength) { taps += strength; },
    stroke(from, to, strength) {
      amount += Math.hypot(to.x - from.x, to.y - from.y) * strength;
      forces.push(strength);
    },
  };
  const gesture = createGesture(field, point(.1, 0, extras), 400, 800);
  for (let i = 1; i <= count; i++) gesture.move(point(.1 + .8 * i / count, duration * i / count, extras));
  return { amount, forces, taps };
}

test('the same path swept quickly pushes more water than a slow stroke', () => {
  const slow = trace(2000, 120), fast = trace(200, 12);
  assert.ok(fast.amount > slow.amount * 2);
  assert.ok(fast.forces.every(value => value > 0 && value < 1.2));
});

test('integrated stroke force does not depend on event frequency', () => {
  const sparse = trace(320, 4), dense = trace(320, 80);
  assert.ok(Math.abs(sparse.amount - dense.amount) < 1e-10);
});

test('reported pressure modulates force and unsupported input stays neutral', () => {
  const touch = trace(300, 20), mouse = trace(300, 20, { pointerType: 'mouse', pressure: .9 });
  const absent = trace(300, 20, { pressure: undefined });
  assert.equal(touch.amount, mouse.amount);
  assert.equal(touch.amount, absent.amount);
  const light = trace(300, 20, { pointerType: 'pen', pressure: .1 });
  const heavy = trace(300, 20, { pointerType: 'pen', pressure: .9 });
  assert.ok(heavy.amount > light.amount * 2);
  assert.ok(heavy.taps > light.taps * 2);
});

test('duplicate and out-of-order samples do not add force or corrupt the next stroke', () => {
  const strokes = [];
  const field = { tap() {}, stroke(a, b, strength) { strokes.push({ a, b, strength }); } };
  const gesture = createGesture(field, point(.1, 100), 400, 800);
  gesture.move(point(.2, 110));
  gesture.move(point(.2, 110));
  gesture.move(point(.8, 105));
  gesture.move(point(.3, 120));
  assert.equal(strokes.length, 2);
  assert.equal(strokes[1].a.x, .2);
  assert.ok(strokes.every(item => Number.isFinite(item.strength)));
});

test('resting contacts settle their force; a new finger starts independently', () => {
  const forces = [];
  const field = { tap() {}, stroke(a, b, strength) { forces.push(strength); } };
  const gesture = createGesture(field, point(.1, 0), 400, 800);
  gesture.move(point(.5, 50));
  gesture.move(point(.5, 1000));
  gesture.move(point(.51, 1050));
  const resumed = forces.at(-1);
  const second = createGesture(field, point(.5, 1000), 400, 800);
  second.move(point(.51, 1050));
  assert.ok(Math.abs(forces.at(-1) - resumed) < 1e-8);
});
