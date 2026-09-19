import type {
  ArchDecision, ArchComponent, QualityAttribute, ArchReviewItem,
  DesignDoc, DevTask, PipelineRun,
} from './types';

/* ==================================================================
   架构设计 —— 架构决策记录 ADR
   ================================================================== */

export const archDecisions: ArchDecision[] = [
  {
    id: 'ADR-001',
    title: '采用网关统一协议 + 适配器模式收敛多渠道路由',
    status: '已接受',
    context: '当前 5 个渠道各自实现会话逻辑，新增渠道平均需 22 人日，且行为不一致导致测试成本高。',
    decision: '建立统一消息协议 GatewayMessage v1，各渠道以适配器实现双向转换，核心链路只处理标准协议。',
    consequences: '新增渠道成本降至 5 人日以内；引入一次协议转换开销（实测 <3ms）；需维护协议版本兼容性。',
    alternatives: [
      { name: '直接对接各渠道 SDK', pros: '无转换开销', cons: '渠道逻辑散落，无法统一治理', rejectedReason: '重复建设，长期维护成本高' },
      { name: '使用商业 CPaaS 平台', pros: '开箱即用', cons: '年费高，定制能力受限，数据出境风险', rejectedReason: '合规与成本双重不成立' },
    ],
    decidedAt: '2026-07-04',
    owner: '陆见明',
    requirementIds: ['REQ-2026-001', 'REQ-2026-008'],
  },
  {
    id: 'ADR-002',
    title: '意图识别采用「小模型预分类 + 大模型兜底」两级架构',
    status: '已接受',
    context: '单一大模型方案 P99 达 820ms，无法满足 400ms SLA；纯小模型准确率仅 84%，达不到 92% 目标。',
    decision: '第一级用小模型（蒸馏版 BERT）做 Top-20 意图粗分类，置信度 ≥0.75 直接返回；低于阈值转第二级大模型精判。实测 78% 流量在第一级命中。',
    consequences: '整体 P99 降至约 380ms；准确率维持 92.4%；需维护两套模型的版本一致性；两级模型指标需统一监控。',
    alternatives: [
      { name: '纯大模型 + 蒸馏加速', pros: '架构简单，准确率上限高', cons: '推理成本高 3.2 倍，时延仍难达标', rejectedReason: '成本与 SLA 双不达标' },
      { name: '纯规则树 + 关键词', pros: '时延极低', cons: '准确率上限低，无法处理多轮语义', rejectedReason: '即 v1.x 现状，已被证明不可持续' },
    ],
    decidedAt: '2026-07-08',
    owner: '陆见明',
    requirementIds: ['REQ-2026-002'],
  },
  {
    id: 'ADR-003',
    title: '会话存档采用冷热分层：SSD 3 个月 + 对象存储 33 个月',
    status: '已接受',
    context: '合规要求会话保留 36 个月，年均会话量 2.4 亿条，全量热存年成本超预算 280%。',
    decision: '近 3 个月会话存 SSD 集群支持在线检索；超过 3 个月转对象存储，按需异步恢复，恢复 SLA ≤30 分钟。',
    consequences: '存储成本下降约 62%；冷数据检索需异步恢复，不满足实时查询；需实现自动分层任务与完整性校验。',
    alternatives: [
      { name: '全量热存', pros: '检索体验一致', cons: '成本超预算 280%', rejectedReason: '成本不可接受' },
      { name: '全量对象存储', pros: '成本最低', cons: '近期会话检索延迟高，影响质检效率', rejectedReason: '影响核心质检场景' },
    ],
    decidedAt: '2026-07-05',
    owner: '苏景澄',
    requirementIds: ['REQ-2026-003'],
  },
  {
    id: 'ADR-004',
    title: '安全护栏统一为 OutputGuard 后置组件，避免重复校验',
    status: '已接受',
    context: '评审发现 REQ-014 与 REQ-002 存在校验逻辑重叠，若各自实现会导致同一内容被校验两次，时延叠加约 40ms。',
    decision: '将敏感词、事实性、合规性三重校验统一收敛到 OutputGuard 组件，位于模型输出之后、消息下发之前，单次串行执行。',
    consequences: '校验时延稳定在 42ms 以内；护栏策略可独立配置与灰度；成为链路单点，需保证高可用（多副本 + 本地降级策略）。',
    alternatives: [
      { name: '各模块自行校验', pros: '模块自治', cons: '重复校验、策略不一致、时延叠加', rejectedReason: '评审专家一致反对' },
      { name: '在模型侧内联校验', pros: '少一跳网络', cons: '模型与策略强耦合，策略变更需重新部署', rejectedReason: '运维灵活性差' },
    ],
    decidedAt: '2026-07-12',
    owner: '陆见明',
    requirementIds: ['REQ-2026-014', 'REQ-2026-002'],
  },
  {
    id: 'ADR-005',
    title: '多租户采用共享资源池 + 令牌桶配额，而非独立资源池',
    status: '已接受',
    context: '初版设计为每业务线独立资源池，评估 12 条业务线需 36 台 8C16G 实例，成本较共享方案高约 40%。',
    decision: '所有租户共享底层资源池，通过网关侧令牌桶实施 QPS 与并发配额，配合优先级队列保障关键业务线。',
    consequences: '资源成本下降 40%；存在噪声邻居风险，需完善配额监控与熔断；关键租户需额外保障策略。',
    alternatives: [
      { name: '独立资源池', pros: '隔离彻底，无噪声邻居', cons: '成本高 40%，资源利用率低', rejectedReason: '成本不成立' },
      { name: '物理隔离（独立集群）', pros: '隔离最强，满足强监管场景', cons: '成本数倍，运维复杂度高', rejectedReason: '当前无强监管要求' },
    ],
    decidedAt: '2026-07-10',
    owner: '许知微',
    requirementIds: ['REQ-2026-007'],
  },
  {
    id: 'ADR-006',
    title: '渠道插件采用独立 ClassLoader 热加载',
    status: '已接受',
    context: '插件化要求支持不重启核心服务的动态加载，需在进程内隔离与资源开销间权衡。',
    decision: '每个插件使用独立 ClassLoader 加载，通过 SPI 注册扩展点；插件异常通过熔断器隔离，不影响主链路。',
    consequences: '插件加载耗时 ≤8s；存在类加载泄露风险，需在卸载时显式释放；限制插件可用 API 范围。',
    alternatives: [
      { name: 'Sidecar 进程隔离', pros: '隔离彻底', cons: '资源开销大，通信引入额外时延', rejectedReason: '开销与复杂度偏高' },
      { name: '纯 SPI 静态加载', pros: '实现简单', cons: '需重启，不满足需求', rejectedReason: '不满足需求' },
    ],
    decidedAt: '2026-07-06',
    owner: '许知微',
    requirementIds: ['REQ-2026-008'],
  },
  {
    id: 'ADR-007',
    title: '全链路追踪采用 OpenTelemetry + 自建 Collector 集群',
    status: '已接受',
    context: '可观测性需覆盖网关到模型推理的 11 跳链路，现有 APM 对模型推理链路支持不完整。',
    decision: '统一接入 OpenTelemetry SDK，自建 Collector 集群做采样与转发，错误链路 100% 采样，正常链路 5% 采样。',
    consequences: '具备跨语言、跨组件的统一追踪能力；需自建存储（Trace 量约 12TB/月）；采样策略需随流量动态调整。',
    alternatives: [
      { name: '采购商业 APM', pros: '开箱即用', cons: '模型链路埋点需定制，年费高', rejectedReason: '定制能力不足且成本高' },
      { name: '沿用现有日志方案', pros: '无迁移成本', cons: '无法还原全链路，排障效率低', rejectedReason: '不满足排障要求' },
    ],
    decidedAt: '2026-07-09',
    owner: '傅青野',
    requirementIds: ['REQ-2026-017'],
  },
  {
    id: 'ADR-008',
    title: '采用分层实验框架支撑 A/B 实验',
    status: '已接受',
    context: '模型迭代需要常态化 A/B 实验，但多个实验并行时存在流量相互污染风险。',
    decision: '采用分层实验框架：实验层内流量互斥，层间流量正交，层间配比 5% 粒度可调。',
    consequences: '支持多实验并行且互不干扰；需要统一实验平台与埋点规范；模型指标需按实验维度拆分统计。',
    alternatives: [
      { name: '简单按用户尾号取模', pros: '实现简单', cons: '多实验并行必冲突', rejectedReason: '无法支撑并行实验' },
    ],
    decidedAt: '2026-07-11',
    owner: '苏景澄',
    requirementIds: ['REQ-2026-020'],
  },
  {
    id: 'ADR-009',
    title: '向量数据库选型待定，暂用 Qdrant 过渡以保证不阻塞开发',
    status: '提议',
    context: '初选 Milvus 在 5000 万向量规模下召回率下降 9pp；候选方案有 Qdrant 与自建 FAISS 服务，评估尚未完成（见 CR-015）。',
    decision: '过渡期采用 Qdrant 2.x 支撑开发与一期交付，同时并行评估替代方案，11 月中旬前完成定稿。',
    consequences: '开发不阻塞；存在中期迁移成本（预估 12 人日）；需在数据访问层做抽象隔离以便替换。',
    alternatives: [
      { name: 'Milvus 2.4', pros: '社区活跃，生态成熟', cons: '大规模召回率不达标', rejectedReason: '实测指标不满足' },
      { name: '自建 FAISS 服务', pros: '性能可控，无许可成本', cons: '需自研分布式与运维，投入大', rejectedReason: '投入产出比待评估' },
    ],
    decidedAt: '2026-09-12',
    owner: '陆见明',
    requirementIds: ['REQ-2026-004'],
  },
];

