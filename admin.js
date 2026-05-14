/* ============================================================
   admin.js  —  CyprusGuard Admin Panel
   Requires: firebase-config.js (DB, Auth, Storage globals)
   ============================================================ */

'use strict';

// ── STATE ────────────────────────────────────────────────────
const State = {
  page: 'dashboard',
  properties: {},
  clients: {},
  visits: {},
  reports: {},
  requests: {},
  notifications: [],
  calDate: new Date(2026, 4, 1),
  propFilter: 'all',
  propSearch: '',
  reqFilter: 'new',
  reportSearch: '',
  currentReqId: null,
  currentReportId: null,
  uploadedPhotos: [],   // { file, dataUrl, storageUrl }
  uploadedVideo: null,
  deferredInstall: null,
  unsubs: [],           // firebase off() fns
};

// ── BOOT ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Splash → auth check
  setTimeout(() => {
    hideSplash();
    Auth.onAuthChange(user => {
      if (user) {
        showApp(user);
      } else {
        showLogin();
      }
    });
  }, 1900);

  // PWA install prompt
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    State.deferredInstall = e;
    const btn = document.getElementById('installPwaBtn');
    if (btn) btn.style.display = 'flex';
  });
  window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('installPwaBtn');
    const badge = document.getElementById('pwaInstalledBadge');
    if (btn) btn.style.display = 'none';
    if (badge) badge.style.display = 'inline-flex';
  });

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

function hideSplash() {
  const s = document.getElementById('splash');
  s.style.transition = 'opacity 0.4s';
  s.style.opacity = '0';
  setTimeout(() => s.classList.add('hidden'), 400);
}

// ── AUTH ─────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  bindLoginEvents();
}

function bindLoginEvents() {
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('loginError');
  if (btn._bound) return; btn._bound = true;

  const doLogin = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pwd   = document.getElementById('loginPassword').value;
    if (!email || !pwd) { showLoginError('Введите email и пароль'); return; }
    btn.textContent = ''; btn.appendChild(makeSpinner());
    try {
      await Auth.loginAdmin(email, pwd);
    } catch(e) {
      const msg = e.code === 'auth/user-not-found'    ? 'Пользователь не найден' :
                  e.code === 'auth/wrong-password'     ? 'Неверный пароль' :
                  e.code === 'auth/invalid-email'      ? 'Неверный формат email' :
                  e.code === 'auth/too-many-requests'  ? 'Слишком много попыток' :
                  'Ошибка входа: ' + (e.message || e.code);
      showLoginError(msg);
      btn.textContent = 'Войти';
    }
  };

  btn.addEventListener('click', doLogin);
  document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

function showLoginError(msg) {
  const err = document.getElementById('loginError');
  err.textContent = msg; err.classList.remove('hidden');
  document.getElementById('loginBtn').textContent = 'Войти';
}

async function showApp(user) {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  // Update user info
  const email = user.email || '—';
  document.getElementById('userEmail').textContent = email;
  document.getElementById('userAvatar').textContent = email[0].toUpperCase();

  // Update hero
  updateHero();
  bindAppEvents();
  subscribeAll();
}

// ── FIREBASE SUBSCRIPTIONS ───────────────────────────────────
function subscribeAll() {
  // unsubscribe previous
  State.unsubs.forEach(fn => fn()); State.unsubs = [];

  const sub = (path, stateKey, renderFn) => {
    const unsub = DB.onList(path, list => {
      State[stateKey] = {};
      list.forEach(item => { if (item && item.id) State[stateKey][item.id] = item; });
      if (renderFn) renderFn();
    });
    State.unsubs.push(unsub);
  };

  sub('clients',    'clients',    () => { renderClients(); populateClientSelects(); });
  sub('properties', 'properties', () => { renderProperties(); populatePropSelects(); updateKPIs(); renderCalendar(); renderVisitsDetailed(); });
  sub('visits',     'visits',     () => { renderVisitsDetailed(); updateKPIs(); renderCalendar(); populateVisitSelects(); renderDashVisits(); });
  sub('reports',    'reports',    () => { renderReports(); populateReportVisitSel(); });
  sub('requests',   'requests',   () => { renderRequests(); updateKPIs(); renderDashRequests(); });

  // Notifications
  DB.onList('notifications', list => {
    State.notifications = list.filter(Boolean).sort((a,b) => (b.createdAt||0)-(a.createdAt||0));
    renderNotifications();
  });
}

