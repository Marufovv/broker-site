const bcrypt = require('bcryptjs');
const db = require('../src/db');

async function main() {
  await db.initDatabase();

  const users = [
    ['iskandar', '744'],
    ['ulugbek', '708'],
    ['ozodbek', '055']
  ];

  for (const [username, password] of users) {
    const hash = bcrypt.hashSync(password, 10);

    await db.query(
      `
      INSERT INTO users(username, password_hash)
      VALUES($1, $2)
      ON CONFLICT(username)
      DO UPDATE SET password_hash = EXCLUDED.password_hash
      `,
      [username, hash]
    );
  }

  const countResult = await db.query('SELECT COUNT(*)::int AS c FROM gardeners');
  const count = countResult.rows[0].c;

  if (!count) {
    await db.query(
      'INSERT INTO gardeners(name, phone) VALUES($1, $2)',
      ['Abdulloh To‘xtayev', '+998 90 111 22 33']
    );

    await db.query(
      'INSERT INTO gardeners(name, phone) VALUES($1, $2)',
      ['Jahongir Qodirov', '+998 91 222 33 44']
    );
  }

  console.log('✅ PostgreSQL database tayyor');
  console.log('Loginlar: iskandar/744, ulugbek/708, ozodbek/055');

  await db.pool.end();
}

main().catch(err => {
  console.error('❌ Database init xatosi:', err);
  process.exit(1);
});