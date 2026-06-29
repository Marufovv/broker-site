const $ = id => document.getElementById(id);

let db = { gardeners: [], incomes: [], sales: [], payments: [] };
let chart;
let gardenersChart;

const API = '';

function token() {
  return localStorage.getItem('brokerToken') || '';
}

async function api(path, opts = {}) {
  opts.headers = {
    ...(opts.headers || {}),
    'Content-Type': 'application/json'
  };

  if (token()) {
    opts.headers.Authorization = 'Bearer ' + token();
  }

  const response = await fetch(API + path, opts);
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json.error || 'Xatolik');
  }

  return json;
}

function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function money(n) {
  return Number(n || 0).toLocaleString('uz-UZ') + ' so‘m';
}

function num(n) {
  return Number(n || 0).toLocaleString('uz-UZ');
}

function selectedDate() {
  return $('globalDate')?.value || today();
}

function prevDate(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - 1);
  return x.toISOString().slice(0, 10);
}

function gardenerName(id) {
  return (db.gardeners.find(g => g.id == id) || {}).name || 'Noma’lum';
}

function mapIncome(x) {
  return {
    ...x,
    gardenerId: x.gardener_id ?? x.gardenerId,
    peachType: x.peach_type ?? x.peachType ?? '',
    kgPerBasket: x.kg_per_basket ?? x.kgPerBasket,
    totalKg: x.total_kg ?? x.totalKg,
    buyPrice: x.buy_price ?? x.buyPrice,
    sellPrice: x.sell_price ?? x.sellPrice,
    buyTotal: x.buy_total ?? x.buyTotal,
    sellTotal: x.sell_total ?? x.sellTotal
  };
}

function normalize() {
  db.gardeners = (db.gardeners || []).map(x => ({ ...x, id: Number(x.id) }));
  db.incomes = (db.incomes || []).map(mapIncome).map(x => ({
    ...x,
    id: Number(x.id),
    gardenerId: Number(x.gardenerId)
  }));
  db.sales = (db.sales || []).map(x => ({
    ...x,
    id: Number(x.id),
    gardenerId: Number(x.gardener_id ?? x.gardenerId)
  }));
  db.payments = (db.payments || []).map(x => ({
    ...x,
    id: Number(x.id),
    gardenerId: Number(x.gardener_id ?? x.gardenerId)
  }));
}

async function loadState() {
  db = await api('/api/state');
  normalize();
  renderAll();
}

async function login() {
  try {
    const username = $('loginInput').value.trim().toLowerCase();
    const password = $('passwordInput').value.trim();

    const result = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    localStorage.setItem('brokerToken', result.token);
    localStorage.setItem('brokerUser', result.user.username);

    await showApp();
  } catch (e) {
    $('loginError').textContent = e.message;
  }
}

function logout() {
  localStorage.removeItem('brokerToken');
  localStorage.removeItem('brokerUser');
  location.reload();
}

async function showApp() {
  if (!token()) return;

  $('loginPage').classList.add('hidden');
  $('app').classList.remove('hidden');
  $('userName').textContent = localStorage.getItem('brokerUser') || '';

  if ($('globalDate')) $('globalDate').value = today();

  ['incomeDate', 'saleDate', 'paymentDate'].forEach(id => {
    if ($(id)) $(id).value = today();
  });

  updateClock();
  await loadState();
}

document.querySelectorAll('.nav').forEach(button => {
  button.onclick = () => {
    document.querySelectorAll('.nav').forEach(x => x.classList.remove('active'));
    button.classList.add('active');

    document.querySelectorAll('.page').forEach(page => page.classList.remove('active-page'));
    $(button.dataset.page).classList.add('active-page');

    renderAll();
  };
});

function incomeBuyTotal() {
  return db.incomes.reduce((s, x) => s + Number(x.buyTotal || 0), 0);
}

function incomeSellTotal() {
  return db.incomes.reduce((s, x) => s + Number(x.sellTotal || 0), 0);
}

