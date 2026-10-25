import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('ht_token') || '',
    refreshToken: localStorage.getItem('ht_refresh') || '',
    user: JSON.parse(localStorage.getItem('ht_user') || 'null'),
  }),
  getters: {
    isLoggedIn: s => !!s.token,
  },
  actions: {
    setTokens(token, refreshToken) {
      this.token = token;
      this.refreshToken = refreshToken;
      localStorage.setItem('ht_token', token);
      localStorage.setItem('ht_refresh', refreshToken);
    },
    setUser(user) {
      this.user = user;
      localStorage.setItem('ht_user', JSON.stringify(user));
    },
    logout() {
      this.token = '';
      this.refreshToken = '';
      this.user = null;
      localStorage.removeItem('ht_token');
      localStorage.removeItem('ht_refresh');
      localStorage.removeItem('ht_user');
    },
  },
});
