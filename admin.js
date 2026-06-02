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
  leads: {},
  invoices: {},
  settings: {},
  notifications: [],
  calDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  propFilter: 'all',
  propCityFilter: 'all',
  propSearch: '',
  reqFilter: 'new',
  reportSearch: '',
  clientSearch: '',
  billingFilter: 'all',
  currentReqId: null,
  currentReportId: null,
  currentClientId: null,
  currentVisitId: null,
  editingPropId: null,
  editingClientId: null,
  pendingLogo: null,
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
  sub('leads',      'leads',      () => { renderLeads(); updateLeadBadge(); });
  sub('invoices',   'invoices',   () => { if (State.page === 'billing') renderBilling(); updateKPIs(); });

  // Settings (realtime, drives billing + telegram state)
  State.unsubs.push(DB.on('settings', s => {
    State.settings = s || {};
    if (State.page === 'billing') renderBilling();
  }));

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
  document.getElementById('fabBtn')?.addEventListener('click', handleAdd);

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
  document.querySelectorAll('[data-city-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-city-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.propCityFilter = btn.dataset.cityFilter;
      renderProperties();
    });
  });
  document.getElementById('propSearch').addEventListener('input', e => { State.propSearch = e.target.value; renderProperties(); });
  document.getElementById('reportSearch')?.addEventListener('input', e => { State.reportSearch = e.target.value; renderReports(); });
  document.getElementById('clientSearch')?.addEventListener('input', e => { State.clientSearch = e.target.value; renderClients(); });

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
  // Report PDF
  document.getElementById('reportPdfBtn')?.addEventListener('click', () => { if (State.currentReportId) downloadReportPdf(State.currentReportId); });

  // Photos
  document.getElementById('photoInput').addEventListener('change', handlePhotoSelect);
  document.getElementById('videoInput').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) { State.uploadedVideo = f; document.getElementById('videoName').textContent = '🎥 ' + f.name; }
  });

  // Telegram
  document.getElementById('tgCheckHealth').addEventListener('click', checkBotHealth);
  document.getElementById('tgToggle').addEventListener('click', checkBotHealth);
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
  document.getElementById('setColor')?.addEventListener('input', e => applyBrandColor(e.target.value));
  document.getElementById('aiDescribeBtn')?.addEventListener('click', aiDescribePhotos);
  document.getElementById('resetColorBtn')?.addEventListener('click', () => {
    const def = '#c9a84c';
    const cInput = document.getElementById('setColor');
    if (cInput) cInput.value = def;
    applyBrandColor(def);
  });
  // Logo upload
  document.getElementById('uploadLogoBtn')?.addEventListener('click', () => document.getElementById('logoInput').click());
  document.getElementById('logoInput')?.addEventListener('change', handleLogoUpload);
  document.getElementById('removeLogoBtn')?.addEventListener('click', async () => {
    State.pendingLogo = null;
    await DB.update('settings/agency', { logo: '' });
    applyLogo('');
    showToast('Логотип убран');
  });

  // Billing
  document.getElementById('genInvoicesBtn')?.addEventListener('click', generateMonthlyInvoices);
  document.getElementById('exportInvoicesBtn')?.addEventListener('click', exportInvoices);
  document.getElementById('exportClientsBtn')?.addEventListener('click', exportClients);

  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    const saved = (() => { try { return localStorage.getItem('cg-theme'); } catch(e) { return null; } })();
    applyTheme(saved === 'light' ? 'light' : 'dark');
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem('cg-theme', next); } catch(e) {}
    });
  }

  // Load settings
  DB.once('settings').then(s => {
    if (!s) return;
    if (s.agency) {
      document.getElementById('setName').value  = s.agency.name  || '';
      document.getElementById('setCity').value  = s.agency.city  || '';
      document.getElementById('setPhone').value = s.agency.phone || '';
      const plInput = document.getElementById('setPayLink');
      if (plInput) plInput.value = s.agency.payLink || '';
      const aiInput = document.getElementById('setAiUrl');
      if (aiInput) aiInput.value = s.agency.aiApiUrl || '';
      State.settings = s;
      if (s.agency.color) {
        const cInput = document.getElementById('setColor');
        if (cInput) cInput.value = s.agency.color;
        applyBrandColor(s.agency.color);
      }
      if (s.agency.logo) {
        applyLogo(s.agency.logo);
        const rm = document.getElementById('removeLogoBtn');
        if (rm) rm.style.display = 'inline-block';
      }
    }
    if (s.telegram) {
      if (s.telegram.botActive) activateTgUI();
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
  if (State.page === 'properties') {
    State.editingPropId = null;
    document.getElementById('propModalTitle').textContent = 'Новый объект';
    clearForm(['propAddress','propNotes']);
  }
  if (State.page === 'clients') {
    State.editingClientId = null;
    document.querySelector('#addClientModal .modal-title').textContent = 'Новый клиент';
    clearForm(['clientName','clientCountry','clientPhone','clientTg','clientChatId']);
  }
  if (State.page === 'reports') resetReportForm();
  // On the billing page the + button generates monthly invoices instead of a visit
  if (State.page === 'billing') { generateMonthlyInvoices(); return; }
  openModal(map[State.page] || 'addVisitModal');
}

function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('open'); document.body.classList.add('sidebar-open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); document.body.classList.remove('sidebar-open'); }

// ── HERO ─────────────────────────────────────────────────────
function updateHero() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Доброе утро!' : h < 18 ? 'Добрый день!' : 'Добрый вечер!';
  const el = document.getElementById('heroGreeting');
  if (el) el.textContent = g;
  const d = document.getElementById('heroDate');
  if (d) d.textContent = new Date().toLocaleDateString('ru-RU', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  loadWeather();
}

// Live weather — GPS first, Limassol fallback (Open-Meteo, free, no API key)
async function loadWeather() {
  var tempEl = document.getElementById('heroWxTemp');
  var iconEl = document.getElementById('heroWxIcon');
  if (!tempEl) return;
  var wxIcon = function(code) {
    if (code === 0) return '☀️';
    if (code <= 2) return '🌤️';
    if (code === 3) return '☁️';
    if (code <= 48) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    if (code <= 99) return '⛈️';
    return '☀️';
  };
  function doLoad(lat, lon, city) {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.current) {
          tempEl.textContent = Math.round(d.current.temperature_2m) + '°C';
          if (iconEl) iconEl.textContent = wxIcon(d.current.weather_code);
          var c = document.getElementById('heroWxCity');
          if (c) c.textContent = city;
        }
      }).catch(function() {});
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(pos) { doLoad(pos.coords.latitude, pos.coords.longitude, '📍 Моё место'); },
      function() { doLoad(34.707, 33.022, 'Лимассол'); },
      { timeout: 5000 }
    );
  } else {
    doLoad(34.707, 33.022, 'Лимассол');
  }
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

  renderDashAnalytics();
}

