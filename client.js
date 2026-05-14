/* ================================================================
   client.js  —  CyprusGuard Client Portal
   Access via: client.html?token=CLIENT_ACCESS_TOKEN
   ================================================================ */
'use strict';

const Client = {
  data: null,          // client record from DB
  properties: [],      // client's properties
  visits: [],
  reports: [],
  requests: [],
  reqType: 'maintenance',
  reqPhotos: [],
  deferredInstall: null,
};

// ── BOOT ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // PWA
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    Client.deferredInstall = e;
    const banner = document.getElementById('pwaBanner');
    if (banner) banner.style.display = 'flex';
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Splash
  setTimeout(async () => {
    hideSplash();
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) { showAccessDenied(); return; }

    const client = await Auth.verifyClientToken(token);
    if (!client) { showAccessDenied(); return; }

    Client.data = client;
    await loadClientData();
    showClientApp();
    bindEvents();
  }, 1800);
});

function hideSplash() {
  const s = document.getElementById('splash');
  s.style.transition = 'opacity 0.4s'; s.style.opacity = '0';
  setTimeout(() => s.classList.add('hidden'), 400);
}

function showAccessDenied() {
  document.getElementById('accessDenied').classList.remove('hidden');
}

function showClientApp() {
  document.getElementById('clientApp').classList.remove('hidden');
  document.getElementById('clientAvatar').textContent = initials(Client.data.name);
  document.getElementById('clientNameHeader').textContent = Client.data.name;
}

// ── LOAD DATA ────────────────────────────────────────────────
async function loadClientData() {
  const cid = Client.data.id;

  // Properties
  const allProps = await DB.once('properties') || {};
  Client.properties = Object.values(allProps).filter(p => p.clientId === cid);

  if (!Client.properties.length) return;
  const propIds = Client.properties.map(p => p.id);

  // Visits
  const allVisits = await DB.once('visits') || {};
  Client.visits = Object.values(allVisits).filter(v => propIds.includes(v.propId))
    .sort((a,b) => a.date > b.date ? 1 : -1);

  // Reports
  const allReports = await DB.once('reports') || {};
  Client.reports = Object.values(allReports).filter(r => propIds.includes(r.propId))
    .sort((a,b) => (b.createdAt||0)-(a.createdAt||0));

  // Requests
  const allReqs = await DB.once('requests') || {};
  Client.requests = Object.values(allReqs).filter(r => r.clientId === cid)
    .sort((a,b) => (b.createdAt||0)-(a.createdAt||0));

  renderOverview();
  renderAllReports();
  renderMyRequests();
  renderInfo();
}

