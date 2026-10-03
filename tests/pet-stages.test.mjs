import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, sanitizeState, petProgress } from '../core.js';
import { petStage, nextPetStage, growthToStage } from '../pets.js';

function progressAt(xp) { return petProgress({ ...freshState(), xp }); }

test('pet appearance evolves exactly at levels 4, 8 and 12', () => {
  const boundaries = [
    { xp: 270, level: 4, before: 'sprout', after: 'wind' },
    { xp: 1050, level: 8, before: 'wind', after: 'crystal' },
    { xp: 2310, level: 12, before: 'crystal', after: 'celestial' }
  ];
  for (const boundary of boundaries) {
    const previous = progressAt(boundary.xp - 1), unlocked = progressAt(boundary.xp);
    assert.equal(petStage(previous.level).id, boundary.before);
    assert.equal(nextPetStage(previous.level).id, boundary.after);
    assert.equal(growthToStage(previous, nextPetStage(previous.level)), 1);
    assert.equal(unlocked.level, boundary.level);
    assert.equal(petStage(unlocked.level).id, boundary.after);
    assert.equal(growthToStage(unlocked, petStage(unlocked.level)), 0);
  }
});

test('growth remaining includes all intervening levels of the increasing curve', () => {
  for (const [xp, remaining] of [[0, 270], [59, 211], [60, 210], [150, 120], [270, 780], [810, 240], [1050, 1260], [1950, 360]]) {
    const progress = progressAt(xp);
    assert.equal(growthToStage(progress, nextPetStage(progress.level)), remaining);
  }
});

test('migrated pets use compensated progress for their appearance and next evolution', () => {
  const state = sanitizeState({ version: 1, xp: 455 });
  const progress = petProgress(state);
  assert.equal(petStage(progress.level).id, 'crystal');
  assert.equal(nextPetStage(progress.level).id, 'celestial');
  assert.equal(growthToStage(progress, nextPetStage(progress.level)), 1225);
  state.xp += 235;
  const later = petProgress(state);
  assert.equal(later.level, 9);
  assert.equal(growthToStage(later, nextPetStage(later.level)), 990);
});

test('levels beyond the final evolution keep the final form without another target', () => {
  for (const level of [12, 13, 100, 1_000_000]) {
    assert.equal(petStage(level).id, 'celestial');
    assert.equal(nextPetStage(level), null);
    assert.equal(growthToStage({ level, current: 0 }, nextPetStage(level)), 0);
  }
});