/* ==================================================================
   架构组件
   ================================================================== */

export const archComponents: ArchComponent[] = [
  { id: 'CMP-01', name: '统一接入网关', layer: '接入层', type: '网关', responsibility: '多渠道协议归一化、鉴权、限流、灰度分流', techStack: ['Go 1.22', 'Envoy', 'Redis'], covers: 4, status: '已定稿', owner: '许知微', quality: { availability: '99.99%', throughput: '12k QPS', latency: 'P99 ≤20ms' } },
  { id: 'CMP-02', name: '渠道适配插件容器', layer: '接入层', type: '中间件', responsibility: '插件热加载、ClassLoader 隔离、异常熔断', techStack: ['Java 21', 'SPI', 'Resilience4j'], covers: 3, status: '已定稿', owner: '许知微', quality: { availability: '99.95%', throughput: '—', latency: '加载 ≤8s' } },
  { id: 'CMP-03', name: '鉴权与租户上下文服务', layer: '接入层', type: '服务', responsibility: 'OAuth2 鉴权、租户识别、配额令牌桶', techStack: ['Go 1.22', 'Redis', 'JWT'], covers: 2, status: '已定稿', owner: '许知微', quality: { availability: '99.99%', throughput: '15k QPS', latency: 'P99 ≤10ms' } },
  { id: 'CMP-04', name: '会话编排引擎', layer: '应用层', type: '服务', responsibility: '多轮会话状态机、上下文管理、流程编排', techStack: ['Java 21', 'Spring Boot', 'Temporal'], covers: 6, status: '已定稿', owner: '许知微', quality: { availability: '99.95%', throughput: '8k QPS', latency: 'P99 ≤60ms' } },
  { id: 'CMP-05', name: '意图识别服务（两级）', layer: '领域层', type: '服务', responsibility: '小模型粗分类 + 大模型精判，槽位抽取', techStack: ['Python 3.11', 'vLLM', 'ONNX Runtime'], covers: 5, status: '设计中', owner: '陆见明', quality: { availability: '99.9%', throughput: '3k QPS', latency: 'P99 380ms（目标 400ms）' } },
  { id: 'CMP-06', name: '知识检索与溯源服务', layer: '领域层', type: '服务', responsibility: '向量召回、重排、段落级溯源', techStack: ['Python 3.11', 'Qdrant', 'BGE-Reranker'], covers: 4, status: '设计中', owner: '苏景澄', quality: { availability: '99.9%', throughput: '2k QPS', latency: 'P99 ≤180ms' } },
  { id: 'CMP-07', name: '安全护栏 OutputGuard', layer: '领域层', type: '服务', responsibility: '敏感词、事实性、合规性三重输出校验', techStack: ['Go 1.22', 'AC 自动机', 'LLM Judge'], covers: 3, status: '已定稿', owner: '陆见明', quality: { availability: '99.99%', throughput: '10k QPS', latency: 'P99 ≤42ms' } },
  { id: 'CMP-08', name: '智能路由调度服务', layer: '领域层', type: '服务', responsibility: '转人工路由、技能匹配、负载均衡', techStack: ['Go 1.22', 'Redis'], covers: 2, status: '设计中', owner: '许知微', quality: { availability: '99.95%', throughput: '5k QPS', latency: 'P99 ≤50ms' } },
  { id: 'CMP-09', name: '客户画像聚合服务', layer: '领域层', type: '服务', responsibility: '跨业务线画像聚合、标签计算', techStack: ['Java 21', 'Flink', 'ClickHouse'], covers: 2, status: '设计中', owner: '苏景澄', quality: { availability: '99.9%', throughput: '4k QPS', latency: 'P99 ≤300ms' } },
  { id: 'CMP-10', name: '工单自动化服务', layer: '应用层', type: '服务', responsibility: '工单生成、分类、派单', techStack: ['Java 21', 'RabbitMQ'], covers: 2, status: '设计中', owner: '许知微', quality: { availability: '99.9%', throughput: '1k QPS', latency: 'P99 ≤500ms' } },
  { id: 'CMP-11', name: '质检规则引擎', layer: '应用层', type: '服务', responsibility: '规则解析执行、实时质检、批量抽检', techStack: ['Java 21', 'Drools', 'Flink'], covers: 3, status: '规划中', owner: '周砚白', quality: { availability: '99.9%', throughput: '50 万条/日', latency: '实时 ≤2s' } },
  { id: 'CMP-12', name: '会话存档服务', layer: '数据层', type: '存储', responsibility: '会话落库、冷热分层、检索', techStack: ['Elasticsearch', '对象存储', 'TiDB'], covers: 3, status: '已定稿', owner: '苏景澄', quality: { availability: '99.99%', throughput: '写入 20k TPS', latency: '检索 P99 ≤2s' } },
  { id: 'CMP-13', name: '知识库存储', layer: '数据层', type: '存储', responsibility: '知识文档、向量索引、版本管理', techStack: ['Qdrant', 'PostgreSQL', 'MinIO'], covers: 3, status: '设计中', owner: '苏景澄', quality: { availability: '99.9%', throughput: '—', latency: '检索 P99 ≤180ms' } },
  { id: 'CMP-14', name: '实时事件总线', layer: '基础设施', type: '中间件', responsibility: '会话事件分发、质检订阅、流式处理', techStack: ['Kafka 3.7', 'Flink'], covers: 5, status: '已定稿', owner: '傅青野', quality: { availability: '99.99%', throughput: '50k TPS', latency: 'P99 ≤100ms' } },
  { id: 'CMP-15', name: '可观测性平台', layer: '基础设施', type: '中间件', responsibility: 'Trace、指标、日志统一采集与告警', techStack: ['OpenTelemetry', 'VictoriaMetrics', 'Loki'], covers: 2, status: '设计中', owner: '傅青野', quality: { availability: '99.9%', throughput: '12TB/月', latency: '告警 ≤1min' } },
  { id: 'CMP-16', name: '配置中心', layer: '基础设施', type: '中间件', responsibility: '动态配置、灰度开关、实验分流', techStack: ['Nacos', 'Apollo'], covers: 4, status: '已定稿', owner: '傅青野', quality: { availability: '99.99%', throughput: '—', latency: '推送 ≤30s' } },
  { id: 'CMP-17', name: '坐席辅助前端', layer: '接入层', type: '前端', responsibility: '坐席面板、话术推荐、画像展示', techStack: ['React 19', 'Vite', 'Module Federation'], covers: 2, status: '设计中', owner: '周砚白', quality: { availability: '99.9%', throughput: '—', latency: '加载 ≤1.5s' } },
  { id: 'CMP-18', name: '运营管理后台', layer: '接入层', type: '前端', responsibility: '知识运营、规则配置、数据看板', techStack: ['React 19', 'Vite', 'ECharts'], covers: 6, status: '设计中', owner: '周砚白', quality: { availability: '99.9%', throughput: '—', latency: '首屏 ≤2s' } },
];

/* ==================================================================
   质量属性场景
   ================================================================== */

export const qualityAttributes: QualityAttribute[] = [
  { id: 'QA-01', attribute: '性能', scenario: '每秒 8000 并发会话请求下，意图识别端到端响应', target: 'P99 ≤400ms', current: 'P99 820ms（未达标）', met: false, owner: '傅青野' },
  { id: 'QA-02', attribute: '可用性', scenario: '单可用区故障时服务连续性', target: '可用性 ≥99.95%，RTO ≤5min', current: '同城双活已实现，RTO 4min', met: true, owner: '傅青野' },
  { id: 'QA-03', attribute: '可扩展性', scenario: '新增一条业务线接入所需工作量', target: '≤5 人日，无需改核心代码', current: '插件化框架已实现，实测 4 人日', met: true, owner: '许知微' },
  { id: 'QA-04', attribute: '安全性', scenario: '外部渗透测试与越权访问尝试', target: '高危漏洞 0，中危 ≤2', current: '待 10/15 渗透测试验证', met: false, owner: '陆见明' },
  { id: 'QA-05', attribute: '可维护性', scenario: '新增一个业务意图配置上线', target: '≤10 分钟，无需研发介入', current: '配置界面开发中（TASK-112）', met: false, owner: '周砚白' },
  { id: 'QA-06', attribute: '成本', scenario: '单次会话推理综合成本', target: '≤0.0035 元', current: '0.0043 元（超目标 23%）', met: false, owner: '陆见明' },
];