function paymentsTotal() {
  return db.payments.reduce((s, x) => s + Number(x.amount || 0), 0);
}

function gardenerIncome(gid) {
  return db.incomes.filter(x => x.gardenerId == gid);
}

function gardenerPayments(gid) {
  return db.payments.filter(x => x.gardenerId == gid);
}

function gardenerNeed(gid) {
  return gardenerIncome(gid).reduce((s, x) => s + Number(x.buyTotal || 0), 0);
}

function gardenerPaid(gid) {
  return gardenerPayments(gid).reduce((s, x) => s + Number(x.amount || 0), 0);
}

function gardenerSell(gid, date = null) {
  const incomeSell = db.incomes
    .filter(x => x.gardenerId == gid && (!date || x.date === date))
    .reduce((s, x) => s + Number(x.sellTotal || 0), 0);

  const realSales = db.sales
    .filter(x => x.gardenerId == gid && (!date || x.date === date))
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  return incomeSell + realSales;
}

async function addGardener(e) {
  e.preventDefault();

  try {
    const name = $('gName').value.trim();
    const phone = $('gPhone').value.trim();

    if (!name || name.length < 2) {
      alert('Bog‘bon ismini to‘liq kiriting');
      return;
    }

    await api('/api/gardeners', {
      method: 'POST',
      body: JSON.stringify({ name, phone })
    });

    e.target.reset();
    await loadState();

    alert('Bog‘bon qo‘shildi');
  } catch (err) {
    alert('Xatolik: ' + err.message);
    console.error(err);
  }
}

function calcIncomePreview() {
  const basket = +$('incomeBasket').value || 0;
  const kg = +$('incomeKgPerBasket').value || 0;
  const buyPrice = +$('incomeBuyPrice').value || 0;
  const sellPrice = +$('incomeSellPrice').value || 0;

  const totalKg = basket * kg;
  const buyTotal = totalKg * buyPrice;
  const sellTotal = totalKg * sellPrice;
  const profit = sellTotal - buyTotal;

  const peachType = $('incomePeachType') ? $('incomePeachType').value.trim() : '';

  $('incomePreview').innerHTML = `
    <b>Avtomatik hisob:</b>
    ${peachType ? `<b>${peachType}</b> | ` : ''}
    ${num(basket)} ta × ${num(kg)} kg =
    <b>${num(totalKg)} kg</b> |
    Bog‘bonga: <b>${money(buyTotal)}</b> |
    Sotuv: <b>${money(sellTotal)}</b> |
    Foyda: <b>${money(profit)}</b>
  `;
}

async function addIncome(e) {
  e.preventDefault();

  await api('/api/incomes', {
    method: 'POST',
    body: JSON.stringify({
      gardener_id: +$('incomeGardener').value,
      date: $('incomeDate').value,
      peach_type: $('incomePeachType') ? $('incomePeachType').value.trim() : '',
      basket: +$('incomeBasket').value,
      kg_per_basket: +$('incomeKgPerBasket').value,
      buy_price: +$('incomeBuyPrice').value,
      sell_price: +$('incomeSellPrice').value
    })
  });

  e.target.reset();

  if ($('incomeDate')) $('incomeDate').value = today();
  if ($('incomePreview')) $('incomePreview').innerHTML = '';

  await loadState();
}

async function addSale(e) {
  e.preventDefault();

  await api('/api/sales', {
    method: 'POST',
    body: JSON.stringify({
      gardener_id: +$('saleGardener').value,
      date: $('saleDate').value,
      kg: +$('saleKg').value,
      amount: +$('saleAmount').value,
      customer: $('saleCustomer').value
    })
  });

  e.target.reset();
  $('saleDate').value = today();

  await loadState();
}

async function addPayment(e) {
  e.preventDefault();

  await api('/api/payments', {
    method: 'POST',
    body: JSON.stringify({
      gardener_id: +$('paymentGardener').value,
      date: $('paymentDate').value,
      amount: +$('paymentAmount').value,
      note: $('paymentNote').value
    })
  });

  e.target.reset();
  $('paymentDate').value = today();

  await loadState();
}

