import { useMemo, useState } from 'react';
import { Card, Stat, Tag, Progress, Button, Tabs, Note, DL, Segmented, Drawer, Avatar } from '../components/ui';
import { PageHead, DataTable, MiniStat } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import { devTasks, pipelineRuns, stats, storyById, docById, statusLabel, statusTone } from '../data';
import type { DevTask, PipelineRun, FlowStatus } from '../data';

type TabKey = 'board' | 'tasks' | 'ci';

const COLUMNS: { key: FlowStatus; label: string; tone: string }[] = [
  { key: 'draft', label: '待开始', tone: 'neutral' },
  { key: 'in-progress', label: '开发中', tone: 'brand' },
  { key: 'reviewing', label: '评审中', tone: 'warning' },
  { key: 'blocked', label: '已阻塞', tone: 'danger' },
  { key: 'done', label: '已完成', tone: 'success' },
];

const RUN_STATUS: Record<PipelineRun['status'], { tone: string; label: string }> = {
  success: { tone: 'success', label: '成功' },
  failed: { tone: 'danger', label: '失败' },
  running: { tone: 'brand', label: '运行中' },
  queued: { tone: 'neutral', label: '排队中' },
};

const STAGE_ICON: Record<string, string> = {
  编译: 'box', 单测: 'check', 静态扫描: 'search', 镜像构建: 'layers', 部署预发: 'server', 自动化测试: 'bug',
};

function coverageTone(v: number) {
  return v >= 80 ? 'success' : v >= 75 ? 'brand' : v >= 60 ? 'warning' : 'danger';
}