function renderDashAnalytics() {
  const el = document.getElementById('dashAnalytics');
  if (!el) return;
  const props = Object.values(State.properties);
  const visits = Object.values(State.visits);

  // Revenue by tariff
  const byTariff = { basic:0, standard:0, premium:0 };
  props.forEach(p => { if (byTariff[p.tariff] != null) byTariff[p.tariff] += TARIFF_PRICE[p.tariff]||0; });
  const totalRev = byTariff.basic + byTariff.standard + byTariff.premium || 1;

  // Property status split
  const byStatus = { ok:0, warning:0, issue:0 };
  props.forEach(p => { byStatus[p.status] = (byStatus[p.status]||0) + 1; });
  const totalProps = props.length || 1;

  // Visits this month
  const now = new Date();
  const ymPref = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const visitsThisMonth = visits.filter(v => (v.date||'').startsWith(ymPref)).length;
  const doneThisMonth = visits.filter(v => (v.date||'').startsWith(ymPref) && v.status === 'done').length;

  const bar = (label, val, total, color) => `
    <div class="an-row">
      <div class="an-row-top"><span>${label}</span><span>${val}${typeof total==='string'?total:` · €${val}`}</span></div>
      <div class="an-track"><div class="an-fill" style="width:${Math.round((val/(typeof total==='number'?total:1))*100)||0}%;background:${color}"></div></div>
    </div>`;

  el.innerHTML = `
    <div class="an-card">
      <div class="an-title">Доход по тарифам</div>
      ${bar('Basic', byTariff.basic, totalRev, 'var(--teal,#4fc3a1)')}
      ${bar('Standard', byTariff.standard, totalRev, 'var(--orange,#f0a500)')}
      ${bar('Premium', byTariff.premium, totalRev, 'var(--accent2,#c9a84c)')}
      <div class="an-total">Всего: €${byTariff.basic+byTariff.standard+byTariff.premium}/мес</div>
    </div>
    <div class="an-card">
      <div class="an-title">Состояние объектов</div>
      ${bar('✅ Норма', byStatus.ok, totalProps, 'var(--teal,#4fc3a1)')}
      ${bar('⚠️ Внимание', byStatus.warning, totalProps, 'var(--orange,#f0a500)')}
      ${bar('❌ Проблема', byStatus.issue, totalProps, 'var(--red,#e05c5c)')}
      <div class="an-total">Объектов: ${props.length}</div>
    </div>
    <div class="an-card">
      <div class="an-title">Визиты в этом месяце</div>
      <div class="an-big">${doneThisMonth}<span>/${visitsThisMonth}</span></div>
      <div class="an-sub">выполнено из запланированных</div>
      <div class="an-track" style="margin-top:10px"><div class="an-fill" style="width:${Math.round((doneThisMonth/(visitsThisMonth||1))*100)}%;background:var(--teal,#4fc3a1)"></div></div>
    </div>
    ${(() => {
      const invs = Object.values(State.invoices);
      const overdue = invs.filter(i => i.status === 'overdue');
      const pending = invs.filter(i => i.status === 'pending');
      const overdueSum = overdue.reduce((s,i)=>s+(i.amount||0),0);
      const pendingSum = pending.reduce((s,i)=>s+(i.amount||0),0);
      if (!overdue.length && !pending.length) return '';
      return `<div class="an-card" style="${overdue.length?'border-color:var(--red,#e05c5c)':''}">
        <div class="an-title">Оплаты</div>
        ${overdue.length ? `<div class="an-row"><div class="an-row-top"><span style="color:var(--red,#e05c5c)">⚠️ Просрочено</span><span>${overdue.length} · €${overdueSum}</span></div></div>` : ''}
        ${pending.length ? `<div class="an-row"><div class="an-row-top"><span>⏳ Ожидает</span><span>${pending.length} · €${pendingSum}</span></div></div>` : ''}
        <div class="an-total" style="cursor:pointer" onclick="navigateTo('billing')">→ Открыть Финансы</div>
      </div>`;
    })()}`;
}

const TARIFF_PRICE = { basic: 50, standard: 75, premium: 100 };

function animCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let n = 0; const step = Math.ceil(target / 20) || 1;
  const iv = setInterval(() => { n = Math.min(n + step, target); el.textContent = n; if (n >= target) clearInterval(iv); }, 30);
}
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
}

// ── PROPERTIES ───────────────────────────────────────────────
const STATUS_COLORS = { ok: 'var(--teal)', warning: 'var(--orange)', issue: 'var(--red)' };
const STATUS_LABELS = { ok: 'Норма', warning: 'Внимание', issue: 'Проблема' };
const STATUS_CLASSES = { ok: 'status-done', warning: 'status-urgent', issue: 'status-issue' };
const TYPE_ICONS = { villa: '🏖️', apt: '🏢', studio: '🌊', house: '🏠' };

// Approx coordinates of Cyprus cities for map markers
const CITY_COORDS = {
  'Лимассол':  [34.7071, 33.0226],
  'Пафос':     [34.7720, 32.4297],
  'Ларнака':   [34.9229, 33.6233],
  'Никосия':   [35.1856, 33.3823],
  'Фамагуста': [35.1264, 33.9416],
  'Кирения':   [35.3414, 33.3192],
};
let _propMap = null, _propMarkers = [];

function togglePropView(view) {
  const map = document.getElementById('propMap');
  const grid = document.getElementById('propertiesGrid');
  const lb = document.getElementById('viewListBtn');
  const mb = document.getElementById('viewMapBtn');
  if (view === 'map') {
    map.style.display = 'block'; grid.style.display = 'none';
    mb.classList.add('active'); lb.classList.remove('active');
    renderPropMap();
  } else {
    map.style.display = 'none'; grid.style.display = '';
    lb.classList.add('active'); mb.classList.remove('active');
  }
}

function renderPropMap() {
  if (typeof L === 'undefined') return;
  if (!_propMap) {
    _propMap = L.map('propMap').setView([34.9, 33.2], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18
    }).addTo(_propMap);
  }
  _propMarkers.forEach(m => _propMap.removeLayer(m));
  _propMarkers = [];
  const statusColor = { ok:'#4fc3a1', warning:'#f0a500', issue:'#e05c5c' };
  Object.values(State.properties).forEach(p => {
    const base = CITY_COORDS[p.city];
    if (!base) return;
    const lat = base[0] + (Math.random()-0.5)*0.03;
    const lng = base[1] + (Math.random()-0.5)*0.03;
    const color = statusColor[p.status] || '#c9a84c';
    const marker = L.circleMarker([lat, lng], {
      radius: 9, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.9
    }).addTo(_propMap);
    marker.bindPopup(`<b>${p.address}</b><br>${p.city||''}<br>${getClientName(p.clientId)}<br>${TARIFF_LABELS[p.tariff]||p.tariff}`);
    _propMarkers.push(marker);
  });
  // Mobile fix: container often has no size on first show — recalc a few times
  setTimeout(() => _propMap.invalidateSize(), 100);
  setTimeout(() => _propMap.invalidateSize(), 400);
  setTimeout(() => _propMap.invalidateSize(), 800);
}
const TARIFF_LABELS = { basic: 'Basic', standard: 'Standard', premium: 'Premium' };

