import type { TestPlan } from './types';

/* ==================================================================
   测试计划
   ================================================================== */

export const testPlan: TestPlan = {
  id: 'TP-2026-03',
  name: '智能客服中台 v2.0 一期系统测试计划',
  sprint: 'SP-02 ~ SP-03',
  startDate: '2026-09-15',
  endDate: '2026-10-30',
  scope: [
    '统一接入网关（五渠道消息收发、协议归一化、灰度分流）',
    '两级意图识别引擎（准确率、时延、降级链路）',
    '知识检索与段落级溯源',
    '多租户隔离与配额限流',
    '安全护栏三重校验',
    '坐席辅助面板与智能路由',
    '全链路可观测性与灰度回滚',
  ],
  outOfScope: [
    '情绪识别（v2.0.1 交付）',
    '运营数据看板（v2.0.1 交付）',
    '第三方开放 API 网关（v2.1.0 交付）',
    '实时话术推荐（CR-014 待评估）',
  ],
  entryCriteria: [
    '冒烟用例 42 条全部通过',
    '代码静态扫描无 Blocker 级问题',
    '单元测试覆盖率 ≥75%',
    '详细设计已定稿且接口契约冻结',
  ],
  exitCriteria: [
    '用例执行率 ≥95%',
    'P0/P1 缺陷全部关闭',
    'P2 缺陷关闭率 ≥90%',
    '性能压测 P99 ≤400ms 达标',
    '安全渗透测试无高危漏洞',
  ],
  environments: [
    { name: 'DEV', purpose: '开发自测', status: '可用' },
    { name: 'TEST', purpose: '功能测试', status: '可用' },
    { name: 'STAGING', purpose: '预发验收 / 性能压测', status: '维护中' },
    { name: 'PROD-GRAY', purpose: '灰度环境（5% 流量）', status: '可用' },
  ],
  progress: { total: 412, passed: 62, failed: 9, blocked: 4, notRun: 337 },
  risks: [
    { risk: '预发环境与另一项目资源争抢，压测窗口受限', impact: 'high', mitigation: '已申请独立命名空间，获批 10/18-10/20 独占窗口' },
    { risk: '意图识别准确率评测集仅 8000 条，边界样本不足', impact: 'medium', mitigation: '补充 2000 条线上真实样本（脱敏后）' },
    { risk: '多租户隔离缺乏专项渗透测试资源', impact: 'high', mitigation: '已协调安全团队 10/15 进场' },
    { risk: '存量 12 条业务线数据口径不一致，回归范围可能扩大', impact: 'high', mitigation: '逐业务线对齐映射表，优先保障 5 条核心业务线' },
  ],
  owner: '林晚舟',
  status: '执行中',
};
