/**
 * Game - 游戏领域对象
 * 
 * 职责：
 * - 持有当前 Sudoku 实例
 * - 管理历史记录（用于 Undo/Redo）
 * - 提供 undo() / redo() 接口
 * - 对外提供面向 UI 的游戏操作入口
 */

import { createSudokuFromJSON } from './Sudoku.js';

/**
 * 创建 Game 对象
 * @param {{ sudoku: Sudoku }} params
 * @returns {Game}
 */
export function createGame({ sudoku }) {
  // 当前数独实例
  let currentSudoku = sudoku;
  
  // 历史记录（存储 Sudoku 的快照）
  let history = [];
  let historyIndex = -1;
  
  // 探索模式会话（null 表示非探索）
  // 格式: { baseHistoryIndex, startSudoku, branchHistory: [], branchIndex, triedPaths: Set }
  let exploreSession = null;
  
  // 保存初始状态
  history.push(sudoku.clone());
  historyIndex = 0;
  
  return {
    /**
     * 获取当前 Sudoku 实例
     */
    getSudoku() {
      return currentSudoku;
    },
    
    /**
     * 执行填数操作并记录历史
     * @param {{ row: number, col: number, value: number }} move
     * @returns {boolean} 是否成功
     */
    guess(move) {
      // 执行填数
      const success = currentSudoku.guess(move);
      
      if (success) {
        // 清除 redo 历史（新操作会使 redo 失效）
        history = history.slice(0, historyIndex + 1);
        
        // 保存新状态
        history.push(currentSudoku.clone());
        historyIndex++;
      }
      
      return success;
    },

    /**
     * 是否处于探索模式
     */
    isInExplore() {
      return exploreSession !== null;
    },

    /**
     * 进入探索模式：以当前历史索引为起点，创建独立的分支历史
     */
    enterExplore() {
      if (exploreSession) return false;
      const base = historyIndex;
      const start = history[base].clone();
      exploreSession = {
        baseHistoryIndex: base,
        startSudoku: start,
        branchHistory: [start.clone()],
        branchIndex: 0,
        triedPaths: new Set(),
      };
      currentSudoku = start.clone();
      return true;
    },

    /**
     * 在探索模式中执行猜测（不会影响主历史）
     * 返回 { success: boolean, conflict: boolean, triedPath: boolean }
     */
    exploreGuess(move) {
      if (!exploreSession) {
        // 非探索，直接沿用普通 guess
        return { success: this.guess(move), conflict: false, triedPath: false };
      }

      const success = currentSudoku.guess(move);
      if (!success) return { success: false, conflict: false, triedPath: false };

      // 保存分支快照
      exploreSession.branchHistory = exploreSession.branchHistory.slice(0, exploreSession.branchIndex + 1);
      exploreSession.branchHistory.push(currentSudoku.clone());
      exploreSession.branchIndex++;

      // 检查冲突
      const conflicts = currentSudoku.getInvalidCells();
      if (conflicts.length > 0) {
        const currentKey = JSON.stringify(currentSudoku.toJSON());
        const wasTried = exploreSession.triedPaths.has(currentKey);
        // 记录失败路径的序列化表示，便于记忆
        exploreSession.triedPaths.add(currentKey);
        return { success: true, conflict: true, triedPath: wasTried };
      }

      // 检查当前局面是否匹配之前失败的探索路径
      const currentKey = JSON.stringify(currentSudoku.toJSON());
      const isTriedPath = exploreSession.triedPaths.has(currentKey);

      return { success: true, conflict: false, triedPath: isTriedPath };
    },

    /**
     * 检查当前探索局面是否匹配已失败的路径
     * @returns {boolean}
     */
    isExploreTriedPath() {
      if (!exploreSession) return false;
      const currentKey = JSON.stringify(currentSudoku.toJSON());
      return exploreSession.triedPaths.has(currentKey);
    },

    /**
     * 检查当前探索局面是否有冲突
     * @returns {boolean}
     */
    hasExploreConflict() {
      if (!exploreSession) return false;
      return currentSudoku.getInvalidCells().length > 0;
    },

    /**
     * 探索模式中撤销一步
     */
    exploreUndo() {
      if (!exploreSession) return false;
      if (exploreSession.branchIndex === 0) return false;
      exploreSession.branchIndex--;
      currentSudoku = exploreSession.branchHistory[exploreSession.branchIndex].clone();
      return true;
    },

    /**
     * 重置回探索起点
     */
    exploreResetToStart() {
      if (!exploreSession) return false;
      exploreSession.branchIndex = 0;
      currentSudoku = exploreSession.branchHistory[0].clone();
      return true;
    },

    /**
     * 提交探索分支：将探索分支的变更合并回主历史并退出探索
     */
    commitExplore() {
      if (!exploreSession) return false;
      // 将主历史截断到 base
      history = history.slice(0, exploreSession.baseHistoryIndex + 1);
      // 合并分支快照（跳过第 0 项，因为它就是 base）
      for (let i = 1; i <= exploreSession.branchIndex; i++) {
        history.push(exploreSession.branchHistory[i].clone());
      }
      historyIndex = history.length - 1;
      currentSudoku = history[historyIndex].clone();
      exploreSession = null;
      return true;
    },

    /**
     * 放弃探索：回到探索进入前的主历史状态
     */
    abortExplore() {
      if (!exploreSession) return false;
      const base = exploreSession.baseHistoryIndex;
      historyIndex = base;
      currentSudoku = history[historyIndex].clone();
      exploreSession = null;
      return true;
    },
    
    /**
     * 撤销上一步操作
     * @returns {boolean} 是否成功撤销
     */
    undo() {
      if (!this.canUndo()) {
        return false;
      }
      
      historyIndex--;
      currentSudoku = history[historyIndex].clone();
      return true;
    },
    
    /**
     * 重做下一步操作
     * @returns {boolean} 是否成功重做
     */
    redo() {
      if (!this.canRedo()) {
        return false;
      }
      
      historyIndex++;
      currentSudoku = history[historyIndex].clone();
      return true;
    },
    
    /**
     * 是否可以撤销
     */
    canUndo() {
      return historyIndex > 0;
    },
    
    /**
     * 是否可以重做
     */
    canRedo() {
      return historyIndex < history.length - 1;
    },
    
    /**
     * 获取历史记录长度
     */
    getHistoryLength() {
      return history.length;
    },
    
    /**
     * 获取当前历史索引
     */
    getHistoryIndex() {
      return historyIndex;
    },
    
    /**
     * 序列化为 JSON
     */
    toJSON() {
      return {
        sudoku: currentSudoku.toJSON(),
        history: history.map(s => s.toJSON()),
        historyIndex,
      };
    },
    
    /**
     * 返回可读字符串表示
     */
    toString() {
      return `Game(history: ${history.length} steps, at index ${historyIndex})\n${currentSudoku.toString()}`;
    },
  };
}

