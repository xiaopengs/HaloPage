<script setup>
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import { toast } from '../composables/useToast';
import { confirmDialog } from '../composables/useConfirm';

const token = ref(localStorage.getItem('ht_admin_token') || '');
const authed = ref(false);
const loading = ref(false);
const stats = ref(null);
const users = ref([]);
const recognition = ref({ summary: [] });
const feedback = ref([]);

const summaryRows = computed(() => recognition.value?.summary || []);

async function login() {
  if (!token.value.trim()) return;
  localStorage.setItem('ht_admin_token', token.value.trim());
  await loadAll();
}

async function loadAll() {
  loading.value = true;
  try {
    const headers = { 'x-admin-token': token.value.trim() };
    const [s, u, r, f] = await Promise.all([
      axios.get('/api/v1/admin/stats', { headers }),
      axios.get('/api/v1/admin/users', { headers }),
      axios.get('/api/v1/admin/recognition', { headers }),
      axios.get('/api/v1/admin/feedback', { headers }),
    ]);
    stats.value = s.data.data;
    users.value = u.data.data;
    recognition.value = r.data.data;
    feedback.value = f.data.data;
    authed.value = true;
  } catch {
    authed.value = false;
    toast.error('管理令牌无效或服务不可用');
  } finally {
    loading.value = false;
  }
}

async function toggleUser(user) {
  const next = user.status === 1 ? 0 : 1;
  const ok = await confirmDialog({
    title: next === 1 ? `启用「${user.nickname || user.id}」？` : `禁用「${user.nickname || user.id}」？`,
    message: next === 1 ? '启用后该账号可以继续登录。' : '禁用后该账号将无法登录，历史数据保留。',
    confirmText: next === 1 ? '启用' : '禁用',
    danger: next === 0,
  });
  if (!ok) return;
  try {
    await axios.put(`/api/v1/admin/users/${user.id}/status`, { status: next }, { headers: { 'x-admin-token': token.value.trim() } });
    toast.success(next === 1 ? '已启用' : '已禁用');
    await loadAll();
  } catch {
    toast.error('操作失败');
  }
}

onMounted(() => { if (token.value) loadAll(); });
</script>

<template>
  <section aria-labelledby="adminTitle">
    <div class="view-head">
      <div>
        <h1 id="adminTitle" class="view-title">运营后台</h1>
        <p class="view-subtitle">账号、识别与反馈的只读概览，加一个禁启用开关。</p>
      </div>
      <router-link to="/" class="btn btn-ghost btn-sm">返回应用</router-link>
    </div>

    <div v-if="!authed" class="panel panel-pad" style="max-width:430px">
      <div class="field">
        <label class="field-label" for="adminToken">管理令牌</label>
        <input id="adminToken" v-model="token" class="text-input" type="password" placeholder="请输入管理令牌" autocomplete="off" @keyup.enter="login" />
        <p class="field-hint">令牌由服务端 ADMIN_TOKEN 配置，不随前端打包。</p>
      </div>
      <button class="btn btn-primary btn-block" type="button" style="margin-top:14px" :disabled="loading" @click="login">{{ loading ? '验证中…' : '进入后台' }}</button>
    </div>

    <template v-else>
      <div class="stat-grid">
        <div class="panel stat"><div class="num">{{ stats.users }}</div><div class="label">注册家长</div></div>
        <div class="panel stat"><div class="num">{{ stats.children }}</div><div class="label">孩子档案</div></div>
        <div class="panel stat"><div class="num">{{ stats.homeworks }}</div><div class="label">作业记录</div></div>
        <div class="panel stat"><div class="num">{{ stats.completed }}</div><div class="label">已完成标记</div></div>
      </div>

      <div class="panel panel-pad" style="margin-bottom:14px">
        <h2 style="font-size:17px; margin-bottom:10px">识别服务</h2>
        <div v-if="summaryRows.length" class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Provider</th><th>模型</th><th>状态</th><th>次数</th><th>平均耗时</th><th>平均置信度</th></tr></thead>
            <tbody>
              <tr v-for="(row, i) in summaryRows" :key="i">
                <td>{{ row.provider }}</td>
                <td>{{ row.model }}</td>
                <td><span class="pill" :class="row.status === 1 ? 'pill-ok' : 'pill-off'">{{ row.status === 1 ? '成功' : '失败' }}</span></td>
                <td class="num">{{ row.cnt }}</td>
                <td class="num">{{ row.avg_ms ? Math.round(row.avg_ms) + ' ms' : '—' }}</td>
                <td class="num">{{ row.avg_conf != null ? Number(row.avg_conf).toFixed(2) : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted" style="font-size:13px">还没有识别调用记录。</p>
      </div>

      <div class="panel panel-pad" style="margin-bottom:14px">
        <h2 style="font-size:17px; margin-bottom:10px">用户</h2>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>ID</th><th>昵称</th><th>账号</th><th>孩子</th><th>作业</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td class="num">{{ u.id }}</td>
                <td>{{ u.nickname }}</td>
                <td>{{ u.email || '—' }}</td>
                <td class="num">{{ u.children_count }}</td>
                <td class="num">{{ u.homework_count }}</td>
                <td><span class="pill" :class="u.status === 1 ? 'pill-ok' : 'pill-off'">{{ u.status === 1 ? '正常' : '禁用' }}</span></td>
                <td><button class="btn btn-sm btn-ghost" type="button" @click="toggleUser(u)">{{ u.status === 1 ? '禁用' : '启用' }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel panel-pad">
        <h2 style="font-size:17px; margin-bottom:10px">用户反馈</h2>
        <div v-if="feedback.length" class="table-wrap">
          <table class="data-table">
            <thead><tr><th>ID</th><th>用户</th><th>内容</th><th>时间</th></tr></thead>
            <tbody>
              <tr v-for="f in feedback" :key="f.id">
                <td class="num">{{ f.id }}</td>
                <td>{{ f.nickname }}</td>
                <td style="min-width:220px">{{ f.content }}</td>
                <td class="num">{{ f.created_at }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="muted" style="font-size:13px">还没有反馈。</p>
      </div>
    </template>
  </section>
</template>
