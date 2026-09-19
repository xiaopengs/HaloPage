import { useState } from 'react';
import { Card, Stat, Tag, Progress, Button, Note, DL, Avatar } from '../components/ui';
import { PageHead, SectionLabel, SplitContent, DataTable } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import { requirementDocs, stats, reqById } from '../data';
import type { RequirementDoc } from '../data';

const GRADE_DESC: Record<RequirementDoc['grade'], string> = {
  A: '文档完备，可直接进入设计',
  B: '基本完备，需小范围补充',
  C: '存在明显缺口，需返工',
  D: '不满足评审准入，需重写',
};

const STATUS_TONE: Record<RequirementDoc['status'], string> = {
  待打分: 'neutral',
  已打分: 'success',
  需返工: 'danger',
};

function dimTone(score: number) {
  if (score >= 90) return 'success';
  if (score >= 80) return 'brand';
  if (score >= 70) return 'warning';
  return 'danger';
}

export default function Scoring() {
  const [activeId, setActiveId] = useState(requirementDocs[0].id);
  const active = requirementDocs.find((d) => d.id === activeId)!;

  const columns: Column<RequirementDoc>[] = [
    { key: 'id', header: '文档编号', width: 126, nowrap: true, render: (d) => <span className="t-mono t-xs t-secondary">{d.id}</span> },
    {
      key: 'name',
      header: '文档名称',
      render: (d) => (
        <div className="col col--gap1" style={{ minWidth: 0 }}>
          <span className="t-sm t-medium t-primary t-ellipsis">{d.name}</span>
          <span className="t-xs t-tertiary">
            {d.version} · {d.author} 更新于 {d.updatedAt}
          </span>
        </div>
      ),
    },
    {
      key: 'reqs',
      header: '覆盖需求',
      width: 140,
      render: (d) => <span className="t-xs t-tertiary t-ellipsis">{d.requirementIds.join('、')}</span>,
    },
    {
      key: 'score',
      header: '加权得分',
      width: 130,
      render: (d) => (
        <div className="row row--gap2">
          <span className={`t-md t-semibold t-${dimTone(d.totalScore)}`}>{d.totalScore.toFixed(1)}</span>
          <Progress value={d.totalScore} tone={dimTone(d.totalScore)} width={54} />
        </div>
      ),
    },
    {
      key: 'grade',
      header: '等级',
      width: 76,
      render: (d) => <span className={`score-dial__grade grade--${d.grade}`} style={{ width: 26, height: 26, fontSize: 13 }}>{d.grade}</span>,
    },
    {
      key: 'findings',
      header: '问题项',
      width: 84,
      render: (d) => {
        const n = d.dimensions.reduce((s, x) => s + x.findings.length, 0);
        return <span className="t-xs"><span className="t-semibold">{n}</span><span className="t-tertiary"> 项</span></span>;
      },
    },
    { key: 'status', header: '状态', width: 88, render: (d) => <Tag tone={STATUS_TONE[d.status]} dot>{d.status}</Tag> },
  ];

  const gradeDist = stats.gradeDist;
  const maxGrade = Math.max(...gradeDist.map((g) => g.count));

  return (
    <>
      <PageHead
        activeStage="scoring"
        eyebrow="阶段 04 / 10 · 需求域"
        title="需求文档打分"
        status={<Tag tone="success" dot>已完成</Tag>}
        desc="以六个加权维度对需求文档量化打分，A/B 级可直接进入架构设计，C/D 级需返工并复评，形成文档质量门禁。"
        actions={
          <>
            <Button icon="download">导出评分报告</Button>
            <Button variant="primary" icon="star">发起评分</Button>
          </>
        }
      />

      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="受评文档" value={requirementDocs.length} unit="份" icon="fileText" delta={`覆盖 ${requirementDocs.reduce((s, d) => s + d.requirementIds.length, 0)} 条需求`} deltaTone="flat" />
        <Stat label="平均得分" value={stats.avgDocScore} icon="star" delta="门槛 80.0" deltaTone={stats.avgDocScore >= 80 ? 'up' : 'down'} />
        <Stat label="A 级文档" value={gradeDist.find((g) => g.grade === 'A')!.count} unit="份" icon="check" delta="可直接进入设计" deltaTone="up" />
        <Stat
          label="需返工"
          value={requirementDocs.filter((d) => d.status === '需返工').length}
          unit="份"
          icon="alert"
          delta="C/D 级"
          deltaTone="down"
        />
        <Stat
          label="评审人评分"
          value={requirementDocs.reduce((s, d) => s + d.reviewers.length, 0)}
          unit="人次"
          icon="users"
          delta="含交叉复核"
          deltaTone="flat"
        />
      </div>

      <SectionLabel>评分总览</SectionLabel>
      <div className="grid grid--split-aside" style={{ marginBottom: 'var(--sp-5)' }}>
        <Card title="等级分布" sub={`平均分 ${stats.avgDocScore} 分`}>
          <div className="hbar">
            {gradeDist.map((g) => (
              <div className="hbar__row" key={g.grade}>
                <span className="hbar__label">
                  <span className={`score-dial__grade grade--${g.grade}`} style={{ width: 22, height: 22, fontSize: 12 }}>{g.grade}</span>
                </span>
                <div className="hbar__track">
                  <div
                    className="hbar__fill"
                    style={{
                      width: `${maxGrade ? (g.count / maxGrade) * 100 : 0}%`,
                      background: g.grade === 'A' ? 'var(--success-500)' : g.grade === 'B' ? 'var(--brand-500)' : g.grade === 'C' ? 'var(--warning-500)' : 'var(--danger-500)',
                    }}
                  />
                </div>
                <span className="hbar__val">{g.count} 份</span>
              </div>
            ))}
          </div>
          <div className="legend" style={{ marginTop: 'var(--sp-3)' }}>
            {(['A', 'B', 'C', 'D'] as const).map((g) => (
              <span className="legend__item" key={g}><b>{g}</b> {GRADE_DESC[g]}</span>
            ))}
          </div>
        </Card>

        <Card title="六维平均分" sub="全量文档加权前的维度均分">
          <div className="hbar">
            {requirementDocs[0].dimensions.map((dim) => {
              const avg = requirementDocs.reduce(
                (s, d) => s + (d.dimensions.find((x) => x.key === dim.key)?.score ?? 0), 0,
              ) / requirementDocs.length;
              return (
                <div className="hbar__row" key={dim.key}>
                  <span className="hbar__label t-xs t-secondary" style={{ width: 78 }}>{dim.label}</span>
                  <div className="hbar__track">
                    <div className="hbar__fill" style={{ width: `${avg}%`, background: dimTone(avg) === 'success' ? 'var(--success-500)' : dimTone(avg) === 'brand' ? 'var(--brand-500)' : dimTone(avg) === 'warning' ? 'var(--warning-500)' : 'var(--danger-500)' }} />
                  </div>
                  <span className="hbar__val">{avg.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <SectionLabel>文档清单</SectionLabel>
      <SplitContent
        asideWidth={380}
        main={
          <Card flush title="受评文档" sub="点击行查看维度明细">
            <DataTable columns={columns} rows={requirementDocs} onRowClick={(d) => setActiveId(d.id)} selectedId={activeId} dense />
          </Card>
        }
        aside={
          <div className="col col--gap4">
            <Card
              title={active.name}
              sub={`${active.id} · ${active.version} · ${active.author}`}
              actions={<Tag tone={STATUS_TONE[active.status]} dot>{active.status}</Tag>}
            >
              <div className="col col--gap4">
                <div className="row row--gap4" style={{ alignItems: 'center' }}>
                  <div className="score-dial">
                    <span className="score-dial__grade" style={{ position: 'absolute', opacity: 0 }}>{active.grade}</span>
                    <LevelDial score={active.totalScore} grade={active.grade} />
                  </div>
                  <div className="col col--gap1 flex1">
                    <span className="t-xs t-tertiary">综合加权得分</span>
                    <span className="t-xl t-semibold">{active.totalScore.toFixed(1)}</span>
                    <span className="t-xs t-tertiary">{GRADE_DESC[active.grade]}</span>
                  </div>
                </div>

                <div className="col col--gap3">
                  {active.dimensions.map((dim) => (
                    <div className="dim-row" key={dim.key}>
                      <div className="row row--between">
                        <span className="t-sm t-medium t-primary">{dim.label}</span>
                        <span className="row row--gap2">
                          <span className="t-xs t-tertiary">权重 {(dim.weight * 100).toFixed(0)}%</span>
                          <span className={`t-sm t-semibold t-${dimTone(dim.score)}`}>{dim.score}</span>
                        </span>
                      </div>
                      <div className="dim-row__bar">
                        <div className={`dim-row__fill prog__fill--${dimTone(dim.score)}`} style={{ width: `${dim.score}%`, background: `var(--${dimTone(dim.score) === 'brand' ? 'brand' : dimTone(dim.score)}-500)` }} />
                      </div>
                      <span className="t-xs t-tertiary">{dim.description}</span>
                      {dim.findings.length > 0 && (
                        <div className="dim-detail">
                          {dim.findings.map((f) => (
                            <div key={f} className="row row--gap2 t-xs t-secondary">
                              <Icon name="minus" size={10} />
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card title="评审人意见" sub={`${active.reviewers.length} 位评审人`}>
              <div className="col col--gap3">
                {active.reviewers.map((rv) => (
                  <div key={rv.name} className="row row--gap3" style={{ alignItems: 'flex-start' }}>
                    <Avatar name={rv.name} tone={rv.score >= 85 ? 'success' : rv.score >= 75 ? 'brand' : 'warning'} size="sm" />
                    <div className="col col--gap1 flex1" style={{ minWidth: 0 }}>
                      <div className="row row--between">
                        <span className="t-sm t-medium t-primary">{rv.name}</span>
                        <span className={`t-sm t-semibold t-${dimTone(rv.score)}`}>{rv.score}</span>
                      </div>
                      <span className="t-xs t-secondary">{rv.comment}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="覆盖需求" sub={`${active.requirementIds.length} 条`}>
              <div className="col col--gap2">
                {active.requirementIds.map((rid) => (
                  <div key={rid} className="row row--between row--gap2">
                    <span className="t-xs t-mono t-brand t-nowrap">{rid}</span>
                    <span className="t-xs t-secondary t-ellipsis flex1">{reqById.get(rid)?.title ?? '—'}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="建议动作">
              <div className="col col--gap2">
                {active.actions.map((a) => (
                  <div key={a} className="row row--gap2 t-sm t-secondary">
                    <Icon name="arrowRight" size={12} />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
              {active.grade === 'C' || active.grade === 'D' ? (
                <Note tone="danger">该文档未达准入线（≥80 分），必须返工并重新评分后方可进入架构设计。</Note>
              ) : (
                <Note tone="success">文档已达到架构设计准入门槛，可流转至下一阶段。</Note>
              )}
            </Card>
          </div>
        }
      />

      <SectionLabel>文档质量门禁</SectionLabel>
      <Card title="阶段门禁检查" sub="需求域出口条件">
        <div className="grid grid--4">
          <GateItem
            icon="check"
            title="需求池澄清"
            desc="24 条需求全部完成来源与验收标准澄清"
            done
          />
          <GateItem
            icon="check"
            title="评审意见闭环"
            desc={`${stats.commentClosed}/${stats.commentTotal} 条意见闭环，闭环率 ${stats.commentClosedRate}%`}
            done={stats.commentClosedRate === 100}
          />
          <GateItem
            icon="check"
            title="文档评分达标"
            desc={`平均 ${stats.avgDocScore} 分，A/B 级占比 ${Math.round(((gradeDist.find((g) => g.grade === 'A')!.count + gradeDist.find((g) => g.grade === 'B')!.count) / requirementDocs.length) * 100)}%`}
            done
          />
          <GateItem
            icon="alert"
            title="C 级文档返工"
            desc={`${requirementDocs.filter((d) => d.grade === 'C').length} 份 C 级文档已排期返工`}
            done={false}
          />
        </div>
        <hr className="divider" />
        <DL
          cols={4}
          items={[
            { label: '门禁负责人', value: '陈砚舟' },
            { label: '最近评分时间', value: requirementDocs[0].updatedAt },
            { label: '评分维度数', value: `${requirementDocs[0].dimensions.length} 维` },
            { label: '结论', value: '有条件通过，C 级文档跟踪返工', mono: false },
          ]}
        />
      </Card>
    </>
  );
}

/* ============================ 环形得分 ============================ */

function LevelDial({ score, grade }: { score: number; grade: RequirementDoc['grade'] }) {
  const size = 104;
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const tone = grade === 'A' ? 'success' : grade === 'B' ? 'brand' : grade === 'C' ? 'warning' : 'danger';
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth="8"
          stroke={`var(--${tone}-500)`}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset .5s ease' }}
        />
      </svg>
      <div className="ring__center">
        <span className={`score-dial__grade grade--${grade}`} style={{ width: 34, height: 34, fontSize: 17 }}>{grade}</span>
        <span className="ring__label">{score.toFixed(1)} 分</span>
      </div>
    </div>
  );
}

/* ============================ 门禁项 ============================ */

function GateItem({ icon, title, desc, done }: { icon: string; title: string; desc: string; done: boolean }) {
  return (
    <div className="col col--gap2" style={{ padding: 'var(--sp-3)', borderRadius: 'var(--r-md)', background: done ? 'var(--success-50)' : 'var(--warning-50)', border: `1px solid var(--${done ? 'success' : 'warning'}-100)` }}>
      <span className="row row--gap2">
        <Icon name={icon} size={15} />
        <span className="t-sm t-semibold t-primary">{title}</span>
      </span>
      <span className="t-xs t-secondary">{desc}</span>
      <Tag tone={done ? 'success' : 'warning'} dot>{done ? '已通过' : '跟踪中'}</Tag>
    </div>
  );
}
