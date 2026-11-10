import test from 'node:test';
import assert from 'node:assert/strict';
import { createGesture } from '../src/splash/gesture.js';

test('contact taps once and moves over two CSS pixels leave reference drops', () => {
  const calls = [];
  const field = { tap: (...p) => calls.push(['tap', ...p]), trail: (...p) => calls.push(['trail', ...p]) };
  const gesture = createGesture(field, { x: .5, y: .5 }, 400, 800);
  gesture.move({ x: .502, y: .5 });
  gesture.move({ x: .52, y: .5 });
  gesture.move({ x: .52, y: .5 });
  assert.deepEqual(calls, [['tap', .5, .5], ['trail', .52, .5]]);
});

test('mouse hover starts without a tap and independent contacts do not share a position', () => {
  const calls = [];
  const field = { tap: () => assert.fail('hover must not tap'), trail: (...p) => calls.push(p) };
  const a = createGesture(field, { x: .2, y: .3 }, 400, 800, false);
  const b = createGesture(field, { x: .8, y: .7 }, 400, 800, false);
  a.move({ x: .21, y: .3 });
  b.move({ x: .8, y: .7 });
  assert.deepEqual(calls, [[.21, .3]]);
});
