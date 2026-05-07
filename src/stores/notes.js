/**
 * Notes Store - 笔记模式开关
 */

import { writable } from 'svelte/store';

export const notes = writable(false);

/**
 * 切换笔记模式
 */
notes.toggle = function() {
  notes.update(v => !v);
};

/**
 * 设置笔记模式
 */
notes.setMode = function(value) {
  notes.update(() => value);
};