// ── RENDER OVERVIEW ──────────────────────────────────────────
function renderOverview() {
  const prop = Client.properties[0];
  if (!prop) { document.getElementById('ctab-overview').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">Нет прикреплённых объектов.<br/>Обратитесь в агентство.</div>'; return; }

  const icons = { villa:'🏖️', apt:'🏢', studio:'🌊', house:'🏠' };
  document.getElementById('clientPropIcon').textContent = icons[prop.type] || '🏠';
  document.getElementById('clientPropAddress').textContent = prop.address;
  document.getElementById('clientPropMeta').textContent = `${TARIFF_LABELS[prop.tariff]||prop.tariff} · €${TARIFF_PRICE[prop.tariff]||0}/мес`;

  // Status
  const statusConf = {
    ok:      { dot: 'ok',      text: '✅ Всё в порядке',       sub: 'Последняя проверка прошла без замечаний' },
    warning: { dot: 'warning', text: '⚠️ Есть замечания',      sub: 'Агент обнаружил незначительные проблемы' },
    issue:   { dot: 'issue',   text: '❌ Требует внимания',    sub: 'Обнаружена проблема — мы уже работаем' },
  };
  const sc = statusConf[prop.status] || statusConf.ok;
  document.getElementById('clientStatusDot').className = `client-status-dot ${sc.dot}`;
  document.getElementById('clientStatusText').textContent = sc.text;
  document.getElementById('clientStatusSub').textContent = sc.sub;

  // KPIs
  const upcoming = Client.visits.filter(v => v.status !== 'done');
  document.getElementById('ckpiVisits').textContent = Client.visits.length;
  document.getElementById('ckpiReports').textContent = Client.reports.length;
  document.getElementById('ckpiNext').textContent = upcoming.length ? formatDateShort(upcoming[0].date) : '—';

  // Recent reports
  const icons2 = ['🛋️','🚿','🌿','🔌','💧'];
  document.getElementById('clientRecentReports').innerHTML = Client.reports.slice(0,3).map((r, i) => reportCardHTML(r, i)).join('')
    || '<div style="color:var(--text3);font-size:13px;padding:12px">Отчётов пока нет</div>';

  // Visit history
  document.getElementById('clientVisitHistory').innerHTML = Client.visits.slice(0,6).map(v => {
    const d = new Date(v.date);
    const SL = { planned:'Запланирован', done:'Выполнен', urgent:'Срочно', issue:'Проблема' };
    const SC = { planned:'status-planned', done:'status-done', urgent:'status-urgent', issue:'status-issue' };
    return `
    <div class="client-visit-row">
      <div class="client-visit-date"><div class="client-visit-day">${d.getDate()}</div><div class="client-visit-mon">${d.toLocaleString('ru-RU',{month:'short'})}</div></div>
      <div style="flex:1"><div style="font-size:13px;font-weight:500">${v.type||'Визит'}</div><div style="font-size:11px;color:var(--text3);margin-top:2px">${(v.tasks||[]).slice(0,2).join(' · ')}</div></div>
      <span class="status-badge ${SC[v.status]||'status-planned'}">${SL[v.status]||'—'}</span>
    </div>`;
  }).join('') || '<div style="color:var(--text3);font-size:13px;padding:12px">Визитов пока нет</div>';
}

function reportCardHTML(r, i) {
  const prop = Client.properties.find(p => p.id === r.propId) || {};
  const condLabel = { ok:'✅ Норма', warning:'⚠️ Замечание', issue:'❌ Проблема' };
  const icons = ['🛋️','🚿','🌿','🔌','💧'];
  return `
  <div class="client-report-card" onclick="openClientReport('${r.id}')">
    <div class="client-report-icon">${icons[i%icons.length]}</div>
    <div style="flex:1">
      <div class="client-report-addr">${prop.address||'—'}</div>
      <div class="client-report-date">${formatDate(r.date||r.createdAt)}</div>
      <div class="client-report-tags">
        <span class="client-report-tag ${r.condition||'ok'}">${condLabel[r.condition]||'—'}</span>
        ${r.photoUrls?.length ? `<span class="client-report-tag">📷 ${r.photoUrls.length} фото</span>` : ''}
        ${r.videoUrl ? '<span class="client-report-tag">🎥 видео</span>' : ''}
      </div>
    </div>
  </div>`;
}

function renderAllReports() {
  document.getElementById('clientAllReports').innerHTML = Client.reports.map((r, i) => reportCardHTML(r, i)).join('')
    || '<div style="color:var(--text3);font-size:13px;padding:16px;text-align:center">Отчётов пока нет</div>';
}

function openClientReport(id) {
  const r = Client.reports.find(rep => rep.id === id);
  if (!r) return;
  const prop = Client.properties.find(p => p.id === r.propId) || {};
  document.getElementById('clientReportTitle').textContent = `Отчёт · ${formatDateShort(r.date||r.createdAt)}`;
  const condLabels = { ok:'✅ Всё в порядке', warning:'⚠️ Есть замечания', issue:'❌ Обнаружена проблема' };
  const photoHtml = (r.photoUrls||[]).length ? `
    <div style="margin-bottom:14px">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Фото (${r.photoUrls.length})</div>
      <div class="report-photo-grid">${r.photoUrls.map(url =>
        `<div class="report-photo-item"><img src="${url}" loading="lazy" onclick="window.open('${url}','_blank')"/></div>`
      ).join('')}</div>
    </div>` : '';
  const videoHtml = r.videoUrl ? `<div style="margin-bottom:14px"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Видео</div><video controls style="width:100%;border-radius:8px" src="${r.videoUrl}"></video></div>` : '';
  document.getElementById('clientReportBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Объект</div><div>${prop.address||'—'}</div></div>
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Дата</div><div>${formatDate(r.date||r.createdAt)}</div></div>
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Состояние</div><div style="font-size:15px">${condLabels[r.condition]||'—'}</div></div>
      ${(r.tasks||[]).length ? `<div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px">Выполнено</div><div style="display:flex;flex-direction:column;gap:4px">${r.tasks.map(t=>`<div style="font-size:13px;color:var(--teal)">✅ ${t}</div>`).join('')}</div></div>` : ''}
      ${photoHtml}${videoHtml}
      <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Комментарий агента</div><div style="font-size:13px;color:var(--text2);line-height:1.6">${r.comment||'Без комментариев'}</div></div>
      ${r.bill ? `<div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Счёт ЖКХ</div><div style="font-family:'DM Mono',monospace;font-size:18px;color:var(--accent2)">€${r.bill}</div></div>` : ''}
    </div>`;
  openModal('clientReportModal');
}

// ── REQUESTS ─────────────────────────────────────────────────
function renderMyRequests() {
  const statusLabel = { new:'Новая', inprogress:'В работе', done:'Выполнена' };
  const statusClass = { new:'status-planned', inprogress:'status-urgent', done:'status-done' };
  document.getElementById('clientMyRequests').innerHTML = Client.requests.map(r => `
    <div class="request-card req-${r.status||'new'}">
      <div class="req-icon">${{maintenance:'🔧',visit:'📅',urgent:'🚨',other:'📝'}[r.type]||'📝'}</div>
      <div class="req-info">
        <div class="req-title">${r.title||'Заявка'}</div>
        <div class="req-desc">${r.description||''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
        <span class="status-badge ${statusClass[r.status]||'status-planned'}">${statusLabel[r.status]||'Новая'}</span>
        <div class="req-time">${timeAgo(r.createdAt)}</div>
      </div>
    </div>`).join('') || '<div style="color:var(--text3);font-size:13px;padding:12px">Заявок нет</div>';
}

async function sendRequest() {
  const title = document.getElementById('reqTitle').value.trim();
  const desc  = document.getElementById('reqDesc').value.trim();
  if (!title) { showClientToast('Введите заголовок заявки'); return; }

  const btn = document.getElementById('sendReqBtn');
  btn.textContent = '⏳ Отправка…'; btn.disabled = true;

  const prop = Client.properties[0];
  const id = 'req' + Date.now();

  // Upload photos
  const photoUrls = [];
  for (const ph of Client.reqPhotos) {
    try {
      const url = await Storage.uploadBase64(`requests/${id}/photo_${Date.now()}`, ph.dataUrl);
      photoUrls.push(url);
    } catch(e) {}
  }

  const data = {
    id, clientId: Client.data.id, propId: prop?.id || '',
    type:     Client.reqType,
    title,
    description: desc,
    priority: document.getElementById('reqPriority').value,
    photoUrls, status: 'new',
  };

  await DB.set(`requests/${id}`, data);

  // Notify admin via notification
  await DB.push('notifications', {
    message: `📬 Новая заявка от ${Client.data.name}: «${title}»`,
    type: 'warning',
  });

  // Notify admin via Telegram if bot active
  const settings = await DB.once('settings/telegram');
  if (settings?.token && settings?.notifyNewRequest) {
    const adminChatId = settings?.adminChatId;
    if (adminChatId) {
      const msg = `📬 *Новая заявка*\n\nОт: ${Client.data.name}\nОбъект: ${prop?.address||'—'}\nТип: ${title}\n\n${desc}`;
      await fetch(`https://api.telegram.org/bot${settings.token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: adminChatId, text: msg, parse_mode: 'Markdown' })
      });
    }
  }

  // Reset
  Client.reqPhotos = [];
  document.getElementById('reqPhotoPreview').innerHTML = '';
  document.getElementById('reqTitle').value = '';
  document.getElementById('reqDesc').value = '';
  btn.textContent = '✅ Отправлено!';
  setTimeout(() => { btn.textContent = '📤 Отправить заявку'; btn.disabled = false; }, 2000);

  Client.requests.unshift(data);
  renderMyRequests();
  showClientToast('✅ Заявка отправлена! Ответим в течение 24 часов.');
}

