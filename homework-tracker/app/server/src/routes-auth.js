// 认证路由：注册 / 登录 / 刷新 / 登出 / 当前用户
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('./config');
const { signAccess, signRefresh, extractToken } = require('./auth');
const { ok, err, makeRateLimiter } = require('./util');

const z = require('zod');

const registerSchema = z.object({
  account: z.string().min(4, '账号至少 4 位').max(64), // 邮箱或手机号
  password: z.string().min(6, '密码至少 6 位').max(64),
  nickname: z.string().max(50).optional(),
  agreement: z.literal(true, { errorMap: () => ({ message: '请先阅读并同意用户协议与隐私政策' }) }),
});

const loginSchema = z.object({
  account: z.string().min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码'),
});

module.exports = function authRoutes(db) {
  const router = express.Router();
  const loginLimiter = makeRateLimiter({ windowMs: 60 * 1000, max: 10, keyFn: r => `login:${r.ip}` });

  function normalizeAccount(account) {
    const isEmail = account.includes('@');
    return { isEmail, value: account.trim().toLowerCase() };
  }

  router.post('/register', async (req, res, next) => {
    try {
      const body = registerSchema.parse(req.body);
      const { isEmail, value } = normalizeAccount(body.account);
      const passwordHash = bcrypt.hashSync(body.password, 12);
      let phoneHash = null, email = null;
      if (isEmail) email = value;
      else phoneHash = crypto.createHash('sha256').update(value).digest('hex');
      const dup = db.prepare(
        'SELECT id FROM users WHERE deleted_at IS NULL AND (email = ? OR phone_hash = ?)'
      ).get(email, phoneHash);
      if (dup) throw err(409, 2002, '该账号已注册，请直接登录');
      const info = db.prepare(
        'INSERT INTO users (email, phone_hash, password_hash, nickname, agreement_version) VALUES (?, ?, ?, ?, ?)'
      ).run(email, phoneHash, passwordHash, body.nickname || (isEmail ? value.split('@')[0] : value), 'v1.0');
      const userId = info.lastInsertRowid;
      return ok(res, {
        token: signAccess(userId),
        refresh_token: signRefresh(userId, db),
        user: { id: userId, nickname: body.nickname || value },
      }, '注册成功');
    } catch (e) { next(e); }
  });

  router.post('/login', loginLimiter, async (req, res, next) => {
    try {
      const body = loginSchema.parse(req.body);
      const { isEmail, value } = normalizeAccount(body.account);
      const user = db.prepare(
        'SELECT * FROM users WHERE deleted_at IS NULL AND status = 1 AND (email = ? OR phone_hash = ?)'
      ).get(isEmail ? value : null, isEmail ? null : crypto.createHash('sha256').update(value).digest('hex'));
      if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
        throw err(401, 2001, '账号或密码错误');
      }
      db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
      return ok(res, {
        token: signAccess(user.id),
        refresh_token: signRefresh(user.id, db),
        user: { id: user.id, nickname: user.nickname },
      }, '登录成功');
    } catch (e) { next(e); }
  });

  router.post('/refresh', async (req, res, next) => {
    try {
      const token = req.body.refresh_token;
      if (!token) throw err(401, 1001, '缺少 refresh_token');
      const jwt = require('jsonwebtoken');
      let payload;
      try { payload = jwt.verify(token, config.jwtSecret); }
      catch { throw err(401, 1001, '登录已过期，请重新登录'); }
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      const row = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ?').get(hash);
      if (!row || row.user_id !== payload.uid) throw err(401, 1001, '登录已过期，请重新登录');
      // 轮换：吊销旧 refresh，签发新 refresh
      db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
      return ok(res, { token: signAccess(payload.uid), refresh_token: signRefresh(payload.uid, db) });
    } catch (e) { next(e); }
  });

  router.post('/logout', (req, res, next) => {
    try {
      const token = req.body.refresh_token;
      if (token) {
        const hash = crypto.createHash('sha256').update(token).digest('hex');
        db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
      }
      return ok(res, null, '已退出登录');
    } catch (e) { next(e); }
  });

  router.get('/me', (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) throw err(401, 1001, '未登录');
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, config.jwtSecret);
      const user = db.prepare('SELECT id, email, nickname, created_at FROM users WHERE id = ? AND deleted_at IS NULL').get(payload.uid);
      if (!user) throw err(401, 1001, '账号不存在');
      return ok(res, user);
    } catch (e) { next(e); }
  });

  return router;
};