// ── EVENTS ───────────────────────────────────────────────────
function bindAppEvents() {
  // Nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.page); closeSidebar(); });
  });

  // Sidebar
  document.getElementById('menuBtn').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('overlay').addEventListener('click', closeSidebar);

  // + button
  document.getElementById('addBtn').addEventListener('click', handleAdd);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await Auth.logout();
    window.location.reload();
  });

  // Modal closes
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });
  document.querySelectorAll('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', e => { if (e.target === bd) closeModal(bd.id); });
  });

  // Notify
  document.getElementById('notifyBtn').addEventListener('click', toggleNotify);
  document.getElementById('notifyClear').addEventListener('click', clearNotifications);
  document.addEventListener('click', e => {
    const panel = document.getElementById('notifyPanel');
    if (panel.classList.contains('open') && !panel.contains(e.target) && !document.getElementById('notifyBtn').contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  // Calendar nav
  document.getElementById('calPrev').addEventListener('click', () => { State.calDate.setMonth(State.calDate.getMonth()-1); renderCalendar(); renderVisitsDetailed(); });
  document.getElementById('calNext').addEventListener('click', () => { State.calDate.setMonth(State.calDate.getMonth()+1); renderCalendar(); renderVisitsDetailed(); });

  // Property filters
  document.querySelectorAll('[data-prop-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-prop-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.propFilter = btn.dataset.propFilter;
      renderProperties();
    });
  });
  document.getElementById('propSearch').addEventListener('input', e => { State.propSearch = e.target.value; renderProperties(); });

  // Request filters
  document.querySelectorAll('[data-req-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-req-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.reqFilter = btn.dataset.reqFilter;
      renderRequests();
    });
  });

  // Save visit
  document.getElementById('saveVisitBtn').addEventListener('click', saveVisit);
  // Save property
  document.getElementById('savePropBtn').addEventListener('click', saveProperty);
  // Save client
  document.getElementById('saveClientBtn').addEventListener('click', saveClient);
  // Save report
  document.getElementById('saveReportBtn').addEventListener('click', saveReport);
  // Accept request
  document.getElementById('acceptRequestBtn').addEventListener('click', acceptRequest);
  // Send report TG
  document.getElementById('sendReportTgBtn').addEventListener('click', sendReportTelegram);

  // Photos
  document.getElementById('photoInput').addEventListener('change', handlePhotoSelect);
  document.getElementById('videoInput').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) { State.uploadedVideo = f; document.getElementById('videoName').textContent = '🎥 ' + f.name; }
  });

  // Telegram
  document.getElementById('tgSaveToken').addEventListener('click', saveTgToken);
  document.getElementById('tgToggle').addEventListener('click', toggleTg);
  document.getElementById('tgTestSend').addEventListener('click', sendTgTest);
  document.getElementById('saveTgBtn').addEventListener('click', saveTgSettings);

  // Copy client link
  document.getElementById('copyClientLinkBtn').addEventListener('click', () => {
    const txt = document.getElementById('clientLinkBox').textContent;
    navigator.clipboard.writeText(txt).then(() => showToast('📋 Скопировано!'));
  });

  // Settings
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('installPwaBtn').addEventListener('click', installPwa);

  // Load settings
  DB.once('settings').then(s => {
    if (!s) return;
    if (s.agency) {
      document.getElementById('setName').value  = s.agency.name  || '';
      document.getElementById('setCity').value  = s.agency.city  || '';
      document.getElementById('setPhone').value = s.agency.phone || '';
    }
    if (s.telegram && s.telegram.token) {
      document.getElementById('tgToken').value = s.telegram.token;
      if (s.telegram.botActive) activateTgUI(s.telegram.token);
    }
  });
}

// ── NAVIGATION ───────────────────────────────────────────────
const PAGE_TITLES = { dashboard:'Дашборд', requests:'Заявки', properties:'Объекты', visits:'Визиты', reports:'Отчёты', clients:'Клиенты', telegram:'Telegram Bot', billing:'Финансы', settings:'Настройки' };

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`)?.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  State.page = page;
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;
  if (page === 'billing') renderBilling();
}

function handleAdd() {
  const map = { properties: 'addPropertyModal', visits: 'addVisitModal', clients: 'addClientModal', reports: 'createReportModal' };
  openModal(map[State.page] || 'addVisitModal');
}

function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }

// ── HERO ─────────────────────────────────────────────────────
function updateHero() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Доброе утро!' : h < 18 ? 'Добрый день!' : 'Добрый вечер!';
  const el = document.getElementById('heroGreeting');
  if (el) el.textContent = g;
  const d = document.getElementById('heroDate');
  if (d) d.textContent = new Date().toLocaleDateString('ru-RU', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ── KPIs ─────────────────────────────────────────────────────
function updateKPIs() {
  const props = Object.values(State.properties);
  const visits = Object.values(State.visits);
  const reqs = Object.values(State.requests).filter(r => r.status === 'new');
  const revenue = props.reduce((s, p) => s + (TARIFF_PRICE[p.tariff] || 0), 0);

  animCount('kpiProps', props.length);
  setText('kpiRev', `€${revenue}`);
  animCount('kpiVis', visits.filter(v => v.status !== 'done').length);
  animCount('kpiReq', reqs.length);

  // Badge
  const badge = document.getElementById('reqBadge');
  if (badge) { badge.textContent = reqs.length; badge.style.display = reqs.length ? 'inline-flex' : 'none'; }
}

const TARIFF_PRICE = { basic: 50, standard: 75, premium: 100 };

function animCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let n = 0; const step = Math.ceil(target / 20) || 1;
  const iv = setInterval(() => { n = Math.min(n + step, target); el.textContent = n; if (n >= target) clearInterval(iv); }, 30);
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

// ── PROPERTIES ───────────────────────────────────────────────
const STATUS_COLORS = { ok: 'var(--teal)', warning: 'var(--orange)', issue: 'var(--red)' };
const STATUS_LABELS = { ok: 'Норма', warning: 'Внимание', issue: 'Проблема' };
const STATUS_CLASSES = { ok: 'status-done', warning: 'status-urgent', issue: 'status-issue' };
const TYPE_ICONS = { villa: '🏖️', apt: '🏢', studio: '🌊', house: '🏠' };
const TARIFF_LABELS = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };

function renderProperties() {
  const grid = document.getElementById('propertiesGrid');
  const empty = document.getElementById('propEmpty');
  let list = Object.values(State.properties);
  if (State.propFilter !== 'all') list = list.filter(p => p.status === State.propFilter);
  if (State.propSearch) {
    const q = State.propSearch.toLowerCase();
    list = list.filter(p => (p.address||'').toLowerCase().includes(q) || getClientName(p.clientId).toLowerCase().includes(q));
  }

  if (!list.length) { grid.innerHTML = ''; empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden');

  grid.innerHTML = list.map(p => {
    const client = getClientName(p.clientId);
    const price = TARIFF_PRICE[p.tariff] || 0;
    return `
    <div class="property-card" style="border-left:3px solid ${STATUS_COLORS[p.status]||'transparent'}" onclick="openPropertyDetail('${p.id}')">
      <div class="property-card-header">
        <div class="property-icon ${p.type||'apt'}">${TYPE_ICONS[p.type||'apt']}</div>
        <div style="flex:1">
          <div class="property-title">${p.address}</div>
          <div class="property-client">${client}</div>
          <div class="property-location">${p.notes||''}</div>
          <div style="margin-top:6px"><span class="status-badge ${STATUS_CLASSES[p.status]||'status-done'}">${STATUS_LABELS[p.status]||'—'}</span></div>
        </div>
      </div>
      <div class="property-card-footer">
        <div class="property-tariff">${TARIFF_LABELS[p.tariff]||p.tariff} · €${price}/мес</div>
        <div style="display:flex;gap:6px">
          <button class="client-link-btn" onclick="event.stopPropagation();scheduleVisit('${p.id}')">+ Визит</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function getClientName(id) {
  if (!id) return '—';
  const c = State.clients[id];
  return c ? c.name : '—';
}

