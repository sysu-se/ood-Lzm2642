/**
 * Game 控制模块
 * 
 * 这是领域对象与 UI 之间的桥梁
 * 提供游戏控制接口，内部协调各个 stores 和领域对象
 */

import {
  startNewGame,
  startCustomGame,
  setGuess,
  showCandidatesHint,
  fillNextStepHint,
  getGame,
  checkWin,
  userGrid,
  invalidCells,
} from './stores/grid.js';

import {
  checkGameWon,
  pauseGame,
  resumeGame,
  resetGameState,
} from './stores/game.js';

import {
  startTimer,
  stopTimer,
  resetTimer,
  pauseTimer,
  resumeTimer,
} from './stores/timer.js';

import { resetHints, useHint, hintMode } from './stores/hints.js';
import { cursor } from './stores/cursor.js';
import { candidates } from './stores/candidates.js';
import { setDifficulty } from './stores/difficulty.js';
import { get } from 'svelte/store';

/**
 * 开始新游戏
 */
export function startNew(difficultyValue) {
  // 重置所有状态
  resetTimer();
  resetHints();
  resetGameState();
  candidates.clearAll();
  cursor.reset();
  
  // 设置难度
  setDifficulty(difficultyValue);
  
  // 初始化游戏
  startNewGame(difficultyValue);
  
  // 启动计时器
  startTimer();
}

/**
 * 开始自定义游戏
 */
export function startCustom(sencode) {
  // 重置所有状态
  resetTimer();
  resetHints();
  resetGameState();
  candidates.clearAll();
  cursor.reset();
  
  // 设置为自定义难度
  setDifficulty('custom');
  
  // 初始化游戏
  startCustomGame(sencode);
  
  // 启动计时器
  startTimer();
}

/**
 * 执行填数操作
 */
export function guess(move) {
  setGuess({ x: move.col, y: move.row }, move.value);
  
  // 检查是否胜利
  if (checkGameWon()) {
    stopTimer();
  }
}

/**
 * 撤销操作
 */
export function undo() {
  const game = getGame();
  if (game && game.canUndo()) {
    game.undo();
    
    // 更新 UI 状态
    userGrid.set(game.getSudoku().getGrid());
    invalidCells.set(game.getSudoku().getInvalidCells());
  }
}

/**
 * 重做操作
 */
export function redo() {
  const game = getGame();
  if (game && game.canRedo()) {
    game.redo();
    
    // 更新 UI 状态
    userGrid.set(game.getSudoku().getGrid());
    invalidCells.set(game.getSudoku().getInvalidCells());
  }
}

/**
 * 检查是否可以撤销
 */
export function canUndo() {
  const game = getGame();
  return game ? game.canUndo() : false;
}

/**
 * 检查是否可以重做
 */
export function canRedo() {
  const game = getGame();
  return game ? game.canRedo() : false;
}

/**
 * 暂停游戏
 */
export function pause() {
  pauseGame();
  pauseTimer();
}

/**
 * 恢复游戏
 */
export function resume() {
  resumeGame();
  resumeTimer();
}

/**
 * 使用提示
 */
export function hint() {
  const currentCursor = get(cursor);
  const mode = get(hintMode);
  
  if (mode === 'show') {
    if (currentCursor.x !== null && currentCursor.y !== null) {
      const result = showCandidatesHint(currentCursor);
      if (result) useHint();
    }
  } else {
    const cursorArg = (currentCursor.x !== null && currentCursor.y !== null) ? currentCursor : null;
    const result = fillNextStepHint(cursorArg);
    if (result) useHint();
  }
}

// 默认导出所有函数
export default {
  startNew,
  startCustom,
  guess,
  undo,
  redo,
  canUndo,
  canRedo,
  pause,
  resume,
  hint,
  pauseGame: pause,
  resumeGame: resume,
};

// 兼容：有些组件以命名导入方式使用 `pauseGame` / `resumeGame`
export { pause as pauseGame, resume as resumeGame };
