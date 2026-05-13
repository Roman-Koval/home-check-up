// =====================
// DATA
// =====================
const DATA = {
  properties: [
    { id: 1, address: 'Germasogeia, Limassol', type: 'villa', icon: '🏖️', client: 'Иванов И.И.', country: '🇷🇺 Россия', tariff: 'Premium', price: 100, status: 'ok', lastVisit: '2 мая', nextVisit: '16 мая', notes: 'Бассейн, пальмы, 3 ванные' },
    { id: 2, address: 'Coral Bay, Paphos', type: 'villa', icon: '🌴', client: 'Hans Müller', country: '🇩🇪 Германия', tariff: 'Standard', price: 75, status: 'warning', lastVisit: '28 апр', nextVisit: '15 мая', notes: 'Нужна проверка крыши' },
    { id: 3, address: 'Old Town, Nicosia', type: 'apt', icon: '🏛️', client: 'Anna Schmidt', country: '🇦🇹 Австрия', tariff: 'Basic', price: 50, status: 'ok', lastVisit: '5 мая', nextVisit: '19 мая', notes: '2-й этаж, исторический центр' },
    { id: 4, address: 'Finikoudes, Larnaca', type: 'apt', icon: '⚓', client: 'Petrov S.A.', country: '🇺🇦 Украина', tariff: 'Standard', price: 75, status: 'issue', lastVisit: '20 апр', nextVisit: 'Срочно!', notes: 'Обнаружена протечка' },
    { id: 5, address: 'Kato Paphos', type: 'studio', icon: '🌊', client: 'Marie Dupont', country: '🇫🇷 Франция', tariff: 'Basic', price: 50, status: 'ok', lastVisit: '6 мая', nextVisit: '20 мая', notes: 'Вид на море, студия 45м²' },
    { id: 6, address: 'Ayia Napa, Famagusta', type: 'apt', icon: '🏄', client: 'John Smith', country: '🇬🇧 Великобритания', tariff: 'Premium', price: 100, status: 'ok', lastVisit: '4 мая', nextVisit: '18 мая', notes: 'Пентхаус, джакузи' },
  ],

  visits: [
    { id: 1, propId: 1, date: '2026-05-16', type: 'Плановый осмотр', status: 'planned', tasks: ['Проветривание', 'Полив', 'Фото', 'Проверка счетов', 'Уборка бассейна'] },
    { id: 2, propId: 2, date: '2026-05-15', type: 'Срочный выезд', status: 'urgent', tasks: ['Осмотр крыши', 'Фото/Видео', 'Акт'] },
    { id: 3, propId: 3, date: '2026-05-19', type: 'Плановый осмотр', status: 'planned', tasks: ['Проветривание', 'Фото', 'Проверка счетов'] },
    { id: 4, propId: 4, date: '2026-05-14', type: 'Аварийный', status: 'issue', tasks: ['Слесарь', 'Фото/Видео', 'Акт протечки', 'Уведомление клиента'] },
    { id: 5, propId: 5, date: '2026-05-20', type: 'Плановый осмотр', status: 'planned', tasks: ['Проветривание', 'Полив', 'Фото'] },
    { id: 6, propId: 6, date: '2026-05-18', type: 'Плановый осмотр', status: 'planned', tasks: ['Проветривание', 'Джакузи', 'Фото'] },
    { id: 7, propId: 1, date: '2026-05-02', type: 'Плановый осмотр', status: 'done', tasks: ['Проветривание', 'Полив', 'Фото', 'Проверка счетов'] },
    { id: 8, propId: 3, date: '2026-05-05', type: 'Плановый осмотр', status: 'done', tasks: ['Проветривание', 'Фото'] },
  ],

  reports: [
    { id: 1, visitId: 7, propId: 1, date: '2026-05-02', photos: 8, hasVideo: true, note: 'Всё в норме. Растения политы. Счёт за воду €24. Никаких проблем.', tgSent: true, checks: ['ok','ok','ok','ok','ok'] },
    { id: 2, visitId: 8, propId: 3, date: '2026-05-05', photos: 5, hasVideo: false, note: 'Проветривание выполнено. Замечен небольшой конденсат в ванной — рекомендовано улучшить вентиляцию.', tgSent: true, checks: ['ok','ok','warning','ok'] },
    { id: 3, visitId: 2, propId: 2, date: '2026-04-28', photos: 12, hasVideo: true, note: 'Обнаружено повреждение черепицы 3 фрагмента. Требуется ремонт до сезона дождей.', tgSent: true, checks: ['ok','issue','ok','ok'] },
    { id: 4, visitId: 4, propId: 4, date: '2026-05-14', photos: 15, hasVideo: true, note: 'ПРОТЕЧКА под раковиной на кухне. Перекрыта вода. Вызван сантехник. Требуется ремонт.', tgSent: false, checks: ['issue','ok','ok'] },
  ],

  clients: [
    { id: 1, name: 'Иванов И.И.', country: '🇷🇺 Россия', phone: '+7 916 123 4567', tg: '@ivanov_cyprus', props: 1, monthly: 100, color: '#4fc3a1' },
    { id: 2, name: 'Hans Müller', country: '🇩🇪 Германия', phone: '+49 89 1234567', tg: '@hmuller', props: 1, monthly: 75, color: '#f0a500' },
    { id: 3, name: 'Anna Schmidt', country: '🇦🇹 Австрия', phone: '+43 1 2345678', tg: '@anna_schmidt_at', props: 1, monthly: 50, color: '#9b8db0' },
    { id: 4, name: 'Petrov S.A.', country: '🇺🇦 Украина', phone: '+380 67 1234567', tg: '@petrov_ua', props: 1, monthly: 75, color: '#5e81ff' },
    { id: 5, name: 'Marie Dupont', country: '🇫🇷 Франция', phone: '+33 6 12 34 56 78', tg: '@marie_d', props: 1, monthly: 50, color: '#e05c5c' },
    { id: 6, name: 'John Smith', country: '🇬🇧 Великобритания', phone: '+44 7700 900000', tg: '@jsmith_cy', props: 1, monthly: 100, color: '#c9a84c' },
  ],

  invoices: [
    { num: 'INV-2026-014', client: 'Иванов И.И.', period: 'Май 2026', amount: 100, status: 'paid' },
    { num: 'INV-2026-013', client: 'Hans Müller', period: 'Май 2026', amount: 75, status: 'pending' },
    { num: 'INV-2026-012', client: 'Anna Schmidt', period: 'Май 2026', amount: 50, status: 'paid' },
    { num: 'INV-2026-011', client: 'Petrov S.A.', period: 'Май 2026', amount: 75, status: 'overdue' },
    { num: 'INV-2026-010', client: 'Marie Dupont', period: 'Май 2026', amount: 50, status: 'pending' },
    { num: 'INV-2026-009', client: 'John Smith', period: 'Май 2026', amount: 100, status: 'paid' },
  ],

  notifications: [
    { msg: '⚠️ Протечка обнаружена — Larnaca, Finikoudes', time: 'Только что', color: '#e05c5c', read: false },
    { msg: '📋 Новый отчёт готов — Limassol, Germasogeia', time: '2 часа назад', color: '#4fc3a1', read: false },
    { msg: '📅 Визит завтра — Coral Bay, Paphos', time: '5 часов назад', color: '#f0a500', read: false },
    { msg: '✅ Счёт оплачен — Anna Schmidt', time: 'Вчера', color: '#4fc3a1', read: true },
  ],
};

