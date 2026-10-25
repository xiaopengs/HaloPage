<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import { useFamilyStore } from '../stores/family';
import { compressImage, mondayOf, todayStr } from '../utils';
import { toast } from '../composables/useToast';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const family = useFamilyStore();

const editId = route.params.id ? Number(route.params.id) : null;
const isEdit = computed(() => !!editId);

const form = ref({
  child_id: null,
  subject_id: null,
  homework_date: typeof route.query.date === 'string' ? route.query.date : todayStr(),
  content: '',
  completed: false,
});
const photoKey = ref('');
const photoPreview = ref('');
const uploading = ref(false);
const recognizing = ref(false);
const saving = ref(false);
const showPhoto = ref(false);
const recogNote = ref('');
const error = ref('');
const draftId = ref(null);
const previewDays = ref([]);

const lines = computed(() => form.value.content.split('\n').map(s => s.trim()).filter(Boolean));
const lineCount = computed(() => lines.value.length);
const photoVisible = computed(() => !!photoPreview.value);
const currentChild = computed(() => family.children.find(c => c.id === form.value.child_id) || null);

const QUICK = ['练习册第 页', '抄写第 课生字', '订正今天的错题', '背诵并家长签字'];

function subjectStyle(id) {
  const s = family.subjects.find(x => x.id === id);
  return s ? { '--chip': s.color || '#66758C', '--chip-bg': `${s.color || '#66758C'}14` } : {};
}

function insertPhrase(text) {
  const ta = document.getElementById('homeworkInput');
  const current = form.value.content.trim();
  form.value.content = current ? `${current}\n${text}` : text;
  error.value = '';
  requestAnimationFrame(() => {
    ta?.focus();
    ta?.setSelectionRange(ta.value.length, ta.value.length);
  });
}

function onToday() {
  form.value.homework_date = todayStr();
}

async function loadPreview() {
  if (!form.value.child_id) { previewDays.value = []; return; }
  try {
    const data = await api.get('/homeworks/week-view', {
      params: { child_id: form.value.child_id, week_start: mondayOf(form.value.homework_date) },
    });
    previewDays.value = data.days || [];
  } catch {
    previewDays.value = [];
  }
}

const previewItems = computed(() => {
  const items = [];
  for (const day of previewDays.value) {
    for (const group of day.subjects || []) {
      for (const item of group.items || []) {
        items.push({
          key: `${day.date}-${item.id}`,
          date: day.date,
          subject: group.name,
          color: group.color,
          content: item.content,
          done: item.completed,
        });
      }
    }
  }
  return items.slice(0, 6);
});

