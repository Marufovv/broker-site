const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const path = require('path');
const db = require('./db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));
app.use(express.static(path.join(__dirname, '..', 'public')));

function tokenFor(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';

  try {
    req.user = jwt.verify(t, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Avval login qiling' });
  }
}

function all(sql, args = []) {
  return db.prepare(sql).all(...args);
}

function run(sql, args = []) {
  const r = db.prepare(sql).run(...args);
  return r.lastInsertRowid;
}

app.post('/api/login', (req, res) => {
  const body = z.object({
    username: z.string().min(1),
    password: z.string().min(1)
  }).parse(req.body);

  const u = db.prepare('SELECT * FROM users WHERE username=?')
    .get(body.username.toLowerCase().trim());

  if (!u || !bcrypt.compareSync(body.password, u.password_hash)) {
    return res.status(401).json({ error: 'Login yoki parol xato' });
  }

  res.json({
    token: tokenFor(u),
    user: { username: u.username }
  });
});

app.get('/api/me', auth, (req, res) => {
  res.json({ user: { username: req.user.username } });
});

app.get('/api/state', auth, (req, res) => {
  res.json({
    gardeners: all('SELECT * FROM gardeners ORDER BY name'),
    incomes: all('SELECT * FROM incomes ORDER BY date DESC, id DESC'),
    sales: all('SELECT * FROM sales ORDER BY date DESC, id DESC'),
    payments: all('SELECT * FROM payments ORDER BY date DESC, id DESC')
  });
});

app.post('/api/gardeners', auth, (req, res) => {
  try {
    const b = z.object({
      name: z.string().min(2),
      phone: z.string().optional().default('')
    }).parse(req.body);

    const id = run(
      'INSERT INTO gardeners(name, phone) VALUES(?, ?)',
      [b.name.trim(), b.phone.trim()]
    );

    res.json(db.prepare('SELECT * FROM gardeners WHERE id=?').get(id));
  } catch (e) {
    console.error('Bog‘bon qo‘shish xatosi:', e);
    res.status(400).json({ error: 'Bog‘bon ma’lumoti noto‘g‘ri kiritildi' });
  }
});

app.delete('/api/gardeners/:id', auth, (req, res) => {
  db.prepare('DELETE FROM gardeners WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/incomes', auth, (req, res) => {
  const b = z.object({
    gardener_id: z.number(),
    date: z.string(),
    peach_type: z.string().optional().default(''),
    basket: z.number().nonnegative(),
    kg_per_basket: z.number().nonnegative(),
    buy_price: z.number().nonnegative(),
    sell_price: z.number().nonnegative(),
    note: z.string().optional().default('')
  }).parse(req.body);

  const total_kg = b.basket * b.kg_per_basket;
  const buy_total = total_kg * b.buy_price;
  const sell_total = total_kg * b.sell_price;

  const id = run(
    `
    INSERT INTO incomes(
      gardener_id,
      date,
      peach_type,
      basket,
      kg_per_basket,
      total_kg,
      buy_price,
      sell_price,
      buy_total,
      sell_total,
      note
    )
    VALUES(?,?,?,?,?,?,?,?,?,?,?)
    `,
    [
      b.gardener_id,
      b.date,
      b.peach_type.trim(),
      b.basket,
      b.kg_per_basket,
      total_kg,
      b.buy_price,
      b.sell_price,
      buy_total,
      sell_total,
      b.note
    ]
  );

  res.json(db.prepare('SELECT * FROM incomes WHERE id=?').get(id));
});

app.delete('/api/incomes/:id', auth, (req, res) => {
  db.prepare('DELETE FROM incomes WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/sales', auth, (req, res) => {
  const b = z.object({
    gardener_id: z.number(),
    date: z.string(),
    kg: z.number().nonnegative(),
    amount: z.number().nonnegative(),
    customer: z.string().optional().default('')
  }).parse(req.body);

  const id = run(
    'INSERT INTO sales(gardener_id, date, kg, amount, customer) VALUES(?,?,?,?,?)',
    [b.gardener_id, b.date, b.kg, b.amount, b.customer.trim()]
  );

  res.json(db.prepare('SELECT * FROM sales WHERE id=?').get(id));
});

app.delete('/api/sales/:id', auth, (req, res) => {
  db.prepare('DELETE FROM sales WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.post('/api/payments', auth, (req, res) => {
  const b = z.object({
    gardener_id: z.number(),
    date: z.string(),
    amount: z.number().nonnegative(),
    note: z.string().optional().default('')
  }).parse(req.body);

  const id = run(
    'INSERT INTO payments(gardener_id, date, amount, note) VALUES(?,?,?,?)',
    [b.gardener_id, b.date, b.amount, b.note.trim()]
  );

  res.json(db.prepare('SELECT * FROM payments WHERE id=?').get(id));
});

app.delete('/api/gardeners/:id', auth, (req, res) => {
  try {
    const id = Number(req.params.id);

    db.prepare('PRAGMA foreign_keys = OFF').run();

    db.prepare('DELETE FROM payments WHERE gardener_id = ?').run(id);
    db.prepare('DELETE FROM sales WHERE gardener_id = ?').run(id);
    db.prepare('DELETE FROM incomes WHERE gardener_id = ?').run(id);
    db.prepare('DELETE FROM gardeners WHERE id = ?').run(id);

    db.prepare('PRAGMA foreign_keys = ON').run();

    res.json({ ok: true });
  } catch (e) {
    console.error('Bog‘bon o‘chirish xatosi:', e);
    res.status(500).json({ error: e.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Ma’lumot noto‘g‘ri kiritildi',
      details: err.errors
    });
  }

  res.status(500).json({ error: 'Server xatosi' });
});

app.listen(PORT, () => {
  console.log(`Broker server: http://localhost:${PORT}`);
});