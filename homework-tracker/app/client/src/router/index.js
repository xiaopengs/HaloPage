import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { public: true } },
  { path: '/', name: 'week', component: () => import('../views/WeekView.vue') },
  { path: '/record', name: 'record', component: () => import('../views/Record.vue') },
  { path: '/record/:id', name: 'record-id', component: () => import('../views/Record.vue') },
  { path: '/edit', redirect: '/record' },
  { path: '/edit/:id', redirect: to => `/record/${to.params.id}` },
  { path: '/children', name: 'children', component: () => import('../views/Children.vue') },
  { path: '/profile', name: 'profile', component: () => import('../views/Profile.vue') },
  { path: '/policy', name: 'policy', component: () => import('../views/Policy.vue'), meta: { public: true } },
  { path: '/admin', name: 'admin', component: () => import('../views/Admin.vue'), meta: { public: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(to => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.token) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.name === 'login' && auth.token) {
    return { name: 'week' };
  }
  return true;
});

export default router;
