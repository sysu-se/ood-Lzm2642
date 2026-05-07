/**
 * Sudoku - 数独领域对象
 * 
 * 职责：
 * - 持有当前 grid 数据
 * - 提供 guess() 接口进行填数
 * - 提供校验能力
 * - 提供外表化能力（toString/toJSON）
 * - 支持克隆用于历史快照
 */

const SUDOKU_SIZE = 9;

/**
 * 深拷贝二维数组
 */
function deepCloneGrid(grid) {
  return grid.map(row => [...row]);
}

/**
 * 验证网格格式是否正确
 */
function validateGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== SUDOKU_SIZE) {
    throw new Error('Invalid grid: must be 9x9 array');
  }
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== SUDOKU_SIZE) {
      throw new Error('Invalid grid: must be 9x9 array');
    }
    for (const cell of row) {
      if (typeof cell !== 'number' || cell < 0 || cell > 9) {
        throw new Error('Invalid grid: cells must be numbers 0-9');
      }
    }
  }
}

/**
 * 创建 Sudoku 对象
 * @param {number[][]} puzzle - 初始数独网格（0 表示空格）
 * @returns {Sudoku}
 */
export function createSudoku(puzzle) {
  // 防御性拷贝输入
  const initialGrid = deepCloneGrid(puzzle);
  validateGrid(initialGrid);
  
  // 当前状态网格
  let currentGrid = deepCloneGrid(initialGrid);
  
  return {
    /**
     * 获取当前网格状态
     * 返回网格的拷贝，防止外部直接修改
     */
    getGrid() {
      return deepCloneGrid(currentGrid);
    },
    
    /**
     * 获取初始网格（不可变的原始谜题）
     */
    getInitialGrid() {
      return deepCloneGrid(initialGrid);
    },
    
    /**
     * 在指定位置填入数字
     * @param {{ row: number, col: number, value: number }} move
     * @returns {boolean} 是否成功填入
     */
    guess({ row, col, value }) {
      // 边界检查
      if (row < 0 || row >= SUDOKU_SIZE || col < 0 || col >= SUDOKU_SIZE) {
        return false;
      }
      
      // 值检查
      if (value < 0 || value > 9) {
        return false;
      }
      
      // 不允许修改初始数字
      if (initialGrid[row][col] !== 0) {
        return false;
      }
      
      currentGrid[row][col] = value;
      return true;
    },
    
    /**
     * 检查指定位置是否是初始数字（不可修改）
     */
    isInitial(row, col) {
      return initialGrid[row][col] !== 0;
    },
    
    /**
     * 检查指定位置的值是否正确（与解答比较）
     * 注意：这里简化实现，只检查冲突
     */
    isValid(row, col) {
      const value = currentGrid[row][col];
      if (value === 0) return true;
      
      // 检查行冲突
      for (let x = 0; x < SUDOKU_SIZE; x++) {
        if (x !== col && currentGrid[row][x] === value) {
          return false;
        }
      }
      
      // 检查列冲突
      for (let y = 0; y < SUDOKU_SIZE; y++) {
        if (y !== row && currentGrid[y][col] === value) {
          return false;
        }
      }
      
      // 检查 3x3 方块冲突
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      
      for (let y = boxRow; y < boxRow + 3; y++) {
        for (let x = boxCol; x < boxCol + 3; x++) {
          if (y !== row && x !== col && currentGrid[y][x] === value) {
            return false;
          }
        }
      }
      
      return true;
    },
    
    /**
     * 获取所有冲突单元格
     * @returns {string[]} 冲突单元格坐标数组，格式为 "x,y"
     */
    getInvalidCells() {
      const invalid = [];
      
      for (let y = 0; y < SUDOKU_SIZE; y++) {
        for (let x = 0; x < SUDOKU_SIZE; x++) {
          if (currentGrid[y][x] !== 0 && !this.isValid(y, x)) {
            invalid.push(`${x},${y}`);
          }
        }
      }
      
      return invalid;
    },
    
    /**
     * 检查是否完成且正确
     */
    isWon() {
      // 检查是否填满
      for (let y = 0; y < SUDOKU_SIZE; y++) {
        for (let x = 0; x < SUDOKU_SIZE; x++) {
          if (currentGrid[y][x] === 0) {
            return false;
          }
        }
      }
      
      // 检查是否有冲突
      return this.getInvalidCells().length === 0;
    },
    
    /**
     * 克隆当前 Sudoku 状态
     */
    clone() {
      return createSudoku(currentGrid);
    },
    
    /**
     * 序列化为 JSON
     */
    toJSON() {
      return {
        initialGrid: deepCloneGrid(initialGrid),
        currentGrid: deepCloneGrid(currentGrid),
      };
    },
    
    /**
     * 返回可读字符串表示
     */
    toString() {
      let result = 'Sudoku:\n';
      for (let y = 0; y < SUDOKU_SIZE; y++) {
        result += currentGrid[y].map(n => n || '.').join(' ');
        if (y % 3 === 2 && y < 8) result += '\n-----------';
        result += '\n';
      }
      return result;
    },
  };
}

/**
 * 从 JSON 恢复 Sudoku 对象
 * @param {{ initialGrid: number[][], currentGrid: number[][] }} json
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  if (!json || !json.initialGrid || !json.currentGrid) {
    throw new Error('Invalid JSON: missing initialGrid or currentGrid');
  }
  
  const sudoku = createSudoku(json.initialGrid);
  
  // 恢复当前状态
  for (let y = 0; y < SUDOKU_SIZE; y++) {
    for (let x = 0; x < SUDOKU_SIZE; x++) {
      if (json.currentGrid[y][x] !== json.initialGrid[y][x]) {
        sudoku.guess({ row: y, col: x, value: json.currentGrid[y][x] });
      }
    }
  }
  
  return sudoku;
}
