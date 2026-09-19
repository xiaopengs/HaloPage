import { useMemo, useState } from 'react';
import { Card, Stat, Tag, Progress, Button, Tabs, Note, DL, Segmented, Drawer } from '../components/ui';
import { PageHead, DataTable, MiniStat, SplitContent } from '../components/layout/PageKit';
import type { Column } from '../components/layout/PageKit';
import { Icon } from '../components/ui/Icon';
import { designDocs, stats, reqById } from '../data';
import type { DesignDoc } from '../data';

type TabKey = 'docs' | 'apis' | 'tables';

const DOC_STATUS_TONE: Record<DesignDoc['status'], string> = {
  草稿: 'neutral', 评审中: 'brand', 已定稿: 'success',
};

const METHOD_TONE: Record<string, string> = {
  GET: 'success', POST: 'brand', PUT: 'warning', DELETE: 'danger', PATCH: 'info',
};

const SEV_TONE: Record<string, string> = { blocker: 'danger', major: 'warning', minor: 'info' };
const SEV_LABEL: Record<string, string> = { blocker: '阻塞', major: '严重', minor: '一般' };

type ApiRow = DesignDoc['apis'][number] & { docId: string; docName: string };
type TableRow = DesignDoc['tables'][number] & { docId: string; module: string };

