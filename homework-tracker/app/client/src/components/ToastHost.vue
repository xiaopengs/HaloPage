<script setup>
import { toastState } from '../composables/useToast';
</script>

<template>
  <Teleport to="body">
    <div class="toast-stack" role="status" aria-live="polite">
      <div v-for="t in toastState.items" :key="t.id" class="toast-item" :class="`is-${t.type}`">{{ t.message }}</div>
    </div>
  </Teleport>
</template>