// =====================
// STATE
// =====================
let currentPage = 'dashboard';
let calDate = new Date(2026, 4, 1); // May 2026
let tgConnected = false;
let notifyOpen = false;

// =====================
// INIT
// =====================
window.addEventListener('DOMContentLoaded', () => {
  // Splash
  setTimeout(() => {
    document.getElementById('splash').style.opacity = '0';
    document.getElementById('splash').style.transition = 'opacity 0.4s';
    setTimeout(() => {
      document.getElementById('splash').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      initApp();
    }, 400);
  }, 2000);
});

function initApp() {
  updateHeroDate();
  animateKPIs();
  renderUpcomingVisits();
  renderRecentReports();
  renderProperties();
  renderCalendar();
  renderVisitsDetailed();
  renderReportsGrid();
  renderClients();
  renderInvoices();
  renderBarChart();
  populateVisitPropertySelect();
  bindEvents();
}

// =====================
// HERO DATE
// =====================
function updateHeroDate() {
  const d = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('heroDate').textContent = d.toLocaleDateString('ru-RU', opts);
}

// =====================
// KPI ANIMATION
// =====================
function animateKPIs() {
  document.querySelectorAll('[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    let current = 0;
    const step = Math.ceil(target / 25);
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(interval);
    }, 40);
  });
}