/**
 * 从 JSON 恢复 Game 对象
 * @param {{ sudoku: object, history: object[], historyIndex: number }} json
 * @returns {Game}
 */
export function createGameFromJSON(json) {
  if (!json || !json.sudoku || !json.history) {
    throw new Error('Invalid JSON: missing required fields');
  }
  
  // 创建 Game 实例
  const sudoku = createSudokuFromJSON(json.sudoku);
  const game = createGame({ sudoku });
  
  // 恢复历史记录（通过内部访问）
  // 注意：这里需要直接修改内部状态
  // 由于我们使用闭包，这里需要重新创建
  
  // 简化处理：重新创建带有完整历史的 Game
  return createGameWithHistory(json.history, json.historyIndex);
}

/**
 * 创建带有完整历史的 Game（辅助函数）
 */
function createGameWithHistory(historyData, historyIndex) {
  // 重建历史
  const history = historyData.map(h => createSudokuFromJSON(h));
  
  // 创建 Game
  const initialSudoku = history[0];
  const game = createGame({ sudoku: initialSudoku });
  
  // 使用新方法恢复状态
  return {
    ...game,
    getSudoku() {
      return history[historyIndex];
    },
    getHistoryLength() {
      return history.length;
    },
    getHistoryIndex() {
      return historyIndex;
    },
  };
}
