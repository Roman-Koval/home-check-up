/* ================================================================
   client.js  —  CyprusGuard Client Portal
   Access via: client.html?token=CLIENT_ACCESS_TOKEN
   ================================================================ */
'use strict';

// ── I18N ─────────────────────────────────────────────────────
const I18N = {
  ru: {
    splashSub:'Ваш личный кабинет', brandSub:'Личный кабинет',
    accessTitle:'Доступ закрыт', accessDesc:'Ссылка недействительна или истекла. Обратитесь в агентство CyprusGuard.', call:'📞 Позвонить',
    tabOverview:'🏠 Обзор', tabReports:'📋 Отчёты', tabRequest:'📬 Заявка', tabInfo:'ℹ️ Контакты',
    kpiVisits:'Визитов всего', kpiReports:'Отчётов', kpiNext:'Следующий визит',
    recentReports:'Последние отчёты', visitHistory:'История визитов',
    sendRequest:'Отправить заявку', requestDesc:'Опишите проблему или пожелание — мы ответим в течение 24 часов',
    reqType:'Тип заявки', typeMaintenance:'🔧 Ремонт', typeVisit:'📅 Доп. визит', typeUrgent:'🚨 Срочно', typeOther:'📝 Другое',
    title:'Заголовок', titlePh:'Кратко опишите проблему…', descLabel:'Подробное описание', descPh:'Что случилось? Где именно? Как давно?…',
    priority:'Приоритет', prNormal:'Обычный — в плановом порядке', prHigh:'Высокий — в течение недели', prUrgent:'Срочный — как можно скорее',
    photoOpt:'Фото (необязательно)', attachPhoto:'Прикрепить фото', sendBtn:'📤 Отправить заявку', myRequests:'Мои заявки',
    agencyDesc:'Профессиональный уход за вашей недвижимостью на Кипре',
    installTitle:'Установить приложение', installDesc:'Быстрый доступ с экрана телефона', install:'Установить',
    close:'Закрыть', report:'Отчёт', yourTariff:'Ваш тариф', noReports:'Отчётов пока нет', noVisits:'Визитов пока нет', noProps:'Нет прикреплённых объектов.<br/>Обратитесь в агентство.',
    object:'Объект', date:'Дата', condition:'Состояние', photos:'Фото', video:'Видео', comment:'Комментарий', tasks:'Задачи', utility:'Счёт ЖКХ',
    statusOk:'✅ Всё в порядке', statusWarn:'⚠️ Есть замечания', statusIssue:'❌ Требует внимания',
    statusOkSub:'Последняя проверка прошла без замечаний', statusWarnSub:'Агент обнаружил незначительные проблемы', statusIssueSub:'Обнаружена проблема — мы уже работаем',
    condOk:'✅ Норма', condWarn:'⚠️ Замечание', condIssue:'❌ Проблема',
    condOkFull:'✅ Всё в порядке', condWarnFull:'⚠️ Есть замечания', condIssueFull:'❌ Обнаружена проблема',
    vPlanned:'Запланирован', vDone:'Выполнен', vUrgent:'Срочно', vIssue:'Проблема', visit:'Визит',
    rNew:'Новая', rProgress:'В работе', rDone:'Выполнена',
    enterTitle:'Введите заголовок заявки', sending:'⏳ Отправка…', sent:'✅ Отправлено!', sentToast:'✅ Заявка отправлена! Ответим в течение 24 часов.', errPrefix:'❌ Ошибка: ',
    monthsFull:['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
  },
  en: {
    splashSub:'Your personal portal', brandSub:'Client Portal',
    accessTitle:'Access denied', accessDesc:'This link is invalid or expired. Please contact CyprusGuard agency.', call:'📞 Call us',
    tabOverview:'🏠 Overview', tabReports:'📋 Reports', tabRequest:'📬 Request', tabInfo:'ℹ️ Contact',
    kpiVisits:'Total visits', kpiReports:'Reports', kpiNext:'Next visit',
    recentReports:'Recent reports', visitHistory:'Visit history',
    sendRequest:'Send a request', requestDesc:'Describe the issue or request — we reply within 24 hours',
    reqType:'Request type', typeMaintenance:'🔧 Repair', typeVisit:'📅 Extra visit', typeUrgent:'🚨 Urgent', typeOther:'📝 Other',
    title:'Title', titlePh:'Briefly describe the issue…', descLabel:'Detailed description', descPh:'What happened? Where exactly? How long ago?…',
    priority:'Priority', prNormal:'Normal — scheduled', prHigh:'High — within a week', prUrgent:'Urgent — as soon as possible',
    photoOpt:'Photos (optional)', attachPhoto:'Attach photo', sendBtn:'📤 Send request', myRequests:'My requests',
    agencyDesc:'Professional care for your property in Cyprus',
    installTitle:'Install the app', installDesc:'Quick access from your home screen', install:'Install',
    close:'Close', report:'Report', yourTariff:'Your plan', noReports:'No reports yet', noVisits:'No visits yet', noProps:'No linked properties.<br/>Please contact the agency.',
    object:'Property', date:'Date', condition:'Condition', photos:'Photos', video:'Video', comment:'Comment', tasks:'Tasks', utility:'Utility bill',
    statusOk:'✅ All good', statusWarn:'⚠️ Minor notes', statusIssue:'❌ Needs attention',
    statusOkSub:'Last check passed with no issues', statusWarnSub:'The agent found minor issues', statusIssueSub:'An issue was found — we are on it',
    condOk:'✅ OK', condWarn:'⚠️ Note', condIssue:'❌ Issue',
    condOkFull:'✅ All good', condWarnFull:'⚠️ Minor notes', condIssueFull:'❌ Issue found',
    vPlanned:'Planned', vDone:'Done', vUrgent:'Urgent', vIssue:'Issue', visit:'Visit',
    rNew:'New', rProgress:'In progress', rDone:'Done',
    enterTitle:'Please enter a request title', sending:'⏳ Sending…', sent:'✅ Sent!', sentToast:'✅ Request sent! We will reply within 24 hours.', errPrefix:'❌ Error: ',
    monthsFull:['January','February','March','April','May','June','July','August','September','October','November','December'],
  },
  de: {
    splashSub:'Ihr persönliches Portal', brandSub:'Kundenportal',
    accessTitle:'Zugriff verweigert', accessDesc:'Dieser Link ist ungültig oder abgelaufen. Bitte kontaktieren Sie die Agentur CyprusGuard.', call:'📞 Anrufen',
    tabOverview:'🏠 Übersicht', tabReports:'📋 Berichte', tabRequest:'📬 Anfrage', tabInfo:'ℹ️ Kontakt',
    kpiVisits:'Besuche gesamt', kpiReports:'Berichte', kpiNext:'Nächster Besuch',
    recentReports:'Letzte Berichte', visitHistory:'Besuchsverlauf',
    sendRequest:'Anfrage senden', requestDesc:'Beschreiben Sie das Problem — wir antworten innerhalb von 24 Stunden',
    reqType:'Art der Anfrage', typeMaintenance:'🔧 Reparatur', typeVisit:'📅 Extra-Besuch', typeUrgent:'🚨 Dringend', typeOther:'📝 Sonstiges',
    title:'Titel', titlePh:'Beschreiben Sie das Problem kurz…', descLabel:'Detaillierte Beschreibung', descPh:'Was ist passiert? Wo genau? Wie lange her?…',
    priority:'Priorität', prNormal:'Normal — planmäßig', prHigh:'Hoch — innerhalb einer Woche', prUrgent:'Dringend — so schnell wie möglich',
    photoOpt:'Fotos (optional)', attachPhoto:'Foto anhängen', sendBtn:'📤 Anfrage senden', myRequests:'Meine Anfragen',
    agencyDesc:'Professionelle Pflege Ihrer Immobilie auf Zypern',
    installTitle:'App installieren', installDesc:'Schneller Zugriff vom Startbildschirm', install:'Installieren',
    close:'Schließen', report:'Bericht', yourTariff:'Ihr Tarif', noReports:'Noch keine Berichte', noVisits:'Noch keine Besuche', noProps:'Keine verknüpften Objekte.<br/>Bitte kontaktieren Sie die Agentur.',
    object:'Objekt', date:'Datum', condition:'Zustand', photos:'Fotos', video:'Video', comment:'Kommentar', tasks:'Aufgaben', utility:'Nebenkosten',
    statusOk:'✅ Alles in Ordnung', statusWarn:'⚠️ Kleine Anmerkungen', statusIssue:'❌ Aufmerksamkeit nötig',
    statusOkSub:'Letzte Prüfung ohne Beanstandungen', statusWarnSub:'Der Agent fand kleine Probleme', statusIssueSub:'Ein Problem wurde gefunden — wir kümmern uns',
    condOk:'✅ OK', condWarn:'⚠️ Hinweis', condIssue:'❌ Problem',
    condOkFull:'✅ Alles in Ordnung', condWarnFull:'⚠️ Kleine Anmerkungen', condIssueFull:'❌ Problem gefunden',
    vPlanned:'Geplant', vDone:'Erledigt', vUrgent:'Dringend', vIssue:'Problem', visit:'Besuch',
    rNew:'Neu', rProgress:'In Bearbeitung', rDone:'Erledigt',
    enterTitle:'Bitte Titel eingeben', sending:'⏳ Senden…', sent:'✅ Gesendet!', sentToast:'✅ Anfrage gesendet! Wir antworten innerhalb von 24 Stunden.', errPrefix:'❌ Fehler: ',
    monthsFull:['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
  },
  fr: {
    splashSub:'Votre espace personnel', brandSub:'Espace client',
    accessTitle:'Accès refusé', accessDesc:'Ce lien est invalide ou expiré. Veuillez contacter l\'agence CyprusGuard.', call:'📞 Appeler',
    tabOverview:'🏠 Aperçu', tabReports:'📋 Rapports', tabRequest:'📬 Demande', tabInfo:'ℹ️ Contact',
    kpiVisits:'Visites au total', kpiReports:'Rapports', kpiNext:'Prochaine visite',
    recentReports:'Rapports récents', visitHistory:'Historique des visites',
    sendRequest:'Envoyer une demande', requestDesc:'Décrivez le problème — nous répondons sous 24 heures',
    reqType:'Type de demande', typeMaintenance:'🔧 Réparation', typeVisit:'📅 Visite suppl.', typeUrgent:'🚨 Urgent', typeOther:'📝 Autre',
    title:'Titre', titlePh:'Décrivez brièvement le problème…', descLabel:'Description détaillée', descPh:'Que s\'est-il passé ? Où exactement ? Depuis quand ?…',
    priority:'Priorité', prNormal:'Normale — planifiée', prHigh:'Élevée — sous une semaine', prUrgent:'Urgente — dès que possible',
    photoOpt:'Photos (facultatif)', attachPhoto:'Joindre une photo', sendBtn:'📤 Envoyer la demande', myRequests:'Mes demandes',
    agencyDesc:'Entretien professionnel de votre bien à Chypre',
    installTitle:'Installer l\'application', installDesc:'Accès rapide depuis l\'écran d\'accueil', install:'Installer',
    close:'Fermer', report:'Rapport', yourTariff:'Votre forfait', noReports:'Pas encore de rapports', noVisits:'Pas encore de visites', noProps:'Aucun bien associé.<br/>Veuillez contacter l\'agence.',
    object:'Bien', date:'Date', condition:'État', photos:'Photos', video:'Vidéo', comment:'Commentaire', tasks:'Tâches', utility:'Charges',
    statusOk:'✅ Tout va bien', statusWarn:'⚠️ Remarques mineures', statusIssue:'❌ Attention requise',
    statusOkSub:'Dernier contrôle sans remarques', statusWarnSub:'L\'agent a trouvé des problèmes mineurs', statusIssueSub:'Un problème a été détecté — nous intervenons',
    condOk:'✅ OK', condWarn:'⚠️ Remarque', condIssue:'❌ Problème',
    condOkFull:'✅ Tout va bien', condWarnFull:'⚠️ Remarques mineures', condIssueFull:'❌ Problème détecté',
    vPlanned:'Planifiée', vDone:'Terminée', vUrgent:'Urgent', vIssue:'Problème', visit:'Visite',
    rNew:'Nouvelle', rProgress:'En cours', rDone:'Terminée',
    enterTitle:'Veuillez saisir un titre', sending:'⏳ Envoi…', sent:'✅ Envoyé !', sentToast:'✅ Demande envoyée ! Nous répondons sous 24 heures.', errPrefix:'❌ Erreur : ',
    monthsFull:['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'],
  },
  tr: {
    splashSub:'Kişisel paneliniz', brandSub:'Müşteri Paneli',
    accessTitle:'Erişim reddedildi', accessDesc:'Bu bağlantı geçersiz veya süresi dolmuş. Lütfen CyprusGuard ajansıyla iletişime geçin.', call:'📞 Ara',
    tabOverview:'🏠 Genel', tabReports:'📋 Raporlar', tabRequest:'📬 Talep', tabInfo:'ℹ️ İletişim',
    kpiVisits:'Toplam ziyaret', kpiReports:'Raporlar', kpiNext:'Sonraki ziyaret',
    recentReports:'Son raporlar', visitHistory:'Ziyaret geçmişi',
    sendRequest:'Talep gönder', requestDesc:'Sorunu veya isteği yazın — 24 saat içinde yanıtlıyoruz',
    reqType:'Talep türü', typeMaintenance:'🔧 Tamir', typeVisit:'📅 Ek ziyaret', typeUrgent:'🚨 Acil', typeOther:'📝 Diğer',
    title:'Başlık', titlePh:'Sorunu kısaca açıklayın…', descLabel:'Ayrıntılı açıklama', descPh:'Ne oldu? Tam olarak nerede? Ne zamandır?…',
    priority:'Öncelik', prNormal:'Normal — planlı', prHigh:'Yüksek — bir hafta içinde', prUrgent:'Acil — mümkün olan en kısa sürede',
    photoOpt:'Fotoğraf (isteğe bağlı)', attachPhoto:'Fotoğraf ekle', sendBtn:'📤 Talebi gönder', myRequests:'Taleplerim',
    agencyDesc:'Kıbrıs\'taki mülkünüz için profesyonel bakım',
    installTitle:'Uygulamayı yükle', installDesc:'Ana ekrandan hızlı erişim', install:'Yükle',
    close:'Kapat', report:'Rapor', yourTariff:'Tarifeniz', noReports:'Henüz rapor yok', noVisits:'Henüz ziyaret yok', noProps:'Bağlı mülk yok.<br/>Lütfen ajansla iletişime geçin.',
    object:'Mülk', date:'Tarih', condition:'Durum', photos:'Fotoğraflar', video:'Video', comment:'Yorum', tasks:'Görevler', utility:'Fatura',
    statusOk:'✅ Her şey yolunda', statusWarn:'⚠️ Küçük notlar', statusIssue:'❌ Dikkat gerekiyor',
    statusOkSub:'Son kontrol sorunsuz geçti', statusWarnSub:'Görevli küçük sorunlar buldu', statusIssueSub:'Bir sorun tespit edildi — ilgileniyoruz',
    condOk:'✅ İyi', condWarn:'⚠️ Not', condIssue:'❌ Sorun',
    condOkFull:'✅ Her şey yolunda', condWarnFull:'⚠️ Küçük notlar', condIssueFull:'❌ Sorun bulundu',
    vPlanned:'Planlandı', vDone:'Tamamlandı', vUrgent:'Acil', vIssue:'Sorun', visit:'Ziyaret',
    rNew:'Yeni', rProgress:'İşlemde', rDone:'Tamamlandı',
    enterTitle:'Lütfen bir başlık girin', sending:'⏳ Gönderiliyor…', sent:'✅ Gönderildi!', sentToast:'✅ Talep gönderildi! 24 saat içinde yanıtlayacağız.', errPrefix:'❌ Hata: ',
    monthsFull:['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
  },
};

const LOCALE_MAP = { ru:'ru-RU', en:'en-GB', de:'de-DE', fr:'fr-FR', tr:'tr-TR' };
let LANG = 'ru';
function t(key) { return (I18N[LANG] && I18N[LANG][key]) || I18N.ru[key] || key; }

function setLang(lang) {
  LANG = I18N[lang] ? lang : 'ru';
  document.documentElement.lang = LANG;
  applyStaticI18n();
}

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  // Select option texts
  const pr = document.getElementById('reqPriority');
  if (pr) { pr.options[0].text = t('prNormal'); pr.options[1].text = t('prHigh'); pr.options[2].text = t('prUrgent'); }
}

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

    // Authenticate (anonymously) so locked-down DB rules allow reads
    await Auth.ensureAnonAuth();

    const client = await Auth.verifyClientToken(token);
    if (!client) { showAccessDenied(); return; }

    Client.data = client;
    setLang(client.lang || 'ru');
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
  const sw = document.getElementById('langSwitcher');
  if (sw) sw.value = LANG;
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

  // Agency settings (payment link, contacts)
  try {
    const settings = await DB.once('settings/agency');
    Client.agency = settings || {};
  } catch (e) { Client.agency = {}; }

  renderOverview();
  renderAllReports();
  renderMyRequests();
  renderInfo();
}

// ── RENDER OVERVIEW ──────────────────────────────────────────
function renderOverview() {
  const prop = Client.properties[0];
  if (!prop) { document.getElementById('ctab-overview').innerHTML = `<div style="text-align:center;padding:40px;color:var(--text3)">${t('noProps')}</div>`; return; }

  const icons = { villa:'🏖️', apt:'🏢', studio:'🌊', house:'🏠' };
  document.getElementById('clientPropIcon').textContent = icons[prop.type] || '🏠';
  document.getElementById('clientPropAddress').textContent = prop.address;
  document.getElementById('clientPropMeta').textContent = `${TARIFF_LABELS[prop.tariff]||prop.tariff} · €${TARIFF_PRICE[prop.tariff]||0}/${LANG==='ru'?'мес':'mo'}`;

  // Status
  const statusConf = {
    ok:      { dot: 'ok',      text: t('statusOk'),    sub: t('statusOkSub') },
    warning: { dot: 'warning', text: t('statusWarn'),  sub: t('statusWarnSub') },
    issue:   { dot: 'issue',   text: t('statusIssue'), sub: t('statusIssueSub') },
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

  // Payment button (if agency configured a payment link)
  const payBlock = document.getElementById('clientPayBlock');
  if (payBlock) {
    const link = Client.agency && Client.agency.payLink;
    if (link) {
      const payLabels = { ru:'💳 Оплатить обслуживание', en:'💳 Pay for service', de:'💳 Service bezahlen', fr:'💳 Payer le service', tr:'💳 Hizmeti öde' };
      payBlock.style.display = 'block';
      payBlock.innerHTML = `<a href="${link}" target="_blank" rel="noopener" style="display:block;text-align:center;padding:14px;border-radius:12px;background:linear-gradient(135deg,var(--accent),#8a6020);color:#000;font-weight:600;text-decoration:none">${payLabels[LANG]||payLabels.ru}</a>`;
    } else {
      payBlock.style.display = 'none';
    }
  }

  // Recent reports
  document.getElementById('clientRecentReports').innerHTML = Client.reports.slice(0,3).map((r, i) => reportCardHTML(r, i)).join('')
    || `<div style="color:var(--text3);font-size:13px;padding:12px">${t('noReports')}</div>`;

  // Visit history
  document.getElementById('clientVisitHistory').innerHTML = Client.visits.slice(0,6).map(v => {
    const d = new Date(v.date);
    const SL = { planned:t('vPlanned'), done:t('vDone'), urgent:t('vUrgent'), issue:t('vIssue') };
    const SC = { planned:'status-planned', done:'status-done', urgent:'status-urgent', issue:'status-issue' };
    return `
    <div class="client-visit-row">
      <div class="client-visit-date"><div class="client-visit-day">${d.getDate()}</div><div class="client-visit-mon">${d.toLocaleString(LOCALE_MAP[LANG]||'ru-RU',{month:'short'})}</div></div>
      <div style="flex:1"><div style="font-size:13px;font-weight:500">${v.type||t('visit')}</div><div style="font-size:11px;color:var(--text3);margin-top:2px">${(v.tasks||[]).slice(0,2).join(' · ')}</div></div>
      <span class="status-badge ${SC[v.status]||'status-planned'}">${SL[v.status]||'—'}</span>
    </div>`;
  }).join('') || `<div style="color:var(--text3);font-size:13px;padding:12px">${t('noVisits')}</div>`;
}

function reportCardHTML(r, i) {
  const prop = Client.properties.find(p => p.id === r.propId) || {};
  const condLabel = { ok:t('condOk'), warning:t('condWarn'), issue:t('condIssue') };
  const icons = ['🛋️','🚿','🌿','🔌','💧'];
  return `
  <div class="client-report-card" onclick="openClientReport('${r.id}')">
    <div class="client-report-icon">${icons[i%icons.length]}</div>
    <div style="flex:1">
      <div class="client-report-addr">${prop.address||'—'}</div>
      <div class="client-report-date">${formatDate(r.date||r.createdAt)}</div>
      <div class="client-report-tags">
        <span class="client-report-tag ${r.condition||'ok'}">${condLabel[r.condition]||'—'}</span>
        ${r.photoUrls?.length ? `<span class="client-report-tag">📷 ${r.photoUrls.length}</span>` : ''}
        ${r.videoUrl ? `<span class="client-report-tag">🎥 ${t('video')}</span>` : ''}
      </div>
    </div>
  </div>`;
}

function renderAllReports() {
  document.getElementById('clientAllReports').innerHTML = Client.reports.map((r, i) => reportCardHTML(r, i)).join('')
    || `<div style="color:var(--text3);font-size:13px;padding:16px;text-align:center">${t('noReports')}</div>`;
}

function openClientReport(id) {
  const r = Client.reports.find(rep => rep.id === id);
  if (!r) return;
  const prop = Client.properties.find(p => p.id === r.propId) || {};
  document.getElementById('clientReportTitle').textContent = `${t('report')} · ${formatDateShort(r.date||r.createdAt)}`;
  const condLabels = { ok:t('condOkFull'), warning:t('condWarnFull'), issue:t('condIssueFull') };
  const lbl = 'font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px';
  const photoHtml = (r.photoUrls||[]).length ? `
    <div style="margin-bottom:14px">
      <div style="${lbl};margin-bottom:8px">${t('photos')} (${r.photoUrls.length})</div>
      <div class="report-photo-grid">${r.photoUrls.map(url =>
        `<div class="report-photo-item"><img src="${url}" loading="lazy" onclick="window.open('${url}','_blank')"/></div>`
      ).join('')}</div>
    </div>` : '';
  const videoHtml = r.videoUrl ? `<div style="margin-bottom:14px"><div style="${lbl};margin-bottom:8px">${t('video')}</div><video controls style="width:100%;border-radius:8px" src="${r.videoUrl}"></video></div>` : '';
  document.getElementById('clientReportBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div><div style="${lbl}">${t('object')}</div><div>${prop.address||'—'}</div></div>
      <div><div style="${lbl}">${t('date')}</div><div>${formatDate(r.date||r.createdAt)}</div></div>
      <div><div style="${lbl}">${t('condition')}</div><div style="font-size:15px">${condLabels[r.condition]||'—'}</div></div>
      ${(r.tasks||[]).length ? `<div><div style="${lbl};margin-bottom:6px">${t('tasks')}</div><div style="display:flex;flex-direction:column;gap:4px">${r.tasks.map(tk=>`<div style="font-size:13px;color:var(--teal)">✅ ${tk}</div>`).join('')}</div></div>` : ''}
      ${photoHtml}${videoHtml}
      <div><div style="${lbl}">${t('comment')}</div><div style="font-size:13px;color:var(--text2);line-height:1.6">${r.comment||'—'}</div></div>
      ${r.bill ? `<div><div style="${lbl}">${t('utility')}</div><div style="font-family:'DM Mono',monospace;font-size:18px;color:var(--accent2)">€${r.bill}</div></div>` : ''}
    </div>`;
  openModal('clientReportModal');
}

// ── REQUESTS ─────────────────────────────────────────────────
function renderMyRequests() {
  const statusLabel = { new:t('rNew'), inprogress:t('rProgress'), done:t('rDone') };
  const statusClass = { new:'status-planned', inprogress:'status-urgent', done:'status-done' };
  document.getElementById('clientMyRequests').innerHTML = Client.requests.map(r => `
    <div class="request-card req-${r.status||'new'}">
      <div class="req-icon">${{maintenance:'🔧',visit:'📅',urgent:'🚨',other:'📝'}[r.type]||'📝'}</div>
      <div class="req-info">
        <div class="req-title">${r.title||'—'}</div>
        <div class="req-desc">${r.description||''}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
        <span class="status-badge ${statusClass[r.status]||'status-planned'}">${statusLabel[r.status]||t('rNew')}</span>
        <div class="req-time">${timeAgo(r.createdAt)}</div>
      </div>
    </div>`).join('') || `<div style="color:var(--text3);font-size:13px;padding:12px">${t('myRequests')}: —</div>`;
}

async function sendRequest() {
  const title = document.getElementById('reqTitle').value.trim();
  const desc  = document.getElementById('reqDesc').value.trim();
  if (!title) { showClientToast(t('enterTitle')); return; }

  const btn = document.getElementById('sendReqBtn');
  btn.textContent = t('sending'); btn.disabled = true;

  try {
    const prop = Client.properties[0];
    const id = 'req' + Date.now();

    // Compress photos as base64 (no Firebase Storage needed on Spark plan)
    const photoUrls = [];
    for (const ph of Client.reqPhotos) {
      try {
        const compressed = await compressImage(ph.dataUrl, 500, 0.6);
        photoUrls.push(compressed);
      } catch(e) { console.warn('Photo compress failed:', e); }
    }

    const data = {
      id, clientId: Client.data.id, propId: prop?.id || '',
      type:     Client.reqType,
      title,
      description: desc,
      priority: document.getElementById('reqPriority').value,
      photoUrls, status: 'new',
      createdAt: Date.now()
    };

    console.log('Saving request to DB:', id);
    await DB.set(`requests/${id}`, data);
    console.log('Request saved ✓');

    // Notify admin via notification (optional, don't block on this)
    DB.push('notifications', {
      message: `📬 Новая заявка от ${Client.data.name}: «${title}»`,
      type: 'warning',
    }).catch(e => console.warn('Notification push failed:', e));

    // Reset
    Client.reqPhotos = [];
    document.getElementById('reqPhotoPreview').innerHTML = '';
    document.getElementById('reqTitle').value = '';
    document.getElementById('reqDesc').value = '';
    btn.textContent = t('sent');
    setTimeout(() => { btn.textContent = t('sendBtn'); btn.disabled = false; }, 2000);

    Client.requests.unshift(data);
    renderMyRequests();
    showClientToast(t('sentToast'));
  } catch(err) {
    console.error('sendRequest error:', err);
    showClientToast(t('errPrefix') + (err.message || ''));
    btn.textContent = t('sendBtn');
    btn.disabled = false;
  }
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
const TARIFF_FEATURES_I18N = {
  ru: { basic:['2 визита в месяц','Фото-отчёт','Проветривание','Telegram уведомления'], standard:['4 визита в месяц','Фото + видео','Полив растений','Проверка счетов','Telegram уведомления'], premium:['Еженедельные визиты','Видео-тур','Срочный выезд','Мелкий ремонт','Полный пакет'] },
  en: { basic:['2 visits per month','Photo report','Airing','Telegram alerts'], standard:['4 visits per month','Photo + video','Plant watering','Bill checking','Telegram alerts'], premium:['Weekly visits','Video tour','Emergency call-out','Minor repairs','Full package'] },
  de: { basic:['2 Besuche pro Monat','Fotobericht','Lüften','Telegram-Benachrichtigungen'], standard:['4 Besuche pro Monat','Foto + Video','Pflanzenbewässerung','Rechnungsprüfung','Telegram-Benachrichtigungen'], premium:['Wöchentliche Besuche','Video-Tour','Noteinsatz','Kleine Reparaturen','Komplettpaket'] },
  fr: { basic:['2 visites par mois','Rapport photo','Aération','Alertes Telegram'], standard:['4 visites par mois','Photo + vidéo','Arrosage des plantes','Vérification des factures','Alertes Telegram'], premium:['Visites hebdomadaires','Visite vidéo','Intervention urgente','Petites réparations','Forfait complet'] },
  tr: { basic:['Ayda 2 ziyaret','Fotoğraf raporu','Havalandırma','Telegram bildirimleri'], standard:['Ayda 4 ziyaret','Fotoğraf + video','Bitki sulama','Fatura kontrolü','Telegram bildirimleri'], premium:['Haftalık ziyaretler','Video tur','Acil müdahale','Küçük tamirat','Tam paket'] },
};

function renderInfo() {
  const prop = Client.properties[0];
  if (!prop) return;
  const featSet = TARIFF_FEATURES_I18N[LANG] || TARIFF_FEATURES_I18N.ru;
  const feats = featSet[prop.tariff] || featSet.basic;
  document.getElementById('clientTariffInfo').innerHTML = `
    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">${t('yourTariff')}</div>
    <div class="tariff-badge-big">
      <div class="tariff-badge-big-name">${TARIFF_LABELS[prop.tariff]||prop.tariff}</div>
      <div class="tariff-badge-big-price">€${TARIFF_PRICE[prop.tariff]||0}<span style="font-size:14px;color:var(--text3)">/${LANG==='ru'?'мес':'mo'}</span></div>
      <div class="tariff-badge-big-feats">${feats.map(f=>`✓ ${f}`).join('<br/>')}</div>
    </div>`;
}

// ── EVENTS ───────────────────────────────────────────────────
function applyClientTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('clientThemeToggle');
  if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
}

function bindEvents() {
  // Theme toggle
  const themeBtn = document.getElementById('clientThemeToggle');
  if (themeBtn) {
    const saved = (() => { try { return localStorage.getItem('cg-theme'); } catch(e) { return null; } })();
    applyClientTheme(saved === 'light' ? 'light' : 'dark');
    themeBtn.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyClientTheme(next);
      try { localStorage.setItem('cg-theme', next); } catch(e) {}
    });
  }

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

  // Language switcher
  const sw = document.getElementById('langSwitcher');
  if (sw) sw.addEventListener('change', async () => {
    setLang(sw.value);
    // Re-render dynamic content in the new language
    renderOverview(); renderAllReports(); renderMyRequests(); renderInfo();
    // Persist preference back to the client record
    if (Client.data?.id) DB.update(`clients/${Client.data.id}`, { lang: sw.value }).catch(()=>{});
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
  return d.toLocaleDateString(LOCALE_MAP[LANG]||'ru-RU', { day:'numeric', month:'long', year:'numeric' });
}

function formatDateShort(val) {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  return d.toLocaleDateString(LOCALE_MAP[LANG]||'ru-RU', { day:'numeric', month:'short' });
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
