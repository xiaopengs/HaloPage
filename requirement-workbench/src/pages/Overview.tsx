import { Link } from 'react-router-dom';
import { Card, Stat, Tag, Progress, Button } from '../components/ui';
import { PageHead, SectionLabel, MiniStat } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import { project, stats, stageNav, fmt, riskTone, riskLabel, requirements } from '../data';

/* ============================ 环形进度 ============================ */

function Ring({ value, label, size = 132 }: { value: number; label: string; size?: number }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="9" />
        <circle
          className="ring__value"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="9"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring__center">
        <span className="ring__num">
          {value}
          <small>%</small>
        </span>
        <span className="ring__label">{label}</span>
      </div>
    </div>
  );
}

/* ============================ 页面 ============================ */

export default function Overview() {
  const stageProgress = Math.round(stageNav.reduce((s, x) => s + x.progress, 0) / stageNav.length);
  const pointProgress = Math.round((project.metrics.completedPoints / project.metrics.storyPoints) * 100);
  const doneMilestones = project.milestones.filter((m) => m.status === '已完成').length;

  // 需求优先级分布
  const maxP = Math.max(...stats.byPriority.map((p) => p.total));

  return (
    <>
      <PageHead
        title="项目总览"
        showFlow={false}
        desc="智能客服中台 v2.0 全生命周期视图，覆盖需求输入到项目测试共 10 个阶段。"
        actions={
          <>
            <Button icon="download">导出周报</Button>
            <Button variant="primary" icon="play">
              进入当前阶段
            </Button>
          </>
        }
      />

      {/* ============ 健康横幅 ============ */}
      <div className="hero" style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="hero__grid">
          <div>
            <span className="hero__eyebrow">
              <Icon name="activity" size={12} />
              {project.code} · 状态 {project.health}
            </span>
            <h2 className="hero__title">{project.name}</h2>
            <p className="hero__desc">{project.description}</p>
            <div className="hero__meta">
              <MiniStat label="项目负责人" value={project.owner} />
              <MiniStat label="项目周期" value={`${project.startDate.slice(2)} → ${project.targetDate.slice(2)}`} />
              <MiniStat label="团队规模" value={`${project.team.length} 人`} />
              <MiniStat
                label="当前阶段"
                value={stageNav.find((s) => s.status === 'active')?.name ?? '—'}
                tone="brand"
              />
            </div>
          </div>
          <div className="hero__ring">
            <Ring value={stageProgress} label="阶段平均进度" />
            <div className="col col--gap4" style={{ minWidth: 130 }}>
              <div className="col col--gap1">
                <span className="t-xs t-tertiary">故事点完成</span>
                <span className="t-lg t-semibold">
                  {project.metrics.completedPoints}
                  <span className="t-sm t-tertiary"> / {project.metrics.storyPoints}</span>
                </span>
                <Progress value={pointProgress} tone="success" width={110} label={`${pointProgress}%`} />
              </div>
              <div className="col col--gap1">
                <span className="t-xs t-tertiary">里程碑</span>
                <span className="t-lg t-semibold">
                  {doneMilestones}
                  <span className="t-sm t-tertiary"> / {project.milestones.length}</span>
                </span>
                <Progress
                  value={(doneMilestones / project.milestones.length) * 100}
                  tone="info"
                  width={110}
                  label={`${Math.round((doneMilestones / project.milestones.length) * 100)}%`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ 核心指标 ============ */}
      <SectionLabel>核心指标</SectionLabel>
      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-6)' }}>
        <Stat
          label="需求总数"
          value={project.metrics.requirementCount}
          unit="条"
          icon="inbox"
          delta={`通过率 ${stats.approvalRate}%`}
          deltaTone="up"
          foot=""
        />
        <Stat
          label="测试用例"
          value={fmt.num(project.metrics.testCaseCount)}
          unit="条"
          icon="clipboard"
          delta={`自动化 ${stats.autoRate}%`}
          deltaTone={stats.autoRate >= 70 ? 'up' : 'down'}
        />
        <Stat
          label="未闭环缺陷"
          value={project.metrics.defectOpen}
          unit="个"
          icon="bug"
          delta={`P0 ${stats.p0Defects} 个`}
          deltaTone={stats.p0Defects > 0 ? 'down' : 'up'}
        />
        <Stat label="代码覆盖率" value={stats.avgCoverage} unit="%" icon="code" delta="目标 75%" deltaTone={stats.avgCoverage >= 75 ? 'up' : 'down'} />
        <Stat
          label="缺陷密度"
          value={project.metrics.bugRate}
          unit="个/千行"
          icon="trend"
          delta="低于基线 2.4"
          deltaTone="up"
        />
      </div>

      {/* ============ 阶段流水线 ============ */}
      <SectionLabel>阶段推进</SectionLabel>
      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-6)' }}>
        {stageNav.map((s) => {
          const tone = s.status === 'done' ? 'success' : s.status === 'active' ? 'brand' : 'neutral';
          return (
            <Link
              key={s.key}
              to={s.path}
              className="card"
              style={{
                padding: 'var(--sp-4)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sp-3)',
                borderColor: s.status === 'active' ? 'var(--brand-200)' : undefined,
                background: s.status === 'active' ? 'var(--brand-50)' : undefined,
                textDecoration: 'none',
              }}
            >
              <div className="row row--between">
                <span className="row row--gap2">
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 'var(--r-xs)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      background: s.status === 'done' ? 'var(--success-100)' : s.status === 'active' ? 'var(--brand-500)' : 'var(--ink-150)',
                      color: s.status === 'done' ? 'var(--success-700)' : s.status === 'active' ? '#fff' : 'var(--text-tertiary)',
                    }}
                  >
                    {s.status === 'done' ? <Icon name="check" size={11} strokeWidth={3} /> : s.index}
                  </span>
                  <span className="t-sm t-medium t-primary">{s.name}</span>
                </span>
                <Tag tone={tone}>{s.status === 'done' ? '完成' : s.status === 'active' ? '进行中' : '未开始'}</Tag>
              </div>
              <Progress value={s.progress} tone={tone === 'neutral' ? 'brand' : tone} width={200} />
              <span className="t-xs t-tertiary">{s.hint}</span>
            </Link>
          );
        })}
      </div>

      {/* ============ 两栏：里程碑 + 风险 ============ */}
      <div className="grid grid--split-sticky" style={{ marginBottom: 'var(--sp-6)' }}>
        <Card
          title="里程碑"
          sub={`${doneMilestones}/${project.milestones.length} 已完成`}
          actions={<Button variant="ghost" size="sm" iconRight="arrowRight">查看全部</Button>}
          flush
        >
          <div className="list">
            {project.milestones.map((m) => {
              const cls = m.status === '已完成' ? 'done' : m.status === '进行中' ? 'active' : 'pending';
              return (
                <div className="milestone-row" key={m.name}>
                  <span className={`milestone-dot milestone-dot--${cls}`}>
                    <Icon name={m.status === '已完成' ? 'check' : m.status === '进行中' ? 'play' : 'clock'} size={11} strokeWidth={2.5} />
                  </span>
                  <div className="col col--gap1" style={{ minWidth: 0 }}>
                    <span className="t-sm t-medium t-primary t-ellipsis">{m.name}</span>
                    <span className="t-xs t-tertiary">负责人 · {m.owner}</span>
                  </div>
                  <span className="t-xs t-tertiary t-mono">{m.date}</span>
                  <span>
                    <Tag tone={m.status === '已完成' ? 'success' : m.status === '进行中' ? 'brand' : 'neutral'} dot>
                      {m.status}
                    </Tag>
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          title="风险登记册"
          sub={`${project.risks.filter((r) => r.status === '跟踪中').length} 项跟踪中`}
          actions={<Button variant="ghost" size="sm" iconRight="arrowRight">风险台账</Button>}
        >
          <div className="col col--gap3">
            {project.risks.map((r) => (
              <div key={r.id} className="col col--gap2" style={{ paddingBottom: 'var(--sp-3)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="row row--between row--gap2">
                  <span className="row row--gap2" style={{ minWidth: 0 }}>
                    <span className="t-mono t-xs t-tertiary">{r.id}</span>
                    <span className="t-sm t-medium t-primary t-ellipsis">{r.title}</span>
                  </span>
                  <Tag tone={riskTone[r.level]} dot>
                    {riskLabel[r.level]}风险
                  </Tag>
                </div>
                <span className="t-xs t-tertiary">{r.impactDesc}</span>
                <div className="row row--gap3 t-xs t-tertiary">
                  <span>概率 {r.probability}</span>
                  <span>·</span>
                  <span>责任人 {r.owner}</span>
                  <span>·</span>
                  <span>{r.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ============ 需求分布 + 团队 ============ */}
      <div className="grid grid--split-even">
        <Card title="需求优先级分布" sub={`共 ${requirements.length} 条`}>
          <div className="hbar">
            {stats.byPriority.map((p) => (
              <div className="hbar__row" key={p.priority}>
                <span className="hbar__label">
                  <Tag tone={p.priority === 'P0' ? 'danger' : p.priority === 'P1' ? 'warning' : p.priority === 'P2' ? 'info' : 'neutral'}>{p.priority}</Tag>
                </span>
                <div className="hbar__track">
                  <div
                    className="hbar__fill"
                    style={{
                      width: `${(p.total / maxP) * 100}%`,
                      background:
                        p.priority === 'P0' ? 'var(--danger-500)'
                          : p.priority === 'P1' ? 'var(--warning-500)'
                            : p.priority === 'P2' ? 'var(--info-500)' : 'var(--ink-300)',
                    }}
                  />
                </div>
                <span className="hbar__val">{p.total}</span>
              </div>
            ))}
          </div>
          <hr className="divider" />
          <div className="row row--gap4 row--wrap t-xs t-tertiary">
            <span>已通过 {stats.approved}</span>
            <span>驳回 {stats.rejected}</span>
            <span>变更中 {stats.pending}</span>
            <span>评审意见闭环 {stats.commentClosedRate}%</span>
          </div>
        </Card>

        <Card title="项目团队" sub={`${project.team.length} 人`}>
          <div className="grid grid--tiles">
            {project.team.map((m) => (
              <div key={m.name} className="row row--gap2" style={{ minWidth: 0 }}>
                <span className={`avatar avatar--${m.avatarTone}`}>{m.name.slice(0, 1)}</span>
                <span className="col" style={{ minWidth: 0 }}>
                  <span className="t-sm t-medium t-primary">{m.name}</span>
                  <span className="t-xs t-tertiary t-ellipsis">{m.role}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