/* ==================================================================
   架构评审
   ================================================================== */

export const archReviews: ArchReviewItem[] = [
  {
    id: 'AR-01', dimension: '架构合理性', question: '四层分层边界是否清晰？领域层是否混入了应用编排逻辑？',
    conclusion: '分层边界清晰，领域层职责收敛。会话编排引擎位置正确归属应用层。建议补充领域事件的契约定义。',
    verdict: 'pass', reviewer: '外部架构专家组 · 方博', riskLevel: 'low',
    followUps: [{ id: 'FU-01', content: '补充领域事件契约定义文档', owner: '陆见明', dueDate: '2026-07-30', done: true }],
  },
  {
    id: 'AR-02', dimension: '技术选型', question: '两级意图识别架构是否可控？两套模型的版本一致性如何保障？',
    conclusion: '架构方向正确，实测数据支撑充分。但两套模型的版本漂移风险需通过统一模型注册中心与灰度联动发布解决。',
    verdict: 'conditional', reviewer: 'AI 平台组 · 秦越', riskLevel: 'medium',
    followUps: [
      { id: 'FU-02', content: '建立模型注册中心，两级模型版本强绑定', owner: '陆见明', dueDate: '2026-08-15', done: true },
      { id: 'FU-03', content: '制定两级模型联动灰度发布规程', owner: '傅青野', dueDate: '2026-08-30', done: true },
    ],
  },
  {
    id: 'AR-03', dimension: '性能容量', question: '8000 并发下 P99 ≤400ms 是否有容量模型支撑？瓶颈在哪一跳？',
    conclusion: '压测数据仅在 3000 并发下达标。容量模型显示大模型推理为瓶颈，需补充推理集群扩容方案与语义缓存收益测算。',
    verdict: 'conditional', reviewer: '性能工程组 · 邵青', riskLevel: 'high',
    followUps: [
      { id: 'FU-04', content: '出具 8000 并发容量模型与扩容方案', owner: '傅青野', dueDate: '2026-10-20', done: false },
      { id: 'FU-05', content: '语义缓存命中率目标 ≥35% 的可行性验证', owner: '陆见明', dueDate: '2026-10-10', done: false },
    ],
  },
  {
    id: 'AR-04', dimension: '安全合规', question: '多租户隔离如何验证？会话数据的加密与审计是否满足监管？',
    conclusion: '加密方案与审计留痕满足要求。租户隔离需通过专项渗透测试验证，且需补充威胁建模。',
    verdict: 'pass', reviewer: '安全合规组 · 韦岚', riskLevel: 'medium',
    followUps: [{ id: 'FU-06', content: '完成威胁建模并输出渗透测试报告', owner: '陆见明', dueDate: '2026-10-15', done: false }],
  },
  {
    id: 'AR-05', dimension: '可运维性', question: '灰度发布与回滚是否可 3 分钟内完成？故障定位路径是否清晰？',
    conclusion: '灰度能力设计完备，回滚 SOP 已明确。全链路 Trace 覆盖 11 跳，故障定位路径清晰。',
    verdict: 'pass', reviewer: 'SRE 平台组 · 崔屹', riskLevel: 'low',
    followUps: [],
  },
  {
    id: 'AR-06', dimension: '成本投入', question: '推理成本 0.0043 元/会话超目标 23%，如何优化？',
    conclusion: '成本超标主要来自大模型兜底流量占比 22%（预估 15%）。需通过小模型效果优化将兜底流量降至 15% 以内，并引入语义缓存。',
    verdict: 'conditional', reviewer: '财务 BP · 韩玉', riskLevel: 'medium',
    followUps: [
      { id: 'FU-07', content: '小模型效果优化，兜底流量占比降至 ≤15%', owner: '陆见明', dueDate: '2026-10-25', done: false },
      { id: 'FU-08', content: '语义缓存上线并验证成本收益', owner: '苏景澄', dueDate: '2026-10-30', done: false },
    ],
  },
];

/* ==================================================================
   方案详细设计
   ================================================================== */

