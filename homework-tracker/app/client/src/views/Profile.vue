<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { useFamilyStore } from '../stores/family';
import api from '../api';
import BaseModal from '../components/BaseModal.vue';
import { confirmDialog } from '../composables/useConfirm';
import { toast } from '../composables/useToast';

const router = useRouter();
const auth = useAuthStore();
const family = useFamilyStore();
const { user } = storeToRefs(auth);

const feedback = ref('');
const feedbackOpen = ref(false);
const sending = ref(false);

async function submitFeedback() {
  if (!feedback.value.trim()) return;
  sending.value = true;
  try {
    await api.post('/feedback', { content: feedback.value.trim() });
    toast.success('感谢反馈，我们会认真查看');
    feedback.value = '';
    feedbackOpen.value = false;
  } catch { /* 拦截器已提示 */ } finally {
    sending.value = false;
  }
}

async function logout() {
  const ok = await confirmDialog({ title: '退出登录？', message: '退出后需要重新输入账号和密码。', confirmText: '退出', danger: true });
  if (!ok) return;
  try {
    await api.post('/auth/logout', { refresh_token: auth.refreshToken });
  } catch { /* 忽略网络错误 */ }
  auth.logout();
  family.reset();
  router.push('/login');
}
</script>

<template>
  <section aria-labelledby="profileTitle">
    <div class="view-head">
      <div>
        <h1 id="profileTitle" class="view-title">我的</h1>
        <p class="view-subtitle">账号、孩子与数据说明都在这里。</p>
      </div>
    </div>

    <div class="panel profile-card">
      <div class="avatar ink">{{ (user?.nickname || '家').slice(0, 1) }}</div>
      <div>
        <div class="p-name">{{ user?.nickname || '家长' }}</div>
        <div class="muted" style="font-size:13px">{{ user?.email || user?.phone || '未绑定邮箱或手机号' }}</div>
      </div>
    </div>

    <div class="panel menu-list" style="margin-top:14px">
      <button class="menu-item" type="button" @click="feedbackOpen = true">
        <span>意见反馈</span><span class="arrow">›</span>
      </button>
      <router-link to="/children" class="menu-item">
        <span>孩子档案管理</span><span class="arrow">›</span>
      </router-link>
      <router-link to="/policy" class="menu-item">
        <span>用户协议与隐私政策</span><span class="arrow">›</span>
      </router-link>
    </div>

    <div class="panel menu-list" style="margin-top:14px">
      <button class="menu-item danger" type="button" @click="logout">退出登录</button>
    </div>

    <p class="version">作业夹 · V1.0 · 数据仅用于家庭作业记录</p>

    <BaseModal v-model="feedbackOpen" title="意见反馈">
      <div class="field">
        <label class="field-label" for="feedbackText">想让我们改进什么？</label>
        <textarea id="feedbackText" v-model="feedback" class="textarea" rows="4" maxlength="2000" placeholder="例如：希望支持按周导出作业清单"></textarea>
      </div>
      <template #footer>
        <button class="btn" type="button" @click="feedbackOpen = false">取消</button>
        <button class="btn btn-primary" type="button" :disabled="sending || !feedback.trim()" @click="submitFeedback">{{ sending ? '提交中…' : '提交' }}</button>
      </template>
    </BaseModal>
  </section>
</template>
