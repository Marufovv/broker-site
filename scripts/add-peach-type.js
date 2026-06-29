const db = require('../src/db');

try {
  db.prepare("ALTER TABLE incomes ADD COLUMN peach_type TEXT DEFAULT ''").run();
  console.log('✅ incomes jadvaliga peach_type ustuni qo‘shildi');
} catch (e) {
  if (String(e.message).includes('duplicate column name')) {
    console.log('ℹ️ peach_type ustuni oldindan bor');
  } else {
    console.error(e);
  }
}