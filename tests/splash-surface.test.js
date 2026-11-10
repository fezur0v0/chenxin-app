import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSurface } from '../src/splash/surface.js';
const hash = surface => createHash('sha256').update(surface.heights()).digest('hex');

test('tap and trail match captured reference frames at 60 Hz', () => {
  // Captured from Whynotmetoo/water-ripples 0d86747, 390 x 844 viewport.
  const surface = createSurface(390, 844);
  surface.tap(.4, .3);
  assert.equal(hash(surface), '50b59f157a047c7abdd1637e91a5af0c46c42597c614d5c8a1a8aee43bb9cec2');
  surface.advance(1 / 60);
  assert.equal(hash(surface), '66d5993206eacaf4e3fc84a0ae023f657084d2f33eb21e67e3b89459f4e95cb2');
  for (let i = 1; i < 30; i++) surface.advance(1 / 60);
  assert.equal(hash(surface), '5cd2864c7780d5b61d71f57b829dfafffc6b7493ca389da589f1c3f9954e9353');
  for (let i = 0; i < 20; i++) {
    surface.trail(.3 + i * .015, .55);
    surface.advance(1 / 60);
  }
  assert.equal(hash(surface), 'a424ac1f13d1569389d295fc89e7259cdd07673bdc36b6bf461c0f614e730b70');
});

test('propagation has the same speed on 30, 60 and 120 Hz displays', () => {
  const results = [30, 60, 120].map(fps => {
    const field = createSurface(390, 844);
    field.tap(.1, .2);
    for (let i = 0; i < fps * 2; i++) field.advance(1 / fps);
    return hash(field);
  });
  assert.equal(new Set(results).size, 1);
});

test('edges stay pinned and disturbances decay to neutral water', () => {
  const field = createSurface(320, 568);
  field.tap(0, 0);
  field.trail(1, 1);
  for (let i = 0; i < 1800; i++) field.advance(1 / 60);
  const pixels = field.heights();
  assert.ok(pixels.every(value => Math.abs(value - 128) <= 1));
  for (let x = 0; x < field.columns; x++) {
    assert.equal(pixels[x], 128);
    assert.equal(pixels[(field.rows - 1) * field.columns + x], 128);
  }
});
