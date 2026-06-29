# Broker Hisob Dashboard

To‘q qizil va qaymoq rangli broker hisob-kitob sayti. Backend Express + SQLite, frontend esa oddiy HTML/CSS/JS.

## Loginlar
- iskandar / 744
- ulugbek / 708
- ozodbek / 055

## Ishga tushirish
```bash
npm install
cp .env.example .env
npm run init-db
npm start
```
Brauzerda: `http://localhost:3000`

## Deploy
Node.js 20+ qo‘llaydigan serverga yuklang. `.env` faylda `JWT_SECRET` ni albatta uzun maxfiy kalitga almashtiring. SQLite fayl `data/broker.sqlite` ichida saqlanadi. Serverda shu papkaga yozish ruxsati bo‘lishi kerak.

## Muhim
Bu tayyor ishlaydigan backend. Ma’lumotlar localStorage emas, backend database ichida saqlanadi. Production uchun HTTPS, kuchli server parollari va doimiy backup qilish tavsiya qilinadi.
