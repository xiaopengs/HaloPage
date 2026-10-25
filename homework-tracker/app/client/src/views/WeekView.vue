<script setup>
import { computed, onMounted, onActivated, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useFamilyStore } from '../stores/family';
import { confirmDialog } from '../composables/useConfirm';
import { toast } from '../composables/useToast';
import { mondayOf, todayStr, WEEKDAY_NAMES } from '../utils';

const route = useRoute();
const router = useRouter();
const family = useFamilyStore();

const weekStart = ref(
  typeof route.query.week_start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.week_start)
    ? mondayOf(route.query.week_start)
    : mondayOf(todayStr())
);
const weekData = ref(null);
const loading = ref(false);
const loadError = ref('');
let requestSeq = 0;

const freshIds = computed(() => {
  const raw = route.query.fresh;
  return typeof raw === 'string' ? raw.split(',').filter(Boolean) : [];
});

const isThisWeek = computed(() => weekStart.value === mondayOf(todayStr()));
const weekOffset = computed(() => {
  const a = new Date(weekStart.value + 'T00:00:00');
  const b = new Date(mondayOf(todayStr()) + 'T00:00:00');
  return Math.round((a - b) / (7 * 86400000));
});
const weekLabel = computed(() => (weekOffset.value === 0 ? '本周' : weekOffset.value < 0 ? `${Math.abs(weekOffset.value)} 周前` : `${weekOffset.value} 周后`));
const weekRange = computed(() => {
  const d = new Date(weekStart.value + 'T00:00:00');
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  return `${d.getMonth() + 1}/${d.getDate()}—${end.getMonth() + 1}/${end.getDate()}`;
});
const summary = computed(() => {
  const days = weekData.value?.days || [];
  const total = days.reduce((n, d) => n + d.total, 0);
  const done = days.reduce((n, d) => n + d.done, 0);
  return { total, done };
});