// ── REQUEST PHOTOS ───────────────────────────────────────────
function handleReqPhotos(input) {
  const files = [...input.files];
  const preview = document.getElementById('reqPhotoPreview');
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      Client.reqPhotos.push({ file, dataUrl: ev.target.result });
      const div = document.createElement('div');
      div.className = 'photo-preview-item';
      div.innerHTML = `<img src="${ev.target.result}"/>`;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

// ── INFO ─────────────────────────────────────────────────────
function renderInfo() {
  const prop = Client.properties[0];
  if (!prop) return;
  const TARIFF_FEATURES = {
    basic:    ['2 визита в месяц','Фото-отчёт','Проветривание','Telegram уведомления'],
    standard: ['4 визита в месяц','Фото + видео','Полив растений','Проверка счетов','Telegram уведомления'],
    premium:  ['Еженедельные визиты','Видео-тур','Срочный выезд','Мелкий ремонт','Полный пакет'],
  };
  const feats = TARIFF_FEATURES[prop.tariff] || TARIFF_FEATURES.basic;
  document.getElementById('clientTariffInfo').innerHTML = `
    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">Ваш тариф</div>
    <div class="tariff-badge-big">
      <div class="tariff-badge-big-name">${TARIFF_LABELS[prop.tariff]||prop.tariff}</div>
      <div class="tariff-badge-big-price">€${TARIFF_PRICE[prop.tariff]||0}<span style="font-size:14px;color:var(--text3)">/мес</span></div>
      <div class="tariff-badge-big-feats">${feats.map(f=>`✓ ${f}`).join('<br/>')}</div>
    </div>`;
}

// ── EVENTS ───────────────────────────────────────────────────
function bindEvents() {
  // Tabs
  document.querySelectorAll('.client-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.client-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.client-page').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`ctab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });

  // Send request
  document.getElementById('sendReqBtn').addEventListener('click', sendRequest);

  // Request type
  document.querySelectorAll('.req-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.req-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Client.reqType = btn.dataset.type;
    });
  });

  // Modal closes
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });
  document.querySelectorAll('.modal-backdrop').forEach(bd => {
    bd.addEventListener('click', e => { if (e.target === bd) closeModal(bd.id); });
  });

  // PWA install
  const installBtn = document.getElementById('clientInstallBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (Client.deferredInstall) {
        Client.deferredInstall.prompt();
        await Client.deferredInstall.userChoice;
        Client.deferredInstall = null;
        document.getElementById('pwaBanner').style.display = 'none';
      }
    });
  }
}

// ── HELPERS ──────────────────────────────────────────────────
const TARIFF_LABELS = { basic:'Basic', standard:'Standard', premium:'Premium' };
const TARIFF_PRICE  = { basic:50, standard:75, premium:100 };

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function initials(name) {
  return (name||'?').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
}

function formatDate(val) {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  return d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });
}

function formatDateShort(val) {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  return d.toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'только что';
  if (diff < 3600000) return Math.floor(diff/60000) + ' мин';
  if (diff < 86400000) return Math.floor(diff/3600000) + ' ч назад';
  return Math.floor(diff/86400000) + ' д назад';
}

let _toastTimer;
function showClientToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}
