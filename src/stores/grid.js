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

// 探索模式状态提示
export const exploreConflict = writable(false);   // 探索中是否出现冲突
export const exploreTriedPath = writable(false);   // 探索中是否匹配已失败路径
export const exploreMessage = writable('');        // 探索模式提示消息

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
 * 候选提示：对光标所在格显示候选数集合（不填入）
 * @returns {number[]|false} 候选列表，或 false 表示无法提示
 */
export function showCandidatesHint(cursor) {
  if (!game) return false;

  const currentGrid = game.getSudoku().getGrid();
  if (currentGrid[cursor.y][cursor.x] !== 0) return false;

  const cand = getCandidatesAt(cursor);
  if (!cand || cand.length === 0) return false;

  // 一次性更新 candidates store，避免多次触发重渲染
  const key = `${cursor.x},${cursor.y}`;
  candidates.update(map => {
    const newMap = { ...map };
    newMap[key] = new Set(cand);
    return newMap;
  });
  return cand;
}

/**
 * 下一步提示：找到可推断的推定数并填入
 * 优先检查光标格是否是唯一候选，否则搜索全盘
 * @returns {{ row, col, value }|false} 填入的位置和值，或 false
 */
export function fillNextStepHint(cursor) {
  if (!game) return false;

  const sudoku = game.getSudoku();
  const currentGrid = sudoku.getGrid();
  const isExploring = get(inExplore);

  // 1) 优先检查光标所在格是否为唯一候选
  if (cursor && cursor.y != null && cursor.x != null && currentGrid[cursor.y][cursor.x] === 0) {
    const cursorCand = sudoku.getCandidates(cursor.y, cursor.x);
    if (cursorCand.length === 1) {
      const value = cursorCand[0];
      if (isExploring) {
        const res = game.exploreGuess({ row: cursor.y, col: cursor.x, value });
        if (res.conflict) {
          exploreConflict.set(true);
          exploreMessage.set('冲突！此路径不可行，请回退或放弃探索');
        } else if (res.triedPath) {
          exploreTriedPath.set(true);
          exploreMessage.set('此局面与之前失败的探索路径相同，建议回退');
        } else {
          exploreMessage.set('探索中... 继续尝试或提交/放弃');
        }
      } else {
        game.guess({ row: cursor.y, col: cursor.x, value });
      }
      const newGrid = game.getSudoku().getGrid();
      userGrid.set(newGrid);
      invalidCells.set(game.getSudoku().getInvalidCells());
      return { row: cursor.y, col: cursor.x, value };
    }
  }

  // 2) 否则搜索全盘找到下一个推定步
  const next = sudoku.findNextStep();
  if (next) {
    if (isExploring) {
      const res = game.exploreGuess({ row: next.row, col: next.col, value: next.value });
      if (res.conflict) {
        exploreConflict.set(true);
        exploreMessage.set('冲突！此路径不可行，请回退或放弃探索');
      } else if (res.triedPath) {
        exploreTriedPath.set(true);
        exploreMessage.set('此局面与之前失败的探索路径相同，建议回退');
      } else {
        exploreMessage.set('探索中... 继续尝试或提交/放弃');
      }
    } else {
      game.guess({ row: next.row, col: next.col, value: next.value });
    }
    const newGrid = game.getSudoku().getGrid();
    userGrid.set(newGrid);
    invalidCells.set(game.getSudoku().getInvalidCells());
    return next;
  }

  // 3) 没有唯一候选，降级为显示光标格候选（如果有的话）
  if (cursor && cursor.y != null && cursor.x != null && currentGrid[cursor.y][cursor.x] === 0) {
    const cand = getCandidatesAt(cursor);
    if (cand && cand.length > 0) {
      const key = `${cursor.x},${cursor.y}`;
      candidates.update(map => {
        const newMap = { ...map };
        newMap[key] = new Set(cand);
        return newMap;
      });
      return { row: cursor.y, col: cursor.x, candidates: cand };
    }
  }

  return false;
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
  if (ok) {
    inExplore.set(true);
    exploreConflict.set(false);
    exploreTriedPath.set(false);
    exploreMessage.set('探索模式：尝试填写数字，冲突时可回退');
  }
  return ok;
}

export function exploreGuess(cursor, value) {
  if (!game) return { success: false, conflict: false, triedPath: false };
  const res = game.exploreGuess({ row: cursor.y, col: cursor.x, value });
  userGrid.set(game.getSudoku().getGrid());
  invalidCells.set(game.getSudoku().getInvalidCells());

  // 更新探索状态提示
  if (res.conflict) {
    exploreConflict.set(true);
    exploreMessage.set('冲突！此路径不可行，请回退或放弃探索');
  } else if (res.triedPath) {
    exploreTriedPath.set(true);
    exploreConflict.set(false);
    exploreMessage.set('此局面与之前失败的探索路径相同，建议回退');
  } else {
    exploreConflict.set(false);
    exploreTriedPath.set(false);
    if (res.success) {
      exploreMessage.set('探索中... 继续尝试或提交/放弃');
    }
  }

  return res;
}

export function exploreUndo() {
  if (!game) return false;
  const ok = game.exploreUndo();
  if (ok) {
    userGrid.set(game.getSudoku().getGrid());
    invalidCells.set(game.getSudoku().getInvalidCells());
    // 撤销后重新检查冲突和失败路径状态
    exploreConflict.set(game.hasExploreConflict());
    exploreTriedPath.set(game.isExploreTriedPath());
    if (!game.hasExploreConflict() && !game.isExploreTriedPath()) {
      exploreMessage.set('已回退一步，继续探索');
    }
  }
  return ok;
}

export function exploreResetToStart() {
  if (!game) return false;
  const ok = game.exploreResetToStart();
  if (ok) {
    userGrid.set(game.getSudoku().getGrid());
    invalidCells.set(game.getSudoku().getInvalidCells());
    exploreConflict.set(false);
    exploreTriedPath.set(false);
    exploreMessage.set('已回到探索起点，选择其他候选值继续');
  }
  return ok;
}

export function commitExplore() {
  if (!game) return false;
  const ok = game.commitExplore();
  if (ok) {
    userGrid.set(game.getSudoku().getGrid());
    invalidCells.set(game.getSudoku().getInvalidCells());
    inExplore.set(false);
    exploreConflict.set(false);
    exploreTriedPath.set(false);
    exploreMessage.set('');
  }
  return ok;
}

export function abortExplore() {
  if (!game) return false;
  const ok = game.abortExplore();
  if (ok) {
    userGrid.set(game.getSudoku().getGrid());
    invalidCells.set(game.getSudoku().getInvalidCells());
    inExplore.set(false);
    exploreConflict.set(false);
    exploreTriedPath.set(false);
    exploreMessage.set('');
  }
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
