/**
 * Keyboard Store - 键盘状态管理
 */

import { writable } from 'svelte/store';
import { get } from 'svelte/store';
import { gamePaused } from './game.js';

export const keyboardDisabled = writable(false);

/**
 * 更新键盘禁用状态
 */
export function updateKeyboardDisabled(disabled) {
  keyboardDisabled.set(disabled);
}