export const designDocs: DesignDoc[] = [
  {
    id: 'DD-001', name: '统一接入网关详细设计', module: '接入层 / 网关',
    requirementIds: ['REQ-2026-001', 'REQ-2026-008'], author: '许知微', status: '已定稿', version: 'v1.3', updatedAt: '2026-08-05',
    checklist: [
      { item: '接口定义（含错误码）', done: true },
      { item: '数据模型与索引设计', done: true },
      { item: '时序图与异常流程', done: true },
      { item: '非功能设计（性能/安全/幂等）', done: true },
      { item: '配置项与开关说明', done: true },
      { item: '回滚与兼容性说明', done: true },
    ],
    apis: [
      { id: 'API-001', method: 'POST', path: '/gw/v1/message/inbound', summary: '渠道消息统一入站', change: '新增', idempotent: true, qps: 8000, p99: 20 },
      { id: 'API-002', method: 'POST', path: '/gw/v1/message/outbound', summary: '统一消息出站分发', change: '新增', idempotent: true, qps: 8000, p99: 25 },
      { id: 'API-003', method: 'GET', path: '/gw/v1/session/{sessionId}', summary: '查询会话上下文', change: '新增', idempotent: true, qps: 3000, p99: 30 },
      { id: 'API-004', method: 'POST', path: '/gw/v1/plugin/reload', summary: '插件热加载', change: '新增', idempotent: false, qps: 5, p99: 8000 },
      { id: 'API-005', method: 'GET', path: '/gw/v1/tenant/{tenantId}/quota', summary: '查询租户配额水位', change: '新增', idempotent: true, qps: 200, p99: 40 },
      { id: 'API-006', method: 'PUT', path: '/gw/v1/tenant/{tenantId}/quota', summary: '更新租户配额', change: '新增', idempotent: true, qps: 20, p99: 60 },
    ],
    tables: [
      {
        name: 'gw_message_log', comment: '网关消息流水', estimatedRows: '2.4 亿 / 年',
        fields: [
          { name: 'msg_id', type: 'bigint', nullable: false, comment: '消息 ID', indexed: true },
          { name: 'session_id', type: 'varchar(64)', nullable: false, comment: '会话 ID', indexed: true },
          { name: 'tenant_id', type: 'varchar(32)', nullable: false, comment: '租户 ID', indexed: true },
          { name: 'channel', type: 'varchar(16)', nullable: false, comment: '渠道标识', indexed: true },
          { name: 'direction', type: 'tinyint', nullable: false, comment: '1 入站 2 出站', indexed: false },
          { name: 'payload', type: 'mediumtext', nullable: false, comment: '消息体（加密）', indexed: false },
          { name: 'created_at', type: 'datetime(3)', nullable: false, comment: '创建时间', indexed: true },
        ],
      },
      {
        name: 'gw_session_context', comment: '会话上下文', estimatedRows: '1800 万',
        fields: [
          { name: 'session_id', type: 'varchar(64)', nullable: false, comment: '会话 ID（主键）', indexed: true },
          { name: 'tenant_id', type: 'varchar(32)', nullable: false, comment: '租户 ID', indexed: true },
          { name: 'context_json', type: 'json', nullable: false, comment: '上下文快照', indexed: false },
          { name: 'turn_count', type: 'int', nullable: false, comment: '对话轮次', indexed: false },
          { name: 'expire_at', type: 'datetime', nullable: false, comment: '过期时间', indexed: true },
        ],
      },
      {
        name: 'gw_tenant_quota', comment: '租户配额', estimatedRows: '12',
        fields: [
          { name: 'tenant_id', type: 'varchar(32)', nullable: false, comment: '租户 ID（主键）', indexed: true },
          { name: 'qps_limit', type: 'int', nullable: false, comment: 'QPS 上限', indexed: false },
          { name: 'concurrency_limit', type: 'int', nullable: false, comment: '并发上限', indexed: false },
          { name: 'priority', type: 'tinyint', nullable: false, comment: '优先级 1-3', indexed: false },
        ],
      },
    ],
    flows: [
      {
        name: '渠道消息入站主流程',
        steps: [
          '渠道 Webhook 或长连接推送原始消息',
          '网关做签名校验与渠道识别',
          '适配插件将原始消息转换为 GatewayMessage v1',
          '租户上下文注入 + 令牌桶配额校验',
          '写入消息流水（异步）',
          '投递到实时事件总线（Kafka topic: gw.inbound）',
          '返回 202 Accepted 给渠道侧',
        ],
        failureHandling: '签名失败返回 401；配额超限返回 429 + Retry-After；适配插件异常触发熔断，降级为人工队列；Kafka 投递失败本地磁盘暂存重试 3 次。',
      },
      {
        name: '插件热加载流程',
        steps: [
          '运维上传插件包，校验签名与依赖清单',
          '新 ClassLoader 加载插件类',
          'SPI 校验扩展点实现完整性',
          '新实例预热（预执行健康检查）',
          '流量切换至新实例',
          '旧 ClassLoader 延迟 60s 后卸载并释放资源',
        ],
        failureHandling: '任一环节失败均保持旧版本继续服务，记录失败原因；连续 3 次加载失败触发告警并锁定插件版本。',
      },
    ],
    nonFunctional: [
      { dimension: '性能', design: '网关无状态水平扩展，单实例 8C16G 承载 1500 QPS；协议转换采用零拷贝解析，实测额外开销 <3ms。' },
      { dimension: '幂等', design: '入站消息以 channel + external_msg_id 生成幂等键，Redis 去重窗口 24 小时。' },
      { dimension: '安全', design: '消息体 AES-256-GCM 加密落库；敏感字段（手机号、证件号）落库前脱敏；全链路 TLS 1.3。' },
      { dimension: '灰度', design: '支持按租户、渠道、用户 ID 尾号三维度灰度，配置从配置中心动态下发，生效 ≤30s。' },
      { dimension: '兼容性', design: 'GatewayMessage 协议带 version 字段，v1 与 v2 并行支持，旧版本计划 2027Q1 下线。' },
    ],
    issues: [
      { id: 'DI-001', severity: 'major', content: '消息乱序场景下会话上下文的合并策略未定义', status: 'closed' },
      { id: 'DI-002', severity: 'minor', content: '插件卸载时 ThreadLocal 资源释放需显式处理', status: 'closed' },
      { id: 'DI-003', severity: 'minor', content: '租户配额变更的生效时延需明确（实时 or 轮询）', status: 'closed' },
    ],
  },
  {
    id: 'DD-002', name: '意图识别服务详细设计', module: '领域层 / AI',
    requirementIds: ['REQ-2026-002', 'REQ-2026-020'], author: '陆见明', status: '已定稿', version: 'v2.0', updatedAt: '2026-08-06',
    checklist: [
      { item: '接口定义（含错误码）', done: true },
      { item: '数据模型与索引设计', done: true },
      { item: '时序图与异常流程', done: true },
      { item: '非功能设计（性能/安全/幂等）', done: true },
      { item: '配置项与开关说明', done: true },
      { item: '回滚与兼容性说明', done: false },
    ],
    apis: [
      { id: 'API-010', method: 'POST', path: '/nlp/v1/intent/recognize', summary: '意图识别（两级自动）', change: '新增', idempotent: true, qps: 3000, p99: 380 },
      { id: 'API-011', method: 'POST', path: '/nlp/v1/slot/extract', summary: '槽位抽取', change: '新增', idempotent: true, qps: 2500, p99: 120 },
      { id: 'API-012', method: 'GET', path: '/nlp/v1/intent/list', summary: '查询意图列表', change: '新增', idempotent: true, qps: 100, p99: 50 },
      { id: 'API-013', method: 'POST', path: '/nlp/v1/intent/config', summary: '新增/更新自定义意图', change: '新增', idempotent: true, qps: 20, p99: 100 },
      { id: 'API-014', method: 'POST', path: '/nlp/v1/model/reload', summary: '模型热更新', change: '修改', idempotent: false, qps: 2, p99: 15000 },
    ],
    tables: [
      {
        name: 'nlp_intent_definition', comment: '意图定义', estimatedRows: '240',
        fields: [
          { name: 'intent_id', type: 'varchar(32)', nullable: false, comment: '意图 ID（主键）', indexed: true },
          { name: 'tenant_id', type: 'varchar(32)', nullable: false, comment: '租户 ID', indexed: true },
          { name: 'name', type: 'varchar(64)', nullable: false, comment: '意图名称', indexed: true },
          { name: 'examples', type: 'json', nullable: false, comment: '样例集', indexed: false },
          { name: 'model_version', type: 'varchar(32)', nullable: false, comment: '模型版本', indexed: false },
          { name: 'enabled', type: 'tinyint', nullable: false, comment: '是否启用', indexed: true },
        ],
      },
      {
        name: 'nlp_inference_log', comment: '推理流水', estimatedRows: '1200 万 / 月',
        fields: [
          { name: 'trace_id', type: 'varchar(64)', nullable: false, comment: '链路 ID', indexed: true },
          { name: 'session_id', type: 'varchar(64)', nullable: false, comment: '会话 ID', indexed: true },
          { name: 'level', type: 'tinyint', nullable: false, comment: '1 小模型 2 大模型', indexed: true },
          { name: 'confidence', type: 'decimal(4,3)', nullable: false, comment: '置信度', indexed: false },
          { name: 'latency_ms', type: 'int', nullable: false, comment: '耗时', indexed: false },
          { name: 'created_at', type: 'datetime(3)', nullable: false, comment: '时间', indexed: true },
        ],
      },
      {
        name: 'nlp_model_registry', comment: '模型注册表', estimatedRows: '48',
        fields: [
          { name: 'model_id', type: 'varchar(32)', nullable: false, comment: '模型 ID（主键）', indexed: true },
          { name: 'level', type: 'tinyint', nullable: false, comment: '层级', indexed: true },
          { name: 'version', type: 'varchar(32)', nullable: false, comment: '版本号', indexed: true },
          { name: 'paired_version', type: 'varchar(32)', nullable: false, comment: '配对版本（两级强绑定）', indexed: false },
          { name: 'status', type: 'varchar(16)', nullable: false, comment: '状态', indexed: true },
        ],
      },
    ],
    flows: [
      {
        name: '两级意图识别流程',
        steps: [
          '接收归一化消息 + 会话上下文（近 10 轮）',
          '会话级幂等校验（trace_id）',
          '查询语义缓存（相似度 ≥0.95 直接命中）',
          '小模型推理（蒸馏 BERT，Top-20 粗分类）',
          '若 Top1 置信度 ≥0.75 → 直接返回',
          '否则转大模型精判（含上下文与候选集）',
          '槽位抽取（与小模型推理并行执行）',
          '结果写入推理流水 + 语义缓存',
          '返回意图 + 槽位 + 置信度',
        ],
        failureHandling: '小模型超时（>150ms）直接降级到大模型；大模型超时（>600ms）返回最近一次意图并标记 low-confidence；两者均超时时返回兜底意图「转人工」。',
      },
      {
        name: '模型灰度发布流程',
        steps: [
          '注册新模型版本，与配对版本强绑定',
          '影子流量验证（复制 5% 流量，不影响线上）',
          '对比新旧模型指标（准确率、时延、成本）',
          '指标达标后按 5% → 20% → 50% → 100% 逐步放量',
          '每档观察 30 分钟，指标劣化自动回退回上一档',
        ],
        failureHandling: '影子流量出错不影响线上；放量阶段任一指标劣化超阈值自动回退，并冻结该版本。',
      },
    ],
    nonFunctional: [
      { dimension: '性能', design: '小模型 ONNX 化 + 批处理推理（batch 32），单卡 6k QPS；大模型 vLLM PagedAttention，单卡 320 QPS；语义缓存使用 Redis Vector，命中率目标 35%。' },
      { dimension: '成本', design: '小模型兜底率目标 ≤15%（当前 22%），语义缓存命中率 ≥35%，综合成本目标 ≤0.0035 元/会话。' },
      { dimension: '降级', design: '三级降级：大模型不可用 → 小模型直出；小模型不可用 → 规则兜底；全不可用 → 转人工。降级由 Sentinel 熔断器统一管控。' },
      { dimension: '可观测', design: '两级模型指标分维度上报（准确率、时延分布、兜底率、成本），5 分钟粒度，劣化自动告警。' },
    ],
    issues: [
      { id: 'DI-004', severity: 'blocker', content: '两级模型版本漂移导致准确率下降 3.2pp，必须有强绑定机制', status: 'closed' },
      { id: 'DI-005', severity: 'major', content: '语义缓存相似度阈值 0.95 在高频业务下误命中需评估', status: 'closed' },
      { id: 'DI-006', severity: 'minor', content: '模型回滚的用户侧影响说明缺失', status: 'open' },
    ],
  },
  {
    id: 'DD-003', name: '知识检索与溯源详细设计', module: '领域层 / 知识',
    requirementIds: ['REQ-2026-004', 'REQ-2026-019'], author: '苏景澄', status: '已定稿', version: 'v1.6', updatedAt: '2026-08-07',
    checklist: [
      { item: '接口定义（含错误码）', done: true },
      { item: '数据模型与索引设计', done: true },
      { item: '时序图与异常流程', done: true },
      { item: '非功能设计（性能/安全/幂等）', done: true },
      { item: '配置项与开关说明', done: true },
      { item: '回滚与兼容性说明', done: true },
    ],
    apis: [
      { id: 'API-020', method: 'POST', path: '/kb/v1/search', summary: '知识语义检索（含溯源）', change: '新增', idempotent: true, qps: 2000, p99: 180 },
      { id: 'API-021', method: 'POST', path: '/kb/v1/doc/upload', summary: '知识文档上传', change: '新增', idempotent: true, qps: 50, p99: 3000 },
      { id: 'API-022', method: 'POST', path: '/kb/v1/doc/batch-import', summary: '批量导入（≥1000 篇）', change: '新增', idempotent: false, qps: 2, p99: 120000 },
      { id: 'API-023', method: 'GET', path: '/kb/v1/doc/{docId}/chunks', summary: '查询文档分块', change: '新增', idempotent: true, qps: 500, p99: 80 },
      { id: 'API-024', method: 'POST', path: '/kb/v1/index/rebuild', summary: '重建向量索引', change: '新增', idempotent: false, qps: 1, p99: 600000 },
      { id: 'API-025', method: 'GET', path: '/kb/v1/trace/{traceId}', summary: '查询回答溯源信息', change: '新增', idempotent: true, qps: 300, p99: 60 },
    ],
    tables: [
      {
        name: 'kb_document', comment: '知识文档', estimatedRows: '86 万',
        fields: [
          { name: 'doc_id', type: 'varchar(64)', nullable: false, comment: '文档 ID（主键）', indexed: true },
          { name: 'tenant_id', type: 'varchar(32)', nullable: false, comment: '租户 ID', indexed: true },
          { name: 'title', type: 'varchar(255)', nullable: false, comment: '标题', indexed: true },
          { name: 'format', type: 'varchar(16)', nullable: false, comment: '格式（白名单校验）', indexed: false },
          { name: 'version', type: 'int', nullable: false, comment: '版本号', indexed: false },
          { name: 'status', type: 'varchar(16)', nullable: false, comment: '草稿/审核中/已发布/已失效', indexed: true },
          { name: 'published_at', type: 'datetime', nullable: true, comment: '发布时间', indexed: true },
        ],
      },
      {
        name: 'kb_chunk', comment: '知识分块（溯源最小粒度）', estimatedRows: '2400 万',
        fields: [
          { name: 'chunk_id', type: 'varchar(64)', nullable: false, comment: '分块 ID（主键）', indexed: true },
          { name: 'doc_id', type: 'varchar(64)', nullable: false, comment: '文档 ID', indexed: true },
          { name: 'seq', type: 'int', nullable: false, comment: '块序号（段落级）', indexed: true },
          { name: 'page_no', type: 'int', nullable: true, comment: '页码', indexed: false },
          { name: 'content', type: 'text', nullable: false, comment: '原文片段', indexed: false },
          { name: 'vector_id', type: 'varchar(64)', nullable: false, comment: '向量索引 ID', indexed: true },
        ],
      },
      {
        name: 'kb_answer_trace', comment: '回答溯源记录', estimatedRows: '3600 万 / 月',
        fields: [
          { name: 'trace_id', type: 'varchar(64)', nullable: false, comment: '链路 ID（主键）', indexed: true },
          { name: 'chunk_ids', type: 'json', nullable: false, comment: '引用的分块 ID 列表', indexed: false },
          { name: 'confidence', type: 'decimal(4,3)', nullable: false, comment: '引用置信度', indexed: false },
          { name: 'created_at', type: 'datetime(3)', nullable: false, comment: '时间', indexed: true },
        ],
      },
    ],
    flows: [
      {
        name: '知识检索与溯源流程',
        steps: [
          '接收查询文本 + 租户上下文',
          '查询改写（指代消解、关键词扩展）',
          '向量召回 Top-50（Qdrant，HNSW 索引）',
          '重排（BGE-Reranker）取 Top-5',
          '拼装 Prompt，附带 chunk_id 与 page_no',
          '大模型生成回答，要求标注引用编号',
          '解析引用编号 → 映射回 chunk_id / 段落位置',
          '写入溯源记录，返回回答 + 引用列表',
        ],
        failureHandling: '召回为空时返回「暂无相关知识」并引导转人工，不调用大模型以避免幻觉；重排服务不可用时降级为向量分数排序；溯源映射失败时降级为文档级引用并标记低置信度。',
      },
      {
        name: '知识增量更新流程',
        steps: [
          '运营上传或编辑文档，进入审核态',
          '审核通过后触发异步索引任务',
          '文档分块（按语义段落，目标 512 token）',
          '批量生成向量并写入 Qdrant',
          '更新 PostgreSQL 分块记录',
          '全流程 ≤10 分钟，完成后推送通知',
        ],
        failureHandling: '索引失败保留旧版本索引继续服务；失败超过 3 次告警并回滚文档版本；批量导入失败支持断点续传。',
      },
    ],
    nonFunctional: [
      { dimension: '性能', design: 'Qdrant HNSW 参数 M=32、ef_construct=256，5000 万向量下召回率 ≥96%；重排服务批处理 batch 16，QPS 2000。' },
      { dimension: '可测性', design: '召回率评测集 12000 条（人工标注相关段落），准确率评测集 8000 条；溯源粒度为 chunk（段落级），对应原文 page_no + seq。' },
      { dimension: '兼容', design: '向量库通过 VectorStorePort 抽象接口访问，支持 Qdrant / Milvus / FAISS 实现切换（对应 CR-015 风险）。' },
      { dimension: '安全', design: '知识文档按租户隔离，检索时强制注入 tenant_id 过滤；文档内容不落日志明文。' },
    ],
    issues: [
      { id: 'DI-007', severity: 'major', content: '向量库选型未定稿，Qdrant 为过渡方案，存在迁移成本', status: 'open' },
      { id: 'DI-008', severity: 'minor', content: '批量导入 1000+ 篇时的限流策略需细化', status: 'closed' },
    ],
  },
  {
    id: 'DD-004', name: '会话存档与检索详细设计', module: '数据层 / 存档',
    requirementIds: ['REQ-2026-003'], author: '苏景澄', status: '已定稿', version: 'v1.4', updatedAt: '2026-08-04',
    checklist: [
      { item: '接口定义（含错误码）', done: true },
      { item: '数据模型与索引设计', done: true },
      { item: '时序图与异常流程', done: true },
      { item: '非功能设计（性能/安全/幂等）', done: true },
      { item: '配置项与开关说明', done: true },
      { item: '回滚与兼容性说明', done: true },
    ],
    apis: [
      { id: 'API-030', method: 'POST', path: '/archive/v1/session/search', summary: '会话检索（热数据）', change: '新增', idempotent: true, qps: 500, p99: 2000 },
      { id: 'API-031', method: 'GET', path: '/archive/v1/session/{sessionId}', summary: '获取会话详情', change: '新增', idempotent: true, qps: 800, p99: 200 },
      { id: 'API-032', method: 'POST', path: '/archive/v1/cold/restore', summary: '冷数据恢复申请', change: '新增', idempotent: true, qps: 5, p99: 3000 },
      { id: 'API-033', method: 'GET', path: '/archive/v1/export', summary: '会话导出（合规）', change: '新增', idempotent: true, qps: 3, p99: 600000 },
    ],
    tables: [
      {
        name: 'ar_session_hot', comment: '热存会话（近 3 个月）', estimatedRows: '6000 万',
        fields: [
          { name: 'session_id', type: 'varchar(64)', nullable: false, comment: '会话 ID', indexed: true },
          { name: 'tenant_id', type: 'varchar(32)', nullable: false, comment: '租户 ID', indexed: true },
          { name: 'customer_id', type: 'varchar(64)', nullable: false, comment: '客户 ID', indexed: true },
          { name: 'channel', type: 'varchar(16)', nullable: false, comment: '渠道', indexed: true },
          { name: 'started_at', type: 'datetime(3)', nullable: false, comment: '会话开始时间', indexed: true },
          { name: 'messages', type: 'mediumtext', nullable: false, comment: '消息列表（加密）', indexed: false },
        ],
      },
      {
        name: 'ar_session_cold', comment: '冷存会话索引（33 个月）', estimatedRows: '6.6 亿',
        fields: [
          { name: 'session_id', type: 'varchar(64)', nullable: false, comment: '会话 ID', indexed: true },
          { name: 'tenant_id', type: 'varchar(32)', nullable: false, comment: '租户 ID', indexed: true },
          { name: 'object_key', type: 'varchar(255)', nullable: false, comment: '对象存储 Key', indexed: false },
          { name: 'archived_at', type: 'datetime', nullable: false, comment: '归档时间', indexed: true },
        ],
      },
    ],
    flows: [
      {
        name: '会话归档与分层流程',
        steps: [
          '会话结束时写入热存（Elasticsearch）',
          '每日 02:00 扫描超过 3 个月的会话',
          '脱敏后打包为 Parquet 写入对象存储',
          '写入冷存索引表（ar_session_cold）',
          '校验归档完整性（条数 + 校验和）',
          '校验通过后删除热存数据',
        ],
        failureHandling: '校验不通过不删除热存数据并告警；对象存储写入失败重试 3 次后进入死信队列，人工介入。',
      },
    ],
    nonFunctional: [
      { dimension: '性能', design: 'Elasticsearch 20 分片，千万级检索 P99 ≤2s；冷数据恢复按需加载，SLA ≤30 分钟。' },
      { dimension: '成本', design: '热存 SSD 成本约 0.28 元/GB/月，冷存对象存储约 0.06 元/GB/月，整体较全热存下降 62%。' },
      { dimension: '合规', design: '数据保留 36 个月，到期自动清理；导出支持 CSV/JSON，操作留痕；加密算法 AES-256-GCM。' },
    ],
    issues: [{ id: 'DI-009', severity: 'minor', content: '冷数据恢复的并发上限需配置', status: 'closed' }],
  },
  {
    id: 'DD-005', name: '坐席辅助前端详细设计', module: '接入层 / 前端',
    requirementIds: ['REQ-2026-005', 'REQ-2026-013'], author: '周砚白', status: '已定稿', version: 'v1.2', updatedAt: '2026-08-08',
    checklist: [
      { item: '接口定义（含错误码）', done: true },
      { item: '数据模型与索引设计', done: true },
      { item: '时序图与异常流程', done: true },
      { item: '非功能设计（性能/安全/幂等）', done: true },
      { item: '配置项与开关说明', done: true },
      { item: '回滚与兼容性说明', done: true },
    ],
    apis: [
      { id: 'API-040', method: 'GET', path: '/agent/v1/customer/{id}/profile', summary: '客户画像摘要', change: '新增', idempotent: true, qps: 1500, p99: 300 },
      { id: 'API-041', method: 'GET', path: '/agent/v1/session/{id}/suggestions', summary: '实时话术推荐', change: '新增', idempotent: true, qps: 3000, p99: 800 },
      { id: 'API-042', method: 'POST', path: '/agent/v1/session/{id}/reply', summary: '坐席发送消息', change: '新增', idempotent: true, qps: 2000, p99: 300 },
      { id: 'API-043', method: 'GET', path: '/agent/v1/queue/status', summary: '坐席队列状态', change: '新增', idempotent: true, qps: 400, p99: 100 },
    ],
    tables: [
      {
        name: 'ag_suggestion_log', comment: '话术推荐流水', estimatedRows: '8000 万 / 月',
        fields: [
          { name: 'id', type: 'bigint', nullable: false, comment: '主键', indexed: true },
          { name: 'session_id', type: 'varchar(64)', nullable: false, comment: '会话 ID', indexed: true },
          { name: 'agent_id', type: 'varchar(32)', nullable: false, comment: '坐席 ID', indexed: true },
          { name: 'suggestions', type: 'json', nullable: false, comment: '推荐列表', indexed: false },
          { name: 'adopted_index', type: 'tinyint', nullable: true, comment: '采纳的候选序号', indexed: false },
          { name: 'created_at', type: 'datetime(3)', nullable: false, comment: '时间', indexed: true },
        ],
      },
    ],
    flows: [
      {
        name: '话术推荐流程',
        steps: [
          '坐席接入会话，前端建立 WebSocket 连接',
          '会话内容变化时通过 WebSocket 推送增量',
          '前端 300ms 防抖后调用推荐接口',
          '后端返回 ≤3 条候选话术',
          '前端渲染浮层并记录曝光',
          '坐席点击采纳 → 记录 adopted_index → 填入输入框',
        ],
        failureHandling: '推荐接口超时（>800ms）静默失败不阻塞会话；WebSocket 断连自动重连，重连期间降级为 5s 轮询；推荐为空时展示历史常用话术。',
      },
    ],
    nonFunctional: [
      { dimension: '性能', design: '首屏加载 ≤1.5s（含画像接口往返）；采用 Module Federation 与旧工作台集成，避免重复打包；画像数据本地缓存 5 分钟。' },
      { dimension: '兼容', design: '与 v1.x 坐席工作台通过 Module Federation 共存，不修改旧工作台代码；样式通过 Shadow DOM 隔离。' },
      { dimension: '可观测', design: '前端埋点覆盖曝光、点击、采纳、耗时四类事件，上报至统一埋点平台。' },
    ],
    issues: [
      { id: 'DI-010', severity: 'major', content: 'iframe 方案已改为 Module Federation，需验证旧工作台兼容性', status: 'closed' },
      { id: 'DI-011', severity: 'minor', content: 'Shadow DOM 下的第三方组件样式穿透问题', status: 'closed' },
    ],
  },
  {
    id: 'DD-006', name: '安全护栏与多租户隔离详细设计', module: '领域层 / 安全',
    requirementIds: ['REQ-2026-014', 'REQ-2026-007'], author: '陆见明', status: '已定稿', version: 'v1.5', updatedAt: '2026-08-07',
    checklist: [
      { item: '接口定义（含错误码）', done: true },
      { item: '数据模型与索引设计', done: true },
      { item: '时序图与异常流程', done: true },
      { item: '非功能设计（性能/安全/幂等）', done: true },
      { item: '配置项与开关说明', done: true },
      { item: '回滚与兼容性说明', done: true },
    ],
    apis: [
      { id: 'API-050', method: 'POST', path: '/guard/v1/output/check', summary: '输出内容三重校验', change: '新增', idempotent: true, qps: 10000, p99: 42 },
      { id: 'API-051', method: 'GET', path: '/guard/v1/policy/list', summary: '查询护栏策略', change: '新增', idempotent: true, qps: 100, p99: 50 },
      { id: 'API-052', method: 'PUT', path: '/guard/v1/policy/{id}', summary: '更新护栏策略', change: '新增', idempotent: true, qps: 20, p99: 80 },
      { id: 'API-053', method: 'POST', path: '/guard/v1/key/rotate', summary: '租户密钥轮换', change: '新增', idempotent: true, qps: 10, p99: 500 },
    ],
    tables: [
      {
        name: 'gd_policy', comment: '护栏策略', estimatedRows: '180',
        fields: [
          { name: 'policy_id', type: 'varchar(32)', nullable: false, comment: '策略 ID（主键）', indexed: true },
          { name: 'tenant_id', type: 'varchar(32)', nullable: false, comment: '租户 ID（* 表示全局）', indexed: true },
          { name: 'type', type: 'varchar(16)', nullable: false, comment: 'sensitive/factual/compliance', indexed: true },
          { name: 'rule_json', type: 'json', nullable: false, comment: '规则定义', indexed: false },
          { name: 'enabled', type: 'tinyint', nullable: false, comment: '是否启用', indexed: true },
        ],
      },
      {
        name: 'gd_tenant_audit', comment: '租户操作审计', estimatedRows: '2.4 亿 / 年',
        fields: [
          { name: 'id', type: 'bigint', nullable: false, comment: '主键', indexed: true },
          { name: 'tenant_id', type: 'varchar(32)', nullable: false, comment: '租户 ID', indexed: true },
          { name: 'operator', type: 'varchar(64)', nullable: false, comment: '操作人', indexed: true },
          { name: 'action', type: 'varchar(64)', nullable: false, comment: '操作类型', indexed: true },
          { name: 'resource', type: 'varchar(255)', nullable: false, comment: '操作资源', indexed: false },
          { name: 'ip', type: 'varchar(45)', nullable: false, comment: '来源 IP', indexed: false },
          { name: 'created_at', type: 'datetime(3)', nullable: false, comment: '时间', indexed: true },
        ],
      },
    ],
    flows: [
      {
        name: '输出三重校验流程',
        steps: [
          '接收模型输出文本 + 租户策略上下文',
          '第一重：敏感词校验（AC 自动机，O(n)）',
          '第二重：事实性校验（对比检索溯源分块，一致性打分）',
          '第三重：合规性校验（LLM Judge，仅对高风险场景触发）',
          '任一重不通过 → 返回拦截原因，触发兜底话术',
          '全部通过 → 返回原文 + 校验凭证（供审计）',
        ],
        failureHandling: '校验服务不可用时采用「安全优先」策略：直接拦截并降级为兜底话术，同时告警。单租户策略加载失败时使用全局默认策略。',
      },
    ],
    nonFunctional: [
      { dimension: '性能', design: 'AC 自动机词典内存常驻（约 1.2GB），单次校验 <8ms；事实性校验采用轻量语义相似度模型，<30ms；合规性 LLM Judge 仅对 3.2% 高风险流量触发。' },
      { dimension: '安全', design: '租户数据强制 tenant_id 过滤，所有数据访问层拦截器统一注入；密钥支持 90 天自动轮换；审计日志 WORM 存储不可篡改。' },
      { dimension: '可用性', design: '护栏服务多副本部署（≥3），单副本故障不影响服务；本地保底词典保障极端情况下仍可拦截核心敏感词。' },
    ],
    issues: [
      { id: 'DI-012', severity: 'major', content: '威胁建模章节在需求文档缺失，已在详细设计中补充', status: 'closed' },
      { id: 'DI-013', severity: 'minor', content: 'LLM Judge 触发的 3.2% 阈值需随业务调整', status: 'closed' },
    ],
  },
];