function openPropertyDetail(id) {
  const p = State.properties[id];
  if (!p) return;
  showToast(`🏠 ${p.address} · ${getClientName(p.clientId)}`);
}

function scheduleVisit(propId) {
  document.getElementById('visitProperty').value = propId;
  openModal('addVisitModal');
}

// ── SAVE PROPERTY ────────────────────────────────────────────
async function saveProperty() {
  const address = document.getElementById('propAddress').value.trim();
  const clientId = document.getElementById('propClientSel').value;
  if (!address) { showToast('Введите адрес'); return; }

  const data = {
    address,
    clientId,
    type:       document.getElementById('propType').value,
    tariff:     document.getElementById('propTariff').value,
    nextVisit:  document.getElementById('propNextVisit').value,
    notes:      document.getElementById('propNotes').value.trim(),
    status:     'ok',
    icon:       TYPE_ICONS[document.getElementById('propType').value] || '🏠',
  };

  const id = 'p' + Date.now();
  await DB.set(`properties/${id}`, { ...data, id });
  await pushNotification('⌂ Новый объект добавлен: ' + address, 'ok');
  closeModal('addPropertyModal');
  clearForm(['propAddress','propNotes']);
  showToast('✅ Объект добавлен!');

  // Create invoice
  await DB.set(`invoices/${id}_${ym()}`, {
    id: id + '_' + ym(), propId: id, clientId,
    period: ymLabel(), amount: TARIFF_PRICE[data.tariff] || 0,
    status: 'pending', createdAt: Date.now()
  });
}

// ── SAVE VISIT ───────────────────────────────────────────────
async function saveVisit() {
  const propId = document.getElementById('visitProperty').value;
  const date   = document.getElementById('visitDate').value;
  if (!propId || !date) { showToast('Заполните объект и дату'); return; }

  const tasks = [...document.querySelectorAll('#visitTaskList input:checked')].map(i => i.value);
  const data = {
    propId, date,
    type:   document.getElementById('visitType').value,
    notes:  document.getElementById('visitNotes').value.trim(),
    tasks, status: 'planned'
  };
  const id = 'v' + Date.now();
  await DB.set(`visits/${id}`, { ...data, id });
  closeModal('addVisitModal');
  clearForm(['visitNotes']);
  showToast('✅ Визит запланирован!');
  addTgLog('success', `✓ Визит создан → ${State.properties[propId]?.address || propId}`);

  // Notify client via TG if enabled
  tryTgNotify(propId, `📅 Запланирован визит на ${formatDate(date)}`);
}

// ── CLIENTS ──────────────────────────────────────────────────
function renderClients() {
  const list = Object.values(State.clients);
  document.getElementById('clientsList').innerHTML = list.map(c => `
    <div class="client-card" onclick="showClientLink('${c.id}')">
      <div class="client-avatar" style="background:${c.color||'#4fc3a1'}22;color:${c.color||'#4fc3a1'}">${initials(c.name)}</div>
      <div class="client-info">
        <div class="client-name">${c.name}</div>
        <div class="client-country">${c.country||''} · ${c.tg||'—'}</div>
        <div class="client-props">📱 ${c.phone||'—'}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="client-monthly">€${c.monthly||0}</div>
        <div style="font-size:10px;color:var(--text3)">в месяц</div>
        <button class="client-link-btn" style="margin-top:6px" onclick="event.stopPropagation();showClientLink('${c.id}')">🔗 Портал</button>
      </div>
    </div>`).join('') || '<div class="empty-state"><div style="font-size:48px">👤</div><div>Нет клиентов</div><button class="btn-primary" onclick="openModal(\'addClientModal\')">+ Добавить</button></div>';
}

async function saveClient() {
  const name = document.getElementById('clientName').value.trim();
  if (!name) { showToast('Введите имя'); return; }
  const token = 'tok-' + Math.random().toString(36).slice(2, 10);
  const colors = ['#4fc3a1','#f0a500','#9b8db0','#5e81ff','#e05c5c','#c9a84c'];
  const data = {
    name,
    country:      document.getElementById('clientCountry').value.trim(),
    phone:        document.getElementById('clientPhone').value.trim(),
    tg:           document.getElementById('clientTg').value.trim(),
    lang:         document.getElementById('clientLang').value,
    accessToken:  token,
    tgChatId:     '',
    color:        colors[Math.floor(Math.random() * colors.length)],
    monthly:      0,
  };
  const id = 'c' + Date.now();
  await DB.set(`clients/${id}`, { ...data, id });
  closeModal('addClientModal');
  clearForm(['clientName','clientCountry','clientPhone','clientTg']);
  showToast('✅ Клиент добавлен!');
}

