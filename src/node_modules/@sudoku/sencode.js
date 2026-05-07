/**
 * Sencode - 数独编码/解码模块
 * 用于将数独转换为可分享的短字符串编码
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const BASE = CHARS.length;

/**
 * 将数字转换为 base62 字符
 */
function encodeNum(num) {
  let result = '';
  while (num > 0) {
    result = CHARS[num % BASE] + result;
    num = Math.floor(num / BASE);
  }
  return result.padStart(2, '0');
}

/**
 * 将 base62 字符转换为数字
 */
function decodeNum(str) {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    result = result * BASE + CHARS.indexOf(str[i]);
  }
  return result;
}

/**
 * 验证 sencode 是否有效
 * @param {string} sencode - 编码字符串
 * @returns {boolean}
 */
export function validateSencode(sencode) {
  if (!sencode || typeof sencode !== 'string') return false;
  if (sencode.length < 20) return false;
  return /^[\w]+$/.test(sencode);
}

/**
 * 将数独网格编码为 sencode 字符串
 * @param {number[][]} grid - 9x9 数独网格
 * @returns {string}
 */
export function encode(grid) {
  // 简化编码：只编码非零位置
  let result = '';
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      if (grid[y][x] !== 0) {
        const pos = y * 9 + x;
        result += encodeNum(pos) + encodeNum(grid[y][x]);
      }
    }
  }
  return result || 'empty';
}

/**
 * 将 sencode 字符串解码为数独网格
 * @param {string} sencode - 编码字符串
 * @returns {number[][]} - 9x9 数独网格
 */
export function decode(sencode) {
  const grid = Array(9).fill(null).map(() => Array(9).fill(0));
  
  if (sencode === 'empty') return grid;
  
  for (let i = 0; i < sencode.length; i += 4) {
    const posStr = sencode.slice(i, i + 2);
    const valStr = sencode.slice(i + 2, i + 4);
    
    const pos = decodeNum(posStr);
    const val = decodeNum(valStr);
    
    const y = Math.floor(pos / 9);
    const x = pos % 9;
    
    if (y < 9 && x < 9) {
      grid[y][x] = val;
    }
  }
  
  return grid;
}

/**
 * 根据难度生成数独谜题
 * @param {string} difficulty - 难度级别
 * @returns {number[][]} - 9x9 数独网格
 */
export function generatePuzzle(difficulty) {
  // 生成一个完整的数独解
  const solution = generateSolution();
  
  // 根据难度移除数字
  const removeCount = {
    'easy': 30,
    'medium': 40,
    'hard': 50,
    'expert': 55,
  }[difficulty] || 40;
  
  const puzzle = solution.map(row => [...row]);
  let removed = 0;
  
  while (removed < removeCount) {
    const y = Math.floor(Math.random() * 9);
    const x = Math.floor(Math.random() * 9);
    
    if (puzzle[y][x] !== 0) {
      puzzle[y][x] = 0;
      removed++;
    }
  }
  
  return puzzle;
}

/**
 * 生成一个完整的数独解
 */
function generateSolution() {
  const grid = Array(9).fill(null).map(() => Array(9).fill(0));
  fillGrid(grid);
  return grid;
}

/**
 * 填充数独网格
 */
function fillGrid(grid) {
  const empty = findEmpty(grid);
  if (!empty) return true;
  
  const [row, col] = empty;
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  
  for (const num of nums) {
    if (isValidPlacement(grid, row, col, num)) {
      grid[row][col] = num;
      if (fillGrid(grid)) return true;
      grid[row][col] = 0;
    }
  }
  
  return false;
}

/**
 * 找到空位置
 */
function findEmpty(grid) {
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 9; x++) {
      if (grid[y][x] === 0) return [y, x];
    }
  }
  return null;
}

/**
 * 检查数字是否可以放置在指定位置
 */
function isValidPlacement(grid, row, col, num) {
  // 检查行
  for (let x = 0; x < 9; x++) {
    if (grid[row][x] === num) return false;
  }
  
  // 检查列
  for (let y = 0; y < 9; y++) {
    if (grid[y][col] === num) return false;
  }
  
  // 检查 3x3 方块
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  
  for (let y = boxRow; y < boxRow + 3; y++) {
    for (let x = boxCol; x < boxCol + 3; x++) {
      if (grid[y][x] === num) return false;
    }
  }
  
  return true;
}

/**
 * 洗牌算法
 */
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