async function del(type, id) {
  try {
    if (!confirm('O‘chirasizmi?')) return;

    await api('/api/' + type + '/' + id, { method: 'DELETE' });
    await loadState();
  } catch (err) {
    console.error('O‘chirish xatosi:', err);
    alert('O‘chirish xatosi: ' + err.message);
  }
}

function renderSelects() {
  ['incomeGardener', 'saleGardener', 'paymentGardener'].forEach(id => {
    if ($(id)) {
      $(id).innerHTML = db.gardeners
        .map(g => `<option value="${g.id}">${g.name}</option>`)
        .join('');
    }
  });
}

function table(rows, heads) {
  return `
    <table>
      <thead>
        <tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.join('') || `<tr><td colspan="${heads.length}">Ma’lumot yo‘q</td></tr>`}
      </tbody>
    </table>
  `;
}

function updateClock() {
  if (!$('todayText')) return;

  const now = new Date();

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');

  $('todayText').textContent = `${y}-${m}-${d} ${h}:${min}:${s}`;
}

function renderStats() {
  const d = selectedDate();

  const inc = db.incomes.filter(x => x.date === d);
  const sales = db.sales.filter(x => x.date === d);

  const buy = inc.reduce((s, x) => s + Number(x.buyTotal || 0), 0);
  const sell = inc.reduce((s, x) => s + Number(x.sellTotal || 0), 0)
             + sales.reduce((s, x) => s + Number(x.amount || 0), 0);
  const kg = inc.reduce((s, x) => s + Number(x.totalKg || 0), 0);

  $('statIncome').textContent = money(buy);
  $('statIncomeKg').textContent = num(kg) + ' kg';
  $('statSales').textContent = money(sell);
  $('statProfit').textContent = money(sell - buy);
  $('statGardeners').textContent = db.gardeners.length + ' nafar';

  const totalStockKg = db.incomes.reduce((s, x) => s + Number(x.totalKg || 0), 0)
                     - db.sales.reduce((s, x) => s + Number(x.kg || 0), 0);

  const totalBasket = db.incomes.reduce((s, x) => s + Number(x.basket || 0), 0);

  $('stockKg').textContent = num(totalStockKg) + ' kg';
  $('stockBasket').textContent = num(totalBasket) + ' ta';
  $('debtTotal').textContent = money(incomeBuyTotal());
  $('paidTotalFast').textContent = money(paymentsTotal());

  const typeMap = {};
  inc.forEach(x => {
    const type = x.peachType || 'Noma’lum';
    typeMap[type] = (typeMap[type] || 0) + Number(x.totalKg || 0);
  });

  const typeText = Object.entries(typeMap)
    .map(([type, kg]) => `${type}: ${num(kg)} kg`)
    .join(' | ');

  if ($('stockKg')) $('stockKg').title = typeText;

  updateClock();
}