// =====================
// NAVIGATION
// =====================
function bindEvents() {
  // Nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
      closeSidebar();
    });
  });

  // Sidebar toggle
  document.getElementById('menuBtn').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('overlay').addEventListener('click', closeSidebar);

  // Add button
  document.getElementById('addBtn').addEventListener('click', openAddModal);
  // FAB
  const fab = document.createElement('button');
  fab.className = 'fab'; fab.textContent = '+';
  fab.addEventListener('click', openAddModal);
  document.body.appendChild(fab);

  // Modals close buttons
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });

  // Save visit
  document.getElementById('saveVisit').addEventListener('click', saveVisit);

  // Save property
  document.getElementById('saveProperty').addEventListener('click', saveProperty);

  // Send report to TG
  document.getElementById('sendReportTg').addEventListener('click', () => {
    closeModal('reportModal');
    showToast('✈ Отчёт отправлен в Telegram!');
    addLogEntry('success', '✓ Отчёт отправлен → клиенту');
  });

  // Notify button
  document.getElementById('notifyBtn').addEventListener('click', toggleNotify);

  // Notify clear
  document.getElementById('notifyClear').addEventListener('click', clearNotifications);

  // Close notify on outside click
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifyPanel');
    const btn = document.getElementById('notifyBtn');
    if (notifyOpen && !panel.contains(e.target) && !btn.contains(e.target)) {
      toggleNotify();
    }
  });

  // Calendar nav
  document.getElementById('calPrev').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); renderVisitsDetailed(); });
  document.getElementById('calNext').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); renderVisitsDetailed(); });

  // Property filter chips
  document.querySelectorAll('.chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderProperties(chip.dataset.filter);
    });
  });

  // Property search
  document.getElementById('propSearch').addEventListener('input', (e) => {
    renderProperties('all', e.target.value);
  });

  // Telegram
  document.getElementById('tgSaveToken').addEventListener('click', () => {
    const token = document.getElementById('tgToken').value.trim();
    if (token) {
      tgConnected = true;
      document.getElementById('tgDot').classList.add('online');
      document.getElementById('tgStatusLabel').textContent = 'Бот подключён';
      document.getElementById('tgStatusSub').textContent = '@CyprusGuardBot · Активен';
      document.getElementById('tgToggle').textContent = 'Отключить';
      showToast('✅ Telegram бот подключён!');
      addLogEntry('success', '✓ Бот успешно авторизован');
    } else { showToast('Введите токен бота'); }
  });

  document.getElementById('tgToggle').addEventListener('click', () => {
    if (tgConnected) {
      tgConnected = false;
      document.getElementById('tgDot').classList.remove('online');
      document.getElementById('tgStatusLabel').textContent = 'Бот отключён';
      document.getElementById('tgStatusSub').textContent = 'Введите токен для активации';
      document.getElementById('tgToggle').textContent = 'Подключить';
      showToast('Бот отключён');
    } else {
      document.getElementById('tgToken').focus();
    }
  });

  document.getElementById('tgTestSend').addEventListener('click', () => {
    const client = document.getElementById('tgTestClient').value;
    if (client.includes('Выберите')) { showToast('Выберите клиента'); return; }
    showToast('📤 Тестовое сообщение отправлено!');
    addLogEntry('info', `ℹ Тест отправлен → ${client.split(' — ')[0]}`);
  });

  // Notifications
  renderNotifications();
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  currentPage = page;
  const titles = { dashboard: 'Дашборд', properties: 'Объекты', visits: 'Визиты', reports: 'Отчёты', clients: 'Клиенты', telegram: 'Telegram Bot', billing: 'Финансы', settings: 'Настройки' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
}

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

// =====================
// UPCOMING VISITS
// =====================
function renderUpcomingVisits() {
  const container = document.getElementById('upcomingVisits');
  const upcoming = DATA.visits.filter(v => v.status !== 'done').slice(0, 4);
  container.innerHTML = upcoming.map(v => {
    const prop = DATA.properties.find(p => p.id === v.propId);
    const d = new Date(v.date);
    const day = d.getDate();
    const mon = d.toLocaleString('ru-RU', { month: 'short' });
    const statusClass = { planned: 'status-planned', urgent: 'status-urgent', issue: 'status-issue' }[v.status] || 'status-planned';
    const statusLabel = { planned: 'Запланирован', urgent: 'Срочно', issue: 'Проблема', done: 'Выполнен' }[v.status];
    return `
    <div class="visit-item" onclick="openVisit(${v.id})">
      <div class="visit-date">
        <div class="visit-day">${day}</div>
        <div class="visit-mon">${mon}</div>
      </div>
      <div class="visit-info">
        <div class="visit-addr">${prop?.address || '—'}</div>
        <div class="visit-client">${prop?.client || ''} · ${v.type}</div>
        <div class="visit-tasks">${v.tasks.slice(0,3).map(t => `<span class="task-chip">${t}</span>`).join('')}${v.tasks.length > 3 ? `<span class="task-chip">+${v.tasks.length-3}</span>` : ''}</div>
      </div>
      <div class="visit-status"><span class="status-badge ${statusClass}">${statusLabel}</span></div>
    </div>`;
  }).join('');
}

