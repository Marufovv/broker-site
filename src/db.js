const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL topilmadi. Render Environment ichiga DATABASE_URL qo‘shing.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gardeners (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS incomes (
      id SERIAL PRIMARY KEY,
      gardener_id INTEGER NOT NULL REFERENCES gardeners(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      peach_type TEXT DEFAULT '',
      basket INTEGER NOT NULL,
      kg_per_basket REAL NOT NULL,
      total_kg REAL NOT NULL,
      buy_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      buy_total REAL NOT NULL,
      sell_total REAL NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      gardener_id INTEGER NOT NULL REFERENCES gardeners(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      kg REAL NOT NULL,
      amount REAL NOT NULL,
      customer TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      gardener_id INTEGER NOT NULL REFERENCES gardeners(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_incomes_date ON incomes(date);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
  `);
}

module.exports = {
  pool,
  query,
  initDatabase
};