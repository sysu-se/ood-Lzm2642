/**
 * Candidates Store - 候选数管理（笔记模式）
 */

import { writable } from 'svelte/store';

// 候选数存储格式：{ "x,y": Set([1, 2, 3]) }
export const candidates = writable({});

/**
 * 添加候选数
 */
candidates.add = function(cursor, num) {
  const key = `${cursor.x},${cursor.y}`;
  candidates.update(map => {
    const newMap = { ...map };
    if (!newMap[key]) {
      newMap[key] = new Set();
    }
    newMap[key] = new Set([...newMap[key], num]);
    return newMap;
  });
};

/**
 * 移除候选数
 */
candidates.remove = function(cursor, num) {
  const key = `${cursor.x},${cursor.y}`;
  candidates.update(map => {
    const newMap = { ...map };
    if (newMap[key]) {
      const newSet = new Set([...newMap[key]]);
      newSet.delete(num);
      if (newSet.size === 0) {
        delete newMap[key];
      } else {
        newMap[key] = newSet;
      }
    }
    return newMap;
  });
};

/**
 * 清除某位置的所有候选数
 */
candidates.clear = function(cursor) {
  const key = `${cursor.x},${cursor.y}`;
  candidates.update(map => {
    const newMap = { ...map };
    delete newMap[key];
    return newMap;
  });
};

/**
 * 清除所有候选数
 */
candidates.clearAll = function() {
  candidates.update(() => ({}));
};
