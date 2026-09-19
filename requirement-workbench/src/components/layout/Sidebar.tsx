import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { project, stageNav, stats, defects } from '../../data';

/* ============================ 左侧边栏 ============================ */

function Sidebar({ collapsed }: { collapsed: boolean }) {
  const groups = Array.from(new Set(stageNav.map((s) => s.group)));
  const overallProgress = Math.round(
    stageNav.reduce((sum, s) => sum + s.progress, 0) / stageNav.length,
  );
  const trackingRisks = project.risks.filter((r) => r.status === '跟踪中').length;

  /* 折叠态下用原生 title 兜底提示，展开态不显示（信息已在行内） */
  const tip = (name: string, hint: string) => (collapsed ? `${name} · ${hint}` : undefined);

  return (
    <aside className="sidebar" aria-label="主导航">
      {/* ---------- 品牌 ---------- */}
      <div className="sb-brand">
        <div className="sb-brand__row">
          <div className="sb-brand__logo">
            <Icon name="layers" size={17} strokeWidth={2} />
          </div>
          <div className="sb-brand__text">
            <div className="sb-brand__title">研发项目工作台</div>
            <div className="sb-brand__sub">PROJECT WORKBENCH</div>
          </div>
        </div>
      </div>

      {/* ---------- 项目卡片 ---------- */}
      <div className="sb-project" {...(collapsed ? { 'aria-hidden': true } : {})}>
        <div className="sb-project__top">
          <span className="sb-project__name">{project.name}</span>
          <Icon name="chevronDown" size={13} />
        </div>
        <div className="sb-project__meta">
          <span>{project.code}</span>
          <span>·</span>
          <span>{project.owner}</span>
        </div>
        <div
          className="sb-project__bar"
          role="progressbar"
          aria-valuenow={overallProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="阶段平均进度"
        >
          <span style={{ width: `${overallProgress}%` }} />
        </div>
        <div className="sb-project__pct">阶段平均进度 {overallProgress}%</div>
      </div>

      {/* ---------- 导航 ---------- */}
      <nav className="sb-nav">
        {/* 总览 */}
        <div className="sb-group sb-group--flat">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sb-item${isActive ? ' is-active' : ''}`}
            title={tip('项目总览', '健康度 · 里程碑 · 风险')}
          >
            <span className="sb-item__idx sb-item__idx--icon">
              <Icon name="home" size={14} />
            </span>
            <span className="sb-item__body">
              <span className="sb-item__name">项目总览</span>
              <span className="sb-item__hint">健康度 · 里程碑 · 风险</span>
            </span>
          </NavLink>
        </div>

        {/* 各阶段分组 */}
        {groups.map((g) => {
          const items = stageNav.filter((s) => s.group === g);
          const doneCount = items.filter((s) => s.status === 'done').length;
          return (
            <div className="sb-group" key={g}>
              <div className="sb-group__head">
                <span className="sb-group__label">{g}</span>
                <span className="sb-group__count">{doneCount}/{items.length}</span>
              </div>
              <div className="sb-group__items">
                {items.map((s) => (
                  <NavLink
                    key={s.key}
                    to={s.path}
                    className={({ isActive }) =>
                      `sb-item is-${s.status}${isActive ? ' is-active' : ''}`
                    }
                    title={tip(`${String(s.index).padStart(2, '0')} ${s.name}`, s.hint)}
                  >
                    <span className="sb-item__idx" aria-hidden="true">
                      {/* 折叠态下方块较窄且无文字兜底，一律用图标；展开态用序号便于对照阶段顺序 */}
                      {collapsed ? (
                        <Icon name={s.icon} size={15} />
                      ) : (
                        <span className="sb-item__num">{String(s.index).padStart(2, '0')}</span>
                      )}
                    </span>

                    <span className="sb-item__body">
                      <span className="sb-item__name">{s.name}</span>
                      <span className="sb-item__hint">{s.hint}</span>
                    </span>

                    <span className="sb-item__tail" aria-hidden="true">
                      {s.status === 'done' && <Icon name="check" size={11} strokeWidth={3} />}
                      {s.status === 'active' && <span className="sb-item__dot sb-item__dot--active" />}
                      {s.status === 'blocked' && <span className="sb-item__dot sb-item__dot--blocked" />}
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}

        {/* 治理 */}
        <div className="sb-group">
          <div className="sb-group__head">
            <span className="sb-group__label">治理</span>
          </div>
          <div className="sb-group__items">
            <NavLink
              to="/risks"
              className={({ isActive }) => `sb-item${isActive ? ' is-active' : ''}`}
              title={tip('风险与变更', '风险台账 · 变更请求')}
            >
              <span className="sb-item__idx sb-item__idx--icon">
                <Icon name="alert" size={14} />
              </span>
              <span className="sb-item__body">
                <span className="sb-item__name">风险与变更</span>
                <span className="sb-item__hint">
                  {trackingRisks} 项跟踪 · {project.changeRequests.length} 变更
                </span>
              </span>
              <span className="sb-item__tail" aria-hidden="true">
                <span className="sb-item__badge">{defects.filter((d) => d.priority === 'P0' && d.status !== '已关闭').length}</span>
              </span>
            </NavLink>
          </div>
        </div>
      </nav>

      {/* ---------- 底部 ---------- */}
      <div className="sb-foot">
        <div className="sb-foot__label">
          <span>团队 {project.team.length} 人</span>
          <span className="t-tertiary">任务 {stats.devDone}/{stats.devDone + stats.devInProgress + stats.devBlocked}</span>
        </div>
        <div className="sb-foot__row" title={tip(project.owner, '项目负责人')}>
          <span className="avatar avatar--brand">{project.owner.slice(0, 1)}</span>
          <div className="sb-foot__info">
            <div className="sb-foot__name">{project.owner}</div>
            <div className="sb-foot__role">项目负责人</div>
          </div>
          <Icon name="settings" size={14} />
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