function showClientLink(clientId) {
  const c = State.clients[clientId];
  if (!c) return;
  const base = window.location.origin + window.location.pathname.replace('index.html','');
  const url = `${base}client.html?token=${c.accessToken}`;
  document.getElementById('clientLinkBox').textContent = url;
  openModal('clientLinkModal');
}

function populateClientSelects() {
  const list = Object.values(State.clients);
  const opts = list.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('propClientSel').innerHTML = '<option value="">— Выберите клиента —</option>' + opts;
  const tgSel = document.getElementById('tgTestClient');
  if (tgSel) tgSel.innerHTML = '<option value="">Выберите клиента…</option>' + opts;
}

function populatePropSelects() {
  const list = Object.values(State.properties);
  const opts = list.map(p => `<option value="${p.id}">${p.address}</option>`).join('');
  ['visitProperty'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<option value="">— Выберите объект —</option>' + opts;
  });
}

function populateVisitSelects() {
  const list = Object.values(State.visits).filter(v => v.status !== 'done');
  const el = document.getElementById('reportVisitSel');
  if (!el) return;
  el.innerHTML = '<option value="">— Выберите визит —</option>' + list.map(v => {
    const p = State.properties[v.propId];
    return `<option value="${v.id}">${p?.address || v.propId} · ${v.date}</option>`;
  }).join('');
}

function populateReportVisitSel() { populateVisitSelects(); }

// ── VISITS ───────────────────────────────────────────────────
function renderDashVisits() {
  const container = document.getElementById('dashVisits');
  const list = Object.values(State.visits)
    .filter(v => v.status !== 'done')
    .sort((a,b) => a.date > b.date ? 1 : -1)
    .slice(0, 4);
  container.innerHTML = list.map(v => visitItemHTML(v)).join('') || '<div style="color:var(--text3);font-size:13px;padding:12px">Нет предстоящих визитов</div>';
}

