import { BOOKS, ALL_WORDS } from './books.js';
import { STORAGE_KEY, freshState, sanitizeState, markLearned, todayKey, streak, petProgress, gradeAnswers, rewardOnce, selectBook, bookForRecord, recordsForBook, trimHistory, mergeSyncedState } from './core.js';
import { petStage } from './pets.js';
import { petPageView, petPreviewView } from './pet-view.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  book: '<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2z"/>',
  game: '<path d="M7 8h10c3 0 5 10 3 11-2 1-4-3-5-3H9c-1 0-3 4-5 3C2 18 4 8 7 8zM6 11v5M3.5 13.5h5"/><circle cx="16" cy="12" r=".7"/><circle cx="18" cy="15" r=".7"/>',
  pen: '<path d="M12 4H5v16h14v-7M10 14l1-4L19 2l3 3-8 8zM8 17h7"/>',
  paw: '<ellipse cx="12" cy="16" rx="6" ry="5"/><ellipse cx="4" cy="9" rx="2" ry="3"/><ellipse cx="9" cy="5" rx="2" ry="3"/><ellipse cx="15" cy="5" rx="2" ry="3"/><ellipse cx="20" cy="10" rx="2" ry="3"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4zM17 8c3 2 3 6 0 8M20 5c5 4 5 10 0 14"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 1 7M20 3v6h-6"/>',
  star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>',
  fire: '<path d="M13 2c1 7 7 8 7 13a8 8 0 0 1-16 0c0-3 2-6 4-8 0 5 2 4 2 4s4-3 3-9z"/>',
  gift: '<path d="M3 9h18v5H3zM5 14v7h14v-7M12 9v12"/><path d="M12 9C1 8 7-1 12 9c5-10 11-1 0 0z"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  leaf: '<path d="M20 3C6 1 1 12 8 17 15 22 23 11 20 3zM5 21 16 8"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.1M3 12h.1M3 19h.1"/>'
};
function icon(name, cls = '') { return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.star}</svg>`; }
let storageAvailable = true;
let state;
try { state = sanitizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { state = freshState(); }
let activeBook, WORDS, UNITS, SOURCE;
function loadBook(bookId) { activeBook = selectBook(state, BOOKS.some(b=>b.id===bookId)?bookId:BOOKS[0].id, BOOKS); WORDS=activeBook.words; UNITS=activeBook.units; SOURCE=activeBook.source; }
loadBook(state.book);
let route = location.hash.slice(1) || 'learn';
let session = null, game = null, lastResult = null, toastTimer;
try {
  const draft = JSON.parse(sessionStorage.getItem('think1-dictation-draft'));
  if (draft && Array.isArray(draft.wordIds) && draft.wordIds.length && draft.wordIds.every(id => ALL_WORDS.some(w => w.id === id)) && ['meaning','audio'].includes(draft.mode)) {
    const words = draft.wordIds.map(id=>ALL_WORDS.find(w=>w.id===id));
    const owner = BOOKS.find(book=>book.words.some(w=>w.id===words[0].id));
    if (owner && words.every(w=>owner.words.includes(w)&&w.unit===words[0].unit)) {
      loadBook(owner.id); session = {...draft, book:owner.id, answers: draft.answers || {}, words};
      state.unit = words[0].unit; state.bookUnits[owner.id]=state.unit;
    }
  }
} catch {}
let savedPetProgress = petProgress(state), pendingPetNotice = '';
const pageNames = { learn: '单词新学', games: '单词游戏', dictation: '默写批改', pet: '我的宠物' };
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageAvailable = true;
    const progress = petProgress(state);
    if (progress.level > savedPetProgress.level) {
      const evolved = petStage(progress.level).id !== petStage(savedPetProgress.level).id;
      pendingPetNotice = evolved ? `${state.petName}进化成${petStage(progress.level).name}啦！Lv. ${progress.level}` : `${state.petName}升到 Lv. ${progress.level} 啦！`;
      queueMicrotask(() => { if (pendingPetNotice) toast(''); });
    }
    savedPetProgress = progress;
    return true;
  } catch { storageAvailable = false; toast('当前浏览器无法保存记录，请允许本地存储。'); return false; }
}
function toast(message) {
  clearTimeout(toastTimer);
  const celebrating = Boolean(pendingPetNotice);
  $('#toast').textContent = [message, pendingPetNotice].filter(Boolean).join(' · ');
  pendingPetNotice = '';
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), celebrating ? 6500 : 3200);
}
function unitWords() { return WORDS.filter(w => w.unit === state.unit); }
function unit() { return UNITS.find(u => u.id === state.unit); }
function wordIndex() { return Math.min(Math.max(0, Number(state.index[state.unit]) || 0), unitWords().length - 1); }
function currentWord() { return unitWords()[wordIndex()]; }
function dailyLearned() { const ids=new Set(WORDS.map(w=>w.id));return (state.activity[todayKey()] || []).filter(id=>ids.has(id)).length; }
function currentHistory() { return recordsForBook(state,state.book,BOOKS); }
function practiceActive() { return Boolean(session || (game && (game.kind==='match'?game.matched.length<game.words.length:game.index<game.words.length))); }
function speech(text) {
  if (!('speechSynthesis' in window)) { toast('此浏览器不支持朗读，请用 Chrome、Edge 或 Safari。'); return; }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB'; utterance.rate = .82;
  utterance.voice = speechSynthesis.getVoices().find(v => v.lang === 'en-GB') || speechSynthesis.getVoices().find(v => v.lang.startsWith('en')) || null;
  utterance.onerror = event => { if (!['interrupted','canceled'].includes(event.error)) toast('发音暂不可用，请检查系统英语语音或稍后重试。'); };
  speechSynthesis.speak(utterance);
}
function petImage(cls = '', stage = petStage(petProgress(state).level)) {
  return `<img class="pet-image ${cls}" src="${stage.image}" alt="${stage.name}形态的${esc(state.petName)}" width="1024" height="1024">`;
}
function header() {
  return `<header class="site-header"><a class="brand" href="#learn" aria-label="词汇手账首页"><strong class="journal-brand">词汇手账</strong><span class="brand-sub">英语学习 · 每天一点进步 ${icon('leaf')}</span></a><div class="handwritten brand-note">Small words,<br>big adventures.</div><nav class="tabs" aria-label="学习导航">${[['learn','book'],['games','game'],['dictation','pen'],['pet','paw']].map(([id,i]) => `<a class="tab ${route===id?'active':''}" href="#${id}" ${route===id?'aria-current="page"':''}>${icon(i)}<span>${pageNames[id]}</span></a>`).join('')}</nav><div class="header-note">每天一点点<br><span>把进步记下来</span><i>♡</i></div></header>`;
}
function toolbar(kicker = 'MY WORD JOURNAL') {
  const mastered=WORDS.filter(w=>state.learned.includes(w.id)).length;
  return `<div class="toolbar"><div><span class="eyebrow">${kicker}</span><h1>${pageNames[route]}</h1></div><div class="study-selectors"><button class="book-switcher ${activeBook.tone}" data-action="choose-books" aria-label="选择词书"><span class="book-mini-icon">${icon('book')}</span><span><small>当前词书 · 已学 ${mastered} / ${WORDS.length}</small><strong>${esc(activeBook.title)}</strong></span><span class="switch-label">换一本</span></button><div class="unit-picker"><label for="unit-select">${esc(activeBook.scope)} · 本章 ${unitWords().length} 词</label><select id="unit-select" ${practiceActive()?'disabled':''}>${UNITS.map(u=>`<option value="${u.id}" ${state.unit===u.id?'selected':''}>${esc(u.name)} · ${esc(u.zh)}</option>`).join('')}</select></div></div></div>`;
}
function bookShelf() {
  const blocked=practiceActive();
  openDialog(`<span class="eyebrow">MY LITTLE BOOKSHELF</span><h2>选择一本词书</h2><p class="bookshelf-intro">每本都有自己的学习进度，小伙伴会陪你一起读下去。</p>${blocked?'<p class="book-switch-notice" role="status">当前练习尚未结束，请先完成或结束练习，再切换词书。</p>':''}<div class="book-grid">${BOOKS.map((book,i)=>{
    const mastered=book.words.filter(w=>state.learned.includes(w.id)).length, current=state.book===book.id;
    return `<article class="book-option ${book.tone} ${current?'current':''}"><div class="book-cover"><span class="book-volume">VOL. ${String(i+1).padStart(2,'0')}</span>${icon('book')}<h3>${esc(book.title)}</h3><p>${esc(book.subtitle)}</p><span class="book-scope">${esc(book.scope)}</span></div><div class="book-detail"><p class="book-description">${esc(book.description)}</p><div class="book-counts"><span>${book.words.length} 个词</span><span>${book.units.length} 个章节</span></div><div class="book-progress-label"><span>已学 ${mastered} / ${book.words.length}</span><span>${Math.round(mastered/book.words.length*100)}%</span></div><div class="progress lilac"><span style="width:${mastered/book.words.length*100}%"></span></div><button class="button ${current?'secondary':'primary'}" data-action="select-book" data-book="${book.id}" ${current||blocked?'disabled':''}>${current?icon('check')+'正在学习':'学习这本'}</button></div></article>`;
  }).join('')}</div><p class="bookshelf-note">教材词书为已标注课次的精选词汇，尚未收录全册；基础英语和日常交流为原创主题词书。</p>`);
  $('#dialog').classList.add('bookshelf-dialog');
}
function switchBook(bookId) {
  if(practiceActive()){toast('请先完成或结束当前练习，再切换词书。');return;}
  if(!BOOKS.some(b=>b.id===bookId))return;
  const before=structuredClone(state), previousBook=state.book;
  loadBook(bookId);
  if(!save()){state=before;loadBook(previousBook);return;}
  game=null;lastResult=null;
  if('speechSynthesis' in window)speechSynthesis.cancel();
  render();toast(`已切换到《${activeBook.title}》`);
}
function sidebar() {
  const level=petProgress(state), previous=currentHistory()[0];
  return `<aside class="side-rail"><section class="paper-card companion"><div class="card-heading">${icon('paw')}<h2>我的学习伙伴</h2><a href="#pet" aria-label="查看我的宠物">···</a></div><div class="pet-stage pet-aura ${petStage(level.level).id}">${petImage()}<span class="pet-bubble">今天也一起<br>变厉害吧！</span><span class="pet-shadow"></span></div><div class="pet-title"><strong>${esc(state.petName)}</strong><span class="level-tag">Lv. ${level.level}</span></div><div class="progress-label"><span>成长值</span><span>${level.current} / ${level.target}</span></div><div class="progress rose"><span style="width:${level.current/level.target*100}%"></span></div><p class="reward-note">${icon('gift')}学会一个词，获得 10 成长值</p></section><section class="paper-card result-note"><div class="card-heading">${icon('pen')}<h2>上次默写</h2></div>${previous?`<p class="last-score">${previous.correct}<span> / ${previous.total}</span></p><p class="muted">${esc(previous.unitName)} · ${esc(previous.date)}</p><button class="button line small" data-action="last-result">查看批改</button>`:`<p class="empty-score">第一份满分，等你来写</p><p class="muted">从 5 个单词开始试试吧</p><a class="button line small" href="#dictation">开始默写</a>`}</section><div class="sticky-note handwritten">A little progress<br>every day.<span>✧</span></div></aside>`;
}
function learnPage() {
  const word=currentWord(), words=unitWords(), n=wordIndex(), learned=state.learned.includes(word.id), today=dailyLearned();
  return `${toolbar()}<div class="learning-layout"><section class="notebook"><div class="book-pages"><div class="spine" aria-hidden="true">${'<i></i>'.repeat(6)}</div><div class="word-page"><div class="page-top"><span class="label lavender">${esc(unit().name)} · ${esc(unit().title)}</span><button class="icon-button" data-action="word-list" aria-label="查看本单元词表">${icon('list')}</button></div><span class="word-state">${learned?`${icon('check')} 已学会`:'TODAY’S NEW WORD'}</span><h2 class="big-word ${word.en.length>8?'long-word':''}">${esc(word.en)}</h2><p class="word-meaning"><em>${esc(word.pos)}</em> ${esc(word.zh)}</p><button class="button pronunciation" data-action="speak">${icon('sound')}听发音</button><div class="word-page-bottom"><span class="handwritten">One word at a time.</span><span class="page-number">${String(n+1).padStart(2,'0')} / ${String(words.length).padStart(2,'0')}</span></div></div><div class="example-page"><div class="illustration-frame"><span class="washi-tape"></span><img src="assets/friendly-classmates.png" alt="小龙与朋友们一起读书的水彩插画" onerror="this.hidden=true"></div><div class="example-copy"><span class="eyebrow">IN A SENTENCE</span><button class="sentence-sound icon-button" data-action="sentence-speak" aria-label="朗读例句">${icon('sound')}</button><p lang="en">${esc(word.example).replace(new RegExp(esc(word.en).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'), '<mark>$&</mark>')}</p><span>${esc(word.translation)}</span></div><div class="handwritten margin-note">Make it yours. ♡</div></div></div><div class="book-bottom"><div class="learning-stats"><span>今日目标 <b>${Math.min(today,12)}</b> / 12 词</span><div class="progress lilac"><span style="width:${Math.min(today/12*100,100)}%"></span></div><span class="streak">${icon('fire')}连续学习 <b>${streak(Object.keys(state.activity))}</b> 天</span></div><div class="learning-actions"><button class="button primary" data-action="learn">${icon('check')}${learned?'下一词':'认识了，下一词'}</button><button class="button secondary" data-action="review">${icon('refresh')}再学一次</button><button class="icon-button prev-word" data-action="previous" aria-label="上一个单词" ${n===0?'disabled':''}>‹</button></div></div></section>${sidebar()}</div>`;
}
function footer() { return `<footer class="site-footer"><span>${icon('book')}${esc(activeBook.title)} · ${esc(activeBook.subtitle)}</span><button data-action="source" class="text-button">词表说明</button><span>${storageAvailable?'学习记录自动保存在此浏览器':'当前记录尚未保存'}</span></footer>`; }
function render() {
  if (!pageNames[route]) route='learn';
  const pages={learn:learnPage,games:gamesPage,dictation:dictationPage,pet:petPage};
  $('#app').innerHTML=`<div class="app-shell">${header()}<main id="main" tabindex="-1">${pages[route]()}</main>${footer()}</div><dialog id="dialog" class="paper-dialog"></dialog>`;
  document.title=`${pageNames[route]} · ${activeBook.title} · 词汇手账`;
}
function shuffle(items) { const result=[...items]; for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];} return result; }
function gameCards() {
  return `<div class="game-options"><article class="paper-card game-choice"><div class="game-graphic pair-graphic"><span>${esc(unitWords()[0].en)}</span><span>${esc(unitWords()[0].zh)}</span></div><span class="eyebrow">MATCH & LEARN</span><h2>单词碰一碰</h2><p>让英文和中文找到彼此。<br>一次 6 对，边玩边记。</p><button class="button primary" data-action="start-match">${icon('game')}开始配对</button><span class="game-reward">每对首次配对成功 +3 成长值 / 天</span></article><article class="paper-card game-choice"><div class="game-graphic quiz-graphic"><span>What does it mean?</span><i>${icon('check')} 选出正确释义</i></div><span class="eyebrow">A LITTLE CHALLENGE</span><h2>词义小挑战</h2><p>看到英文，选出正确意思。<br>5 道小题，检查记忆。</p><button class="button secondary" data-action="start-quiz">${icon('star')}开始挑战</button><span class="game-reward">每词首次答对 +2 成长值 / 天</span></article></div>`;
}
function gamesPage() {
  let content=gameCards();
  if(game?.kind==='match') {
    const complete=game.matched.length===game.words.length;
    const cell=(w,side)=>`<button class="match-tile ${game.matched.includes(w.id)?'matched':''} ${game[side]===w.id?'selected':''} ${game.wrong&&game[side]===w.id?'wrong':''}" data-action="match" data-side="${side}" data-id="${w.id}" ${game.matched.includes(w.id)||game.wrong?'disabled':''}>${game.matched.includes(w.id)?icon('check'):''}${esc(side==='left'?w.en:w.zh)}</button>`;
    content=`<section class="paper-card game-board"><div class="section-heading"><div><span class="eyebrow">MATCH & LEARN</span><h2>单词碰一碰</h2></div><button class="text-button" data-action="end-game">返回游戏</button></div><p class="muted">先选一个英文，再选对应的中文。</p><div class="game-status"><span>已配对 <b>${game.matched.length} / ${game.words.length}</b></span><span>再试次数 <b>${game.mistakes}</b></span></div><div class="match-columns"><div>${game.words.map(w=>cell(w,'left')).join('')}</div><div>${game.rightWords.map(w=>cell(w,'right')).join('')}</div></div><div class="game-feedback ${complete?'success':''}" role="status">${complete?`${icon('star')}全部配对成功！再记住一点点。`:game.wrong?'这两个词还不匹配，再试一次吧。':'让一对单词相遇。'}</div>${complete?'<button class="button primary" data-action="start-match">再玩一组</button>':''}</section>`;
  }
  if(game?.kind==='quiz') {
    const finished=game.index>=game.words.length;
    if(finished) content=`<section class="paper-card game-board quiz-complete"><span class="big-stamp">${icon('star')}</span><span class="eyebrow">CHALLENGE COMPLETE</span><h2>又往前走了一小步</h2><p class="result-big">${game.correct}<span> / ${game.words.length}</span></p><p class="muted">${game.correct===game.words.length?'全部答对！这些单词你记得很牢。':'答错的词已记入待复习，回去再看一遍吧。'}</p><div class="center-actions"><button class="button primary" data-action="start-quiz">再挑战一次</button><button class="button secondary" data-action="end-game">返回游戏</button></div></section>`;
    else {const w=game.words[game.index];content=`<section class="paper-card game-board quiz-board"><div class="section-heading"><span class="eyebrow">QUESTION ${game.index+1} / ${game.words.length}</span><button class="text-button" data-action="end-game">返回游戏</button></div><p class="muted">选出这个单词的中文意思</p><h2 class="quiz-word">${esc(w.en)}<button class="icon-button" data-action="quiz-speak" aria-label="听题目发音">${icon('sound')}</button></h2><div class="quiz-options">${game.options.map((opt,i)=>`<button class="quiz-option ${game.answer&&opt.id===w.id?'correct':''} ${game.answer===opt.id&&opt.id!==w.id?'incorrect':''}" data-action="quiz-answer" data-id="${opt.id}" ${game.answer?'disabled':''}><span>${String.fromCharCode(65+i)}</span>${esc(opt.zh)}</button>`).join('')}</div>${game.answer?`<div class="answer-feedback ${game.answer===w.id?'success':'needs-work'}" role="status">${game.answer===w.id?'答对了！':'再记一次：'} <b>${esc(w.en)}</b> · ${esc(w.zh)}</div><button class="button primary" data-action="quiz-next">${game.index===game.words.length-1?'查看成绩':'下一题'}</button>`:''}</section>`;}
  }
  return `${toolbar('PLAY A LITTLE, LEARN A LOT')}<div class="learning-layout"><div>${content}</div>${sidebar()}</div>`;
}
function historyBlock() { return `<section class="paper-card history-card"><div class="section-heading"><h2>我的默写记录</h2><span class="muted">最近 ${currentHistory().length} 次</span></div>${currentHistory().length?`<div class="history-list">${currentHistory().map((record,i)=>`<button data-action="open-result" data-index="${i}"><span class="history-icon">${icon('pen')}</span><span><b>${esc(record.unitName)}</b><small>${esc(record.date)} · ${record.mode==='audio'?'听音写词':'看中文写词'}</small></span><strong>${record.correct}<em> / ${record.total}</em></strong><span class="history-view">查看批改</span></button>`).join('')}</div>`:'<p class="empty-history">这里将收好你的每一次进步。完成一次默写，就会留下第一份记录。</p>'}</section>`; }
function dictationPage() {
  let content;
  if(session) {
    content=`<section class="paper-card dictation-sheet"><div class="section-heading"><div><span class="eyebrow">A PAGE FOR YOUR MEMORY</span><h2>${session.mode==='audio'?'听音写词':'看中文写词'}</h2></div><button class="text-button" data-action="cancel-dictation">结束本次默写</button></div><div class="dictation-meta"><span>${session.words.length} 个词 · ${esc(unit().name)}</span><span>已填写 <b id="answered-count">${Object.values(session.answers).filter(a=>a.trim()).length}</b> / ${session.words.length}</span></div><form id="dictation-form" autocomplete="off"><div class="dictation-rows">${session.words.map((w,i)=>`<div class="dictation-row"><span class="question-number">${String(i+1).padStart(2,'0')}</span><div class="question-prompt">${session.mode==='meaning'?`<label for="answer-${i}">${esc(w.zh)} <em>${esc(w.pos)}</em></label>`:`<button type="button" class="button audio-question" data-action="dictation-speak" data-index="${i}">${icon('sound')}播放第 ${i+1} 题</button>`}</div><input id="answer-${i}" name="${w.id}" value="${esc(session.answers[w.id]||'')}" placeholder="写下英文单词" aria-label="第 ${i+1} 题英文答案" autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="80"></div>`).join('')}</div><div class="dictation-submit"><p class="muted">忽略大小写和首尾空格，按当前词表拼写批改。</p><button type="submit" class="button primary">${icon('check')}提交并批改</button></div></form></section>`;
  } else if(lastResult) content=resultPage(lastResult);
  else content=`<section class="paper-card dictation-setup"><span class="eyebrow">WRITE IT. REMEMBER IT.</span><h2>把学会的单词，写在这一页</h2><p class="setup-description">不看答案试试看。写完后，我们一起检查。</p><form id="dictation-setup"><fieldset><legend>怎么默写？</legend><div class="mode-options"><label><input type="radio" name="mode" value="meaning" checked><span>${icon('pen')}<b>看中文，写英文</b><small>根据中文释义回忆单词</small></span></label><label><input type="radio" name="mode" value="audio"><span>${icon('sound')}<b>听发音，写英文</b><small>可重复播放，练耳朵与拼写</small></span></label></div></fieldset><div class="form-selects"><label>这次写几个？<select name="count">${[5,10,20].filter(n=>n<unitWords().length).map(n=>`<option value="${n}" ${n===10?'selected':''}>${n} 个词 · ${n===5?'轻松开始':n===10?'日常练习':'多练一点'}</option>`).join('')}<option value="${unitWords().length}">本章全部（${unitWords().length} 词）</option></select></label><label>选择词汇范围<select name="scope"><option value="all">本单元精选（${unitWords().length} 词）</option><option value="learned">我已学过的（${unitWords().filter(w=>state.learned.includes(w.id)).length} 词）</option><option value="review">待复习与错词（${unitWords().filter(w=>state.review.includes(w.id)).length} 词）</option></select></label></div><button type="submit" class="button primary">${icon('pen')}开始默写</button><p class="form-hint">每词当天首次默写正确，获得 5 成长值。</p></form></section>${historyBlock()}`;
  return `${toolbar('PRACTICE MAKES PROGRESS')}<div class="learning-layout"><div>${content}</div>${sidebar()}</div>`;
}
function resultPage(record) {
  const wrong=record.results.filter(r=>!r.correct);
  return `<section class="paper-card correction-sheet"><div class="section-heading"><div><span class="eyebrow">YOUR WORDS, YOUR PROGRESS</span><h2>这一页，批改好了</h2></div><span class="grade-stamp">${record.correct===record.total?'A+':Math.round(record.correct/record.total*100)+'%'}</span></div><div class="correction-summary"><p class="result-big">${record.correct}<span> / ${record.total} 词</span></p><div><b>${wrong.length?`还有 ${wrong.length} 个词值得再练一遍`:'全对！给认真学习的自己一颗星'}</b><p>${esc(record.date)} · ${esc(record.unitName)}</p></div></div><div class="correction-list">${record.results.map((r,i)=>`<div class="correction-row ${r.correct?'correct':'incorrect'}"><span class="correction-status">${icon(r.correct?'check':'close')}</span><span class="correction-meaning"><small>${String(i+1).padStart(2,'0')}</small>${esc(r.zh)}</span><span class="correction-answer">${r.correct?`<b>${esc(r.answer)}</b>`:`<del>${esc(r.answer||'未作答')}</del><b>${esc(r.en)}</b>`}</span><button class="icon-button" data-action="result-speak" data-word="${esc(r.en)}" aria-label="朗读 ${esc(r.en)}">${icon('sound')}</button></div>`).join('')}</div><div class="center-actions">${wrong.length?'<button class="button primary" data-action="retry-wrong">'+icon('refresh')+'只练错词</button>':''}<button class="button secondary" data-action="new-dictation">开始新的默写</button></div></section>`;
}
function petPage() { return petPageView(state, toolbar, icon, esc, petImage); }
function previewPet(stageId) {
  const content = petPreviewView(state, stageId, esc, petImage);
  if (!content) return;
  openDialog(content);
  $('#dialog').classList.add('evolution-dialog');
}
function persistSession() { try { if(session) sessionStorage.setItem('think1-dictation-draft',JSON.stringify({...session,words:undefined,wordIds:session.words.map(w=>w.id)})); else sessionStorage.removeItem('think1-dictation-draft'); } catch {} }
function startDictation(words,mode='meaning') { session={id:crypto.randomUUID(),book:state.book,words,mode,answers:{}};lastResult=null;persistSession();render();window.scrollTo({top:0,behavior:'smooth'}); }
function finishDictation() {
  if(!session)return;
  const before = structuredClone(state);
  const graded=gradeAnswers(session.words,session.answers);
  let earned=0;
  graded.results.forEach(r=>{if(r.correct){state.review=state.review.filter(id=>id!==r.id);if(rewardOnce(state,`dictation:${todayKey()}:${r.id}`,5))earned+=5;}else if(!state.review.includes(r.id))state.review.push(r.id);});
  if(!state.activity[todayKey()]) state.activity[todayKey()]=[];
  const record={...graded,id:session.id,date:todayKey(),mode:session.mode,unitName:unit().name,unit:state.unit,book:state.book,bookTitle:activeBook.title};
  state.history.unshift(record);state.history=trimHistory(state.history);state.totalDictations++;if(record.correct===record.total&&record.total>=5&&!state.achievements.includes('perfect'))state.achievements.push('perfect');if(!save()){state=before;toast('批改结果暂未保存，你的答案已保留，请检查浏览器存储后重试。');return;}lastResult=record;session=null;persistSession();render();toast(`批改完成，答对 ${record.correct} / ${record.total} 个词${earned?`，成长值 +${earned}`:''}`);window.scrollTo({top:0,behavior:'smooth'});
}
function setQuizOptions() {const w=game.words[game.index];game.options=shuffle([w,...shuffle(unitWords().filter(v=>v.id!==w.id)).slice(0,3)]);game.answer=null;}
function startGame(kind) { if(kind==='match'){const words=shuffle(unitWords()).slice(0,6);game={kind,words,rightWords:shuffle(words),matched:[],left:null,right:null,mistakes:0,wrong:false};}else{game={kind,words:shuffle(unitWords()).slice(0,5),index:0,correct:0};setQuizOptions();}render(); }
function choosePair(button) {
  if(!game||game.kind!=='match'||game.wrong)return;
  const id=button.dataset.id,side=button.dataset.side;
  if(game.matched.includes(id))return;
  game[side]=game[side]===id?null:id;
  if(game.left&&game.right){if(game.left===game.right){game.matched.push(game.left);rewardOnce(state,`match:${todayKey()}:${game.left}`,3);game.left=game.right=null;if(!state.activity[todayKey()])state.activity[todayKey()]=[];save();}else{game.wrong=true;game.mistakes++;const round=game;setTimeout(()=>{if(game===round){game.left=game.right=null;game.wrong=false;if(route==='games')render();}},800);}}
  render();
}
function showResult(record) {if(!record)return;if(session){toast('请先完成或结束当前默写，再查看历史批改。');return;}loadBook(bookForRecord(record,BOOKS).id);lastResult=record;game=null;state.unit=UNITS.some(u=>u.id===record.unit)?record.unit:UNITS[0].id;state.bookUnits[state.book]=state.unit;save();session=null;persistSession();route='dictation';if(location.hash!=='#dictation')location.hash='dictation';else render();}
function openDialog(content) { const el=$('#dialog'); el.classList.remove('bookshelf-dialog', 'evolution-dialog'); el.innerHTML=`<button class="icon-button dialog-close" data-action="close-dialog" aria-label="关闭">${icon('close')}</button>${content}`; el.showModal(); }
document.addEventListener('change',event=>{if(event.target.id==='unit-select'){if(practiceActive()||!UNITS.some(u=>u.id===event.target.value)){render();return;}state.unit=event.target.value;state.bookUnits[state.book]=state.unit;game=null;lastResult=null;save();render();}});
document.addEventListener('click', event=>{
  const button=event.target.closest('[data-action]'); if(!button) return;
  const action=button.dataset.action;
  if(action==='choose-books') bookShelf();
  if(action==='preview-pet') previewPet(button.dataset.stage);
  if(action==='select-book') switchBook(button.dataset.book);
  if(action==='speak') speech(currentWord().en);
  if(action==='sentence-speak') speech(currentWord().example);
  if(action==='learn') { const w=currentWord();const gained=markLearned(state,w.id);state.index[state.unit]=(wordIndex()+1)%unitWords().length;save();render();toast(gained?'学会了！成长值 +10，获得一份小点心':'继续巩固，下一个单词！'); }
  if(action==='review'){if(!state.activity[todayKey()])state.activity[todayKey()]=[];const w=currentWord();if(!state.review.includes(w.id))state.review.push(w.id);save();toast('已记入待复习，听一遍后再读一遍吧');speech(w.en);}
  if(action==='previous'){state.index[state.unit]=Math.max(0,wordIndex()-1);save();render();}
  if(action==='close-dialog') $('#dialog').close();
  if(action==='source') openDialog(`<span class="eyebrow">ABOUT THIS WORD LIST</span><h2>词表说明</h2><p>${esc(SOURCE.label)}</p><p>${esc(SOURCE.note)}</p>${SOURCE.url?`<a href="${esc(SOURCE.url)}" target="_blank" rel="noreferrer">查看词表来源</a>`:''}${UNITS.flatMap(u=>u.sourceLinks||[]).map(source=>`<p><a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.lesson)} · 核对来源</a></p>`).join('')}<p class="muted">释义和例句用于辅助学习。教材词书的具体收录范围见上方说明。</p>`);
  if(action==='word-list') openDialog(`<span class="eyebrow">YOUR VOCABULARY</span><h2>${esc(unit().name)} · ${esc(unit().zh)}</h2><div class="word-list">${unitWords().map((w,i)=>`<button data-action="jump-word" data-index="${i}"><span><b>${esc(w.en)}</b><small>${esc(w.zh)}</small></span>${state.learned.includes(w.id)?icon('check'):icon('book')}</button>`).join('')}</div>`);
  if(action==='jump-word'){state.index[state.unit]=Number(button.dataset.index);save();render();}
  if(action==='start-match') startGame('match');
  if(action==='start-quiz') startGame('quiz');
  if(action==='end-game'){game=null;render();}
  if(action==='match')choosePair(button);
  if(action==='quiz-speak')speech(game.words[game.index].en);
  if(action==='quiz-answer'&&game&&!game.answer){const w=game.words[game.index];game.answer=button.dataset.id;if(game.answer===w.id){game.correct++;rewardOnce(state,`quiz:${todayKey()}:${w.id}`,2);}else if(!state.review.includes(w.id))state.review.push(w.id);if(!state.activity[todayKey()])state.activity[todayKey()]=[];save();render();}
  if(action==='quiz-next'&&game?.answer){game.index++;if(game.index<game.words.length)setQuizOptions();render();}
  if(action==='dictation-speak')speech(session.words[Number(button.dataset.index)].en);
  if(action==='cancel-dictation')openDialog('<h2>结束这次默写？</h2><p>这次尚未提交的答案将不计入默写记录。</p><div class="center-actions"><button class="button secondary" data-action="close-dialog">继续填写</button><button class="button primary" data-action="confirm-cancel">结束本次</button></div>');
  if(action==='confirm-cancel'){session=null;persistSession();render();}
  if(action==='confirm-submit')finishDictation();
  if(action==='new-dictation'){lastResult=null;render();}
  if(action==='retry-wrong'&&lastResult){startDictation(shuffle(lastResult.results.filter(r=>!r.correct).map(r=>WORDS.find(w=>w.id===r.id)).filter(Boolean)),lastResult.mode);}
  if(action==='last-result')showResult(currentHistory()[0]);
  if(action==='open-result')showResult(currentHistory()[Number(button.dataset.index)]);
  if(action==='result-speak')speech(button.dataset.word);
  if(action==='feed'&&state.treats>0){state.treats--;state.xp+=5;save();render();toast(`${state.petName}吃得很开心，成长值 +5！`);$('.large-pet-stage')?.classList.add('happy');}
  if(action==='rename-pet')openDialog(`<span class="eyebrow">A NAME JUST FOR YOU</span><h2>给伙伴起个名字</h2><form id="pet-name-form"><label class="name-label" for="pet-name">小伙伴的名字</label><input class="text-input" id="pet-name" name="petName" value="${esc(state.petName)}" maxlength="12" required><button class="button primary" type="submit">保存名字</button></form>`);
});
document.addEventListener('input',event=>{if(event.target.closest('#dictation-form')&&session){session.answers[event.target.name]=event.target.value;$('#answered-count').textContent=Object.values(session.answers).filter(a=>a.trim()).length;persistSession();}});
document.addEventListener('submit',event=>{
  if(event.target.id==='dictation-setup'){event.preventDefault();const data=new FormData(event.target);let pool=unitWords();if(data.get('scope')==='learned')pool=pool.filter(w=>state.learned.includes(w.id));if(data.get('scope')==='review')pool=pool.filter(w=>state.review.includes(w.id));if(!pool.length){toast('这个范围还没有单词，先学习新词或选择本单元精选吧。');return;}startDictation(shuffle(pool).slice(0,Number(data.get('count'))),data.get('mode'));}
  if(event.target.id==='dictation-form'){event.preventDefault();const empty=session.words.filter(w=>!session.answers[w.id]?.trim()).length;if(empty)openDialog(`<h2>还有 ${empty} 题未填写</h2><p>提交后，空题会记为未答对。你可以返回继续填写。</p><div class="center-actions"><button class="button secondary" data-action="close-dialog">继续填写</button><button class="button primary" data-action="confirm-submit">仍然提交</button></div>`);else finishDictation();}
  if(event.target.id==='pet-name-form'){event.preventDefault();const name=new FormData(event.target).get('petName').trim();if(!name){toast('请写下一个名字。');return;}state.petName=name.slice(0,12);save();render();toast('小伙伴有新名字啦！');}
});
window.addEventListener('storage',event=>{if(event.key!==STORAGE_KEY||!event.newValue)return;try{const incoming=JSON.parse(event.newValue);state=mergeSyncedState(state,incoming);loadBook(state.book);savedPetProgress=petProgress(state);if(incoming.version===1&&incoming.petGrowthVersion!==2)save();if(!$('#dialog')?.open&&!['INPUT','SELECT'].includes(document.activeElement?.tagName))render();}catch{}});
window.addEventListener('hashchange',()=>{if(location.hash==='#main'){$('#main').focus();return;}route=location.hash.slice(1)||'learn';render();window.scrollTo({top:0,behavior:'instant'});});
render();
// Persist the one-time growth migration before another session reads this record.
save();
const modelContext=document.modelContext;
if(modelContext?.registerTool){
  const lifecycle=new AbortController();
  for(const tool of [
    {name:'get_learning_progress',title:'查看词汇学习进度',description:'Read the local vocabulary progress, pet level and most recent dictation score.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({book:state.book,title:activeBook.title,learned:WORDS.filter(w=>state.learned.includes(w.id)).length,total:WORDS.length,review:WORDS.filter(w=>state.review.includes(w.id)).length,pet:petProgress(state),lastDictation:currentHistory()[0]?{correct:currentHistory()[0].correct,total:currentHistory()[0].total}:null})},
    {name:'open_learning_page',title:'打开学习页面',description:'Navigate to a study page without completing exercises or granting rewards.',inputSchema:{type:'object',properties:{page:{type:'string',enum:['learn','games','dictation','pet']}},required:['page'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!pageNames[input.page])throw new Error('Unknown page');route=input.page;location.hash=route;render();return{page:route,title:pageNames[route]};}}
  ]){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
