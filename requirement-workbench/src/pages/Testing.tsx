import { useMemo, useState } from 'react';
import { Card, Stat, Tag, Progress, Button, Tabs, Segmented, Drawer, DL, Note, Avatar } from '../components/ui';
import { PageHead, DataTable, MiniStat } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import {
  testPlan, testCases, defects, stats, storyById, reqById, priorityTone, riskTone, riskLabel,
} from '../data';
import type { TestCase, Defect } from '../data';

type TabKey = 'plan' | 'cases' | 'defects';

const RUN_STATUS: Record<TestCase['lastRun']['status'], { tone: string; label: string }> = {
  passed: { tone: 'success', label: '通过' },
  failed: { tone: 'danger', label: '失败' },
  blocked: { tone: 'warning', label: '阻塞' },
  skipped: { tone: 'neutral', label: '跳过' },
  'not-run': { tone: 'neutral', label: '未执行' },
};

const DEFECT_STATUS_TONE: Record<Defect['status'], string> = {
  新建: 'neutral', 已确认: 'info', 修复中: 'brand', 待验证: 'warning', 已关闭: 'success', 已拒绝: 'neutral',
};

const SEV_TONE: Record<Defect['severity'], string> = {
  致命: 'danger', 严重: 'danger', 一般: 'warning', 轻微: 'info',
};

const FOUND_TONE: Record<Defect['foundAt'], string> = {
  提测: 'brand', 回归: 'info', 预发: 'warning', 生产: 'danger',
};

