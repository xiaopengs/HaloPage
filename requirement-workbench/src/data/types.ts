/**
 * 类型定义 —— 项目级研发工作台领域模型
 * 覆盖：需求输入 → 需求评审 → 需求分解 → 文档打分 → 需求分析
 *      → 架构设计 → 架构评审 → 方案详细设计 → 方案开发 → 项目测试
 */

/* ============================ 基础枚举 ============================ */

export type StageKey =
  | 'intake'
  | 'review'
  | 'breakdown'
  | 'scoring'
  | 'analysis'
  | 'arch-design'
  | 'arch-review'
  | 'detail-design'
  | 'development'
  | 'testing';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/** 通用工作流状态 */
export type FlowStatus =
  | 'draft'        // 草稿
  | 'submitted'    // 已提交
  | 'reviewing'    // 评审中
  | 'approved'     // 已通过
  | 'rejected'     // 已驳回
  | 'changes'      // 待修改
  | 'in-progress'  // 进行中
  | 'pending'      // 待开始
  | 'done'         // 已完成
  | 'blocked';     // 已阻塞

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ReviewVerdict = 'pass' | 'conditional' | 'reject' | 'pending';

/* ============================ 需求域 ============================ */

/** 需求来源渠道 */
export interface RequirementSource {
  channel: '客户访谈' | '工单洞察' | '竞品分析' | '内部规划' | '数据埋点' | '合规要求';
  /** 原始录入人 */
  submitter: string;
  /** 提出方 */
  origin: string;
  /** 关联证据材料数 */
  evidences: number;
}

export interface Requirement {
  id: string;              // REQ-2026-001
  title: string;
  summary: string;
  priority: Priority;
  status: FlowStatus;
  source: RequirementSource;
  /** 业务价值 1-5 */
  businessValue: number;
  /** 实现成本 1-5（越小越易） */
  effort: number;
  /** 紧急度 1-5 */
  urgency: number;
  /** 价值分 = businessValue*0.5 + urgency*0.3 + (6-effort)*0.2，1 位小数 */
  score: number;
  tags: string[];
  /** 期望上线 */
  targetRelease: string;
  createdAt: string;
  owner: string;
  /** 验收标准 */
  acceptance: string[];
  /** 与此需求关联的其他需求 ID */
  related: string[];
}

/** 需求评审会议 */
export interface ReviewSession {
  id: string;
  requirementIds: string[];
  round: number;
  scheduledAt: string;
  durationMin: number;
  chair: string;
  attendees: { name: string; role: string; joined: boolean }[];
  status: '待评审' | '进行中' | '已结束';
  verdict: ReviewVerdict;
  /** 评审意见 */
  comments: ReviewComment[];
  /** 会议纪要要点 */
  minutes: string[];
}

export interface ReviewComment {
  id: string;
  requirementId: string;
  author: string;
  role: string;
  /** 严重程度 */
  severity: 'blocker' | 'major' | 'minor' | 'suggestion';
  dimension: '业务价值' | '可行性' | '完整性' | '一致性' | '合规性' | '可测性';
  content: string;
  createdAt: string;
  resolved: boolean;
  reply?: string;
}

/* ============================ 需求分解 ============================ */

/** 分解层级：史诗 / 特性 / 用户故事 / 任务 */
export type WorkItemLevel = 'epic' | 'feature' | 'story' | 'task';

export interface WorkItem {
  id: string;
  parentId: string | null;
  level: WorkItemLevel;
  title: string;
  requirementId: string;
  /** 故事点 */
  points: number;
  assignee: string;
  status: FlowStatus;
  /** 拆分质量自检 */
  invest: {
    independent: boolean;
    negotiable: boolean;
    valuable: boolean;
    estimable: boolean;
    small: boolean;
    testable: boolean;
  };
  sprint: string;
  acceptance: string[];
}

/** 迭代（Sprint） */
export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  goal: string;
  capacity: number;   // 可用故事点
  committed: number;  // 承诺故事点
  completed: number;  // 已完成故事点
  status: '未开始' | '进行中' | '已结束';
}

/* ============================ 文档打分 ============================ */

export interface DocScoreDimension {
  key: string;
  label: string;
  weight: number;      // 权重（合计 1）
  score: number;       // 0-100
  description: string;
  /** 该维度的问题清单 */
  findings: string[];
}

export interface RequirementDoc {
  id: string;          // DOC-REQ-001
  name: string;
  requirementIds: string[];
  version: string;
  author: string;
  updatedAt: string;
  /** 综合得分（加权） */
  totalScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
  status: '待打分' | '已打分' | '需返工';
  dimensions: DocScoreDimension[];
  /** 评审人意见 */
  reviewers: { name: string; score: number; comment: string }[];
  /** 建议动作 */
  actions: string[];
}

