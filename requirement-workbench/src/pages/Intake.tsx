import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Stat, Tag, Progress, Button, Segmented, Pager, Drawer, DL, Note, KV } from '../components/ui';
import { PageHead, SectionLabel, DataTable, FilterBar } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import {
  project, requirements, stats, statusLabel, statusTone, priorityTone,
} from '../data';
import type { Requirement, Priority } from '../data';

const PAGE_SIZE = 8;

type ChannelKey = '全部' | '客户访谈' | '工单洞察' | '竞品分析' | '内部规划' | '数据埋点' | '合规要求';

const CHANNEL_ICON: Record<string, string> = {
  客户访谈: 'users',
  工单洞察: 'clipboardList',
  竞品分析: 'target',
  内部规划: 'book',
  数据埋点: 'activity',
  合规要求: 'shield',
};

/** 价值分颜色：越高越暖 */
function scoreTone(score: number) {
  if (score >= 4.2) return 'success';
  if (score >= 3.6) return 'brand';
  if (score >= 3.0) return 'warning';
  return 'danger';
}

export default function Intake() {
  const [channel, setChannel] = useState<ChannelKey>('全部');
  const [priority, setPriority] = useState<Priority | '全部'>('全部');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<Requirement | null>(null);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return requirements.filter((r) => {
      if (channel !== '全部' && r.source.channel !== channel) return false;
      if (priority !== '全部' && r.priority !== priority) return false;
      if (kw && !(`${r.id} ${r.title} ${r.summary} ${r.tags.join(' ')}`.toLowerCase().includes(kw))) return false;
      return true;
    });
  }, [channel, priority, keyword]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reset = (fn: () => void) => { fn(); setPage(1); };

  const columns: Column<Requirement>[] = [
    {
      key: 'id',
      header: '需求编号',
      width: 128,
      nowrap: true,
      render: (r) => <span className="t-mono t-xs t-secondary">{r.id}</span>,
    },
    {
      key: 'title',
      header: '需求标题',
      render: (r) => (
        <div className="col col--gap1" style={{ minWidth: 0 }}>
          <span className="t-sm t-medium t-primary t-ellipsis">{r.title}</span>
          <span className="t-xs t-tertiary t-ellipsis">{r.summary}</span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: '优先级',
      width: 74,
      render: (r) => <Tag tone={priorityTone[r.priority]}>{r.priority}</Tag>,
    },
    {
      key: 'channel',
      header: '来源渠道',
      width: 108,
      nowrap: true,
      render: (r) => (
        <span className="row row--gap2 t-xs t-secondary">
          <Icon name={CHANNEL_ICON[r.source.channel] ?? 'inbox'} size={12} />
          {r.source.channel}
        </span>
      ),
    },
    {
      key: 'score',
      header: '价值分',
      width: 92,
      render: (r) => (
        <div className="row row--gap2">
          <span className={`t-sm t-semibold t-${scoreTone(r.score)}`}>{r.score.toFixed(1)}</span>
          <Progress value={r.score * 20} tone={scoreTone(r.score)} width={40} />
        </div>
      ),
    },
    {
      key: 'status',
      header: '状态',
      width: 84,
      render: (r) => <Tag tone={statusTone[r.status]} dot>{statusLabel[r.status]}</Tag>,
    },
    {
      key: 'release',
      header: '期望上线',
      width: 96,
      nowrap: true,
      render: (r) => <span className="t-xs t-tertiary t-mono">{r.targetRelease}</span>,
    },
    {
      key: 'owner',
      header: '负责人',
      width: 78,
      nowrap: true,
      render: (r) => <span className="t-xs t-secondary">{r.owner}</span>,
    },
  ];

  const maxChannel = Math.max(...stats.byChannel.map((c) => c.count));

  return (
    <>
      <PageHead
        activeStage="intake"
        eyebrow={`阶段 01 / 10 · 需求域`}
        title="需求输入"
        status={<Tag tone="success" dot>已完成</Tag>}
        desc="汇聚 6 类渠道的原始诉求，去重归一为可评审的需求条目。每条需求附带来源证据、价值分与验收标准。"
        actions={
          <>
            <Button icon="download">导出需求池</Button>
            <Button variant="primary" icon="plus">录入需求</Button>
          </>
        }
      />

      {/* ============ 指标 ============ */}
      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="需求总量" value={requirements.length} unit="条" icon="inbox" delta="较上季 +6" deltaTone="up" />
        <Stat label="已通过评审" value={stats.approved} unit="条" icon="check" delta={`通过率 ${stats.approvalRate}%`} deltaTone="up" />
        <Stat label="驳回" value={stats.rejected} unit="条" icon="x" delta="含 1 条重复" deltaTone="flat" />
        <Stat label="待处理" value={stats.pending} unit="条" icon="clock" delta="需补证据" deltaTone="down" />
        <Stat
          label="平均价值分"
          value={(requirements.reduce((s, r) => s + r.score, 0) / requirements.length).toFixed(2)}
          icon="star"
          delta="阈值 3.00"
          deltaTone="up"
        />
      </div>

      {/* ============ 渠道分布 ============ */}
      <div className="grid grid--split-even" style={{ marginBottom: 'var(--sp-5)' }}>
        <Card title="来源渠道分布" sub={`${stats.byChannel.length} 个渠道`}>
          <div className="hbar">
            {stats.byChannel.map((c) => (
              <div className="hbar__row" key={c.channel}>
                <span className="hbar__label row row--gap2 t-xs t-secondary" style={{ width: 96 }}>
                  <Icon name={CHANNEL_ICON[c.channel] ?? 'inbox'} size={12} />
                  {c.channel}
                </span>
                <div className="hbar__track">
                  <div className="hbar__fill" style={{ width: `${(c.count / maxChannel) * 100}%`, background: 'var(--brand-500)' }} />
                </div>
                <span className="hbar__val">{c.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="价值 / 成本四象限" sub="气泡大小 = 紧急度">
          <div className="matrix">
            <div className="matrix__plot">
              <div className="matrix__mid-h" />
              <div className="matrix__mid-v" />
              <span className="matrix__zone" style={{ left: 12, top: 10 }}>优先做</span>
              <span className="matrix__zone" style={{ right: 12, top: 10 }}>谨慎评估</span>
              <span className="matrix__zone" style={{ left: 12, bottom: 10 }}>快速见效</span>
              <span className="matrix__zone" style={{ right: 12, bottom: 10 }}>暂缓</span>
              {requirements.map((r) => (
                <span
                  key={r.id}
                  className="matrix__dot"
                  title={`${r.id} ${r.title}｜价值 ${r.businessValue} 成本 ${r.effort}`}
                  style={{
                    left: `${(r.effort / 5) * 100}%`,
                    bottom: `${(r.businessValue / 5) * 100}%`,
                    width: 6 + r.urgency * 2,
                    height: 6 + r.urgency * 2,
                    background: r.priority === 'P0' ? 'var(--danger-500)' : r.priority === 'P1' ? 'var(--brand-500)' : 'var(--ink-300)',
                  }}
                />
              ))}
            </div>
            <div className="matrix__axis-y">业务价值 →</div>
            <div className="matrix__axis-x">实现成本 →</div>
          </div>
          <div className="legend" style={{ marginTop: 'var(--sp-3)' }}>
            <span className="legend__item"><i className="legend__swatch" style={{ background: 'var(--danger-500)' }} />P0</span>
            <span className="legend__item"><i className="legend__swatch" style={{ background: 'var(--brand-500)' }} />P1</span>
            <span className="legend__item"><i className="legend__swatch" style={{ background: 'var(--ink-300)' }} />P2/P3</span>
          </div>
        </Card>
      </div>

      {/* ============ 需求池 ============ */}
      <SectionLabel>需求池</SectionLabel>
      <FilterBar>
        <Segmented
          value={channel}
          onChange={(v) => reset(() => setChannel(v))}
          options={[{ value: '全部' as ChannelKey, label: '全部', count: requirements.length },
            ...stats.byChannel.map((c) => ({ value: c.channel as ChannelKey, label: c.channel, count: c.count }))]}
        />
        <Segmented
          value={priority}
          onChange={(v) => reset(() => setPriority(v))}
          options={[
            { value: '全部' as const, label: '全优先级' },
            ...stats.byPriority.map((p) => ({ value: p.priority as Priority, label: p.priority, count: p.total })),
          ]}
        />
        <div className="search-box" style={{ width: 220, marginLeft: 'auto' }}>
          <Icon name="search" size={14} />
          <input
            placeholder="搜索编号 / 标题 / 标签"
            value={keyword}
            onChange={(e) => reset(() => setKeyword(e.target.value))}
          />
        </div>
      </FilterBar>

      <Card
        flush
        title={`需求清单 · ${filtered.length} 条`}
        sub={`按价值分降序（价值分 = 业务价值×0.5 + 紧急度×0.3 + 易实现×0.2）`}
        actions={<Button variant="ghost" icon="filter">高级筛选</Button>}
      >
        <DataTable columns={columns} rows={paged} onRowClick={setActive} selectedId={active?.id} />
        <Pager total={filtered.length} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
      </Card>

      {/* ============ 详情抽屉 ============ */}
      <Drawer
        open={!!active}
        onClose={() => setActive(null)}
        width={620}
        title={active?.title ?? ''}
        sub={active && `${active.id} · 来源 ${active.source.channel} · 提出方 ${active.source.origin}`}
        foot={
          <>
            <Button onClick={() => setActive(null)}>关闭</Button>
            <Button variant="primary" icon="clipboard">进入评审</Button>
          </>
        }
      >
        {active && (
          <div className="col col--gap5">
            <div className="row row--gap2 row--wrap">
              <Tag tone={priorityTone[active.priority]} size="lg">{active.priority}</Tag>
              <Tag tone={statusTone[active.status]} dot size="lg">{statusLabel[active.status]}</Tag>
              {active.tags.map((t) => <Tag key={t}>{t}</Tag>)}
            </div>

            <Note tone="info">{active.summary}</Note>

            <DL
              cols={2}
              items={[
                { label: '业务价值', value: `${active.businessValue} / 5` },
                { label: '实现成本', value: `${active.effort} / 5` },
                { label: '紧急度', value: `${active.urgency} / 5` },
                { label: '综合价值分', value: active.score.toFixed(1), mono: true },
                { label: '期望上线', value: active.targetRelease },
                { label: '录入时间', value: active.createdAt },
                { label: '需求负责人', value: active.owner },
                { label: '录入人', value: active.source.submitter },
                { label: '证据材料', value: `${active.source.evidences} 份` },
                { label: '关联需求', value: active.related.length ? active.related.join('、') : '无' },
              ]}
            />

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">验收标准</span>
              <div className="criteria">
                {active.acceptance.map((a, i) => (
                  <div className="criteria__item" key={a}>
                    <span className="criteria__idx">{i + 1}</span>
                    <span className="t-sm t-secondary">{a}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">流转轨迹</span>
              <div className="timeline">
                <div className="timeline__item timeline__item--done">
                  <span className="timeline__dot" />
                  <div className="col col--gap1">
                    <span className="t-sm t-medium t-primary">需求录入</span>
                    <span className="t-xs t-tertiary">{active.source.submitter} · {active.createdAt}</span>
                  </div>
                </div>
                <div className="timeline__item timeline__item--done">
                  <span className="timeline__dot" />
                  <div className="col col--gap1">
                    <span className="t-sm t-medium t-primary">价值分评估</span>
                    <span className="t-xs t-tertiary">{active.owner} · 评分 {active.score.toFixed(1)}</span>
                  </div>
                </div>
                <div className={`timeline__item ${active.status === 'approved' ? 'timeline__item--done' : 'timeline__item--active'}`}>
                  <span className="timeline__dot" />
                  <div className="col col--gap1">
                    <span className="t-sm t-medium t-primary">需求评审</span>
                    <span className="t-xs t-tertiary">{statusLabel[active.status]}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="row row--gap2" style={{ flexWrap: 'wrap' }}>
              {active.related.length > 0 && active.related.map((rid) => (
                <Tag key={rid} tone="info">{rid}</Tag>
              ))}
            </div>

            <KV k="所属项目" v={<Link to="/" className="t-brand">{project.name}</Link>} />
          </div>
        )}
      </Drawer>
    </>
  );
}
