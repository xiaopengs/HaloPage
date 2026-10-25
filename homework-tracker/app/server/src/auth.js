// JWT 双 Token 鉴权中间件 + 水平越权校验助手
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('./config');
const { err } = require('./util');

function signAccess(userId) {
  return jwt.sign({ uid: userId }, config.jwtSecret, { expiresIn: config.accessTokenTtl });
}

function signRefresh(userId, db) {
  const token = jwt.sign(
    { uid: userId, t: 'r', jti: crypto.randomUUID() },
    config.jwtSecret,
    { expiresIn: `${config.refreshTokenTtlDays}d` }
  );
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + config.refreshTokenTtlDays * 86400000)
    .toISOString().replace('T', ' ').slice(0, 19);
  db.prepare('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)')
    .run(userId, hash, expires);
  return token;
}

// 多通道 token 提取（穿透公网边缘代理）：
// 1) X-Auth-Token 自定义头（优先——公网边缘代理会覆盖标准 Authorization 头，自定义头可穿透）
// 2) ?token=<jwt> 查询参数（供 <img src> 等无法自定义请求头的场景；优先级高于 Authorization，
//    因为边缘代理注入的 Authorization 会污染标准头通道）
// 3) Authorization: Bearer <token>（本地/标准客户端场景）
function extractToken(req) {
  const custom = req.headers['x-auth-token'];
  if (typeof custom === 'string' && custom.trim()) return custom.trim();
  const q = req.query && req.query.token;
  if (typeof q === 'string' && q.trim()) return q.trim();
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    const t = header.slice(7).trim();
    if (t) return t;
  }
  return null;
}

function authRequired(db) {
  return (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) throw err(401, 1001, '未登录');
      const payload = jwt.verify(token, config.jwtSecret);
      const user = db.prepare('SELECT id, status FROM users WHERE id = ? AND deleted_at IS NULL').get(payload.uid);
      if (!user || user.status !== 1) throw err(401, 1001, '账号不存在或已禁用');
      req.userId = user.id;
      next();
    } catch (e) {
      if (e instanceof Error && e.status) return next(e);
      next(err(401, 1001, '登录已过期，请重新登录'));
    }
  };
}

module.exports = { signAccess, signRefresh, authRequired, extractToken };
