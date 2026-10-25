// 服务入口：装配中间件、路由、静态托管、统一错误处理
const express = require('express');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const { openDb } = require('./db');
const { authRequired } = require('./auth');
const { ApiError, err } = require('./util');

const db = openDb(config.dbFile);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
// 基础安全响应头
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 全局限流兜底：100 req/min/IP
const { makeRateLimiter } = require('./util');
app.use(makeRateLimiter({ windowMs: 60 * 1000, max: 300 }));

// 健康检查（免鉴权，置于鉴权中间件之前）
app.get('/api/v1/health', (req, res) => res.json({ code: 0, message: 'ok', data: { ts: Date.now() } }));

// API 路由（admin 免用户鉴权，使用独立管理令牌，须先于 /api/v1 前缀中间件注册）
app.use('/api/v1/admin', require('./routes-admin')(db));
app.use('/api/v1/auth', require('./routes-auth')(db));
app.use('/api/v1', authRequired(db), require('./routes-children')(db));
app.use('/api/v1', authRequired(db), require('./routes-homeworks')(db));
app.use('/api/v1', authRequired(db), require('./routes-upload')(db));
app.use('/api/v1/feedback', authRequired(db), (req, res, next) => {
  if (req.method === 'POST') {
    const { content, contact } = req.body || {};
    if (!content || !String(content).trim()) return next(err(1000, '请填写反馈内容'));
    db.prepare('INSERT INTO feedback (user_id, content, contact) VALUES (?, ?, ?)')
      .run(req.userId, String(content).slice(0, 2000), contact ? String(contact).slice(0, 100) : null);
    return res.json({ code: 0, message: '感谢反馈，我们会认真查看', data: null });
  }
  next();
});
app.use('/api/v1/admin', require('./routes-admin')(db));

// 静态托管前端构建产物
const distDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// 统一错误处理
// eslint-disable-next-line no-unused-vars
app.use((e, req, res, next) => {
  // zod 参数校验错误 → 1000
  if (e && e.name === 'ZodError') {
    const msg = e.errors?.[0]?.message || '参数校验失败';
    return res.status(400).json({ code: 1000, message: msg, data: null, request_id: req.headers['x-request-id'] || null });
  }
  const status = e instanceof ApiError ? e.status : 500;
  const code = e instanceof ApiError ? e.code : 5000;
  const message = e instanceof ApiError ? e.message : '服务开小差了，请稍后再试';
  if (status === 500) console.error('[error]', e);
  res.status(status < 600 ? status : 500).json({ code, message, data: null, request_id: req.headers['x-request-id'] || null });
});

// 每日备份：mysqldump 的 SQLite 等价物（VACUUM INTO 快照备份，保留 14 天）
function startBackupJob() {
  const backupDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const run = () => {
    try {
      const ts = new Date().toISOString().slice(0, 10);
      const dest = path.join(backupDir, `homework-${ts}.db`);
      db.exec(`VACUUM INTO '${dest}'`);
      // 清理 14 天前备份
      fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).forEach(f => {
        const day = f.replace('homework-', '').replace('.db', '');
        if (Date.now() - new Date(day).getTime() > 14 * 86400000) fs.unlinkSync(path.join(backupDir, f));
      });
    } catch { /* 备份失败不阻塞主服务 */ }
  };
  run();
  setInterval(run, 24 * 3600 * 1000).unref();
}
startBackupJob();

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Homework Tracker server listening on http://localhost:${config.port}`);
    if (!config.llm.primaryApiKey) {
      console.warn('[warn] 未配置 LLM_PRIMARY_API_KEY，AI 识别将不可用，系统自动降级为手动录入（功能不受影响）');
    }
  });
}

module.exports = app;
