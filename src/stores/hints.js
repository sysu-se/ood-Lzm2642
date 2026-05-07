/**
 * Hints Store - 提示次数管理
 */

import { writable } from 'svelte/store';
import { MAX_HINTS } from '../constants.js';

export const hints = writable(MAX_HINTS);
export const usedHints = writable(0);
// hintMode: 'show' = 仅提示（显示候选）；'fill' = 直接填写（下一步）
export const hintMode = writable('fill');

export function toggleHintMode() {
  hintMode.update(m => (m === 'fill' ? 'show' : 'fill'));
}

/**
 * 使用一次提示
 * @returns {boolean} 是否成功使用
 */
export function useHint() {
  let success = false;
  hints.update(v => {
    if (v > 0) {
      v--;
      success = true;
    }
    return v;
  });
  
  if (success) {
    usedHints.update(v => v + 1);
  }
  
  return success;
}

/**
 * 重置提示次数
 */
export function resetHints() {
  hints.set(MAX_HINTS);
  usedHints.set(0);
}
