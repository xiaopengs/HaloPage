import { useMemo, useState } from 'react';
import { Card, Stat, Tag, Progress, Button, Tabs, Note, DL, Segmented } from '../components/ui';
import { PageHead, DataTable, MiniStat } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import { analysis, requirements, reqById, riskTone, riskLabel, priorityTone } from '../data';
import type { AnalysisModel } from '../data';

type TabKey = 'matrix' | 'conflict' | 'impact';

const DEP_ICON: Record<string, string> = { 依赖: 'link', 冲突: 'alert', 重复: 'refresh' };
const DEP_TONE: Record<string, string> = { 依赖: 'info', 冲突: 'danger', 重复: 'warning' };

export default function Analysis() {
  const [tab, setTab] = useState<TabKey>('matrix');
  const [depType, setDepType] = useState<'全部' | '依赖' | '冲突' | '重复'>('全部');

  const deps = useMemo(
    () => (depType === '全部' ? analysis.dependencies : analysis.dependencies.filter((d) => d.type === depType)),
    [depType],
  );

  const conflictColumns: Column<AnalysisModel['conflicts'][number]>[] = [
    { key: 'id', header: '编号', width: 84, nowrap: true, render: (c) => <span className="t-mono t-xs t-secondary">{c.id}</span> },
    { key: 'type', header: '类型', width: 106, render: (c) => <Tag tone="violet">{c.type}</Tag> },
    { key: 'involved', header: '涉及需求', width: 168, render: (c) => <span className="t-xs t-mono t-tertiary">{c.involved.join(' / ')}</span> },
    { key: 'desc', header: '问题描述', render: (c) => <span className="t-xs t-secondary">{c.description}</span> },
    { key: 'sev', header: '严重度', width: 78, render: (c) => <Tag tone={riskTone[c.severity]} dot>{riskLabel[c.severity]}</Tag> },
    {
      key: 'sug',
      header: '处理建议',
      width: 260,
      render: (c) => (
        <span className="t-xs t-secondary t-clamp2" title={c.suggestion}>
          <Icon name="arrowRight" size={10} /> {c.suggestion}
        </span>
      ),
    },
  ];

  // 覆盖统计
  const journeyTotal = analysis.journeyCoverage.reduce((s, j) => ({ c: s.c + j.covered, t: s.t + j.total }), { c: 0, t: 0 });
  const journeyRate = Math.round((journeyTotal.c / journeyTotal.t) * 100);

  return (
    <>
      <PageHead
        activeStage="analysis"
        eyebrow="阶段 05 / 10 · 需求域"
        title="需求分析"
        status={<Tag tone="success" dot>已完成</Tag>}
        desc="通过价值矩阵、依赖网络、影响面测绘与一致性检查，识别需求之间的耦合、冲突与覆盖盲区，输出需求域收口结论。"
        actions={
          <>
            <Button icon="download">导出分析报告</Button>
            <Button variant="primary" icon="refresh">重新分析</Button>
          </>
        }
      />

      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="分析需求" value={analysis.valueMatrix.length} unit="条" icon="search" delta="全量纳入" deltaTone="flat" />
        <Stat
          label="依赖关系"
          value={analysis.dependencies.filter((d) => d.type === '依赖').length}
          unit="条"
          icon="link"
          delta="跨模块 7 条"
          deltaTone="flat"
        />
        <Stat
          label="一致性冲突"
          value={analysis.conflicts.length}
          unit="项"
          icon="alert"
          delta={`${analysis.conflicts.filter((c) => c.severity === 'high' || c.severity === 'critical').length} 项高风险`}
          deltaTone="down"
        />
        <Stat
          label="受影响系统"
          value={analysis.impact.length}
          unit="个"
          icon="server"
          delta={`涉及 ${analysis.impact.reduce((s, i) => s + i.affectedModules, 0)} 个模块`}
          deltaTone="flat"
        />
        <Stat label="旅程覆盖率" value={journeyRate} unit="%" icon="target" delta="目标 95%" deltaTone={journeyRate >= 95 ? 'up' : 'down'} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'matrix', label: '价值矩阵与依赖' },
          { value: 'conflict', label: '一致性检查', count: analysis.conflicts.length },
          { value: 'impact', label: '影响面与覆盖', count: analysis.impact.length },
        ]}
      />

      {tab === 'matrix' && (
        <div className="col col--gap4">
          <div className="grid grid--split-even">
            <Card title="需求价值矩阵" sub="横轴实现成本 · 纵轴业务价值 · 颜色为优先级">
              <div className="matrix">
                <div className="matrix__plot">
                  <div className="matrix__mid-h" />
                  <div className="matrix__mid-v" />
                  <span className="matrix__zone" style={{ left: 12, top: 10 }}>高价值低投入 · 优先</span>
                  <span className="matrix__zone" style={{ right: 12, top: 10 }}>高价值高投入 · 评估</span>
                  <span className="matrix__zone" style={{ left: 12, bottom: 10 }}>低价值低投入 · 顺手</span>
                  <span className="matrix__zone" style={{ right: 12, bottom: 10 }}>低价值高投入 · 搁置</span>
                  {analysis.valueMatrix.map((v) => (
                    <span
                      key={v.id}
                      className="matrix__dot"
                      title={`${v.id}｜价值 ${v.value} 成本 ${v.effort}｜${v.quadrant}`}
                      style={{
                        left: `${(v.effort / 5) * 100}%`,
                        bottom: `${(v.value / 5) * 100}%`,
                        width: 12,
                        height: 12,
                        background:
                          v.quadrant === '优先做' ? 'var(--success-500)'
                            : v.quadrant === '重点评估' ? 'var(--brand-500)'
                              : v.quadrant === '顺手做' ? 'var(--info-500)' : 'var(--ink-300)',
                      }}
                    />
                  ))}
                </div>
                <div className="matrix__axis-y">业务价值 →</div>
                <div className="matrix__axis-x">实现成本 →</div>
              </div>
              <div className="legend" style={{ marginTop: 'var(--sp-3)' }}>
                {['优先做', '重点评估', '顺手做', '暂缓'].map((q, i) => (
                  <span className="legend__item" key={q}>
                    <i className="legend__swatch" style={{ background: ['var(--success-500)', 'var(--brand-500)', 'var(--info-500)', 'var(--ink-300)'][i] }} />
                    {q}
                  </span>
                ))}
              </div>
            </Card>

            <Card title="依赖关系网络" sub={`${analysis.dependencies.length} 条关系`}>
              <div style={{ marginBottom: 'var(--sp-3)' }}>
                <Segmented
                  value={depType}
                  onChange={setDepType}
                  options={[
                    { value: '全部' as const, label: '全部', count: analysis.dependencies.length },
                    { value: '依赖' as const, label: '依赖', count: analysis.dependencies.filter((d) => d.type === '依赖').length },
                    { value: '冲突' as const, label: '冲突', count: analysis.dependencies.filter((d) => d.type === '冲突').length },
                    { value: '重复' as const, label: '重复', count: analysis.dependencies.filter((d) => d.type === '重复').length },
                  ]}
                />
              </div>
              <div className="dep-list">
                {deps.map((d) => (
                  <div className="dep-item" key={`${d.from}-${d.to}-${d.type}`}>
                    <Tag tone={DEP_TONE[d.type]} dot>{d.type}</Tag>
                    <div className="col" style={{ minWidth: 0 }}>
                      <span className="t-xs t-medium t-primary t-ellipsis">{reqById.get(d.from)?.title ?? d.from}</span>
                      <span className="t-xs t-tertiary t-ellipsis">{reqById.get(d.to)?.title ?? d.to}</span>
                    </div>
                    <span className="dep-item__arrow">
                      <Icon name={DEP_ICON[d.type]} size={12} />
                    </span>
                    <span className="t-xs t-mono t-tertiary t-nowrap">{d.from} → {d.to}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card
            title="需求优先级 × 价值分复核"
            sub="价值分低于 3.0 且优先级为 P0/P1 的条目需要重新校准"
            flush
          >
            <div className="tbl-wrap">
              <table className="tbl" style={{ fontSize: 'var(--fs-12)' }}>
                <thead>
                  <tr>
                    <th style={{ width: 118 }}>编号</th>
                    <th>需求标题</th>
                    <th style={{ width: 76 }}>优先级</th>
                    <th style={{ width: 94 }}>价值分</th>
                    <th style={{ width: 78 }}>成本</th>
                    <th style={{ width: 96 }}>象限</th>
                  </tr>
                </thead>
                <tbody>
                  {[...analysis.valueMatrix]
                    .sort((a, b) => (reqById.get(b.id)?.score ?? 0) - (reqById.get(a.id)?.score ?? 0))
                    .slice(0, 10)
                    .map((v) => {
                      const r = reqById.get(v.id);
                      if (!r) return null;
                      const warn = r.score < 3.0 && (r.priority === 'P0' || r.priority === 'P1');
                      return (
                        <tr key={v.id}>
                          <td><span className="t-mono t-xs t-secondary">{v.id}</span></td>
                          <td>
                            <span className="t-sm t-primary t-ellipsis">{v.title}</span>
                            {warn && <Tag tone="warning" >优先级待校准</Tag>}
                          </td>
                          <td><Tag tone={priorityTone[r.priority]}>{r.priority}</Tag></td>
                          <td><span className="t-sm t-semibold">{r.score.toFixed(1)}</span></td>
                          <td><span className="t-xs t-tertiary">{r.effort} / 5</span></td>
                          <td><span className="t-xs t-secondary">{v.quadrant}</span></td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'conflict' && (
        <div className="col col--gap4">
          <div className="grid grid--4">
            {(['语义冲突', '边界重叠', '术语不一致', '优先级冲突'] as const).map((t) => {
              const list = analysis.conflicts.filter((c) => c.type === t);
              return (
                <Card key={t} style={{ padding: 0 }}>
                  <div className="row row--between" style={{ marginBottom: 'var(--sp-2)' }}>
                    <span className="t-sm t-medium t-primary">{t}</span>
                    <span className="t-lg t-semibold">{list.length}</span>
                  </div>
                  <Progress
                    value={list.length ? (list.filter((c) => c.severity === 'low').length / list.length) * 100 : 0}
                    tone={list.some((c) => c.severity === 'high' || c.severity === 'critical') ? 'danger' : 'success'}
                    width={130}
                    label={`已缓解 ${list.filter((c) => c.severity === 'low').length}/${list.length}`}
                  />
                </Card>
              );
            })}
          </div>

          <Note tone="warning">
            一致性检查共发现 {analysis.conflicts.length} 项问题，其中 {analysis.conflicts.filter((c) => c.severity === 'high').length} 项为高风险，
            须在架构设计前完成术语统一与边界重划，否则将导致数据结构返工。
          </Note>

          <Card flush title={`冲突与重复清单 · ${analysis.conflicts.length} 项`} sub="按严重度降序">
            <DataTable columns={conflictColumns} rows={analysis.conflicts} dense />
          </Card>
        </div>
      )}

      {tab === 'impact' && (
        <div className="col col--gap4">
          <Card flush title={`影响面分析 · ${analysis.impact.length} 个系统`} sub="评估改造范围与风险等级">
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 200 }}>系统 / 服务</th>
                    <th style={{ width: 100 }}>变更类型</th>
                    <th style={{ width: 120 }}>受影响模块</th>
                    <th style={{ width: 110 }}>风险等级</th>
                    <th style={{ width: 100 }}>责任人</th>
                    <th>影响说明</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.impact.map((im) => (
                    <tr key={im.system}>
                      <td><span className="t-sm t-medium t-primary">{im.system}</span></td>
                      <td>
                        <Tag tone={im.changeType === '新增' ? 'success' : im.changeType === '改造' ? 'brand' : 'danger'}>{im.changeType}</Tag>
                      </td>
                      <td>
                        <div className="row row--gap2">
                          <span className="t-sm t-semibold">{im.affectedModules}</span>
                          <Progress value={(im.affectedModules / 12) * 100} tone="info" width={44} label="" />
                        </div>
                      </td>
                      <td><Tag tone={riskTone[im.riskLevel]} dot>{riskLabel[im.riskLevel]}</Tag></td>
                      <td><span className="t-xs t-secondary">{im.owner}</span></td>
                      <td>
                        <span className="t-xs t-secondary">
                          {im.changeType === '新增'
                            ? '全新建设，无历史包袱，但需与既有网关打通鉴权与限流。'
                            : im.changeType === '改造'
                              ? '需兼容存量调用方，双版本并行期不少于 2 个迭代。'
                              : '下线前需完成流量清退与数据归档。'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid--2">
            <Card title="用户旅程覆盖率" sub={`整体覆盖 ${journeyRate}%`}>
              <div className="hbar">
                {analysis.journeyCoverage.map((j) => (
                  <div className="hbar__row" key={j.stage}>
                    <span className="hbar__label t-xs t-secondary" style={{ width: 92 }}>{j.stage}</span>
                    <div className="hbar__track">
                      <div
                        className="hbar__fill"
                        style={{
                          width: `${(j.covered / j.total) * 100}%`,
                          background: j.covered / j.total >= 0.95 ? 'var(--success-500)' : j.covered / j.total >= 0.8 ? 'var(--brand-500)' : 'var(--warning-500)',
                        }}
                      />
                    </div>
                    <span className="hbar__val">{j.covered}/{j.total}</span>
                  </div>
                ))}
              </div>
              <Note tone="info">接入与权限两段旅程覆盖不足 90%，需补充异常分支与权限降级需求。</Note>
            </Card>

            <Card title="分析结论" sub="需求域出口">
              <DL
                cols={1}
                items={[
                  { label: '需求总量', value: `${requirements.length} 条（P0 ${requirements.filter((r) => r.priority === 'P0').length} 条）` },
                  { label: '高价值低投入', value: `${analysis.valueMatrix.filter((v) => v.quadrant === '优先做').length} 条，作为首期交付范围` },
                  { label: '需搁置', value: `${analysis.valueMatrix.filter((v) => v.quadrant === '暂缓').length} 条，移入下一版本候选` },
                  { label: '依赖收敛', value: `${analysis.dependencies.filter((d) => d.type === '依赖').length} 条依赖已排定实现顺序` },
                  { label: '冲突处理', value: `${analysis.conflicts.length} 项待闭环，主干 3 项在本迭代完成` },
                  { label: '建议', value: '需求域具备进入架构设计条件，遗留冲突以设计约束形式带入' },
                ]}
              />
              <div className="grid grid--3" style={{ marginTop: 'var(--sp-4)' }}>
                <MiniStat label="优先做" value={analysis.valueMatrix.filter((v) => v.quadrant === '优先做').length} tone="success" />
                <MiniStat label="重点评估" value={analysis.valueMatrix.filter((v) => v.quadrant === '重点评估').length} tone="brand" />
                <MiniStat label="暂缓" value={analysis.valueMatrix.filter((v) => v.quadrant === '暂缓').length} tone="warning" />
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
