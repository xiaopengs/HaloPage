import { useState } from 'react';
import { Card, Stat, Tag, Progress, Button, Tabs, DL, Segmented, Drawer } from '../components/ui';
import { PageHead, DataTable } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import { archComponents, archDecisions, qualityAttributes, stats } from '../data';
import type { ArchComponent, ArchDecision, QualityAttribute } from '../data';

type TabKey = 'layers' | 'adr' | 'quality';

const LAYERS: ArchComponent['layer'][] = ['接入层', '应用层', '领域层', '数据层', '基础设施'];

const LAYER_DESC: Record<ArchComponent['layer'], string> = {
  接入层: '统一流量入口，负责鉴权、限流、协议转换与灰度路由。',
  应用层: '编排领域能力，承载用例与事务边界，对外暴露业务 API。',
  领域层: '核心业务模型与规则，含坐席调度、意图识别、工单流转等领域服务。',
  数据层: '持久化与检索，含关系库、缓存、向量库与实时数仓。',
  基础设施: '支撑性组件，包括消息总线、配置中心、可观测与任务调度。',
};

const TYPE_TONE: Record<ArchComponent['type'], string> = {
  服务: 'brand', 网关: 'violet', 中间件: 'info', 存储: 'warning', 任务: 'neutral', 前端: 'success',
};

const ADR_STATUS_TONE: Record<ArchDecision['status'], string> = {
  提议: 'neutral', 已接受: 'success', 已废弃: 'danger', 被替代: 'warning',
};

const QA_TONE: Record<QualityAttribute['attribute'], string> = {
  性能: 'brand', 可用性: 'success', 可扩展性: 'info', 安全性: 'violet', 可维护性: 'neutral', 成本: 'warning',
};

