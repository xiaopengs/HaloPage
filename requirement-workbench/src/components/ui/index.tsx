import type { ReactNode, CSSProperties } from 'react';
import { Icon } from './Icon';

/* ============================ Tag ============================ */

export function Tag({
  tone = 'neutral', children, dot, size,
}: { tone?: string; children: ReactNode; dot?: boolean; size?: 'lg' }) {
  return (
    <span className={`tag tag--${tone}${dot ? ' tag--dot' : ''}${size === 'lg' ? ' tag--lg' : ''}`}>
      {children}
    </span>
  );
}

/* ============================ Button ============================ */

export function Button({
  variant = 'secondary', size = 'sm', children, icon, iconRight, onClick, disabled, block, title, type = 'button',
}: {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  children?: ReactNode;
  icon?: string;
  iconRight?: string;
  onClick?: () => void;
  disabled?: boolean;
  block?: boolean;
  title?: string;
  type?: 'button' | 'submit';
}) {
  const sizeCls = size === 'md' ? 'btn--md' : 'btn--sm';
  return (
    <button
      type={type}
      className={`btn btn--${variant} ${sizeCls}${block ? ' btn--block' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {icon && <Icon name={icon} size={size === 'md' ? 15 : 13} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'md' ? 15 : 13} />}
    </button>
  );
}

/* ============================ Card ============================ */

export function Card({
  title, sub, actions, children, flush, style, id,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  style?: CSSProperties;
  id?: string;
}) {
  return (
    <section className="card" style={style} id={id}>
      {(title || actions) && (
        <header className="card__head">
          <div className="card__title-wrap">
            <h3 className="card__title">{title}</h3>
            {sub && <span className="card__sub">{sub}</span>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className={`card__body${flush ? ' card__body--flush' : ''}`}>{children}</div>
    </section>
  );
}

/* ============================ Stat ============================ */

export function Stat({
  label, value, unit, foot, delta, deltaTone = 'flat', icon,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  foot?: ReactNode;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'flat';
  icon?: string;
}) {
  const arrow = deltaTone === 'up' ? 'arrowUp' : deltaTone === 'down' ? 'arrowDown' : 'minus';
  return (
    <div className="stat">
      <div className="stat__label">
        {icon && <Icon name={icon} size={13} />}
        {label}
      </div>
      <div className="stat__value">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="stat__foot">
        {delta && (
          <span className={`stat__delta stat__delta--${deltaTone}`}>
            {deltaTone !== 'flat' && <Icon name={arrow} size={11} />}
            {delta}
          </span>
        )}
        {foot}
      </div>
    </div>
  );
}

/* ============================ Progress ============================ */

export function Progress({
  value, tone = 'brand', label, width = 72,
}: { value: number; tone?: string; label?: string; width?: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="prog" style={{ maxWidth: width + 46 }}>
      <div className="prog__track">
        <div className={`prog__fill prog__fill--${tone}`} style={{ width: `${v}%` }} />
      </div>
      {label !== '' && <span className="prog__label">{label ?? `${v}%`}</span>}
    </div>
  );
}

/* ============================ Segmented ============================ */

export function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={`seg__item${o.value === value ? ' is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="seg__count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ============================ 下划线 Tabs ============================ */

export function Tabs<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={`tab${o.value === value ? ' is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="t-xs t-tertiary"> ({o.count})</span>}
        </button>
      ))}
    </div>
  );
}

/* ============================ Avatar ============================ */

export function Avatar({ name, tone = 'brand', size = 'md' }: { name: string; tone?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeCls = size === 'sm' ? ' avatar--sm' : size === 'lg' ? ' avatar--lg' : '';
  return (
    <span className={`avatar avatar--${tone}${sizeCls}`} title={name}>
      {name.slice(0, 1)}
    </span>
  );
}

/* ============================ 描述列表 ============================ */

export function DL({ items, cols }: { items: { label: string; value: ReactNode; mono?: boolean }[]; cols?: number }) {
  return (
    <div className="dl" style={cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` } : undefined}>
      {items.map((it) => (
        <div className="dl__item" key={it.label}>
          <span className="dl__label">{it.label}</span>
          <span className={`dl__value${it.mono ? ' dl__value--mono' : ''}`}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================ Note ============================ */

export function Note({
  tone = 'info', icon, children,
}: { tone?: 'info' | 'warning' | 'danger' | 'success' | 'brand'; icon?: string; children: ReactNode }) {
  const defaultIcon =
    tone === 'danger' ? 'alert' : tone === 'warning' ? 'alert' : tone === 'success' ? 'check' : tone === 'brand' ? 'sparkles' : 'eye';
  return (
    <div className={`note note--${tone}`}>
      <span className="note__icon">
        <Icon name={icon ?? defaultIcon} size={15} />
      </span>
      <div>{children}</div>
    </div>
  );
}

/* ============================ 空状态 ============================ */

export function EmptyState({ icon = 'search', title, desc, action }: { icon?: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon name={icon} size={20} />
      </div>
      <div className="empty-state__title">{title}</div>
      {desc && <div className="empty-state__desc">{desc}</div>}
      {action}
    </div>
  );
}

/* ============================ 骨架屏 ============================ */

export function Skeleton({ h = 16, w = '100%', style }: { h?: number; w?: number | string; style?: CSSProperties }) {
  return <div className="skeleton" style={{ height: h, width: w, ...style }} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="col col--gap3" style={{ padding: 'var(--sp-5)' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row row--gap4">
          <Skeleton h={14} w={80} />
          <Skeleton h={14} w="40%" />
          <Skeleton h={14} w={60} />
          <Skeleton h={14} w={100} />
        </div>
      ))}
    </div>
  );
}

/* ============================ KeyValue ============================ */

export function KV({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="kv">
      <span className="kv__k">{k}</span>
      <span className={`kv__v${mono ? ' t-mono' : ''}`}>{v}</span>
    </div>
  );
}

/* ============================ 分页 ============================ */

export function Pager({
  total, page, pageSize, onPage,
}: { total: number; page: number; pageSize: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="pager">
      <span>
        共 {total} 条 · 显示 {from}–{to}
      </span>
      <div className="pager__ctrl">
        <button className="pager__btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="上一页">
          <Icon name="chevronLeft" size={13} />
        </button>
        <span className="t-nowrap">
          {page} / {pages}
        </span>
        <button className="pager__btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="下一页">
          <Icon name="chevronRight" size={13} />
        </button>
      </div>
    </div>
  );
}

/* ============================ 抽屉 ============================ */

export function Drawer({
  open, title, sub, onClose, children, foot, width,
}: {
  open: boolean;
  title: ReactNode;
  sub?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  foot?: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-mask" onClick={onClose} />
      <aside className="drawer" style={width ? { width: `min(${width}px, 94vw)` } : undefined} role="dialog" aria-modal="true">
        <header className="drawer__head">
          <div className="col col--gap1 flex1">
            <h2 className="t-lg t-semibold t-primary">{title}</h2>
            {sub && <div className="t-xs t-tertiary">{sub}</div>}
          </div>
          <Button variant="ghost" icon="x" onClick={onClose} title="关闭" />
        </header>
        <div className="drawer__body">{children}</div>
        {foot && <footer className="drawer__foot">{foot}</footer>}
      </aside>
    </>
  );
}