export default function Development() {
  const [tab, setTab] = useState<TabKey>('board');
  const [devFilter, setDevFilter] = useState<'全部' | '我的' | '阻塞'>('全部');
  const [active, setActive] = useState<DevTask | null>(null);

  const filtered = useMemo(() => {
    if (devFilter === '阻塞') return devTasks.filter((t) => t.status === 'blocked');
    if (devFilter === '我的') return devTasks.filter((t) => t.dev === '许知微');
    return devTasks;
  }, [devFilter]);

  const progressPct = Math.round((stats.devDone / devTasks.length) * 100);

  const taskColumns: Column<DevTask>[] = [
    { key: 'id', header: '任务编号', width: 100, nowrap: true, render: (t) => <span className="t-mono t-xs t-secondary">{t.id}</span> },
    {
      key: 'title',
      header: '开发任务',
      render: (t) => (
        <div className="col col--gap1" style={{ minWidth: 0 }}>
          <span className="t-sm t-medium t-primary t-ellipsis">{t.title}</span>
          <span className="t-xs t-tertiary t-ellipsis">
            {storyById.get(t.storyId)?.title ?? t.storyId} · 设计单 {t.designDocId}
          </span>
        </div>
      ),
    },
    { key: 'module', header: '模块', width: 116, nowrap: true, render: (t) => <Tag tone="brand">{t.module}</Tag> },
    { key: 'dev', header: '开发', width: 108, nowrap: true, render: (t) => <span className="row row--gap2"><Avatar name={t.dev} size="sm" /><span className="t-xs">{t.dev}</span></span> },
    {
      key: 'loc',
      header: '代码变更',
      width: 120,
      render: (t) => (
        <span className="t-xs t-mono">
          <span className="t-success">+{t.loc.added}</span> <span className="t-danger">-{t.loc.removed}</span>
        </span>
      ),
    },
    {
      key: 'coverage',
      header: '单测覆盖',
      width: 120,
      render: (t) => <Progress value={t.coverage} tone={coverageTone(t.coverage)} width={52} />,
    },
    {
      key: 'lint',
      header: '静态扫描',
      width: 116,
      render: (t) => {
        const total = t.lintIssues.blocker + t.lintIssues.major + t.lintIssues.minor;
        return total === 0
          ? <Tag tone="success" dot>零问题</Tag>
          : (
            <span className="row row--gap1">
              {t.lintIssues.blocker > 0 && <Tag tone="danger">{t.lintIssues.blocker}B</Tag>}
              {t.lintIssues.major > 0 && <Tag tone="warning">{t.lintIssues.major}M</Tag>}
              {t.lintIssues.minor > 0 && <Tag tone="info">{t.lintIssues.minor}m</Tag>}
            </span>
          );
      },
    },
    {
      key: 'mr',
      header: 'MR',
      width: 92,
      render: (t) => (t.mr
        ? <span className="row row--gap1"><span className="t-xs t-mono t-brand">{t.mr.id}</span><Tag tone={t.mr.status === 'merged' ? 'success' : t.mr.status === 'open' ? 'brand' : 'neutral'}>{t.mr.status === 'merged' ? '已合' : t.mr.status === 'open' ? '待合' : '关闭'}</Tag></span>
        : <span className="t-xs t-tertiary">—</span>),
    },
    {
      key: 'status',
      header: '状态',
      width: 88,
      render: (t) => <Tag tone={statusTone[t.status]} dot>{statusLabel[t.status]}</Tag>,
    },
  ];

  return (
    <>
      <PageHead
        activeStage="development"
        eyebrow="阶段 09 / 10 · 交付域"
        title="方案开发"
        status={<Tag tone="brand" dot>进行中 62%</Tag>}
        desc="按设计单拆分开发任务，跟踪代码变更、单测覆盖率、静态扫描与流水线状态；阻塞项即时暴露并联动风险台账。"
        actions={
          <>
            <Button icon="refresh">同步代码仓库</Button>
            <Button variant="primary" icon="plus">新建任务</Button>
          </>
        }
      />

      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="开发任务" value={devTasks.length} unit="个" icon="code" delta={`完成 ${stats.devDone}`} deltaTone="up" />
        <Stat label="完成率" value={progressPct} unit="%" icon="check" delta={`进行中 ${stats.devInProgress}`} deltaTone={progressPct >= 60 ? 'up' : 'down'} />
        <Stat label="阻塞任务" value={stats.devBlocked} unit="个" icon="alert" delta="P99 达标依赖" deltaTone="down" />
        <Stat label="平均覆盖率" value={stats.avgCoverage} unit="%" icon="target" delta="目标 75%" deltaTone={stats.avgCoverage >= 75 ? 'up' : 'down'} />
        <Stat
          label="代码净增"
          value={fmtK(stats.totalLoc.added - stats.totalLoc.removed)}
          unit="行"
          icon="git"
          delta={`+${fmtK(stats.totalLoc.added)} / -${fmtK(stats.totalLoc.removed)}`}
          deltaTone="flat"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'board', label: '任务看板', count: devTasks.length },
          { value: 'tasks', label: '任务明细', count: devTasks.length },
          { value: 'ci', label: '流水线', count: pipelineRuns.length },
        ]}
      />

      {tab === 'board' && (
        <div className="col col--gap4">
          <div className="grid grid--board">
            {COLUMNS.map((col) => {
              const items = devTasks.filter((t) => t.status === col.key);
              const pts = items.reduce((s, t) => s + (storyById.get(t.storyId)?.points ?? 0), 0);
              return (
                <div className="card" key={col.key} style={{ padding: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      padding: 'var(--sp-3) var(--sp-4)',
                      background: `var(--${col.tone}-50)`,
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="row row--between">
                      <Tag tone={col.tone} dot>{col.label}</Tag>
                      <span className="t-sm t-semibold t-primary">{items.length}</span>
                    </div>
                    <span className="t-xs t-tertiary">{pts} 故事点</span>
                  </div>
                  <div className="col col--gap2" style={{ padding: 'var(--sp-3)', maxHeight: 560, overflowY: 'auto' }}>
                    {items.length === 0 && <span className="t-xs t-tertiary" style={{ padding: 'var(--sp-3) 0' }}>暂无任务</span>}
                    {items.map((t) => (
                      <div
                        key={t.id}
                        className="col col--gap2"
                        onClick={() => setActive(t)}
                        style={{
                          padding: 'var(--sp-3)',
                          borderRadius: 'var(--r-md)',
                          border: `1px solid ${t.status === 'blocked' ? 'var(--danger-200)' : 'var(--border-subtle)'}`,
                          background: t.status === 'blocked' ? 'var(--danger-50)' : 'var(--surface-1)',
                          cursor: 'pointer',
                        }}
                      >
                        <span className="row row--between">
                          <span className="t-mono t-xs t-tertiary">{t.id}</span>
                          <Tag tone="neutral">{t.module}</Tag>
                        </span>
                        <span className="t-xs t-medium t-primary t-clamp2">{t.title}</span>
                        {t.blocker && (
                          <span className="row row--gap1 t-xs t-danger">
                            <Icon name="alert" size={10} /> {t.blocker}
                          </span>
                        )}
                        <div className="row row--between">
                          <Avatar name={t.dev} size="sm" />
                          <span className="row row--gap2">
                            <span className={`t-xs t-${coverageTone(t.coverage)}`}>{t.coverage}%</span>
                            <span className="t-xs t-tertiary t-mono">{t.loc.added + t.loc.removed} 行</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {stats.devBlocked > 0 && (
            <Note tone="danger">
              存在 {stats.devBlocked} 个阻塞任务，其中 {devTasks.filter((t) => t.status === 'blocked').map((t) => t.id).join('、')} 直接影响
              性能质量属性达标（P99 ≤ 500ms），已登记为 RSK-02 关联项，需架构组介入决策。
            </Note>
          )}

          <div className="grid grid--2">
            <Card title="各模块开发进度" sub={`平均覆盖率 ${stats.avgCoverage}%`}>
              <div className="hbar">
                {Array.from(new Set(devTasks.map((t) => t.module))).map((m) => {
                  const list = devTasks.filter((t) => t.module === m);
                  const done = list.filter((t) => t.status === 'done').length;
                  return (
                    <div className="hbar__row" key={m}>
                      <span className="hbar__label t-xs t-secondary t-ellipsis" style={{ width: 92 }}>{m}</span>
                      <div className="hbar__track">
                        <div className="hbar__fill" style={{ width: `${(done / list.length) * 100}%`, background: done === list.length ? 'var(--success-500)' : 'var(--brand-500)' }} />
                      </div>
                      <span className="hbar__val">{done}/{list.length}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="静态扫描问题" sub={`累计 ${stats.lintTotal.blocker + stats.lintTotal.major + stats.lintTotal.minor} 个`}>
              <div className="grid grid--3" style={{ marginBottom: 'var(--sp-4)' }}>
                <MiniStat label="阻塞" value={stats.lintTotal.blocker} tone={stats.lintTotal.blocker > 0 ? 'danger' : 'success'} />
                <MiniStat label="严重" value={stats.lintTotal.major} tone="warning" />
                <MiniStat label="一般" value={stats.lintTotal.minor} tone="secondary" />
              </div>
              <div className="hbar">
                {(['blocker', 'major', 'minor'] as const).map((k) => {
                  const label = k === 'blocker' ? '阻塞' : k === 'major' ? '严重' : '一般';
                  const max = Math.max(stats.lintTotal.blocker, stats.lintTotal.major, stats.lintTotal.minor, 1);
                  return (
                    <div className="hbar__row" key={k}>
                      <span className="hbar__label t-xs t-secondary" style={{ width: 44 }}>{label}</span>
                      <div className="hbar__track">
                        <div className="hbar__fill" style={{ width: `${(stats.lintTotal[k] / max) * 100}%`, background: k === 'blocker' ? 'var(--danger-500)' : k === 'major' ? 'var(--warning-500)' : 'var(--info-500)' }} />
                      </div>
                      <span className="hbar__val">{stats.lintTotal[k]}</span>
                    </div>
                  );
                })}
              </div>
              {stats.lintTotal.blocker > 0 && <Note tone="danger">存在 {stats.lintTotal.blocker} 个阻塞级静态扫描问题，合并前必须清零。</Note>}
            </Card>
          </div>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="col col--gap4">
          <div className="row row--gap3 row--wrap">
            <Segmented
              value={devFilter}
              onChange={setDevFilter}
              options={[
                { value: '全部' as const, label: '全部', count: devTasks.length },
                { value: '我的' as const, label: '我负责的', count: devTasks.filter((t) => t.dev === '许知微').length },
                { value: '阻塞' as const, label: '阻塞项', count: stats.devBlocked },
              ]}
            />
          </div>

          <Card flush title={`开发任务明细 · ${filtered.length} 个`} sub="点击行查看任务详情">
            <DataTable columns={taskColumns} rows={filtered} onRowClick={setActive} selectedId={active?.id} dense />
          </Card>

          <div className="grid grid--4">
            <Card title="代码量统计">
              <DL
                cols={1}
                items={[
                  { label: '新增行数', value: stats.totalLoc.added.toLocaleString('zh-CN'), mono: true },
                  { label: '删除行数', value: stats.totalLoc.removed.toLocaleString('zh-CN'), mono: true },
                  { label: '净增行数', value: (stats.totalLoc.added - stats.totalLoc.removed).toLocaleString('zh-CN'), mono: true },
                  { label: '缺陷密度', value: '1.6 个/千行' },
                ]}
              />
            </Card>
            <Card title="覆盖率分布">
              <div className="hbar">
                {[['≥80%', 80, 999], ['75-79%', 75, 80], ['60-74%', 60, 75], ['<60%', 0, 60]].map(([label, lo, hi]) => {
                  const n = devTasks.filter((t) => t.coverage >= (lo as number) && t.coverage < (hi as number)).length;
                  return (
                    <div className="hbar__row" key={label as string}>
                      <span className="hbar__label t-xs t-secondary" style={{ width: 56 }}>{label}</span>
                      <div className="hbar__track">
                        <div className="hbar__fill" style={{ width: `${(n / devTasks.length) * 100}%`, background: (lo as number) >= 75 ? 'var(--success-500)' : (lo as number) >= 60 ? 'var(--warning-500)' : 'var(--danger-500)' }} />
                      </div>
                      <span className="hbar__val">{n}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card title="开发者工作量">
              <div className="hbar">
                {Array.from(new Set(devTasks.map((t) => t.dev))).map((dev) => {
                  const n = devTasks.filter((t) => t.dev === dev).length;
                  const max = Math.max(...Array.from(new Set(devTasks.map((t) => t.dev))).map((d) => devTasks.filter((t) => t.dev === d).length));
                  return (
                    <div className="hbar__row" key={dev}>
                      <span className="hbar__label t-xs t-secondary" style={{ width: 56 }}>{dev}</span>
                      <div className="hbar__track">
                        <div className="hbar__fill" style={{ width: `${(n / max) * 100}%`, background: 'var(--violet-500)' }} />
                      </div>
                      <span className="hbar__val">{n}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card title="MR 状态">
              <div className="grid grid--1" style={{ gap: 'var(--sp-3)' }}>
                <MiniStat label="已合并" value={devTasks.filter((t) => t.mr?.status === 'merged').length} tone="success" />
                <MiniStat label="待合并" value={devTasks.filter((t) => t.mr?.status === 'open').length} tone="brand" />
                <MiniStat label="无 MR" value={devTasks.filter((t) => !t.mr).length} tone="secondary" />
              </div>
              <Note tone="info">所有 MR 需至少 1 位评审人 Approve 且流水线全绿方可合并。</Note>
            </Card>
          </div>
        </div>
      )}

      {tab === 'ci' && (
        <div className="col col--gap4">
          <div className="grid grid--4">
            <Stat label="流水线运行" value={pipelineRuns.length} unit="次" icon="refresh" />
            <Stat label="成功" value={stats.pipelineGreen} unit="次" icon="check" delta={`成功率 ${Math.round((stats.pipelineGreen / pipelineRuns.length) * 100)}%`} deltaTone="up" />
            <Stat label="失败" value={stats.pipelineRed} unit="次" icon="x" delta="最近一次失败待修复" deltaTone="down" />
            <Stat
              label="平均耗时"
              value={Math.round(pipelineRuns.reduce((s, p) => s + p.durationSec, 0) / pipelineRuns.length / 60)}
              unit="分钟"
              icon="clock"
              delta="目标 ≤ 12 分钟"
              deltaTone="flat"
            />
          </div>

          <SplitContentCards runs={pipelineRuns} />
        </div>
      )}

      {/* ============ 任务抽屉 ============ */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        width={620}
        title={active?.title ?? ''}
        sub={active && `${active.id} · ${active.module} ${active.branch}`}
        foot={
          <>
            <Button onClick={() => setActive(null)}>关闭</Button>
            {active?.mr && <Button variant="primary" icon="external">打开 MR</Button>}
          </>
        }
      >
        {active && (
          <div className="col col--gap5">
            <div className="row row--gap2 row--wrap">
              <Tag tone={statusTone[active.status]} dot size="lg">{statusLabel[active.status]}</Tag>
              <Tag tone="brand">{active.module}</Tag>
              <Tag tone="neutral">{active.branch}</Tag>
            </div>

            {active.blocker && <Note tone="danger">阻塞原因：{active.blocker}</Note>}

            <DL
              cols={2}
              items={[
                { label: '开发人员', value: active.dev },
                { label: '评审人', value: active.reviewer },
                { label: '关联故事', value: storyById.get(active.storyId)?.title ?? active.storyId },
                { label: '设计文档', value: docById.get(active.designDocId)?.name ?? active.designDocId },
                { label: '开始日期', value: active.startDate },
                { label: '计划完成', value: active.dueDate },
                { label: '提交次数', value: `${active.commits} 次` },
                { label: '单测覆盖率', value: `${active.coverage}%` },
                { label: '新增 / 删除', value: `+${active.loc.added} / -${active.loc.removed}`, mono: true },
                { label: '静态扫描', value: `${active.lintIssues.blocker} 阻塞 / ${active.lintIssues.major} 严重 / ${active.lintIssues.minor} 一般` },
              ]}
            />

            {active.mr && (
              <Card title="合并请求" sub={`${active.mr.id} · ${active.mr.approvals} 个 Approve`}>
                <div className="row row--between">
                  <span className="code code--inline t-xs">{active.mr.url}</span>
                  <Tag tone={active.mr.status === 'merged' ? 'success' : active.mr.status === 'open' ? 'brand' : 'neutral'} dot>
                    {active.mr.status === 'merged' ? '已合并' : active.mr.status === 'open' ? '待合并' : '已关闭'}
                  </Tag>
                </div>
              </Card>
            )}

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">关联流水线</span>
              <div className="col col--gap2">
                {pipelineRuns.filter((p) => p.branch === active.branch).slice(0, 4).map((p) => (
                  <div className="row row--between" key={p.id}>
                    <span className="row row--gap2 t-xs">
                      <Icon name={STAGE_ICON[p.stage] ?? 'box'} size={12} />
                      <span className="t-mono t-tertiary">{p.id}</span>
                      <span className="t-secondary">{p.stage}</span>
                    </span>
                    <Tag tone={RUN_STATUS[p.status].tone} dot>{RUN_STATUS[p.status].label}</Tag>
                  </div>
                ))}
                {pipelineRuns.filter((p) => p.branch === active.branch).length === 0 && (
                  <span className="t-xs t-tertiary">该分支暂无流水线记录。</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

/* ============================ 流水线视图 ============================ */

function SplitContentCards({ runs }: { runs: PipelineRun[] }) {
  const [stageFilter, setStageFilter] = useState<string>('全部');
  const stages = Array.from(new Set(runs.map((r) => r.stage)));
  const shown = stageFilter === '全部' ? runs : runs.filter((r) => r.stage === stageFilter);

  const columns: Column<PipelineRun>[] = [
    { key: 'id', header: '运行编号', width: 104, nowrap: true, render: (p) => <span className="t-mono t-xs t-secondary">{p.id}</span> },
    {
      key: 'stage',
      header: '阶段',
      width: 116,
      nowrap: true,
      render: (p) => (
        <span className="row row--gap2 t-sm t-medium t-primary">
          <Icon name={STAGE_ICON[p.stage] ?? 'box'} size={13} />
          {p.stage}
        </span>
      ),
    },
    { key: 'branch', header: '分支', width: 176, nowrap: true, render: (p) => <span className="code code--inline t-xs">{p.branch}</span> },
    { key: 'by', header: '触发人', width: 82, nowrap: true, render: (p) => <span className="t-xs t-secondary">{p.triggeredBy}</span> },
    { key: 'at', header: '完成时间', width: 148, nowrap: true, render: (p) => <span className="t-xs t-tertiary t-mono">{p.finishedAt}</span> },
    { key: 'dur', header: '耗时', width: 84, align: 'right', render: (p) => <span className="t-xs t-mono">{p.durationSec}s</span> },
    {
      key: 'status',
      header: '状态',
      width: 88,
      render: (p) => <Tag tone={RUN_STATUS[p.status].tone} dot>{RUN_STATUS[p.status].label}</Tag>,
    },
    {
      key: 'fail',
      header: '失败原因',
      render: (p) => (p.failure ? <span className="t-xs t-danger">{p.failure}</span> : <span className="t-xs t-tertiary">—</span>),
    },
  ];

  const byStage = stages.map((s) => ({
    stage: s,
    total: runs.filter((r) => r.stage === s).length,
    ok: runs.filter((r) => r.stage === s && r.status === 'success').length,
  }));

  return (
    <div className="col col--gap4">
      <div className="row row--gap2 row--wrap">
        {byStage.map((s) => (
          <div
            className="card"
            key={s.stage}
            style={{ padding: 'var(--sp-3) var(--sp-4)', flex: '1 1 140px', cursor: 'pointer', borderColor: stageFilter === s.stage ? 'var(--brand-300)' : undefined }}
            onClick={() => setStageFilter(stageFilter === s.stage ? '全部' : s.stage)}
          >
            <div className="row row--gap2">
              <Icon name={STAGE_ICON[s.stage] ?? 'box'} size={14} />
              <span className="t-xs t-medium t-primary">{s.stage}</span>
            </div>
            <div className="row row--between" style={{ marginTop: 'var(--sp-2)' }}>
              <span className="t-sm t-semibold">{s.ok}/{s.total}</span>
              <Tag tone={s.ok === s.total ? 'success' : 'danger'}>{s.ok === s.total ? '全绿' : '有失败'}</Tag>
            </div>
          </div>
        ))}
        {stageFilter !== '全部' && (
          <Button variant="ghost" icon="x" onClick={() => setStageFilter('全部')}>清除筛选</Button>
        )}
      </div>

      <Card flush title={`流水线运行记录 · ${shown.length} 条`} sub="点击阶段卡片可筛选">
        <DataTable columns={columns} rows={shown} dense />
      </Card>
    </div>
  );
}

function fmtK(n: number) {
  return n.toLocaleString('zh-CN');
}
