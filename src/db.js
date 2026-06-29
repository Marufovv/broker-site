const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

require('dotenv').config();

const dbPath = process.env.DATABASE_PATH || './data/broker.sqlite';
const full = path.resolve(process.cwd(), dbPath);

fs.mkdirSync(path.dirname(full), { recursive: true });

const db = new DatabaseSync(full);

db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gardeners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gardener_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  basket INTEGER NOT NULL,
  kg_per_basket REAL NOT NULL,
  total_kg REAL NOT NULL,
  buy_price REAL NOT NULL,
  sell_price REAL NOT NULL,
  buy_total REAL NOT NULL,
  sell_total REAL NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(gardener_id) REFERENCES gardeners(id)
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gardener_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  kg REAL NOT NULL,
  amount REAL NOT NULL,
  customer TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(gardener_id) REFERENCES gardeners(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gardener_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(gardener_id) REFERENCES gardeners(id)
);

CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
`);

module.exports = db;