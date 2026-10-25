<script setup>
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from './stores/auth';
import { useFamilyStore } from './stores/family';
import BrandMark from './components/BrandMark.vue';
import ToastHost from './components/ToastHost.vue';
import ConfirmHost from './components/ConfirmHost.vue';

const route = useRoute();
const auth = useAuthStore();
const family = useFamilyStore();
const { isLoggedIn } = storeToRefs(auth);
const { children, currentChildId } = storeToRefs(family);

const showChrome = computed(() => isLoggedIn.value && !['login', 'policy', 'admin'].includes(route.name));

function onChildChange(e) {
  family.setCurrentChild(e.target.value);
}

onMounted(() => {
  if (isLoggedIn.value) family.load();
});

watch(isLoggedIn, value => {
  if (value) family.load(true);
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <router-link to="/" class="brand" aria-label="作业夹首页">
        <BrandMark />
        <span>
          <span class="brand-name">作业夹</span>
          <span class="brand-note">一周作业，一夹收好</span>
        </span>
      </router-link>

      <nav v-if="showChrome" class="desktop-nav" aria-label="主导航">
        <router-link to="/" class="nav-link">周看板</router-link>
        <router-link to="/record" class="nav-link">记作业</router-link>
        <router-link to="/children" class="nav-link">孩子</router-link>
        <router-link to="/profile" class="nav-link">我的</router-link>
      </nav>

      <div v-if="showChrome" class="header-right">
        <label v-if="children.length" class="child-switch">
          孩子
          <select :value="currentChildId" aria-label="选择孩子" @change="onChildChange">
            <option v-for="c in children" :key="c.id" :value="c.id">
              {{ c.name }}<template v-if="c.grade"> · {{ c.grade }}</template>
            </option>
          </select>
        </label>
      </div>
    </header>

    <main>
      <router-view />
    </main>
  </div>

  <nav v-if="showChrome" class="tabbar" aria-label="主导航">
    <router-link to="/" class="tab">
      <svg class="tab-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 4.5h5v5H3zM12 4.5h5v5h-5zM3 12h5v3.5H3zM12 12h5v3.5h-5z" stroke="currentColor" stroke-width="1.5"/></svg>
      <span class="tab-text">周看板</span>
    </router-link>
    <router-link to="/record" class="tab">
      <svg class="tab-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      <span class="tab-text">记作业</span>
    </router-link>
    <router-link to="/children" class="tab">
      <svg class="tab-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="7" r="3.2" stroke="currentColor" stroke-width="1.5"/><path d="M4 17c.6-3 2.7-4.6 6-4.6s5.4 1.6 6 4.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span class="tab-text">孩子</span>
    </router-link>
    <router-link to="/profile" class="tab">
      <svg class="tab-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="8" r="2.2" stroke="currentColor" stroke-width="1.5"/><path d="M6 15.4c.7-1.9 2-2.8 4-2.8s3.3.9 4 2.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span class="tab-text">我的</span>
    </router-link>
  </nav>

  <ToastHost />
  <ConfirmHost />
</template>
