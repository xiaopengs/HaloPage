<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: String, default: '440px' },
  closeOnMask: { type: Boolean, default: true },
});
const emit = defineEmits(['update:modelValue']);
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue';

const panel = ref(null);
const close = () => emit('update:modelValue', false);

function onKey(e) {
  if (e.key === 'Escape' && panel.value) close();
}

watch(
  () => panel.value !== null,
  async open => {
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      await nextTick();
      panel.value?.querySelector('input, textarea, select, button')?.focus?.();
    }
  }
);

onMounted(() => document.addEventListener('keydown', onKey));
onUnmounted(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-mask" @mousedown.self="closeOnMask && close()">
      <div ref="panel" class="modal-panel" role="dialog" aria-modal="true" :aria-label="title" :style="{ maxWidth: width }">
        <div class="modal-head">
          <h2 class="modal-title">{{ title }}</h2>
          <button class="modal-close" type="button" aria-label="关闭" @click="close">×</button>
        </div>
        <div class="modal-body"><slot /></div>
        <div v-if="$slots.footer" class="modal-foot"><slot name="footer" /></div>
      </div>
    </div>
  </Teleport>
</template>