function openVisit(id) {
  const visit = DATA.visits.find(v => v.id === id);
  if (!visit) return;
  const prop = DATA.properties.find(p => p.id === visit.propId);
  showToast(`📋 Визит: ${prop?.address}`);
}

// =====================
// RECENT REPORTS
// =====================
function renderRecentReports() {
  const container = document.getElementById('recentReports');
  container.innerHTML = DATA.reports.slice(0, 3).map(r => renderReportItem(r)).join('');
}

function renderReportItem(r) {
  const prop = DATA.properties.find(p => p.id === r.propId);
  const icons = ['🛋️','🚿','🌿','🔌','💧'];
  return `
  <div class="report-item" onclick="openReport(${r.id})">
    <div class="report-thumb">
      ${icons[r.id % icons.length]}
      ${r.photos ? `<div class="report-thumb-count">📷${r.photos}</div>` : ''}
    </div>
    <div class="report-info">
      <div class="report-addr">${prop?.address || '—'}</div>
      <div class="report-date">${formatDate(r.date)} · ${prop?.client}</div>
      <div class="report-meta">
        <span class="report-chip photo">📷 ${r.photos} фото</span>
        ${r.hasVideo ? '<span class="report-chip video">🎥 видео</span>' : ''}
        ${r.tgSent ? '<span class="report-chip">✈ отправлен</span>' : '<span class="report-chip" style="color:var(--red)">⚠ не отправлен</span>'}
      </div>
    </div>
    ${r.tgSent ? '<div class="report-sent">✓ TG</div>' : ''}
  </div>`;
}

function openReport(id) {
  const r = DATA.reports.find(rep => rep.id === id);
  if (!r) return;
  const prop = DATA.properties.find(p => p.id === r.propId);
  document.getElementById('reportModalTitle').textContent = `Отчёт — ${prop?.address}`;
  const checkLabels = ['Состояние квартиры', 'Проветривание', 'Полив растений', 'Проверка счетов', 'Фиксация дефектов'];
  const checkIcons = { ok: '✅', warning: '⚠️', issue: '❌' };
  document.getElementById('reportModalBody').innerHTML = `
    <div class="report-section">
      <div class="report-section-title">Дата визита</div>
      <div style="font-size:14px;color:var(--text2)">${formatDate(r.date)} · ${prop?.client} · ${prop?.country}</div>
    </div>
    <div class="report-section">
      <div class="report-section-title">Чек-лист</div>
      <div class="checklist-done">
        ${(r.checks || []).map((s, i) => `
          <div class="check-item ${s}">
            <span class="check-icon">${checkIcons[s]}</span>
            ${checkLabels[i] || `Пункт ${i+1}`}
          </div>`).join('')}
      </div>
    </div>
    <div class="report-section">
      <div class="report-section-title">Фото (${r.photos})</div>
      <div class="photo-grid">
        ${Array.from({length: Math.min(r.photos, 6)}).map((_, i) => `
          <div class="photo-thumb" onclick="showToast('📷 Фото ${i+1}')">
            ${['🛋️','🚿','🌿','🔌','💧','🪟'][i % 6]}
          </div>`).join('')}
      </div>
    </div>
    ${r.hasVideo ? `<div class="report-section"><div class="report-section-title">Видео</div><div class="photo-thumb" style="width:100%;height:80px;border-radius:var(--radius2)" onclick="showToast('🎥 Видео-тур квартиры')">🎥 Видео-отчёт</div></div>` : ''}
    <div class="report-section">
      <div class="report-section-title">Комментарий агента</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.6">${r.note}</div>
    </div>
  `;
  openModal('reportModal');
}

