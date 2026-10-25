// 通用工具：统一响应、错误体系、ISO 周计算、图片 hash
const crypto = require('crypto');

class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}
const err = (status, code, message) => new ApiError(status, code, message);

function ok(res, data, message = 'success') {
  return res.json({ code: 0, message, data });
}

// ISO 周：周一为一周起点。返回 { weekStart:'YYYY-MM-DD', weekday:1..7 }
function fmtLocal(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isoWeek(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  if (isNaN(d.getTime())) throw err(1000, '日期格式不正确');
  const day = d.getDay(); // 0=周日 1=周一 … 6=周六
  const weekday = day === 0 ? 7 : day;
  const monday = new Date(d);
  monday.setDate(d.getDate() - (weekday - 1));
  return { weekStart: fmtLocal(monday), weekday };
}

function todayStr() {
  return fmtLocal(new Date());
}

function imageHash(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// 简易内存限流（单机 MVP）
function makeRateLimiter({ windowMs, max, keyFn }) {
  const hits = new Map();
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    let rec = hits.get(key);
    if (!rec || now > rec.reset) {
      rec = { count: 0, reset: now + windowMs };
      hits.set(key, rec);
    }
    rec.count += 1;
    if (rec.count > max) {
      return next(err(429, 1004, '操作太频繁，请稍后再试'));
    }
    next();
  };
}

module.exports = { ApiError, err, ok, isoWeek, todayStr, imageHash, makeRateLimiter };