/* ==================================================================
   开发任务
   ================================================================== */

export const devTasks: DevTask[] = [
  { id: 'TASK-101', title: '网关入站消息统一处理链路', storyId: 'US-101', designDocId: 'DD-001', module: '接入层/网关', dev: '许知微', reviewer: '陆见明', status: 'done', loc: { added: 1840, removed: 120 }, branch: 'feature/gw-inbound', commits: 23, mr: { id: 'MR-2201', url: '#', status: 'merged', approvals: 2 }, coverage: 86, lintIssues: { blocker: 0, major: 0, minor: 4 }, startDate: '2026-08-11', dueDate: '2026-08-22' },
  { id: 'TASK-102', title: '企业微信渠道适配插件', storyId: 'US-102', designDocId: 'DD-001', module: '接入层/插件', dev: '许知微', reviewer: '陆见明', status: 'done', loc: { added: 2260, removed: 80 }, branch: 'feature/plugin-wecom', commits: 31, mr: { id: 'MR-2215', url: '#', status: 'merged', approvals: 2 }, coverage: 82, lintIssues: { blocker: 0, major: 1, minor: 7 }, startDate: '2026-08-14', dueDate: '2026-08-28' },
  { id: 'TASK-103', title: '网关灰度分流配置能力', storyId: 'US-103', designDocId: 'DD-001', module: '接入层/网关', dev: '傅青野', reviewer: '许知微', status: 'done', loc: { added: 680, removed: 40 }, branch: 'feature/gw-gray', commits: 11, mr: { id: 'MR-2230', url: '#', status: 'merged', approvals: 2 }, coverage: 91, lintIssues: { blocker: 0, major: 0, minor: 2 }, startDate: '2026-08-18', dueDate: '2026-08-27' },
  { id: 'TASK-104', title: '插件 SDK 与示例工程', storyId: 'US-104', designDocId: 'DD-001', module: '接入层/插件', dev: '许知微', reviewer: '周砚白', status: 'done', loc: { added: 1420, removed: 0 }, branch: 'feature/plugin-sdk', commits: 18, mr: { id: 'MR-2244', url: '#', status: 'merged', approvals: 2 }, coverage: 79, lintIssues: { blocker: 0, major: 0, minor: 5 }, startDate: '2026-08-20', dueDate: '2026-09-02' },
  { id: 'TASK-105', title: 'ClassLoader 热加载与资源释放', storyId: 'US-105', designDocId: 'DD-001', module: '接入层/插件', dev: '傅青野', reviewer: '许知微', status: 'done', loc: { added: 960, removed: 210 }, branch: 'feature/plugin-hotload', commits: 15, mr: { id: 'MR-2258', url: '#', status: 'merged', approvals: 2 }, coverage: 74, lintIssues: { blocker: 0, major: 2, minor: 6 }, startDate: '2026-08-25', dueDate: '2026-09-05' },
  { id: 'TASK-106', title: '租户密钥管理与轮换', storyId: 'US-106', designDocId: 'DD-006', module: '领域层/安全', dev: '许知微', reviewer: '陆见明', status: 'done', loc: { added: 740, removed: 30 }, branch: 'feature/tenant-key', commits: 12, mr: { id: 'MR-2263', url: '#', status: 'merged', approvals: 2 }, coverage: 88, lintIssues: { blocker: 0, major: 0, minor: 3 }, startDate: '2026-08-26', dueDate: '2026-09-04' },
  { id: 'TASK-107', title: '令牌桶配额限流器', storyId: 'US-107', designDocId: 'DD-006', module: '接入层/网关', dev: '许知微', reviewer: '傅青野', status: 'in-progress', loc: { added: 1120, removed: 60 }, branch: 'feature/quota-limiter', commits: 14, mr: { id: 'MR-2280', url: '#', status: 'open', approvals: 1 }, coverage: 76, lintIssues: { blocker: 0, major: 0, minor: 4 }, startDate: '2026-09-03', dueDate: '2026-09-18' },
  { id: 'TASK-108', title: '租户审计日志导出', storyId: 'US-108', designDocId: 'DD-006', module: '数据层/审计', dev: '苏景澄', reviewer: '许知微', status: 'in-progress', loc: { added: 850, removed: 0 }, branch: 'feature/audit-export', commits: 9, coverage: 81, lintIssues: { blocker: 0, major: 0, minor: 2 }, startDate: '2026-09-05', dueDate: '2026-09-20' },
  { id: 'TASK-109', title: '小模型意图粗分类推理服务', storyId: 'US-109', designDocId: 'DD-002', module: '领域层/AI', dev: '陆见明', reviewer: '苏景澄', status: 'done', loc: { added: 2680, removed: 150 }, branch: 'feature/intent-l1', commits: 42, mr: { id: 'MR-2249', url: '#', status: 'merged', approvals: 3 }, coverage: 83, lintIssues: { blocker: 0, major: 0, minor: 8 }, startDate: '2026-08-11', dueDate: '2026-09-01' },
  { id: 'TASK-110', title: '大模型兜底精判与上下文融合', storyId: 'US-109', designDocId: 'DD-002', module: '领域层/AI', dev: '陆见明', reviewer: '苏景澄', status: 'done', loc: { added: 1980, removed: 90 }, branch: 'feature/intent-l2', commits: 35, mr: { id: 'MR-2266', url: '#', status: 'merged', approvals: 3 }, coverage: 78, lintIssues: { blocker: 0, major: 1, minor: 5 }, startDate: '2026-08-18', dueDate: '2026-09-08' },
  { id: 'TASK-111', title: '槽位抽取与多轮补全', storyId: 'US-110', designDocId: 'DD-002', module: '领域层/AI', dev: '陆见明', reviewer: '许知微', status: 'in-progress', loc: { added: 1450, removed: 60 }, branch: 'feature/slot-extract', commits: 20, mr: { id: 'MR-2291', url: '#', status: 'open', approvals: 1 }, coverage: 72, lintIssues: { blocker: 0, major: 0, minor: 6 }, startDate: '2026-09-01', dueDate: '2026-09-22' },
  { id: 'TASK-112', title: '自定义意图配置界面', storyId: 'US-111', designDocId: 'DD-002', module: '接入层/前端', dev: '周砚白', reviewer: '陆见明', status: 'in-progress', loc: { added: 3120, removed: 40 }, branch: 'feature/intent-config-ui', commits: 26, mr: { id: 'MR-2295', url: '#', status: 'open', approvals: 0 }, coverage: 68, lintIssues: { blocker: 0, major: 2, minor: 11 }, startDate: '2026-09-04', dueDate: '2026-09-26' },
  { id: 'TASK-113', title: '知识召回与重排链路', storyId: 'US-112', designDocId: 'DD-003', module: '领域层/知识', dev: '苏景澄', reviewer: '陆见明', status: 'in-progress', loc: { added: 2240, removed: 110 }, branch: 'feature/kb-recall', commits: 29, mr: { id: 'MR-2288', url: '#', status: 'open', approvals: 1 }, coverage: 80, lintIssues: { blocker: 0, major: 0, minor: 5 }, startDate: '2026-08-28', dueDate: '2026-09-19' },
  { id: 'TASK-114', title: '段落级溯源映射与前端引用展示', storyId: 'US-112', designDocId: 'DD-003', module: '领域层/知识', dev: '苏景澄', reviewer: '韦岚', status: 'in-progress', loc: { added: 1680, removed: 30 }, branch: 'feature/kb-trace', commits: 21, coverage: 75, lintIssues: { blocker: 0, major: 1, minor: 4 }, startDate: '2026-09-05', dueDate: '2026-09-28' },
  { id: 'TASK-115', title: '知识增量更新索引任务', storyId: 'US-113', designDocId: 'DD-003', module: '领域层/知识', dev: '苏景澄', reviewer: '傅青野', status: 'in-progress', loc: { added: 1240, removed: 20 }, branch: 'feature/kb-incremental', commits: 16, coverage: 73, lintIssues: { blocker: 0, major: 0, minor: 3 }, startDate: '2026-09-08', dueDate: '2026-09-30' },
  { id: 'TASK-116', title: '坐席画像摘要面板', storyId: 'US-114', designDocId: 'DD-005', module: '接入层/前端', dev: '周砚白', reviewer: '苏景澄', status: 'in-progress', loc: { added: 2860, removed: 60 }, branch: 'feature/agent-profile', commits: 24, mr: { id: 'MR-2301', url: '#', status: 'open', approvals: 1 }, coverage: 70, lintIssues: { blocker: 0, major: 1, minor: 9 }, startDate: '2026-09-02', dueDate: '2026-09-24' },
  { id: 'TASK-117', title: '实时话术推荐与一键采纳', storyId: 'US-115', designDocId: 'DD-005', module: '接入层/前端', dev: '周砚白', reviewer: '陆见明', status: 'blocked', loc: { added: 2140, removed: 45 }, branch: 'feature/agent-suggest', commits: 19, mr: { id: 'MR-2306', url: '#', status: 'open', approvals: 0 }, coverage: 66, lintIssues: { blocker: 0, major: 2, minor: 8 }, startDate: '2026-09-07', dueDate: '2026-09-30', blocker: 'TS 类型错误导致构建失败（BUG-2005），MR-2306 待重新提交评审' },
  { id: 'TASK-118', title: '智能路由调度算法', storyId: 'US-116', designDocId: 'DD-005', module: '领域层/调度', dev: '许知微', reviewer: '陆见明', status: 'in-progress', loc: { added: 1520, removed: 80 }, branch: 'feature/smart-router', commits: 22, mr: { id: 'MR-2299', url: '#', status: 'open', approvals: 1 }, coverage: 84, lintIssues: { blocker: 0, major: 0, minor: 3 }, startDate: '2026-09-01', dueDate: '2026-09-22' },
  { id: 'TASK-119', title: '技能组负载均衡', storyId: 'US-117', designDocId: 'DD-005', module: '领域层/调度', dev: '许知微', reviewer: '傅青野', status: 'in-progress', loc: { added: 880, removed: 35 }, branch: 'feature/skill-lb', commits: 13, coverage: 87, lintIssues: { blocker: 0, major: 0, minor: 2 }, startDate: '2026-09-09', dueDate: '2026-09-26' },
  { id: 'TASK-120', title: '工单自动生成与派单', storyId: 'US-118', designDocId: 'DD-001', module: '应用层/工单', dev: '许知微', reviewer: '苏景澄', status: 'in-progress', loc: { added: 1340, removed: 50 }, branch: 'feature/ticket-auto', commits: 17, coverage: 77, lintIssues: { blocker: 0, major: 0, minor: 4 }, startDate: '2026-09-08', dueDate: '2026-10-03' },
  { id: 'TASK-121', title: '会话检索服务与查询改写', storyId: 'US-119', designDocId: 'DD-004', module: '数据层/存档', dev: '苏景澄', reviewer: '许知微', status: 'done', loc: { added: 1760, removed: 70 }, branch: 'feature/archive-search', commits: 25, mr: { id: 'MR-2252', url: '#', status: 'merged', approvals: 2 }, coverage: 85, lintIssues: { blocker: 0, major: 0, minor: 3 }, startDate: '2026-08-20', dueDate: '2026-09-06' },
  { id: 'TASK-122', title: '冷热分层归档任务', storyId: 'US-120', designDocId: 'DD-004', module: '数据层/存档', dev: '苏景澄', reviewer: '傅青野', status: 'done', loc: { added: 1080, removed: 25 }, branch: 'feature/archive-tier', commits: 14, mr: { id: 'MR-2271', url: '#', status: 'merged', approvals: 2 }, coverage: 82, lintIssues: { blocker: 0, major: 0, minor: 2 }, startDate: '2026-08-25', dueDate: '2026-09-10' },
  { id: 'TASK-123', title: '客户画像聚合查询链路', storyId: 'US-121', designDocId: 'DD-005', module: '领域层/画像', dev: '苏景澄', reviewer: '许知微', status: 'in-progress', loc: { added: 1920, removed: 60 }, branch: 'feature/customer-360', commits: 20, coverage: 74, lintIssues: { blocker: 0, major: 1, minor: 6 }, startDate: '2026-09-10', dueDate: '2026-10-08' },
  { id: 'TASK-124', title: '输出三重安全校验', storyId: 'US-122', designDocId: 'DD-006', module: '领域层/安全', dev: '陆见明', reviewer: '韦岚', status: 'done', loc: { added: 2140, removed: 40 }, branch: 'feature/output-guard', commits: 28, mr: { id: 'MR-2257', url: '#', status: 'merged', approvals: 3 }, coverage: 89, lintIssues: { blocker: 0, major: 0, minor: 2 }, startDate: '2026-08-13', dueDate: '2026-09-02' },
  { id: 'TASK-125', title: '全链路 Trace 埋点接入', storyId: 'US-123', designDocId: 'DD-001', module: '基础设施/可观测', dev: '傅青野', reviewer: '许知微', status: 'in-progress', loc: { added: 1460, removed: 90 }, branch: 'feature/otel-trace', commits: 18, coverage: 71, lintIssues: { blocker: 0, major: 0, minor: 3 }, startDate: '2026-09-03', dueDate: '2026-09-28' },
  { id: 'TASK-126', title: '语义缓存（Redis Vector）', storyId: 'US-109', designDocId: 'DD-002', module: '领域层/AI', dev: '陆见明', reviewer: '傅青野', status: 'blocked', loc: { added: 620, removed: 15 }, branch: 'feature/semantic-cache', commits: 7, coverage: 55, lintIssues: { blocker: 0, major: 2, minor: 5 }, startDate: '2026-09-12', dueDate: '2026-10-06', blocker: '相似度阈值 0.95 命中率仅 18%，低于 35% 目标（BUG-2015）；等待小模型效果优化后再调参' },
  { id: 'TASK-127', title: '灰度发布与一键回滚', storyId: 'US-124', designDocId: 'DD-001', module: '基础设施/发布', dev: '傅青野', reviewer: '许知微', status: 'in-progress', loc: { added: 1180, removed: 30 }, branch: 'feature/gray-release', commits: 15, coverage: 79, lintIssues: { blocker: 0, major: 0, minor: 2 }, startDate: '2026-09-09', dueDate: '2026-10-10' },
  { id: 'TASK-128', title: '模型指标采集与 A/B 实验框架', storyId: 'US-125', designDocId: 'DD-002', module: '领域层/MLOps', dev: '苏景澄', reviewer: '陆见明', status: 'blocked', loc: { added: 940, removed: 20 }, branch: 'feature/mlops-metrics', commits: 10, coverage: 62, lintIssues: { blocker: 0, major: 1, minor: 4 }, startDate: '2026-09-14', dueDate: '2026-10-12', blocker: '依赖分层实验框架（ADR-008）落地，实验平台资源未就绪' },
];