// =====================
// PROPERTIES
// =====================
function renderProperties(filter = 'all', search = '') {
  const grid = document.getElementById('propertiesGrid');
  let props = DATA.properties;
  if (filter !== 'all') props = props.filter(p => p.status === filter);
  if (search) props = props.filter(p => p.address.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase()));
  const statusColors = { ok: 'var(--teal)', warning: 'var(--orange)', issue: 'var(--red)' };
  const statusLabel = { ok: 'Норма', warning: 'Внимание', issue: 'Проблема' };
  grid.innerHTML = props.map(p => `
    <div class="property-card" onclick="showPropertyDetail(${p.id})" style="border-left: 3px solid ${statusColors[p.status]}">
      <div class="property-card-header">
        <div class="property-icon ${p.type}">${p.icon}</div>
        <div style="flex:1">
          <div class="property-title">${p.address}</div>
          <div class="property-client">${p.client} · ${p.country}</div>
          <div class="property-location">${p.notes}</div>
          <div style="margin-top:6px">
            <span class="status-badge ${p.status === 'ok' ? 'status-done' : p.status === 'warning' ? 'status-urgent' : 'status-issue'}">${statusLabel[p.status]}</span>
          </div>
        </div>
      </div>
      <div class="property-card-footer">
        <div class="property-tariff">${p.tariff} · €${p.price}/мес</div>
        <div class="property-next">Следующий: ${p.nextVisit}</div>
      </div>
    </div>`).join('');
}

function showPropertyDetail(id) {
  const prop = DATA.properties.find(p => p.id === id);
  showToast(`🏠 ${prop?.address} · ${prop?.client}`);
}

// =====================
// CALENDAR
// =====================
function renderCalendar() {
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  document.getElementById('calMonth').textContent = `${months[calDate.getMonth()]} ${calDate.getFullYear()}`;

  const year = calDate.getFullYear(), month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay === 0) ? 6 : firstDay - 1;
  const prevDays = new Date(year, month, 0).getDate();

  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  let html = `<div class="cal-days-header">${days.map(d => `<div class="cal-day-name">${d}</div>`).join('')}</div><div class="cal-cells">`;

  // prev month
  for (let i = offset - 1; i >= 0; i--) {
    html += `<div class="cal-cell other-month"><div class="cal-num">${prevDays - i}</div></div>`;
  }

  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayVisits = DATA.visits.filter(v => v.date === dateStr);
    const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
    html += `<div class="cal-cell ${isToday ? 'today' : ''}">
      <div class="cal-num">${d}</div>
      ${dayVisits.map(v => `<div class="cal-dot ${v.status === 'issue' || v.status === 'urgent' ? v.status : ''}"></div>`).join('')}
    </div>`;
  }

  // fill remaining
  const total = offset + daysInMonth;
  const remaining = (7 - (total % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-cell other-month"><div class="cal-num">${d}</div></div>`;
  }

  html += '</div>';
  document.getElementById('calendarGrid').innerHTML = html;
}