function renderGardeners() {
  const d = selectedDate();
  const q = ($('gardenerSearch')?.value || '').toLowerCase();

  const rows = db.gardeners
    .filter(g => g.name.toLowerCase().includes(q) || String(g.phone).includes(q))
    .map(g => {
      const dayIncomes = db.incomes.filter(x => x.gardenerId == g.id && x.date === d);
      const daySales = db.sales.filter(x => x.gardenerId == g.id && x.date === d);
      const dayPayments = db.payments.filter(x => x.gardenerId == g.id && x.date === d);

      const dayTypes = [...new Set(dayIncomes.map(x => x.peachType || 'Noma’lum'))].join(', ') || '-';
      const dayKg = dayIncomes.reduce((s, x) => s + Number(x.totalKg || 0), 0);
      const dayBasket = dayIncomes.reduce((s, x) => s + Number(x.basket || 0), 0);
      const dayNeed = dayIncomes.reduce((s, x) => s + Number(x.buyTotal || 0), 0);
      const daySell = dayIncomes.reduce((s, x) => s + Number(x.sellTotal || 0), 0)
                    + daySales.reduce((s, x) => s + Number(x.amount || 0), 0);
      const dayPaid = dayPayments.reduce((s, x) => s + Number(x.amount || 0), 0);
      const dayLeft = dayNeed - dayPaid;

      return `
        <tr>
          <td>${g.name}<br><small>${g.phone || ''}</small></td>
          <td>${d}</td>
          <td>${dayTypes}</td>
          <td>${num(dayBasket)} ta</td>
          <td>${num(dayKg)} kg</td>
          <td>${money(daySell)}</td>
          <td>${money(dayNeed)}</td>
          <td>${money(dayPaid)}</td>
          <td>${money(dayLeft)}</td>
          <td><button onclick="del('gardeners',${g.id})">O‘chirish</button></td>
        </tr>
      `;
    });

  $('gardenersTable').innerHTML = table(rows, [
    'Bog‘bon',
    'Sana',
    'Shaftoli turi',
    'Korzinka',
    'Kirim kg',
    'Shu kungi savdo',
    'Berish kerak',
    'Berilgan',
    'Qoldiq',
    ''
  ]);

  const p = prevDate(d);
  let grow = 0;
  let down = 0;
  let best = { name: '-', v: 0 };
  let totalKg = 0;

  db.gardeners.forEach(g => {
    const cur = gardenerSell(g.id, d);
    const pr = gardenerSell(g.id, p);

    if (cur > pr) grow++;
    if (cur < pr) down++;
    if (cur > best.v) best = { name: g.name, v: cur };

    totalKg += db.incomes
      .filter(x => x.gardenerId == g.id && x.date === d)
      .reduce((s, x) => s + Number(x.totalKg || 0), 0);
  });

  $('topGardener').textContent = best.name;
  $('growCount').textContent = grow + ' ta';
  $('downCount').textContent = down + ' ta';
  $('avgKg').textContent = num(db.gardeners.length ? totalKg / db.gardeners.length : 0) + ' kg';

  $('gardenerAnalysis').innerHTML = `
    <div class="analysis-row">
      <span>${d} sanasi bo‘yicha tahlil</span>
      <small>Kechagi kunga nisbatan ${grow} ta bog‘bon savdosi oshgan, ${down} ta bog‘bon savdosi pasaygan.</small>
    </div>
    <div class="analysis-row">
      <span>Eng faol bog‘bon: ${best.name}</span>
      <small>Tanlangan kundagi savdo: ${money(best.v)}</small>
    </div>
  `;

  renderGardenersChart();
}

function renderIncome() {
  const rows = db.incomes.map(x => `
    <tr>
      <td>${x.date}</td>
      <td>${gardenerName(x.gardenerId)}</td>
      <td>${x.peachType || '-'}</td>
      <td>${num(x.basket)} ta</td>
      <td>${num(x.kgPerBasket)} kg</td>
      <td>${num(x.totalKg)} kg</td>
      <td>${money(x.buyPrice)}</td>
      <td>${money(x.buyTotal)}</td>
      <td>${money(x.sellTotal - x.buyTotal)}</td>
      <td><button onclick="del('incomes',${x.id})">O‘chirish</button></td>
    </tr>
  `);

  $('incomeTable').innerHTML = table(rows, [
    'Sana',
    'Bog‘bon',
    'Shaftoli turi',
    'Korzinka',
    '1 korzinka',
    'Jami kg',
    '1 kg narx',
    'Berish kerak',
    'Foyda',
    ''
  ]);

  const latestRows = db.incomes.slice(0, 5).map(x => `
    <tr>
      <td>${x.date}</td>
      <td>${gardenerName(x.gardenerId)}</td>
      <td>${x.peachType || '-'}</td>
      <td>${num(x.totalKg)} kg</td>
      <td>${money(x.buyTotal)}</td>
    </tr>
  `);

  $('latestIncome').innerHTML = table(latestRows, [
    'Sana',
    'Bog‘bon',
    'Turi',
    'Kg',
    'Summa'
  ]);
}

