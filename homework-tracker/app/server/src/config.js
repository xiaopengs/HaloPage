// 环境变量集中管理与校验
require('dotenv').config();

function required(name, fallback) {
  const v = process.env[name] || fallback;
  if (v === undefined || v === '') throw new Error(`缺少环境变量 ${name}`);
  return v;
}

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: required('JWT_SECRET', 'dev-only-insecure-secret-change-me'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '2h',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),
  dbFile: process.env.DB_FILE || require('path').join(__dirname, '..', 'data', 'homework.db'),
  uploadDir: process.env.UPLOAD_DIR || require('path').join(__dirname, '..', 'uploads'),
  adminToken: process.env.ADMIN_TOKEN || 'admin-dev-token',
  // 识别服务（OpenAI 兼容多模态接口）：主链路 Qwen-VL（DashScope），备用任意兼容端点
  llm: {
    primaryBaseUrl: process.env.LLM_PRIMARY_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    primaryApiKey: process.env.LLM_PRIMARY_API_KEY || '',
    primaryModel: process.env.LLM_PRIMARY_MODEL || 'qwen-vl-max',
    backupBaseUrl: process.env.LLM_BACKUP_BASE_URL || '',
    backupApiKey: process.env.LLM_BACKUP_API_KEY || '',
    backupModel: process.env.LLM_BACKUP_MODEL || 'gpt-4o',
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '25000', 10),
  },
  maxUploadBytes: parseInt(process.env.MAX_UPLOAD_BYTES || String(5 * 1024 * 1024), 10),
};
