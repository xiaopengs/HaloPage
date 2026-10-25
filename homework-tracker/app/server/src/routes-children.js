// 孩子档案 + 学科路由
const express = require('express');
const { ok, err } = require('./util');
const z = require('zod');

module.exports = function childRoutes(db) {
  const router = express.Router();

  // ---- 孩子档案 ----
  router.get('/children', (req, res) => {
    const rows = db.prepare(
      'SELECT id, name, grade, sort_order, created_at FROM children WHERE user_id = ? AND deleted_at IS NULL ORDER BY sort_order, id'
    ).all(req.userId);
    return ok(res, rows);
  });

  router.post('/children', (req, res, next) => {
    try {
      const body = z.object({
        name: z.string().min(1, '请填写孩子称呼').max(20, '称呼不超过 20 字'),
        grade: z.string().max(20).optional().nullable(),
      }).parse(req.body);
      const cnt = db.prepare('SELECT COUNT(*) c FROM children WHERE user_id = ? AND deleted_at IS NULL').get(req.userId);
      if (cnt.c >= 10) throw err(400, 1000, '单账号最多添加 10 个孩子档案');
      const info = db.prepare('INSERT INTO children (user_id, name, grade, sort_order) VALUES (?, ?, ?, ?)')
        .run(req.userId, body.name.trim(), body.grade || null, cnt.c + 1);
      return ok(res, { id: info.lastInsertRowid }, '添加成功');
    } catch (e) { next(e); }
  });

  router.put('/children/:id', (req, res, next) => {
    try {
      const body = z.object({
        name: z.string().min(1).max(20).optional(),
        grade: z.string().max(20).optional().nullable(),
      }).parse(req.body);
      const child = db.prepare('SELECT id FROM children WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(req.params.id, req.userId);
      if (!child) throw err(404, 1003, '孩子档案不存在');
      const sets = [], vals = [];
      if (body.name !== undefined) { sets.push('name = ?'); vals.push(body.name.trim()); }
      if (body.grade !== undefined) { sets.push('grade = ?'); vals.push(body.grade || null); }
      if (sets.length) {
        sets.push("updated_at = datetime('now')");
        db.prepare(`UPDATE children SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals, child.id, req.userId);
      }
      return ok(res, null, '已更新');
    } catch (e) { next(e); }
  });

  router.delete('/children/:id', (req, res, next) => {
    try {
      const child = db.prepare('SELECT id FROM children WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(req.params.id, req.userId);
      if (!child) throw err(404, 1003, '孩子档案不存在');
      // 软删除：孩子及其作业记录一并软删（不可恢复，前端已二次确认）
      db.exec('BEGIN');
      try {
        db.prepare("UPDATE children SET deleted_at = datetime('now') WHERE id = ?").run(child.id);
        db.prepare("UPDATE homeworks SET deleted_at = datetime('now') WHERE child_id = ? AND user_id = ? AND deleted_at IS NULL").run(child.id, req.userId);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return ok(res, null, '已删除');
    } catch (e) { next(e); }
  });

  // ---- 学科 ----
  router.get('/subjects', (req, res) => {
    const rows = db.prepare(
      `SELECT id, name, color, sort_order, CASE WHEN user_id IS NULL THEN 1 ELSE 0 END AS is_default
       FROM subjects WHERE deleted_at IS NULL AND (user_id IS NULL OR user_id = ?)
       ORDER BY is_default DESC, sort_order, id`
    ).all(req.userId);
    return ok(res, rows);
  });

  router.post('/subjects', (req, res, next) => {
    try {
      const body = z.object({ name: z.string().min(1, '请填写学科名').max(20) }).parse(req.body);
      const info = db.prepare('INSERT INTO subjects (user_id, name, sort_order) VALUES (?, ?, ?)')
        .run(req.userId, body.name.trim(), 100);
      return ok(res, { id: info.lastInsertRowid }, '添加成功');
    } catch (e) { next(e); }
  });

  router.delete('/subjects/:id', (req, res, next) => {
    try {
      const s = db.prepare('SELECT id, user_id FROM subjects WHERE id = ? AND deleted_at IS NULL').get(req.params.id);
      if (!s || s.user_id === null) throw err(403, 1000, '系统预设学科不可删除');
      if (s.user_id !== req.userId) throw err(404, 1003, '学科不存在');
      const used = db.prepare('SELECT COUNT(*) c FROM homeworks WHERE subject_id = ? AND deleted_at IS NULL').get(s.id);
      if (used.c > 0) throw err(400, 1000, '该学科下已有作业记录，不能删除');
      db.prepare("UPDATE subjects SET deleted_at = datetime('now') WHERE id = ?").run(s.id);
      return ok(res, null, '已删除');
    } catch (e) { next(e); }
  });

  return router;
};
