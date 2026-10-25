// SQLite 数据层：schema 初始化 + 种子数据
// 使用 Node 22 内置 node:sqlite（DatabaseSync），API 与 better-sqlite3 兼容
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

function openDb(dbFile) {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const db = new DatabaseSync(dbFile);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    phone_ciphertext TEXT,
    phone_hash TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    nickname TEXT,
    status INTEGER NOT NULL DEFAULT 1,
    agreement_version TEXT,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);

  CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    grade TEXT,
    avatar_key TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id, deleted_at);

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);

  CREATE TABLE IF NOT EXISTS homeworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    child_id INTEGER NOT NULL REFERENCES children(id),
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    homework_date TEXT NOT NULL,
    week_start TEXT NOT NULL,
    weekday INTEGER NOT NULL,
    content TEXT,
    photo_key TEXT,
    recognized_json TEXT,
    confidence REAL,
    source INTEGER NOT NULL DEFAULT 0,
    status INTEGER NOT NULL DEFAULT 4,
    completed INTEGER NOT NULL DEFAULT 0,
    recognized_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_hw_user_week ON homeworks(user_id, week_start);
  CREATE INDEX IF NOT EXISTS idx_hw_child_week ON homeworks(child_id, week_start, weekday);
  CREATE INDEX IF NOT EXISTS idx_hw_user_status ON homeworks(user_id, status);

  CREATE TABLE IF NOT EXISTS recognition_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    homework_id INTEGER NOT NULL REFERENCES homeworks(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    provider TEXT,
    model TEXT,
    prompt_version TEXT,
    status INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    confidence REAL,
    image_hash TEXT,
    error_code TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_rt_hw ON recognition_tasks(homework_id);
  CREATE INDEX IF NOT EXISTS idx_rt_hash ON recognition_tasks(image_hash);

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    contact TEXT,
    status INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);
  // 系统预设学科种子（user_id = NULL 全局只读）
  const cnt = db.prepare('SELECT COUNT(*) c FROM subjects WHERE user_id IS NULL').get();
  if (cnt.c === 0) {
    const ins = db.prepare('INSERT INTO subjects (user_id, name, color, sort_order) VALUES (NULL, ?, ?, ?)');
    const seeds = [
      ['语文', '#8e5bf0', 1], ['数学', '#1677ff', 2], ['英语', '#13c2c2', 3],
      ['科学', '#52c41a', 4], ['道德与法治', '#fa8c16', 5], ['其他', '#8c8c8c', 6],
    ];
    db.exec('BEGIN');
    try {
      seeds.forEach(s => ins.run(...s));
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}

module.exports = { openDb };