async function loadWeek({ retry = true } = {}) {
  if (!family.currentChildId) {
    weekData.value = null;
    loadError.value = '';
    return;
  }
  const seq = ++requestSeq;
  loading.value = true;
  loadError.value = '';
  try {
    const data = await api.get('/homeworks/week-view', {
      params: { child_id: family.currentChildId, week_start: weekStart.value },
      timeout: 15000,
    });
    if (seq !== requestSeq) return;
    weekData.value = data;
  } catch (e) {
    if (seq !== requestSeq) return;
    // 网络抖动/5xx 自动重试一次；4xx（如孩子不存在）重试没有意义
    if (retry && (!e.status || e.status >= 500)) {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (seq === requestSeq) return loadWeek({ retry: false });
    }
    loadError.value = e.message || '网络不太稳定，这一周没有加载出来。';
    // 切换到别的周失败时不要把旧周数据挂在新周标题下
    if (!weekData.value || weekData.value.week_start !== weekStart.value) weekData.value = null;
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}

function shiftWeek(delta) {
  const d = new Date(weekStart.value + 'T00:00:00');
  d.setDate(d.getDate() + delta * 7);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  weekStart.value = local.toISOString().slice(0, 10);
  router.replace({ query: { ...route.query, week_start: weekStart.value, fresh: undefined } });
  loadWeek();
}

function backThisWeek() {
  weekStart.value = mondayOf(todayStr());
  router.replace({ query: { ...route.query, week_start: undefined, fresh: undefined } });
  loadWeek();
}

async function toggleComplete(item) {
  const next = !item.completed;
  item.completed = next;
  if (weekData.value) {
    const day = weekData.value.days.find(d => d.subjects.some(s => s.items.some(i => i.id === item.id)));
    if (day) day.done = Math.max(0, day.done + (next ? 1 : -1));
  }
  try {
    await api.put(`/homeworks/${item.id}`, { completed: next });
  } catch {
    item.completed = !next;
    loadWeek();
  }
}

async function removeItem(item) {
  const ok = await confirmDialog({
    title: '删除这条作业？',
    message: `「${item.content || '这条记录'}」删除后不可恢复。`,
    confirmText: '删除',
    danger: true,
  });
  if (!ok) return;
  try {
    await api.delete(`/homeworks/${item.id}`);
    toast.success('已删除');
    loadWeek();
  } catch { /* 拦截器已提示 */ }
}

function goRecord(date) {
  router.push({ name: 'record', query: { date, child: family.currentChildId ? String(family.currentChildId) : undefined } });
}

function goEdit(id) {
  router.push({ name: 'record-id', params: { id } });
}

onMounted(async () => {
  try {
    await family.load();
  } catch (e) {
    loadError.value = e.message || '孩子档案没有加载出来。';
  }
  if (typeof route.query.child === 'string') family.setCurrentChild(route.query.child);
  if (family.currentChildId && !loading.value) await loadWeek();
  if (freshIds.value.length) {
    setTimeout(() => router.replace({ query: { ...route.query, fresh: undefined } }), 2200);
  }
});

onActivated(async () => {
  try {
    await family.refresh();
  } catch { /* 保留已有数据 */ }
  await loadWeek();
});

watch(
  () => family.currentChildId,
  () => loadWeek()
);
</script>

<template>
  <section aria-labelledby="boardTitle">
    <div class="view-head">
      <div>
        <h1 id="boardTitle" class="view-title">{{ isThisWeek ? '这周作业' : '周作业' }}</h1>
        <p class="view-subtitle">按天翻开，按科打勾。</p>
      </div>
      <div v-if="weekData" class="view-aside num">{{ summary.total }} 条 · 已完成 {{ summary.done }}</div>
    </div>

    <div v-if="!family.children.length && !family.loading" class="panel empty-state">
      <svg class="empty-mark" viewBox="0 0 54 54" fill="none" aria-hidden="true">
        <path d="M14 10h26v34H14z" stroke="currentColor" stroke-width="2" />
        <path d="M20 6v8M34 6v8M20 22h14M20 29h14M20 36h9" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <h3>先添加一个孩子</h3>
      <p>用“大宝”“二宝”这样的称呼即可，不需要真实姓名。</p>
      <div class="empty-actions">
        <router-link to="/children" class="btn btn-primary">添加孩子</router-link>
        <router-link to="/policy" class="btn btn-ghost">了解隐私保护</router-link>
      </div>
    </div>

    <template v-else>
      <div class="week-nav" aria-label="切换周">
        <button class="week-button prev" type="button" @click="shiftWeek(-1)">‹ 上一周</button>
        <div class="week-range num" aria-live="polite">{{ weekRange }}<small>{{ weekLabel }}</small></div>
        <button class="week-button next" type="button" @click="shiftWeek(1)">下一周 ›</button>
      </div>
      <button v-if="!isThisWeek" class="back-week" type="button" @click="backThisWeek">回到本周</button>

      <div v-if="weekData" class="board-grid">
        <article
          v-for="day in weekData.days"
          :key="day.date"
          class="day-card"
          :class="{ 'is-today': day.is_today }"
        >
          <div class="date-rail">
            <span class="date-number num">{{ Number(day.date.slice(8, 10)) }}</span>
            <span class="date-weekday">{{ WEEKDAY_NAMES[day.weekday - 1] }}</span>
          </div>
          <div class="day-body">
            <div class="day-meta">
              <span :class="day.is_today ? 'today-label' : 'muted'">{{ day.is_today ? '今天' : `${Number(day.date.slice(5, 7))} 月` }}</span>
              <span class="day-count num">{{ day.total ? `${day.done}/${day.total} 已完成` : '0 条' }}</span>
            </div>

            <div v-if="!day.total" class="empty-day">
              这一天还没有作业。<button type="button" @click="goRecord(day.date)">记作业</button>
            </div>

            <template v-else>
              <div v-for="group in day.subjects" :key="group.subject_id" class="subject-group" :style="{ '--subject': group.color || '#66758C' }">
              <h3 class="subject-name">{{ group.name }}</h3>
              <ul class="homework-list">
                <li
                  v-for="item in group.items"
                  :key="item.id"
                  class="homework-item"
                  :class="{ done: item.completed, fresh: freshIds.includes(String(item.id)) }"
                >
                  <button
                    class="check"
                    type="button"
                    :aria-pressed="item.completed"
                    :aria-label="item.completed ? `标记未完成：${item.content || '作业'}` : `标记已完成：${item.content || '作业'}`"
                    @click="toggleComplete(item)"
                  >
                    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
                  </button>
                  <span class="homework-text">
                    {{ item.content || '（照片已存档，待录入文字）' }}
                    <span v-if="item.photo_key" class="badge badge-photo">照片</span>
                    <span v-if="item.confidence !== null && item.confidence < 0.7" class="badge badge-warn">待核对</span>
                  </span>
                  <span class="item-tools">
                    <button class="icon-btn" type="button" :aria-label="`编辑：${item.content || '作业'}`" @click="goEdit(item.id)">
                      <svg viewBox="0 0 18 18" width="15" height="15" fill="none" aria-hidden="true"><path d="M4 14h2.3L14 6.3 11.7 4 4 11.7V14Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="m10.8 4.9 2.3 2.3" stroke="currentColor" stroke-width="1.4"/></svg>
                    </button>
                    <button class="icon-btn danger" type="button" :aria-label="`删除：${item.content || '作业'}`" @click="removeItem(item)">
                      <svg viewBox="0 0 18 18" width="15" height="15" fill="none" aria-hidden="true"><path d="M4 5.5h10M7.5 5.5V4h3v1.5M5.5 5.5l.6 8.5h5.8l.6-8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </span>
                </li>
              </ul>
            </div>
            </template>
          </div>
        </article>
      </div>

      <div v-else-if="loadError" class="panel empty-state">
        <svg class="empty-mark" viewBox="0 0 54 54" fill="none" aria-hidden="true">
          <circle cx="27" cy="27" r="18" stroke="currentColor" stroke-width="2" />
          <path d="M27 17v12M27 34v3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
        </svg>
        <h3>这一周没加载出来</h3>
        <p>{{ loadError }}</p>
        <div class="empty-actions">
          <button class="btn btn-primary" type="button" @click="loadWeek()">重新加载</button>
        </div>
      </div>

      <div v-else class="panel skeleton-card">
        <div class="loading-line" style="width: 42%"></div>
        <div class="loading-line" style="width: 78%"></div>
        <div class="loading-line" style="width: 61%"></div>
      </div>
    </template>
  </section>
</template>
