/* 赛点青重构基准：赛事编辑部 × 现场记分板；固定阵容、本地优先、移动端优先于装饰。 */
(() => {
  const STORAGE_KEY = "sai-dian-qing-pickleball-v3";
  const INITIAL_PLAYERS = [
    { id: "p1", name: "鹏哥", gender: "男", tile: "tile-0" },
    { id: "p2", name: "亮哥", gender: "男", tile: "tile-1" },
    { id: "p3", name: "睿哥", gender: "男", tile: "tile-2" },
    { id: "p4", name: "琳姐", gender: "女", tile: "tile-3" },
    { id: "p5", name: "寒姐", gender: "女", tile: "tile-4" },
    { id: "p6", name: "忱姐", gender: "女", tile: "tile-5" },
  ];
  const VIEWS = [["home", "首页"], ["roster", "阵容"], ["schedule", "赛程"], ["scores", "录分"], ["stats", "榜单"], ["podium", "颁奖"]];
  const app = document.getElementById("app");
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[ch]);
  const clonePlayers = () => INITIAL_PLAYERS.map((player) => ({ ...player }));
  const freshState = () => ({ title: "团队匹克球循环赛", players: clonePlayers(), scores: {}, activeView: "home", selectedMatchId: null });
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...freshState(), scores: saved?.scores && typeof saved.scores === "object" ? saved.scores : {} };
    } catch { return freshState(); }
  }
  let state = loadState();
  const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify({ scores: state.scores }));

  function buildRounds(players) {
    const rotation = players.map((player) => player.id);
    const rounds = [];
    for (let round = 0; round < rotation.length - 1; round += 1) {
      const matches = [];
      for (let i = 0; i < rotation.length / 2; i += 1) matches.push({ id: `r${round + 1}-m${i + 1}`, round: round + 1, a: rotation[i], b: rotation[rotation.length - 1 - i] });
      rounds.push({ number: round + 1, matches });
      rotation.splice(1, 0, rotation.pop());
    }
    return rounds;
  }
  const getMatches = () => buildRounds(state.players).flatMap((round) => round.matches);
  const playerById = (id) => state.players.find((player) => player.id === id);
  const result = (match) => state.scores[match.id] || null;
  const isFinished = (match) => { const score = result(match); return Boolean(score && Number.isInteger(score.a) && Number.isInteger(score.b)); };
  const matchScore = (match) => { const score = result(match); return score ? `${score.a} : ${score.b}` : "待开赛"; };
  const finishedCount = () => getMatches().filter(isFinished).length;
  const nextMatch = () => getMatches().find((match) => !isFinished(match)) || getMatches()[0];
  const selectedMatch = () => getMatches().find((match) => match.id === state.selectedMatchId) || nextMatch();
  const completedPercent = () => Math.round((finishedCount() / 15) * 100);

  function calculateStats() {
    const table = Object.fromEntries(state.players.map((player) => [player.id, { ...player, played: 0, wins: 0, losses: 0, points: 0, pf: 0, pa: 0, diff: 0 }]));
    getMatches().forEach((match) => {
      const score = result(match); if (!score) return;
      const a = table[match.a]; const b = table[match.b];
      a.played += 1; b.played += 1; a.pf += score.a; a.pa += score.b; b.pf += score.b; b.pa += score.a;
      if (score.a > score.b) { a.wins += 1; b.losses += 1; } else { b.wins += 1; a.losses += 1; }
    });
    return Object.values(table).map((row) => ({ ...row, points: row.wins, diff: row.pf - row.pa })).sort((a, b) => b.points - a.points || b.diff - a.diff || b.pf - a.pf || state.players.findIndex((player) => player.id === a.id) - state.players.findIndex((player) => player.id === b.id));
  }
  const leader = () => calculateStats()[0];
  const progressFor = (id) => calculateStats().find((row) => row.id === id)?.wins || 0;
  const isValidScore = (a, b) => Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a !== b && Math.max(a, b) >= 11 && Math.abs(a - b) >= 2;

  function avatar(player, extra = "") {
    return `<span class="avatar ${esc(player.tile)} ${extra}" role="img" aria-label="${esc(player.name)}的像素风头像"><span class="avatar-image" aria-hidden="true"></span></span>`;
  }
  function personLine(player, extra = "") { return `<span class="person-line ${extra}">${avatar(player, "avatar--small")}<b>${esc(player.name)}</b></span>`; }
  function statText(row) { return `${row.points} 积分 · ${row.diff >= 0 ? "+" : ""}${row.diff} 净胜分`; }
  function nav() {
    return `<header class="topbar"><button class="brand" data-view="home" aria-label="返回赛事首页"><span class="brand-block">赛</span><span><strong>赛点青</strong><small>PICKLEBALL LEAGUE</small></span></button><nav class="desktop-nav" aria-label="赛事导航">${VIEWS.map(([view, label]) => `<button data-view="${view}" class="nav-link ${state.activeView === view ? "is-active" : ""}">${label}</button>`).join("")}</nav><div class="header-progress"><span class="progress-mark"></span><b>${finishedCount()}</b><span>/ 15 已记分</span></div></header>`;
  }
  function mobileNav() {
    const items = [["home", "首页", "⌂"], ["schedule", "赛程", "◎"], ["scores", "录分", "＋"], ["stats", "榜单", "≡"]];
    return `<nav class="mobile-nav" aria-label="移动端赛事导航">${items.map(([view, label, mark]) => `<button data-view="${view}" class="mobile-nav-link ${state.activeView === view ? "is-active" : ""}"><span>${mark}</span>${label}</button>`).join("")}</nav>`;
  }
  function footer() { return `<footer class="footer"><span>赛点青 · 本地优先赛事记录</span><span>所有比分仅保存在当前浏览器</span></footer>`; }
  function ruleBand() {
    const rules = [["单循环", "6 人、15 场、每人 5 场"], ["11 分制", "胜方至少 11 分，领先 2 分"], ["胜场积分", "胜 1 分，负 0 分"], ["即时排序", "积分 → 净胜分 → 总得分"]];
    return `<section class="rules-band" aria-labelledby="rule-heading"><div class="section-heading"><h2 id="rule-heading">记分规则</h2><p>录入、排名与颁奖严格采用同一套规则。</p></div><div class="rule-list">${rules.map(([name, desc]) => `<article><h3>${name}</h3><p>${desc}</p></article>`).join("")}</div></section>`;
  }
  function homeView() {
    const active = nextMatch(); const a = playerById(active.a); const b = playerById(active.b); const first = leader();
    return `<main class="page home-page"><section class="home-hero"><div class="hero-copy"><span class="hero-kicker">TEAM OFFSITE · ROUND ROBIN</span><h1>六人开球。<br />一局定名。</h1><p>把下一场、每一分和最终冠军，放在同一块清楚的赛事控制台里。</p><div class="hero-actions"><button class="button button--primary" data-view="scores">录入下一场</button><button class="button button--quiet" data-view="schedule">查看 15 场赛程</button></div><div class="hero-footnote"><span>当前进度 <b>${finishedCount()}/15</b></span><span>当前榜首 <b>${esc(first.name)}</b></span></div></div><aside class="next-ticket"><div class="ticket-top"><span>下一场</span><b>第 ${active.round} 轮</b></div><div class="ticket-match">${personLine(a)}<span class="ticket-vs">VS</span>${personLine(b, "person-line--right")}</div><div class="ticket-bottom"><span>现场录分 · 11 分制</span><button data-view="scores" data-match="${active.id}" aria-label="录入${esc(a.name)}对${esc(b.name)}的比分">开始记分 →</button></div></aside></section><section class="score-ribbon" aria-label="赛事概览"><div><span>赛事规模</span><b>06 人</b></div><div><span>循环对局</span><b>15 场</b></div><div><span>完成进度</span><b>${String(finishedCount()).padStart(2, "0")} / 15</b></div><div><span>实时领跑</span><b>${esc(first.name)}</b></div></section>${ruleBand()}<section class="home-layout"><section class="roster-section"><div class="section-heading section-heading--inline"><div><h2>固定参赛阵容</h2><p>3 男 3 女，名单锁定，赛程已自动生成。</p></div><button class="text-button" data-view="roster">阵容详情 →</button></div><div class="roster-grid">${state.players.map((player, index) => `<article class="roster-person"><span class="roster-order">${String(index + 1).padStart(2, "0")}</span>${avatar(player, "avatar--roster")}<div><h3>${esc(player.name)}</h3><p>${esc(player.gender)}子组选手 · ${progressFor(player.id)} 胜</p></div></article>`).join("")}</div></section><section class="sidebar-report"><div class="section-heading"><h2>即时榜单</h2><p>同分优先比较净胜分。</p></div><div class="leader-list">${calculateStats().slice(0, 4).map((row, index) => `<div class="leader-row"><span>${String(index + 1).padStart(2, "0")}</span>${personLine(row)}<b>${row.points}P</b></div>`).join("")}</div><button class="button button--black" data-view="stats">查看完整排名</button></section></section>${footer()}</main>`;
  }
  function rosterView() {
    return `<main class="page"><section class="page-intro"><div><h1>固定阵容，直接开赛。</h1><p>本届为 3 男、3 女的六人单打循环赛。名单不在现场修改，重置操作只清除已录入比分。</p></div><span class="intro-tag">名单已锁定</span></section><section class="roster-board">${state.players.map((player, index) => `<article class="roster-profile"><div class="profile-head"><span>${String(index + 1).padStart(2, "0")}</span><b>${esc(player.gender)}子组</b></div>${avatar(player, "avatar--profile")}<h2>${esc(player.name)}</h2><p>已参与 ${calculateStats().find((row) => row.id === player.id)?.played || 0} / 5 场 · ${progressFor(player.id)} 胜</p></article>`).join("")}</section><section class="reset-line"><p>比分数据仅保存在此浏览器内。</p><button class="text-button text-button--danger" id="reset-roster">清空全部比分</button></section>${footer()}</main>`;
  }
  function scheduleView() {
    const rounds = buildRounds(state.players);
    return `<main class="page"><section class="page-intro"><div><h1>五轮赛程，十五场对局。</h1><p>每位选手与其余五人各交手一次。点击任意对局即可前往录分。</p></div><span class="intro-tag">${finishedCount()} / 15 已完成</span></section><section class="schedule-board">${rounds.map((round) => `<article class="round-sheet"><header><h2>第 ${round.number} 轮</h2><span>${round.matches.filter(isFinished).length} / 3 已结束</span></header><div class="round-matches">${round.matches.map((match) => { const a = playerById(match.a); const b = playerById(match.b); const done = isFinished(match); return `<button class="match-slip ${done ? "is-done" : ""}" data-view="scores" data-match="${match.id}"><span>对局 ${match.id.split("m")[1]}</span><strong>${esc(a.name)} <i>${done ? matchScore(match) : "VS"}</i> ${esc(b.name)}</strong><em>${done ? "查看 / 修改" : "录入比分 →"}</em></button>`; }).join("")}</div></article>`).join("")}</section>${footer()}</main>`;
  }
  function matchPicker(active) {
    return `<div class="match-picker">${buildRounds(state.players).flatMap((round) => round.matches).map((match) => { const a = playerById(match.a); const b = playerById(match.b); return `<button class="picker-item ${match.id === active.id ? "is-selected" : ""}" data-match="${match.id}"><span>第 ${match.round} 轮 · ${esc(a.name)} vs ${esc(b.name)}</span><b>${isFinished(match) ? matchScore(match) : "待录入"}</b></button>`; }).join("")}</div>`;
  }
  function scoresView() {
    const match = selectedMatch(); const a = playerById(match.a); const b = playerById(match.b); const score = result(match) || { a: "", b: "" };
    return `<main class="page score-page"><section class="page-intro"><div><h1>记下比分，排名立即更新。</h1><p>只接受可判定胜负的终局比分。获胜方至少 11 分，并必须领先 2 分。</p></div><span class="intro-tag">${finishedCount()} / 15 已完成</span></section><section class="scoring-layout"><aside class="match-drawer"><div class="drawer-heading"><h2>选择对局</h2><span>15 场</span></div>${matchPicker(match)}</aside><section class="score-sheet"><header><span>第 ${match.round} 轮 · 对局 ${match.id.split("m")[1]}</span><b>${isFinished(match) ? "当前赛果可覆盖" : "等待赛果"}</b></header><form id="score-form"><div class="score-players"><div class="scorer">${avatar(a, "avatar--scorer")}<h2>${esc(a.name)}</h2><p>${esc(a.gender)}子组选手</p><label for="score-a">最终得分</label><input id="score-a" type="number" min="0" max="99" inputmode="numeric" value="${esc(score.a)}" /></div><span class="score-colon">:</span><div class="scorer">${avatar(b, "avatar--scorer")}<h2>${esc(b.name)}</h2><p>${esc(b.gender)}子组选手</p><label for="score-b">最终得分</label><input id="score-b" type="number" min="0" max="99" inputmode="numeric" value="${esc(score.b)}" /></div></div><p class="score-feedback" id="score-feedback">${isFinished(match) ? `当前记录：${esc(a.name)} ${score.a} : ${score.b} ${esc(b.name)}。` : "请输入双方的最终得分。"}</p><div class="score-actions"><button type="button" class="button button--quiet" id="clear-score">清除本场</button><button type="submit" class="button button--primary">保存赛果</button></div></form></section></section>${footer()}</main>`;
  }
  function statsView() {
    const rows = calculateStats();
    return `<main class="page"><section class="page-intro"><div><h1>积分榜不会忘记每一分。</h1><p>排名顺序为积分、净胜分、总得分、固定报名顺序。每一次保存都会实时重新计算。</p></div><span class="intro-tag">实时排名</span></section><section class="standings" role="table" aria-label="循环赛积分榜"><div class="standing-head" role="row"><span>名次</span><span>选手</span><span>场次</span><span>积分</span><span>胜</span><span>负</span><span>得分</span><span>失分</span><span>净胜</span></div>${rows.map((row, index) => `<div class="standing-row ${index < 2 ? "is-leading" : ""}" role="row"><span class="standing-rank">${String(index + 1).padStart(2, "0")}</span><span class="standing-person">${avatar(row, "avatar--table")}<span><b>${esc(row.name)}</b><small>${esc(row.gender)}子组</small></span></span><span class="stat-optional">${row.played}</span><strong>${row.points}</strong><span class="stat-optional">${row.wins}</span><span class="stat-optional">${row.losses}</span><span class="stat-optional">${row.pf}</span><span class="stat-optional">${row.pa}</span><b>${row.diff >= 0 ? "+" : ""}${row.diff}</b></div>`).join("")}</section><section class="ranking-note"><h2>排名如何产生？</h2><p>胜一场记 1 积分，负一场记 0 积分。积分相同依次比较净胜分、总得分和固定报名顺序。全部 15 场录入后，前两名进入最终颁奖页。</p><div class="season-progress"><span>赛季完成度</span><i><b style="width:${completedPercent()}%"></b></i><strong>${completedPercent()}%</strong></div></section>${footer()}</main>`;
  }
  function podiumPlace(row, rank, label) { return `<article class="podium-place podium-place--${rank}">${avatar(row, "avatar--podium")}<span>${label}</span><h2>${esc(row.name)}</h2><p>${statText(row)}</p></article>`; }
  function podiumView() {
    const table = calculateStats(); const complete = finishedCount() === 15;
    return `<main class="page"><section class="page-intro"><div><h1>${complete ? "最后一分落地，名次定格。" : "终局尚未抵达。"}</h1><p>${complete ? "全部 15 场赛果已经确认，最终名次按积分榜规则生成。" : `还剩 ${15 - finishedCount()} 场需要记录。全部录入后，冠军与亚军将在这里揭晓。`}</p></div><span class="intro-tag ${complete ? "intro-tag--done" : ""}">${complete ? "赛季已完赛" : "等待终局"}</span></section>${complete ? `<section class="podium-board">${podiumPlace(table[1], "second", "亚军")}${podiumPlace(table[0], "first", "冠军")}${podiumPlace(table[2], "third", "季军")}</section>` : `<section class="podium-pending"><b>${finishedCount()} / 15</b><span>终局前，所有排名都是实时名次。</span><button class="button button--black" data-view="scores">继续录分</button></section>`}${footer()}</main>`;
  }
  function render() {
    const views = { home: homeView, roster: rosterView, schedule: scheduleView, scores: scoresView, stats: statsView, podium: podiumView };
    app.innerHTML = nav() + (views[state.activeView] || homeView)() + mobileNav();
    bindEvents();
  }
  function showFeedback(text, isError = false) {
    const feedback = document.getElementById("score-feedback"); const inputs = [document.getElementById("score-a"), document.getElementById("score-b")];
    if (feedback) feedback.textContent = text;
    inputs.filter(Boolean).forEach((input) => input.classList.toggle("is-invalid", isError));
  }
  function bindEvents() {
    app.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.match) state.selectedMatchId = button.dataset.match;
      state.activeView = button.dataset.view; render(); window.scrollTo({ top: 0, behavior: "smooth" });
    }));
    app.querySelectorAll("[data-match]:not([data-view])").forEach((button) => button.addEventListener("click", () => { state.selectedMatchId = button.dataset.match; render(); }));
    const reset = document.getElementById("reset-roster");
    if (reset) reset.addEventListener("click", () => { if (confirm("确认清空全部 15 场的已录入比分？固定参赛名单不会改变。")) { state = freshState(); saveState(); render(); } });
    const scoreForm = document.getElementById("score-form");
    if (scoreForm) scoreForm.addEventListener("submit", (event) => {
      event.preventDefault(); const a = Number(document.getElementById("score-a").value); const b = Number(document.getElementById("score-b").value);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return showFeedback("请输入两个不小于 0 的整数得分。", true);
      if (a === b) return showFeedback("循环赛必须分出胜负，双方得分不能相同。", true);
      if (Math.max(a, b) < 11) return showFeedback("获胜方至少需要得到 11 分。", true);
      if (Math.abs(a - b) < 2) return showFeedback("获胜方需至少领先对手 2 分。", true);
      const match = selectedMatch(); state.scores[match.id] = { a, b }; saveState(); state.selectedMatchId = getMatches().find((item) => !isFinished(item))?.id || match.id; showFeedback("赛果已保存，积分榜与赛事进度已同步更新。"); setTimeout(render, 340);
    });
    const clear = document.getElementById("clear-score");
    if (clear) clear.addEventListener("click", () => { const match = selectedMatch(); if (result(match) && confirm("确认清除本场比分？")) { delete state.scores[match.id]; saveState(); render(); } });
  }
  render();
})();
