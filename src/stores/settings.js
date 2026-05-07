/**
 * Settings Store - 用户设置管理
 */

import { writable } from 'svelte/store';

const defaultSettings = {
  highlightCells: true,
  highlightSame: true,
  highlightConflicting: true,
  hintsLimited: true,
};

export const settings = writable(defaultSettings);

/**
 * 更新设置
 */
export function updateSettings(newSettings) {
  settings.update(s => ({ ...s, ...newSettings }));
}

/**
 * 重置设置
 */
export function resetSettings() {
  settings.set(defaultSettings);
}
