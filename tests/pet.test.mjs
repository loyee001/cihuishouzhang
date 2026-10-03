import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, sanitizeState, petLevel, petProgress, markLearned, rewardOnce, mergeSyncedState } from '../core.js';

function legacyState(xp = 455) {
  return {
    version: 1, book: 'think1', bookUnits: { think1: 'u1' }, unit: 'u1',
    xp, treats: 4, petName: '芽芽', learned: ['u1-1'], review: ['u1-2'],
    activity: { '2026-10-01': ['u1-1'] }, rewarded: ['match:2026-10-01:u1-1'],
    history: [{ id: 'old-result', unit: 'u1', results: [], correct: 3, total: 5 }],
    totalDictations: 1, achievements: [], index: { u1: 7 }
  };
}

test('new pets start on the progressive curve without migration compensation', () => {
  const state = freshState();
  assert.equal(state.version, 1);
  assert.equal(state.petGrowthVersion, 2);
  assert.equal(state.petXpBonus, 0);
  assert.deepEqual(petProgress(state), { level: 1, current: 0, target: 60 });
});

test('each later level needs 30 more XP and transitions at the cumulative threshold', () => {
  const thresholds = [0, 60, 150, 270, 420, 600, 810, 1050, 1320];
  thresholds.forEach((xp, index) => {
    const level = index + 1;
    assert.deepEqual(petLevel(xp), { level, current: 0, target: 60 + index * 30 });
    if (index) {
      const previousTarget = 60 + (index - 1) * 30;
      assert.deepEqual(petLevel(xp - 1), { level: level - 1, current: previousTarget - 1, target: previousTarget });
    }
  });
  assert.deepEqual(petLevel(455), { level: 5, current: 35, target: 180 });
});

test('legacy level 8 keeps its level, 35 XP progress and all learning records', () => {
  const raw = legacyState(), before = structuredClone(raw);
  const state = sanitizeState(raw);
  assert.equal(state.xp, 455);
  assert.equal(state.petGrowthVersion, 2);
  assert.equal(state.petXpBonus, 630);
  assert.deepEqual(petProgress(state), { level: 8, current: 35, target: 270 });
  for (const key of Object.keys(raw)) assert.deepEqual(state[key], raw[key], key);
  assert.deepEqual(raw, before, 'migration must not mutate the saved source');
});

test('migration preserves old progress at early and later level boundaries', () => {
  for (const xp of [0, 59, 60, 119, 120, 179, 420, 479, 480]) {
    const state = sanitizeState(legacyState(xp));
    const level = 1 + Math.floor(xp / 60);
    assert.equal(state.xp, xp);
    assert.deepEqual(petProgress(state), { level, current: xp % 60, target: 60 + 30 * (level - 1) });
  }
});

test('new learning and exercise rewards advance migrated pets without another bonus', () => {
  const state = sanitizeState(legacyState());
  assert.equal(markLearned(state, 'u1-3', '2026-10-03'), true);
  assert.equal(markLearned(state, 'u1-3', '2026-10-03'), false);
  assert.deepEqual(petProgress(state), { level: 8, current: 45, target: 270 });
  assert.equal(rewardOnce(state, 'exercise-completed', 225), true);
  assert.equal(rewardOnce(state, 'exercise-completed', 225), false);
  assert.equal(state.xp, 690);
  assert.equal(state.petXpBonus, 630);
  assert.deepEqual(petProgress(state), { level: 9, current: 0, target: 300 });
});

test('saving and restoring migrated progress does not grant compensation again', () => {
  let state = sanitizeState(legacyState());
  state.xp += 30;
  const expected = structuredClone(state);
  for (let i = 0; i < 5; i++) state = sanitizeState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(state, expected);
  assert.deepEqual(petProgress(state), { level: 8, current: 65, target: 270 });
});

test('version 2 compensation is a nonnegative integer and is never inferred again', () => {
  for (const [value, expected] of [[630.9, 630], [-5, 0], [NaN, 0], [Infinity, 0], ['630', 0], [undefined, 0]]) {
    const state = sanitizeState({ ...freshState(), xp: 455, petXpBonus: value });
    assert.equal(state.petXpBonus, expected);
    assert.equal(state.petGrowthVersion, 2);
  }
});

test('cross-tab sync preserves migrated XP and accepts subsequent rewards', () => {
  const current = sanitizeState(legacyState());
  const remote = sanitizeState(JSON.parse(JSON.stringify(current)));
  remote.xp += 10;
  remote.book = 'basics';
  remote.unit = 'basics-objects';
  remote.index['basics-objects'] = 3;
  const merged = mergeSyncedState(current, remote);
  assert.equal(merged.book, 'think1');
  assert.equal(merged.unit, 'u1');
  assert.equal(merged.index.u1, 7);
  assert.equal(merged.index['basics-objects'], 3);
  assert.equal(merged.xp, 465);
  assert.equal(merged.petXpBonus, 630);
  assert.deepEqual(petProgress(merged), { level: 8, current: 45, target: 270 });
});

test('a legacy tab write cannot grant a second migration bonus to an upgraded tab', () => {
  const current = sanitizeState(legacyState());
  const merged = mergeSyncedState(current, legacyState(485));
  assert.equal(merged.xp, 485);
  assert.equal(merged.petGrowthVersion, 2);
  assert.equal(merged.petXpBonus, 630);
  assert.deepEqual(petProgress(merged), { level: 8, current: 65, target: 270 });
  assert.deepEqual(sanitizeState(JSON.parse(JSON.stringify(merged))), merged);
});