export default function Testing() {
  const [tab, setTab] = useState<TabKey>('plan');
  const [typeFilter, setTypeFilter] = useState<string>('全部');
  const [runFilter, setRunFilter] = useState<TestCase['lastRun']['status'] | '全部'>('全部');
  const [sevFilter, setSevFilter] = useState<Defect['severity'] | '全部'>('全部');
  const [openCase, setOpenCase] = useState<TestCase | null>(null);
  const [openBug, setOpenBug] = useState<Defect | null>(null);

  const cases = useMemo(() => {
    let list = testCases;
    if (typeFilter !== '全部') list = list.filter((t) => t.type === typeFilter);
    if (runFilter !== '全部') list = list.filter((t) => t.lastRun.status === runFilter);
    return list;
  }, [typeFilter, runFilter]);

  const shownDefects = sevFilter === '全部' ? defects : defects.filter((d) => d.severity === sevFilter);

  const p = testPlan.progress;
  const execRate = Math.round(((p.total - p.notRun) / p.total) * 100);
  const passRate = Math.round((p.passed / Math.max(1, p.total - p.notRun)) * 100);

  const caseColumns: Column<TestCase>[] = [
    { key: 'id', header: '用例编号', width: 96, nowrap: true, render: (t) => <span className="t-mono t-xs t-secondary">{t.id}</span> },
    {
      key: 'title',
      header: '用例标题',
      render: (t) => (
        <div className="col col--gap1" style={{ minWidth: 0 }}>
          <span className="t-sm t-medium t-primary t-ellipsis">{t.title}</span>
          <span className="t-xs t-tertiary t-ellipsis">
            {t.storyId} · {storyById.get(t.storyId)?.title ?? t.requirementId}
          </span>
        </div>
      ),
    },
    { key: 'type', header: '类型', width: 78, render: (t) => <Tag tone="violet">{t.type}</Tag> },
    { key: 'priority', header: '优先级', width: 74, render: (t) => <Tag tone={priorityTone[t.priority]}>{t.priority}</Tag> },
    {
      key: 'auto',
      header: '自动化',
      width: 92,
      render: (t) => (t.automated ? <Tag tone="success" dot>已自动化</Tag> : <Tag tone="neutral">手工</Tag>),
    },
    {
      key: 'last',
      header: '最近执行',
      width: 118,
      render: (t) => <Tag tone={RUN_STATUS[t.lastRun.status].tone} dot>{RUN_STATUS[t.lastRun.status].label}</Tag>,
    },
    { key: 'dur', header: '耗时', width: 76, align: 'right', render: (t) => <span className="t-xs t-mono t-tertiary">{t.lastRun.durationMs ? `${(t.lastRun.durationMs / 1000).toFixed(1)}s` : '—'}</span> },
    { key: 'owner', header: '负责人', width: 78, nowrap: true, render: (t) => <span className="t-xs t-secondary">{t.owner}</span> },
  ];

  const defectColumns: Column<Defect>[] = [
    { key: 'id', header: '缺陷编号', width: 96, nowrap: true, render: (d) => <span className="t-mono t-xs t-secondary">{d.id}</span> },
    {
      key: 'title',
      header: '缺陷标题',
      render: (d) => (
        <div className="col col--gap1" style={{ minWidth: 0 }}>
          <span className="t-sm t-medium t-primary t-ellipsis">{d.title}</span>
          <span className="t-xs t-tertiary t-ellipsis">
            {d.module} · 关联 {d.testCaseId ?? d.requirementId} · {d.reproducibility}
          </span>
        </div>
      ),
    },
    { key: 'severity', header: '严重度', width: 78, render: (d) => <Tag tone={SEV_TONE[d.severity]} dot>{d.severity}</Tag> },
    { key: 'priority', header: '优先级', width: 74, render: (d) => <Tag tone={priorityTone[d.priority]}>{d.priority}</Tag> },
    { key: 'foundAt', header: '来源', width: 74, render: (d) => <Tag tone={FOUND_TONE[d.foundAt]}>{d.foundAt}</Tag> },
    { key: 'assignee', header: '处理人', width: 78, nowrap: true, render: (d) => <span className="t-xs t-secondary">{d.assignee}</span> },
    { key: 'createdAt', header: '创建', width: 96, nowrap: true, render: (d) => <span className="t-xs t-tertiary t-mono">{d.createdAt.slice(5)}</span> },
    { key: 'status', header: '状态', width: 88, render: (d) => <Tag tone={DEFECT_STATUS_TONE[d.status]} dot>{d.status}</Tag> },
  ];

  const tcByType = stats.tcByType;
  const maxType = Math.max(...tcByType.map((t) => t.count), 1);

  return (
    <>
      <PageHead
        activeStage="testing"
        eyebrow="阶段 10 / 10 · 交付域"
        title="项目测试"
        status={<Tag tone="warning" dot>执行中 {execRate}%</Tag>}
        desc="以测试计划为纲，覆盖功能、接口、性能、安全、兼容性与异常六类用例，缺陷全生命周期跟踪，出口以门禁指标判定。"
        actions={
          <>
            <Button icon="download">导出测试报告</Button>
            <Button variant="primary" icon="play">执行用例</Button>
          </>
        }
      />

      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="测试用例" value={testCases.length} unit="条" icon="clipboardList" delta={`自动化 ${stats.autoRate}%`} deltaTone={stats.autoRate >= 70 ? 'up' : 'down'} />
        <Stat label="执行率" value={execRate} unit="%" icon="play" delta={`已执行 ${p.total - p.notRun} 条`} deltaTone={execRate >= 90 ? 'up' : 'down'} />
        <Stat label="通过率" value={passRate} unit="%" icon="check" delta={`失败 ${p.failed} 条`} deltaTone={passRate >= 95 ? 'up' : 'down'} />
        <Stat label="未闭环缺陷" value={stats.defectOpen} unit="个" icon="bug" delta={`P0 ${stats.p0Defects} 个`} deltaTone={stats.p0Defects > 0 ? 'down' : 'up'} />
        <Stat label="缺陷密度" value="1.6" unit="个/千行" icon="trend" delta="基线 2.4" deltaTone="up" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'plan', label: '测试计划' },
          { value: 'cases', label: '测试用例', count: testCases.length },
          { value: 'defects', label: '缺陷跟踪', count: defects.length },
        ]}
      />

      {tab === 'plan' && (
        <div className="col col--gap4">
          <div className="grid grid--split-main">
            <Card
              title={testPlan.name}
              sub={`${testPlan.id} · ${testPlan.sprint} · ${testPlan.startDate} → ${testPlan.endDate}`}
              actions={<Tag tone={testPlan.status === '执行中' ? 'brand' : testPlan.status === '已完成' ? 'success' : 'neutral'} dot>{testPlan.status}</Tag>}
            >
              <div className="col col--gap4">
                <DL
                  cols={2}
                  items={[
                    { label: '测试负责人', value: testPlan.owner },
                    { label: '所属迭代', value: testPlan.sprint },
                    { label: '开始日期', value: testPlan.startDate },
                    { label: '结束日期', value: testPlan.endDate },
                    { label: '用例总数', value: `${p.total} 条` },
                    { label: '环境数量', value: `${testPlan.environments.length} 套` },
                  ]}
                />

                <div className="col col--gap3">
                  <span className="t-sm t-semibold t-primary">执行进度</span>
                  <div className="grid grid--4">
                    <MiniStat label="通过" value={p.passed} tone="success" />
                    <MiniStat label="失败" value={p.failed} tone="danger" />
                    <MiniStat label="阻塞" value={p.blocked} tone="warning" />
                    <MiniStat label="未执行" value={p.notRun} tone="secondary" />
                  </div>
                  <div className="col col--gap2">
                    {(['passed', 'failed', 'blocked', 'notRun'] as const).map((k) => {
                      const n = p[k];
                      const tone = k === 'passed' ? 'success' : k === 'failed' ? 'danger' : k === 'blocked' ? 'warning' : 'neutral';
                      const label = k === 'passed' ? '通过' : k === 'failed' ? '失败' : k === 'blocked' ? '阻塞' : '未执行';
                      return (
                        <div className="hbar__row" key={k}>
                          <span className="hbar__label t-xs t-secondary" style={{ width: 52 }}>{label}</span>
                          <div className="hbar__track">
                            <div className="hbar__fill" style={{ width: `${(n / p.total) * 100}%`, background: `var(--${tone === 'neutral' ? 'ink-300' : tone + '-500'})` }} />
                          </div>
                          <span className="hbar__val">{n}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="测试环境" sub={`${testPlan.environments.length} 套`}>
              <div className="col col--gap3">
                {testPlan.environments.map((e) => (
                  <div key={e.name} className="row row--between row--gap3" style={{ alignItems: 'flex-start' }}>
                    <span className="row row--gap2" style={{ alignItems: 'flex-start' }}>
                      <Icon name="server" size={14} />
                      <span className="col col--gap1" style={{ minWidth: 0 }}>
                        <span className="t-sm t-medium t-primary">{e.name}</span>
                        <span className="t-xs t-tertiary">{e.purpose}</span>
                      </span>
                    </span>
                    <Tag tone={e.status === '可用' ? 'success' : 'warning'} dot>{e.status}</Tag>
                  </div>
                ))}
              </div>
              <hr className="divider" />
              <div className="grid grid--2">
                <MiniStat label="环境可用率" value={`${Math.round((testPlan.environments.filter((e) => e.status === '可用').length / testPlan.environments.length) * 100)}%`} tone="success" />
                <MiniStat label="维护中" value={testPlan.environments.filter((e) => e.status === '维护中').length} tone="warning" />
              </div>
            </Card>
          </div>

          <div className="grid grid--3">
            <Card title="测试范围" sub={`${testPlan.scope.length} 项`}>
              <div className="col col--gap2">
                {testPlan.scope.map((s) => (
                  <div className="row row--gap2 t-sm t-secondary" key={s}>
                    <Icon name="check" size={12} />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="不在范围" sub={`${testPlan.outOfScope.length} 项`}>
              <div className="col col--gap2">
                {testPlan.outOfScope.map((s) => (
                  <div className="row row--gap2 t-sm t-tertiary" key={s}>
                    <Icon name="minus" size={12} />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="准入门禁 / 出口标准">
              <div className="col col--gap3">
                <div className="col col--gap2">
                  <span className="t-xs t-semibold t-secondary">准入条件</span>
                  {testPlan.entryCriteria.map((c) => (
                    <div className="checklist__item" key={c}>
                      <span className="checklist__box checklist__box--done"><Icon name="check" size={10} strokeWidth={3} /></span>
                      <span className="t-xs t-primary">{c}</span>
                    </div>
                  ))}
                </div>
                <div className="col col--gap2">
                  <span className="t-xs t-semibold t-secondary">出口标准</span>
                  {testPlan.exitCriteria.map((c) => (
                    <div className="checklist__item" key={c}>
                      <span className="checklist__box"><Icon name="x" size={9} strokeWidth={3} /></span>
                      <span className="t-xs t-secondary">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <Card title="测试风险与缓解" sub={`${testPlan.risks.length} 项`}>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>风险描述</th>
                    <th style={{ width: 110 }}>影响</th>
                    <th>缓解措施</th>
                  </tr>
                </thead>
                <tbody>
                  {testPlan.risks.map((r) => (
                    <tr key={r.risk}>
                      <td><span className="t-sm t-primary">{r.risk}</span></td>
                      <td><Tag tone={riskTone[r.impact]} dot>{riskLabel[r.impact]}</Tag></td>
                      <td><span className="t-xs t-secondary">{r.mitigation}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'cases' && (
        <div className="col col--gap4">
          <div className="grid grid--4">
            <Card title="按类型分布">
              <div className="hbar">
                {tcByType.map((t) => (
                  <div className="hbar__row" key={t.type}>
                    <span className="hbar__label t-xs t-secondary" style={{ width: 52 }}>{t.type}</span>
                    <div className="hbar__track">
                      <div className="hbar__fill" style={{ width: `${(t.count / maxType) * 100}%`, background: 'var(--violet-500)' }} />
                    </div>
                    <span className="hbar__val">{t.count}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="按执行结果">
              <div className="hbar">
                {stats.tcByRunStatus.map((s) => (
                  <div className="hbar__row" key={s.status}>
                    <span className="hbar__label t-xs t-secondary" style={{ width: 52 }}>{RUN_STATUS[s.status].label}</span>
                    <div className="hbar__track">
                      <div className="hbar__fill" style={{ width: `${(s.count / testCases.length) * 100}%`, background: `var(--${RUN_STATUS[s.status].tone === 'neutral' ? 'ink-300' : RUN_STATUS[s.status].tone + '-500'})` }} />
                    </div>
                    <span className="hbar__val">{s.count}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="自动化覆盖">
              <div className="grid grid--2">
                <MiniStat label="已自动化" value={testCases.filter((t) => t.automated).length} tone="success" />
                <MiniStat label="手工用例" value={testCases.filter((t) => !t.automated).length} tone="secondary" />
              </div>
              <div style={{ marginTop: 'var(--sp-3)' }}>
                <Progress value={stats.autoRate} tone={stats.autoRate >= 70 ? 'success' : 'warning'} width={220} label={`自动化率 ${stats.autoRate}%`} />
              </div>
              <Note tone="info">目标自动化率 70%，当前 {stats.autoRate}%{stats.autoRate >= 70 ? '，已达标。' : '，仍低于目标。'}</Note>
            </Card>
            <Card title="P0/P1 用例">
              <div className="grid grid--2">
                <MiniStat label="P0 用例" value={testCases.filter((t) => t.priority === 'P0').length} tone="danger" />
                <MiniStat label="P1 用例" value={testCases.filter((t) => t.priority === 'P1').length} tone="warning" />
              </div>
              <hr className="divider" />
              <div className="col col--gap2">
                <span className="t-xs t-tertiary">
                  P0 用例执行率 {Math.round((testCases.filter((t) => t.priority === 'P0' && t.lastRun.status !== 'not-run').length / Math.max(1, testCases.filter((t) => t.priority === 'P0').length)) * 100)}%
                </span>
                <Progress
                  value={(testCases.filter((t) => t.priority === 'P0' && t.lastRun.status !== 'not-run').length / Math.max(1, testCases.filter((t) => t.priority === 'P0').length)) * 100}
                  tone="danger"
                  width={220}
                  label=""
                />
              </div>
            </Card>
          </div>

          <div className="row row--gap3 row--wrap">
            <Segmented
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: '全部', label: '全部类型', count: testCases.length },
                ...tcByType.map((t) => ({ value: t.type, label: t.type, count: t.count })),
              ]}
            />
            <Segmented
              value={runFilter}
              onChange={setRunFilter}
              options={[
                { value: '全部' as const, label: '全部结果' },
                { value: 'passed' as const, label: '通过', count: stats.tcByRunStatus.find((s) => s.status === 'passed')!.count },
                { value: 'failed' as const, label: '失败', count: stats.tcByRunStatus.find((s) => s.status === 'failed')!.count },
                { value: 'blocked' as const, label: '阻塞', count: stats.tcByRunStatus.find((s) => s.status === 'blocked')!.count },
                { value: 'not-run' as const, label: '未执行', count: stats.tcByRunStatus.find((s) => s.status === 'not-run')!.count },
              ]}
            />
          </div>

          <Card flush title={`测试用例 · ${cases.length} 条`} sub="点击行查看步骤与预期结果">
            <DataTable columns={caseColumns} rows={cases} onRowClick={setOpenCase} selectedId={openCase?.id} dense />
          </Card>
        </div>
      )}

      {tab === 'defects' && (
        <div className="col col--gap4">
          <div className="grid grid--4">
            {stats.defectBySeverity.map((s) => (
              <Card key={s.severity}>
                <div className="row row--between" style={{ marginBottom: 'var(--sp-2)' }}>
                  <Tag tone={SEV_TONE[s.severity as Defect['severity']]} dot size="lg">{s.severity}</Tag>
                  <span className="t-lg t-semibold">{s.total}</span>
                </div>
                <Progress
                  value={s.total ? ((s.total - s.open) / s.total) * 100 : 0}
                  tone={s.open === 0 ? 'success' : 'warning'}
                  width={150}
                  label={`已闭环 ${s.total - s.open}/${s.total}`}
                />
              </Card>
            ))}
          </div>

          {stats.p0Defects > 0 && (
            <Note tone="danger">
              当前存在 {stats.p0Defects} 个未闭环 P0 缺陷，其中 BUG-2002（P99 延迟 820ms 超出 SLA）与 BUG-2011（风控误拦截率 3.2%）
              为阻塞项，出口门禁要求 P0/P1 缺陷清零。
            </Note>
          )}

          <div className="grid grid--2">
            <Card title="缺陷模块分布" sub={`共 ${defects.length} 个缺陷`}>
              <div className="hbar">
                {stats.defectByModule.map((m) => (
                  <div className="hbar__row" key={m.module}>
                    <span className="hbar__label t-xs t-secondary t-ellipsis" style={{ width: 104 }}>{m.module}</span>
                    <div className="hbar__track">
                      <div className="hbar__fill" style={{ width: `${(m.count / stats.defectByModule[0].count) * 100}%`, background: 'var(--danger-500)' }} />
                    </div>
                    <span className="hbar__val">{m.count}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="缺陷来源分布">
              <div className="hbar">
                {(['提测', '回归', '预发', '生产'] as const).map((f) => {
                  const n = defects.filter((d) => d.foundAt === f).length;
                  return (
                    <div className="hbar__row" key={f}>
                      <span className="hbar__label t-xs t-secondary" style={{ width: 52 }}>{f}</span>
                      <div className="hbar__track">
                        <div className="hbar__fill" style={{ width: `${(n / defects.length) * 100}%`, background: f === '生产' ? 'var(--danger-500)' : f === '预发' ? 'var(--warning-500)' : 'var(--brand-500)' }} />
                      </div>
                      <span className="hbar__val">{n}</span>
                    </div>
                  );
                })}
              </div>
              <Note tone={defects.filter((d) => d.foundAt === '生产').length > 0 ? 'warning' : 'success'}>
                生产环境发现 {defects.filter((d) => d.foundAt === '生产').length} 个缺陷，泄漏率需控制在 5% 以内。
              </Note>
            </Card>
          </div>

          <div className="row row--gap3 row--wrap">
            <Segmented
              value={sevFilter}
              onChange={setSevFilter}
              options={[
                { value: '全部' as const, label: '全部严重度', count: defects.length },
                ...stats.defectBySeverity.map((s) => ({ value: s.severity as Defect['severity'], label: s.severity, count: s.total })),
              ]}
            />
          </div>

          <Card flush title={`缺陷清单 · ${shownDefects.length} 个`} sub="点击行查看复现步骤与根因">
            <DataTable columns={defectColumns} rows={shownDefects} onRowClick={setOpenBug} selectedId={openBug?.id} dense />
          </Card>

          <Card title="测试出口门禁" sub="进入发布评审的判定条件">
            <div className="grid grid--4">
              <GateCheck ok={p.notRun === 0} title="用例执行率 100%" desc={`当前 ${execRate}%`} />
              <GateCheck ok={passRate >= 95} title="用例通过率 ≥ 95%" desc={`当前 ${passRate}%`} />
              <GateCheck ok={stats.p0Defects === 0} title="P0/P1 缺陷清零" desc={`P0 剩余 ${stats.p0Defects} 个`} />
              <GateCheck ok={stats.defectOpen <= 5} title="未闭环缺陷 ≤ 5 个" desc={`当前 ${stats.defectOpen} 个`} />
            </div>
          </Card>
        </div>
      )}

      {/* ============ 用例抽屉 ============ */}
      <Drawer
        open={!!openCase}
        onClose={() => setOpenCase(null)}
        width={660}
        title={openCase?.title ?? ''}
        sub={openCase && `${openCase.id} · ${openCase.type} · ${openCase.priority} · ${openCase.owner}`}
        foot={
          <>
            <Button onClick={() => setOpenCase(null)}>关闭</Button>
            <Button variant="primary" icon="play">执行用例</Button>
          </>
        }
      >
        {openCase && (
          <div className="col col--gap5">
            <div className="row row--gap2 row--wrap">
              <Tag tone={RUN_STATUS[openCase.lastRun.status].tone} dot size="lg">{RUN_STATUS[openCase.lastRun.status].label}</Tag>
              <Tag tone="violet">{openCase.type}</Tag>
              <Tag tone={priorityTone[openCase.priority]}>{openCase.priority}</Tag>
              {openCase.automated && <Tag tone="success" dot>已自动化</Tag>}
            </div>

            {openCase.lastRun.actual && (
              <Note tone="danger">实际结果：{openCase.lastRun.actual}</Note>
            )}

            <DL
              cols={2}
              items={[
                { label: '关联故事', value: storyById.get(openCase.storyId)?.title ?? openCase.storyId },
                { label: '关联需求', value: reqById.get(openCase.requirementId)?.title ?? openCase.requirementId },
                { label: '最近执行人', value: openCase.lastRun.executor },
                { label: '最近执行时间', value: openCase.lastRun.at },
                { label: '执行耗时', value: openCase.lastRun.durationMs ? `${(openCase.lastRun.durationMs / 1000).toFixed(2)}s` : '—' },
                { label: '自动化脚本', value: openCase.script ?? '—', mono: !!openCase.script },
              ]}
            />

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">前置条件</span>
              <div className="criteria">
                {openCase.preconditions.map((c, i) => (
                  <div className="criteria__item" key={c}>
                    <span className="criteria__idx">{i + 1}</span>
                    <span className="t-sm t-secondary">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">测试步骤</span>
              <div className="criteria">
                {openCase.steps.map((s, i) => (
                  <div className="criteria__item" key={s}>
                    <span className="criteria__idx">{i + 1}</span>
                    <span className="t-sm t-secondary">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">预期结果</span>
              <div className="note note--success">
                <span className="note__icon"><Icon name="check" size={15} /></span>
                <span className="t-sm">{openCase.expected}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ============ 缺陷抽屉 ============ */}
      <Drawer
        open={!!openBug}
        onClose={() => setOpenBug(null)}
        width={680}
        title={openBug?.title ?? ''}
        sub={openBug && `${openBug.id} · ${openBug.module} · 报告人 ${openBug.reporter}`}
        foot={
          <>
            <Button onClick={() => setOpenBug(null)}>关闭</Button>
            <Button variant="primary" icon="check">标记已验证</Button>
          </>
        }
      >
        {openBug && (
          <div className="col col--gap5">
            <div className="row row--gap2 row--wrap">
              <Tag tone={SEV_TONE[openBug.severity]} dot size="lg">{openBug.severity}</Tag>
              <Tag tone={priorityTone[openBug.priority]} size="lg">{openBug.priority}</Tag>
              <Tag tone={DEFECT_STATUS_TONE[openBug.status]} dot size="lg">{openBug.status}</Tag>
              <Tag tone={FOUND_TONE[openBug.foundAt]}>{openBug.foundAt}发现</Tag>
              <Tag tone="neutral">{openBug.reproducibility}</Tag>
            </div>

            <DL
              cols={2}
              items={[
                { label: '所属模块', value: openBug.module },
                { label: '处理人', value: openBug.assignee },
                { label: '关联用例', value: openBug.testCaseId ?? '—', mono: true },
                { label: '关联需求', value: reqById.get(openBug.requirementId)?.title ?? openBug.requirementId },
                { label: '创建时间', value: openBug.createdAt },
                { label: '关闭时间', value: openBug.closedAt ?? '未关闭' },
              ]}
            />

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">复现步骤</span>
              <div className="criteria">
                {openBug.steps.map((s, i) => (
                  <div className="criteria__item" key={s}>
                    <span className="criteria__idx">{i + 1}</span>
                    <span className="t-sm t-secondary">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {openBug.rootCause && (
              <div className="col col--gap2">
                <span className="t-sm t-semibold t-primary">根因分析</span>
                <Note tone="warning">{openBug.rootCause}</Note>
              </div>
            )}

            {openBug.fixedBy && openBug.fixedBy.length > 0 && (
              <Card title="修复关联提交" sub={`${openBug.fixedBy.length} 个`}>
                <div className="row row--gap2 row--wrap">
                  {openBug.fixedBy.map((c) => <span className="code code--inline t-xs" key={c}>{c}</span>)}
                </div>
              </Card>
            )}

            <div className="row row--gap3">
              <Avatar name={openBug.reporter} tone="info" size="sm" />
              <div className="col col--gap1">
                <span className="t-xs t-medium t-primary">报告人 · {openBug.reporter}</span>
                <span className="t-xs t-tertiary">{openBug.createdAt} · 来源 {openBug.foundAt}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

function GateCheck({ ok, title, desc }: { ok: boolean; title: string; desc: string }) {
  return (
    <div
      className="col col--gap2"
      style={{
        padding: 'var(--sp-3)',
        borderRadius: 'var(--r-md)',
        background: ok ? 'var(--success-50)' : 'var(--danger-50)',
        border: `1px solid var(--${ok ? 'success' : 'danger'}-100)`,
      }}
    >
      <span className="row row--gap2">
        <Icon name={ok ? 'check' : 'x'} size={14} />
        <span className="t-sm t-semibold t-primary">{title}</span>
      </span>
      <span className="t-xs t-secondary">{desc}</span>
      <Tag tone={ok ? 'success' : 'danger'} dot>{ok ? '已满足' : '未满足'}</Tag>
    </div>
  );
}
