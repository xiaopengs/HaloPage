import { useState } from 'react';
import { Card, Stat, Tag, Progress, Button, Tabs, DL, Note } from '../components/ui';
import { PageHead, DataTable, MiniStat } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import {
  workItems, sprints, reqById, statusLabel, statusTone,
} from '../data';
import type { WorkItem, Sprint } from '../data';

type TabKey = 'wbs' | 'sprint' | 'invest';

const LV: Record<WorkItem['level'], { label: string; short: string; icon: string }> = {
  epic: { label: '史诗', short: 'EPIC', icon: 'layers' },
  feature: { label: '特性', short: 'FEAT', icon: 'box' },
  story: { label: '用户故事', short: 'STORY', icon: 'fileText' },
  task: { label: '任务', short: 'TASK', icon: 'check' },
};

const INVEST_KEYS: { key: keyof WorkItem['invest']; label: string; hint: string }[] = [
  { key: 'independent', label: 'Independent', hint: '独立' },
  { key: 'negotiable', label: 'Negotiable', hint: '可协商' },
  { key: 'valuable', label: 'Valuable', hint: '有价值' },
  { key: 'estimable', label: 'Estimable', hint: '可估算' },
  { key: 'small', label: 'Small', hint: '足够小' },
  { key: 'testable', label: 'Testable', hint: '可测试' },
];

