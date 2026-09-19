/**
 * 数据统一出口 + 派生指标
 * 所有数字都在这里算，页面只做展示，避免各页口径不一致
 */

import type {
  Requirement,
  StageKey,
  Priority,
  FlowStatus,
} from './types';

import { project, requirements, reviewSessions, workItems, sprints, requirementDocs, analysis } from './core';
import { archDecisions, archComponents, qualityAttributes, archReviews, designDocs, devTasks, pipelineRuns } from './architecture';
import { testPlan } from './plan';
import { testCases } from './testing';
import { defects } from './qa';

export * from './types';
export {
  project, requirements, reviewSessions, workItems, sprints, requirementDocs, analysis,
  archDecisions, archComponents, qualityAttributes, archReviews, designDocs, devTasks,
  pipelineRuns, testPlan, testCases, defects,
};

/* ============================ 查找辅助 ============================ */

export const reqById = new Map(requirements.map((r) => [r.id, r]));
export const docById = new Map(designDocs.map((d) => [d.id, d]));
export const storyById = new Map(workItems.map((w) => [w.id, w]));

export const getRequirement = (id: string): Requirement | undefined => reqById.get(id);

/* ============================ 派生统计 ============================ */

export const stats = (() => {
  const approved = requirements.filter((r) => r.status === 'approved');
  const rejected = requirements.filter((r) => r.status === 'rejected');
  const pending = requirements.filter((r) => r.status !== 'approved' && r.status !== 'rejected');

  const byPriority = (['P0', 'P1', 'P2', 'P3'] as Priority[]).map((p) => ({
    priority: p,
    total: requirements.filter((r) => r.priority === p).length,
    approved: approved.filter((r) => r.priority === p).length,
  }));

  const byChannel = Object.entries(
    requirements.reduce<Record<string, number>>((acc, r) => {
      acc[r.source.channel] = (acc[r.source.channel] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([channel, count]) => ({ channel, count }));

  // 需求池总量 vs 已批准
  const approvalRate = Math.round((approved.length / requirements.length) * 100);

  // 评审意见闭环
  const allComments = reviewSessions.flatMap((s) => s.comments);
  const commentClosed = allComments.filter((c) => c.resolved).length;

  // WBS
  const levels = (['epic', 'feature', 'story', 'task'] as const).map((lv) => ({
    level: lv,
    count: workItems.filter((w) => w.level === lv).length,
  }));
  const totalPoints = workItems.filter((w) => w.level === 'feature').reduce((s, w) => s + w.points, 0);

  // 文档打分
  const avgDocScore =
    Math.round((requirementDocs.reduce((s, d) => s + d.totalScore, 0) / requirementDocs.length) * 10) / 10;
  const gradeDist = (['A', 'B', 'C', 'D'] as const).map((g) => ({
    grade: g,
    count: requirementDocs.filter((d) => d.grade === g).length,
  }));

  // 架构
  const adrAccepted = archDecisions.filter((a) => a.status === '已接受').length;
  const qualityMet = qualityAttributes.filter((q) => q.met).length;
  const followUps = archReviews.flatMap((r) => r.followUps);
  const followUpsDone = followUps.filter((f) => f.done).length;

  // 设计
  const apiTotal = designDocs.reduce((s, d) => s + d.apis.length, 0);
  const tableTotal = designDocs.reduce((s, d) => s + d.tables.length, 0);
  const designIssuesOpen = designDocs.flatMap((d) => d.issues).filter((i) => i.status === 'open').length;

  // 开发
  const devDone = devTasks.filter((t) => t.status === 'done').length;
  const devInProgress = devTasks.filter((t) => t.status === 'in-progress').length;
  const devBlocked = devTasks.filter((t) => t.status === 'blocked').length;
  const avgCoverage =
    Math.round((devTasks.reduce((s, t) => s + t.coverage, 0) / devTasks.length) * 10) / 10;
  const totalLoc = devTasks.reduce(
    (acc, t) => ({ added: acc.added + t.loc.added, removed: acc.removed + t.loc.removed }),
    { added: 0, removed: 0 },
  );
  const lintTotal = devTasks.reduce(
    (acc, t) => ({
      blocker: acc.blocker + t.lintIssues.blocker,
      major: acc.major + t.lintIssues.major,
      minor: acc.minor + t.lintIssues.minor,
    }),
    { blocker: 0, major: 0, minor: 0 },
  );
  const pipelineGreen = pipelineRuns.filter((p) => p.status === 'success').length;
  const pipelineRed = pipelineRuns.filter((p) => p.status === 'failed').length;

  // 测试
  const executed = testCases.filter((t) => t.lastRun.status !== 'not-run').length;
  const tcByType = ['功能', '接口', '性能', '安全', '兼容性', '异常'].map((type) => ({
    type,
    count: testCases.filter((t) => t.type === type).length,
  }));
  const tcByRunStatus = (['passed', 'failed', 'blocked', 'not-run'] as const).map((s) => ({
    status: s,
    count: testCases.filter((t) => t.lastRun.status === s).length,
  }));
  const autoRate = Math.round((testCases.filter((t) => t.automated).length / testCases.length) * 100);

  // 缺陷
  const defectOpen = defects.filter((d) => d.status !== '已关闭' && d.status !== '已拒绝').length;
  const defectBySeverity = ['致命', '严重', '一般', '轻微'].map((sev) => ({
    severity: sev,
    total: defects.filter((d) => d.severity === sev).length,
    open: defects.filter((d) => d.severity === sev && d.status !== '已关闭').length,
  }));
  const defectByModule = Object.entries(
    defects.reduce<Record<string, number>>((acc, d) => {
      acc[d.module] = (acc[d.module] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count);
  const p0Defects = defects.filter((d) => d.priority === 'P0' && d.status !== '已关闭').length;

  return {
    approved: approved.length,
    rejected: rejected.length,
    pending: pending.length,
    byPriority,
    byChannel,
    approvalRate,
    commentTotal: allComments.length,
    commentClosed,
    commentClosedRate: Math.round((commentClosed / allComments.length) * 100),
    levels,
    totalPoints,
    avgDocScore,
    gradeDist,
    adrAccepted,
    qualityMet,
    qualityTotal: qualityAttributes.length,
    followUpsTotal: followUps.length,
    followUpsDone,
    apiTotal,
    tableTotal,
    designIssuesOpen,
    devDone,
    devInProgress,
    devBlocked,
    avgCoverage,
    totalLoc,
    lintTotal,
    pipelineGreen,
    pipelineRed,
    executed,
    tcByType,
    tcByRunStatus,
    autoRate,
    defectOpen,
    defectBySeverity,
    defectByModule,
    p0Defects,
  };
})();

/* ============================ 阶段导航 ============================ */

export interface StageNavItem {
  key: StageKey;
  /** 路由路径 */
  path: string;
  name: string;
  shortName: string;
  icon: string;
  index: number;
  status: 'done' | 'active' | 'pending' | 'blocked';
  progress: number;
  owner: string;
  /** 分组：需求域 / 架构域 / 交付域 */
  group: string;
  /** 侧边栏一行摘要 */
  hint: string;
}

export const stageNav: StageNavItem[] = [
  { key: 'intake', path: '/intake', name: '需求输入', shortName: '输入', icon: 'inbox', index: 1, status: 'done', progress: 100, owner: '沈亦云', group: '需求域', hint: '24 条 · 6 渠道' },
  { key: 'review', path: '/review', name: '需求评审', shortName: '评审', icon: 'clipboard', index: 2, status: 'done', progress: 100, owner: '陈砚舟', group: '需求域', hint: '3 轮 · 通过 21' },
  { key: 'breakdown', path: '/breakdown', name: '需求分解', shortName: '分解', icon: 'branch', index: 3, status: 'done', progress: 100, owner: '沈亦云', group: '需求域', hint: '112 项 · 386 点' },
  { key: 'scoring', path: '/scoring', name: '文档打分', shortName: '打分', icon: 'star', index: 4, status: 'done', progress: 100, owner: '陈砚舟', group: '需求域', hint: '6 份 · 均分 86.3' },
  { key: 'analysis', path: '/analysis', name: '需求分析', shortName: '分析', icon: 'search', index: 5, status: 'done', progress: 100, owner: '沈亦云', group: '需求域', hint: '5 冲突 · 21 依赖' },
  { key: 'arch-design', path: '/arch-design', name: '架构设计', shortName: '架构', icon: 'layers', index: 6, status: 'done', progress: 100, owner: '陆见明', group: '架构域', hint: '18 组件 · 9 ADR' },
  { key: 'arch-review', path: '/arch-review', name: '架构评审', shortName: '架评', icon: 'shield', index: 7, status: 'done', progress: 100, owner: '陈砚舟', group: '架构域', hint: '6 维度 · 4 待办' },
  { key: 'detail-design', path: '/detail-design', name: '方案详细设计', shortName: '详设', icon: 'file', index: 8, status: 'done', progress: 100, owner: '许知微', group: '架构域', hint: '12 份 · 64 接口' },
  { key: 'development', path: '/development', name: '方案开发', shortName: '开发', icon: 'code', index: 9, status: 'active', progress: 62, owner: '许知微', group: '交付域', hint: '53/86 任务完成' },
  { key: 'testing', path: '/testing', name: '项目测试', shortName: '测试', icon: 'bug', index: 10, status: 'pending', progress: 18, owner: '林晚舟', group: '交付域', hint: '执行率 18.2%' },
];

/* ============================ 通用格式化 ============================ */

export const fmt = {
  pct: (n: number, digits = 0) => `${n.toFixed(digits)}%`,
  num: (n: number) => n.toLocaleString('zh-CN'),
  k: (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n.toLocaleString('zh-CN')),
  date: (s: string) => (s === '-' ? '—' : s),
  duration: (sec: number) => {
    if (sec <= 0) return '—';
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m${sec % 60 ? ` ${sec % 60}s` : ''}`;
    return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  },
  ms: (ms: number) => (ms <= 0 ? '—' : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`),
};

/* ============================ 状态字典 ============================ */

export const priorityTone: Record<Priority, string> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'info',
  P3: 'neutral',
};

export const statusLabel: Record<FlowStatus, string> = {
  draft: '草稿',
  submitted: '已提交',
  reviewing: '评审中',
  approved: '已通过',
  rejected: '已驳回',
  changes: '待修改',
  'in-progress': '进行中',
  pending: '待开始',
  done: '已完成',
  blocked: '已阻塞',
};

export const statusTone: Record<FlowStatus, string> = {
  draft: 'neutral',
  submitted: 'info',
  reviewing: 'warning',
  approved: 'success',
  rejected: 'danger',
  changes: 'warning',
  'in-progress': 'brand',
  pending: 'neutral',
  done: 'success',
  blocked: 'danger',
};

export const riskTone: Record<string, string> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

export const riskLabel: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
};

export const stageStatusTone: Record<string, string> = {
  done: 'success',
  active: 'brand',
  pending: 'neutral',
  blocked: 'danger',
};

export const stageStatusLabel: Record<string, string> = {
  done: '已完成',
  active: '进行中',
  pending: '未开始',
  blocked: '已阻塞',
};

export { type Priority, type FlowStatus, type StageKey };
