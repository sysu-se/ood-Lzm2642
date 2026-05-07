/**
 * Cursor Store - 当前选中位置管理
 */

import { writable } from 'svelte/store';

export const cursor = writable({ x: null, y: null });

/**
 * 移动光标
 */
cursor.move = function(dx, dy) {
  cursor.update(pos => {
    if (pos.x === null || pos.y === null) {
      return { x: 0, y: 0 };
    }
    
    let newX = pos.x + dx;
    let newY = pos.y + dy;
    
    // 边界检查
    if (newX < 0) newX = 8;
    if (newX > 8) newX = 0;
    if (newY < 0) newY = 8;
    if (newY > 8) newY = 0;
    
    return { x: newX, y: newY };
  });
};

/**
 * 设置光标位置
 */
cursor.set = function(pos) {
  cursor.update(() => pos);
};

/**
 * 重置光标
 */
cursor.reset = function() {
  cursor.update(() => ({ x: null, y: null }));
};