async function onFileChange(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  if (!family.currentChildId && !form.value.child_id) {
    error.value = '先添加孩子档案，再上传照片。';
    return;
  }
  uploading.value = true;
  error.value = '';
  try {
    const compressed = await compressImage(file);
    photoPreview.value = URL.createObjectURL(compressed);
    const fd = new FormData();
    fd.append('file', compressed);
    const uploaded = await api.post('/upload/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    photoKey.value = uploaded.photo_key;

    let targetId = editId;
    if (!targetId) {
      if (!draftId.value) {
        const created = await api.post('/homeworks', {
          child_id: form.value.child_id,
          subject_id: form.value.subject_id,
          homework_date: form.value.homework_date,
          content: '',
          photo_key: photoKey.value,
        });
        draftId.value = created.id;
      } else {
        await api.put(`/homeworks/${draftId.value}/photo`, { photo_key: photoKey.value });
      }
      targetId = draftId.value;
    } else {
      await api.put(`/homeworks/${targetId}/photo`, { photo_key: photoKey.value });
    }
    toast.success('照片已上传');
    await recognize(targetId);
  } catch (err) {
    error.value = err.message || '上传失败，可以改为手动输入。';
  } finally {
    uploading.value = false;
  }
}

async function recognize(targetId = editId || draftId.value) {
  if (!targetId) return;
  recognizing.value = true;
  recogNote.value = '';
  try {
    const data = await api.post(`/homeworks/${targetId}/recognize`);
    if (data.status === 2 && data.recognized_json?.items?.length) {
      const items = data.recognized_json.items;
      form.value.content = items.map(i => i.content).join('\n');
      const match = family.subjects.find(s => s.name === items[0].subject);
      if (match) form.value.subject_id = match.id;
      recogNote.value = `识别结果已填入下方输入框，共 ${items.length} 条。核对后再保存。`;
      showPhoto.value = true;
    } else {
      recogNote.value = data.reason || '识别失败，照片已保留，请手动输入。';
      toast.warning('识别没有完成，可以直接手动输入');
    }
  } catch (err) {
    recogNote.value = err.message || '识别服务不可用，请手动输入。';
  } finally {
    recognizing.value = false;
  }
}

async function save() {
  error.value = '';
  if (!form.value.child_id) { error.value = '先添加孩子档案。'; return; }
  if (!form.value.subject_id) { error.value = '先选择学科，再保存作业。'; return; }
  if (!lines.value.length && !photoKey.value) { error.value = '先写一条作业，每行一条。'; return; }

  saving.value = true;
  try {
    const ids = [];
    if (isEdit.value) {
      await api.put(`/homeworks/${editId}`, {
        child_id: form.value.child_id,
        subject_id: form.value.subject_id,
        homework_date: form.value.homework_date,
        content: lines.value.join('\n'),
        completed: form.value.completed,
        status: 4,
      });
      ids.push(editId);
    } else if (draftId.value) {
      const [first, ...rest] = lines.value;
      await api.put(`/homeworks/${draftId.value}`, {
        child_id: form.value.child_id,
        subject_id: form.value.subject_id,
        homework_date: form.value.homework_date,
        content: first || '',
        status: 4,
      });
      ids.push(draftId.value);
      if (rest.length) ids.push(...(await createBatch(rest)));
    } else {
      ids.push(...(await createBatch(lines.value)));
    }
    toast.success(`已保存 ${ids.length} 条到周看板`);
    router.push({
      name: 'week',
      query: {
        week_start: mondayOf(form.value.homework_date),
        child: String(form.value.child_id),
        fresh: ids.join(','),
      },
    });
  } catch (err) {
    error.value = err.message || '保存失败，请稍后重试。';
  } finally {
    saving.value = false;
  }
}

async function createBatch(items) {
  try {
    const data = await api.post('/homeworks/batch', {
      child_id: form.value.child_id,
      subject_id: form.value.subject_id,
      homework_date: form.value.homework_date,
      items,
    });
    return data.ids;
  } catch (err) {
    // 兼容旧服务端：批量接口不可用时逐条保存
    if (err.status !== 404) throw err;
    const ids = [];
    for (const content of items) {
      const created = await api.post('/homeworks', {
        child_id: form.value.child_id,
        subject_id: form.value.subject_id,
        homework_date: form.value.homework_date,
        content,
        photo_key: photoKey.value || null,
      });
      ids.push(created.id);
    }
    return ids;
  }
}

onMounted(async () => {
  await family.load();
  if (typeof route.query.child === 'string') family.setCurrentChild(route.query.child);
  form.value.child_id = family.currentChildId;
  form.value.subject_id = family.subjects[0]?.id || null;

  if (isEdit.value) {
    try {
      const hw = await api.get(`/homeworks/${editId}`);
      form.value = {
        child_id: hw.child_id,
        subject_id: hw.subject_id,
        homework_date: hw.homework_date,
        content: hw.content || '',
        completed: hw.completed === 1,
      };
      photoKey.value = hw.photo_key || '';
      if (hw.photo_key) {
        photoPreview.value = `/api/v1/photos/${hw.photo_key}?token=${encodeURIComponent(auth.token || '')}`;
        showPhoto.value = true;
      }
    } catch {
      toast.error('作业不存在或已删除');
      router.replace({ name: 'week' });
      return;
    }
  }
  loadPreview();
});

watch(
  () => [form.value.child_id, form.value.homework_date],
  () => loadPreview()
);
</script>

<template>
  <section aria-labelledby="recordTitle">
    <div class="view-head">
      <div>
        <h1 id="recordTitle" class="view-title">{{ isEdit ? '编辑作业' : '记作业' }}</h1>
        <p class="view-subtitle">
          {{ isEdit ? '修改后整段保存为一条。' : '每行保存为一条，识别结果也会预填到这里核对。' }}
        </p>
      </div>
      <router-link to="/" class="btn btn-ghost btn-sm">返回看板</router-link>
    </div>

    <div v-if="!family.children.length && !family.loading" class="panel empty-state">
      <h3>先添加一个孩子</h3>
      <p>有了孩子档案，作业才知道记给谁。</p>
      <div class="empty-actions"><router-link to="/children" class="btn btn-primary">添加孩子</router-link></div>
    </div>

    <div v-else class="record-layout">
      <div>
        <form class="record-card" novalidate @submit.prevent="save">
          <div class="form-grid three">
            <div class="field">
              <label class="field-label" for="recordChild">孩子</label>
              <select id="recordChild" v-model.number="form.child_id" class="select-input">
                <option v-for="c in family.children" :key="c.id" :value="c.id">
                  {{ c.name }}<template v-if="c.grade"> · {{ c.grade }}</template>
                </option>
              </select>
            </div>
            <div class="field">
              <label class="field-label" for="recordDate">日期</label>
              <div style="display:flex; gap:7px">
                <input id="recordDate" v-model="form.homework_date" class="text-input num" type="date" style="flex:1 1 auto; min-width:160px; padding-inline:8px; font-size:13px" />
                <button class="btn btn-sm" type="button" style="flex:0 0 auto" @click="onToday">今天</button>
              </div>
            </div>
            <div class="field">
              <span class="field-label" id="subjectLabel">学科</span>
              <div class="subject-chips" role="group" aria-labelledby="subjectLabel">
                <button
                  v-for="s in family.subjects"
                  :key="s.id"
                  type="button"
                  class="subject-chip"
                  :style="subjectStyle(s.id)"
                  :aria-pressed="form.subject_id === s.id"
                  @click="form.subject_id = s.id; error = ''"
                >{{ s.name }}</button>
              </div>
            </div>
          </div>

          <div class="field textarea-field">
            <label class="field-label" for="homeworkInput">手动输入作业</label>
            <textarea
              id="homeworkInput"
              v-model="form.content"
              class="homework-input"
              rows="5"
              placeholder="每行一条作业，例如：&#10;数学练习册第 32 页&#10;背诵英语第 3 单元单词"
              aria-describedby="inputHint lineCount"
            ></textarea>
            <div class="input-meta">
              <span id="inputHint">每行一条，空行会自动忽略</span>
              <span class="line-count num">{{ isEdit ? '整段保存为一条' : `将保存 ${lineCount} 条` }}</span>
            </div>
            <div v-if="!isEdit" class="quick-phrases" aria-label="快捷短语">
              <button v-for="q in QUICK" :key="q" class="quick-phrase" type="button" @click="insertPhrase(q)">{{ q.replace(' ', '_') }}</button>
            </div>
          </div>

          <div v-if="photoVisible || showPhoto || recognizing || recogNote" style="margin-top:16px">
            <div v-if="photoVisible" style="margin-bottom:10px">
              <img :src="photoPreview" class="photo-preview" alt="作业照片预览" />
            </div>
            <p v-if="recognizing" class="recog-note">正在识别照片里的作业内容，大约需要 5–10 秒。</p>
            <p v-else-if="recogNote" class="recog-note">{{ recogNote }}</p>
            <div v-if="photoKey && !recognizing" class="btn-row">
              <button class="btn btn-sm" type="button" @click="recognize()">重新识别</button>
            </div>
          </div>

          <label v-if="isEdit" class="checkbox-line" style="margin-top:16px">
            <input v-model="form.completed" type="checkbox" /> 这条作业已完成
          </label>

          <p class="form-error" role="alert">{{ error }}</p>

          <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="saving || uploading">
            {{ saving ? '正在保存…' : '保存到周看板' }}
          </button>
          <p class="save-note">保存后会归入所选孩子、日期和学科</p>
        </form>

        <div class="photo-assist" style="margin-top:16px">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" stroke="currentColor" stroke-width="1.7"/></svg>
          <div>
            <h3>{{ isEdit ? '补拍作业照片' : '拍照识别（可选）' }}</h3>
            <p>{{ uploading ? '照片上传中…' : isEdit ? '补拍后可以重新识别，结果会填进上方输入框。' : '识别后先填入输入框，核对再保存。也可以完全手动输入。' }}</p>
          </div>
          <label class="assist-action" style="cursor:pointer">
            {{ uploading ? '处理中…' : photoVisible ? '重新拍照' : '添加照片' }}
            <input type="file" accept="image/*" capture="environment" hidden :disabled="uploading" @change="onFileChange" />
          </label>
        </div>
      </div>

      <aside class="record-preview" aria-label="本周已有作业">
        <h2>保存后到哪里？</h2>
        <p>作业会贴进对应日期，并按学科归类。这里是{{ currentChild?.name || '孩子' }}本周已有内容。</p>
        <ul v-if="previewItems.length" class="preview-list">
          <li v-for="item in previewItems" :key="item.key">
            <strong :style="{ color: item.color || '#66758C' }">{{ item.date.slice(5).replace('-', '/') }} · {{ item.subject }}</strong>
            {{ item.content || '（照片已存档，待录入文字）' }}
          </li>
        </ul>
        <p v-else class="muted">本周还没有作业。保存第一条后，会出现在这里。</p>
      </aside>
    </div>
  </section>
</template>
