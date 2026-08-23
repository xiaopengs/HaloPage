/* 赛点青交互基准：本地优先的六人循环赛记录，不依赖后端；视觉沿用暗青玻璃拟态人物展示。 */
(() => {
  const STORAGE_KEY = "sai-dian-qing-pickleball-v2";
  const INITIAL_PLAYERS = [
    { id: "p1", name: "鹏哥", gender: "男", avatar: "/manus-storage/peng-ge-pixel-avatar_c9b2fd59.png" },
    { id: "p2", name: "亮哥", gender: "男", pixel: "liang" },
    { id: "p3", name: "睿哥", gender: "男", pixel: "rui" },
    { id: "p4", name: "琳姐", gender: "女", pixel: "lin" },
    { id: "p5", name: "寒姐", gender: "女", pixel: "han" },
    { id: "p6", name: "忱姐", gender: "女", pixel: "chen" },
  ];

  const app = document.getElementById("app");
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[ch]);
  const initials = (name) => (name || "选手").trim().slice(-2).toUpperCase();
  const cloneInitial = () => INITIAL_PLAYERS.map((player) => ({ ...player }));

  function freshState() {
    return { title: "团队匹克球循环赛", players: cloneInitial(), scores: {}, activeView: "home", selectedMatchId: null };
  }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.players) || saved.players.length !== 6) return freshState();
      return { ...freshState(), ...saved, activeView: "home" };
    } catch { return freshState(); }
  }
  let state = loadState();
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: state.title, players: state.players, scores: state.scores }));
  }

  function buildRounds(players) {
    const rotation = players.map((player) => player.id);
    const rounds = [];
    for (let round = 0; round < rotation.length - 1; round += 1) {
      const matches = [];
      for (let i = 0; i < rotation.length / 2; i += 1) {
        matches.push({ id: `r${round + 1}-m${i + 1}`, round: round + 1, a: rotation[i], b: rotation[rotation.length - 1 - i] });
      }
      rounds.push({ number: round + 1, matches });
      rotation.splice(1, 0, rotation.pop());
    }
    return rounds;
  }
  function getMatches() { return buildRounds(state.players).flatMap((round) => round.matches); }
  function playerById(id) { return state.players.find((player) => player.id === id); }
  function result(match) { return state.scores[match.id] || null; }
  function isFinished(match) { const score = result(match); return score && Number.isInteger(score.a) && Number.isInteger(score.b); }
  function calculateStats() {
    const table = Object.fromEntries(state.players.map((player) => [player.id, { ...player, played: 0, wins: 0, losses: 0, pf: 0, pa: 0, diff: 0 }]));
    getMatches().forEach((match) => {
      const score = result(match);
      if (!score) return;
      const a = table[match.a]; const b = table[match.b];
      a.played += 1; b.played += 1; a.pf += score.a; a.pa += score.b; b.pf += score.b; b.pa += score.a;
      if (score.a > score.b) a.wins += 1; else b.wins += 1;
      if (score.a > score.b) b.losses += 1; else a.losses += 1;
    });
    return Object.values(table).map((row) => ({ ...row, diff: row.pf - row.pa, points: row.wins })).sort((a, b) => b.points - a.points || b.diff - a.diff || b.pf - a.pf || state.players.findIndex((player) => player.id === a.id) - state.players.findIndex((player) => player.id === b.id));
  }
  function finishedCount() { return getMatches().filter(isFinished).length; }
  function nextMatch() { return getMatches().find((match) => !isFinished(match)) || getMatches()[0]; }
  function selectedMatch() { return getMatches().find((match) => match.id === state.selectedMatchId) || nextMatch(); }
  function rankProgress(player) { const row = calculateStats().find((item) => item.id === player.id); return Math.min(5, row?.wins || 0); }
  function matchScore(match) { const score = result(match); return score ? `${score.a} : ${score.b}` : "待记录"; }
  function statusText() { const done = finishedCount(); return done === 15 ? "赛事完成" : `已录入 ${done}/15`; }

  function topbar() {
    const items = [["home", "赛事首页"], ["roster", "球员"], ["schedule", "赛程"], ["scores", "录分"], ["stats", "榜单"], ["podium", "颁奖"]];
    return `<header class="topbar"><button class="brand" data-view="home" aria-label="返回赛事首页"><span class="brand-mark"><img src="/manus-storage/pickleball-mark_b2341d7f.png" alt="赛点青品牌标志" /></span><span class="brand-copy"><small>SAI DIAN QING</small><strong>赛点青</strong></span></button><nav class="nav" aria-label="赛事导航">${items.map(([view, label]) => `<button class="nav-btn ${state.activeView === view ? "is-active" : ""}" data-view="${view}">${label}</button>`).join("")}</nav><div class="top-status"><i class="status-dot"></i>${statusText()}</div></header>`;
  }
  function metrics() {
    const table = calculateStats(); const leader = table[0];
    return `<div class="summary-row"><div class="metric"><span>参赛选手</span><strong>06</strong></div><div class="metric"><span>循环对局</span><strong>15</strong></div><div class="metric"><span>已完成</span><strong class="mint">${String(finishedCount()).padStart(2, "0")}</strong></div><div class="metric"><span>当前榜首</span><strong class="gold">${esc(leader?.name || "—")}</strong></div></div>`;
  }
  function avatar(player, cls = "") { return `<span class="avatar ${cls} ${player.pixel ? `pixel-avatar ${player.pixel}` : ""}" aria-label="${esc(player.name)}像素头像">${player.avatar ? `<img src="${esc(player.avatar)}" alt="${esc(player.name)}像素风头像" />` : `<span class="pixel-glyph">${esc(initials(player.name))}</span>`}</span>`; }
  function miniAvatar(player) { return `<span class="mini-avatar ${player.pixel ? `mini-pixel ${player.pixel}` : ""}" aria-label="${esc(player.name)}像素头像">${player.avatar ? `<img src="${esc(player.avatar)}" alt="" />` : `<span>${esc(initials(player.name))}</span>`}</span>`; }
  function playerRail() {
    return `<div class="player-rail">${state.players.map((player, index) => `<article class="player-card"><div class="player-top"><span class="player-index">PLAYER 0${index + 1}</span><span class="gender-tag">${esc(player.gender)}子组</span></div>${avatar(player)}<h3 class="player-name">${esc(player.name)}</h3><p class="player-meta">${rankProgress(player)} 胜 · 循环赛选手</p><div class="player-bar" aria-label="${rankProgress(player)} 胜"><i class="on"></i><i class="${rankProgress(player) > 1 ? "on" : ""}"></i><i class="${rankProgress(player) > 2 ? "on" : ""}"></i><i class="${rankProgress(player) > 3 ? "on" : ""}"></i><i class="${rankProgress(player) > 4 ? "on" : ""}"></i></div></article>`).join("")}</div>`;
  }
  function miniStandings() {
    return `<div class="mini-standings">${calculateStats().slice(0, 5).map((row, index) => `<div class="mini-standing"><span class="rank-num">0${index + 1}</span>${miniAvatar(row)}<span><b>${esc(row.name)}</b><small>${row.played} 场 · ${row.diff >= 0 ? "+" : ""}${row.diff} 分差</small></span><em>${row.points}P</em></div>`).join("")}</div>`;
  }
  function quickMatches() {
    const list = getMatches().filter(isFinished).slice(-4).reverse();
    if (!list.length) return `<div class="empty">还没有赛果。<br />从第一场开始，录下每一次对决。</div>`;
    return `<div class="match-rows">${list.map((match, index) => { const a = playerById(match.a); const b = playerById(match.b); return `<div class="match-row"><span class="rank-num">R${match.round}</span><strong>${esc(a.name)}</strong><span class="vs">VS</span><strong class="right-name">${esc(b.name)}</strong><span class="score">${matchScore(match)}</span></div>`; }).join("")}</div>`;
  }
  function homeView() {
    const leader = calculateStats()[0];
    return `<main class="page"><section class="hero"><div class="hero-copy"><p class="eyebrow">ROUND ROBIN · 06 PLAYERS</p><h1>${esc(state.title).replace("循环赛", "<em>循环赛</em>")}</h1><p class="hero-desc">六位队友、十五场对决。录下每一分，让赛事进度、积分排名和最终荣誉都保持清楚。</p><div class="hero-actions"><button class="action-btn" data-view="scores">录入本场比分</button><button class="ghost-btn" data-view="schedule">查看完整赛程</button></div></div><div class="hero-signal"><aside class="signal-card"><div class="signal-top"><span>LEADER SIGNAL</span><span class="live-pill">LIVE</span></div><div class="signal-name">${esc(leader?.name || "等待开赛")}</div><div class="signal-sub">${leader?.played ? `${leader.points} 积分 / ${leader.played} 场 · 净胜 ${leader.diff >= 0 ? "+" : ""}${leader.diff}` : "首场比分将决定首个榜首"}</div><div class="signal-rank"><b>#01</b><span>${finishedCount()} / 15 MATCHES</span></div></aside></div></section>${metrics()}<section class="rule-strip" aria-label="积分规则说明"><article><span>01</span><h3>单打循环</h3><p>6 位固定选手，每两人交手一次，共 15 场。</p></article><article><span>02</span><h3>11 分制</h3><p>胜方至少 11 分，且须领先对手 2 分，禁止平局。</p></article><article><span>03</span><h3>胜场积分</h3><p>每胜 1 积分、每负 0 积分；得失分同步累计。</p></article><article><span>04</span><h3>排名顺序</h3><p>积分 → 净胜分 → 总得分 → 固定报名顺序。</p></article></section><section class="content-block"><div class="title-row"><div><p class="eyebrow">PLAYERS / FIXED ROSTER</p><h2 class="section-title">六位选手，正在集结。</h2></div><button class="ghost-btn" data-view="roster">查看固定阵容</button></div>${playerRail()}</section><section class="content-block split-grid"><article class="panel"><div class="panel-heading"><h3>最近赛果</h3><span>LAST RESULTS</span></div>${quickMatches()}</article><aside class="panel"><div class="panel-heading"><h3>即时积分</h3><span>TOP 5</span></div>${miniStandings()}</aside></section>${footer()}</main>`;
  }
  function rosterView() {
    const maleCount = state.players.filter((player) => player.gender === "男").length;
    const valid = maleCount === 3 && state.players.every((player) => player.name.trim());
    return `<main class="page"><section class="view-head"><div><p class="eyebrow">PLAYERS / FIXED ROSTER</p><h1 class="section-title">本届固定参赛阵容。</h1><p class="section-lede">本届为 3 男、3 女的六人单打循环赛。名单固定，点击下方即可查看自动生成的完整赛程。</p></div><p class="form-note ${valid ? "good" : "error"}">${valid ? "名单已锁定：3 男 / 3 女" : `当前名单：${maleCount} 男 / ${6 - maleCount} 女`}</p></section><section class="panel"><div class="roster-form">${state.players.map((player, index) => `<article class="player-form fixed-player">${avatar(player)}<div><span class="input-label">选手 0${index + 1}</span><strong>${esc(player.name)}</strong></div><div><span class="input-label">组别</span><b>${esc(player.gender)}选手</b></div></article>`).join("")}</div><div class="form-actions"><button type="button" class="plain-link" id="reset-roster">重置全部比分</button><button class="action-btn" data-view="schedule">查看完整赛程</button></div></section>${footer()}</main>`;
  }
  function scheduleView() {
    const rounds = buildRounds(state.players);
    return `<main class="page"><section class="view-head"><div><p class="eyebrow">MATCHES / DRAW</p><h1 class="section-title">十五场，对每一场都负责。</h1><p class="section-lede">六人单循环共五轮、每轮三场。点击任意对局可直接进入比分登记。</p></div><p class="form-note">积分优先；同积分按净胜分、总得分、固定报名顺序排序。</p></section><section class="round-list">${rounds.map((round) => { const completed = round.matches.filter(isFinished).length; return `<article class="round-card"><div class="round-card-head"><h3>第 ${round.number} 轮</h3><span>${completed}/3 COMPLETED</span></div><div class="schedule-grid">${round.matches.map((match) => { const a = playerById(match.a); const b = playerById(match.b); const done = isFinished(match); return `<button class="schedule-match" data-match="${match.id}" data-view="scores"><span class="schedule-player">${esc(a.name)}</span><span class="schedule-score ${done ? "" : "pending"}">${done ? matchScore(match) : "VS"}</span><span class="schedule-player right">${esc(b.name)}</span></button>`; }).join("")}</div></article>`; }).join("")}</section>${footer()}</main>`;
  }
  function scoresView() {
    const match = selectedMatch(); if (!match) return homeView();
    const a = playerById(match.a); const b = playerById(match.b); const score = result(match) || { a: "", b: "" };
    return `<main class="page"><section class="view-head"><div><p class="eyebrow">SCORING / LIVE ENTRY</p><h1 class="section-title">录下这一局，榜单立刻重排。</h1><p class="section-lede">输入双方最终得分。胜方至少 11 分且领先 2 分；保存后，赛程、积分和领奖台将即时同步。</p></div><p class="form-note">11 分制，胜方至少 11 分且须领先 2 分。</p></section><section class="record-grid"><aside class="panel"><div class="panel-heading"><h3>选择对局</h3><span>${finishedCount()}/15</span></div><div class="match-picker">${buildRounds(state.players).flatMap((round) => round.matches).map((item) => { const left = playerById(item.a); const right = playerById(item.b); return `<button class="picker-item ${item.id === match.id ? "is-selected" : ""}" data-match="${item.id}"><span><small>R${item.round}</small><br /><b>${esc(left.name)} · ${esc(right.name)}</b></span><small>${isFinished(item) ? matchScore(item) : "待录入"}</small></button>`; }).join("")}</div></aside><section class="panel score-card"><div class="score-match-meta"><span>ROUND ${match.round} · MATCH ${match.id.split("m")[1]}</span><i>${isFinished(match) ? "可覆盖修改" : "等待赛果"}</i></div><form id="score-form"><div class="score-board"><div class="score-player">${avatar(a)}<h3>${esc(a.name)}</h3><p>${esc(a.gender)}子组选手</p><label class="input-label" for="score-a" style="margin-top:18px">最终得分</label><input id="score-a" class="score-input" inputmode="numeric" type="number" min="0" max="99" value="${esc(score.a)}" /></div><div class="score-separator">:</div><div class="score-player">${avatar(b)}<h3>${esc(b.name)}</h3><p>${esc(b.gender)}子组选手</p><label class="input-label" for="score-b" style="margin-top:18px">最终得分</label><input id="score-b" class="score-input" inputmode="numeric" type="number" min="0" max="99" value="${esc(score.b)}" /></div></div><p class="score-hint" id="score-feedback">${isFinished(match) ? `当前记录：${esc(a.name)} ${score.a} : ${score.b} ${esc(b.name)}。` : "请输入两位选手的最终得分。"}</p><div class="score-actions"><button type="button" class="ghost-btn" id="clear-score">清除本场</button><button class="score-save" type="submit">保存赛果</button></div></form></section></section>${footer()}</main>`;
  }
  function statsView() {
    const rows = calculateStats();
    return `<main class="page"><section class="view-head"><div><p class="eyebrow">STANDINGS / LIVE TABLE</p><h1 class="section-title">每一分，都在改变顺位。</h1><p class="section-lede">排名依次按照积分、净胜分、总得分与固定报名顺序计算。赛季未结束时，榜单为实时排名。</p></div><p class="form-note">已完成 ${finishedCount()} / 15 场对局。</p></section><section class="table-wrap"><table class="score-table"><thead><tr><th>排名</th><th>选手</th><th>场次</th><th>积分</th><th>胜</th><th>负</th><th>得分</th><th>失分</th><th>净胜分</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td><span class="rank-medal ${index === 0 ? "top" : index === 1 ? "second" : ""}">${String(index + 1).padStart(2, "0")}</span></td><td><span class="table-player">${miniAvatar(row)}<span><b>${esc(row.name)}</b><small>${esc(row.gender)}子组</small></span></span></td><td>${row.played}</td><td class="wins">${row.points}</td><td>${row.wins}</td><td>${row.losses}</td><td>${row.pf}</td><td>${row.pa}</td><td>${row.diff >= 0 ? "+" : ""}${row.diff}</td></tr>`).join("")}</tbody></table></section><section class="content-block split-grid"><article class="panel"><div class="panel-heading"><h3>排名说明</h3><span>RULES</span></div><p class="section-lede" style="margin-top:0">胜一场记 1 积分、负一场记 0 积分。积分相同时，比较净胜分、总得分，仍相同则以固定报名顺序排列。全部赛果录入后，前两名进入最终颁奖页。</p></article><article class="panel"><div class="panel-heading"><h3>赛季进度</h3><span>${Math.round(finishedCount() / 15 * 100)}%</span></div><div class="player-bar" style="margin-top:21px"><i class="on" style="flex:${Math.max(1, finishedCount())}"></i><i style="flex:${Math.max(1, 15 - finishedCount())}"></i></div><p class="section-lede" style="margin-top:18px">还剩 ${15 - finishedCount()} 场。保持公平记录，让每一次逆转都能被看见。</p></article></section>${footer()}</main>`;
  }
  function podiumSlot(player, rank, label) {
    if (!player) return "";
    return `<article class="podium-place ${rank}">${avatar(player)}<span class="place-label">${label}</span><h3>${esc(player.name)}</h3><p>${player.wins} 胜 · 净胜 ${player.diff >= 0 ? "+" : ""}${player.diff}</p><div class="podium-base">${rank === "first" ? "CHAMPION" : rank === "second" ? "RUNNER-UP" : "THIRD PLACE"}</div></article>`;
  }
  function podiumView() {
    const table = calculateStats(); const complete = finishedCount() === 15;
    return `<main class="page"><section class="view-head"><div><p class="eyebrow">HONOURS / FINAL CEREMONY</p><h1 class="section-title">${complete ? "冠军与亚军，荣耀落位。" : "冠军还在等待最后一分。"}</h1><p class="section-lede">${complete ? "所有对局均已录入，依据循环赛积分榜生成本届最终名次。" : `完成余下 ${15 - finishedCount()} 场后，冠军与亚军将在这里正式揭晓。`}</p></div><p class="form-note ${complete ? "good" : ""}">${complete ? "FINAL RESULTS LOCKED" : "FINALISTS PENDING"}</p></section>${complete ? `<section class="podium">${podiumSlot(table[1], "second", "02 · 亚军")}${podiumSlot(table[0], "first", "01 · 冠军")}${podiumSlot(table[2], "third", "03 · 季军")}</section>` : `<section class="podium-empty">本届循环赛尚未完成。<br />当前已记录 <b>${finishedCount()}</b> 场，全部 <b>15</b> 场赛果确认后，将按照积分榜揭晓冠军与亚军。</section>`}${footer()}</main>`;
  }
  function footer() { return `<footer class="footer"><span><b>SAI DIAN QING</b> · LOCAL-FIRST MATCH TRACKER</span><span>数据仅保存在当前浏览器</span></footer>`; }
  function render() {
    const views = { home: homeView, roster: rosterView, schedule: scheduleView, scores: scoresView, stats: statsView, podium: podiumView };
    app.innerHTML = topbar() + (views[state.activeView] || homeView)();
    bindEvents();
  }
  function showFeedback(text, isError = false) {
    const target = document.getElementById("score-feedback");
    if (target) { target.textContent = text; target.style.color = isError ? "var(--danger)" : "var(--mint-soft)"; }
  }
  function bindEvents() {
    app.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => {
      const match = button.dataset.match; if (match) state.selectedMatchId = match;
      state.activeView = button.dataset.view; render(); window.scrollTo({ top: 0, behavior: "smooth" });
    }));
    app.querySelectorAll("[data-match]:not([data-view])").forEach((button) => button.addEventListener("click", () => { state.selectedMatchId = button.dataset.match; render(); }));
    const roster = document.getElementById("roster-form");
    if (roster) roster.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = roster.querySelector("[name=title]").value.trim();
      const players = state.players.map((player) => ({ ...player, name: roster.querySelector(`[data-player-name="${player.id}"]`).value.trim(), gender: roster.querySelector(`[data-player-gender="${player.id}"]`).value }));
      const maleCount = players.filter((player) => player.gender === "男").length;
      if (!title || players.some((player) => !player.name) || maleCount !== 3) { alert("请填写赛事名称与六位选手，并确保名单为 3 男、3 女。"); return; }
      state.title = title; state.players = players; saveState(); state.activeView = "schedule"; render(); window.scrollTo({ top: 0, behavior: "smooth" });
    });
    const resetRoster = document.getElementById("reset-roster");
    if (resetRoster) resetRoster.addEventListener("click", () => {
      if (!confirm("确定要清空所有比分并恢复默认名单吗？")) return;
      state = freshState(); saveState(); render();
    });
    const scoreForm = document.getElementById("score-form");
    if (scoreForm) scoreForm.addEventListener("submit", (event) => {
      event.preventDefault(); const a = Number(document.getElementById("score-a").value); const b = Number(document.getElementById("score-b").value);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) { showFeedback("请输入两个不小于 0 的整数得分。", true); return; }
      if (a === b) { showFeedback("循环赛必须分出胜负，双方得分不能相同。", true); return; }
      if (Math.max(a, b) < 11) { showFeedback("获胜方至少需要得到 11 分。", true); return; }
      if (Math.abs(a - b) < 2) { showFeedback("获胜方需至少领先对手 2 分。", true); return; }
      const match = selectedMatch(); state.scores[match.id] = { a, b }; saveState(); showFeedback("赛果已保存，积分榜已同步更新。"); setTimeout(render, 420);
    });
    const clearScore = document.getElementById("clear-score");
    if (clearScore) clearScore.addEventListener("click", () => { const match = selectedMatch(); if (!result(match)) return; if (confirm("清除本场已录入的比分？")) { delete state.scores[match.id]; saveState(); render(); } });
  }
  render();
})();
