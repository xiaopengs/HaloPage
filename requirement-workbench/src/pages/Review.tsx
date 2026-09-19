import { useMemo, useState } from 'react';
import { Card, Stat, Tag, Progress, Button, Tabs, Avatar, Note, Segmented } from '../components/ui';
import { PageHead, SectionLabel, DataTable, SplitContent, MiniStat } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import {
  reviewSessions, stats, reqById, priorityTone,
} from '../data';
import type { ReviewComment, ReviewSession } from '../data';

type TabKey = 'sessions' | 'comments';

const VERDICT: Record<string, { label: string; tone: string; icon: string }> = {
  pass: { label: '通过', tone: 'success', icon: 'check' },
  conditional: { label: '有条件通过', tone: 'warning', icon: 'alert' },
  reject: { label: '驳回', tone: 'danger', icon: 'x' },
  pending: { label: '待结论', tone: 'neutral', icon: 'clock' },
};

const SEVERITY: Record<ReviewComment['severity'], { label: string; tone: string }> = {
  blocker: { label: '阻塞', tone: 'danger' },
  major: { label: '严重', tone: 'warning' },
  minor: { label: '一般', tone: 'info' },
  suggestion: { label: '建议', tone: 'neutral' },
};

const SESSION_STATUS_TONE: Record<ReviewSession['status'], string> = {
  待评审: 'neutral',
  进行中: 'brand',
  已结束: 'success',
};

