// 管理后台（最小运营后台 B-01）：用户列表 / 数据统计 / 识别监控 / 反馈
const express = require('express');
const config = require('./config');
const { ok, err } = require('./util');

module.exports = function adminRoutes(db) {
  const router = express.Router();

  router.use((req, res, next) => {
    const token = req.headers['x-admin-token'] || req.query.admin_token;
    if (!token || token !== config.adminToken) return next(err(403, 1002, '无管理权限'));
    next();
  });

  router.get('/stats', (req, res) => {
    const users = db.prepare('SELECT COUNT(*) c FROM users WHERE deleted_at IS NULL').get().c;
    const children = db.prepare('SELECT COUNT(*) c FROM children WHERE deleted_at IS NULL').get().c;
    const homeworks = db.prepare('SELECT COUNT(*) c FROM homeworks WHERE deleted_at IS NULL').get().c;
    const photos = db.prepare('SELECT COUNT(*) c FROM homeworks WHERE photo_key IS NOT NULL AND deleted_at IS NULL').get().c;
    const completed = db.prepare('SELECT COUNT(*) c FROM homeworks WHERE completed = 1 AND deleted_at IS NULL').get().c;
    return ok(res, { users, children, homeworks, photos, completed });
  });

  router.get('/users', (req, res) => {
    const rows = db.prepare(
      `SELECT u.id, u.email, u.nickname, u.status, u.created_at, u.last_login_at,
              (SELECT COUNT(*) FROM children c WHERE c.user_id = u.id AND c.deleted_at IS NULL) AS children_count,
              (SELECT COUNT(*) FROM homeworks h WHERE h.user_id = u.id AND h.deleted_at IS NULL) AS homework_count
       FROM users u WHERE u.deleted_at IS NULL ORDER BY u.id DESC LIMIT 200`
    ).all();
    return ok(res, rows);
  });

  router.put('/users/:id/status', (req, res, next) => {
    try {
      const { status } = req.body;
      if (![0, 1].includes(status)) throw err(1000, '非法状态值');
      db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
      return ok(res, null, '已更新');
    } catch (e) { next(e); }
  });

  router.get('/recognition', (req, res) => {
    const rows = db.prepare(
      `SELECT provider, model, status, COUNT(*) AS cnt,
              ROUND(AVG(duration_ms)) AS avg_ms,
              ROUND(AVG(confidence), 3) AS avg_conf
       FROM recognition_tasks GROUP BY provider, model, status ORDER BY cnt DESC LIMIT 50`
    ).all();
    const recent = db.prepare(
      `SELECT id, homework_id, provider, status, duration_ms, confidence, error_code, created_at
       FROM recognition_tasks ORDER BY id DESC LIMIT 20`
    ).all();
    return ok(res, { summary: rows, recent });
  });

  router.get('/feedback', (req, res) => {
    const rows = db.prepare(
      'SELECT f.id, f.content, f.contact, f.status, f.created_at, u.nickname FROM feedback f LEFT JOIN users u ON u.id = f.user_id ORDER BY f.id DESC LIMIT 100'
    ).all();
    return ok(res, rows);
  });

  return router;
};
