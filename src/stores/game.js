/**
 * Game Store - 游戏状态管理
 */

import { writable } from 'svelte/store';
import { getGame, checkWin } from './grid.js';

export const gameWon = writable(false);
export const gamePaused = writable(false);

/**
 * 检查游戏是否胜利
 */
export function checkGameWon() {
  if (checkWin()) {
    gameWon.set(true);
    return true;
  }
  return false;
}

/**
 * 暂停游戏
 */
export function pauseGame() {
  gamePaused.set(true);
}

/**
 * 恢复游戏
 */
export function resumeGame() {
  gamePaused.set(false);
}

/**
 * 重置游戏状态
 */
export function resetGameState() {
  gameWon.set(false);
  gamePaused.set(false);
}
