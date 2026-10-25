// 上传路由：本地对象存储（沙盒落地形态；生产形态为 OSS STS 直传，接口契约保持一致）
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('./config');
const { extractToken } = require('./auth');
const { ok, err } = require('./util');

const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAGIC = {
  jpg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  webp: null, // RIFF....WEBP
};

function checkMagic(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // jpg
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true; // png
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true; // webp
  return false;
}

module.exports = function uploadRoutes(db) {
  const router = express.Router();
  fs.mkdirSync(config.uploadDir, { recursive: true });

  const storage = multer.memoryStorage();
  const upload = multer({
    storage,
    limits: { fileSize: config.maxUploadBytes },
    fileFilter(req, file, cb) {
      if (!MIME_EXT[file.mimetype]) return cb(err(400, 1000, '仅支持 JPG/PNG/WebP 图片'));
      cb(null, true);
    },
  });

  // 服务端代理上传（同时兼容"客户端直传"与"服务端中转"两种形态的落地）
  router.post('/upload/photo', upload.single('file'), (req, res, next) => {
    try {
      if (!req.file) throw err(400, 1000, '请选择要上传的文件');
      if (!checkMagic(req.file.buffer)) throw err(400, 1000, '文件内容不是有效图片');
      const ext = MIME_EXT[req.file.mimetype];
      const today = new Date();
      const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10).replace(/-/g, '');
      const key = `homework/${req.userId}/${local}/${crypto.randomUUID()}${ext}`;
      const abs = path.join(config.uploadDir, key);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, req.file.buffer);
      return ok(res, { photo_key: key, size: req.file.size });
    } catch (e) { next(e); }
  });

  // 照片读取（服务端签名 URL 的本地等价物：登录态 + 归属校验）
  // token 支持 X-Auth-Token 头 / Authorization 头 / ?token= 查询参数（<img src> 场景）
  router.get('/photos/{*splat}', (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) throw err(401, 1001, '未登录');
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, config.jwtSecret);
      const key = Array.isArray(req.params.splat) ? req.params.splat.join('/') : req.params.splat;
      if (!key || !key.startsWith(`homework/${payload.uid}/`)) throw err(403, 1002, '无权访问该照片');
      const abs = path.join(config.uploadDir, key);
      if (!abs.startsWith(config.uploadDir) || !fs.existsSync(abs)) throw err(404, 1003, '照片不存在');
      res.sendFile(abs);
    } catch (e) { next(e); }
  });

  return router;
};
