<script setup>
import BaseModal from './BaseModal.vue';
import { confirmState, settleConfirm } from '../composables/useConfirm';
</script>

<template>
  <BaseModal
    :model-value="confirmState.open"
    :title="confirmState.title"
    @update:model-value="v => { if (!v) settleConfirm(false); }"
  >
    <p>{{ confirmState.message }}</p>
    <template #footer>
      <button class="btn" type="button" @click="settleConfirm(false)">{{ confirmState.cancelText }}</button>
      <button
        class="btn"
        :class="confirmState.danger ? 'btn-danger' : 'btn-primary'"
        type="button"
        @click="settleConfirm(true)"
      >{{ confirmState.confirmText }}</button>
    </template>
  </BaseModal>
</template>
