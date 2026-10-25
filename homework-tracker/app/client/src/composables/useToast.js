import { reactive } from 'vue';

export const toastState = reactive({ items: [] });
let seq = 0;

export function toast(message, type = 'info', duration = 2600) {
  const text = String(message || '').trim();
  if (!text) return;
  const id = ++seq;
  toastState.items.push({ id, message: text, type });
  setTimeout(() => {
    const i = toastState.items.findIndex(t => t.id === id);
    if (i > -1) toastState.items.splice(i, 1);
  }, duration);
}

toast.success = (msg, ms) => toast(msg, 'success', ms);
toast.error = (msg, ms) => toast(msg, 'error', ms);
toast.warning = (msg, ms) => toast(msg, 'warning', ms);
