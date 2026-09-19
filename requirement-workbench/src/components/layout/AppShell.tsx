import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Icon } from '../ui/Icon';
import { stageNav, project } from '../../data';

/** 低于该宽度时侧栏默认收起（仍可手动展开） */
const NARROW_BREAKPOINT = 1180;
/** 低于该宽度时侧栏改为浮层抽屉，正文独占宽度 */
const MOBILE_BREAKPOINT = 768;

/* ============================ 面包屑 ============================ */

function Breadcrumb({ pathname }: { pathname: string }) {
  const current = stageNav.find((s) => s.path === pathname);
  const isOverview = pathname === '/';
  const isRisks = pathname === '/risks';

  return (
    <nav className="crumb" aria-label="面包屑">
      <Link to="/" className="crumb__item">
        研发工作台
      </Link>
      <span className="crumb__sep"><Icon name="chevronRight" size={12} /></span>
      {!isOverview && (
        <>
          <span className="crumb__item">{project.name}</span>
          <span className="crumb__sep"><Icon name="chevronRight" size={12} /></span>
        </>
      )}
      <span className="crumb__item crumb__item--current">
        {isOverview ? '项目总览' : isRisks ? '风险与变更' : current?.name ?? '未知页面'}
      </span>
    </nav>
  );
}

/* ============================ 阶段流程条 ============================ */

export function FlowStrip({ activeKey }: { activeKey?: string }) {
  return (
    <div className="flow-strip">
      {stageNav.map((s) => (
        <Link
          key={s.key}
          to={s.path}
          className={`flow-step is-${s.status}${s.key === activeKey ? ' is-active' : ''}`}
        >
          <div className="flow-step__top">
            <span className="flow-step__num">
              {s.status === 'done' ? <Icon name="check" size={10} strokeWidth={3} /> : s.index}
            </span>
            <span className="flow-step__name">{s.shortName}</span>
          </div>
          <div className="flow-step__bar">
            <span style={{ width: `${s.progress}%` }} />
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ============================ 应用骨架 ============================ */

export default function AppShell() {
  // 窄屏默认收起；用户一旦手动切换过，就尊重用户的选择
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < NARROW_BREAKPOINT,
  );
  // 移动端抽屉：与 collapsed 分开管理，抽屉里永远展开完整导航
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT,
  );
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  /* 窗口尺寸变化时同步：仅在用户未手动干预的前提下自动收起/展开 */
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* 移动端断点监听：跨过断点即关闭抽屉，避免残留遮罩 */
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setNavOpen(false);
    };
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /* 窄屏下跳转页面后自动收起，避免遮挡内容 */
  useEffect(() => {
    if (window.innerWidth < NARROW_BREAKPOINT) setCollapsed(true);
    setNavOpen(false);
  }, [pathname]);

  /* 抽屉打开时锁定滚动 + Esc 关闭 */
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [navOpen]);

  const openDefects = useMemo(() => project.metrics.defectOpen, []);

  return (
    <div
      className={`app-shell${collapsed ? ' is-collapsed' : ''}${navOpen ? ' is-nav-open' : ''}`}
    >
      <Sidebar collapsed={isMobile ? false : collapsed} />

      {isMobile && navOpen && (
        <button
          className="nav-backdrop"
          aria-label="关闭导航"
          onClick={() => setNavOpen(false)}
        />
      )}

      <div className="main">
        <header className="topbar">
          <button
            className="topbar__icon-btn"
            onClick={() => (isMobile ? setNavOpen((v) => !v) : setCollapsed((c) => !c))}
            title={isMobile ? '打开导航' : collapsed ? '展开侧边栏' : '收起侧边栏'}
            aria-label={isMobile ? '打开导航' : '切换侧边栏'}
            aria-expanded={isMobile ? navOpen : !collapsed}
          >
            <Icon name={isMobile ? (navOpen ? 'x' : 'menu') : 'panelLeft'} size={16} />
          </button>

          <Breadcrumb pathname={pathname} />

          <div className="topbar__spacer" />

          <label className="search-box">
            <Icon name="search" size={14} />
            <input placeholder="搜索需求 / 任务 / 缺陷…" aria-label="搜索" />
            <kbd>/</kbd>
          </label>

          <button className="topbar__icon-btn" title="通知" aria-label="通知">
            <Icon name="bell" size={16} />
            <span className="topbar__badge">{openDefects}</span>
          </button>
          <button className="topbar__icon-btn" title="帮助" aria-label="帮助">
            <Icon name="book" size={16} />
          </button>
        </header>

        <main className="content">
          <div className="content__inner">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