export default function ArchDesign() {
  const [tab, setTab] = useState<TabKey>('layers');
  const [layerFilter, setLayerFilter] = useState<ArchComponent['layer'] | '全部'>('全部');
  const [activeAdr, setActiveAdr] = useState<ArchDecision | null>(null);

  const shown = layerFilter === '全部' ? archComponents : archComponents.filter((c) => c.layer === layerFilter);

  const adrColumns: Column<ArchDecision>[] = [
    { key: 'id', header: '编号', width: 92, nowrap: true, render: (a) => <span className="t-mono t-xs t-secondary">{a.id}</span> },
    { key: 'title', header: '决策标题', render: (a) => <span className="t-sm t-medium t-primary t-ellipsis">{a.title}</span> },
    { key: 'status', header: '状态', width: 88, render: (a) => <Tag tone={ADR_STATUS_TONE[a.status]} dot>{a.status}</Tag> },
    { key: 'owner', header: '决策人', width: 82, nowrap: true, render: (a) => <span className="t-xs t-secondary">{a.owner}</span> },
    { key: 'date', header: '决策日期', width: 100, nowrap: true, render: (a) => <span className="t-xs t-tertiary t-mono">{a.decidedAt}</span> },
    { key: 'alts', header: '备选方案', width: 92, render: (a) => <span className="t-xs t-tertiary">{a.alternatives.length} 个</span> },
    {
      key: 'reqs',
      header: '关联需求',
      width: 150,
      render: (a) => <span className="t-xs t-tertiary t-ellipsis">{a.requirementIds.join('、')}</span>,
    },
  ];

  return (
    <>
      <PageHead
        activeStage="arch-design"
        eyebrow="阶段 06 / 10 · 架构域"
        title="架构设计"
        status={<Tag tone="success" dot>已完成</Tag>}
        desc="以分层组件视图 + 架构决策记录（ADR）+ 质量属性场景三位一体输出系统架构，明确技术选型理由与量化目标。"
        actions={
          <>
            <Button icon="download">导出架构说明书</Button>
            <Button variant="primary" icon="plus">新增 ADR</Button>
          </>
        }
      />

      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="架构组件" value={archComponents.length} unit="个" icon="box" delta={`${LAYERS.length} 层`} deltaTone="flat" />
        <Stat label="架构决策" value={archDecisions.length} unit="项" icon="book" delta={`已接受 ${stats.adrAccepted} 项`} deltaTone="up" />
        <Stat label="质量属性场景" value={qualityAttributes.length} unit="项" icon="target" delta={`达标 ${stats.qualityMet}/${stats.qualityTotal}`} deltaTone={stats.qualityMet === stats.qualityTotal ? 'up' : 'down'} />
        <Stat
          label="需求覆盖"
          value={archComponents.reduce((s, c) => s + c.covers, 0)}
          unit="次"
          icon="layers"
          delta="平均每组件 4.2 条"
          deltaTone="flat"
        />
        <Stat label="定稿组件" value={archComponents.filter((c) => c.status === '已定稿').length} unit="个" icon="check" delta={`规划中 ${archComponents.filter((c) => c.status === '规划中').length} 个`} deltaTone="flat" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'layers', label: '分层架构视图', count: archComponents.length },
          { value: 'adr', label: '架构决策 ADR', count: archDecisions.length },
          { value: 'quality', label: '质量属性场景', count: qualityAttributes.length },
        ]}
      />

      {tab === 'layers' && (
        <div className="col col--gap4">
          <div style={{ marginBottom: 0 }}>
            <Segmented
              value={layerFilter}
              onChange={setLayerFilter}
              options={[
                { value: '全部' as const, label: '全部', count: archComponents.length },
                ...LAYERS.map((l) => ({ value: l, label: l, count: archComponents.filter((c) => c.layer === l).length })),
              ]}
            />
          </div>

          <div className="col col--gap3">
            {LAYERS.filter((l) => layerFilter === '全部' || l === layerFilter).map((layer) => {
              const comps = shown.filter((c) => c.layer === layer);
              const done = comps.filter((c) => c.status === '已定稿').length;
              return (
                <div className="arch-layer" key={layer}>
                  <div className="arch-layer__head">
                    <span className="col col--gap1" style={{ minWidth: 0 }}>
                      <span className="arch-layer__title">
                        <Icon name="layers" size={13} /> {layer}
                      </span>
                      <span className="t-xs t-tertiary">{LAYER_DESC[layer]}</span>
                    </span>
                    <span className="row row--gap3">
                      <span className="arch-layer__count">{comps.length} 个组件</span>
                      <Progress value={comps.length ? (done / comps.length) * 100 : 0} tone={done === comps.length ? 'success' : 'brand'} width={70} label={`定稿 ${done}/${comps.length}`} />
                    </span>
                  </div>
                  <div className="arch-layer__body">
                    {comps.map((c) => (
                      <div className="arch-node" key={c.id}>
                        <div className="arch-node__head">
                          <span className="arch-node__name">
                            <span className="t-mono t-xs t-tertiary">{c.id}</span> {c.name}
                          </span>
                          <Tag tone={TYPE_TONE[c.type]}>{c.type}</Tag>
                        </div>
                        <span className="arch-node__desc">{c.responsibility}</span>
                        <div className="row row--gap2 row--wrap">
                          {c.techStack.map((t) => <span className="arch-chip" key={t}>{t}</span>)}
                        </div>
                        <div className="arch-node__quality">
                          <span title="可用性"><Icon name="shield" size={11} /> {c.quality.availability}</span>
                          <span title="吞吐"><Icon name="zap" size={11} /> {c.quality.throughput}</span>
                          <span title="延迟"><Icon name="clock" size={11} /> {c.quality.latency}</span>
                        </div>
                        <div className="row row--between" style={{ paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--border-subtle)' }}>
                          <span className="t-xs t-tertiary">覆盖需求 {c.covers} 条 · {c.owner}</span>
                          <Tag tone={c.status === '已定稿' ? 'success' : c.status === '设计中' ? 'brand' : 'neutral'} dot>{c.status}</Tag>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'adr' && (
        <div className="col col--gap4">
          <div className="grid grid--3">
            {(['提议', '已接受', '被替代', '已废弃'] as const).map((s) => (
              <Card key={s} style={{ padding: 0 }}>
                <div className="row row--between">
                  <Tag tone={ADR_STATUS_TONE[s]} dot size="lg">{s}</Tag>
                  <span className="t-lg t-semibold">{archDecisions.filter((a) => a.status === s).length}</span>
                </div>
              </Card>
            ))}
          </div>

          <Card flush title={`架构决策记录 · ${archDecisions.length} 项`} sub="点击行展开完整的 Context / Decision / Consequences">
            <DataTable columns={adrColumns} rows={archDecisions} onRowClick={setActiveAdr} selectedId={activeAdr?.id} dense />
          </Card>

          <div className="col col--gap3">
            {archDecisions.slice(0, 3).map((a) => (
              <div className="adr-item" key={a.id}>
                <div className="adr-item__head">
                  <span className="row row--gap2">
                    <span className="adr-item__id">{a.id}</span>
                    <span className="t-sm t-semibold t-primary">{a.title}</span>
                  </span>
                  <Tag tone={ADR_STATUS_TONE[a.status]} dot>{a.status}</Tag>
                </div>
                <div className="adr-item__body">
                  <div className="adr-block">
                    <span className="adr-block__label">背景 Context</span>
                    <span className="t-xs t-secondary">{a.context}</span>
                  </div>
                  <div className="adr-block">
                    <span className="adr-block__label">决策 Decision</span>
                    <span className="t-xs t-secondary">{a.decision}</span>
                  </div>
                  <div className="adr-block">
                    <span className="adr-block__label">影响 Consequences</span>
                    <span className="t-xs t-secondary">{a.consequences}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'quality' && (
        <div className="col col--gap4">
          <div className="grid grid--4">
            <Stat label="质量场景" value={qualityAttributes.length} unit="项" icon="target" />
            <Stat label="已达标" value={stats.qualityMet} unit="项" icon="check" delta={`达标率 ${Math.round((stats.qualityMet / stats.qualityTotal) * 100)}%`} deltaTone="up" />
            <Stat label="未达标" value={stats.qualityTotal - stats.qualityMet} unit="项" icon="alert" delta="需架构优化" deltaTone="down" />
            <Stat label="覆盖属性" value={new Set(qualityAttributes.map((q) => q.attribute)).size} unit="类" icon="shield" delta="六大质量属性" deltaTone="flat" />
          </div>

          <Card flush title="质量属性场景（ATAM 风格）" sub="以「场景 → 目标 → 现状」量化架构是否满足非功能诉求">
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 92 }}>编号</th>
                    <th style={{ width: 104 }}>质量属性</th>
                    <th style={{ width: 240 }}>质量场景</th>
                    <th style={{ width: 130 }}>目标值</th>
                    <th style={{ width: 130 }}>当前值</th>
                    <th style={{ width: 92 }}>达标</th>
                    <th style={{ width: 90 }}>责任人</th>
                    <th>差距说明</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityAttributes.map((q) => (
                    <tr key={q.id}>
                      <td><span className="t-mono t-xs t-secondary">{q.id}</span></td>
                      <td><Tag tone={QA_TONE[q.attribute]}>{q.attribute}</Tag></td>
                      <td><span className="t-xs t-secondary">{q.scenario}</span></td>
                      <td><span className="t-sm t-semibold t-primary">{q.target}</span></td>
                      <td>
                        <span className={`t-sm t-semibold t-${q.met ? 'success' : 'danger'}`}>{q.current}</span>
                      </td>
                      <td>
                        {q.met
                          ? <Tag tone="success" dot>达标</Tag>
                          : <Tag tone="danger" dot>未达标</Tag>}
                      </td>
                      <td><span className="t-xs t-secondary">{q.owner}</span></td>
                      <td>
                        {q.met ? (
                          <span className="t-xs t-tertiary">满足目标，纳入常态化监控。</span>
                        ) : (
                          <span className="t-xs t-danger">
                            与目标存在偏差，已登记为架构待办（见架构评审 FR 清单）。
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid--2">
            <Card title="架构原则" sub="设计约束基线">
              <div className="col col--gap3">
                {[
                  ['领域隔离', '订单、坐席、会话三个领域各自独立部署，禁止跨域直连数据库。'],
                  ['接口先行', '所有跨服务调用必须先定义契约（OpenAPI + 事件 Schema）再编码。'],
                  ['可观测默认', '每个服务默认暴露 RED 指标与结构化日志，无需额外接入成本。'],
                  ['渐进式演进', '新旧链路双跑，通过网关灰度切流，禁止一次性切换到 100%。'],
                  ['成本约束', '单会话推理成本需控制在 0.08 元以内，超出触发降级策略。'],
                ].map(([t, d]) => (
                  <div className="row row--gap3" key={t} style={{ alignItems: 'flex-start' }}>
                    <span className="criteria__idx" style={{ marginTop: 2 }}>
                      <Icon name="check" size={10} strokeWidth={3} />
                    </span>
                    <div className="col col--gap1">
                      <span className="t-sm t-medium t-primary">{t}</span>
                      <span className="t-xs t-secondary">{d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="技术栈矩阵" sub="按层归纳">
              <div className="col col--gap3">
                {LAYERS.map((l) => {
                  const techs = Array.from(new Set(archComponents.filter((c) => c.layer === l).flatMap((c) => c.techStack)));
                  return (
                    <div className="col col--gap2" key={l}>
                      <span className="t-xs t-semibold t-secondary">{l}</span>
                      <div className="row row--gap2 row--wrap">
                        {techs.map((t) => <span className="arch-chip" key={t}>{t}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============ ADR 详情 ============ */}
      <Drawer
        open={!!activeAdr}
        onClose={() => setActiveAdr(null)}
        width={680}
        title={activeAdr?.title ?? ''}
        sub={activeAdr && `${activeAdr.id} · 决策人 ${activeAdr.owner} · ${activeAdr.decidedAt}`}
        foot={
          <>
            <Button onClick={() => setActiveAdr(null)}>关闭</Button>
            <Button variant="primary" icon="git">查看关联提交</Button>
          </>
        }
      >
        {activeAdr && (
          <div className="col col--gap5">
            <div className="row row--gap2 row--wrap">
              <Tag tone={ADR_STATUS_TONE[activeAdr.status]} dot size="lg">{activeAdr.status}</Tag>
              {activeAdr.requirementIds.map((r) => <Tag key={r} tone="info">{r}</Tag>)}
            </div>

            <div className="col col--gap4">
              <div className="adr-block">
                <span className="adr-block__label">背景 Context</span>
                <span className="t-sm t-secondary">{activeAdr.context}</span>
              </div>
              <div className="adr-block">
                <span className="adr-block__label">决策 Decision</span>
                <span className="t-sm t-secondary">{activeAdr.decision}</span>
              </div>
              <div className="adr-block">
                <span className="adr-block__label">影响 Consequences</span>
                <span className="t-sm t-secondary">{activeAdr.consequences}</span>
              </div>
            </div>

            <div className="col col--gap3">
              <span className="t-sm t-semibold t-primary">备选方案评估（{activeAdr.alternatives.length} 个）</span>
              {activeAdr.alternatives.map((alt) => (
                <div className="alt-item" key={alt.name}>
                  <span className="alt-item__name">{alt.name}</span>
                  <div className="grid grid--2" style={{ gap: 'var(--sp-3)' }}>
                    <div className="col col--gap1">
                      <span className="t-xs t-semibold t-success">优势</span>
                      <span className="t-xs t-secondary">{alt.pros}</span>
                    </div>
                    <div className="col col--gap1">
                      <span className="t-xs t-semibold t-danger">劣势</span>
                      <span className="t-xs t-secondary">{alt.cons}</span>
                    </div>
                  </div>
                  <div className="row row--gap2">
                    <Icon name="x" size={11} />
                    <span className="t-xs t-tertiary">未采纳原因：{alt.rejectedReason}</span>
                  </div>
                </div>
              ))}
            </div>

            <DL
              cols={2}
              items={[
                { label: '决策编号', value: activeAdr.id, mono: true },
                { label: '决策状态', value: activeAdr.status },
                { label: '决策人', value: activeAdr.owner },
                { label: '决策日期', value: activeAdr.decidedAt },
              ]}
            />
          </div>
        )}
      </Drawer>
    </>
  );
}