function renderVisitsDetailed() {
  const month = State.calDate.getMonth(), year = State.calDate.getFullYear();
  const list = Object.values(State.visits).filter(v => {
    const d = new Date(v.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).sort((a,b) => a.date > b.date ? 1 : -1);
  document.getElementById('visitsDetailed').innerHTML = list.map(v => visitItemHTML(v, true)).join('') || '<div style="color:var(--text3);font-size:13px;padding:12px">Нет визитов в этом месяце</div>';
}

function visitItemHTML(v, showComplete = false) {
  const prop = State.properties[v.propId] || {};
  const d = new Date(v.date);
  const SC = { planned:'status-planned', urgent:'status-urgent', issue:'status-issue', done:'status-done' };
  const SL = { planned:'Запланирован', urgent:'Срочно', issue:'Проблема', done:'Выполнен' };
  const tasks = (v.tasks||[]).slice(0,3).map(t => `<span class="task-chip">${t}</span>`).join('');
  const extra = (v.tasks||[]).length > 3 ? `<span class="task-chip">+${(v.tasks||[]).length-3}</span>` : '';
  const completeBtn = showComplete && v.status !== 'done' ? `<button class="visit-complete-btn" onclick="event.stopPropagation();completeVisit('${v.id}')">✓ Выполнен</button>` : '';
  return `
  <div class="visit-item" onclick="openVisitDetail('${v.id}')">
    <div class="visit-date"><div class="visit-day">${d.getDate()}</div><div class="visit-mon">${d.toLocaleString('ru-RU',{month:'short'})}</div></div>
    <div class="visit-info">
      <div class="visit-addr">${prop.address||'—'}</div>
      <div class="visit-client">${getClientName(prop.clientId)} · ${v.type||''}</div>
      <div class="visit-tasks">${tasks}${extra}</div>
    </div>
    <div class="visit-status" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
      <span class="status-badge ${SC[v.status]||'status-planned'}">${SL[v.status]||'—'}</span>
      ${completeBtn}
    </div>
  </div>`;
}

function openVisitDetail(id) {
  const v = State.visits[id];
  if (!v) return;
  const p = State.properties[v.propId] || {};
  showToast(`📋 Визит: ${p.address} · ${v.date}`);
}

async function completeVisit(id) {
  await DB.update(`visits/${id}`, { status: 'done' });
  showToast('✅ Визит отмечен выполненным!');
  openModal('createReportModal');
  // Pre-select this visit
  setTimeout(() => {
    const sel = document.getElementById('reportVisitSel');
    if (sel) sel.value = id;
  }, 200);
}

// ── CALENDAR ─────────────────────────────────────────────────
function renderCalendar() {
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const { calDate } = State;
  document.getElementById('calMonth').textContent = `${months[calDate.getMonth()]} ${calDate.getFullYear()}`;

  const year = calDate.getFullYear(), month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const prevDays = new Date(year, month, 0).getDate();
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const today = new Date();

  let html = `<div class="cal-days-header">${days.map(d=>`<div class="cal-day-name">${d}</div>`).join('')}</div><div class="cal-cells">`;
  for (let i = offset-1; i >= 0; i--) html += `<div class="cal-cell other-month"><div class="cal-num">${prevDays-i}</div></div>`;

  const visitsByDate = {};
  Object.values(State.visits).forEach(v => {
    if (!visitsByDate[v.date]) visitsByDate[v.date] = [];
    visitsByDate[v.date].push(v);
  });

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayV = visitsByDate[ds] || [];
    const isToday = today.getDate()===d && today.getMonth()===month && today.getFullYear()===year;
    const dots = dayV.map(v => `<div class="cal-dot ${v.status==='issue'||v.status==='urgent'?v.status:''}"></div>`).join('');
    html += `<div class="cal-cell ${isToday?'today':''}"><div class="cal-num">${d}</div>${dots}</div>`;
  }

  const total = offset + daysInMonth;
  const rem = (7 - (total % 7)) % 7;
  for (let d = 1; d <= rem; d++) html += `<div class="cal-cell other-month"><div class="cal-num">${d}</div></div>`;
  html += '</div>';
  document.getElementById('calendarGrid').innerHTML = html;
}

// ── REPORTS ──────────────────────────────────────────────────
function renderReports() {
  const q = State.reportSearch.toLowerCase();
  let list = Object.values(State.reports).sort((a,b) => (b.createdAt||0)-(a.createdAt||0));
  if (q) list = list.filter(r => {
    const p = State.properties[r.propId] || {};
    return (p.address||'').toLowerCase().includes(q);
  });
  const icons = ['🛋️','🚿','🌿','🔌','💧','🪟'];
  document.getElementById('reportsGrid').innerHTML = list.map((r, i) => {
    const p = State.properties[r.propId] || {};
    const cond = { ok:'✅ Норма', warning:'⚠️ Замечание', issue:'❌ Проблема' };
    return `
    <div class="report-item" onclick="openReport('${r.id}')">
      <div class="report-thumb">${icons[i%icons.length]}${r.photoUrls?.length ? `<div class="report-thumb-count">📷${r.photoUrls.length}</div>` : ''}</div>
      <div class="report-info">
        <div class="report-addr">${p.address||'—'}</div>
        <div class="report-date">${formatDate(r.date||r.createdAt)} · ${getClientName(p.clientId)}</div>
        <div class="report-meta">
          <span class="report-chip">${cond[r.condition]||'—'}</span>
          ${r.photoUrls?.length ? `<span class="report-chip photo">📷 ${r.photoUrls.length}</span>` : ''}
          ${r.videoUrl ? '<span class="report-chip video">🎥 видео</span>' : ''}
          ${r.tgSent ? '<span class="report-chip">✈ отправлен</span>' : ''}
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><div style="font-size:48px">📋</div><div>Нет отчётов</div></div>';
}

function openReport(id) {
  const r = State.reports[id];
  if (!r) return;
  State.currentReportId = id;
  const p = State.properties[r.propId] || {};
  document.getElementById('reportModalTitle').textContent = `Отчёт — ${p.address||'—'}`;
  const checkIcons = { ok:'✅', warning:'⚠️', issue:'❌' };
  const photoHtml = (r.photoUrls||[]).length ? `
    <div class="report-section">
      <div class="report-section-title">Фото (${r.photoUrls.length})</div>
      <div class="report-photo-grid">${r.photoUrls.map(url =>
        `<div class="report-photo-item"><img src="${url}" loading="lazy" onclick="window.open('${url}','_blank')"/></div>`
      ).join('')}</div>
    </div>` : '';
  const videoHtml = r.videoUrl ? `<div class="report-section"><div class="report-section-title">Видео</div><video controls style="width:100%;border-radius:8px" src="${r.videoUrl}"></video></div>` : '';
  document.getElementById('reportModalBody').innerHTML = `
    <div class="report-section"><div class="report-section-title">Дата</div><div style="font-size:14px;color:var(--text2)">${formatDate(r.date||r.createdAt)} · ${getClientName(p.clientId)}</div></div>
    <div class="report-section"><div class="report-section-title">Состояние</div><div style="font-size:14px">${{ok:'✅ Всё в норме',warning:'⚠️ Есть замечания',issue:'❌ Проблема'}[r.condition]||'—'}</div></div>
    ${(r.tasks||[]).length ? `<div class="report-section"><div class="report-section-title">Задачи</div><div class="checklist-done">${r.tasks.map(t=>`<div class="check-item done"><span>✅</span>${t}</div>`).join('')}</div></div>` : ''}
    ${photoHtml}${videoHtml}
    <div class="report-section"><div class="report-section-title">Комментарий</div><div style="font-size:13px;color:var(--text2);line-height:1.6">${r.comment||'—'}</div></div>
    ${r.bill ? `<div class="report-section"><div class="report-section-title">Счёт ЖКХ</div><div style="font-size:16px;color:var(--accent2);font-family:'DM Mono',monospace">€${r.bill}</div></div>` : ''}
  `;
  openModal('reportModal');
}

// ── SAVE REPORT ──────────────────────────────────────────────
async function saveReport() {
  const visitId = document.getElementById('reportVisitSel').value;
  if (!visitId) { showToast('Выберите визит'); return; }
  const visit = State.visits[visitId];
  if (!visit) return;

  const tasks = [...document.querySelectorAll('#reportTaskList input:checked')].map(i => i.value);
  const condition = document.getElementById('reportCondition').value;
  const comment = document.getElementById('reportComment').value.trim();
  const bill = document.getElementById('reportBill').value;

  // Show progress
  document.getElementById('uploadProgress').classList.remove('hidden');

  // Upload photos
  const photoUrls = [];
  for (let i = 0; i < State.uploadedPhotos.length; i++) {
    const ph = State.uploadedPhotos[i];
    setProgress(Math.round((i / State.uploadedPhotos.length) * 70), `Фото ${i+1}/${State.uploadedPhotos.length}…`);
    try {
      const url = await Storage.uploadBase64(`reports/${visitId}/photo_${i}_${Date.now()}`, ph.dataUrl);
      photoUrls.push(url);
    } catch(e) { console.warn('Photo upload failed', e); }
  }

  // Upload video
  let videoUrl = '';
  if (State.uploadedVideo) {
    setProgress(80, 'Загрузка видео…');
    try {
      videoUrl = await Storage.uploadFile(`reports/${visitId}/video_${Date.now()}`, State.uploadedVideo);
    } catch(e) { console.warn('Video upload failed', e); }
  }

  setProgress(90, 'Сохранение…');

  const id = 'r' + Date.now();
  const report = {
    id, visitId, propId: visit.propId,
    date: visit.date, condition, tasks, comment,
    bill: bill ? parseFloat(bill) : 0,
    photoUrls, videoUrl, tgSent: false,
  };
  await DB.set(`reports/${id}`, report);
  await DB.update(`visits/${visitId}`, { status: 'done' });

  // Update property status
  if (condition !== 'ok') {
    await DB.update(`properties/${visit.propId}`, { status: condition });
  }

  setProgress(100, 'Готово!');
  setTimeout(() => {
    document.getElementById('uploadProgress').classList.add('hidden');
    setProgress(0, '');
  }, 1000);

  // Send to Telegram
  const p = State.properties[visit.propId] || {};
  const client = State.clients[p.clientId];
  if (client?.tgChatId) {
    await sendTgReport(report, p, client);
  }

  closeModal('createReportModal');
  State.uploadedPhotos = [];
  State.uploadedVideo = null;
  document.getElementById('photoPreview').innerHTML = '';
  document.getElementById('videoName').textContent = '';
  clearForm(['reportComment','reportBill']);
  showToast('✅ Отчёт сохранён и отправлен!');
}

function setProgress(pct, label) {
  const fill = document.getElementById('progressFill');
  const lbl  = document.getElementById('progressLabel');
  if (fill) fill.style.width = pct + '%';
  if (lbl)  lbl.textContent = label;
}

// ── PHOTO HANDLING ───────────────────────────────────────────
function handlePhotoSelect(e) {
  const files = [...e.target.files];
  const preview = document.getElementById('photoPreview');
  const placeholder = document.getElementById('photoPlaceholder');
  placeholder.style.display = 'none';

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      State.uploadedPhotos.push({ file, dataUrl });
      const idx = State.uploadedPhotos.length - 1;
      const div = document.createElement('div');
      div.className = 'photo-preview-item';
      div.innerHTML = `<img src="${dataUrl}"/><button class="remove-photo" onclick="removePhoto(${idx},this)">✕</button>`;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function removePhoto(idx, btn) {
  State.uploadedPhotos.splice(idx, 1);
  btn.closest('.photo-preview-item').remove();
  if (!State.uploadedPhotos.length) document.getElementById('photoPlaceholder').style.display = 'flex';
}

// ── REQUESTS ─────────────────────────────────────────────────
function renderRequests() {
  const filter = State.reqFilter;
  let list = Object.values(State.requests).sort((a,b) => (b.createdAt||0)-(a.createdAt||0));
  if (filter !== 'all') list = list.filter(r => r.status === filter);

  const icons = { maintenance:'🔧', visit:'📅', urgent:'🚨', other:'📝' };
  const statusLabel = { new:'Новая', inprogress:'В работе', done:'Выполнена' };

  document.getElementById('requestsList').innerHTML = list.map(r => {
    const p = State.properties[r.propId] || {};
    return `
    <div class="request-card req-${r.status||'new'}" onclick="openRequest('${r.id}')">
      <div class="req-icon">${icons[r.type]||'📝'}</div>
      <div class="req-info">
        <div class="req-title">${r.title||'Заявка'}</div>
        <div class="req-client">${getClientName(p.clientId||r.clientId)} · ${p.address||'—'}</div>
        <div class="req-desc">${r.description||''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0">
        <span class="status-badge ${r.status==='done'?'status-done':r.status==='inprogress'?'status-urgent':'status-planned'}">${statusLabel[r.status]||'Новая'}</span>
        <div class="req-time">${timeAgo(r.createdAt)}</div>
      </div>
    </div>`;
  }).join('') || '<div style="color:var(--text3);font-size:13px;padding:16px;text-align:center">Нет заявок</div>';
}

function renderDashRequests() {
  const list = Object.values(State.requests).filter(r => r.status === 'new').slice(0, 3);
  document.getElementById('dashRequests').innerHTML = list.map(r => {
    const p = State.properties[r.propId] || {};
    return `
    <div class="request-card req-new" onclick="openRequest('${r.id}')">
      <div class="req-icon">📬</div>
      <div class="req-info"><div class="req-title">${r.title||'Заявка'}</div><div class="req-client">${getClientName(p.clientId||r.clientId)}</div><div class="req-desc">${r.description||''}</div></div>
      <div class="req-time">${timeAgo(r.createdAt)}</div>
    </div>`;
  }).join('') || '<div style="color:var(--text3);font-size:13px;padding:12px">Нет новых заявок</div>';
}

function openRequest(id) {
  const r = State.requests[id];
  if (!r) return;
  State.currentReqId = id;
  const p = State.properties[r.propId] || {};
  document.getElementById('requestModalBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><div class="form-label">Тип</div><div>${r.title||'Заявка'}</div></div>
      <div><div class="form-label">Клиент</div><div>${getClientName(p.clientId||r.clientId)}</div></div>
      <div><div class="form-label">Объект</div><div>${p.address||'—'}</div></div>
      <div><div class="form-label">Описание</div><div style="font-size:13px;color:var(--text2);line-height:1.6">${r.description||'—'}</div></div>
      <div><div class="form-label">Дата заявки</div><div>${formatDate(r.createdAt)}</div></div>
      <div><div class="form-label">Статус</div><span class="status-badge ${r.status==='done'?'status-done':r.status==='inprogress'?'status-urgent':'status-planned'}">${r.status==='done'?'Выполнена':r.status==='inprogress'?'В работе':'Новая'}</span></div>
    </div>`;
  document.getElementById('acceptRequestBtn').textContent = r.status === 'inprogress' ? '✅ Отметить выполненной' : '🔧 Принять в работу';
  openModal('requestModal');
}

async function acceptRequest() {
  if (!State.currentReqId) return;
  const r = State.requests[State.currentReqId];
  const newStatus = r?.status === 'inprogress' ? 'done' : 'inprogress';
  await DB.update(`requests/${State.currentReqId}`, { status: newStatus });
  closeModal('requestModal');
  showToast(newStatus === 'done' ? '✅ Заявка выполнена!' : '🔧 Заявка принята в работу!');

  // Notify client
  const p = State.properties[r.propId] || {};
  const client = State.clients[p.clientId];
  if (client?.tgChatId) {
    const msg = newStatus === 'done' ? `✅ Ваша заявка «${r.title}» выполнена!` : `🔧 Ваша заявка «${r.title}» принята в работу`;
    await sendTgMessage(client.tgChatId, msg);
  }
}

// ── NOTIFICATIONS ────────────────────────────────────────────
function renderNotifications() {
  const list = document.getElementById('notifyList');
  const unread = State.notifications.filter(n => !n.read);
  const badge = document.getElementById('notifyBadge');
  if (badge) { badge.textContent = unread.length; badge.style.display = unread.length ? 'flex' : 'none'; }

  if (!State.notifications.length) { list.innerHTML = '<div class="notify-empty" style="padding:16px;font-size:13px;color:var(--text3);text-align:center">Нет уведомлений</div>'; return; }
  const colors = { ok:'#4fc3a1', warning:'#f0a500', error:'#e05c5c', info:'#5e81ff' };
  list.innerHTML = State.notifications.slice(0,10).map(n => `
    <div class="notify-item" style="display:flex;gap:10px;align-items:flex-start">
      <div class="notify-dot" style="background:${colors[n.type]||'#fff'};margin-top:5px"></div>
      <div><div class="notify-msg">${n.message}</div><div class="notify-time">${timeAgo(n.createdAt)}</div></div>
    </div>`).join('');
}

function toggleNotify() {
  document.getElementById('notifyPanel').classList.toggle('open');
}

async function clearNotifications() {
  await DB.set('notifications', {});
  document.getElementById('notifyList').innerHTML = '<div style="padding:16px;font-size:13px;color:var(--text3);text-align:center">Нет уведомлений</div>';
  const badge = document.getElementById('notifyBadge');
  if (badge) { badge.textContent = '0'; badge.style.display = 'none'; }
}

async function pushNotification(message, type = 'info') {
  const id = 'n' + Date.now();
  await DB.set(`notifications/${id}`, { id, message, type, read: false });
}

// ── TELEGRAM ─────────────────────────────────────────────────
function activateTgUI(token) {
  document.getElementById('tgDot').classList.add('online');
  document.getElementById('tgStatusLabel').textContent = 'Бот подключён';
  document.getElementById('tgStatusSub').textContent = 'Токен сохранён · Активен';
  document.getElementById('tgToggle').textContent = 'Отключить';
}

async function saveTgToken() {
  const token = document.getElementById('tgToken').value.trim();
  if (!token) { showToast('Введите токен'); return; }
  // Verify token via Telegram
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await r.json();
    if (!data.ok) throw new Error('Invalid token');
    await DB.update('settings/telegram', { token, botActive: true, botName: data.result.username });
    activateTgUI(token);
    showToast(`✅ Бот @${data.result.username} подключён!`);
    addTgLog('success', `✓ Бот @${data.result.username} авторизован`);
  } catch(e) {
    showToast('❌ Неверный токен бота');
    addTgLog('error', '✗ Ошибка авторизации');
  }
}

async function toggleTg() {
  const settings = await DB.once('settings/telegram');
  if (settings?.botActive) {
    await DB.update('settings/telegram', { botActive: false });
    document.getElementById('tgDot').classList.remove('online');
    document.getElementById('tgStatusLabel').textContent = 'Бот отключён';
    document.getElementById('tgStatusSub').textContent = 'Введите токен';
    document.getElementById('tgToggle').textContent = 'Подключить';
    showToast('Бот отключён');
  } else {
    document.getElementById('tgToken').focus();
  }
}

async function saveTgSettings() {
  await DB.update('settings/telegram', {
    notifyAfterVisit:  document.getElementById('tgNotifyVisit').checked,
    notifyNewRequest:  document.getElementById('tgNotifyRequest').checked,
    notifyReminder:    document.getElementById('tgNotifyReminder').checked,
    notifyUrgent:      document.getElementById('tgNotifyUrgent').checked,
  });
  showToast('✅ Настройки бота сохранены!');
}

async function sendTgTest() {
  const clientId = document.getElementById('tgTestClient').value;
  if (!clientId) { showToast('Выберите клиента'); return; }
  const c = State.clients[clientId];
  if (!c?.tgChatId) {
    showToast(`⚠ Клиент ещё не писал боту (/start)`);
    addTgLog('error', `✗ Нет chat_id → ${c?.name}`);
    return;
  }
  const msg = `🏛 *CyprusGuard* — тестовое сообщение\n\nВаш объект под надёжной защитой!`;
  await sendTgMessage(c.tgChatId, msg);
  showToast('📤 Тест отправлен!');
  addTgLog('success', `✓ Тест → ${c.name}`);
}

async function sendTgMessage(chatId, text) {
  const settings = await DB.once('settings/telegram');
  const token = settings?.token;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });
  } catch(e) { console.warn('TG send failed', e); }
}

