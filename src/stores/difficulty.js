/**
 * Difficulty Store - 难度级别管理
 */

import { writable } from 'svelte/store';
import { DIFFICULTY_EASY } from '../constants.js';

export const difficulty = writable(DIFFICULTY_EASY);

/**
 * 设置难度
 */
export function setDifficulty(value) {
  difficulty.set(value);
}