export default function DetailDesign() {
  const [tab, setTab] = useState<TabKey>('docs');
  const [activeId, setActiveId] = useState(designDocs[0].id);
  const [activeDoc, setActiveDoc] = useState<DesignDoc | null>(null);
  const [methodFilter, setMethodFilter] = useState<string>('全部');

  const active = designDocs.find((d) => d.id === activeId)!;

  const allApis: ApiRow[] = useMemo(
    () => designDocs.flatMap((d) => d.apis.map((a) => ({ ...a, docId: d.id, docName: d.name }))),
    [],
  );

  const allTables: TableRow[] = useMemo(
    () => designDocs.flatMap((d) => d.tables.map((t) => ({ ...t, docId: d.id, module: d.module }))),
    [],
  );

  const apis = methodFilter === '全部' ? allApis : allApis.filter((a) => a.method === methodFilter);

  const docColumns: Column<DesignDoc>[] = [
    { key: 'id', header: '文档编号', width: 92, nowrap: true, render: (d) => <span className="t-mono t-xs t-secondary">{d.id}</span> },
    {
      key: 'name',
      header: '设计文档',
      render: (d) => (
        <div className="col col--gap1" style={{ minWidth: 0 }}>
          <span className="t-sm t-medium t-primary t-ellipsis">{d.name}</span>
          <span className="t-xs t-tertiary">{d.version} · {d.author} · {d.updatedAt}</span>
        </div>
      ),
    },
    { key: 'module', header: '所属模块', width: 128, nowrap: true, render: (d) => <Tag tone="brand">{d.module}</Tag> },
    {
      key: 'completeness',
      header: '完备度',
      width: 138,
      render: (d) => {
        const done = d.checklist.filter((c) => c.done).length;
        return <Progress value={(done / d.checklist.length) * 100} tone={done === d.checklist.length ? 'success' : 'warning'} width={62} label={`${done}/${d.checklist.length}`} />;
      },
    },
    { key: 'apis', header: '接口', width: 62, align: 'right', render: (d) => <span className="t-sm t-semibold">{d.apis.length}</span> },
    { key: 'tables', header: '表', width: 56, align: 'right', render: (d) => <span className="t-sm t-semibold">{d.tables.length}</span> },
    {
      key: 'issues',
      header: '未闭环问题',
      width: 104,
      render: (d) => {
        const open = d.issues.filter((i) => i.status === 'open').length;
        return open ? <Tag tone="danger" dot>{open} 项</Tag> : <Tag tone="success" dot>已闭环</Tag>;
      },
    },
    { key: 'status', header: '状态', width: 88, render: (d) => <Tag tone={DOC_STATUS_TONE[d.status]} dot>{d.status}</Tag> },
  ];

  const apiColumns: Column<ApiRow>[] = [
    { key: 'method', header: '方法', width: 70, render: (a) => <Tag tone={METHOD_TONE[a.method]}>{a.method}</Tag> },
    { key: 'path', header: '路径', width: 268, nowrap: true, render: (a) => <span className="code code--inline t-xs">{a.path}</span> },
    { key: 'summary', header: '接口说明', render: (a) => <span className="t-xs t-secondary">{a.summary}</span> },
    { key: 'change', header: '变更', width: 68, render: (a) => <Tag tone={a.change === '新增' ? 'success' : a.change === '修改' ? 'warning' : 'danger'}>{a.change}</Tag> },
    { key: 'idem', header: '幂等', width: 62, render: (a) => (a.idempotent ? <Tag tone="success">是</Tag> : <Tag>否</Tag>) },
    { key: 'qps', header: '预估 QPS', width: 90, align: 'right', render: (a) => <span className="t-xs t-mono">{a.qps.toLocaleString('zh-CN')}</span> },
    { key: 'p99', header: 'P99 目标', width: 88, align: 'right', render: (a) => <span className={`t-xs t-mono ${a.p99 > 500 ? 't-warning' : 't-secondary'}`}>{a.p99}ms</span> },
    { key: 'doc', header: '来源文档', width: 96, nowrap: true, render: (a) => <span className="t-mono t-xs t-tertiary">{a.docId}</span> },
  ];

  const doneChecklist = active.checklist.filter((c) => c.done).length;

  return (
    <>
      <PageHead
        activeStage="detail-design"
        eyebrow="阶段 08 / 10 · 架构域"
        title="方案详细设计"
        status={<Tag tone="success" dot>已完成</Tag>}
        desc="把架构决策落到可编码的接口契约、数据模型与流程编排上，逐份文档做完备度自检，设计缺陷在编码前闭环。"
        actions={
          <>
            <Button icon="download">导出接口文档</Button>
            <Button variant="primary" icon="plus">新建设计文档</Button>
          </>
        }
      />

      <div className="grid grid--5" style={{ marginBottom: 'var(--sp-5)' }}>
        <Stat label="设计文档" value={designDocs.length} unit="份" icon="fileText" delta={`定稿 ${designDocs.filter((d) => d.status === '已定稿').length} 份`} deltaTone="up" />
        <Stat label="接口定义" value={stats.apiTotal} unit="个" icon="link" delta={`新增 ${allApis.filter((a) => a.change === '新增').length} 个`} deltaTone="flat" />
        <Stat label="数据表设计" value={stats.tableTotal} unit="张" icon="grid" delta={`字段 ${allTables.reduce((s, t) => s + t.fields.length, 0)} 个`} deltaTone="flat" />
        <Stat label="设计问题" value={designDocs.reduce((s, d) => s + d.issues.length, 0)} unit="项" icon="alert" delta={`未闭环 ${stats.designIssuesOpen} 项`} deltaTone={stats.designIssuesOpen ? 'down' : 'up'} />
        <Stat
          label="完备度均值"
          value={Math.round((designDocs.reduce((s, d) => s + d.checklist.filter((c) => c.done).length / d.checklist.length, 0) / designDocs.length) * 100)}
          unit="%"
          icon="check"
          delta="目标 100%"
          deltaTone="up"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'docs', label: '设计文档', count: designDocs.length },
          { value: 'apis', label: '接口契约', count: allApis.length },
          { value: 'tables', label: '数据模型', count: allTables.length },
        ]}
      />

      {tab === 'docs' && (
        <SplitContent
          asideWidth={380}
          main={
            <Card flush title="设计文档清单" sub="点击行查看详情，双击标题进入完整设计单">
              <DataTable
                columns={docColumns}
                rows={designDocs}
                onRowClick={(d) => setActiveId(d.id)}
                selectedId={activeId}
                dense
              />
            </Card>
          }
          aside={
            <>
              <Card
                title={active.name}
                sub={`${active.id} · ${active.module} · ${active.author}`}
                actions={<Tag tone={DOC_STATUS_TONE[active.status]} dot>{active.status}</Tag>}
              >
                <div className="col col--gap4">
                  <div className="row row--gap4">
                    <MiniStat label="接口数" value={active.apis.length} />
                    <MiniStat label="数据表" value={active.tables.length} />
                    <MiniStat label="流程" value={active.flows.length} />
                  </div>

                  <div className="col col--gap2">
                    <div className="row row--between">
                      <span className="t-sm t-semibold t-primary">设计完备度自检</span>
                      <span className="t-xs t-tertiary">{doneChecklist}/{active.checklist.length}</span>
                    </div>
                    <Progress value={(doneChecklist / active.checklist.length) * 100} tone={doneChecklist === active.checklist.length ? 'success' : 'warning'} width={300} />
                    <div className="checklist">
                      {active.checklist.map((c) => (
                        <div className="checklist__item" key={c.item}>
                          <span className={`checklist__box${c.done ? ' checklist__box--done' : ''}`}>
                            {c.done && <Icon name="check" size={10} strokeWidth={3} />}
                          </span>
                          <span className={`t-sm ${c.done ? 't-primary' : 't-tertiary'}`}>{c.item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col col--gap3">
                    <span className="t-sm t-semibold t-primary">非功能设计</span>
                    {active.nonFunctional.map((n) => (
                      <div className="row row--gap2" key={n.dimension} style={{ alignItems: 'flex-start' }}>
                        <Tag tone="info">{n.dimension}</Tag>
                        <span className="t-xs t-secondary flex1">{n.design}</span>
                      </div>
                    ))}
                  </div>

                  <div className="col col--gap2">
                    <span className="t-sm t-semibold t-primary">覆盖需求</span>
                    {active.requirementIds.map((rid) => (
                      <div key={rid} className="row row--between row--gap2">
                        <span className="t-xs t-mono t-brand t-nowrap">{rid}</span>
                        <span className="t-xs t-secondary t-ellipsis flex1">{reqById.get(rid)?.title ?? '—'}</span>
                      </div>
                    ))}
                  </div>

                  {active.issues.length > 0 && (
                    <div className="col col--gap2">
                      <span className="t-sm t-semibold t-primary">设计评审问题</span>
                      {active.issues.map((i) => (
                        <div key={i.id} className="row row--gap2" style={{ alignItems: 'flex-start' }}>
                          <Tag tone={SEV_TONE[i.severity]}>{SEV_LABEL[i.severity]}</Tag>
                          <span className={`t-xs flex1 ${i.status === 'open' ? 't-primary' : 't-tertiary'}`}>{i.content}</span>
                          <Tag tone={i.status === 'open' ? 'warning' : 'success'} dot>{i.status === 'open' ? '未闭环' : '已闭环'}</Tag>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card title="设计流程编排" sub={`${active.flows.length} 条主流程`}>
                <div className="col col--gap4">
                  {active.flows.map((f) => (
                    <div className="col col--gap2" key={f.name}>
                      <span className="t-sm t-medium t-primary">{f.name}</span>
                      <div className="col col--gap1">
                        {f.steps.map((s, i) => (
                          <div className="row row--gap2" key={s}>
                            <span className="criteria__idx">{i + 1}</span>
                            <span className="t-xs t-secondary">{s}</span>
                          </div>
                        ))}
                      </div>
                      <div className="note note--warning" style={{ padding: 'var(--sp-2) var(--sp-3)' }}>
                        <span className="note__icon"><Icon name="alert" size={13} /></span>
                        <span className="t-xs">失败处理：{f.failureHandling}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          }
        />
      )}

      {tab === 'apis' && (
        <div className="col col--gap4">
          <div className="row row--gap3 row--wrap">
            <Segmented
              value={methodFilter}
              onChange={setMethodFilter}
              options={[
                { value: '全部', label: '全部', count: allApis.length },
                ...(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map((m) => ({
                  value: m, label: m, count: allApis.filter((a) => a.method === m).length,
                })),
              ]}
            />
            <span className="t-xs t-tertiary" style={{ marginLeft: 'auto' }}>
              幂等接口 {allApis.filter((a) => a.idempotent).length} / {allApis.length} · P99 超 500ms 的接口 {allApis.filter((a) => a.p99 > 500).length} 个
            </span>
          </div>

          <Card flush title={`接口契约 · ${apis.length} 个`} sub="接口先行，契约冻结后方可进入开发">
            <DataTable columns={apiColumns} rows={apis} dense />
          </Card>

          <div className="grid grid--3">
            <Card title="变更分布">
              <div className="hbar">
                {(['新增', '修改', '废弃'] as const).map((c) => {
                  const n = allApis.filter((a) => a.change === c).length;
                  return (
                    <div className="hbar__row" key={c}>
                      <span className="hbar__label t-xs t-secondary" style={{ width: 44 }}>{c}</span>
                      <div className="hbar__track">
                        <div className="hbar__fill" style={{ width: `${(n / allApis.length) * 100}%`, background: c === '新增' ? 'var(--success-500)' : c === '修改' ? 'var(--warning-500)' : 'var(--danger-500)' }} />
                      </div>
                      <span className="hbar__val">{n}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card title="性能目标分布">
              <div className="hbar">
                {[['≤200ms', 0, 200], ['201-500ms', 200, 500], ['>500ms', 500, 100000]].map(([label, lo, hi]) => {
                  const n = allApis.filter((a) => a.p99 > (lo as number) && a.p99 <= (hi as number)).length;
                  return (
                    <div className="hbar__row" key={label as string}>
                      <span className="hbar__label t-xs t-secondary" style={{ width: 74 }}>{label}</span>
                      <div className="hbar__track">
                        <div className="hbar__fill" style={{ width: `${(n / allApis.length) * 100}%`, background: (hi as number) > 500 ? 'var(--warning-500)' : 'var(--brand-500)' }} />
                      </div>
                      <span className="hbar__val">{n}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card title="接口归属模块">
              <div className="hbar">
                {designDocs.map((d) => (
                  <div className="hbar__row" key={d.id}>
                    <span className="hbar__label t-xs t-secondary t-ellipsis" style={{ width: 92 }}>{d.module}</span>
                    <div className="hbar__track">
                      <div className="hbar__fill" style={{ width: `${(d.apis.length / Math.max(...designDocs.map((x) => x.apis.length))) * 100}%`, background: 'var(--info-500)' }} />
                    </div>
                    <span className="hbar__val">{d.apis.length}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'tables' && (
        <div className="col col--gap4">
          <Card flush title={`数据模型 · ${allTables.length} 张表`} sub="点击表名查看字段定义">
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 200 }}>表名</th>
                    <th style={{ width: 148 }}>说明</th>
                    <th style={{ width: 80 }}>字段数</th>
                    <th style={{ width: 100 }}>索引字段</th>
                    <th style={{ width: 128 }}>预估数据量</th>
                    <th style={{ width: 128 }}>所属模块</th>
                    <th style={{ width: 96 }}>来源文档</th>
                    <th>关键字段</th>
                  </tr>
                </thead>
                <tbody>
                  {allTables.map((t) => (
                    <tr key={t.name} className="is-clickable" onClick={() => setActiveDoc(designDocs.find((d) => d.id === t.docId) ?? null)}>
                      <td><span className="code code--inline t-xs">{t.name}</span></td>
                      <td><span className="t-xs t-secondary">{t.comment}</span></td>
                      <td><span className="t-sm t-semibold">{t.fields.length}</span></td>
                      <td><span className="t-sm t-semibold">{t.fields.filter((f) => f.indexed).length}</span></td>
                      <td><span className="t-xs t-tertiary t-mono">{t.estimatedRows}</span></td>
                      <td><Tag tone="brand">{t.module}</Tag></td>
                      <td><span className="t-mono t-xs t-tertiary">{t.docId}</span></td>
                      <td>
                        <span className="row row--gap1 row--wrap">
                          {t.fields.slice(0, 4).map((f) => (
                            <span className="arch-chip" key={f.name}>{f.name}</span>
                          ))}
                          {t.fields.length > 4 && <span className="t-xs t-tertiary">+{t.fields.length - 4}</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Note tone="info">
            数据模型共 {allTables.length} 张表、{allTables.reduce((s, t) => s + t.fields.length, 0)} 个字段，
            其中 {allTables.reduce((s, t) => s + t.fields.filter((f) => !f.nullable).length, 0)} 个为必填字段。
            会话与消息类表按日分区，预估年增数据量 4.2TB，已纳入容量规划。
          </Note>

          <div className="grid grid--2">
            <Card title="模块数据表分布">
              <div className="hbar">
                {designDocs.map((d) => (
                  <div className="hbar__row" key={d.id}>
                    <span className="hbar__label t-xs t-secondary t-ellipsis" style={{ width: 96 }}>{d.module}</span>
                    <div className="hbar__track">
                      <div className="hbar__fill" style={{ width: `${(d.tables.length / Math.max(...designDocs.map((x) => x.tables.length))) * 100}%`, background: 'var(--violet-500)' }} />
                    </div>
                    <span className="hbar__val">{d.tables.length}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="设计要素完备度">
              <div className="col col--gap3">
                {designDocs.map((d) => {
                  const done = d.checklist.filter((c) => c.done).length;
                  return (
                    <div className="row row--between row--gap3" key={d.id}>
                      <span className="t-xs t-secondary t-ellipsis" style={{ minWidth: 0, flex: 1 }}>{d.name}</span>
                      <Progress value={(done / d.checklist.length) * 100} tone={done === d.checklist.length ? 'success' : 'warning'} width={78} label={`${done}/${d.checklist.length}`} />
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ============ 表结构详情 ============ */}
      <Drawer
        open={!!activeDoc}
        onClose={() => setActiveDoc(null)}
        width={760}
        title={`${activeDoc?.name ?? ''} · 数据模型`}
        sub={activeDoc && `${activeDoc.id} · ${activeDoc.module} · ${activeDoc.version}`}
        foot={<Button onClick={() => setActiveDoc(null)}>关闭</Button>}
      >
        {activeDoc && (
          <div className="col col--gap5">
            {activeDoc.tables.map((t) => (
              <div className="col col--gap3" key={t.name}>
                <div className="row row--between row--gap3">
                  <span className="row row--gap2">
                    <span className="code code--inline t-sm">{t.name}</span>
                    <span className="t-xs t-tertiary">{t.comment}</span>
                  </span>
                  <Tag tone="info">预估 {t.estimatedRows}</Tag>
                </div>
                <div className="tbl-wrap">
                  <table className="tbl" style={{ fontSize: 'var(--fs-12)' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 150 }}>字段</th>
                        <th style={{ width: 110 }}>类型</th>
                        <th style={{ width: 74 }}>可空</th>
                        <th style={{ width: 74 }}>索引</th>
                        <th>说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.fields.map((f) => (
                        <tr key={f.name}>
                          <td><span className="t-mono t-xs t-primary">{f.name}</span></td>
                          <td><span className="t-mono t-xs t-secondary">{f.type}</span></td>
                          <td>{f.nullable ? <span className="t-xs t-tertiary">是</span> : <Tag tone="warning">必填</Tag>}</td>
                          <td>{f.indexed ? <Tag tone="brand">索引</Tag> : <span className="t-xs t-tertiary">—</span>}</td>
                          <td><span className="t-xs t-secondary">{f.comment}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <DL
              cols={2}
              items={[
                { label: '关联设计文档', value: activeDoc.id, mono: true },
                { label: '作者', value: activeDoc.author },
                { label: '覆盖需求', value: activeDoc.requirementIds.join('、') },
                { label: '最近更新', value: activeDoc.updatedAt },
              ]}
            />

            <div className="col col--gap2">
              <span className="t-sm t-semibold t-primary">关联开发任务</span>
              <div className="row row--gap2 row--wrap">
                {activeDoc.requirementIds.length > 0 && <span className="t-xs t-tertiary">该文档支撑的开发任务见「方案开发」阶段。</span>}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