async function sendTgReport(report, property, client) {
  const settings = await DB.once('settings/telegram');
  const token = settings?.token;
  if (!token || !client.tgChatId) return;

  const condLabels = { ok:'✅ Всё в порядке', warning:'⚠️ Есть замечания', issue:'❌ Обнаружена проблема' };
  const tasksList = (report.tasks||[]).map(t => `  ✓ ${t}`).join('\n');
  const msg = `🏛 *CyprusGuard — Отчёт о визите*\n\n📍 *${property.address}*\n📅 ${formatDate(report.date||report.createdAt)}\n\n*Состояние:* ${condLabels[report.condition]||'—'}\n\n*Выполнено:*\n${tasksList}\n\n📝 ${report.comment||'—'}${report.bill ? `\n\n💡 Счёт ЖКХ: €${report.bill}` : ''}`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: client.tgChatId, text: msg, parse_mode: 'Markdown' })
    });

    // Send photos
    for (const url of (report.photoUrls||[]).slice(0, 9)) {
      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: client.tgChatId, photo: url })
      });
    }

    await DB.update(`reports/${report.id}`, { tgSent: true });
    addTgLog('success', `✓ Отчёт → ${client.name}`);
  } catch(e) {
    addTgLog('error', `✗ Ошибка → ${client.name}`);
  }
}