/* ============================ 需求分析 ============================ */

export interface AnalysisModel {
  /** 需求价值矩阵散点 */
  valueMatrix: { id: string; title: string; value: number; effort: number; quadrant: string }[];
  /** 需求依赖关系（用于识别耦合） */
  dependencies: { from: string; to: string; type: '依赖' | '冲突' | '重复' }[];
  /** 影响面分析 */
  impact: {
    system: string;
    changeType: '新增' | '改造' | '下线';
    affectedModules: number;
    riskLevel: RiskLevel;
    owner: string;
  }[];
  /** 一致性检查结果 */
  conflicts: {
    id: string;
    type: '语义冲突' | '边界重叠' | '术语不一致' | '优先级冲突';
    involved: string[];
    description: string;
    suggestion: string;
    severity: RiskLevel;
  }[];
  /** 用户旅程阶段覆盖率 */
  journeyCoverage: { stage: string; covered: number; total: number }[];
}

/* ============================ 架构设计 ============================ */

export interface ArchDecision {
  id: string;          // ADR-001
  title: string;
  status: '提议' | '已接受' | '已废弃' | '被替代';
  context: string;
  decision: string;
  consequences: string;
  alternatives: { name: string; pros: string; cons: string; rejectedReason: string }[];
  decidedAt: string;
  owner: string;
  /** 关联需求 */
  requirementIds: string[];
}

export interface ArchComponent {
  id: string;
  name: string;
  layer: '接入层' | '应用层' | '领域层' | '数据层' | '基础设施';
  type: '服务' | '网关' | '中间件' | '存储' | '任务' | '前端';
  responsibility: string;
  techStack: string[];
  /** 关联需求覆盖数 */
  covers: number;
  status: '规划中' | '设计中' | '已定稿';
  owner: string;
  /** 关键质量属性 */
  quality: { availability: string; throughput: string; latency: string };
}

/** 架构质量属性场景 */
export interface QualityAttribute {
  id: string;
  attribute: '性能' | '可用性' | '可扩展性' | '安全性' | '可维护性' | '成本';
  scenario: string;
  target: string;
  current: string;
  met: boolean;
  owner: string;
}

/** 架构评审 */
export interface ArchReviewItem {
  id: string;
  dimension: '架构合理性' | '技术选型' | '性能容量' | '安全合规' | '可运维性' | '成本投入';
  question: string;
  /** 答辩结论 */
  conclusion: string;
  verdict: ReviewVerdict;
  reviewer: string;
  riskLevel: RiskLevel;
  /** 遗留待办 */
  followUps: { id: string; content: string; owner: string; dueDate: string; done: boolean }[];
}

/* ============================ 详细设计 ============================ */

export interface DesignDoc {
  id: string;          // DD-001
  name: string;
  module: string;
  requirementIds: string[];
  author: string;
  status: '草稿' | '评审中' | '已定稿';
  version: string;
  updatedAt: string;
  /** 设计要素完备度自检 */
  checklist: { item: string; done: boolean }[];
  /** 接口定义 */
  apis: {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    summary: string;
    /** 变更类型 */
    change: '新增' | '修改' | '废弃';
    /** 幂等 */
    idempotent: boolean;
    /** 预估 QPS */
    qps: number;
    /** P99 目标 ms */
    p99: number;
  }[];
  /** 数据模型 */
  tables: {
    name: string;
    comment: string;
    fields: { name: string; type: string; nullable: boolean; comment: string; indexed: boolean }[];
    estimatedRows: string;
  }[];
  /** 时序/流程要点 */
  flows: { name: string; steps: string[]; failureHandling: string }[];
  /** 非功能设计 */
  nonFunctional: { dimension: string; design: string }[];
  /** 设计评审问题 */
  issues: { id: string; severity: 'blocker' | 'major' | 'minor'; content: string; status: 'open' | 'closed' }[];
}

/* ============================ 开发 ============================ */

export interface DevTask {
  id: string;          // TASK-xxx / 也可关联 JIRA 单号
  title: string;
  storyId: string;
  designDocId: string;
  module: string;
  dev: string;
  reviewer: string;
  status: FlowStatus;
  /** 代码行数变更 */
  loc: { added: number; removed: number };
  branch: string;
  /** 关联提交 */
  commits: number;
  /** 关联 MR/PR */
  mr?: { id: string; url: string; status: 'open' | 'merged' | 'closed'; approvals: number };
  /** 单测覆盖率 */
  coverage: number;
  /** 静态扫描问题数 */
  lintIssues: { blocker: number; major: number; minor: number };
  startDate: string;
  dueDate: string;
  /** 是否阻塞及原因 */
  blocker?: string;
}

