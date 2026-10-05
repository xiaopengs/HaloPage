const players = [
  { id: "p1", name: "鹏哥" },
  { id: "p2", name: "亮哥" },
  { id: "p3", name: "睿哥" },
  { id: "p4", name: "琳姐" },
  { id: "p5", name: "寒姐" },
  { id: "p6", name: "忱姐" },
];

function assert(condition, message) {
  if (!condition) throw new Error(`验证失败：${message}`);
}

function buildRounds(source) {
  const rotation = source.map((player) => player.id);
  const rounds = [];
  for (let round = 0; round < rotation.length - 1; round += 1) {
    const matches = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      matches.push({ id: `r${round + 1}-m${index + 1}`, a: rotation[index], b: rotation[rotation.length - 1 - index] });
    }
    rounds.push(matches);
    rotation.splice(1, 0, rotation.pop());
  }
  return rounds.flat();
}

function isValidScore(a, b) {
  return Number.isInteger(a) && Number.isInteger(b) && a >= 0 && b >= 0 && a !== b && Math.max(a, b) >= 11 && Math.abs(a - b) >= 2;
}

const scores = {
  "r1-m1": { a: 11, b: 7 },
  "r1-m2": { a: 11, b: 8 },
  "r1-m3": { a: 11, b: 9 },
  "r2-m1": { a: 11, b: 9 },
  "r2-m2": { a: 7, b: 11 },
  "r2-m3": { a: 12, b: 10 },
  "r3-m1": { a: 11, b: 8 },
  "r3-m2": { a: 8, b: 11 },
  "r3-m3": { a: 9, b: 11 },
  "r4-m1": { a: 11, b: 6 },
  "r4-m2": { a: 11, b: 7 },
  "r4-m3": { a: 11, b: 9 },
  "r5-m1": { a: 11, b: 5 },
  "r5-m2": { a: 11, b: 7 },
  "r5-m3": { a: 12, b: 10 },
};

const matches = buildRounds(players);
assert(matches.length === 15, "六人单循环必须生成 15 场比赛");
assert(new Set(matches.map((match) => [match.a, match.b].sort().join("-"))).size === 15, "任意两位选手只能交手一次");
assert(matches.every((match) => isValidScore(scores[match.id].a, scores[match.id].b)), "每场模拟比分必须符合 11 分且领先 2 分的规则");
assert(!isValidScore(10, 8), "10:8 应因胜方未到 11 分而被拒绝");
assert(!isValidScore(11, 10), "11:10 应因未领先 2 分而被拒绝");
assert(isValidScore(11, 9), "11:9 应作为有效赛果通过");

const table = Object.fromEntries(players.map((player) => [player.id, { ...player, played: 0, wins: 0, losses: 0, pf: 0, pa: 0, points: 0 }]));
for (const match of matches) {
  const score = scores[match.id];
  const left = table[match.a];
  const right = table[match.b];
  left.played += 1; right.played += 1;
  left.pf += score.a; left.pa += score.b;
  right.pf += score.b; right.pa += score.a;
  if (score.a > score.b) { left.wins += 1; right.losses += 1; }
  else { right.wins += 1; left.losses += 1; }
}

const standings = Object.values(table).map((row) => ({ ...row, points: row.wins, diff: row.pf - row.pa })).sort((a, b) => b.points - a.points || b.diff - a.diff || b.pf - a.pf || players.findIndex((player) => player.id === a.id) - players.findIndex((player) => player.id === b.id));

const expected = [
  ["鹏哥", 5, 0, 55, 35, 20],
  ["琳姐", 3, 2, 51, 46, 5],
  ["睿哥", 3, 2, 49, 47, 2],
  ["亮哥", 3, 2, 46, 49, -3],
  ["寒姐", 1, 4, 46, 54, -8],
  ["忱姐", 0, 5, 39, 55, -16],
];

for (const [index, [name, points, losses, pf, pa, diff]] of expected.entries()) {
  const row = standings[index];
  assert(row.name === name, `第 ${index + 1} 名应为${name}`);
  assert(row.points === points && row.losses === losses && row.pf === pf && row.pa === pa && row.diff === diff, `${name}的积分、胜负和得失分应与模拟结果一致`);
  assert(row.played === 5 && row.wins + row.losses === 5, `${name}应完成 5 场且胜负合计为 5`);
}
assert(standings.reduce((sum, row) => sum + row.pf, 0) === standings.reduce((sum, row) => sum + row.pa, 0), "全体总得分必须等于全体总失分");

console.table(standings.map((row, index) => ({ 排名: index + 1, 选手: row.name, 积分: row.points, 胜: row.wins, 负: row.losses, 得分: row.pf, 失分: row.pa, 净胜分: row.diff })));
console.log(`验证通过：冠军 ${standings[0].name}，亚军 ${standings[1].name}；共 ${matches.length} 场，${players.length} 位选手，每人 ${standings[0].played} 场。`);
