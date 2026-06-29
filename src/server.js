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
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  try {
    req.user = jwt.verify(t, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Avval login qiling' });
  }
}

app.post('/api/login', async (req, res, next) => {
  try {
    const body = z.object({
      username: z.string().min(1),
      password: z.string().min(1)
    }).parse(req.body);

    const result = await db.query(
      'SELECT * FROM users WHERE username=$1',
      [body.username.toLowerCase().trim()]
    );

    const u = result.rows[0];

    if (!u || !bcrypt.compareSync(body.password, u.password_hash)) {
      return res.status(401).json({ error: 'Login yoki parol xato' });
    }

    res.json({ token: tokenFor(u), user: { username: u.username } });
  } catch (e) {
    next(e);
  }
});

app.get('/api/me', auth, (req, res) => {
  res.json({ user: { username: req.user.username } });
});

app.get('/api/state', auth, async (req, res, next) => {
  try {
    const gardeners = await db.query('SELECT * FROM gardeners ORDER BY name');
    const incomes = await db.query('SELECT * FROM incomes ORDER BY date DESC, id DESC');
    const sales = await db.query('SELECT * FROM sales ORDER BY date DESC, id DESC');
    const payments = await db.query('SELECT * FROM payments ORDER BY date DESC, id DESC');

    res.json({
      gardeners: gardeners.rows,
      incomes: incomes.rows,
      sales: sales.rows,
      payments: payments.rows
    });
  } catch (e) {
    next(e);
  }
});

app.post('/api/gardeners', auth, async (req, res, next) => {
  try {
    const b = z.object({
      name: z.string().min(2),
      phone: z.string().optional().default('')
    }).parse(req.body);

    const result = await db.query(
      'INSERT INTO gardeners(name, phone) VALUES($1, $2) RETURNING *',
      [b.name.trim(), b.phone.trim()]
    );

    res.json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});

app.delete('/api/gardeners/:id', auth, async (req, res, next) => {
  try {
    await db.query('DELETE FROM gardeners WHERE id=$1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.post('/api/incomes', auth, async (req, res, next) => {
  try {
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

    const result = await db.query(`
      INSERT INTO incomes(
        gardener_id, date, peach_type, basket, kg_per_basket,
        total_kg, buy_price, sell_price, buy_total, sell_total, note
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
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
      b.note.trim()
    ]);

    res.json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});

app.delete('/api/incomes/:id', auth, async (req, res, next) => {
  try {
    await db.query('DELETE FROM incomes WHERE id=$1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.post('/api/sales', auth, async (req, res, next) => {
  try {
    const b = z.object({
      gardener_id: z.number(),
      date: z.string(),
      kg: z.number().nonnegative(),
      amount: z.number().nonnegative(),
      customer: z.string().optional().default('')
    }).parse(req.body);

    const result = await db.query(
      'INSERT INTO sales(gardener_id, date, kg, amount, customer) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [b.gardener_id, b.date, b.kg, b.amount, b.customer.trim()]
    );

    res.json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});

app.delete('/api/sales/:id', auth, async (req, res, next) => {
  try {
    await db.query('DELETE FROM sales WHERE id=$1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.post('/api/payments', auth, async (req, res, next) => {
  try {
    const b = z.object({
      gardener_id: z.number(),
      date: z.string(),
      amount: z.number().nonnegative(),
      note: z.string().optional().default('')
    }).parse(req.body);

    const result = await db.query(
      'INSERT INTO payments(gardener_id, date, amount, note) VALUES($1,$2,$3,$4) RETURNING *',
      [b.gardener_id, b.date, b.amount, b.note.trim()]
    );

    res.json(result.rows[0]);
  } catch (e) {
    next(e);
  }
});

app.delete('/api/payments/:id', auth, async (req, res, next) => {
  try {
    await db.query('DELETE FROM payments WHERE id=$1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
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

  res.status(500).json({ error: err.message || 'Server xatosi' });
});

async function start() {
  await db.initDatabase();
  app.listen(PORT, () => {
    console.log(`Broker server: http://localhost:${PORT}`);
  });
}

start();