export interface PipelineRun {
  id: string;
  branch: string;
  stage: '编译' | '单测' | '静态扫描' | '镜像构建' | '部署预发' | '自动化测试';
  status: 'success' | 'failed' | 'running' | 'queued';
  durationSec: number;
  triggeredBy: string;
  finishedAt: string;
  /** 失败原因 */
  failure?: string;
}

/* ============================ 测试 ============================ */

export interface TestCase {
  id: string;          // TC-xxxx
  title: string;
  storyId: string;
  requirementId: string;
  type: '功能' | '接口' | '性能' | '安全' | '兼容性' | '异常';
  priority: Priority;
  /** 前置条件 */
  preconditions: string[];
  /** 步骤 */
  steps: string[];
  /** 预期结果 */
  expected: string;
  /** 最近执行结果 */
  lastRun: {
    status: 'passed' | 'failed' | 'blocked' | 'skipped' | 'not-run';
    at: string;
    executor: string;
    durationMs: number;
    /** 失败时的实际结果 */
    actual?: string;
  };
  automated: boolean;
  /** 自动化脚本路径 */
  script?: string;
  owner: string;
}

export interface Defect {
  id: string;          // BUG-xxxx
  title: string;
  requirementId: string;
  testCaseId?: string;
  module: string;
  severity: '致命' | '严重' | '一般' | '轻微';
  priority: Priority;
  status: '新建' | '已确认' | '修复中' | '待验证' | '已关闭' | '已拒绝';
  /** 缺陷来源 */
  foundAt: '提测' | '回归' | '预发' | '生产';
  reporter: string;
  assignee: string;
  createdAt: string;
  closedAt?: string;
  /** 复现概率 */
  reproducibility: '必现' | '大概率' | '偶现';
  steps: string[];
  /** 根因 */
  rootCause?: string;
  /** 修复关联提交 */
  fixedBy?: string[];
}

export interface TestPlan {
  id: string;
  name: string;
  sprint: string;
  startDate: string;
  endDate: string;
  scope: string[];
  outOfScope: string[];
  entryCriteria: string[];
  exitCriteria: string[];
  /** 环境信息 */
  environments: { name: string; purpose: string; status: '可用' | '维护中' }[];
  /** 进度 */
  progress: { total: number; passed: number; failed: number; blocked: number; notRun: number };
  /** 风险 */
  risks: { risk: string; impact: RiskLevel; mitigation: string }[];
  owner: string;
  status: '未开始' | '执行中' | '已完成';
}

/* ============================ 项目总览 ============================ */

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  /** 当前所处阶段 */
  currentStage: StageKey;
  owner: string;
  team: { name: string; role: string; avatarTone: string }[];
  startDate: string;
  targetDate: string;
  health: '健康' | '存在风险' | '严重延期';
  /** 阶段进度 */
  stages: StageProgress[];
  /** 关键指标 */
  metrics: {
    requirementCount: number;
    approvedRequirementCount: number;
    storyPoints: number;
    completedPoints: number;
    testCaseCount: number;
    automationRate: number;
    defectOpen: number;
    defectTotal: number;
    bugRate: number;          // 每千行缺陷密度
    coverage: number;
  };
  /** 里程碑 */
  milestones: { name: string; date: string; status: '已完成' | '进行中' | '未开始'; owner: string }[];
  /** 风险登记册 */
  risks: {
    id: string;
    title: string;
    level: RiskLevel;
    probability: '高' | '中' | '低';
    impactDesc: string;
    mitigation: string;
    owner: string;
    status: '跟踪中' | '已缓解' | '已关闭';
  }[];
  /** 变更请求 */
  changeRequests: {
    id: string;
    title: string;
    reason: string;
    impact: string;
    requester: string;
    status: '待评估' | '已批准' | '已拒绝';
    submittedAt: string;
    /** 对工期影响（人日） */
    scheduleImpact: number;
  }[];
}

export interface StageProgress {
  key: StageKey;
  name: string;
  icon: string;
  status: 'done' | 'active' | 'pending' | 'blocked';
  /** 该阶段完成度 0-100 */
  progress: number;
  /** 阶段入口/出口统计 */
  summary: string;
  owner: string;
  startDate: string;
  endDate: string;
  /** 该阶段的门禁检查项 */
  gates: { name: string; passed: boolean; detail: string }[];
  /** 该阶段交付物 */
  deliverables: { name: string; count: number; status: string }[];
}
