import { WORDS, UNITS, SOURCE } from './data.js';
import { ADDITIONAL_BOOKS } from './additional-books.js';
import { TEXTBOOKS } from './textbooks.js';

export const BOOKS = [{
  id: 'think1', title: 'Think 1', subtitle: '第二版 · Level 1',
  description: '从爱好与日常活动开始，搭配课堂学习。',
  scope: 'Unit 1 样章精选', tone: 'lilac',
  source: SOURCE, units: UNITS, words: WORDS
}, ...TEXTBOOKS, ...ADDITIONAL_BOOKS];
export const ALL_WORDS = BOOKS.flatMap(book => book.words);
export const ALL_UNITS = BOOKS.flatMap(book => book.units);
