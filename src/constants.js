// 数独基本常量
export const SUDOKU_SIZE = 9;
export const BOX_SIZE = 3;

// 难度级别
export const DIFFICULTY_EASY = 'easy';
export const DIFFICULTY_MEDIUM = 'medium';
export const DIFFICULTY_HARD = 'hard';
export const DIFFICULTY_EXPERT = 'expert';
export const DIFFICULTY_CUSTOM = 'custom';

export const DIFFICULTIES = {
  [DIFFICULTY_EASY]: 'Easy',
  [DIFFICULTY_MEDIUM]: 'Medium',
  [DIFFICULTY_HARD]: 'Hard',
  [DIFFICULTY_EXPERT]: 'Expert',
};

// UI 相关常量
export const DROPDOWN_DURATION = 150;
export const MODAL_DURATION = 300;
export const MODAL_NONE = 'none';

// 提示相关
export const MAX_HINTS = 3;

// URL 相关
export const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

// 游戏结束庆祝
export const GAME_OVER_CELEBRATIONS = ['🎉', '🎊', '🏆', '⭐'];

// 候选数坐标（用于显示 3x3 小数字）
export const CANDIDATE_COORDS = {
  1: { x: 0, y: 0 },
  2: { x: 1, y: 0 },
  3: { x: 2, y: 0 },
  4: { x: 0, y: 1 },
  5: { x: 1, y: 1 },
  6: { x: 2, y: 1 },
  7: { x: 0, y: 2 },
  8: { x: 1, y: 2 },
  9: { x: 2, y: 2 },
};