function renderVisitsDetailed() {
  const month = calDate.getMonth(), year = calDate.getFullYear();
  const monthVisits = DATA.visits.filter(v => {
    const d = new Date(v.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const container = document.getElementById('visitsDetailed');
  container.innerHTML = monthVisits.map(v => {
    const prop = DATA.properties.find(p => p.id === v.propId);
    const d = new Date(v.date);
    const statusClass = { planned: 'status-planned', urgent: 'status-urgent', issue: 'status-issue', done: 'status-done' }[v.status] || 'status-planned';
    const statusLabel = { planned: 'Запланирован', urgent: 'Срочно', issue: 'Проблема', done: 'Выполнен' }[v.status];
    return `
    <div class="visit-item" onclick="openVisit(${v.id})">
      <div class="visit-date">
        <div class="visit-day">${d.getDate()}</div>
        <div class="visit-mon">${d.toLocaleString('ru-RU', { month: 'short' })}</div>
      </div>
      <div class="visit-info">
        <div class="visit-addr">${prop?.address}</div>
        <div class="visit-client">${prop?.client} · ${v.type}</div>
        <div class="visit-tasks">${v.tasks.slice(0,3).map(t => `<span class="task-chip">${t}</span>`).join('')}</div>
      </div>
      <div class="visit-status"><span class="status-badge ${statusClass}">${statusLabel}</span></div>
    </div>`;
  }).join('');
}

// =====================
// REPORTS GRID
// =====================
function renderReportsGrid() {
  document.getElementById('reportsGrid').innerHTML = DATA.reports.map(r => renderReportItem(r)).join('');
}

// =====================
// CLIENTS
// =====================
function renderClients() {
  document.getElementById('clientsList').innerHTML = DATA.clients.map(c => `
    <div class="client-card" onclick="showToast('👤 ${c.name} · ${c.tg}')">
      <div class="client-avatar" style="background:${c.color}22;color:${c.color}">${c.name.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
      <div class="client-info">
        <div class="client-name">${c.name}</div>
        <div class="client-country">${c.country} · ${c.tg}</div>
        <div class="client-props">📱 ${c.phone} · ${c.props} объект(а)</div>
      </div>
      <div style="text-align:right">
        <div class="client-monthly">€${c.monthly}</div>
        <div style="font-size:10px;color:var(--text3)">в месяц</div>
        <div class="client-tg" style="margin-top:6px">✈</div>
      </div>
    </div>`).join('');
}

// =====================
// INVOICES
// =====================
function renderInvoices() {
  const statusMap = { paid: { class: 'status-done', label: '✓ Оплачен' }, pending: { class: 'status-planned', label: '⏳ Ожидает' }, overdue: { class: 'status-issue', label: '⚠ Просрочен' } };
  document.getElementById('invoicesList').innerHTML = DATA.invoices.map(inv => {
    const s = statusMap[inv.status];
    return `
    <div class="invoice-item">
      <div class="invoice-num">${inv.num.split('-').pop()}</div>
      <div class="invoice-info">
        <div class="invoice-client">${inv.client}</div>
        <div class="invoice-period">${inv.period}</div>
      </div>
      <div class="invoice-amount">€${inv.amount}</div>
      <div class="invoice-status"><span class="status-badge ${s.class}">${s.label}</span></div>
    </div>`;
  }).join('');
}

// =====================
// BAR CHART
// =====================
function renderBarChart() {
  const months = ['Дек','Янв','Фев','Мар','Апр','Май'];
  const values = [750, 800, 900, 1050, 1060, 1250];
  const max = Math.max(...values);
  document.getElementById('barChart').innerHTML = months.map((m, i) => `
    <div class="bar-col">
      <div class="bar-val">€${values[i]}</div>
      <div class="bar-fill" style="height:${(values[i]/max)*80}px"></div>
      <div class="bar-label">${m}</div>
    </div>`).join('');
}

// =====================
// MODALS
// =====================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function openAddModal() {
  const page = currentPage;
  if (page === 'visits') openModal('addVisitModal');
  else if (page === 'properties') openModal('addPropertyModal');
  else if (page === 'clients') openModal('addVisitModal');
  else openModal('addVisitModal');
}

function populateVisitPropertySelect() {
  const sel = document.getElementById('visitProperty');
  sel.innerHTML = '<option>Выберите объект...</option>' + DATA.properties.map(p => `<option value="${p.id}">${p.address} — ${p.client}</option>`).join('');
  // Set today as default date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('visitDate').value = today;
}

function saveVisit() {
  const propId = document.getElementById('visitProperty').value;
  const date = document.getElementById('visitDate').value;
  if (propId === 'Выберите объект...' || !date) { showToast('Заполните обязательные поля'); return; }
  closeModal('addVisitModal');
  showToast('✅ Визит создан!');
  addLogEntry('success', '✓ Новый визит добавлен');
}

function saveProperty() {
  closeModal('addPropertyModal');
  showToast('✅ Объект добавлен!');
}

// =====================
// NOTIFICATIONS
// =====================
function renderNotifications() {
  const list = document.getElementById('notifyList');
  list.innerHTML = DATA.notifications.map(n => `
    <div class="notify-item" style="display:flex;gap:10px;align-items:flex-start">
      <div class="notify-dot" style="background:${n.color}"></div>
      <div>
        <div class="notify-msg">${n.msg}</div>
        <div class="notify-time">${n.time}</div>
      </div>
    </div>`).join('');
}

function toggleNotify() {
  notifyOpen = !notifyOpen;
  document.getElementById('notifyPanel').classList.toggle('open', notifyOpen);
}

function clearNotifications() {
  document.getElementById('notifyList').innerHTML = '<div style="padding:16px;font-size:13px;color:var(--text3);text-align:center">Нет новых уведомлений</div>';
  document.getElementById('notifyBadge').textContent = '0';
  document.getElementById('notifyBadge').style.display = 'none';
}

// =====================
// TELEGRAM LOG
// =====================
function addLogEntry(type, msg) {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-msg ${type}">${msg}</span>`;
  const log = document.getElementById('tgLog');
  log.insertBefore(entry, log.firstChild);
}

// =====================
// TOAST
// =====================
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// =====================
// HELPERS
// =====================
function formatDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// =====================
// PWA SERVICE WORKER
// =====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
