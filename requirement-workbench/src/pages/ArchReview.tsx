import { useMemo, useState } from 'react';
import { Card, Stat, Tag, Button, Tabs, Note, DL, Avatar, Segmented } from '../components/ui';
import { PageHead, DataTable, MiniStat, SplitContent } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import { archReviews, qualityAttributes, stats, archDecisions } from '../data';
import type { ArchReviewItem } from '../data';

type TabKey = 'dimensions' | 'followups';

type FollowUp = ArchReviewItem['followUps'][number] & { reviewId: string; dimension: string };

const VERDICT: Record<string, { label: string; tone: string }> = {
  pass: { label: '通过', tone: 'success' },
  conditional: { label: '有条件通过', tone: 'warning' },
  reject: { label: '驳回', tone: 'danger' },
  pending: { label: '待答辩', tone: 'neutral' },
};

const DIM_ICON: Record<ArchReviewItem['dimension'], string> = {
  架构合理性: 'layers',
  技术选型: 'box',
  性能容量: 'zap',
  安全合规: 'shield',
  可运维性: 'server',
  成本投入: 'scale',
};

export default function ArchReview() {
  const [tab, setTab] = useState<TabKey>('dimensions');
  const [activeId, setActiveId] = useState(archReviews[0].id);
  const [fuFilter, setFuFilter] = useState<'全部' | '未完成' | '已完成'>('全部');

  const active = archReviews.find((r) => r.id === activeId)!;

  const allFollowUps: FollowUp[] = useMemo(
    () => archReviews.flatMap((r) => r.followUps.map((f) => ({ ...f, reviewId: r.id, dimension: r.dimension }))),
    [],
  );

  const followUps = useMemo(() => {
    if (fuFilter === '未完成') return allFollowUps.filter((f) => !f.done);
    if (fuFilter === '已完成') return allFollowUps.filter((f) => f.done);
    return allFollowUps;
  }, [allFollowUps, fuFilter]);

  const columns: Column<ArchReviewItem>[] = [
    { key: 'id', header: '编号', width: 84, nowrap: true, render: (r) => <span className="t-mono t-xs t-secondary">{r.id}</span> },
    {
      key: 'dim',
      header: '评审维度',
      width: 124,
      nowrap: true,
      render: (r) => (
        <span className="row row--gap2 t-sm t-medium t-primary">
          <Icon name={DIM_ICON[r.dimension]} size={13} />
          {r.dimension}
        </span>
      ),
    },
    { key: 'q', header: '评审问题', render: (r) => <span className="t-xs t-secondary">{r.question}</span> },
    { key: 'reviewer', header: '评审人', width: 84, nowrap: true, render: (r) => <span className="t-xs t-secondary">{r.reviewer}</span> },
    { key: 'risk', header: '风险', width: 74, render: (r) => <Tag tone={r.riskLevel === 'low' ? 'success' : r.riskLevel === 'medium' ? 'warning' : 'danger'} dot>{r.riskLevel === 'low' ? '低' : r.riskLevel === 'medium' ? '中' : '高'}</Tag> },
    { key: 'fu', header: '待办', width: 74, render: (r) => <span className="t-xs">{r.followUps.filter((f) => !f.done).length} / {r.followUps.length}</span> },
    { key: 'verdict', header: '结论', width: 106, render: (r) => <Tag tone={VERDICT[r.verdict].tone} dot>{VERDICT[r.verdict].label}</Tag> },
  ];

  const fuColumns: Column<FollowUp>[] = [
    { key: 'id', header: '待办编号', width: 96, nowrap: true, render: (f) => <span className="t-mono t-xs t-secondary">{f.id}</span> },
    { key: 'dim', header: '来源维度', width: 118, nowrap: true, render: (f) => <span className="t-xs t-secondary">{f.dimension}</span> },
    { key: 'content', header: '待办内容', render: (f) => <span className="t-xs t-secondary">{f.content}</span> },
    { key: 'owner', header: '责任人', width: 82, nowrap: true, render: (f) => <span className="t-xs t-secondary">{f.owner}</span> },
    { key: 'due', header: '截止日期', width: 100, nowrap: true, render: (f) => <span className="t-xs t-mono t-tertiary">{f.dueDate}</span> },
    {
      key: 'done',
      header: '状态',
      width: 88,
      render: (f) => (f.done ? <Tag tone="success" dot>已完成</Tag> : <Tag tone="warning" dot>跟踪中</Tag>),
    },
  ];

  const verdictCount = (v: string) => archReviews.filter((r) => r.verdict === v).length;

  return (
    <>
      <PageHead
        activeStage="arch-review"
        eyebrow="阶段 07 / 10 · 架构域"
        title="架构评审"
        status={<Tag tone="warning" dot>有条件通过</Tag>}
        desc="从架构合理性、技术选型、性能容量、安全合规、可运维性、成本投入六个维度进行答辩式评审，问题项转化为带责任人与截止日的待办。"
        actions={
          <>
            <Button icon="download">导出评审记录</Button>
            <Button variant="primary" icon="plus">发起答辩</Button>
          </>
        }
      />

      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="评审维度" value={archReviews.length} unit="项" icon="shield" delta="六维全覆盖" deltaTone="flat" />
        <Stat label="通过" value={verdictCount('pass')} unit="项" icon="check" delta={`有条件 ${verdictCount('conditional')} 项`} deltaTone="up" />
        <Stat label="高风险维度" value={archReviews.filter((r) => r.riskLevel === 'high').length} unit="项" icon="alert" delta="需补充方案" deltaTone="down" />
        <Stat label="遗留待办" value={stats.followUpsTotal} unit="项" icon="clipboardList" delta={`已完成 ${stats.followUpsDone}`} deltaTone="flat" />
        <Stat
          label="待办完成率"
          value={Math.round((stats.followUpsDone / stats.followUpsTotal) * 100)}
          unit="%"
          icon="target"
          delta="目标 100%"
          deltaTone={stats.followUpsDone === stats.followUpsTotal ? 'up' : 'down'}
        />
      </div>

      <Note tone="warning">
        评审结论为「有条件通过」：{stats.followUpsTotal - stats.followUpsDone} 项待办未闭环，其中性能容量维度（AR-03）因 P99 延迟未达标，
        须在详细设计阶段给出解决方案后方可进入开发。
      </Note>

      <div style={{ height: 'var(--sp-5)' }} />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'dimensions', label: '评审维度', count: archReviews.length },
          { value: 'followups', label: '遗留待办', count: allFollowUps.length },
        ]}
      />

      {tab === 'dimensions' ? (
        <SplitContent
          asideWidth={360}
          main={
            <Card flush title="六维评审结论" sub="点击行查看答辩详情">
              <DataTable columns={columns} rows={archReviews} onRowClick={(r) => setActiveId(r.id)} selectedId={activeId} dense />
            </Card>
          }
          aside={
            <>
              <Card
                title={active.dimension}
                sub={`${active.id} · 评审人 ${active.reviewer}`}
                actions={<Tag tone={VERDICT[active.verdict].tone} dot>{VERDICT[active.verdict].label}</Tag>}
              >
                <div className="col col--gap4">
                  <div className="row row--gap4">
                    <MiniStat label="风险等级" value={active.riskLevel === 'low' ? '低' : active.riskLevel === 'medium' ? '中' : '高'} tone={active.riskLevel === 'high' ? 'danger' : 'warning'} />
                    <MiniStat label="遗留待办" value={`${active.followUps.filter((f) => !f.done).length} 项`} />
                    <MiniStat label="待办总数" value={active.followUps.length} />
                  </div>

                  <div className="adr-block">
                    <span className="adr-block__label">评审问题</span>
                    <span className="t-sm t-secondary">{active.question}</span>
                  </div>

                  <div className="adr-block">
                    <span className="adr-block__label">答辩结论</span>
                    <span className="t-sm t-secondary">{active.conclusion}</span>
                  </div>

                  {active.followUps.length > 0 && (
                    <div className="col col--gap2">
                      <span className="t-sm t-semibold t-primary">该维度待办</span>
                      <div className="col col--gap2">
                        {active.followUps.map((f) => (
                          <div key={f.id} className="row row--gap3" style={{ alignItems: 'flex-start' }}>
                            <span className={`checklist__box${f.done ? ' checklist__box--done' : ''}`} style={{ marginTop: 2 }}>
                              {f.done && <Icon name="check" size={10} strokeWidth={3} />}
                            </span>
                            <div className="col col--gap1 flex1" style={{ minWidth: 0 }}>
                              <span className={`t-xs ${f.done ? 't-tertiary' : 't-primary'}`}>{f.content}</span>
                              <span className="t-xs t-tertiary">{f.owner} · 截止 {f.dueDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="质量属性达标情况" sub={`${stats.qualityMet}/${stats.qualityTotal} 达标`}>
                <div className="hbar">
                  {qualityAttributes.map((q) => (
                    <div className="hbar__row" key={q.id}>
                      <span className="hbar__label t-xs t-secondary" style={{ width: 66 }}>{q.attribute}</span>
                      <div className="hbar__track">
                        <div className="hbar__fill" style={{ width: q.met ? '100%' : '58%', background: q.met ? 'var(--success-500)' : 'var(--danger-500)' }} />
                      </div>
                      <span className="hbar__val">{q.met ? '达标' : '偏差'}</span>
                    </div>
                  ))}
                </div>
                <Note tone="danger">
                  性能（P99 目标 500ms / 现状 820ms）与成本（目标 ≤0.08 元 / 现状 0.098 元）两项未达标，是当前架构主要短板。
                </Note>
              </Card>
            </>
          }
        />
      ) : (
        <div className="col col--gap4">
          <div className="grid grid--4">
            <Stat label="待办总数" value={allFollowUps.length} unit="项" icon="clipboardList" />
            <Stat label="已完成" value={allFollowUps.filter((f) => f.done).length} unit="项" icon="check" delta={`完成率 ${Math.round((allFollowUps.filter((f) => f.done).length / allFollowUps.length) * 100)}%`} deltaTone="up" />
            <Stat label="跟踪中" value={allFollowUps.filter((f) => !f.done).length} unit="项" icon="clock" delta="含 1 项阻塞开发" deltaTone="down" />
            <Stat label="涉及责任人" value={new Set(allFollowUps.map((f) => f.owner)).size} unit="人" icon="users" delta="跨 4 个小组" deltaTone="flat" />
          </div>

          <div>
            <Segmented
              value={fuFilter}
              onChange={setFuFilter}
              options={[
                { value: '全部' as const, label: '全部', count: allFollowUps.length },
                { value: '未完成' as const, label: '跟踪中', count: allFollowUps.filter((f) => !f.done).length },
                { value: '已完成' as const, label: '已完成', count: allFollowUps.filter((f) => f.done).length },
              ]}
            />
          </div>

          <Card flush title={`架构待办清单 · ${followUps.length} 项`} sub="待办闭环是进入方案开发的前置门禁">
            <DataTable columns={fuColumns} rows={followUps} dense />
          </Card>

          <Card title="评审会议信息">
            <div className="grid grid--2">
              <DL
                cols={2}
                items={[
                  { label: '评审形式', value: '答辩式评审' },
                  { label: '评审日期', value: '2026-06-11' },
                  { label: '评审组长', value: '陈砚舟' },
                  { label: '评审专家', value: `${new Set(archReviews.map((r) => r.reviewer)).size} 人` },
                  { label: '关联 ADR', value: `${archDecisions.length} 项` },
                  { label: '评审结论', value: '有条件通过' },
                ]}
              />
              <div className="col col--gap3">
                <span className="t-sm t-semibold t-primary">评审专家</span>
                <div className="col col--gap2">
                  {Array.from(new Set(archReviews.map((r) => r.reviewer))).map((name) => (
                    <div className="row row--gap2" key={name}>
                      <Avatar name={name} tone="brand" size="sm" />
                      <span className="col" style={{ minWidth: 0 }}>
                        <span className="t-xs t-medium t-primary">{name}</span>
                        <span className="t-xs t-tertiary">
                          {archReviews.find((r) => r.reviewer === name)?.dimension}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