async function sendReportTelegram() {
  if (!State.currentReportId) return;
  const r = State.reports[State.currentReportId];
  const p = State.properties[r?.propId] || {};
  const client = State.clients[p.clientId];
  if (!client) { showToast('Клиент не найден'); return; }
  await sendTgReport(r, p, client);
  closeModal('reportModal');
  showToast('✈ Отправлено в Telegram!');
}

async function tryTgNotify(propId, message) {
  const settings = await DB.once('settings/telegram');
  if (!settings?.notifyAfterVisit) return;
  const p = State.properties[propId];
  const client = State.clients[p?.clientId];
  if (client?.tgChatId) await sendTgMessage(client.tgChatId, `🏛 *CyprusGuard*\n\n${message}`);
}

function addTgLog(type, msg) {
  const log = document.getElementById('tgLog');
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-msg ${type}">${msg}</span>`;
  log.insertBefore(entry, log.firstChild);
  if (log.children.length > 20) log.lastChild.remove();
}

// ── BILLING ──────────────────────────────────────────────────
async function renderBilling() {
  const invoices = await DB.once('invoices') || {};
  const list = Object.values(invoices);
  const paid = list.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount||0), 0);
  const pending = list.filter(i => i.status === 'pending').reduce((s, i) => s + (i.amount||0), 0);
  const overdue = list.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.amount||0), 0);

  setText('billMonth',   `€${paid}`);
  setText('billPending', `€${pending}`);
  setText('billOverdue', `€${overdue}`);

  const statusLabel = { paid:'✓ Оплачен', pending:'⏳ Ожидает', overdue:'⚠ Просрочен' };
  const statusClass = { paid:'inv-paid', pending:'inv-pending', overdue:'inv-overdue' };

  document.getElementById('invoicesList').innerHTML = list.map(inv => `
    <div class="invoice-item">
      <div class="invoice-num" style="font-family:'DM Mono',monospace;font-size:12px;color:var(--text3);min-width:50px">#${(inv.id||'').slice(-4)}</div>
      <div class="invoice-info"><div class="invoice-client">${getClientName(inv.clientId)}</div><div class="invoice-period" style="font-size:12px;color:var(--text2)">${inv.period||''}</div></div>
      <div class="invoice-amount" style="font-family:'DM Mono',monospace;font-size:16px;color:var(--accent2)">€${inv.amount||0}</div>
      <div class="${statusClass[inv.status]||''}" style="font-size:12px;font-weight:500">${statusLabel[inv.status]||'—'}</div>
    </div>`).join('') || '<div style="color:var(--text3);font-size:13px;padding:16px">Нет счетов</div>';

  // Bar chart
  const months = ['Дек','Янв','Фев','Мар','Апр','Май'];
  const revenue = Object.values(State.properties).reduce((s, p) => s + (TARIFF_PRICE[p.tariff]||0), 0);
  const vals = [Math.round(revenue*0.6), Math.round(revenue*0.65), Math.round(revenue*0.75), Math.round(revenue*0.85), Math.round(revenue*0.9), revenue];
  const max = Math.max(...vals);
  document.getElementById('barChart').innerHTML = months.map((m, i) => `
    <div class="bar-col">
      <div class="bar-val">€${vals[i]}</div>
      <div class="bar-fill" style="height:${max ? Math.round((vals[i]/max)*80) : 4}px"></div>
      <div class="bar-label">${m}</div>
    </div>`).join('');
}

