import { reactive } from 'vue';

export const confirmState = reactive({
  open: false,
  title: '请确认',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  danger: false,
  _resolve: null,
});

export function confirmDialog(options = {}) {
  return new Promise(resolve => {
    Object.assign(confirmState, {
      open: true,
      title: '请确认',
      message: '',
      confirmText: '确定',
      cancelText: '取消',
      danger: false,
      ...options,
      _resolve: resolve,
    });
  });
}

export function settleConfirm(value) {
  confirmState.open = false;
  const resolve = confirmState._resolve;
  confirmState._resolve = null;
  if (resolve) resolve(value);
}
