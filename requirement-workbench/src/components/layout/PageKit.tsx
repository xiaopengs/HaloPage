import type { ReactNode } from 'react';
import { FlowStrip } from '../layout/AppShell';
import { Tag } from '../ui';

/* ============================ 页头 ============================ */

export function PageHead({
  eyebrow, title, status, desc, actions, activeStage, showFlow = true,
}: {
  eyebrow?: ReactNode;
  title: string;
  status?: ReactNode;
  desc?: string;
  actions?: ReactNode;
  activeStage?: string;
  showFlow?: boolean;
}) {
  return (
    <>
      {showFlow && activeStage && (
        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <FlowStrip activeKey={activeStage} />
        </div>
      )}
      <div className="page-head">
        <div className="page-head__main">
          {eyebrow && <div className="page-head__eyebrow">{eyebrow}</div>}
          <h1 className="page-head__title">
            {title}
            {status}
          </h1>
          {desc && <p className="page-head__desc">{desc}</p>}
        </div>
        {actions && <div className="page-head__actions">{actions}</div>}
      </div>
    </>
  );
}

/* ============================ 区块标签 ============================ */

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}

/* ============================ 表格封装 ============================ */

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** 单元格渲染 */
  render: (row: T, index: number) => ReactNode;
  width?: number | string;
  align?: 'left' | 'right';
  nowrap?: boolean;
}

export function DataTable<T extends { id?: string }>({
  columns, rows, onRowClick, selectedId, empty, dense,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  selectedId?: string;
  empty?: ReactNode;
  dense?: boolean;
}) {
  if (rows.length === 0) {
    return <div className="empty-state">
      <div className="empty-state__icon">—</div>
      <div className="empty-state__title">暂无数据</div>
      <div className="empty-state__desc">调整筛选条件后重试</div>
    </div>;
  }

  return (
    <div className="tbl-wrap">
      <table className="tbl" style={dense ? { fontSize: 'var(--fs-12)' } : undefined}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  width: c.width,
                  textAlign: c.align === 'right' ? 'right' : 'left',
                  ...(c.nowrap ? { whiteSpace: 'nowrap' } : {}),
                }}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              className={[
                onRowClick ? 'is-clickable' : '',
                selectedId && row.id === selectedId ? 'is-selected' : '',
              ].filter(Boolean).join(' ')}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    textAlign: c.align === 'right' ? 'right' : 'left',
                    ...(c.nowrap ? { whiteSpace: 'nowrap' } : {}),
                    ...(dense ? { paddingTop: 8, paddingBottom: 8 } : {}),
                  }}
                >
                  {c.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {empty}
    </div>
  );
}

/* ============================ 页面级筛选栏 ============================ */

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-3)',
        flexWrap: 'wrap',
        marginBottom: 'var(--sp-4)',
      }}
    >
      {children}
    </div>
  );
}

/* ============================ 两栏内容布局 ============================ */

export function SplitContent({
  main, aside, mainFlex = 1, asideWidth = 320,
}: { main: ReactNode; aside: ReactNode; mainFlex?: number; asideWidth?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `minmax(0, ${mainFlex}fr) minmax(280px, ${asideWidth}px)`,
        gap: 'var(--sp-4)',
        alignItems: 'start',
      }}
      className="split-content"
    >
      <div className="col col--gap4" style={{ minWidth: 0 }}>{main}</div>
      <div className="col col--gap4" style={{ minWidth: 0, position: 'sticky', top: 0 }}>{aside}</div>
    </div>
  );
}

/* ============================ 指标行 ============================ */

export function MiniStat({
  label, value, tone, hint,
}: { label: string; value: ReactNode; tone?: string; hint?: string }) {
  return (
    <div className="col col--gap1" style={{ minWidth: 0 }}>
      <span className="t-xs t-tertiary">{label}</span>
      <span className={`t-lg t-semibold ${tone ? `t-${tone}` : 't-primary'}`} style={{ lineHeight: 1.3 }}>
        {value}
      </span>
      {hint && <span className="t-xs t-tertiary">{hint}</span>}
    </div>
  );
}

/* ============================ 状态徽标组 ============================ */

export function StatusPill({ tone, children }: { tone: string; children: ReactNode }) {
  return <Tag tone={tone} dot>{children}</Tag>;
}