export const pipelineRuns: PipelineRun[] = [
  { id: 'PL-8801', branch: 'main', stage: '编译', status: 'success', durationSec: 142, triggeredBy: '许知微', finishedAt: '2026-09-15 09:12' },
  { id: 'PL-8802', branch: 'main', stage: '单测', status: 'success', durationSec: 486, triggeredBy: '许知微', finishedAt: '2026-09-15 09:21' },
  { id: 'PL-8803', branch: 'main', stage: '静态扫描', status: 'failed', durationSec: 78, triggeredBy: '许知微', finishedAt: '2026-09-15 09:23', failure: 'feature/kb-trace 模块存在 1 个 major 级空指针告警（KbTraceMapper:87）' },
  { id: 'PL-8804', branch: 'feature/quota-limiter', stage: '编译', status: 'success', durationSec: 128, triggeredBy: '许知微', finishedAt: '2026-09-15 10:40' },
  { id: 'PL-8805', branch: 'feature/quota-limiter', stage: '单测', status: 'success', durationSec: 452, triggeredBy: '许知微', finishedAt: '2026-09-15 10:48' },
  { id: 'PL-8806', branch: 'feature/agent-suggest', stage: '编译', status: 'failed', durationSec: 96, triggeredBy: '周砚白', finishedAt: '2026-09-15 11:20', failure: 'TS 类型错误：SuggestionPanel.tsx:142 属性 adoptedIndex 不存在于 Suggestion 类型' },
  { id: 'PL-8807', branch: 'feature/smart-router', stage: '单测', status: 'success', durationSec: 512, triggeredBy: '许知微', finishedAt: '2026-09-15 13:05' },
  { id: 'PL-8808', branch: 'feature/otel-trace', stage: '镜像构建', status: 'running', durationSec: 210, triggeredBy: '傅青野', finishedAt: '—' },
  { id: 'PL-8809', branch: 'main', stage: '部署预发', status: 'queued', durationSec: 0, triggeredBy: '傅青野', finishedAt: '—' },
  { id: 'PL-8810', branch: 'feature/kb-recall', stage: '单测', status: 'success', durationSec: 498, triggeredBy: '苏景澄', finishedAt: '2026-09-15 14:30' },
  { id: 'PL-8811', branch: 'feature/customer-360', stage: '静态扫描', status: 'failed', durationSec: 84, triggeredBy: '苏景澄', finishedAt: '2026-09-15 15:02', failure: '检测到硬编码数据库连接串（CustomerProfileDao:34），违反安全规范' },
  { id: 'PL-8812', branch: 'feature/gray-release', stage: '单测', status: 'success', durationSec: 468, triggeredBy: '傅青野', finishedAt: '2026-09-15 16:18' },
];
