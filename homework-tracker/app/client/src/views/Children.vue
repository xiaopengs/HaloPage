<script setup>
import { onMounted, ref } from 'vue';
import api from '../api';
import { useFamilyStore } from '../stores/family';
import BaseModal from '../components/BaseModal.vue';
import { confirmDialog } from '../composables/useConfirm';
import { toast } from '../composables/useToast';

const family = useFamilyStore();
const open = ref(false);
const editing = ref(null);
const form = ref({ name: '', grade: '' });
const saving = ref(false);
const error = ref('');

function openAdd() {
  editing.value = null;
  form.value = { name: '', grade: '' };
  error.value = '';
  open.value = true;
}

function openEdit(child) {
  editing.value = child.id;
  form.value = { name: child.name, grade: child.grade || '' };
  error.value = '';
  open.value = true;
}

async function save() {
  error.value = '';
  if (!form.value.name.trim()) {
    error.value = '先填写孩子称呼，比如“大宝”。';
    return;
  }
  saving.value = true;
  try {
    if (editing.value) {
      await api.put(`/children/${editing.value}`, { name: form.value.name.trim(), grade: form.value.grade.trim() || null });
      toast.success('已更新孩子档案');
    } else {
      await api.post('/children', { name: form.value.name.trim(), grade: form.value.grade.trim() || null });
      toast.success('已添加孩子');
    }
    open.value = false;
    await family.refresh();
  } catch (e) {
    error.value = e.message || '保存失败，请稍后再试。';
  } finally {
    saving.value = false;
  }
}

async function remove(child) {
  const ok = await confirmDialog({
    title: `删除「${child.name}」？`,
    message: '这个孩子的全部作业记录会一并删除，且不可恢复。',
    confirmText: '删除',
    danger: true,
  });
  if (!ok) return;
  try {
    await api.delete(`/children/${child.id}`);
    toast.success('已删除');
    await family.refresh();
  } catch { /* 拦截器已提示 */ }
}

onMounted(() => family.load());
</script>

<template>
  <section aria-labelledby="childrenTitle">
    <div class="list-head">
      <div>
        <h1 id="childrenTitle" class="view-title">孩子档案</h1>
        <p class="view-subtitle">用“大宝”“二宝”这样的称呼即可，不需要真实姓名。</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openAdd">+ 添加孩子</button>
    </div>

    <div v-if="!family.children.length && !family.loading" class="panel empty-state">
      <svg class="empty-mark" viewBox="0 0 54 54" fill="none" aria-hidden="true">
        <circle cx="27" cy="20" r="8" stroke="currentColor" stroke-width="2" />
        <path d="M12 45c1.4-8 6.8-12 15-12s13.6 4 15 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <h3>还没有孩子档案</h3>
      <p>添加后，就能按孩子分别记录和查看作业。</p>
      <div class="empty-actions"><button class="btn btn-primary" type="button" @click="openAdd">添加孩子</button></div>
    </div>

    <div v-else>
      <article v-for="child in family.children" :key="child.id" class="panel child-card">
        <div class="child-info">
          <div class="avatar">{{ child.name.slice(0, 1) }}</div>
          <div style="min-width:0">
            <div class="c-name">{{ child.name }}</div>
            <div class="muted" style="font-size:13px">{{ child.grade || '未填写年级' }}</div>
          </div>
        </div>
        <div class="child-ops">
          <button class="btn btn-sm btn-ghost" type="button" @click="openEdit(child)">编辑</button>
          <button class="btn btn-sm btn-ghost" type="button" style="color:var(--redpen)" @click="remove(child)">删除</button>
        </div>
      </article>
      <p class="muted" style="font-size:12px; margin-top:12px">一个账号最多 10 个孩子。删除孩子会同时删除其作业记录。</p>
    </div>

    <BaseModal v-model="open" :title="editing ? '编辑孩子档案' : '添加孩子'">
      <form id="childForm" novalidate @submit.prevent="save">
        <div class="field">
          <label class="field-label" for="childName">称呼（如：大宝）</label>
          <input id="childName" v-model="form.name" class="text-input" maxlength="20" placeholder="不超过 20 字" />
        </div>
        <div class="field" style="margin-top:14px">
          <label class="field-label" for="childGrade">年级（选填）</label>
          <input id="childGrade" v-model="form.grade" class="text-input" maxlength="20" placeholder="如：三年级" />
        </div>
        <p class="form-error" role="alert">{{ error }}</p>
      </form>
      <template #footer>
        <button class="btn" type="button" @click="open = false">取消</button>
        <button class="btn btn-primary" type="submit" form="childForm" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button>
      </template>
    </BaseModal>
  </section>
</template>
