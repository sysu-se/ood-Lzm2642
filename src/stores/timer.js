/**
 * Timer Store - 计时器管理
 */

import { writable } from 'svelte/store';

export const timer = writable(0);

let timerInterval = null;

/**
 * 启动计时器
 */
export function startTimer() {
  if (timerInterval) return;
  
  timerInterval = setInterval(() => {
    timer.update(v => v + 1);
  }, 1000);
}

/**
 * 停止计时器
 */
export function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/**
 * 重置计时器
 */
export function resetTimer() {
  stopTimer();
  timer.set(0);
}

/**
 * 暂停计时器
 */
export function pauseTimer() {
  stopTimer();
}

/**
 * 恢复计时器
 */
export function resumeTimer() {
  startTimer();
}