export default function Breakdown() {
  const [tab, setTab] = useState<TabKey>('wbs');
  const [openEpics, setOpenEpics] = useState<string[]>(() => workItems.filter((w) => w.level === 'epic').map((w) => w.id));
  const [selected, setSelected] = useState<WorkItem | null>(workItems.find((w) => w.level === 'story') ?? null);

  const epics = workItems.filter((w) => w.level === 'epic');
  const features = workItems.filter((w) => w.level === 'feature');
  const stories = workItems.filter((w) => w.level === 'story');

  const toggle = (id: string) =>
    setOpenEpics((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const totalPoints = features.reduce((s, w) => s + w.points, 0);
  const donePoints = features.filter((w) => w.status === 'done').reduce((s, w) => s + w.points, 0);
  const investPass = Math.round(
    (stories.filter((s) => Object.values(s.invest).every(Boolean)).length / Math.max(1, stories.length)) * 100,
  );

  const investColumns: Column<WorkItem>[] = [
    { key: 'id', header: '编号', width: 84, nowrap: true, render: (w) => <span className="t-mono t-xs t-secondary">{w.id}</span> },
    {
      key: 'title',
      header: '用户故事',
      render: (w) => (
        <div className="col col--gap1" style={{ minWidth: 0 }}>
          <span className="t-sm t-medium t-primary t-ellipsis">{w.title}</span>
          <span className="t-xs t-tertiary t-ellipsis">{reqById.get(w.requirementId)?.title ?? '—'}</span>
        </div>
      ),
    },
    { key: 'pt', header: '点数', width: 58, align: 'right', render: (w) => <span className="t-sm t-semibold">{w.points}</span> },
    { key: 'sprint', header: '迭代', width: 84, nowrap: true, render: (w) => <Tag tone="brand">{w.sprint}</Tag> },
    { key: 'assignee', header: '负责人', width: 78, nowrap: true, render: (w) => <span className="t-xs t-secondary">{w.assignee}</span> },
    {
      key: 'invest',
      header: 'INVEST 自检',
      width: 190,
      render: (w) => (
        <span className="row row--gap1">
          {INVEST_KEYS.map((k) => (
            <span
              key={k.key}
              title={`${k.label}（${k.hint}）：${w.invest[k.key] ? '通过' : '未通过'}`}
              style={{
                width: 18, height: 18, borderRadius: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: w.invest[k.key] ? 'var(--success-100)' : 'var(--danger-100)',
                color: w.invest[k.key] ? 'var(--success-700)' : 'var(--danger-700)',
                fontSize: 9, fontWeight: 700,
              }}
            >
              {k.hint.slice(0, 1)}
            </span>
          ))}
        </span>
      ),
    },
    { key: 'status', header: '状态', width: 84, render: (w) => <Tag tone={statusTone[w.status]} dot>{statusLabel[w.status]}</Tag> },
  ];

  return (
    <>
      <PageHead
        activeStage="breakdown"
        eyebrow="阶段 03 / 10 · 需求域"
        title="需求分解"
        status={<Tag tone="success" dot>已完成</Tag>}
        desc="按史诗 → 特性 → 用户故事 → 任务四级拆解，用户故事通过 INVEST 自检，并落入迭代计划形成可承诺的交付单元。"
        actions={
          <>
            <Button icon="download">导出 WBS</Button>
            <Button variant="primary" icon="plus">新建工作项</Button>
          </>
        }
      />

      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="史诗" value={epics.length} unit="个" icon="layers" delta={`${features.length} 个特性承载`} deltaTone="flat" />
        <Stat label="特性" value={features.length} unit="个" icon="box" delta={`${totalPoints} 故事点`} deltaTone="flat" />
        <Stat label="用户故事" value={stories.length} unit="条" icon="fileText" delta={`INVEST 通过 ${investPass}%`} deltaTone={investPass >= 85 ? 'up' : 'down'} />
        <Stat label="迭代" value={sprints.length} unit="个" icon="refresh" delta="双周节奏" deltaTone="flat" />
        <Stat
          label="故事点完成"
          value={donePoints}
          unit={`/ ${totalPoints}`}
          icon="target"
          delta={`${Math.round((donePoints / totalPoints) * 100)}%`}
          deltaTone="up"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'wbs', label: 'WBS 分解树', count: workItems.length },
          { value: 'sprint', label: '迭代计划', count: sprints.length },
          { value: 'invest', label: 'INVEST 检查', count: stories.length },
        ]}
      />

      {tab === 'wbs' ? (
        <div className="grid grid--split-main">
          <Card
            title="WBS 分解树"
            sub={`${workItems.length} 个工作项 · 点击展开收起`}
            actions={<Button variant="ghost" size="sm" icon="refresh">全部展开</Button>}
            style={{ alignSelf: 'start' }}
          >
            <div className="wbs">
              {epics.map((ep) => {
                const feats = features.filter((f) => f.parentId === ep.id);
                const sts = stories.filter((s) => feats.some((f) => f.id === s.parentId));
                const open = openEpics.includes(ep.id);
                const epPoints = feats.reduce((s, f) => s + f.points, 0);
                return (
                  <div key={ep.id}>
                    <div className="wbs__row" onClick={() => toggle(ep.id)}>
                      <span className="wbs__toggle">
                        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={13} />
                      </span>
                      <span className="wbs__lv-tag lv-epic">{LV.epic.short}</span>
                      <span className="wbs__title t-ellipsis">{ep.title}</span>
                      <Tag tone="neutral">{feats.length} 特性</Tag>
                      <Tag tone="info">{epPoints} 点</Tag>
                      <Tag tone={statusTone[ep.status]} dot>{statusLabel[ep.status]}</Tag>
                    </div>

                    {open && feats.map((f) => {
                      const fs = sts.filter((s) => s.parentId === f.id);
                      return (
                        <div key={f.id}>
                          <div className="wbs__row" style={{ paddingLeft: 28 }}>
                            <span className="wbs__toggle" />
                            <span className="wbs__lv-tag lv-feature">{LV.feature.short}</span>
                            <span className="wbs__title t-ellipsis">{f.title}</span>
                            <Tag tone="neutral">{fs.length} 故事</Tag>
                            <Tag tone="info">{f.points} 点</Tag>
                            <Tag tone={statusTone[f.status]} dot>{statusLabel[f.status]}</Tag>
                          </div>
                          {fs.map((s) => (
                            <div
                              key={s.id}
                              className="wbs__row"
                              style={{ paddingLeft: 56, cursor: 'pointer', background: selected?.id === s.id ? 'var(--brand-50)' : undefined }}
                              onClick={(e) => { e.stopPropagation(); setSelected(s); }}
                            >
                              <span className="wbs__toggle" />
                              <span className="wbs__lv-tag lv-story">{LV.story.short}</span>
                              <span className="wbs__title t-ellipsis">{s.title}</span>
                              <span className="t-xs t-tertiary t-nowrap">{s.assignee}</span>
                              <Tag tone="info">{s.points} 点</Tag>
                              <Tag tone={statusTone[s.status]} dot>{statusLabel[s.status]}</Tag>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="col col--gap4">
            {selected ? (
              <Card
                title={selected.title}
                sub={`${selected.id} · ${LV[selected.level].label} · ${selected.points} 故事点`}
                actions={<Tag tone={statusTone[selected.status]} dot>{statusLabel[selected.status]}</Tag>}
              >
                <div className="col col--gap4">
                  <div className="row row--gap4">
                    <MiniStat label="负责人" value={selected.assignee} />
                    <MiniStat label="所属迭代" value={selected.sprint} />
                    <MiniStat
                      label="INVEST"
                      value={`${Object.values(selected.invest).filter(Boolean).length}/6`}
                      tone={Object.values(selected.invest).every(Boolean) ? 'success' : 'warning'}
                    />
                  </div>

                  <DL
                    cols={1}
                    items={[
                      { label: '关联需求', value: `${selected.requirementId} · ${reqById.get(selected.requirementId)?.title ?? '—'}` },
                      { label: '父级工作项', value: selected.parentId ?? '顶端' },
                    ]}
                  />

                  <div className="col col--gap2">
                    <span className="t-sm t-semibold t-primary">INVEST 自检</span>
                    <div className="checklist">
                      {INVEST_KEYS.map((k) => (
                        <div className="checklist__item" key={k.key}>
                          <span className={`checklist__box${selected.invest[k.key] ? ' checklist__box--done' : ''}`}>
                            {selected.invest[k.key] && <Icon name="check" size={10} strokeWidth={3} />}
                          </span>
                          <span className={`t-sm ${selected.invest[k.key] ? 't-primary' : 't-tertiary'}`}>
                            {k.label} · {k.hint}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col col--gap2">
                    <span className="t-sm t-semibold t-primary">验收标准</span>
                    <div className="criteria">
                      {selected.acceptance.map((a, i) => (
                        <div className="criteria__item" key={a}>
                          <span className="criteria__idx">{i + 1}</span>
                          <span className="t-sm t-secondary">{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!Object.values(selected.invest).every(Boolean) && (
                    <Note tone="warning">该故事未通过全部 INVEST 检查，建议拆分或补充验收标准后再进入迭代。</Note>
                  )}
                </div>
              </Card>
            ) : (
              <Card title="工作项详情">
                <Note tone="info">在左侧分解树中选择一条用户故事查看详情。</Note>
              </Card>
            )}

            <Card title="分解质量" sub="用户故事维度">
              <div className="hbar">
                {INVEST_KEYS.map((k) => {
                  const pass = stories.filter((s) => s.invest[k.key]).length;
                  return (
                    <div className="hbar__row" key={k.key}>
                      <span className="hbar__label t-xs t-secondary" style={{ width: 78 }}>{k.hint}</span>
                      <div className="hbar__track">
                        <div className="hbar__fill" style={{ width: `${(pass / stories.length) * 100}%`, background: pass === stories.length ? 'var(--success-500)' : 'var(--warning-500)' }} />
                      </div>
                      <span className="hbar__val">{pass}/{stories.length}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      ) : tab === 'sprint' ? (
        <div className="col col--gap4">
          {sprints.map((sp) => (
            <SprintCard key={sp.id} sprint={sp} />
          ))}
        </div>
      ) : (
        <div className="col col--gap4">
          <div className="grid grid--3">
            <Card title="全量通过" sub="六项检查全部满足">
              <div className="row row--between">
                <span className="t-2xl t-semibold t-success">
                  {stories.filter((s) => Object.values(s.invest).every(Boolean)).length}
                </span>
                <span className="t-sm t-tertiary">/ {stories.length} 条</span>
              </div>
              <Progress
                value={(stories.filter((s) => Object.values(s.invest).every(Boolean)).length / Math.max(1, stories.length)) * 100}
                tone="success"
                width={220}
                label={`${investPass}% 通过率`}
              />
            </Card>
            <Card title="存在缺口" sub="至少一项未通过">
              <div className="row row--between">
                <span className="t-2xl t-semibold t-warning">
                  {stories.filter((s) => !Object.values(s.invest).every(Boolean)).length}
                </span>
                <span className="t-sm t-tertiary">条待优化</span>
              </div>
              <span className="t-xs t-tertiary">
                最常见问题是 Small（拆分粒度）与 Negotiable（可协商性），建议在迭代规划会前完成拆解。
              </span>
            </Card>
            <Card title="用户故事总数" sub="覆盖 7 个史诗">
              <div className="row row--between">
                <span className="t-2xl t-semibold t-brand">{stories.length}</span>
                <span className="t-sm t-tertiary">
                  共 {stories.reduce((s, x) => s + x.points, 0)} 故事点
                </span>
              </div>
              <span className="t-xs t-tertiary">平均 {Math.round(stories.reduce((s, x) => s + x.points, 0) / Math.max(1, stories.length))} 点 / 条</span>
            </Card>
          </div>

          <Note tone="info">
            INVEST 是用户故事的质量自检框架：Independent（独立）、Negotiable（可协商）、Valuable（有价值）、
            Estimable（可估算）、Small（足够小）、Testable（可测试）。未通过的条目不会被驳回，但会在迭代规划前二次对齐。
          </Note>

          <Card flush title={`用户故事 INVEST 检查 · ${stories.length} 条`} sub="徽标为绿色代表该维度通过，红色代表需要优化">
            <DataTable columns={investColumns} rows={stories} onRowClick={setSelected} selectedId={selected?.id} dense />
          </Card>
        </div>
      )}
    </>
  );
}

/* ============================ 迭代卡片 ============================ */

function SprintCard({ sprint }: { sprint: Sprint }) {
  const items = workItems.filter((w) => w.sprint === sprint.id);
  const stories = items.filter((w) => w.level === 'story');
  const done = items.filter((w) => w.status === 'done').length;
  const pct = Math.round((sprint.completed / sprint.capacity) * 100);
  const tone = sprint.status === '已结束' ? 'success' : sprint.status === '进行中' ? 'brand' : 'neutral';

  const columns: Column<WorkItem>[] = [
    { key: 'id', header: '编号', width: 84, nowrap: true, render: (w) => <span className="t-mono t-xs t-secondary">{w.id}</span> },
    { key: 'lv', header: '层级', width: 70, render: (w) => <span className={`wbs__lv-tag lv-${w.level}`}>{LV[w.level].short}</span> },
    { key: 'title', header: '标题', render: (w) => <span className="t-sm t-primary t-ellipsis">{w.title}</span> },
    { key: 'assignee', header: '负责人', width: 78, nowrap: true, render: (w) => <span className="t-xs t-secondary">{w.assignee}</span> },
    { key: 'pt', header: '点数', width: 58, align: 'right', render: (w) => <span className="t-sm t-semibold">{w.points}</span> },
    { key: 'status', header: '状态', width: 84, render: (w) => <Tag tone={statusTone[w.status]} dot>{statusLabel[w.status]}</Tag> },
  ];

  return (
    <Card
      title={`${sprint.name} · ${sprint.goal}`}
      sub={`${sprint.startDate} → ${sprint.endDate} · 容量 ${sprint.capacity} 点`}
      actions={<Tag tone={tone} dot>{sprint.status}</Tag>}
    >
      <div className="col col--gap4">
        <div className="grid grid--4">
          <MiniStat label="承诺点数" value={sprint.committed} />
          <MiniStat label="完成点数" value={sprint.completed} tone="success" />
          <MiniStat label="工作项" value={`${done}/${items.length} 完成`} />
          <MiniStat label="用户故事" value={stories.length} />
        </div>
        <div className="col col--gap2">
          <div className="row row--between t-xs">
            <span className="t-tertiary">交付进度</span>
            <span className="t-secondary">容量占用 {pct}%</span>
          </div>
          <div className="sprint-bar">
            <div className="sprint-bar__fill" style={{ width: `${Math.min(100, pct)}%`, background: tone === 'success' ? 'var(--success-500)' : tone === 'brand' ? 'var(--brand-500)' : 'var(--ink-300)' }} />
          </div>
        </div>
        {items.length > 0 && (
          <div className="tbl-wrap">
            <DataTable columns={columns} rows={items} dense />
          </div>
        )}
      </div>
    </Card>
  );
}
