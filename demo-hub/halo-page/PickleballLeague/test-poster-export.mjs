import fs from "node:fs/promises";
import path from "node:path";

const scores = {
  "r1-m1": { a: 11, b: 7 }, "r1-m2": { a: 11, b: 8 }, "r1-m3": { a: 11, b: 9 },
  "r2-m1": { a: 11, b: 9 }, "r2-m2": { a: 7, b: 11 }, "r2-m3": { a: 12, b: 10 },
  "r3-m1": { a: 11, b: 8 }, "r3-m2": { a: 8, b: 11 }, "r3-m3": { a: 9, b: 11 },
  "r4-m1": { a: 11, b: 6 }, "r4-m2": { a: 11, b: 7 }, "r4-m3": { a: 11, b: 9 },
  "r5-m1": { a: 11, b: 5 }, "r5-m2": { a: 11, b: 7 }, "r5-m3": { a: 12, b: 10 },
};
const downloadDir = "/home/ubuntu/Downloads";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const target = targets.find((item) => item.type === "page" && item.url.includes("/PickleballLeague/index.html"));
if (!target) throw new Error("未找到匹克球页面的浏览器测试标签页。");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  }
});
function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "页面表达式执行失败。");
  return result.result.value;
}

const before = await fs.readdir(downloadDir);
let posterPath;
try {
  await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDir, eventsEnabled: true });
  await evaluate(`localStorage.setItem("sai-dian-qing-pickleball-v3", JSON.stringify({ scores: ${JSON.stringify(scores)} })); location.reload(); "reloading";`);
  await wait(1200);
  await evaluate(`document.querySelector('[data-view="podium"]').click(); "opening-podium";`);
  await wait(500);
  const completeState = await evaluate(`({ complete: document.body.innerText.includes("赛季已完赛"), exportReady: Boolean(document.getElementById("export-poster")), champion: document.body.innerText.includes("鹏哥") && document.body.innerText.includes("琳姐") })`);
  if (!completeState.complete || !completeState.exportReady || !completeState.champion) throw new Error(`完赛页面或导出控件未正确显示：${JSON.stringify(completeState)}`);
  await evaluate(`document.getElementById("export-poster").click(); "exporting";`);
  await wait(2500);
  const after = await fs.readdir(downloadDir);
  const downloaded = after.filter((item) => !before.includes(item) && item.startsWith("赛点青-循环赛最终结果") && item.endsWith(".png"));
  const feedback = await evaluate(`document.getElementById("poster-feedback")?.textContent || "无页面反馈";`);
  if (downloaded.length !== 1) throw new Error(`未检测到结果海报下载文件；页面反馈：${feedback}；新增文件：${JSON.stringify(after.filter((item) => !before.includes(item)))}`);
  posterPath = path.join(downloadDir, downloaded[0]);
  const stat = await fs.stat(posterPath);
  if (stat.size < 50000) throw new Error(`结果海报文件体积异常：${stat.size} bytes`);
  console.log(JSON.stringify({ status: "passed", completeState, posterBytes: stat.size }, null, 2));
} finally {
  if (posterPath) await fs.unlink(posterPath).catch(() => {});
  await evaluate(`localStorage.removeItem("sai-dian-qing-pickleball-v3"); location.reload(); "cleaned";`).catch(() => {});
  socket.close();
}
