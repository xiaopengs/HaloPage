// 作业路由：CRUD + 周视图 + 识别触发与确认（核心）
const express = require('express');
const path = require('path');
const fs = require('fs');
const z = require('zod');
const { ok, err, isoWeek, todayStr, imageHash } = require('./util');
const { recognize, PROMPT_VERSION } = require('./recognition');
const config = require('./config');

// 状态机：0=pending 1=recognizing 2=recognized 3=recognize_failed 4=confirmed(含手动直接保存)
const STATUS = { PENDING: 0, RECOGNIZING: 1, RECOGNIZED: 2, RECOGNIZE_FAILED: 3, CONFIRMED: 4 };

function shiftWeek(weekStart, delta) {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + delta * 7);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

module.exports = function homeworkRoutes(db, upload) {
  const router = express.Router();

  // 周视图：week_start + child_id → 7 天 × N 学科结构化数据
  router.get('/homeworks/week-view', (req, res, next) => {
    try {
      const weekStart = req.query.week_start || isoWeek().weekStart;
      const childId = Number(req.query.child_id);
      if (!childId) throw err(1000, '缺少 child_id');
      const child = db.prepare('SELECT id, name, grade FROM children WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(childId, req.userId);
      if (!child) throw err(404, 1003, '孩子档案不存在');
      const rows = db.prepare(
        `SELECT h.id, h.homework_date, h.weekday, h.content, h.status, h.completed, h.source, h.photo_key, h.confidence,
                s.id AS subject_id, s.name AS subject_name, s.color AS subject_color
         FROM homeworks h JOIN subjects s ON s.id = h.subject_id
         WHERE h.user_id = ? AND h.child_id = ? AND h.week_start = ? AND h.deleted_at IS NULL
         ORDER BY h.weekday, s.sort_order, h.id`
      ).all(req.userId, childId, weekStart);
      const days = [];
      const monday = new Date(weekStart + 'T00:00:00');
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        const dateStr = local.toISOString().slice(0, 10);
        const dayRows = rows.filter(r => r.homework_date === dateStr);
        const bySubject = {};
        dayRows.forEach(r => {
          const key = String(r.subject_id);
          if (!bySubject[key]) bySubject[key] = { subject_id: r.subject_id, name: r.subject_name, color: r.subject_color, items: [] };
          bySubject[key].items.push({
            id: r.id, content: r.content, status: r.status, completed: r.completed === 1, source: r.source,
            photo_key: r.photo_key, confidence: r.confidence,
          });
        });
        days.push({
          weekday: i + 1,
          date: dateStr,
          is_today: dateStr === todayStr(),
          subjects: Object.values(bySubject),
          total: dayRows.length,
          done: dayRows.filter(r => r.completed === 1).length,
        });
      }
      return ok(res, { week_start: weekStart, child, days, prev_week: shiftWeek(weekStart, -1), next_week: shiftWeek(weekStart, 1) });
    } catch (e) { next(e); }
  });

  // 手动新增作业（识别确认保存也走此路径的变体）
  router.post('/homeworks', (req, res, next) => {
    try {
      const body = z.object({
        child_id: z.number().int(),
        subject_id: z.number().int(),
        homework_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式不正确'),
        content: z.string().max(2000).optional().default(''),
        photo_key: z.string().max(255).optional().nullable(),
        recognized_json: z.string().optional().nullable(),
        confidence: z.number().optional().nullable(),
      }).parse(req.body);
      const child = db.prepare('SELECT id FROM children WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(body.child_id, req.userId);
      if (!child) throw err(404, 1003, '孩子档案不存在');
      const subject = db.prepare('SELECT id FROM subjects WHERE id = ? AND deleted_at IS NULL AND (user_id IS NULL OR user_id = ?)').get(body.subject_id, req.userId);
      if (!subject) throw err(404, 1003, '学科不存在');
      const { weekStart, weekday } = isoWeek(body.homework_date);
      const info = db.prepare(
        `INSERT INTO homeworks (user_id, child_id, subject_id, homework_date, week_start, weekday, content, photo_key, recognized_json, confidence, source, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
      ).run(req.userId, body.child_id, body.subject_id, body.homework_date, weekStart, weekday,
        body.content || '', body.photo_key || null, body.recognized_json || null, body.confidence ?? null, STATUS.CONFIRMED);
      return ok(res, { id: info.lastInsertRowid }, '保存成功');
    } catch (e) { next(e); }
  });

  // 批量手动录入：一次提交多行作业（每行一条），整体成功或整体回滚
  router.post('/homeworks/batch', (req, res, next) => {
    try {
      const body = z.object({
        child_id: z.number().int(),
        subject_id: z.number().int(),
        homework_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式不正确'),
        items: z.array(z.string().trim().min(1, '作业内容不能为空').max(2000)).min(1, '至少一条作业').max(50, '一次最多 50 条'),
      }).parse(req.body);
      const child = db.prepare('SELECT id FROM children WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(body.child_id, req.userId);
      if (!child) throw err(404, 1003, '孩子档案不存在');
      const subject = db.prepare('SELECT id FROM subjects WHERE id = ? AND deleted_at IS NULL AND (user_id IS NULL OR user_id = ?)').get(body.subject_id, req.userId);
      if (!subject) throw err(404, 1003, '学科不存在');
      const { weekStart, weekday } = isoWeek(body.homework_date);
      const stmt = db.prepare(
        `INSERT INTO homeworks (user_id, child_id, subject_id, homework_date, week_start, weekday, content, source, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
      );
      const ids = [];
      db.exec('BEGIN');
      try {
        for (const text of body.items) {
          const info = stmt.run(req.userId, body.child_id, body.subject_id, body.homework_date, weekStart, weekday, text, STATUS.CONFIRMED);
          ids.push(Number(info.lastInsertRowid));
        }
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return ok(res, { ids, count: ids.length }, `已保存 ${ids.length} 条`);
    } catch (e) { next(e); }
  });

  // 上传完成后绑定/替换照片
  router.put('/homeworks/:id/photo', (req, res, next) => {
    try {
      const body = z.object({ photo_key: z.string().min(1).max(255) }).parse(req.body);
      const hw = db.prepare('SELECT id FROM homeworks WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(req.params.id, req.userId);
      if (!hw) throw err(404, 1003, '作业记录不存在');
      db.prepare("UPDATE homeworks SET photo_key = ?, updated_at = datetime('now') WHERE id = ?").run(body.photo_key, hw.id);
      return ok(res, null, '照片已更新');
    } catch (e) { next(e); }
  });

  // 作业详情
  router.get('/homeworks/:id', (req, res, next) => {
    try {
      const hw = db.prepare(
        `SELECT h.*, s.name AS subject_name, s.color AS subject_color, c.name AS child_name
         FROM homeworks h JOIN subjects s ON s.id = h.subject_id JOIN children c ON c.id = h.child_id
         WHERE h.id = ? AND h.user_id = ? AND h.deleted_at IS NULL`
      ).get(req.params.id, req.userId);
      if (!hw) throw err(404, 1003, '作业记录不存在');
      return ok(res, hw);
    } catch (e) { next(e); }
  });

  // 待确认列表（识别成功但未确认的草稿）——注意路由顺序：具体路径先于 :id
  router.get('/homeworks/pending/list', (req, res) => {
    const rows = db.prepare(
      `SELECT h.id, h.photo_key, h.recognized_json, h.confidence, c.name AS child_name
       FROM homeworks h JOIN children c ON c.id = h.child_id
       WHERE h.user_id = ? AND h.status = ? AND h.deleted_at IS NULL ORDER BY h.id DESC`
    ).all(req.userId, STATUS.RECOGNIZED);
    return ok(res, rows.map(r => ({ ...r, recognized_json: r.recognized_json ? JSON.parse(r.recognized_json) : null })));
  });

  // 更新作业（识别确认保存 / 编辑 / 完成标记）
  router.put('/homeworks/:id', (req, res, next) => {
    try {
      const body = z.object({
        child_id: z.number().int().optional(),
        subject_id: z.number().int().optional(),
        homework_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        content: z.string().max(2000).optional(),
        completed: z.boolean().optional(),
        status: z.number().int().optional(),
      }).parse(req.body);
      const hw = db.prepare('SELECT * FROM homeworks WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(req.params.id, req.userId);
      if (!hw) throw err(404, 1003, '作业记录不存在');
      const sets = ["updated_at = datetime('now')"];
      const vals = [];
      if (body.content !== undefined) { sets.push('content = ?'); vals.push(body.content); }
      if (body.completed !== undefined) { sets.push('completed = ?'); vals.push(body.completed ? 1 : 0); }
      if (body.subject_id !== undefined) {
        const subject = db.prepare('SELECT id FROM subjects WHERE id = ? AND deleted_at IS NULL AND (user_id IS NULL OR user_id = ?)').get(body.subject_id, req.userId);
        if (!subject) throw err(404, 1003, '学科不存在');
        sets.push('subject_id = ?'); vals.push(body.subject_id);
      }
      if (body.homework_date !== undefined) {
        const { weekStart, weekday } = isoWeek(body.homework_date);
        sets.push('homework_date = ?', 'week_start = ?', 'weekday = ?');
        vals.push(body.homework_date, weekStart, weekday);
      }
      if (body.child_id !== undefined) {
        const child = db.prepare('SELECT id FROM children WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(body.child_id, req.userId);
        if (!child) throw err(404, 1003, '孩子档案不存在');
        sets.push('child_id = ?'); vals.push(body.child_id);
      }
      // 识别确认保存：status 2/3 → 4
      if (body.status !== undefined) {
        if (![STATUS.RECOGNIZED, STATUS.RECOGNIZE_FAILED, STATUS.CONFIRMED].includes(body.status)) {
          throw err(1000, '非法的状态流转');
        }
        sets.push('status = ?'); vals.push(body.status);
      }
      db.prepare(`UPDATE homeworks SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...vals, hw.id, req.userId);
      return ok(res, null, '已保存');
    } catch (e) { next(e); }
  });

  // 删除（软删，二次确认由前端完成）
  router.delete('/homeworks/:id', (req, res, next) => {
    try {
      const hw = db.prepare('SELECT id FROM homeworks WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(req.params.id, req.userId);
      if (!hw) throw err(404, 1003, '作业记录不存在');
      db.prepare("UPDATE homeworks SET deleted_at = datetime('now') WHERE id = ?").run(hw.id);
      return ok(res, null, '已删除');
    } catch (e) { next(e); }
  });

  // 触发智能识别（状态机 + 幂等：recognizing 中拒绝重复；同 image_hash 已有成功结果复用）
  router.post('/homeworks/:id/recognize', async (req, res, next) => {
    try {
      const hw = db.prepare('SELECT * FROM homeworks WHERE id = ? AND user_id = ? AND deleted_at IS NULL').get(req.params.id, req.userId);
      if (!hw) throw err(404, 1003, '作业记录不存在');
      if (hw.status === STATUS.RECOGNIZING) throw err(409, 1004, '正在识别中，请稍候');
      if (!hw.photo_key) throw err(400, 3003, '请先上传作业照片');
      const filePath = path.join(config.uploadDir, hw.photo_key);
      if (!fs.existsSync(filePath)) throw err(400, 3003, '照片文件不存在，请重新上传');
      const buf = fs.readFileSync(filePath);
      const hash = imageHash(buf);
      // 同图复用
      const reused = db.prepare(
        `SELECT r.confidence, h.recognized_json FROM recognition_tasks r JOIN homeworks h ON h.id = r.homework_id
         WHERE r.image_hash = ? AND r.status = 1 AND h.deleted_at IS NULL
         ORDER BY r.id DESC LIMIT 1`
      ).get(hash);
      if (reused && reused.recognized_json) {
        db.prepare("UPDATE homeworks SET status = ?, recognized_json = ?, confidence = ?, recognized_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
          .run(STATUS.RECOGNIZED, reused.recognized_json, reused.confidence, hw.id);
        return ok(res, { status: STATUS.RECOGNIZED, recognized_json: JSON.parse(reused.recognized_json), confidence: reused.confidence, reused: true });
      }
      db.prepare("UPDATE homeworks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(STATUS.RECOGNIZING, hw.id);
      const image = { base64: buf.toString('base64'), mime: hw.photo_key.endsWith('.png') ? 'image/png' : 'image/jpeg' };
      const outcome = await recognize(image);
      const finalAttempt = outcome.final || outcome.attempts[outcome.attempts.length - 1];
      db.prepare(
        `INSERT INTO recognition_tasks (homework_id, user_id, provider, model, prompt_version, status, duration_ms, confidence, image_hash, error_code, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(hw.id, req.userId, finalAttempt.provider || 'none', finalAttempt.model || null, PROMPT_VERSION,
        outcome.success ? 1 : 0, finalAttempt.duration_ms || 0, outcome.success ? finalAttempt.result.overall_confidence : null,
        hash, finalAttempt.error_code || null, finalAttempt.error_message || outcome.reason || null);
      if (outcome.success) {
        db.prepare("UPDATE homeworks SET status = ?, recognized_json = ?, confidence = ?, recognized_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
          .run(STATUS.RECOGNIZED, JSON.stringify(outcome.final.result), outcome.final.result.overall_confidence, hw.id);
        return ok(res, { status: STATUS.RECOGNIZED, recognized_json: outcome.final.result, confidence: outcome.final.result.overall_confidence, reused: false });
      }
      db.prepare("UPDATE homeworks SET status = ?, updated_at = datetime('now') WHERE id = ?").run(STATUS.RECOGNIZE_FAILED, hw.id);
      return ok(res, { status: STATUS.RECOGNIZE_FAILED, reason: outcome.reason || '识别失败，请手动录入' });
    } catch (e) { next(e); }
  });

  return router;
};
