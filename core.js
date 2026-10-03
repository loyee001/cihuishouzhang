export const STORAGE_KEY = 'think1-journal-v1';
export const normalizeAnswer = value => String(value).normalize('NFKC').toLowerCase().trim().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
export function isCorrect(value, word) { return [word.en, ...(word.accept || [])].some(v => normalizeAnswer(v) === normalizeAnswer(value)); }
export function gradeAnswers(words, answers) {
  const results = words.map(w => ({ id: w.id, en: w.en, zh: w.zh, answer: String(answers[w.id] || ''), correct: isCorrect(answers[w.id] || '', w) }));
  return { results, correct: results.filter(r => r.correct).length, total: results.length };
}
export function todayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function streak(dates, now = new Date()) {
  const unique = new Set(dates), date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!unique.has(todayKey(date))) date.setDate(date.getDate() - 1);
  let count = 0;
  while (unique.has(todayKey(date))) { count++; date.setDate(date.getDate() - 1); }
  return count;
}
export function freshState() { return { version: 1, book: 'think1', bookUnits: {}, unit: 'u1', learned: [], review: [], activity: {}, xp: 0, petGrowthVersion: 2, petXpBonus: 0, treats: 0, petName: '小芽', history: [], totalDictations: 0, achievements: [], rewarded: [], index: {} }; }
function nonNegativeInteger(value) { return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0; }
function petThreshold(level) { return 15 * (level - 1) * (level + 2); }
export function trimHistory(records) {
  const counts = new Map();
  return records.filter(record => {
    const book = record.book || 'think1';
    const count = (counts.get(book) || 0) + 1;
    counts.set(book, count);
    return count <= 30;
  });
}
export function sanitizeState(raw) {
  const fresh = freshState();
  if (!raw || raw.version !== 1) return fresh;
  for (const key of ['learned', 'review', 'rewarded', 'achievements']) if (Array.isArray(raw[key])) fresh[key] = [...new Set(raw[key].filter(v => typeof v === 'string'))];
  for (const key of ['xp','treats']) if (Number.isFinite(raw[key])) fresh[key] = Math.max(0, Math.floor(raw[key]));
  if (raw.petGrowthVersion === 2) fresh.petXpBonus = nonNegativeInteger(raw.petXpBonus);
  else {
    const oldLevel = 1 + Math.floor(fresh.xp / 60);
    // Preserve the earned XP, old level and within-level progress during migration.
    fresh.petXpBonus = petThreshold(oldLevel) - 60 * (oldLevel - 1);
  }
  if (typeof raw.unit === 'string') fresh.unit = raw.unit;
  if (typeof raw.book === 'string') fresh.book = raw.book;
  if (raw.bookUnits && typeof raw.bookUnits === 'object' && !Array.isArray(raw.bookUnits)) fresh.bookUnits = Object.fromEntries(Object.entries(raw.bookUnits).filter(([id, unit]) => typeof unit === 'string' && !['__proto__','constructor','prototype'].includes(id)));
  if (typeof raw.petName === 'string' && raw.petName.trim()) fresh.petName = raw.petName.trim().slice(0, 12);
  if (Array.isArray(raw.history)) fresh.history = trimHistory(raw.history.filter(v => v && Array.isArray(v.results) && Number.isFinite(v.total) && Number.isFinite(v.correct)));
  fresh.totalDictations = Math.max(fresh.history.length, Number.isFinite(raw.totalDictations) ? Math.floor(raw.totalDictations) : 0);
  if (fresh.history.some(r => r.correct === r.total && r.total >= 5) && !fresh.achievements.includes('perfect')) fresh.achievements.push('perfect');
  if (raw.activity && typeof raw.activity === 'object' && !Array.isArray(raw.activity)) fresh.activity = raw.activity;
  if (raw.index && typeof raw.index === 'object' && !Array.isArray(raw.index)) fresh.index = raw.index;
  return fresh;
}
export function markLearned(state, wordId, day = todayKey()) {
  state.review = state.review.filter(id => id !== wordId);
  if (!Array.isArray(state.activity[day])) state.activity[day] = [];
  if (state.learned.includes(wordId)) return false;
  state.learned.push(wordId);
  const daily = Array.isArray(state.activity[day]) ? state.activity[day] : [];
  state.activity[day] = [...new Set([...daily, wordId])];
  state.xp += 10; state.treats += 1;
  return true;
}
export function rewardOnce(state, token, amount) {
  if (state.rewarded.includes(token)) return false;
  state.rewarded.push(token); state.xp += amount; return true;
}
export function petLevel(xp) {
  const total = nonNegativeInteger(xp);
  let level = Math.max(1, 1 + Math.floor((Math.sqrt(9 + (4 / 15) * total) - 3) / 2));
  // Correct floating-point rounding when XP is exactly at a level boundary.
  if (petThreshold(level) > total) level--;
  else if (petThreshold(level + 1) <= total) level++;
  return { level, current: total - petThreshold(level), target: 60 + 30 * (level - 1) };
}
export function petProgress(state) { return petLevel(nonNegativeInteger(state.xp) + nonNegativeInteger(state.petXpBonus)); }

// Word and unit IDs are globally unique; existing Think 1 IDs stay unchanged.
export function bookForRecord(record, books) {
  return books.find(book => book.id === record.book) || books.find(book => book.units.some(unit => unit.id === record.unit)) || books[0];
}
export function selectBook(state, bookId, books) {
  const next = books.find(book => book.id === bookId);
  if (!next) throw new Error('Unknown vocabulary book');
  const current = books.find(book => book.id === state.book);
  if (current?.units.some(unit => unit.id === state.unit)) state.bookUnits[current.id] = state.unit;
  state.book = next.id;
  state.unit = next.units.some(unit => unit.id === state.bookUnits[next.id]) ? state.bookUnits[next.id] : next.units[0].id;
  state.bookUnits[next.id] = state.unit;
  return next;
}
export function recordsForBook(state, bookId, books) { return state.history.filter(record => bookForRecord(record, books)?.id === bookId); }

export function mergeSyncedState(current, raw) {
  const next = sanitizeState(raw);
  // A still-open old tab must not recalculate an already granted migration bonus.
  if (current.petGrowthVersion === 2 && raw?.version === 1 && raw.petGrowthVersion !== 2) next.petXpBonus = nonNegativeInteger(current.petXpBonus);
  next.book = current.book;
  next.unit = current.unit;
  // Keep this tab on its current card while accepting other chapters' positions.
  next.index = { ...next.index, [current.unit]: current.index[current.unit] ?? 0 };
  next.bookUnits[current.book] = current.unit;
  return next;
}