// ── SETTINGS ─────────────────────────────────────────────────
async function saveSettings() {
  await DB.update('settings/agency', {
    name:  document.getElementById('setName').value.trim(),
    city:  document.getElementById('setCity').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
  });
  showToast('✅ Настройки сохранены!');
}

async function installPwa() {
  if (State.deferredInstall) {
    State.deferredInstall.prompt();
    const { outcome } = await State.deferredInstall.userChoice;
    if (outcome === 'accepted') {
      document.getElementById('installPwaBtn').style.display = 'none';
      document.getElementById('pwaInstalledBadge').style.display = 'inline-flex';
    }
    State.deferredInstall = null;
  }
}

// ── MODALS ───────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── TOAST ────────────────────────────────────────────────────
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// ── HELPERS ──────────────────────────────────────────────────
function makeSpinner() { const s = document.createElement('span'); s.className = 'spinner'; return s; }

function formatDate(val) {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  return d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'только что';
  if (diff < 3600000) return Math.floor(diff/60000) + ' мин назад';
  if (diff < 86400000) return Math.floor(diff/3600000) + ' ч назад';
  return Math.floor(diff/86400000) + ' д назад';
}

function initials(name) {
  return (name||'?').split(' ').map(w => w[0]||'').join('').slice(0,2).toUpperCase();
}

function clearForm(ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }

function ym() { const d = new Date(); return `${d.getFullYear()}_${d.getMonth()+1}`; }
function ymLabel() { return new Date().toLocaleDateString('ru-RU', { month:'long', year:'numeric' }); }