function renderSales() {
  const rows = db.sales.map(x => `
    <tr>
      <td>${x.date}</td>
      <td>${gardenerName(x.gardenerId)}</td>
      <td>${num(x.kg)} kg</td>
      <td>${money(x.amount)}</td>
      <td>${x.customer || ''}</td>
      <td><button onclick="del('sales',${x.id})">O‘chirish</button></td>
    </tr>
  `);

  $('salesTable').innerHTML = table(rows, [
    'Sana',
    'Bog‘bon',
    'Kg',
    'Summa',
    'Xaridor',
    ''
  ]);
}

function renderPayments() {
  const d = selectedDate();
  const day = db.payments.filter(x => x.date === d);

  $('dayPaid').textContent = money(day.reduce((s, x) => s + Number(x.amount || 0), 0));
  $('allPaid').textContent = money(paymentsTotal());
  $('paidPeople').textContent = new Set(day.map(x => x.gardenerId)).size + ' nafar';
  $('paymentCount').textContent = day.length + ' ta';

  const rows = db.payments.map(x => `
    <tr>
      <td>${x.date}</td>
      <td>${gardenerName(x.gardenerId)}</td>
      <td>${money(x.amount)}</td>
      <td>${x.note || ''}</td>
      <td><button onclick="del('payments',${x.id})">O‘chirish</button></td>
    </tr>
  `);

  $('paymentsTable').innerHTML = table(rows, [
    'Sana',
    'Kimga',
    'Berilgan pul',
    'Izoh',
    ''
  ]);
}

function renderDebts() {
  const d = selectedDate();

  const dayNeed = db.incomes
    .filter(x => x.date === d)
    .reduce((s, x) => s + Number(x.buyTotal || 0), 0);

  const dayPaid = db.payments
    .filter(x => x.date === d)
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const dayLeft = dayNeed - dayPaid;

  $('debtNeedKpi').textContent = money(dayNeed);
  $('debtPaidKpi').textContent = money(dayPaid);
  $('debtLeftKpi').textContent = money(dayLeft);
  $('moneyTurnoverKpi').textContent = money(dayPaid);

  const rows = db.gardeners.map(g => {
    const incomes = db.incomes.filter(x => x.gardenerId == g.id && x.date === d);
    const payments = db.payments.filter(x => x.gardenerId == g.id && x.date === d);

    const types = [...new Set(incomes.map(x => x.peachType || 'Noma’lum'))].join(', ') || '-';
    const basket = incomes.reduce((s, x) => s + Number(x.basket || 0), 0);
    const kg = incomes.reduce((s, x) => s + Number(x.totalKg || 0), 0);
    const need = incomes.reduce((s, x) => s + Number(x.buyTotal || 0), 0);
    const paid = payments.reduce((s, x) => s + Number(x.amount || 0), 0);
    const left = need - paid;

    return `
      <tr>
        <td>${g.name}</td>
        <td>${d}</td>
        <td>${types}</td>
        <td>${num(basket)} ta</td>
        <td>${num(kg)} kg</td>
        <td>${money(need)}</td>
        <td>${money(paid)}</td>
        <td>${money(left)}</td>
        <td>${left <= 0 ? 'Yopilgan' : 'Qarz bor'}</td>
      </tr>
    `;
  });

  $('debtsTable').innerHTML = table(rows, [
    'Bog‘bon',
    'Sana',
    'Shaftoli turi',
    'Korzinka',
    'Kg',
    'Shu kungi berish kerak',
    'Shu kungi berilgan',
    'Shu kungi qoldiq',
    'Holat'
  ]);
}

