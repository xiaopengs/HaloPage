import { defineStore } from 'pinia';
import api from '../api';

export const useFamilyStore = defineStore('family', {
  state: () => ({
    children: [],
    subjects: [],
    currentChildId: Number(localStorage.getItem('ht_child')) || null,
    loaded: false,
    loading: false,
  }),
  getters: {
    currentChild: s => s.children.find(c => c.id === s.currentChildId) || null,
    hasChildren: s => s.children.length > 0,
  },
  actions: {
    async load(force = false) {
      if (this.loaded && !force) return;
      if (this.loading) return;
      this.loading = true;
      try {
        const [children, subjects] = await Promise.all([api.get('/children'), api.get('/subjects')]);
        this.children = children;
        this.subjects = subjects;
        if (!children.find(c => c.id === this.currentChildId)) {
          this.currentChildId = children[0]?.id || null;
          this.persist();
        }
        this.loaded = true;
      } finally {
        this.loading = false;
      }
    },
    async refresh() {
      this.loaded = false;
      await this.load(true);
    },
    setCurrentChild(id) {
      const numeric = Number(id);
      if (!this.children.find(c => c.id === numeric)) return;
      this.currentChildId = numeric;
      this.persist();
    },
    persist() {
      if (this.currentChildId) localStorage.setItem('ht_child', String(this.currentChildId));
      else localStorage.removeItem('ht_child');
    },
    reset() {
      this.children = [];
      this.subjects = [];
      this.currentChildId = null;
      this.loaded = false;
      localStorage.removeItem('ht_child');
    },
  },
});