function renderProperties() {
  const grid = document.getElementById('propertiesGrid');
  const empty = document.getElementById('propEmpty');
  let list = Object.values(State.properties);
  if (State.propFilter !== 'all') list = list.filter(p => p.status === State.propFilter);
  if (State.propCityFilter !== 'all') list = list.filter(p => (p.city||'') === State.propCityFilter);
  if (State.propSearch) {
    const q = State.propSearch.toLowerCase();
    list = list.filter(p => (p.address||'').toLowerCase().includes(q) || (p.city||'').toLowerCase().includes(q) || getClientName(p.clientId).toLowerCase().includes(q));
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
          <div class="property-location">${p.city ? '📍 ' + escapeHtml(p.city) : ''}${p.city && p.notes ? ' · ' : ''}${escapeHtml(p.notes||'')}</div>
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
  const client = State.clients[p.clientId] || {};
  const visits = Object.values(State.visits).filter(v => v.propId === id).sort((a,b)=>a.date>b.date?-1:1);
  const reports = Object.values(State.reports).filter(r => r.propId === id).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const upcoming = visits.filter(v => v.status !== 'done');

  const visitsHtml = visits.slice(0,5).map(v => {
    const SL = { planned:'Запланирован', urgent:'Срочно', issue:'Проблема', done:'Выполнен' };
    const SC = { planned:'status-planned', urgent:'status-urgent', issue:'status-issue', done:'status-done' };
    return `<div class="detail-row"><span>${formatDate(v.date)} · ${v.type||''}</span><span class="status-badge ${SC[v.status]||'status-planned'}">${SL[v.status]||'—'}</span></div>`;
  }).join('') || '<div style="color:var(--text3);font-size:13px">Визитов нет</div>';

  const reportsHtml = reports.slice(0,4).map(r => {
    const cond = { ok:'✅ Норма', warning:'⚠️ Замечание', issue:'❌ Проблема' };
    return `<div class="detail-row" style="cursor:pointer" onclick="closeModal('propertyDetailModal');openReport('${r.id}')"><span>${formatDate(r.date||r.createdAt)}</span><span>${cond[r.condition]||'—'} ${r.photoUrls?.length?`📷${r.photoUrls.length}`:''}</span></div>`;
  }).join('') || '<div style="color:var(--text3);font-size:13px">Отчётов нет</div>';

  document.getElementById('propertyDetailTitle').textContent = p.address;
  document.getElementById('propertyDetailBody').innerHTML = `
    <div class="detail-head">
      <div class="property-icon ${p.type||'apt'}" style="font-size:30px">${TYPE_ICONS[p.type||'apt']}</div>
      <div>
        <div style="font-size:16px;font-weight:500">${p.address}</div>
        <div style="font-size:13px;color:var(--text2)">${client.name||'—'} · ${client.country||''}</div>
        <div style="margin-top:6px"><span class="status-badge ${STATUS_CLASSES[p.status]||'status-done'}">${STATUS_LABELS[p.status]||'—'}</span></div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-stat"><div class="detail-stat-val">${TARIFF_LABELS[p.tariff]||p.tariff}</div><div class="detail-stat-lbl">€${TARIFF_PRICE[p.tariff]||0}/мес</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${visits.length}</div><div class="detail-stat-lbl">визитов</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${reports.length}</div><div class="detail-stat-lbl">отчётов</div></div>
    </div>
    ${p.notes ? `<div class="report-section"><div class="report-section-title">Примечания</div><div style="font-size:13px;color:var(--text2)">${escapeHtml(p.notes)}</div></div>` : ''}
    ${p.access ? `<div class="report-section"><div class="report-section-title">🔑 Доступ <button onclick="this.nextElementSibling.style.filter=this.nextElementSibling.style.filter?'':'blur(5px)'" style="font-size:11px;padding:2px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text2);cursor:pointer;margin-left:6px">скрыть/показать</button></div><div style="font-size:13px;color:var(--text);white-space:pre-wrap;background:var(--surface2);padding:8px 10px;border-radius:8px;margin-top:4px">${escapeHtml(p.access)}</div></div>` : ''}
    <div class="report-section"><div class="report-section-title">Следующий визит</div><div style="font-size:14px">${upcoming.length ? formatDate(upcoming[0].date) : '— не запланирован'}</div></div>
    <div class="report-section"><div class="report-section-title">Контакты клиента</div><div style="font-size:13px;color:var(--text2)">📱 ${client.phone||'—'} · ${client.tg||'—'}</div></div>
    <div class="report-section"><div class="report-section-title">История визитов</div>${visitsHtml}</div>
    <div class="report-section"><div class="report-section-title">Отчёты</div>${reportsHtml}</div>
  `;
  document.getElementById('propDetailVisitBtn').onclick = () => { closeModal('propertyDetailModal'); scheduleVisit(id); };
  document.getElementById('propDetailEditBtn').onclick = () => { closeModal('propertyDetailModal'); editProperty(id); };
  document.getElementById('propDetailDeleteBtn').onclick = () => deleteProperty(id);
  document.getElementById('propDetailRecurBtn').onclick = () => generateRecurringVisits(id);
  openModal('propertyDetailModal');
}

// Recurring visits per tariff. Basic = every 2 weeks (≈2/mo),
// Standard = weekly (≈4/mo), Premium = weekly. Generates the next ~4 weeks
// of visits, skipping dates that already have a visit for this property.
const TARIFF_INTERVAL_DAYS = { basic: 14, standard: 7, premium: 7 };
const TARIFF_DEFAULT_TASKS = {
  basic:    ['Проветривание', 'Проверка замков', 'Фотофиксация'],
  standard: ['Проветривание', 'Полив растений', 'Проверка счетов', 'Фотофиксация'],
  premium:  ['Проветривание', 'Полив растений', 'Проверка счетов', 'Фотофиксация', 'Проверка замков'],
};

async function generateRecurringVisits(propId) {
  const p = State.properties[propId];
  if (!p) return;
  const interval = TARIFF_INTERVAL_DAYS[p.tariff] || 14;
  const tasks = TARIFF_DEFAULT_TASKS[p.tariff] || TARIFF_DEFAULT_TASKS.basic;
  const horizonDays = 28; // ~1 month ahead
  const perMonth = p.tariff === 'basic' ? 2 : 4;

  if (!confirm(`Создать график визитов на месяц вперёд для тарифа ${TARIFF_LABELS[p.tariff]||p.tariff} (≈${perMonth} визита, раз в ${interval} дн.)?`)) return;

  // Existing visit dates for this property to avoid duplicates
  const existing = new Set(Object.values(State.visits).filter(v => v.propId === propId).map(v => v.date));

  // Start from nextVisit if it's in the future, else from interval days from today
  const today = new Date(); today.setHours(0,0,0,0);
  let start = p.nextVisit ? new Date(p.nextVisit) : new Date(today.getTime() + interval*86400000);
  if (isNaN(start) || start < today) start = new Date(today.getTime() + interval*86400000);

  let created = 0;
  for (let day = 0; day <= horizonDays; day += interval) {
    const d = new Date(start.getTime() + day*86400000);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (existing.has(ds)) continue;
    const id = 'v' + Date.now() + '_' + created;
    await DB.set(`visits/${id}`, {
      id, propId, date: ds, type: 'planned',
      notes: 'Авто-визит по тарифу', tasks: [...tasks], status: 'planned', recurring: true
    });
    existing.add(ds);
    created++;
  }

  closeModal('propertyDetailModal');
  showToast(created ? `✅ Создано визитов: ${created}` : 'Визиты на этот период уже есть');
  if (created) {
    await pushNotification(`🔁 Сгенерирован график визитов: ${p.address} (${created})`, 'info');
    // Notify client
    tryTgNotify(propId, `📅 Запланирован график визитов на ближайший месяц (${created})`);
  }
}

function editProperty(id) {
  const p = State.properties[id];
  if (!p) return;
  State.editingPropId = id;
  document.getElementById('propModalTitle').textContent = 'Редактировать объект';
  document.getElementById('propAddress').value = p.address || '';
  if (document.getElementById('propCity')) document.getElementById('propCity').value = p.city || '';
  populateClientSelects();
  setTimeout(() => { document.getElementById('propClientSel').value = p.clientId || ''; }, 50);
  document.getElementById('propType').value = p.type || 'apt';
  document.getElementById('propTariff').value = p.tariff || 'basic';
  document.getElementById('propNextVisit').value = p.nextVisit || '';
  document.getElementById('propNotes').value = p.notes || '';
  if (document.getElementById('propAccess')) document.getElementById('propAccess').value = p.access || '';
  openModal('addPropertyModal');
}

async function deleteProperty(id) {
  if (!confirm('Удалить объект? Визиты и отчёты останутся, но без привязки.')) return;
  await DB.remove(`properties/${id}`);
  closeModal('propertyDetailModal');
  showToast('🗑 Объект удалён');
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
    city:       document.getElementById('propCity')?.value || '',
    type:       document.getElementById('propType').value,
    tariff:     document.getElementById('propTariff').value,
    nextVisit:  document.getElementById('propNextVisit').value,
    notes:      document.getElementById('propNotes').value.trim(),
    access:     document.getElementById('propAccess')?.value.trim() || '',
    icon:       TYPE_ICONS[document.getElementById('propType').value] || '🏠',
  };

  // Edit mode
  if (State.editingPropId) {
    await DB.update(`properties/${State.editingPropId}`, data);
    State.editingPropId = null;
    document.getElementById('propModalTitle').textContent = 'Новый объект';
    closeModal('addPropertyModal');
    clearForm(['propAddress','propNotes']);
    showToast('✅ Объект обновлён!');
    return;
  }

  data.status = 'ok';
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
function clientMonthly(clientId) {
  return Object.values(State.properties)
    .filter(p => p.clientId === clientId)
    .reduce((s, p) => s + (TARIFF_PRICE[p.tariff] || 0), 0);
}

function renderClients() {
  let list = Object.values(State.clients);
  // Newest first: by createdAt, fallback to numeric part of the id (c1779...)
  const ts = c => (c.createdAt || +String(c.id||'').replace(/\D/g,'') || 0);
  list.sort((a, b) => ts(b) - ts(a));
  if (State.clientSearch) {
    const q = State.clientSearch.toLowerCase();
    list = list.filter(c =>
      (c.name||'').toLowerCase().includes(q) ||
      (c.country||'').toLowerCase().includes(q) ||
      (c.tg||'').toLowerCase().includes(q) ||
      (c.phone||'').toLowerCase().includes(q)
    );
  }
  document.getElementById('clientsList').innerHTML = list.map(c => {
    const monthly = clientMonthly(c.id);
    const propCount = Object.values(State.properties).filter(p => p.clientId === c.id).length;
    const tgDot = c.tgChatId ? '🟢' : '⚪';
    return `
    <div class="client-card" onclick="openClientDetail('${c.id}')">
      <div class="client-avatar" style="background:${c.color||'#4fc3a1'}22;color:${c.color||'#4fc3a1'}">${initials(c.name)}</div>
      <div class="client-info">
        <div class="client-name">${c.name} <span style="font-size:11px">${tgDot}</span></div>
        <div class="client-country">${c.country||''} · ${c.tg||'—'}</div>
        <div class="client-props">📱 ${c.phone||'—'} · ⌂ ${propCount}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        ${propCount ? `<div class="client-monthly">€${monthly}</div><div style="font-size:10px;color:var(--text3)">в месяц</div>` : `<div style="font-size:12px;color:var(--text3)">нет объектов</div>`}
        <button class="client-link-btn" style="margin-top:6px" onclick="event.stopPropagation();showClientLink('${c.id}')">🔗 Портал</button>
      </div>
    </div>`;
  }).join('') || '<div class="empty-state"><div style="font-size:48px">👤</div><div>Нет клиентов</div><button class="btn-primary" onclick="openModal(\'addClientModal\')">+ Добавить</button></div>';
}

function addPropertyForClient(clientId) {
  closeModal('clientDetailModal');
  State.editingPropId = null;
  document.getElementById('propModalTitle').textContent = 'Новый объект';
  clearForm(['propAddress','propNotes']);
  // Preselect the client once the dropdown is ready
  setTimeout(() => {
    const sel = document.getElementById('propClientSel');
    if (sel) sel.value = clientId;
    const acc = document.getElementById('propAccess'); if (acc) acc.value = '';
    const city = document.getElementById('propCity'); if (city) city.value = '';
  }, 50);
  openModal('addPropertyModal');
}

function openClientDetail(id) {
  const c = State.clients[id];
  if (!c) return;
  State.currentClientId = id;
  const props = Object.values(State.properties).filter(p => p.clientId === id);
  const propIds = props.map(p => p.id);
  const visits = Object.values(State.visits).filter(v => propIds.includes(v.propId)).sort((a,b)=>a.date>b.date?-1:1);
  const reports = Object.values(State.reports).filter(r => propIds.includes(r.propId)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const requests = Object.values(State.requests).filter(r => r.clientId === id).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const monthly = clientMonthly(id);
  const LANG_LABELS = { ru:'Русский', en:'English', de:'Deutsch', fr:'Français', tr:'Türkçe' };

  const propsHtml = props.map(p => `<div class="detail-row" style="cursor:pointer" onclick="closeModal('clientDetailModal');openPropertyDetail('${p.id}')"><span>${TYPE_ICONS[p.type||'apt']} ${p.address}</span><span>${TARIFF_LABELS[p.tariff]||p.tariff} · €${TARIFF_PRICE[p.tariff]||0}</span></div>`).join('')
    || `<div style="padding:10px 0">
         <div style="color:var(--text3);font-size:13px;margin-bottom:8px">У клиента пока нет объектов. Тариф и счета привязаны к объекту — добавьте дом или квартиру, чтобы выставлять счета.</div>
         <button class="btn-primary" style="font-size:13px;padding:8px 14px" onclick="addPropertyForClient('${id}')">➕ Добавить объект клиенту</button>
       </div>`;
  const reportsHtml = reports.slice(0,5).map(r => {
    const cond = { ok:'✅', warning:'⚠️', issue:'❌' };
    const p = State.properties[r.propId] || {};
    return `<div class="detail-row" style="cursor:pointer" onclick="closeModal('clientDetailModal');openReport('${r.id}')"><span>${formatDate(r.date||r.createdAt)} · ${p.address||''}</span><span>${cond[r.condition]||'—'}</span></div>`;
  }).join('') || '<div style="color:var(--text3);font-size:13px">Отчётов нет</div>';

  document.getElementById('clientDetailTitle').textContent = c.name;
  document.getElementById('clientDetailBody').innerHTML = `
    <div class="detail-head">
      <div class="client-avatar" style="width:52px;height:52px;font-size:18px;background:${c.color||'#4fc3a1'}22;color:${c.color||'#4fc3a1'}">${initials(c.name)}</div>
      <div>
        <div style="font-size:16px;font-weight:500">${c.name}</div>
        <div style="font-size:13px;color:var(--text2)">${c.country||''} · ${LANG_LABELS[c.lang]||c.lang||'—'}</div>
        <div style="margin-top:4px;font-size:12px;color:var(--text3)">${c.tgChatId ? '🟢 Подключён к Telegram' : '⚪ Не подключён к боту'}</div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-stat"><div class="detail-stat-val">€${monthly}</div><div class="detail-stat-lbl">в месяц</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${props.length}</div><div class="detail-stat-lbl">объектов</div></div>
      <div class="detail-stat"><div class="detail-stat-val">${reports.length}</div><div class="detail-stat-lbl">отчётов</div></div>
    </div>
    <div class="report-section"><div class="report-section-title">Контакты</div><div style="font-size:13px;color:var(--text2)">📱 ${c.phone||'—'} · ${c.tg||'—'}</div></div>
    <div class="report-section"><div class="report-section-title">Объекты</div>${propsHtml}</div>
    <div class="report-section"><div class="report-section-title">Последние отчёты</div>${reportsHtml}</div>
    <div class="report-section"><div class="report-section-title">Активность</div><div style="font-size:13px;color:var(--text2)">Визитов: ${visits.length} · Заявок: ${requests.length}</div></div>
  `;
  document.getElementById('clientDetailPortalBtn').onclick = () => { closeModal('clientDetailModal'); showClientLink(id); };
  document.getElementById('clientDetailEditBtn').onclick = () => { closeModal('clientDetailModal'); editClient(id); };
  document.getElementById('clientDetailDeleteBtn').onclick = () => deleteClient(id);
  openModal('clientDetailModal');
}

function editClient(id) {
  const c = State.clients[id];
  if (!c) return;
  State.editingClientId = id;
  document.querySelector('#addClientModal .modal-title').textContent = 'Редактировать клиента';
  document.getElementById('clientName').value = c.name || '';
  document.getElementById('clientCountry').value = c.country || '';
  document.getElementById('clientPhone').value = c.phone || '';
  document.getElementById('clientTg').value = c.tg || '';
  document.getElementById('clientChatId').value = c.tgChatId || '';
  document.getElementById('clientLang').value = c.lang || 'ru';
  openModal('addClientModal');
}

async function deleteClient(id) {
  const props = Object.values(State.properties).filter(p => p.clientId === id);
  if (props.length) { showToast(`Сначала удалите объекты клиента (${props.length})`); return; }
  if (!confirm('Удалить клиента?')) return;
  await DB.remove(`clients/${id}`);
  closeModal('clientDetailModal');
  showToast('🗑 Клиент удалён');
}

async function saveClient() {
  const name = document.getElementById('clientName').value.trim();
  if (!name) { showToast('Введите имя'); return; }

  // Edit mode
  if (State.editingClientId) {
    await DB.update(`clients/${State.editingClientId}`, {
      name,
      country: document.getElementById('clientCountry').value.trim(),
      phone:   document.getElementById('clientPhone').value.trim(),
      tg:      document.getElementById('clientTg').value.trim(),
      tgChatId: document.getElementById('clientChatId').value.trim(),
      lang:    document.getElementById('clientLang').value,
    });
    State.editingClientId = null;
    document.querySelector('#addClientModal .modal-title').textContent = 'Новый клиент';
    closeModal('addClientModal');
    clearForm(['clientName','clientCountry','clientPhone','clientTg','clientChatId']);
    showToast('✅ Клиент обновлён!');
    return;
  }

  const token = 'tok-' + Math.random().toString(36).slice(2, 10);
  const colors = ['#4fc3a1','#f0a500','#9b8db0','#5e81ff','#e05c5c','#c9a84c'];
  const data = {
    name,
    country:      document.getElementById('clientCountry').value.trim(),
    phone:        document.getElementById('clientPhone').value.trim(),
    tg:           document.getElementById('clientTg').value.trim(),
    lang:         document.getElementById('clientLang').value,
    accessToken:  token,
    tgChatId:     document.getElementById('clientChatId').value.trim(),
    color:        colors[Math.floor(Math.random() * colors.length)],
    monthly:      0,
  };
  const id = 'c' + Date.now();
  await DB.set(`clients/${id}`, { ...data, id });
  closeModal('addClientModal');
  clearForm(['clientName','clientCountry','clientPhone','clientTg','clientChatId']);
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
  const ts = c => (c.createdAt || +String(c.id||'').replace(/\D/g,'') || 0);
  list.sort((a, b) => ts(b) - ts(a));
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
  State.currentVisitId = id;
  const p = State.properties[v.propId] || {};
  const SL = { planned:'Запланирован', urgent:'Срочно', issue:'Проблема', done:'Выполнен' };
  const SC = { planned:'status-planned', urgent:'status-urgent', issue:'status-issue', done:'status-done' };
  const TL = { planned:'Плановый осмотр', urgent:'Срочный выезд', initial:'Первичный осмотр', seasonal:'Завершение сезона' };
  const report = Object.values(State.reports).find(r => r.visitId === id);

  document.getElementById('visitDetailTitle').textContent = p.address || 'Визит';
  document.getElementById('visitDetailBody').innerHTML = `
    <div class="report-section"><div class="report-section-title">Дата и тип</div><div style="font-size:14px">${formatDate(v.date)} · ${TL[v.type]||v.type||'—'}</div></div>
    <div class="report-section"><div class="report-section-title">Объект</div><div style="font-size:14px">${p.address||'—'} · ${getClientName(p.clientId)}</div></div>
    <div class="report-section"><div class="report-section-title">Статус</div><span class="status-badge ${SC[v.status]||'status-planned'}">${SL[v.status]||'—'}</span></div>
    ${(v.tasks||[]).length ? `<div class="report-section"><div class="report-section-title">Задачи</div><div class="visit-tasks">${v.tasks.map(t=>`<span class="task-chip">${t}</span>`).join('')}</div></div>` : ''}
    ${v.notes ? `<div class="report-section"><div class="report-section-title">Заметки</div><div style="font-size:13px;color:var(--text2)">${v.notes}</div></div>` : ''}
    ${report ? `<div class="report-section"><div class="report-section-title">Отчёт</div><button class="client-link-btn" onclick="closeModal('visitDetailModal');openReport('${report.id}')">📄 Открыть отчёт</button></div>` : ''}
  `;
  const reportBtn = document.getElementById('visitDetailReportBtn');
  const delBtn = document.getElementById('visitDetailDeleteBtn');
  if (v.status === 'done') {
    reportBtn.textContent = report ? '✓ Отчёт готов' : '+ Создать отчёт';
    reportBtn.disabled = !!report;
  } else {
    reportBtn.textContent = '✓ Завершить и создать отчёт';
    reportBtn.disabled = false;
  }
  reportBtn.onclick = () => { closeModal('visitDetailModal'); completeVisit(id); };
  delBtn.onclick = async () => {
    if (!confirm('Удалить визит?')) return;
    await DB.remove(`visits/${id}`);
    closeModal('visitDetailModal');
    showToast('🗑 Визит удалён');
  };
  openModal('visitDetailModal');
}

async function completeVisit(id) {
  // Open report form with this visit pre-selected.
  // The visit is marked "done" only when the report is actually saved (saveReport),
  // so cancelling the form no longer loses the visit.
  resetReportForm();
  openModal('createReportModal');
  setTimeout(() => {
    const sel = document.getElementById('reportVisitSel');
    if (sel) {
      // ensure the visit is selectable even if not in the "not done" list yet
      if (![...sel.options].some(o => o.value === id)) {
        const v = State.visits[id]; const p = State.properties[v?.propId];
        const opt = document.createElement('option');
        opt.value = id; opt.textContent = `${p?.address||v?.propId} · ${v?.date}`;
        sel.appendChild(opt);
      }
      sel.value = id;
    }
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
    html += `<div class="cal-cell ${isToday?'today':''} ${dayV.length?'has-visits':''}" onclick="onCalendarDayClick('${ds}')"><div class="cal-num">${d}</div>${dots}</div>`;
  }

  const total = offset + daysInMonth;
  const rem = (7 - (total % 7)) % 7;
  for (let d = 1; d <= rem; d++) html += `<div class="cal-cell other-month"><div class="cal-num">${d}</div></div>`;
  html += '</div>';
  document.getElementById('calendarGrid').innerHTML = html;
}

function onCalendarDayClick(ds) {
  const dayV = Object.values(State.visits).filter(v => v.date === ds).sort((a,b)=>(a.type>b.type?1:-1));
  if (dayV.length === 1) { openVisitDetail(dayV[0].id); return; }
  if (dayV.length > 1) { openDayVisits(ds, dayV); return; }
  // No visits — offer to create one on this date
  document.getElementById('visitDate').value = ds;
  openModal('addVisitModal');
}

function openDayVisits(ds, dayV) {
  const SL = { planned:'Запланирован', urgent:'Срочно', issue:'Проблема', done:'Выполнен' };
  const SC = { planned:'status-planned', urgent:'status-urgent', issue:'status-issue', done:'status-done' };
  document.getElementById('dayVisitsTitle').textContent = formatDate(ds);
  document.getElementById('dayVisitsBody').innerHTML = dayV.map(v => {
    const p = State.properties[v.propId] || {};
    return `<div class="detail-row" style="cursor:pointer" onclick="closeModal('dayVisitsModal');openVisitDetail('${v.id}')">
      <span>${p.address||v.propId} · ${v.type||''}</span>
      <span class="status-badge ${SC[v.status]||'status-planned'}">${SL[v.status]||'—'}</span>
    </div>`;
  }).join('');
  document.getElementById('dayVisitsAddBtn').onclick = () => {
    closeModal('dayVisitsModal');
    document.getElementById('visitDate').value = ds;
    openModal('addVisitModal');
  };
  openModal('dayVisitsModal');
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
          ${r.rating ? `<span class="report-chip" style="color:var(--accent2)">${'⭐'.repeat(r.rating)} оценка</span>` : ''}
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

  // Upload photos (compressed to keep DB small on Spark plan)
  const photoUrls = [];
  for (let i = 0; i < State.uploadedPhotos.length; i++) {
    const ph = State.uploadedPhotos[i];
    setProgress(Math.round((i / Math.max(State.uploadedPhotos.length,1)) * 70), `Фото ${i+1}/${State.uploadedPhotos.length}…`);
    try {
      const compressed = await compressImage(ph.dataUrl, 1000, 0.7);
      const url = await Storage.uploadBase64(`reports/${visitId}/photo_${i}_${Date.now()}`, compressed);
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
  const ph = document.getElementById('photoPlaceholder');
  if (ph) ph.style.display = 'flex';
  const vn = document.getElementById('videoName');
  if (vn) vn.textContent = '';
  clearForm(['reportComment','reportBill']);
  showToast('✅ Отчёт сохранён и отправлен!');
}

// Reset the report form's photo/video state (called when opening the form)
function resetReportForm() {
  State.uploadedPhotos = [];
  State.uploadedVideo = null;
  const prev = document.getElementById('photoPreview');
  if (prev) prev.innerHTML = '';
  const ph = document.getElementById('photoPlaceholder');
  if (ph) ph.style.display = 'flex';
  const vn = document.getElementById('videoName');
  if (vn) vn.textContent = '';
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
  if (files.length) placeholder.style.display = 'none';

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      const pid = 'ph' + Date.now() + Math.random().toString(36).slice(2,6);
      State.uploadedPhotos.push({ pid, file, dataUrl });
      const div = document.createElement('div');
      div.className = 'photo-preview-item';
      div.dataset.pid = pid;
      div.innerHTML = `<img src="${dataUrl}"/><button class="remove-photo" onclick="removePhoto('${pid}')">✕</button>`;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = ''; // allow re-selecting the same file
}

function removePhoto(pid) {
  State.uploadedPhotos = State.uploadedPhotos.filter(p => p.pid !== pid);
  const el = document.querySelector(`.photo-preview-item[data-pid="${pid}"]`);
  if (el) el.remove();
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

// ── LEADS (incoming from marketing landing) ─────────────────
function renderLeads() {
  const list = Object.values(State.leads || {})
    .sort((a, b) => (b.createdAt||0) - (a.createdAt||0));
  const new_ = list.filter(l => l.status === 'new');
  setText('leadsCount', `${new_.length} новых · всего ${list.length}`);

  const tariffLabel = { basic:'Basic €50', standard:'Standard €75', premium:'Premium €100' };
  const statusChip = {
    new: '<span class="report-chip" style="background:rgba(79,195,161,0.15);color:var(--teal,#4fc3a1)">🆕 новый</span>',
    accepted: '<span class="report-chip">✅ принят</span>',
    dismissed: '<span class="report-chip" style="color:var(--text3)">↩ отклонён</span>',
  };
  const langFlag = { ru:'🇷🇺', en:'🇬🇧', de:'🇩🇪', fr:'🇫🇷', tr:'🇹🇷' };

  document.getElementById('leadsList').innerHTML = list.map(l => `
    <div class="report-item" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-weight:600;font-size:15px">${escapeHtml(l.name||'—')} ${langFlag[l.lang]||''}</div>
          <div style="font-size:13px;color:var(--text2);margin-top:4px">
            📞 ${escapeHtml(l.phone||'—')} · 📧 ${escapeHtml(l.email||'—')}<br/>
            📍 ${escapeHtml(l.city||'—')} · 💼 ${tariffLabel[l.tariff] || '—'}
          </div>
          ${l.message ? `<div style="font-size:13px;color:var(--text);margin-top:8px;padding:8px 10px;background:var(--surface2);border-radius:8px;white-space:pre-wrap">${escapeHtml(l.message)}</div>` : ''}
          <div style="font-size:11px;color:var(--text3);margin-top:6px">${new Date(l.createdAt||0).toLocaleString('ru-RU')}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          ${statusChip[l.status] || ''}
          ${l.status === 'new' ? `
            <button class="btn-primary" onclick="acceptLead('${l.id}')" style="font-size:12px;padding:6px 12px">→ В клиенты</button>
            <button class="btn-secondary" onclick="dismissLead('${l.id}')" style="font-size:12px;padding:6px 12px">Отклонить</button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('') || '<div style="color:var(--text3);font-size:13px;padding:24px;text-align:center">Заявок с сайта пока нет.<br><br>Маркетинговая страница (landing.html) → форма «Оставить заявку» → лиды появятся здесь.</div>';
}

function updateLeadBadge() {
  const new_ = Object.values(State.leads || {}).filter(l => l.status === 'new').length;
  const badge = document.getElementById('leadBadge');
  if (!badge) return;
  badge.textContent = new_;
  badge.style.display = new_ ? 'inline-flex' : 'none';
}

async function acceptLead(id) {
  const l = State.leads[id];
  if (!l) return;
  const cid = 'c' + Date.now();
  const token = 'tok-' + Math.random().toString(36).slice(2,10);
  const colors = ['#4fc3a1','#f0a500','#9b8db0','#5e81ff','#e05c5c','#c9a84c'];
  await DB.set(`clients/${cid}`, {
    id: cid, name: l.name||'', country: l.city||'', phone: l.phone||'', email: l.email||'',
    tg: '', lang: l.lang || 'ru', accessToken: token, tgChatId: '', monthly: 0,
    color: colors[Math.floor(Math.random()*colors.length)],
    notes: l.message || '', source: 'landing',
  });
  await DB.update(`leads/${id}`, { status: 'accepted', acceptedAt: Date.now(), clientId: cid });
  showToast('✅ Клиент создан из заявки');
  navigateTo('clients');
}

async function dismissLead(id) {
  if (!confirm('Отклонить заявку?')) return;
  await DB.update(`leads/${id}`, { status: 'dismissed', dismissedAt: Date.now() });
  showToast('↩ Заявка отклонена');
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
  const btn = document.getElementById('acceptRequestBtn');
  if (r.status === 'done') {
    btn.textContent = '↺ Вернуть в работу';
  } else if (r.status === 'inprogress') {
    btn.textContent = '✅ Отметить выполненной';
  } else {
    btn.textContent = '🔧 Принять в работу';
  }
  openModal('requestModal');
}

async function acceptRequest() {
  if (!State.currentReqId) return;
  const r = State.requests[State.currentReqId];
  // new → inprogress → done → (reopen) inprogress
  let newStatus;
  if (r?.status === 'new' || !r?.status) newStatus = 'inprogress';
  else if (r?.status === 'inprogress')   newStatus = 'done';
  else                                    newStatus = 'inprogress'; // reopen from done
  await DB.update(`requests/${State.currentReqId}`, { status: newStatus });
  closeModal('requestModal');
  showToast(newStatus === 'done' ? '✅ Заявка выполнена!' : '🔧 Заявка в работе!');

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
function activateTgUI() {
  document.getElementById('tgDot').classList.add('online');
  document.getElementById('tgStatusLabel').textContent = 'Бот подключён';
  document.getElementById('tgStatusSub').textContent = 'Сервер активен';
  document.getElementById('tgToggle').textContent = 'Активен';
}

// Check bot health via HTTP endpoint
async function checkBotHealth() {
  const apiUrl = (State.settings?.agency?.aiApiUrl || '').replace(/\/+$/, '');
  if (!apiUrl) { showToast('Укажите URL AI-сервера в Настройках'); return; }
  try {
    const r = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    if (data.ok) {
      activateTgUI();
      addTgLog('success', `✓ Бот онлайн: ${data.version || '—'}`);
      showToast(`✅ Бот онлайн (${data.version})`);
    } else throw new Error('Not OK');
  } catch (e) {
    document.getElementById('tgDot').classList.remove('online');
    document.getElementById('tgStatusLabel').textContent = 'Не отвечает';
    document.getElementById('tgStatusSub').textContent = 'Проверьте Railway';
    addTgLog('error', '✗ Бот не отвечает');
    showToast('⚠️ Бот не отвечает');
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
  if (!client) { showToast('❌ Клиент не найден'); return; }
  if (!client.tgChatId) { showToast('❌ У клиента не подключён Telegram'); return; }

  const settings = await DB.once('settings/telegram');
  // Mark for the bot to deliver (reliable: bot sends with photos, no CORS/base64 issues)
  await DB.update(`reports/${r.id}`, { sendToClient: true, sentToClient: false });
  // Also attempt direct send as a fallback (works if a token is set and photos are public URLs)
  if (settings?.token) await sendTgReport(r, p, client);
  closeModal('reportModal');
  showToast('✈ Отправка клиенту запущена');
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
function setBillingFilter(filter) {
  State.billingFilter = (State.billingFilter === filter && filter !== 'all') ? 'all' : filter;
  renderBilling();
}

function renderBilling() {
  markOverdueInvoices();
  const all = Object.values(State.invoices).sort((a,b) => (b.createdAt||0)-(a.createdAt||0));
  const thisPeriod = ymLabel();

  const paidMonth = all.filter(i => i.status === 'paid' && i.period === thisPeriod).reduce((s,i)=>s+(i.amount||0),0);
  const pending   = all.filter(i => i.status === 'pending').reduce((s,i)=>s+(i.amount||0),0);
  const overdue   = all.filter(i => i.status === 'overdue').reduce((s,i)=>s+(i.amount||0),0);

  setText('billMonth',   `€${paidMonth}`);
  setText('billPending', `€${pending}`);
  setText('billOverdue', `€${overdue}`);

  // Filter list by selected KPI (default: all)
  const flt = State.billingFilter || 'all';
  const list = (flt === 'all')
    ? all
    : (flt === 'paidMonth')
      ? all.filter(i => i.status === 'paid' && i.period === thisPeriod)
      : all.filter(i => i.status === flt);

  const statusLabel = { paid:'✓ Оплачен', pending:'⏳ Ожидает', overdue:'⚠ Просрочен' };
  const statusClass = { paid:'inv-paid', pending:'inv-pending', overdue:'inv-overdue' };

  // Action button: cycle pending → paid, overdue → paid, paid → pending
  const nextAction = { pending:'paid', overdue:'paid', paid:'pending' };
  const actionLabel = { pending:'Оплачен', overdue:'Оплачен', paid:'Сбросить' };

  document.getElementById('invoicesList').innerHTML = list.map(inv => `
    <div class="invoice-item">
      <div class="invoice-num">#${(inv.id||'').slice(-4)}</div>
      <div class="invoice-info"><div class="invoice-client">${getClientName(inv.clientId)}</div><div class="invoice-period">${inv.period||''}</div></div>
      <div class="invoice-amount">€${inv.amount||0}</div>
      <div class="invoice-status-cell ${statusClass[inv.status]||''}">${statusLabel[inv.status]||'—'}</div>
      <div class="invoice-actions">
        <button class="client-link-btn" onclick="setInvoiceStatus('${inv.id}','${nextAction[inv.status]||'paid'}')">${actionLabel[inv.status]||'Оплачен'}</button>
        <button class="client-link-btn" onclick="downloadInvoicePdf('${inv.id}')">📄 PDF</button>
      </div>
    </div>`).join('') || `<div style="color:var(--text3);font-size:13px;padding:16px;text-align:center">${flt === 'all' ? 'Нет счетов' : 'Нет счетов в этом фильтре. <a href="#" onclick="setBillingFilter(\'all\');return false" style="color:var(--accent2)">Показать все</a>'}</div>`;

  // Reflect active filter on KPI cards
  document.querySelectorAll('#page-billing .kpi-card').forEach(c => c.classList.remove('kpi-active'));
  if (flt === 'paidMonth' || flt === 'all' && !State.billingFilter) document.querySelectorAll('#page-billing .kpi-card')[0]?.classList.toggle('kpi-active', flt !== 'all');
  if (flt === 'pending') document.querySelectorAll('#page-billing .kpi-card')[1]?.classList.add('kpi-active');
  if (flt === 'overdue') document.querySelectorAll('#page-billing .kpi-card')[2]?.classList.add('kpi-active');

  // Bar chart — last 6 months of actually-paid revenue (always full data, not filtered)
  renderRevenueChart(all);

  // Debtors: clients with overdue/pending invoices, grouped by client
  const owing = {};
  all.filter(i => i.status === 'overdue' || i.status === 'pending').forEach(i => {
    if (!owing[i.clientId]) owing[i.clientId] = { sum: 0, count: 0, overdue: false };
    owing[i.clientId].sum += i.amount || 0;
    owing[i.clientId].count++;
    if (i.status === 'overdue') owing[i.clientId].overdue = true;
  });
  const debtors = Object.entries(owing).sort((a,b) => b[1].sum - a[1].sum);
  const dTitle = document.getElementById('debtorsTitle');
  const dList = document.getElementById('debtorsList');
  if (dTitle && dList) {
    if (debtors.length) {
      dTitle.style.display = '';
      dList.innerHTML = debtors.map(([cid, d]) => `
        <div class="invoice-item" style="${d.overdue?'border-color:var(--red,#e05c5c)':''}">
          <div class="invoice-info"><div class="invoice-client">${getClientName(cid)}</div><div class="invoice-period">${d.count} счёт(ов)${d.overdue?' · есть просрочка':''}</div></div>
          <div class="invoice-amount" style="${d.overdue?'color:var(--red,#e05c5c)':''}">€${d.sum}</div>
        </div>`).join('');
    } else {
      dTitle.style.display = 'none';
      dList.innerHTML = '';
    }
  }
}

function renderRevenueChart(list) {
  const now = new Date();
  const cols = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('ru-RU', { month:'long', year:'numeric' });
    const short = d.toLocaleDateString('ru-RU', { month:'short' });
    const val = list.filter(inv => inv.status === 'paid' && inv.period === label).reduce((s,inv)=>s+(inv.amount||0),0);
    cols.push({ short, val });
  }
  // If no paid history yet, show projected revenue from active tariffs so chart isn't empty
  const hasData = cols.some(c => c.val > 0);
  if (!hasData) {
    const projected = Object.values(State.properties).reduce((s,p)=>s+(TARIFF_PRICE[p.tariff]||0),0);
    cols.forEach((c,i) => { c.val = Math.round(projected * (0.6 + i*0.08)); c.projected = true; });
  }
  const max = Math.max(...cols.map(c=>c.val), 1);
  document.getElementById('barChart').innerHTML = cols.map(c => `
    <div class="bar-col">
      <div class="bar-val">€${c.val}</div>
      <div class="bar-fill${c.projected?' projected':''}" style="height:${Math.round((c.val/max)*80)||4}px"></div>
      <div class="bar-label">${c.short}</div>
    </div>`).join('');
}

async function setInvoiceStatus(id, status) {
  await DB.update(`invoices/${id}`, { status, paidAt: status === 'paid' ? Date.now() : null });
  showToast(status === 'paid' ? '✅ Счёт отмечен оплаченным' : '↺ Статус сброшен');
}

// Pending invoices from a previous month become "overdue"
function markOverdueInvoices() {
  const curId = ym(); // e.g. 2026_5
  Object.values(State.invoices).forEach(inv => {
    if (inv.status !== 'pending') return;
    // invoice id format: <propId>_<year>_<month>; compare period token
    const token = (inv.id||'').split('_').slice(-2).join('_');
    if (token && token !== curId) {
      DB.update(`invoices/${inv.id}`, { status: 'overdue' }).catch(()=>{});
    }
  });
}

// Generate monthly invoices for all properties (idempotent per property+period)
async function generateMonthlyInvoices() {
  const period = ymLabel();
  const props = Object.values(State.properties);
  let created = 0;
  for (const p of props) {
    const invId = `${p.id}_${ym()}`;
    if (State.invoices[invId]) continue; // already exists this month
    await DB.set(`invoices/${invId}`, {
      id: invId, propId: p.id, clientId: p.clientId,
      period, amount: TARIFF_PRICE[p.tariff] || 0,
      status: 'pending', createdAt: Date.now()
    });
    created++;
  }
  showToast(created ? `✅ Создано счетов: ${created}` : 'Счета на этот месяц уже есть');
  if (created) await pushNotification(`◎ Сгенерированы счета за ${period} (${created})`, 'info');
}

function downloadInvoicePdf(id) {
  const inv = State.invoices[id];
  if (!inv) return;
  const p = State.properties[inv.propId] || {};
  const agency = State.settings.agency || {};
  const statusLabel = { paid:'ОПЛАЧЕН', pending:'ОЖИДАЕТ ОПЛАТЫ', overdue:'ПРОСРОЧЕН' };
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Счёт #${(inv.id||'').slice(-4)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a2332;padding:48px;max-width:760px;margin:0 auto;font-size:14px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d6b5f;padding-bottom:24px;margin-bottom:32px}
    .brand{font-size:26px;font-weight:700;color:#0d6b5f}
    .brand small{display:block;font-size:12px;color:#6b7785;font-weight:400;margin-top:4px}
    .inv-meta{text-align:right;font-size:13px;color:#6b7785;line-height:1.7}
    .inv-no{font-size:20px;font-weight:700;color:#1a2332}
    .row{display:flex;justify-content:space-between;margin-bottom:28px;gap:40px}
    .block-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9aa5b1;margin-bottom:6px}
    .block p{line-height:1.6}
    table{width:100%;border-collapse:collapse;margin:24px 0}
    th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#9aa5b1;border-bottom:2px solid #e2e8f0;padding:10px 0}
    td{padding:14px 0;border-bottom:1px solid #eef2f6}
    .amt{text-align:right;font-weight:600}
    .total{display:flex;justify-content:flex-end;margin-top:20px}
    .total-box{min-width:240px}
    .total-row{display:flex;justify-content:space-between;padding:8px 0}
    .total-grand{font-size:22px;font-weight:700;color:#0d6b5f;border-top:2px solid #0d6b5f;padding-top:12px;margin-top:4px}
    .status{display:inline-block;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;letter-spacing:.04em}
    .status.paid{background:#d8f5ec;color:#0d6b5f}
    .status.pending{background:#fff3d6;color:#9a6b00}
    .status.overdue{background:#ffe0e0;color:#b32020}
    .foot{margin-top:48px;padding-top:20px;border-top:1px solid #eef2f6;color:#9aa5b1;font-size:12px;text-align:center}
  </style></head><body>
    <div class="head">
      <div><div class="brand">${agency.logo ? `<img src="${agency.logo}" style="height:32px;vertical-align:middle;margin-right:8px;border-radius:6px"/>` : '🏛 '}${agency.name||'CyprusGuard Agency'}<small>Home Check-up Service</small></div></div>
      <div class="inv-meta"><div class="inv-no">Счёт #${(inv.id||'').slice(-4)}</div><div>${inv.period||''}</div><div>${formatDate(inv.createdAt)}</div></div>
    </div>
    <div class="row">
      <div class="block"><div class="block-title">Исполнитель</div><p>${agency.name||'CyprusGuard Agency'}<br>${agency.city||'Limassol, Cyprus'}<br>${agency.phone||''}</p></div>
      <div class="block" style="text-align:right"><div class="block-title">Плательщик</div><p>${getClientName(inv.clientId)}<br>${p.address||''}</p></div>
    </div>
    <table>
      <thead><tr><th>Услуга</th><th>Период</th><th class="amt">Сумма</th></tr></thead>
      <tbody><tr><td>Присмотр за объектом — тариф ${TARIFF_LABELS[p.tariff]||p.tariff||'—'}</td><td>${inv.period||''}</td><td class="amt">€${inv.amount||0}</td></tr></tbody>
    </table>
    <div class="total"><div class="total-box">
      <div class="total-row"><span>Подытог</span><span>€${inv.amount||0}</span></div>
      <div class="total-row"><span>НДС</span><span>—</span></div>
      <div class="total-row total-grand"><span>Итого</span><span>€${inv.amount||0}</span></div>
      <div style="text-align:right;margin-top:14px"><span class="status ${inv.status}">${statusLabel[inv.status]||''}</span></div>
    </div></div>
    <div class="foot">Спасибо, что доверяете нам свой дом. ${agency.name||'CyprusGuard'} · ${agency.phone||''}</div>
    <script>window.onload=()=>{window.print()}<\/script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { showToast('Разрешите всплывающие окна для PDF'); return; }
  w.document.write(html); w.document.close();
}

function downloadReportPdf(id) {
  const r = State.reports[id];
  if (!r) return;
  const p = State.properties[r.propId] || {};
  const client = State.clients[p.clientId] || {};
  const agency = State.settings.agency || {};
  const condConf = {
    ok:    { label:'Всё в порядке',    cls:'ok',    icon:'✅' },
    warning:{ label:'Есть замечания',   cls:'warning',icon:'⚠️' },
    issue: { label:'Обнаружена проблема',cls:'issue', icon:'❌' },
  };
  const cc = condConf[r.condition] || condConf.ok;
  const tasksHtml = (r.tasks||[]).map(t => `<li>${escapeHtml(t)}</li>`).join('') || '<li>—</li>';
  const photosHtml = (r.photoUrls||[]).length
    ? `<div class="photos">${r.photoUrls.map(u => `<img src="${u}"/>`).join('')}</div>`
    : '';
  const TL = { planned:'Плановый осмотр', urgent:'Срочный выезд', initial:'Первичный осмотр', seasonal:'Завершение сезона' };
  const visit = State.visits[r.visitId] || {};

  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Отчёт о визите — ${escapeHtml(p.address||'')}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a2332;padding:48px;max-width:780px;margin:0 auto;font-size:14px;line-height:1.5}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0d6b5f;padding-bottom:24px;margin-bottom:28px}
    .brand{font-size:26px;font-weight:700;color:#0d6b5f}
    .brand small{display:block;font-size:12px;color:#6b7785;font-weight:400;margin-top:4px}
    .meta{text-align:right;font-size:13px;color:#6b7785;line-height:1.7}
    .meta .ttl{font-size:18px;font-weight:700;color:#1a2332}
    .row{display:flex;justify-content:space-between;gap:40px;margin-bottom:24px}
    .block-title{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#9aa5b1;margin-bottom:6px}
    .status{display:inline-block;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:700;margin:8px 0 20px}
    .status.ok{background:#d8f5ec;color:#0d6b5f}
    .status.warning{background:#fff3d6;color:#9a6b00}
    .status.issue{background:#ffe0e0;color:#b32020}
    .section{margin-bottom:22px}
    h3{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#9aa5b1;border-bottom:1px solid #eef2f6;padding-bottom:6px;margin-bottom:10px}
    ul{list-style:none}
    li{padding:5px 0 5px 24px;position:relative}
    li:before{content:'✓';position:absolute;left:0;color:#0d6b5f;font-weight:700}
    .comment{background:#f7f9fb;border-radius:8px;padding:14px;color:#34404e}
    .photos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
    .photos img{width:100%;height:140px;object-fit:cover;border-radius:8px;border:1px solid #eef2f6}
    .bill{font-size:18px;font-weight:700;color:#0d6b5f}
    .foot{margin-top:40px;padding-top:18px;border-top:1px solid #eef2f6;color:#9aa5b1;font-size:12px;text-align:center}
    @media print{.photos img{height:120px}}
  </style></head><body>
    <div class="head">
      <div><div class="brand">${agency.logo ? `<img src="${agency.logo}" style="height:32px;vertical-align:middle;margin-right:8px;border-radius:6px"/>` : '🏛 '}${escapeHtml(agency.name||'CyprusGuard Agency')}<small>Home Check-up Service</small></div></div>
      <div class="meta"><div class="ttl">Отчёт о визите</div><div>${formatDate(r.date||r.createdAt)}</div></div>
    </div>
    <div class="row">
      <div><div class="block-title">Объект</div><div><b>${escapeHtml(p.address||'—')}</b><br>${TL[visit.type]||''}</div></div>
      <div style="text-align:right"><div class="block-title">Владелец</div><div>${escapeHtml(client.name||'—')}<br>${escapeHtml(client.country||'')}</div></div>
    </div>
    <div class="block-title">Состояние объекта</div>
    <div class="status ${cc.cls}">${cc.icon} ${cc.label}</div>
    <div class="section"><h3>Выполненные работы</h3><ul>${tasksHtml}</ul></div>
    <div class="section"><h3>Комментарий агента</h3><div class="comment">${escapeHtml(r.comment||'Без комментариев')}</div></div>
    ${photosHtml ? `<div class="section"><h3>Фотофиксация</h3>${photosHtml}</div>` : ''}
    ${r.bill ? `<div class="section"><h3>Счёт за коммунальные услуги</h3><div class="bill">€${r.bill}</div></div>` : ''}
    <div class="foot">${escapeHtml(agency.name||'CyprusGuard')} · ${escapeHtml(agency.phone||'')} · ${escapeHtml(agency.city||'Limassol, Cyprus')}<br>Документ сформирован автоматически ${formatDate(Date.now())}</div>
    <script>window.onload=()=>{setTimeout(()=>window.print(),300)}<\/script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { showToast('Разрешите всплывающие окна для PDF'); return; }
  w.document.write(html); w.document.close();
}

function escapeHtml(s) {
  return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── CSV EXPORT ───────────────────────────────────────────────
function downloadCsv(filename, rows) {
  // rows: array of arrays. First row = headers.
  const esc = v => {
    const s = String(v == null ? '' : v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = '\uFEFF' + rows.map(r => r.map(esc).join(';')).join('\r\n'); // BOM + ; for Excel RU
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast('⬇ Файл выгружен');
}

function exportClients() {
  const rows = [['Имя','Страна','Телефон','Telegram','Язык','Подключён к боту','Объектов','Доход/мес €']];
  Object.values(State.clients).forEach(c => {
    const props = Object.values(State.properties).filter(p => p.clientId === c.id);
    rows.push([
      c.name||'', c.country||'', c.phone||'', c.tg||'', c.lang||'ru',
      c.tgChatId ? 'да' : 'нет', props.length, clientMonthly(c.id)
    ]);
  });
  downloadCsv(`clients_${ym()}.csv`, rows);
}

function exportInvoices() {
  const statusRu = { paid:'Оплачен', pending:'Ожидает', overdue:'Просрочен' };
  const rows = [['Счёт','Клиент','Объект','Период','Сумма €','Статус']];
  Object.values(State.invoices).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).forEach(inv => {
    const p = State.properties[inv.propId] || {};
    rows.push([
      (inv.id||'').slice(-6), getClientName(inv.clientId), p.address||'',
      inv.period||'', inv.amount||0, statusRu[inv.status]||inv.status||''
    ]);
  });
  downloadCsv(`invoices_${ym()}.csv`, rows);
}

// ── AI photo description (via bot HTTP proxy) ─────────────────
async function aiDescribePhotos() {
  const btn = document.getElementById('aiDescribeBtn');
  const ta  = document.getElementById('reportComment');
  const photosRaw = (State.uploadedPhotos || [])
    .map(p => (typeof p === 'string' ? p : p && p.dataUrl))
    .filter(d => typeof d === 'string' && d.startsWith('data:image'));
  if (!photosRaw.length) { showToast('Сначала прикрепите хотя бы одно фото'); return; }
  const apiUrl = (State.settings?.agency?.aiApiUrl || '').replace(/\/+$/, '');
  if (!apiUrl) {
    showToast('Укажите URL AI-сервера в Настройках');
    return;
  }
  const visitId = document.getElementById('reportVisit')?.value;
  const visit = visitId ? State.visits[visitId] : null;
  const prop = visit ? State.properties[visit.propId] : null;
  const context = prop ? `${prop.address}, тариф ${prop.tariff}` : '';

  const oldText = btn.textContent;
  btn.disabled = true; btn.textContent = '⏳ Сжимаю фото…';
  try {
    // Compress to keep request small & cheap (~1000px is plenty for description)
    const photos = [];
    for (const p of photosRaw.slice(0, 4)) {
      try { photos.push(await compressImage(p, 1000, 0.7)); }
      catch { photos.push(p); }
    }
    btn.textContent = '⏳ Анализирую…';
    const r = await fetch(`${apiUrl}/api/analyze-photo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ photos, lang: 'ru', context }),
    });
    const data = await r.json();
    if (!r.ok || !data.ok) throw new Error(data.error || 'Ошибка AI');
    // Append (don't overwrite) so the user keeps any text already typed
    ta.value = ta.value ? ta.value.trim() + '\n\n' + data.text : data.text;
    showToast('✨ AI-описание добавлено');
  } catch (e) {
    showToast('⚠️ ' + (e.message || 'Не удалось получить описание'));
  } finally {
    btn.disabled = false; btn.textContent = oldText;
  }
}

async function saveSettings() {
  const color = document.getElementById('setColor')?.value || '#c9a84c';
  const payload = {
    name:  document.getElementById('setName').value.trim(),
    city:  document.getElementById('setCity').value.trim(),
    phone: document.getElementById('setPhone').value.trim(),
    color,
    payLink: document.getElementById('setPayLink')?.value.trim() || '',
    aiApiUrl: document.getElementById('setAiUrl')?.value.trim() || '',
  };
  if (State.pendingLogo) payload.logo = State.pendingLogo;
  await DB.update('settings/agency', payload);
  applyBrandColor(color);
  State.pendingLogo = null;
  showToast('✅ Настройки сохранены!');
}

// Apply a brand accent color to the whole UI (lighten for the secondary accent)
function applyBrandColor(hex) {
  if (!hex) return;
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent2', lightenHex(hex, 0.25));
}

async function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const compressed = await compressImage(ev.target.result, 256, 0.8);
      State.pendingLogo = compressed;
      applyLogo(compressed);
      document.getElementById('removeLogoBtn').style.display = 'inline-block';
      showToast('Логотип загружен — нажмите «Сохранить»');
    } catch(err) { showToast('Не удалось обработать изображение'); }
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function applyLogo(dataUrl) {
  // Settings preview
  const prev = document.getElementById('logoPreview');
  if (prev) prev.innerHTML = dataUrl ? `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover"/>` : '🏛️';
  // Sidebar brand icon
  const brandIcon = document.querySelector('.brand-logo, .sidebar-header .brand-icon');
  document.querySelectorAll('[data-brand-logo]').forEach(el => {
    el.innerHTML = dataUrl ? `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:contain"/>` : '🏛️';
  });
}
function lightenHex(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let n = parseInt(m[1], 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * amt);
  g = Math.round(g + (255 - g) * amt);
  b = Math.round(b + (255 - b) * amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
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
