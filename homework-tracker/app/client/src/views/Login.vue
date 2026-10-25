<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import { useFamilyStore } from '../stores/family';
import { toast } from '../composables/useToast';
import { todayStr, mondayOf, WEEKDAY_NAMES } from '../utils';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const family = useFamilyStore();

const mode = ref('login');
const loading = ref(false);
const error = ref('');
const form = ref({ account: '', password: '', nickname: '' });
const agreed = ref(false);

const weekDays = computed(() => {
  const monday = new Date(mondayOf(todayStr()) + 'T00:00:00');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { label: WEEKDAY_NAMES[i], date: d.getDate(), today: ds === todayStr() };
  });
});

function switchMode(next) {
  mode.value = next;
  error.value = '';
}

async function submit() {
  error.value = '';
  if (!form.value.account.trim() || !form.value.password) {
    error.value = '请输入账号和密码。';
    return;
  }
  if (form.value.password.length < 6) {
    error.value = '密码至少 6 位。';
    return;
  }
  if (mode.value === 'register' && !agreed.value) {
    error.value = '请先阅读并同意用户协议与隐私政策。';
    return;
  }
  loading.value = true;
  try {
    const path = mode.value === 'login' ? '/auth/login' : '/auth/register';
    const data = await api.post(path, {
      account: form.value.account.trim(),
      password: form.value.password,
      nickname: form.value.nickname?.trim() || undefined,
      ...(mode.value === 'register' ? { agreement: true } : {}),
    });
    auth.setTokens(data.token, data.refresh_token);
    auth.setUser(data.user);
    await family.load(true);
    toast.success(mode.value === 'login' ? '欢迎回来' : '账号已创建');
    const redirect = route.query.redirect;
    router.push(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/');
  } catch (e) {
    error.value = e.message || '操作失败，请稍后再试。';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <main class="login-main">
      <section class="login-hero" aria-label="作业夹">
        <svg class="hero-mark brand-mark" viewBox="0 0 34 38" fill="none" aria-hidden="true">
          <path d="M7 4.5h20v29H7z" stroke="currentColor" stroke-width="1.7" />
          <path d="M12 2v6M22 2v6M12 14h10M12 20h10M12 26h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          <path d="M24 27l2.5 2.5L31 24" stroke="#E88975" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <h2>一周作业，<br />一夹收好。</h2>
        <p>拍一张照，或者手动敲几行。按天翻开，按科打勾，今天该做什么一眼看清。</p>
        <div class="hero-week" aria-label="本周日期示意">
          <div v-for="d in weekDays" :key="d.label" class="hero-day" :class="{ 'is-today': d.today }">
            {{ d.label }}<strong>{{ d.date }}</strong>
          </div>
        </div>
      </section>

      <div class="login-shell">
        <div class="login-intro">
          <h2>一周作业，一夹收好。</h2>
          <p>拍一张照，或手动敲几行；按天翻开，按科打勾。</p>
        </div>
        <div class="login-card panel">
          <div class="auth-tabs" role="tablist" aria-label="登录或注册">
            <button class="auth-tab" :class="{ 'is-active': mode === 'login' }" role="tab" :aria-selected="mode === 'login'" type="button" @click="switchMode('login')">登录</button>
            <button class="auth-tab" :class="{ 'is-active': mode === 'register' }" role="tab" :aria-selected="mode === 'register'" type="button" @click="switchMode('register')">注册</button>
          </div>

          <form novalidate @submit.prevent="submit">
            <div v-if="mode === 'register'" class="field">
              <label class="field-label" for="nickname">昵称（选填）</label>
              <input id="nickname" v-model="form.nickname" class="text-input" maxlength="20" placeholder="怎么称呼您" autocomplete="nickname" />
            </div>
            <div class="field">
              <label class="field-label" for="account">账号（邮箱或手机号）</label>
              <input id="account" v-model="form.account" class="text-input" placeholder="请输入邮箱或手机号" autocomplete="username" />
            </div>
            <div class="field">
              <label class="field-label" for="password">密码</label>
              <input id="password" v-model="form.password" class="text-input" type="password" placeholder="至少 6 位" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" />
            </div>

            <label v-if="mode === 'register'" class="agreement">
              <input v-model="agreed" type="checkbox" />
              <span>我已阅读并同意 <a href="#/policy" target="_blank" rel="noopener">《用户协议》</a> 与 <a href="#/policy" target="_blank" rel="noopener">《隐私政策》</a></span>
            </label>

            <p class="form-error" role="alert">{{ error }}</p>

            <button class="btn btn-primary btn-lg btn-block" type="submit" :disabled="loading">
              {{ loading ? '请稍候…' : mode === 'login' ? '登录' : '注册并开始记录' }}
            </button>
          </form>
        </div>

        <p class="login-foot">
          孩子档案由家长创建与管理，孩子无需注册账号。<br />
          我们只收集记作业所需的最少信息。
        </p>
      </div>
    </main>
  </div>
</template>
