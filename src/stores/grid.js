/**
 * Grid Store - 数独网格状态管理
 * 
 * 这个 store 内部持有 Game 实例，对外暴露响应式状态
 */

import { writable, get, derived } from 'svelte/store';
import { createGame, createSudoku } from '../domain/index.js';
import { generatePuzzle, decode } from '../sencode.js';
import { candidates } from './candidates.js';

// 内部状态
let game = null;
let initialGrid = null;

// 创建空的 9x9 网格
function createEmptyGrid() {
  return Array(9).fill(null).map(() => Array(9).fill(0));
}

// 创建可写 store（初始化为空的 9x9 网格）
export const grid = writable(createEmptyGrid());
export const userGrid = writable(createEmptyGrid());
export const invalidCells = writable([]);
export const inExplore = writable(false);

// 响应式计算 canUndo / canRedo
// 使用 derived store 来确保响应式更新
export const canUndoStore = derived(userGrid, () => {
  return game ? game.canUndo() : false;
});

export const canRedoStore = derived(userGrid, () => {
  return game ? game.canRedo() : false;
});

/**
 * 初始化游戏
 */
export function initGame(puzzle) {
  const sudoku = createSudoku(puzzle);
  game = createGame({ sudoku });
  initialGrid = puzzle;
  
  // 更新 store
  grid.set(puzzle);
  userGrid.set(sudoku.getGrid());
  invalidCells.set([]);
}

/**
 * 开始新游戏（根据难度）
 */
export function startNewGame(difficulty) {
  const puzzle = generatePuzzle(difficulty);
  initGame(puzzle);
}

/**
 * 开始自定义游戏（根据 sencode）
 */
export function startCustomGame(sencode) {
  const puzzle = decode(sencode);
  initGame(puzzle);
}

/**
 * 填入数字
 */
export function setGuess(cursor, value) {
  if (!game) return;
  
  // 检查是否是初始数字
  if (initialGrid && initialGrid[cursor.y][cursor.x] !== 0) {
    return; // 不允许修改初始数字
  }
  
  // 调用领域对象（如果正在探索则使用 exploreGuess）
  if (get(inExplore)) {
    const res = exploreGuess(cursor, value);
    // exploreGuess already updates stores
    return res.success;
  }

  game.guess({ row: cursor.y, col: cursor.x, value });

  // 更新响应式状态
  const newGrid = game.getSudoku().getGrid();
  userGrid.set(newGrid);
  invalidCells.set(game.getSudoku().getInvalidCells());
}

/**
 * 应用提示（自动填入正确答案）
 */
export function applyHint(cursor) {
  if (!game) return false;
  
  const currentGrid = game.getSudoku().getGrid();
  const currentValue = currentGrid[cursor.y][cursor.x];
  
  if (currentValue !== 0) return false;
  // 1) 如果领域对象能直接推断出唯一下一步，则直接填写该步骤
  const next = getNextStepHint();
  if (next) {
    game.guess({ row: next.row, col: next.col, value: next.value });
    const newGrid = game.getSudoku().getGrid();
    userGrid.set(newGrid);
    invalidCells.set(game.getSudoku().getInvalidCells());
    return true;
  }

  // 2) 否则通过领域对象获取该格的候选集合，并在候选 store 中显示（仅提示，不填入）
  const cand = getCandidatesAt(cursor);
  if (!cand || cand.length === 0) return false;

  // 将候选列表写入候选 store（覆盖当前单元格）
  candidates.clear(cursor);
  for (const v of cand) candidates.add(cursor, v);
  return true;
}

/**
 * 获取指定格子的候选列表（只返回，不修改）
 */
export function getCandidatesAt(cursor) {
  if (!game) return [];
  return game.getSudoku().getCandidates(cursor.y, cursor.x);
}

/**
 * 获取下一步提示（唯一候选）
 */
export function getNextStepHint() {
  if (!game) return null;
  return game.getSudoku().findNextStep();
}

/** Explore mode API wrappers **/
export function enterExplore() {
  if (!game) return false;
  const ok = game.enterExplore();
  userGrid.set(game.getSudoku().getGrid());
  invalidCells.set(game.getSudoku().getInvalidCells());
  if (ok) inExplore.set(true);
  return ok;
}

export function exploreGuess(cursor, value) {
  if (!game) return { success: false, conflict: false };
  const res = game.exploreGuess({ row: cursor.y, col: cursor.x, value });
  userGrid.set(game.getSudoku().getGrid());
  invalidCells.set(game.getSudoku().getInvalidCells());
  return res;
}

export function exploreUndo() {
  if (!game) return false;
  const ok = game.exploreUndo();
  userGrid.set(game.getSudoku().getGrid());
  invalidCells.set(game.getSudoku().getInvalidCells());
  return ok;
}

export function exploreResetToStart() {
  if (!game) return false;
  const ok = game.exploreResetToStart();
  userGrid.set(game.getSudoku().getGrid());
  invalidCells.set(game.getSudoku().getInvalidCells());
  return ok;
}

export function commitExplore() {
  if (!game) return false;
  const ok = game.commitExplore();
  userGrid.set(game.getSudoku().getGrid());
  invalidCells.set(game.getSudoku().getInvalidCells());
  if (ok) inExplore.set(false);
  return ok;
}

export function abortExplore() {
  if (!game) return false;
  const ok = game.abortExplore();
  userGrid.set(game.getSudoku().getGrid());
  invalidCells.set(game.getSudoku().getInvalidCells());
  if (ok) inExplore.set(false);
  return ok;
}

export function isInExplore() {
  if (!game) return false;
  return game.isInExplore();
}

/**
 * 获取当前 Game 实例
 */
export function getGame() {
  return game;
}

/**
 * 检查是否胜利
 */
export function checkWin() {
  if (!game) return false;
  return game.getSudoku().isWon();
}
