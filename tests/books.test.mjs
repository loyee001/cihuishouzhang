import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOKS, ALL_WORDS, ALL_UNITS } from '../books.js';
import { freshState, sanitizeState, selectBook, markLearned, recordsForBook, bookForRecord, trimHistory, mergeSyncedState } from '../core.js';

test('catalogue has usable chapters, complete cards and globally unique IDs',()=>{
  for(const id of ['think1','nce1','nce2','basics','daily']) assert.ok(BOOKS.some(book=>book.id===id));
  assert.equal(new Set(ALL_WORDS.map(w=>w.id)).size,ALL_WORDS.length);
  assert.equal(new Set(ALL_UNITS.map(u=>u.id)).size,ALL_UNITS.length);
  for(const book of BOOKS){
    assert.ok(book.words.length>=12);
    for(const unit of book.units){
      const words=book.words.filter(w=>w.unit===unit.id);
      assert.ok(words.length>=6);
      assert.equal(new Set(words.map(w=>w.zh)).size,words.length,'Game choices should have unambiguous meanings');
      for(const word of words) for(const key of ['en','pos','zh','example','translation']) assert.ok(word[key]);
    }
  }
});
test('existing Think 1 progress, reward tokens, pet and history survive migration',()=>{
  const legacy={version:1,unit:'u1',learned:['u1-1'],review:['u1-2'],xp:37,treats:2,petName:'芽芽',activity:{'2026-10-01':['u1-1']},index:{u1:9},rewarded:['dictation:2026-10-01:u1-1'],history:[{id:'legacy-result',unit:'u1',results:[],correct:3,total:5}]};
  const state=sanitizeState(legacy);selectBook(state,state.book,BOOKS);
  assert.equal(state.book,'think1');assert.equal(state.unit,'u1');assert.equal(state.index.u1,9);
  assert.deepEqual(state.learned,['u1-1']);assert.equal(state.xp,37);assert.equal(state.petName,'芽芽');
  assert.equal(recordsForBook(state,'think1',BOOKS).length,1);assert.equal(recordsForBook(state,'daily',BOOKS).length,0);
  assert.equal(bookForRecord(state.history[0],BOOKS).id,'think1');
});
test('switching books remembers each chapter and card without mixing learned words',()=>{
  const state=freshState();state.index.u1=8;markLearned(state,'u1-1');
  selectBook(state,'basics',BOOKS);assert.equal(state.unit,'basics-objects');
  markLearned(state,'basics-objects-01');state.unit='basics-nature';state.index['basics-nature']=4;
  selectBook(state,'daily',BOOKS);assert.equal(state.unit,'daily-out');
  selectBook(state,'basics',BOOKS);assert.equal(state.unit,'basics-nature');assert.equal(state.index[state.unit],4);
  selectBook(state,'think1',BOOKS);assert.equal(state.unit,'u1');assert.equal(state.index.u1,8);
  assert.equal(BOOKS.find(b=>b.id==='think1').words.filter(w=>state.learned.includes(w.id)).length,1);
  assert.equal(BOOKS.find(b=>b.id==='basics').words.filter(w=>state.learned.includes(w.id)).length,1);
  assert.equal(BOOKS.find(b=>b.id==='daily').words.filter(w=>state.learned.includes(w.id)).length,0);
  assert.equal(state.xp,20);
  const restored=sanitizeState(JSON.parse(JSON.stringify(state)));selectBook(restored,'basics',BOOKS);
  assert.equal(restored.unit,'basics-nature');assert.equal(restored.index[restored.unit],4);
});
test('dictation histories are filtered by book and legacy entries stay in Think 1',()=>{
  const state=freshState();state.history=[{id:'old',unit:'u1'},{id:'basic',book:'basics',unit:'basics-nature'},{id:'day',book:'daily',unit:'daily-talk'}];
  assert.deepEqual(recordsForBook(state,'think1',BOOKS).map(r=>r.id),['old']);
  assert.deepEqual(recordsForBook(state,'basics',BOOKS).map(r=>r.id),['basic']);
  assert.deepEqual(recordsForBook(state,'daily',BOOKS).map(r=>r.id),['day']);
});
test('an invalid selection does not mutate saved learning state',()=>{
  const state=freshState(),before=structuredClone(state);
  assert.throws(()=>selectBook(state,'unknown-book',BOOKS),/Unknown/);
  assert.deepEqual(state,before);
});
test('practising another book does not remove old Think 1 history',()=>{
  const recent=Array.from({length:35},(_,i)=>({id:`basic-${i}`,book:'basics',unit:'basics-objects',results:[],correct:4,total:5}));
  const history=[...recent,{id:'legacy',unit:'u1',results:[],correct:5,total:5}];
  const kept=trimHistory(history);assert.equal(kept.length,31);assert.equal(kept.at(-1).id,'legacy');
  const state=sanitizeState({...freshState(),history});
  assert.equal(recordsForBook(state,'think1',BOOKS).length,1);
  assert.equal(recordsForBook(state,'basics',BOOKS).length,30);
});
test('cross-tab sync keeps the current card and accepts other books positions',()=>{
  const current=freshState();current.index.u1=8;
  const remote=freshState();selectBook(remote,'basics',BOOKS);
  remote.index={u1:0,'basics-objects':8,'nce1-l1-2':3};
  markLearned(remote,'basics-objects-01');
  const merged=mergeSyncedState(current,remote);
  assert.equal(merged.book,'think1');assert.equal(merged.unit,'u1');assert.equal(merged.index.u1,8);
  assert.equal(merged.index['basics-objects'],8);assert.equal(merged.index['nce1-l1-2'],3);
  assert.ok(merged.learned.includes('basics-objects-01'));
  selectBook(merged,'basics',BOOKS);assert.equal(merged.index[merged.unit],8);
});
