import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, sanitizeState, gradeAnswers, isCorrect, markLearned, rewardOnce, streak, petLevel } from '../core.js';
import { WORDS, UNITS } from '../data.js';

test('dictation handles case, surrounding whitespace, empty answers and misspellings', () => {
  const words=[{id:'a',en:'hobby',zh:'爱好'},{id:'b',en:'instrument',zh:'乐器'},{id:'c',en:'club',zh:'社团'}];
  const result=gradeAnswers(words,{a:' HOBBY ',b:'instrumant'});
  assert.equal(result.correct,1); assert.equal(result.total,3);
  assert.equal(result.results[2].answer,''); assert.equal(result.results[1].correct,false);
});
test('British spelling stays strict unless an alternative is explicitly declared',()=>{
  assert.equal(isCorrect('practice',{en:'practise'}),false);
  assert.equal(isCorrect('practice',{en:'practise',accept:['practice']}),true);
  assert.equal(isCorrect('ｈｏｂｂｙ',{en:'hobby'}),true);
});
test('relearning cannot duplicate rewards and still records a later study day',()=>{
  const state=freshState();state.review=['u1-1'];
  assert.equal(markLearned(state,'u1-1','2026-10-01'),true);
  assert.equal(markLearned(state,'u1-1','2026-10-02'),false);
  assert.equal(state.xp,10);assert.equal(state.treats,1);assert.deepEqual(state.review,[]);
  assert.deepEqual(state.activity['2026-10-02'],[]);
  assert.equal(streak(Object.keys(state.activity),new Date(2026,9,2)),2);
});
test('game and dictation rewards are granted once for a given day and word',()=>{
  const state=freshState();assert.equal(rewardOnce(state,'match:2026-10-01:u1-1',3),true);
  assert.equal(rewardOnce(state,'match:2026-10-01:u1-1',3),false);
  assert.equal(rewardOnce(state,'match:2026-10-02:u1-1',3),true);assert.equal(state.xp,6);
});
test('study streak permits yesterday but breaks after a gap and spans months',()=>{
  assert.equal(streak(['2026-09-30','2026-10-01'],new Date(2026,9,2)),2);
  assert.equal(streak(['2026-09-29'],new Date(2026,9,2)),0);
  assert.equal(streak(['2026-09-30','2026-10-01'],new Date(2026,9,1)),2);
});
test('pet level rolls over precisely at the experience threshold',()=>{
  assert.deepEqual(petLevel(59),{level:1,current:59,target:60});
  assert.deepEqual(petLevel(60),{level:2,current:0,target:90});
});
test('loading saved state preserves independent cumulative achievements',()=>{
  const state=sanitizeState({...freshState(),totalDictations:45,achievements:['perfect'],xp:-2});
  assert.equal(state.totalDictations,45);assert.deepEqual(state.achievements,['perfect']);assert.equal(state.xp,0);
  assert.deepEqual(sanitizeState(null),freshState());
});
test('every enabled unit has unique complete learning cards with source pages',()=>{
  assert.equal(WORDS.length,36);assert.equal(new Set(WORDS.map(w=>w.id)).size,WORDS.length);
  for(const unit of UNITS) assert.ok(WORDS.some(w=>w.unit===unit.id));
  for(const word of WORDS){for(const k of ['en','zh','pos','example','translation'])assert.ok(word[k]);assert.ok(word.sourcePage>=12&&word.sourcePage<=15);}
});
