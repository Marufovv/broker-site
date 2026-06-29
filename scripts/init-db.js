const bcrypt = require('bcryptjs');
const db = require('../src/db');

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some(col => col.name === columnName);
}

function addColumnIfMissing(tableName, columnDefinition) {
  const columnName = columnDefinition.split(' ')[0];

  if (!columnExists(tableName, columnName)) {
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`).run();
    console.log(`✅ ${tableName}.${columnName} qo‘shildi`);
  } else {
    console.log(`ℹ️ ${tableName}.${columnName} oldindan bor`);
  }
}

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS gardeners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS incomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gardener_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    peach_type TEXT DEFAULT '',
    basket REAL DEFAULT 0,
    kg_per_basket REAL DEFAULT 0,
    total_kg REAL DEFAULT 0,
    buy_price REAL DEFAULT 0,
    sell_price REAL DEFAULT 0,
    buy_total REAL DEFAULT 0,
    sell_total REAL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gardener_id) REFERENCES gardeners(id)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gardener_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    kg REAL DEFAULT 0,
    amount REAL DEFAULT 0,
    customer TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gardener_id) REFERENCES gardeners(id)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gardener_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount REAL DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (gardener_id) REFERENCES gardeners(id)
  )
`).run();

/*
  Eski database bo‘lsa, CREATE TABLE yangi ustunni qo‘shmaydi.
  Shuning uchun kerakli ustunlar yetishmasa, ALTER TABLE bilan qo‘shamiz.
*/
addColumnIfMissing('incomes', 'peach_type TEXT DEFAULT ""');
addColumnIfMissing('incomes', 'note TEXT DEFAULT ""');
addColumnIfMissing('gardeners', 'phone TEXT DEFAULT ""');
addColumnIfMissing('sales', 'customer TEXT DEFAULT ""');
addColumnIfMissing('payments', 'note TEXT DEFAULT ""');

const users = [
  ['iskandar', '744'],
  ['ulugbek', '708'],
  ['ozodbek', '055']
];

for (const [username, password] of users) {
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users(username, password_hash)
    VALUES(?, ?)
    ON CONFLICT(username)
    DO UPDATE SET password_hash = excluded.password_hash
  `).run(username, hash);
}

const count = db.prepare('SELECT COUNT(*) c FROM gardeners').get().c;

if (!count) {
  const insertGardener = db.prepare(`
    INSERT INTO gardeners(name, phone)
    VALUES(?, ?)
  `);

  insertGardener.run('Abdulloh To‘xtayev', '+998 90 111 22 33');
  insertGardener.run('Jahongir Qodirov', '+998 91 222 33 44');
}

console.log('✅ Database tayyor');
console.log('Loginlar: iskandar/744, ulugbek/708, ozodbek/055');