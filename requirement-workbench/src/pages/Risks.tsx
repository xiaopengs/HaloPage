import { Fragment, useMemo, useState } from 'react';
import { Card, Stat, Tag, Button, Tabs, Note, DL, Segmented, Drawer, Avatar } from '../components/ui';
import { PageHead, DataTable, MiniStat } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import { project, defects, devTasks, riskTone, riskLabel, stats } from '../data';
import type { RiskLevel } from '../data';

type TabKey = 'risks' | 'changes';

type Risk = (typeof project.risks)[number];
type ChangeRequest = (typeof project.changeRequests)[number];

const CR_STATUS_TONE: Record<ChangeRequest['status'], string> = {
  待评估: 'warning', 已批准: 'success', 已拒绝: 'neutral',
};

/** 风险矩阵 5×5 */
function RiskMatrix({ risks }: { risks: Risk[] }) {
  const probScore: Record<string, number> = { 高: 3, 中: 2, 低: 1 };
  const lvScore: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

  const cells = useMemo(() => {
    const map: Record<string, Risk[]> = {};
    for (const r of risks) {
      const key = `${probScore[r.probability]}-${Math.min(3, lvScore[r.level])}`;
      map[key] = [...(map[key] ?? []), r];
    }
    return map;
  }, [risks]);

  const cellTone = (p: number, i: number) => {
    const score = p * i;
    if (score >= 9) return { bg: 'var(--danger-100)', fg: 'var(--danger-700)' };
    if (score >= 6) return { bg: 'var(--warning-100)', fg: 'var(--warning-700)' };
    if (score >= 3) return { bg: 'var(--brand-100)', fg: 'var(--brand-700)' };
    return { bg: 'var(--success-100)', fg: 'var(--success-700)' };
  };

  return (
    <div className="col col--gap3">
      <div className="risk-matrix">
        <div />
        {['低影响', '中影响', '高影响'].map((l) => (
          <div key={l} className="t-xs t-tertiary t-center">{l}</div>
        ))}
        {[3, 2, 1].map((p) => (
          <Fragment key={`row-${p}`}>
            <div className="t-xs t-tertiary" style={{ display: 'flex', alignItems: 'center', paddingRight: 6 }}>
              {p === 3 ? '高概率' : p === 2 ? '中概率' : '低概率'}
            </div>
            {[1, 2, 3].map((i) => {
              const list = cells[`${p}-${i}`] ?? [];
              const tone = cellTone(p, i);
              return (
                <div
                  key={`${p}-${i}`}
                  style={{
                    background: tone.bg,
                    color: tone.fg,
                    borderRadius: 'var(--r-sm)',
                    minHeight: 58,
                    padding: 'var(--sp-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  title={list.map((r) => `${r.id} ${r.title}`).join('\n')}
                >
                  {list.length === 0
                    ? <span className="t-xs" style={{ opacity: 0.35 }}>—</span>
                    : list.map((r) => (
                      <span key={r.id} className="t-xs t-semibold" style={{ textAlign: 'center' }}>{r.id}</span>
                    ))}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="legend">
        <span className="legend__item"><i className="legend__swatch" style={{ background: 'var(--success-500)' }} />低风险</span>
        <span className="legend__item"><i className="legend__swatch" style={{ background: 'var(--brand-500)' }} />中低</span>
        <span className="legend__item"><i className="legend__swatch" style={{ background: 'var(--warning-500)' }} />中高</span>
        <span className="legend__item"><i className="legend__swatch" style={{ background: 'var(--danger-500)' }} />高风险</span>
      </div>
    </div>
  );
}

export default function Risks() {
  const [tab, setTab] = useState<TabKey>('risks');
  const [levelFilter, setLevelFilter] = useState<RiskLevel | '全部'>('全部');
  const [activeRisk, setActiveRisk] = useState<Risk | null>(null);
  const [activeCr, setActiveCr] = useState<ChangeRequest | null>(null);

  const risks = levelFilter === '全部' ? project.risks : project.risks.filter((r) => r.level === levelFilter);

  const riskColumns: Column<Risk>[] = [
    { key: 'id', header: '编号', width: 84, nowrap: true, render: (r) => <span className="t-mono t-xs t-secondary">{r.id}</span> },
    {
      key: 'title',
      header: '风险描述',
      render: (r) => (
        <div className="col col--gap1" style={{ minWidth: 0 }}>
          <span className="t-sm t-medium t-primary t-ellipsis">{r.title}</span>
          <span className="t-xs t-tertiary t-ellipsis">{r.impactDesc}</span>
        </div>
      ),
    },
    { key: 'level', header: '等级', width: 82, render: (r) => <Tag tone={riskTone[r.level]} dot>{riskLabel[r.level]}</Tag> },
    { key: 'prob', header: '概率', width: 68, render: (r) => <span className="t-xs t-secondary">{r.probability}</span> },
    {
      key: 'mitigation',
      header: '缓解措施',
      width: 300,
      render: (r) => <span className="t-xs t-secondary t-clamp2">{r.mitigation}</span>,
    },
    { key: 'owner', header: '责任人', width: 82, nowrap: true, render: (r) => <span className="t-xs t-secondary">{r.owner}</span> },
    {
      key: 'status',
      header: '状态',
      width: 88,
      render: (r) => <Tag tone={r.status === '跟踪中' ? 'warning' : r.status === '已缓解' ? 'brand' : 'success'} dot>{r.status}</Tag>,
    },
  ];

  const crColumns: Column<ChangeRequest>[] = [
    { key: 'id', header: '变更单号', width: 96, nowrap: true, render: (c) => <span className="t-mono t-xs t-secondary">{c.id}</span> },
    { key: 'title', header: '变更标题', render: (c) => <span className="t-sm t-medium t-primary t-ellipsis">{c.title}</span> },
    { key: 'reason', header: '变更原因', width: 280, render: (c) => <span className="t-xs t-secondary t-clamp2">{c.reason}</span> },
    { key: 'impact', header: '影响评估', width: 240, render: (c) => <span className="t-xs t-secondary t-clamp2">{c.impact}</span> },
    { key: 'requester', header: '提出人', width: 82, nowrap: true, render: (c) => <span className="t-xs t-secondary">{c.requester}</span> },
    { key: 'at', header: '提交日期', width: 100, nowrap: true, render: (c) => <span className="t-xs t-mono t-tertiary">{c.submittedAt}</span> },
    {
      key: 'schedule',
      header: '工期影响',
      width: 94,
      align: 'right',
      render: (c) => <span className={`t-sm t-semibold ${c.scheduleImpact > 0 ? 't-warning' : 't-success'}`}>{c.scheduleImpact > 0 ? `+${c.scheduleImpact} 人日` : '无'}</span>,
    },
    { key: 'status', header: '状态', width: 88, render: (c) => <Tag tone={CR_STATUS_TONE[c.status]} dot>{c.status}</Tag> },
  ];

  const levelCount = (l: RiskLevel) => project.risks.filter((r) => r.level === l).length;
  const totalImpact = project.changeRequests.filter((c) => c.status === '已批准').reduce((s, c) => s + c.scheduleImpact, 0);

  return (
    <>
      <PageHead
        title="风险与变更"
        showFlow={false}
        eyebrow="项目治理"
        status={<Tag tone="warning" dot>{project.health}</Tag>}
        desc="汇总项目风险登记册与变更请求，明确责任人与缓解路径；风险与具体阶段交付物相互关联，避免风险只停留在台账上。"
        actions={
          <>
            <Button icon="download">导出风险台账</Button>
            <Button variant="primary" icon="plus">登记风险</Button>
          </>
        }
      />

      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="风险总数" value={project.risks.length} unit="项" icon="alert" delta={`跟踪中 ${project.risks.filter((r) => r.status === '跟踪中').length} 项`} deltaTone="down" />
        <Stat label="高风险" value={levelCount('high') + levelCount('critical')} unit="项" icon="shield" delta="需专项跟踪" deltaTone="down" />
        <Stat label="已缓解" value={project.risks.filter((r) => r.status === '已缓解').length} unit="项" icon="check" delta={`占比 ${Math.round((project.risks.filter((r) => r.status === '已缓解').length / project.risks.length) * 100)}%`} deltaTone="up" />
        <Stat label="变更请求" value={project.changeRequests.length} unit="项" icon="refresh" delta={`批准 ${project.changeRequests.filter((c) => c.status === '已批准').length} 项`} deltaTone="flat" />
        <Stat label="累计工期影响" value={totalImpact} unit="人日" icon="clock" delta="需重排里程碑" deltaTone="down" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'risks', label: '风险登记册', count: project.risks.length },
          { value: 'changes', label: '变更请求', count: project.changeRequests.length },
        ]}
      />

      {tab === 'risks' ? (
        <div className="col col--gap4">
          <div className="grid grid--split-sticky">
            <Card title="风险矩阵" sub="概率 × 影响">
              <RiskMatrix risks={project.risks} />
            </Card>

            <Card title="风险与阶段关联" sub="按当前阶段分布">
              <div className="col col--gap3">
                {project.risks.map((r) => (
                  <div key={r.id} className="row row--between row--gap3" style={{ alignItems: 'flex-start' }}>
                    <span className="row row--gap2" style={{ alignItems: 'flex-start', minWidth: 0 }}>
                      <span className="t-mono t-xs t-tertiary t-nowrap">{r.id}</span>
                      <span className="col col--gap1" style={{ minWidth: 0 }}>
                        <span className="t-xs t-medium t-primary t-ellipsis">{r.title}</span>
                        <span className="t-xs t-tertiary">{r.owner} · 概率 {r.probability}</span>
                      </span>
                    </span>
                    <Tag tone={riskTone[r.level]} dot>{riskLabel[r.level]}</Tag>
                  </div>
                ))}
              </div>
              <hr className="divider" />
              <div className="grid grid--3">
                <MiniStat label="跟踪中" value={project.risks.filter((r) => r.status === '跟踪中').length} tone="warning" />
                <MiniStat label="已缓解" value={project.risks.filter((r) => r.status === '已缓解').length} tone="brand" />
                <MiniStat label="已关闭" value={project.risks.filter((r) => r.status === '已关闭').length} tone="success" />
              </div>
            </Card>
          </div>

          <div className="row row--gap3 row--wrap">
            <Segmented
              value={levelFilter}
              onChange={setLevelFilter}
              options={[
                { value: '全部' as const, label: '全部等级', count: project.risks.length },
                { value: 'critical' as const, label: '严重', count: levelCount('critical') },
                { value: 'high' as const, label: '高', count: levelCount('high') },
                { value: 'medium' as const, label: '中', count: levelCount('medium') },
                { value: 'low' as const, label: '低', count: levelCount('low') },
              ]}
            />
          </div>

          <Card flush title={`风险登记册 · ${risks.length} 项`} sub="点击行查看缓解计划与关联项">
            <DataTable columns={riskColumns} rows={risks} onRowClick={setActiveRisk} selectedId={activeRisk?.id} dense />
          </Card>

          <Card title="风险与交付物关联" sub="把风险锚定到具体的阶段产出上">
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 84 }}>风险</th>
                    <th style={{ width: 200 }}>关联交付物</th>
                    <th style={{ width: 130 }}>量化的影响</th>
                    <th>证据链</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><span className="t-mono t-xs t-danger">RSK-01</span></td>
                    <td><span className="t-sm t-primary">架构质量属性 QA-01 性能</span></td>
                    <td><Tag tone="danger" dot>P99 820ms &gt; 500ms</Tag></td>
                    <td><span className="t-xs t-secondary">TASK-126 阻塞 → BUG-2002 未闭环 → 架构待办 FU-03 未完成，形成完整证据链。</span></td>
                  </tr>
                  <tr>
                    <td><span className="t-mono t-xs t-danger">RSK-02</span></td>
                    <td><span className="t-sm t-primary">架构质量属性 QA-06 成本</span></td>
                    <td><Tag tone="warning" dot>成本超目标 23%</Tag></td>
                    <td><span className="t-xs t-secondary">单会话推理成本 0.098 元 / 目标 0.08 元，需引入模型分级路由与缓存降级。</span></td>
                  </tr>
                  <tr>
                    <td><span className="t-mono t-xs t-warning">RSK-03</span></td>
                    <td><span className="t-sm t-primary">测试出口门禁</span></td>
                    <td><Tag tone="warning" dot>{stats.defectOpen} 个缺陷未闭环</Tag></td>
                    <td><span className="t-xs t-secondary">其中 P0 {stats.p0Defects} 个，出口门禁要求 P0/P1 清零，当前不满足发布条件。</span></td>
                  </tr>
                  <tr>
                    <td><span className="t-mono t-xs t-warning">RSK-04</span></td>
                    <td><span className="t-sm t-primary">开发任务完成率</span></td>
                    <td><Tag tone="warning" dot>完成率 {Math.round((stats.devDone / devTasks.length) * 100)}%</Tag></td>
                    <td><span className="t-xs t-secondary">{devTasks.length - stats.devDone} 个任务未完成，按当前速率预计延期 4 个工作日。</span></td>
                  </tr>
                  <tr>
                    <td><span className="t-mono t-xs t-secondary">RSK-05</span></td>
                    <td><span className="t-sm t-primary">需求一致性检查</span></td>
                    <td><Tag tone="info" dot>术语不一致 4 项</Tag></td>
                    <td><span className="t-xs t-secondary">已在详细设计中统一「会话」与「工单」边界，风险降级为已缓解。</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="col col--gap4">
          <div className="grid grid--4">
            {(['待评估', '已批准', '已拒绝'] as const).map((s) => (
              <Card key={s}>
                <div className="row row--between">
                  <Tag tone={CR_STATUS_TONE[s]} dot size="lg">{s}</Tag>
                  <span className="t-lg t-semibold">{project.changeRequests.filter((c) => c.status === s).length}</span>
                </div>
              </Card>
            ))}
            <Card>
              <MiniStat label="工期影响合计（已批准）" value={`+${totalImpact} 人日`} tone="warning" />
            </Card>
          </div>

          {totalImpact > 0 && (
            <Note tone="warning">
              已批准变更累计增加 {totalImpact} 人日工作量，将导致「提测」与「上线」两个里程碑各顺延，请同步更新项目计划。
            </Note>
          )}

          <Card flush title={`变更请求清单 · ${project.changeRequests.length} 项`} sub="点击行查看变更详情与影响评估">
            <DataTable columns={crColumns} rows={project.changeRequests} onRowClick={setActiveCr} selectedId={activeCr?.id} dense />
          </Card>

          <div className="grid grid--2">
            <Card title="变更影响分析">
              <div className="hbar">
                {project.changeRequests.map((c) => (
                  <div className="hbar__row" key={c.id}>
                    <span className="hbar__label t-xs t-secondary t-mono" style={{ width: 66 }}>{c.id}</span>
                    <div className="hbar__track">
                      <div
                        className="hbar__fill"
                        style={{
                          width: `${(c.scheduleImpact / Math.max(...project.changeRequests.map((x) => x.scheduleImpact), 1)) * 100}%`,
                          background: c.status === '已批准' ? 'var(--warning-500)' : c.status === '已拒绝' ? 'var(--ink-300)' : 'var(--brand-500)',
                        }}
                      />
                    </div>
                    <span className="hbar__val">{c.scheduleImpact} 人日</span>
                  </div>
                ))}
              </div>
              <div className="legend" style={{ marginTop: 'var(--sp-3)' }}>
                <span className="legend__item"><i className="legend__swatch" style={{ background: 'var(--warning-500)' }} />已批准</span>
                <span className="legend__item"><i className="legend__swatch" style={{ background: 'var(--brand-500)' }} />待评估</span>
                <span className="legend__item"><i className="legend__swatch" style={{ background: 'var(--ink-300)' }} />已拒绝</span>
              </div>
            </Card>

            <Card title="变更控制流程" sub="CCB 评审机制">
              <div className="timeline">
                {[
                  ['变更提出', '需求方提交变更请求，说明原因与期望'],
                  ['影响评估', '架构组评估技术影响，PM 评估工期与人力影响'],
                  ['CCB 评审', '变更控制委员会评审，输出批准 / 拒绝 / 拆分结论'],
                  ['计划更新', '更新里程碑、迭代承诺与风险台账'],
                  ['实施跟踪', '变更落地情况纳入周报与阶段门禁'],
                ].map(([t, d], i) => (
                  <div className="timeline__item timeline__item--done" key={t}>
                    <span className="timeline__dot" />
                    <div className="col col--gap1">
                      <span className="t-sm t-medium t-primary">{i + 1}. {t}</span>
                      <span className="t-xs t-tertiary">{d}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============ 风险详情 ============ */}
      <Drawer
        open={!!activeRisk}
        onClose={() => setActiveRisk(null)}
        width={620}
        title={activeRisk?.title ?? ''}
        sub={activeRisk && `${activeRisk.id} · 责任人 ${activeRisk.owner} · 概率 ${activeRisk.probability}`}
        foot={
          <>
            <Button onClick={() => setActiveRisk(null)}>关闭</Button>
            <Button variant="primary" icon="check">标记已缓解</Button>
          </>
        }
      >
        {activeRisk && (
          <div className="col col--gap5">
            <div className="row row--gap2 row--wrap">
              <Tag tone={riskTone[activeRisk.level]} dot size="lg">{riskLabel[activeRisk.level]}风险</Tag>
              <Tag tone={activeRisk.status === '跟踪中' ? 'warning' : activeRisk.status === '已缓解' ? 'brand' : 'success'} dot size="lg">{activeRisk.status}</Tag>
            </div>

            <DL
              cols={2}
              items={[
                { label: '风险编号', value: activeRisk.id, mono: true },
                { label: '发生概率', value: activeRisk.probability },
                { label: '责任人', value: activeRisk.owner },
                { label: '风险等级', value: riskLabel[activeRisk.level] },
                { label: '当前状态', value: activeRisk.status },
                { label: '所属项目', value: project.name },
              ]}
            />

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">影响描述</span>
              <Note tone="warning">{activeRisk.impactDesc}</Note>
            </div>

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">缓解措施</span>
              <div className="note note--brand">
                <span className="note__icon"><Icon name="sparkles" size={15} /></span>
                <span className="t-sm">{activeRisk.mitigation}</span>
              </div>
            </div>

            <Card title="关联项">
              <div className="col col--gap2">
                {defects.filter((d) => d.priority === 'P0' && d.status !== '已关闭').slice(0, 3).map((d) => (
                  <div className="row row--between" key={d.id}>
                    <span className="row row--gap2">
                      <Icon name="bug" size={12} />
                      <span className="t-mono t-xs t-tertiary">{d.id}</span>
                      <span className="t-xs t-secondary t-ellipsis">{d.title}</span>
                    </span>
                    <Tag tone="danger" dot>未闭环</Tag>
                  </div>
                ))}
                {devTasks.filter((t) => t.status === 'blocked').map((t) => (
                  <div className="row row--between" key={t.id}>
                    <span className="row row--gap2">
                      <Icon name="code" size={12} />
                      <span className="t-mono t-xs t-tertiary">{t.id}</span>
                      <span className="t-xs t-secondary t-ellipsis">{t.title}</span>
                    </span>
                    <Tag tone="danger" dot>阻塞</Tag>
                  </div>
                ))}
              </div>
            </Card>

            <div className="row row--gap3">
              <Avatar name={activeRisk.owner} tone="warning" size="sm" />
              <div className="col col--gap1">
                <span className="t-xs t-medium t-primary">风险责任人 · {activeRisk.owner}</span>
                <span className="t-xs t-tertiary">负责跟踪缓解措施落地并每周同步进展</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ============ 变更详情 ============ */}
      <Drawer
        open={!!activeCr}
        onClose={() => setActiveCr(null)}
        width={620}
        title={activeCr?.title ?? ''}
        sub={activeCr && `${activeCr.id} · 提出人 ${activeCr.requester} · ${activeCr.submittedAt}`}
        foot={
          <>
            <Button onClick={() => setActiveCr(null)}>关闭</Button>
            <Button variant="primary" icon="check">批准变更</Button>
          </>
        }
      >
        {activeCr && (
          <div className="col col--gap5">
            <div className="row row--gap2 row--wrap">
              <Tag tone={CR_STATUS_TONE[activeCr.status]} dot size="lg">{activeCr.status}</Tag>
              <Tag tone={activeCr.scheduleImpact > 0 ? 'warning' : 'success'} size="lg">
                工期影响 {activeCr.scheduleImpact > 0 ? `+${activeCr.scheduleImpact} 人日` : '无'}
              </Tag>
            </div>

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">变更原因</span>
              <span className="t-sm t-secondary">{activeCr.reason}</span>
            </div>

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">影响评估</span>
              <Note tone="warning">{activeCr.impact}</Note>
            </div>

            <DL
              cols={2}
              items={[
                { label: '变更单号', value: activeCr.id, mono: true },
                { label: '提出人', value: activeCr.requester },
                { label: '提交日期', value: activeCr.submittedAt },
                { label: '当前状态', value: activeCr.status },
                { label: '工期影响', value: `${activeCr.scheduleImpact} 人日` },
                { label: '评审机构', value: '变更控制委员会（CCB）' },
              ]}
            />

            <Card title="变更影响链路">
              <div className="col col--gap2 t-xs t-secondary">
                <span>· 需求域：影响需求条目与优先级排序</span>
                <span>· 架构域：可能触及 ADR 与接口契约，需评估兼容性</span>
                <span>· 交付域：影响迭代承诺、测试范围与发布窗口</span>
                <span>· 治理：更新里程碑计划、风险台账与变更日志</span>
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </>
  );
}