export default function Review() {
  const [tab, setTab] = useState<TabKey>('sessions');
  const [activeId, setActiveId] = useState(reviewSessions[0].id);
  const [sevFilter, setSevFilter] = useState<ReviewComment['severity'] | '全部'>('全部');

  const active = reviewSessions.find((s) => s.id === activeId)!;

  const allComments = useMemo(
    () => reviewSessions.flatMap((s) => s.comments.map((c) => ({ ...c, sessionId: s.id, round: s.round }))),
    [],
  );

  const filteredComments = useMemo(
    () => (sevFilter === '全部' ? allComments : allComments.filter((c) => c.severity === sevFilter)),
    [allComments, sevFilter],
  );

  const sessionColumns: Column<ReviewSession>[] = [
    { key: 'id', header: '评审场次', width: 110, nowrap: true, render: (s) => <span className="t-mono t-xs t-secondary">{s.id}</span> },
    { key: 'round', header: '轮次', width: 64, render: (s) => <Tag tone="brand">第 {s.round} 轮</Tag> },
    {
      key: 'scope',
      header: '覆盖需求',
      render: (s) => (
        <span className="t-xs t-secondary t-ellipsis">
          {s.requirementIds.slice(0, 3).join('、')}
          {s.requirementIds.length > 3 && ` 等 ${s.requirementIds.length} 条`}
        </span>
      ),
    },
    { key: 'chair', header: '主持', width: 76, nowrap: true, render: (s) => <span className="t-xs">{s.chair}</span> },
    {
      key: 'attendees',
      header: '参会',
      width: 92,
      render: (s) => (
        <span className="row row--gap1">
          {s.attendees.slice(0, 4).map((a) => (
            <Avatar key={a.name} name={a.name} tone={a.joined ? 'brand' : 'neutral'} size="sm" />
          ))}
          {s.attendees.length > 4 && <span className="t-xs t-tertiary">+{s.attendees.length - 4}</span>}
        </span>
      ),
    },
    { key: 'time', header: '时间', width: 130, nowrap: true, render: (s) => <span className="t-xs t-tertiary">{s.scheduledAt}</span> },
    {
      key: 'comments',
      header: '意见',
      width: 84,
      render: (s) => (
        <span className="t-xs">
          <span className="t-semibold">{s.comments.filter((c) => !c.resolved).length}</span>
          <span className="t-tertiary"> 未闭环 / {s.comments.length}</span>
        </span>
      ),
    },
    {
      key: 'verdict',
      header: '结论',
      width: 104,
      render: (s) => <Tag tone={VERDICT[s.verdict].tone} dot>{VERDICT[s.verdict].label}</Tag>,
    },
    { key: 'status', header: '状态', width: 84, render: (s) => <Tag tone={SESSION_STATUS_TONE[s.status]}>{s.status}</Tag> },
  ];

  const commentColumns: Column<ReviewComment & { id: string; round: number }>[] = [
    { key: 'id', header: '意见编号', width: 96, nowrap: true, render: (c) => <span className="t-mono t-xs t-secondary">{c.id}</span> },
    {
      key: 'req',
      header: '关联需求',
      width: 150,
      render: (c) => (
        <div className="col col--gap1" style={{ minWidth: 0 }}>
          <span className="t-mono t-xs t-brand">{c.requirementId}</span>
          <span className="t-xs t-tertiary t-ellipsis">{reqById.get(c.requirementId)?.title ?? '—'}</span>
        </div>
      ),
    },
    { key: 'dim', header: '评审维度', width: 88, render: (c) => <Tag tone="info">{c.dimension}</Tag> },
    { key: 'sev', header: '严重度', width: 74, render: (c) => <Tag tone={SEVERITY[c.severity].tone} dot>{SEVERITY[c.severity].label}</Tag> },
    { key: 'content', header: '意见内容', render: (c) => <span className="t-xs t-secondary">{c.content}</span> },
    { key: 'author', header: '提出人', width: 118, nowrap: true, render: (c) => <span className="t-xs"><span className="t-medium">{c.author}</span> <span className="t-tertiary">· {c.role}</span></span> },
    {
      key: 'resolved',
      header: '闭环',
      width: 76,
      render: (c) => (c.resolved ? <Tag tone="success" dot>已闭环</Tag> : <Tag tone="warning" dot>待处理</Tag>),
    },
  ];

  const totalComments = allComments.length;

  return (
    <>
      <PageHead
        activeStage="review"
        eyebrow="阶段 02 / 10 · 需求域"
        title="需求评审"
        status={<Tag tone="success" dot>已完成</Tag>}
        desc="多角色对需求进行业务价值、可行性、完整性、一致性、合规性、可测性六维评审；意见逐条闭环后方可进入分解。"
        actions={
          <>
            <Button icon="download">导出评审纪要</Button>
            <Button variant="primary" icon="plus">发起评审</Button>
          </>
        }
      />

      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="评审轮次" value={reviewSessions.length} unit="轮" icon="clipboard" delta="初评 + 复审 + 终审" deltaTone="flat" />
        <Stat label="评审意见" value={stats.commentTotal} unit="条" icon="bubble" delta={`闭环 ${stats.commentClosedRate}%`} deltaTone="up" />
        <Stat
          label="阻塞级意见"
          value={allComments.filter((c) => c.severity === 'blocker').length}
          unit="条"
          icon="alert"
          delta={`${allComments.filter((c) => c.severity === 'blocker' && !c.resolved).length} 条未闭环`}
          deltaTone={allComments.some((c) => c.severity === 'blocker' && !c.resolved) ? 'down' : 'up'}
        />
        <Stat label="通过需求" value={stats.approved} unit="条" icon="check" delta={`占比 ${stats.approvalRate}%`} deltaTone="up" />
        <Stat label="驳回需求" value={stats.rejected} unit="条" icon="x" delta="已转变更单" deltaTone="flat" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'sessions', label: '评审场次', count: reviewSessions.length },
          { value: 'comments', label: '评审意见', count: totalComments },
        ]}
      />

      {tab === 'sessions' ? (
        <SplitContent
          asideWidth={340}
          main={
            <Card flush title="评审场次" sub="点击行查看会议详情">
              <DataTable
                columns={sessionColumns}
                rows={reviewSessions}
                onRowClick={(s) => setActiveId(s.id)}
                selectedId={activeId}
                dense
              />
            </Card>
          }
          aside={
            <>
              <Card
                title={`第 ${active.round} 轮评审`}
                sub={`${active.scheduledAt} · ${active.durationMin} 分钟`}
                actions={<Tag tone={SESSION_STATUS_TONE[active.status]} dot>{active.status}</Tag>}
              >
                <div className="col col--gap4">
                  <div className={`note note--${VERDICT[active.verdict].tone === 'success' ? 'success' : VERDICT[active.verdict].tone === 'danger' ? 'danger' : 'warning'}`}>
                    <span className="note__icon"><Icon name={VERDICT[active.verdict].icon} size={15} /></span>
                    <div>
                      <div className="t-sm t-semibold">评审结论：{VERDICT[active.verdict].label}</div>
                      <div className="t-xs t-secondary" style={{ marginTop: 2 }}>
                        覆盖 {active.requirementIds.length} 条需求 · {active.comments.length} 条意见
                      </div>
                    </div>
                  </div>

                  <div className="row row--gap4">
                    <MiniStat label="主持人" value={active.chair} />
                    <MiniStat label="时长" value={`${active.durationMin}m`} />
                    <MiniStat
                      label="参会率"
                      value={`${Math.round((active.attendees.filter((a) => a.joined).length / active.attendees.length) * 100)}%`}
                    />
                  </div>

                  <div className="col col--gap2">
                    <span className="t-sm t-semibold t-primary">参会人</span>
                    <div className="col col--gap2">
                      {active.attendees.map((a) => (
                        <div key={a.name} className="row row--between">
                          <span className="row row--gap2" style={{ minWidth: 0 }}>
                            <Avatar name={a.name} tone={a.joined ? 'brand' : 'neutral'} size="sm" />
                            <span className="col" style={{ minWidth: 0 }}>
                              <span className="t-xs t-medium t-primary">{a.name}</span>
                              <span className="t-xs t-tertiary t-ellipsis">{a.role}</span>
                            </span>
                          </span>
                          <Tag tone={a.joined ? 'success' : 'neutral'}>{a.joined ? '已出席' : '缺席'}</Tag>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col col--gap2">
                    <span className="t-sm t-semibold t-primary">会议纪要</span>
                    <ul className="col col--gap2" style={{ margin: 0, paddingLeft: 18 }}>
                      {active.minutes.map((m) => (
                        <li key={m} className="t-xs t-secondary">{m}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="col col--gap2">
                    <span className="t-sm t-semibold t-primary">覆盖需求</span>
                    <div className="col col--gap2">
                      {active.requirementIds.map((rid) => {
                        const r = reqById.get(rid);
                        if (!r) return null;
                        return (
                          <div key={rid} className="row row--between row--gap2">
                            <span className="t-xs t-mono t-tertiary t-nowrap">{rid}</span>
                            <span className="t-xs t-secondary t-ellipsis flex1">{r.title}</span>
                            <Tag tone={priorityTone[r.priority]}>{r.priority}</Tag>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            </>
          }
        />
      ) : (
        <>
          <div className="grid grid--4" style={{ marginBottom: 'var(--sp-4)' }}>
            {(['blocker', 'major', 'minor', 'suggestion'] as const).map((sv) => {
              const list = allComments.filter((c) => c.severity === sv);
              const closed = list.filter((c) => c.resolved).length;
              return (
                <Card key={sv} style={{ padding: 0 }}>
                  <div className="row row--between" style={{ marginBottom: 'var(--sp-2)' }}>
                    <Tag tone={SEVERITY[sv].tone} dot size="lg">{SEVERITY[sv].label}</Tag>
                    <span className="t-lg t-semibold">{list.length}</span>
                  </div>
                  <Progress value={list.length ? (closed / list.length) * 100 : 0} tone={closed === list.length ? 'success' : 'warning'} width={140} label={`闭环 ${closed}/${list.length}`} />
                </Card>
              );
            })}
          </div>

          <SectionLabel>意见清单</SectionLabel>
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <Segmented
              value={sevFilter}
              onChange={setSevFilter}
              options={[
                { value: '全部' as const, label: '全部', count: totalComments },
                ...(['blocker', 'major', 'minor', 'suggestion'] as const).map((s) => ({
                  value: s, label: SEVERITY[s].label, count: allComments.filter((c) => c.severity === s).length,
                })),
              ]}
            />
          </div>

          <Card flush title={`评审意见 · ${filteredComments.length} 条`} sub="每轮评审的意见按严重度与提出时间排序">
            <DataTable
              columns={commentColumns}
              rows={filteredComments}
              dense
              empty={
                <>
                  {filteredComments.length === 0 && (
                    <Note tone="success">该严重度下暂无评审意见。</Note>
                  )}
                </>
              }
            />
          </Card>
        </>
      )}
    </>
  );
}
