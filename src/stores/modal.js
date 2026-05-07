/**
 * Modal Store - 模态框管理
 */

import { writable } from 'svelte/store';
import { MODAL_NONE } from '../constants.js';

export const modal = writable(MODAL_NONE);
export const modalData = writable({});

let currentOnHide = null;

/**
 * 显示模态框
 */
modal.show = function(type, data = {}) {
  currentOnHide = data.onHide || null;
  modal.set(type);
  modalData.set(data);
};

/**
 * 隐藏模态框
 */
modal.hide = function() {
  modal.set(MODAL_NONE);
  modalData.set({});
  
  if (currentOnHide) {
    currentOnHide();
    currentOnHide = null;
  }
};

/**
 * 切换模态框
 */
modal.toggle = function(type, data = {}) {
  modal.update(current => {
    if (current === type) {
      if (currentOnHide) {
        currentOnHide();
        currentOnHide = null;
      }
      modalData.set({});
      return MODAL_NONE;
    } else {
      currentOnHide = data.onHide || null;
      modalData.set(data);
      return type;
    }
  });
};
