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