function renderReports() {
  const d = selectedDate();
  const inc = db.incomes.filter(x => x.date === d);
  const sales = db.sales.filter(x => x.date === d);
  const pay = db.payments.filter(x => x.date === d);

  const buy = inc.reduce((s, x) => s + Number(x.buyTotal || 0), 0);
  const sell = inc.reduce((s, x) => s + Number(x.sellTotal || 0), 0)
             + sales.reduce((s, x) => s + Number(x.amount || 0), 0);
  const paid = pay.reduce((s, x) => s + Number(x.amount || 0), 0);
  const kg = inc.reduce((s, x) => s + Number(x.totalKg || 0), 0);

  const typeMap = {};
  inc.forEach(x => {
    const type = x.peachType || 'Noma’lum';
    typeMap[type] = (typeMap[type] || 0) + Number(x.totalKg || 0);
  });

  const typeText = Object.entries(typeMap)
    .map(([type, kg]) => `${type}: ${num(kg)} kg`)
    .join('<br>') || 'Ma’lumot yo‘q';

  $('reportBox').innerHTML = `
    <div class="report-card"><b>Sana</b><h3>${d}</h3></div>
    <div class="report-card"><b>Kirim kg</b><h3>${num(kg)} kg</h3></div>
    <div class="report-card"><b>Berish kerak</b><h3>${money(buy)}</h3></div>
    <div class="report-card"><b>Sotuv</b><h3>${money(sell)}</h3></div>
    <div class="report-card"><b>To‘lov</b><h3>${money(paid)}</h3></div>
    <div class="report-card"><b>Foyda</b><h3>${money(sell - buy)}</h3></div>
    <div class="report-card"><b>Shaftoli turlari</b><h3 style="font-size:16px">${typeText}</h3></div>
  `;
}

function renderCalendar() {
  const d = new Date(selectedDate());
  const y = d.getFullYear();
  const m = d.getMonth();
  const first = new Date(y, m, 1).getDay() || 7;
  const last = new Date(y, m + 1, 0).getDate();

  let html = `
    <div class="cal-title">${d.toLocaleString('uz-UZ', { month: 'long', year: 'numeric' })}</div>
    <div class="cal-grid">
      ${['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map(x => `<b>${x}</b>`).join('')}
  `;

  for (let i = 1; i < first; i++) html += '<span></span>';

  for (let day = 1; day <= last; day++) {
    const val = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    html += `<button class="${val === selectedDate() ? 'sel' : ''}" onclick="$('globalDate').value='${val}';renderAll()">${day}</button>`;
  }

  $('calendarBox').innerHTML = html + '</div>';
}

function last7() {
  const d = new Date(selectedDate());

  return [...Array(7)].map((_, i) => {
    const x = new Date(d);
    x.setDate(d.getDate() - 6 + i);
    return x.toISOString().slice(0, 10);
  });
}

function renderMainChart() {
  const labels = last7();

  const inc = labels.map(d =>
    db.incomes
      .filter(x => x.date === d)
      .reduce((s, x) => s + Number(x.buyTotal || 0), 0)
  );

  const sell = labels.map(d =>
    db.incomes
      .filter(x => x.date === d)
      .reduce((s, x) => s + Number(x.sellTotal || 0), 0)
    + db.sales
      .filter(x => x.date === d)
      .reduce((s, x) => s + Number(x.amount || 0), 0)
  );

  if (chart) chart.destroy();

  chart = new Chart($('mainChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Kirim', data: inc },
        { label: 'Sotuv', data: sell }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true
    }
  });
}

function renderGardenersChart() {
  const d = selectedDate();
  const labels = db.gardeners.map(g => g.name);
  const data = db.gardeners.map(g =>
    db.incomes
      .filter(x => x.gardenerId == g.id && x.date === d)
      .reduce((s, x) => s + Number(x.totalKg || 0), 0)
  );

  if (gardenersChart) gardenersChart.destroy();

  gardenersChart = new Chart($('gardenersChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Tanlangan kundagi kg',
          data,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true
    }
  });
}

function renderAll() {
  renderSelects();
  renderStats();
  renderGardeners();
  renderIncome();
  renderSales();
  renderPayments();
  renderDebts();
  renderReports();
  renderCalendar();
  renderMainChart();
}

setInterval(updateClock, 1000);

if (token()) {
  showApp();
}
