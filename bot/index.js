// ================================================================
//  bot/index.js  —  CyprusGuard Telegram Bot
//  Multilingual (RU/EN/DE/FR). Polling with auto-recovery.
//  Notifies admin on NEW requests only (created after bot start).
// ================================================================

const TelegramBot = require('node-telegram-bot-api');
const admin       = require('firebase-admin');

const BOT_VERSION = 'v10-2026-05-22';
console.log('====================================================');
console.log(`🚀 CyprusGuard Bot — BUILD ${BOT_VERSION}`);
console.log('====================================================');

// ── ENV ──────────────────────────────────────────────────────
const TOKEN     = process.env.BOT_TOKEN;
const ADMIN_ID  = process.env.ADMIN_CHAT_ID;
const DB_URL    = process.env.FIREBASE_DB_URL;

if (!TOKEN)    { console.error('❌ BOT_TOKEN missing');    process.exit(1); }
if (!DB_URL)   { console.error('❌ FIREBASE_DB_URL missing'); process.exit(1); }

// ── FIREBASE ─────────────────────────────────────────────────
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
} catch(e) {
  console.error('❌ Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: DB_URL,
});

const db = admin.database();
console.log('✅ Firebase connected');

// ── BOT ──────────────────────────────────────────────────────
const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 1000,
    autoStart: true,
    params: { timeout: 30 },
  },
  // Keep the underlying HTTP agent from giving up on transient errors
  request: {
    agentOptions: { keepAlive: true },
  },
});

// Clear any leftover webhook (a set webhook silently blocks polling and is a
// common reason the bot "doesn't respond"). Safe to call every startup.
bot.deleteWebHook({ drop_pending_updates: false })
  .then(() => console.log('🧹 Webhook cleared (polling mode active)'))
  .catch(e => console.warn('deleteWebHook warning:', e.message));

console.log('🤖 Bot started in polling mode');

// ── DB HELPERS ───────────────────────────────────────────────
const get = path => db.ref(path).once('value').then(s => s.val());
const set = (path, data) => db.ref(path).set(data);
const update = (path, data) => db.ref(path).update(data);

async function findClientByChatId(chatId) {
  const all = await get('clients') || {};
  return Object.values(all).find(c => String(c.tgChatId) === String(chatId)) || null;
}

async function findClientByTg(username) {
  if (!username) return null;
  const all = await get('clients') || {};
  return Object.values(all).find(c =>
    c.tg && c.tg.replace('@','').toLowerCase() === username.toLowerCase()
  ) || null;
}

async function getClientProps(clientId) {
  const all = await get('properties') || {};
  return Object.values(all).filter(p => p.clientId === clientId);
}

// ── I18N (bot messages, per client language) ─────────────────
const T = {
  ru: {
    welcome: (n, list) => `🏛 *CyprusGuard*\n\nПривет, *${n}*! 👋\n\nВаши объекты:\n${list}`,
    noProps: '  Нет объектов',
    unknown: (n, u, id) => `🏛 *CyprusGuard*\n\nПривет, ${n}! 👋\n\nЯ бот агентства по управлению недвижимостью на Кипре.\n\nЧтобы получить доступ, свяжитесь с агентством:\n📞 +357 99 123 456\n\nВаш Telegram: @${u || 'нет username'}\nВаш chat ID: \`${id}\``,
    noObjects: 'У вас нет объектов',
    objHeader: (addr, status, tariff, next) => `🏠 *${addr}*\n\nСтатус: ${status}\nТариф: ${tariff}\nСледующий визит: ${next}`,
    notPlanned: 'не запланирован',
    noReports: 'Отчётов пока нет',
    lastReport: (addr, date, cond, tasks, comment) => `📋 *Последний отчёт*\n\n📍 ${addr}\n📅 ${date}\n\n*Состояние:* ${cond}\n\n*Выполнено:*\n${tasks}\n\n📝 ${comment}`,
    noVisits: '📅 Нет запланированных визитов',
    nextVisit: (addr, date, type, tasks) => `📅 *Следующий визит*\n\n📍 ${addr}\n🗓 ${date}\nТип: ${type}\n\n*Задачи:*\n${tasks}`,
    requestPrompt: '📬 Чтобы оставить заявку — напишите её следующим сообщением, начав со слова «Заявка:»\n\nНапример:\n_Заявка: течёт кран на кухне_',
    requestAccepted: '✅ Заявка принята! Мы свяжемся с вами в течение 24 часов.',
    notRegistered: (id) => `❌ Вы не зарегистрированы.\n\nВаш chat ID: \`${id}\`\n\nСообщите его агентству: +357 99 123 456`,
    condOk: '✅ Всё в порядке', condWarning: '⚠️ Замечание', condIssue: '❌ Проблема',
    statusOk: '✅', statusWarning: '⚠️', statusIssue: '❌',
    typePlanned: 'Плановый', requestKeyword: 'заявка:',
    kb: [['🏠 Мой объект', '📋 Последний отчёт'], ['📅 Следующий визит', '📬 Заявка']],
  },
  en: {
    welcome: (n, list) => `🏛 *CyprusGuard*\n\nHello, *${n}*! 👋\n\nYour properties:\n${list}`,
    noProps: '  No properties',
    unknown: (n, u, id) => `🏛 *CyprusGuard*\n\nHello, ${n}! 👋\n\nI'm the bot of a property management agency in Cyprus.\n\nTo get access, contact the agency:\n📞 +357 99 123 456\n\nYour Telegram: @${u || 'no username'}\nYour chat ID: \`${id}\``,
    noObjects: 'You have no properties',
    objHeader: (addr, status, tariff, next) => `🏠 *${addr}*\n\nStatus: ${status}\nPlan: ${tariff}\nNext visit: ${next}`,
    notPlanned: 'not scheduled',
    noReports: 'No reports yet',
    lastReport: (addr, date, cond, tasks, comment) => `📋 *Latest report*\n\n📍 ${addr}\n📅 ${date}\n\n*Condition:* ${cond}\n\n*Completed:*\n${tasks}\n\n📝 ${comment}`,
    noVisits: '📅 No scheduled visits',
    nextVisit: (addr, date, type, tasks) => `📅 *Next visit*\n\n📍 ${addr}\n🗓 ${date}\nType: ${type}\n\n*Tasks:*\n${tasks}`,
    requestPrompt: '📬 To submit a request — send it as your next message starting with "Request:"\n\nExample:\n_Request: kitchen tap is leaking_',
    requestAccepted: '✅ Request received! We will contact you within 24 hours.',
    notRegistered: (id) => `❌ You are not registered.\n\nYour chat ID: \`${id}\`\n\nShare it with the agency: +357 99 123 456`,
    condOk: '✅ All good', condWarning: '⚠️ Note', condIssue: '❌ Issue',
    statusOk: '✅', statusWarning: '⚠️', statusIssue: '❌',
    typePlanned: 'Scheduled', requestKeyword: 'request:',
    kb: [['🏠 My property', '📋 Latest report'], ['📅 Next visit', '📬 Request']],
  },
  de: {
    welcome: (n, list) => `🏛 *CyprusGuard*\n\nHallo, *${n}*! 👋\n\nIhre Objekte:\n${list}`,
    noProps: '  Keine Objekte',
    unknown: (n, u, id) => `🏛 *CyprusGuard*\n\nHallo, ${n}! 👋\n\nIch bin der Bot einer Immobilienverwaltung auf Zypern.\n\nFür Zugang kontaktieren Sie die Agentur:\n📞 +357 99 123 456\n\nIhr Telegram: @${u || 'kein Username'}\nIhre chat ID: \`${id}\``,
    noObjects: 'Sie haben keine Objekte',
    objHeader: (addr, status, tariff, next) => `🏠 *${addr}*\n\nStatus: ${status}\nTarif: ${tariff}\nNächster Besuch: ${next}`,
    notPlanned: 'nicht geplant',
    noReports: 'Noch keine Berichte',
    lastReport: (addr, date, cond, tasks, comment) => `📋 *Letzter Bericht*\n\n📍 ${addr}\n📅 ${date}\n\n*Zustand:* ${cond}\n\n*Erledigt:*\n${tasks}\n\n📝 ${comment}`,
    noVisits: '📅 Keine geplanten Besuche',
    nextVisit: (addr, date, type, tasks) => `📅 *Nächster Besuch*\n\n📍 ${addr}\n🗓 ${date}\nTyp: ${type}\n\n*Aufgaben:*\n${tasks}`,
    requestPrompt: '📬 Um eine Anfrage zu senden — schreiben Sie sie als nächste Nachricht, beginnend mit "Anfrage:"\n\nBeispiel:\n_Anfrage: Wasserhahn in der Küche tropft_',
    requestAccepted: '✅ Anfrage erhalten! Wir melden uns innerhalb von 24 Stunden.',
    notRegistered: (id) => `❌ Sie sind nicht registriert.\n\nIhre chat ID: \`${id}\`\n\nTeilen Sie sie der Agentur mit: +357 99 123 456`,
    condOk: '✅ Alles in Ordnung', condWarning: '⚠️ Hinweis', condIssue: '❌ Problem',
    statusOk: '✅', statusWarning: '⚠️', statusIssue: '❌',
    typePlanned: 'Geplant', requestKeyword: 'anfrage:',
    kb: [['🏠 Mein Objekt', '📋 Letzter Bericht'], ['📅 Nächster Besuch', '📬 Anfrage']],
  },
  fr: {
    welcome: (n, list) => `🏛 *CyprusGuard*\n\nBonjour, *${n}* ! 👋\n\nVos biens :\n${list}`,
    noProps: '  Aucun bien',
    unknown: (n, u, id) => `🏛 *CyprusGuard*\n\nBonjour, ${n} ! 👋\n\nJe suis le bot d'une agence de gestion immobilière à Chypre.\n\nPour obtenir l'accès, contactez l'agence :\n📞 +357 99 123 456\n\nVotre Telegram : @${u || 'pas de username'}\nVotre chat ID : \`${id}\``,
    noObjects: 'Vous n\'avez aucun bien',
    objHeader: (addr, status, tariff, next) => `🏠 *${addr}*\n\nStatut : ${status}\nForfait : ${tariff}\nProchaine visite : ${next}`,
    notPlanned: 'non planifiée',
    noReports: 'Pas encore de rapports',
    lastReport: (addr, date, cond, tasks, comment) => `📋 *Dernier rapport*\n\n📍 ${addr}\n📅 ${date}\n\n*État :* ${cond}\n\n*Effectué :*\n${tasks}\n\n📝 ${comment}`,
    noVisits: '📅 Aucune visite planifiée',
    nextVisit: (addr, date, type, tasks) => `📅 *Prochaine visite*\n\n📍 ${addr}\n🗓 ${date}\nType : ${type}\n\n*Tâches :*\n${tasks}`,
    requestPrompt: '📬 Pour envoyer une demande — écrivez-la dans votre prochain message en commençant par "Demande :"\n\nExemple :\n_Demande : le robinet de la cuisine fuit_',
    requestAccepted: '✅ Demande reçue ! Nous vous contacterons sous 24 heures.',
    notRegistered: (id) => `❌ Vous n'êtes pas enregistré.\n\nVotre chat ID : \`${id}\`\n\nCommuniquez-le à l'agence : +357 99 123 456`,
    condOk: '✅ Tout va bien', condWarning: '⚠️ Remarque', condIssue: '❌ Problème',
    statusOk: '✅', statusWarning: '⚠️', statusIssue: '❌',
    typePlanned: 'Planifiée', requestKeyword: 'demande:',
    kb: [['🏠 Mon bien', '📋 Dernier rapport'], ['📅 Prochaine visite', '📬 Demande']],
  },
};

function tr(lang) { return T[lang] || T.ru; }
function clientKbFor(lang) { return { reply_markup: { keyboard: tr(lang).kb, resize_keyboard: true } }; }
// All request keywords across languages, so the catch-all works regardless of UI language
const REQUEST_KEYWORDS = ['заявка:', 'request:', 'anfrage:', 'demande:'];

// ── KEYBOARDS ────────────────────────────────────────────────
const adminKb = {
  reply_markup: {
    keyboard: [
      ['📊 Сводка', '🔔 Заявки'],
      ['🏠 Объекты', '👥 Клиенты'],
      ['📤 Разослать отчёт'],
    ],
    resize_keyboard: true,
  }
};

// ── /start ───────────────────────────────────────────────────
bot.onText(/\/start/, async (msg) => {
  const chatId  = msg.chat.id;
  const tgUser  = msg.from.username;
  const name    = msg.from.first_name || 'Клиент';

  console.log(`/start from chatId=${chatId} username=${tgUser}`);

  // Admin?
  if (String(chatId) === String(ADMIN_ID)) {
    await update('settings/telegram', { adminChatId: String(chatId) });
    return bot.sendMessage(chatId,
      `🏛 *CyprusGuard Admin*\n\nДобро пожаловать, Администратор!\n\nИспользуйте меню ниже:`,
      { parse_mode: 'Markdown', ...adminKb }
    );
  }

  // Existing client?
  let client = await findClientByChatId(chatId);
  if (!client && tgUser) client = await findClientByTg(tgUser);

  if (client) {
    await update(`clients/${client.id}`, { tgChatId: String(chatId) });
    const lang = client.lang || 'ru';
    const props = await getClientProps(client.id);
    const list = props.map(p => `  • ${p.address}`).join('\n') || tr(lang).noProps;
    return bot.sendMessage(chatId,
      tr(lang).welcome(client.name, list),
      { parse_mode: 'Markdown', ...clientKbFor(lang) }
    );
  }

  // Unknown user
  return bot.sendMessage(chatId,
    tr('ru').unknown(name, tgUser, chatId),
    { parse_mode: 'Markdown' }
  );
});

// ── CLIENT COMMANDS (matched by emoji, language-independent) ──

bot.onText(/🏠/, async (msg) => {
  if (String(msg.chat.id) === String(ADMIN_ID)) return; // admin has own 🏠 button
  const client = await findClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);
  const lang = client.lang || 'ru';

  const props = await getClientProps(client.id);
  if (!props.length) return bot.sendMessage(msg.chat.id, tr(lang).noObjects, clientKbFor(lang));

  const p = props[0];
  const statusEmoji = { ok:tr(lang).statusOk, warning:tr(lang).statusWarning, issue:tr(lang).statusIssue };
  const tariff = { basic:'Basic (€50)', standard:'Standard (€75)', premium:'Premium (€100)' };

  return bot.sendMessage(msg.chat.id,
    tr(lang).objHeader(p.address, statusEmoji[p.status]||tr(lang).statusOk, tariff[p.tariff]||p.tariff, p.nextVisit || tr(lang).notPlanned),
    { parse_mode: 'Markdown', ...clientKbFor(lang) }
  );
});

bot.onText(/📋/, async (msg) => {
  if (String(msg.chat.id) === String(ADMIN_ID)) return;
  const client = await findClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);
  const lang = client.lang || 'ru';

  const props = await getClientProps(client.id);
  const propIds = props.map(p => p.id);
  const all = await get('reports') || {};
  const reports = Object.values(all)
    .filter(r => propIds.includes(r.propId))
    .sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

  if (!reports.length) return bot.sendMessage(msg.chat.id, tr(lang).noReports, clientKbFor(lang));

  const r = reports[0];
  const p = props.find(pr => pr.id === r.propId) || {};
  const cond = { ok:tr(lang).condOk, warning:tr(lang).condWarning, issue:tr(lang).condIssue };
  const tasks = (r.tasks||[]).map(t => `  ✓ ${t}`).join('\n');

  return bot.sendMessage(msg.chat.id,
    tr(lang).lastReport(p.address, formatDate(r.date||r.createdAt), cond[r.condition]||'—', tasks, r.comment||'—'),
    { parse_mode: 'Markdown', ...clientKbFor(lang) }
  );
});

bot.onText(/📅/, async (msg) => {
  if (String(msg.chat.id) === String(ADMIN_ID)) return;
  const client = await findClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);
  const lang = client.lang || 'ru';

  const props = await getClientProps(client.id);
  const propIds = props.map(p => p.id);
  const all = await get('visits') || {};
  const upcoming = Object.values(all)
    .filter(v => propIds.includes(v.propId) && v.status !== 'done')
    .sort((a,b) => a.date > b.date ? 1 : -1);

  if (!upcoming.length) return bot.sendMessage(msg.chat.id, tr(lang).noVisits, clientKbFor(lang));

  const v = upcoming[0];
  const p = props.find(pr => pr.id === v.propId) || {};
  const tasks = (v.tasks||[]).map(t => `  • ${t}`).join('\n');

  return bot.sendMessage(msg.chat.id,
    tr(lang).nextVisit(p.address, v.date, v.type||tr(lang).typePlanned, tasks),
    { parse_mode: 'Markdown', ...clientKbFor(lang) }
  );
});

bot.onText(/📬/, async (msg) => {
  if (String(msg.chat.id) === String(ADMIN_ID)) return;
  const client = await findClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);
  const lang = client.lang || 'ru';
  return bot.sendMessage(msg.chat.id, tr(lang).requestPrompt, { parse_mode: 'Markdown', ...clientKbFor(lang) });
});

// Catch-all for "Заявка:/Request:/Anfrage:/Demande:" messages
bot.on('message', async (msg) => {
  const text = (msg.text || '').trim();
  const lower = text.toLowerCase();
  const matched = REQUEST_KEYWORDS.find(kw => lower.startsWith(kw));
  if (!matched) return;

  const client = await findClientByChatId(msg.chat.id);
  if (!client) return;
  const lang = client.lang || 'ru';

  const props = await getClientProps(client.id);
  const content = text.slice(matched.length).trim();
  const id = 'req_' + Date.now();

  await set(`requests/${id}`, {
    id, clientId: client.id, propId: props[0]?.id || '',
    type: 'other', title: content.slice(0, 50),
    description: content, status: 'new',
    createdAt: Date.now()
  });

  // Notify admin (the realtime child_added listener below also fires;
  // this immediate ping covers the case the listener missed it)
  if (ADMIN_ID) {
    bot.sendMessage(ADMIN_ID,
      `📬 *Новая заявка*\n\nОт: ${client.name}\nОбъект: ${props[0]?.address||'—'}\n\n${content}`,
      { parse_mode: 'Markdown' }
    ).catch(()=>{});
  }

  return bot.sendMessage(msg.chat.id, tr(lang).requestAccepted, clientKbFor(lang));
});

// ── ADMIN COMMANDS ───────────────────────────────────────────

// Diagnostic: shows your chatId and whether you're recognised as admin
bot.onText(/\/diag/, async (msg) => {
  const chatId = msg.chat.id;
  const isAdmin = String(chatId) === String(ADMIN_ID);
  const client = await findClientByChatId(chatId);
  const text =
    `🔍 *Диагностика*\n\n` +
    `Ваш chatId: \`${chatId}\`\n` +
    `ADMIN_CHAT_ID: \`${ADMIN_ID || 'НЕ ЗАДАН'}\`\n` +
    `Вы админ: ${isAdmin ? '✅ да' : '❌ нет'}\n` +
    `Вы клиент: ${client ? `✅ да (${client.name})` : '❌ нет'}\n` +
    `Версия бота: ${BOT_VERSION}`;
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
});

// Diagnostic: admin creates a test request to verify the whole notify→buttons flow
bot.onText(/\/testreq/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
  const clients = await get('clients') || {};
  const firstClient = Object.values(clients)[0];
  if (!firstClient) return bot.sendMessage(msg.chat.id, 'Нет клиентов для теста');
  const props = await getClientProps(firstClient.id);
  const id = 'req_test_' + Date.now();
  await set(`requests/${id}`, {
    id, clientId: firstClient.id, propId: props[0]?.id || '',
    type: 'other', title: 'ТЕСТ заявка',
    description: 'Создано командой /testreq для проверки уведомлений',
    status: 'new', createdAt: Date.now()
  });
  bot.sendMessage(msg.chat.id, '✅ Тестовая заявка создана. Уведомление должно прийти следом…');
});

bot.onText(/📊 Сводка/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;

  const [props, clients, visits, requests] = await Promise.all([
    get('properties').then(v => Object.values(v||{})),
    get('clients').then(v => Object.values(v||{})),
    get('visits').then(v => Object.values(v||{})),
    get('requests').then(v => Object.values(v||{})),
  ]);

  const revenue = props.reduce((s,p) => s + (p.price || {'basic':50,'standard':75,'premium':100}[p.tariff] || 0), 0);
  const newReqs = requests.filter(r => r.status === 'new').length;
  const issues = props.filter(p => p.status === 'issue').length;

  return bot.sendMessage(msg.chat.id,
    `📊 *Сводка*\n\n🏠 Объектов: ${props.length}\n👥 Клиентов: ${clients.length}\n💰 Доход/мес: €${revenue}\n📅 Визитов: ${visits.filter(v=>v.status!=='done').length}\n📬 Новых заявок: ${newReqs}\n${issues ? `❌ Проблем: ${issues}` : '✅ Все в норме'}`,
    { parse_mode: 'Markdown', ...adminKb }
  );
});

bot.onText(/🔔 Заявки/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
  const all = await get('requests').then(v => Object.values(v||{}));
  const newReqs = all.filter(r => r.status === 'new').slice(0, 5);

  if (!newReqs.length) return bot.sendMessage(msg.chat.id, '✅ Новых заявок нет', adminKb);

  const clients = await get('clients') || {};
  const props = await get('properties') || {};
  const text = newReqs.map(r => {
    const c = Object.values(clients).find(cl => cl.id === r.clientId);
    return `📬 ${r.title}\n   ${c?.name||'—'} · ${props[r.propId]?.address||'—'}`;
  }).join('\n\n');

  return bot.sendMessage(msg.chat.id, `🔔 *Заявки (${newReqs.length})*\n\n${text}`, { parse_mode: 'Markdown', ...adminKb });
});

bot.onText(/🏠 Объекты/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
  const props = await get('properties').then(v => Object.values(v||{}));
  const clients = await get('clients') || {};
  const emoji = { ok:'✅', warning:'⚠️', issue:'❌' };
  const text = props.map(p => {
    const c = Object.values(clients).find(cl => cl.id === p.clientId);
    const price = p.price || {'basic':50,'standard':75,'premium':100}[p.tariff] || 0;
    return `${emoji[p.status]||'✅'} ${p.address}\n   ${c?.name||'—'} · €${price}/мес`;
  }).join('\n\n');
  return bot.sendMessage(msg.chat.id, `🏠 *Объекты (${props.length})*\n\n${text}`, { parse_mode: 'Markdown', ...adminKb });
});

bot.onText(/👥 Клиенты/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
  const clients = await get('clients').then(v => Object.values(v||{}));
  if (!clients.length) return bot.sendMessage(msg.chat.id, 'Клиентов пока нет', adminKb);
  const text = clients.map(c => {
    const tgStatus = c.tgChatId ? '✅' : '⚪';
    return `${tgStatus} *${c.name}*\n   ${c.country||''} · ${c.tg||'—'}\n   📞 ${c.phone||'—'}`;
  }).join('\n\n');
  return bot.sendMessage(msg.chat.id,
    `👥 *Клиенты (${clients.length})*\n${text}\n\n_✅ — подключён к боту_\n_⚪ — ещё не написал /start_`,
    { parse_mode: 'Markdown', ...adminKb }
  );
});

bot.onText(/📤 Разослать отчёт/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_ID)) return;
  const clients = await get('clients').then(v => Object.values(v||{}));
  const connected = clients.filter(c => c.tgChatId);

  if (!connected.length) {
    return bot.sendMessage(msg.chat.id,
      `📤 *Разослать отчёт*\n\nНи один клиент пока не подключён к боту.\n\nЧтобы клиент подключился — он должен написать боту /start.\n\nПодсказка: добавьте в карточке клиента его @username, тогда бот сразу его узнает.`,
      { parse_mode: 'Markdown', ...adminKb }
    );
  }

  let sent = 0;
  for (const c of connected) {
    try {
      await bot.sendMessage(c.tgChatId,
        `🏛 *CyprusGuard*\n\nЗдравствуйте, ${c.name}!\n\nЭто тестовая рассылка от администратора.\n\nВаш объект под надёжной защитой. ✅`,
        { parse_mode: 'Markdown' }
      );
      sent++;
    } catch(e) {
      console.error(`Не удалось отправить ${c.name}:`, e.message);
    }
  }

  return bot.sendMessage(msg.chat.id,
    `✅ Отправлено: ${sent} из ${connected.length}`,
    adminKb
  );
});

// ── HELPERS ──────────────────────────────────────────────────
function notRegistered(chatId) {
  return bot.sendMessage(chatId, tr('ru').notRegistered(chatId), { parse_mode: 'Markdown' });
}

function formatDate(val) {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  return d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });
}

// Catch errors with actionable diagnostics + auto-recover from network drops
let restarting = false;
async function restartPolling(reason) {
  if (restarting) return;
  restarting = true;
  console.error(`🔄 Restarting polling (${reason})…`);
  try {
    await bot.stopPolling({ cancel: true }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));
    await bot.startPolling();
    console.log('✅ Polling restarted');
  } catch (e) {
    console.error('Restart failed, retrying in 10s:', e.message);
    setTimeout(() => { restarting = false; restartPolling('retry'); }, 10000);
    return;
  }
  restarting = false;
}

bot.on('polling_error', (err) => {
  const code = err.code || '';
  const msg = err.message || String(err);
  console.error('⚠️ Polling error:', code, msg);

  if (code === 'ETELEGRAM' && /409/.test(msg)) {
    console.error('🛑 CONFLICT 409: another bot instance is using this token.');
    console.error('   → Stop all other copies (local + hosting), redeploy ONE instance.');
    // Do NOT auto-restart on 409 — that would fight the other instance.
  } else if (/401/.test(msg)) {
    console.error('🛑 UNAUTHORIZED 401: BOT_TOKEN is wrong or revoked. Check env var.');
  } else if (code === 'EFATAL' || /ENOTFOUND|ETIMEDOUT|ECONNRESET|socket hang up|network/i.test(msg)) {
    console.error('🌐 Network issue reaching Telegram — recovering…');
    restartPolling(code || 'network');
  }
});

bot.on('error', (err) => console.error('⚠️ Bot error:', err.message || err));

process.on('unhandledRejection', (r) => console.error('⚠️ Unhandled rejection:', r && r.message ? r.message : r));
process.on('uncaughtException',  (e) => console.error('⚠️ Uncaught exception:', e && e.message ? e.message : e));

// ── REALTIME NOTIFICATIONS ───────────────────────────────────
// On first boot, mark everything that already exists as "notified" so we
// don't spam the admin with the backlog. After that, any genuinely new
// child fires a notification. This does NOT rely on clock sync (the old
// BOT_START approach silently dropped requests when times were close).
let warmedUp = false;

async function warmUp() {
  const [reqs, reps] = await Promise.all([
    get('requests').then(v => v || {}),
    get('reports').then(v => v || {}),
  ]);
  const updates = {};
  for (const id of Object.keys(reqs)) if (!reqs[id]._adminNotified) updates[`requests/${id}/_adminNotified`] = true;
  for (const id of Object.keys(reps)) if (!reps[id]._adminNotified) updates[`reports/${id}/_adminNotified`] = true;
  if (Object.keys(updates).length) await db.ref().update(updates);
  warmedUp = true;
  console.log(`✅ Warm-up done. Existing items marked (requests:${Object.keys(reqs).length}, reports:${Object.keys(reps).length}). Now watching for NEW ones.`);
}

// NEW REQUEST → notify admin with action buttons
db.ref('requests').on('child_added', async (snap) => {
  const req = snap.val();
  console.log(`[req fired] id=${snap.key} warmedUp=${warmedUp} notified=${req?._adminNotified}`);
  if (!warmedUp) return;            // ignore the initial backlog burst
  if (!req || req._adminNotified) return;
  await snap.ref.update({ _adminNotified: true });
  if (!ADMIN_ID) { console.log('⚠️ ADMIN_ID not set — cannot notify'); return; }

  const clients = await get('clients') || {};
  const props = await get('properties') || {};
  const client = Object.values(clients).find(c => c.id === req.clientId);
  const prop = props[req.propId];

  const urgent = req.priority === 'urgent' || req.type === 'urgent';
  const head = urgent ? '🚨 *СРОЧНАЯ заявка!*' : '📬 *Новая заявка!*';
  const text = `${head}\n\n*${req.title || '—'}*\n\n👤 ${client?.name || '—'}\n🏠 ${prop?.address || '—'}\n\n${req.description || ''}`;

  bot.sendMessage(ADMIN_ID, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[
      { text: '🔧 В работу', callback_data: `req:inprogress:${req.id}` },
      { text: '✅ Выполнено', callback_data: `req:done:${req.id}` },
    ]] }
  }).catch(e => console.error('Admin notify failed:', e.message));

  console.log(`📬 New request notified: ${req.title}`);
});

// NEW REPORT → notify admin with "send to client" button
db.ref('reports').on('child_added', async (snap) => {
  if (!warmedUp) return;
  const rep = snap.val();
  if (!rep || rep._adminNotified) return;
  await snap.ref.update({ _adminNotified: true });
  if (!ADMIN_ID) return;

  const props = await get('properties') || {};
  const clients = await get('clients') || {};
  const prop = props[rep.propId];
  const client = prop ? Object.values(clients).find(c => c.id === prop.clientId) : null;
  const cond = { ok: '✅ Норма', warning: '⚠️ Замечание', issue: '❌ Проблема' };

  const text = `📋 *Новый отчёт создан*\n\n🏠 ${prop?.address || '—'}\n👤 ${client?.name || '—'}\nСостояние: ${cond[rep.condition] || '—'}\n${rep.photoUrls?.length ? `📷 Фото: ${rep.photoUrls.length}` : ''}`;

  const buttons = [];
  if (client?.tgChatId) buttons.push([{ text: '✈ Отправить клиенту', callback_data: `rep:send:${rep.id}` }]);

  bot.sendMessage(ADMIN_ID, text, {
    parse_mode: 'Markdown',
    reply_markup: buttons.length ? { inline_keyboard: buttons } : undefined
  }).catch(e => console.error('Report notify failed:', e.message));

  console.log(`📋 New report notified: ${prop?.address}`);
});

// ── INLINE BUTTON HANDLER (manage statuses from chat) ────────
bot.on('callback_query', async (q) => {
  try {
    const [domain, action, id] = (q.data || '').split(':');
    const fromAdmin = String(q.message.chat.id) === String(ADMIN_ID);

    if (domain === 'req' && fromAdmin) {
      await update(`requests/${id}`, { status: action });
      const label = action === 'done' ? '✅ Выполнено' : '🔧 В работе';
      await bot.answerCallbackQuery(q.id, { text: `Статус: ${label}` });
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: `Статус обновлён: ${label}`, callback_data: 'noop' }]] },
        { chat_id: q.message.chat.id, message_id: q.message.message_id }
      ).catch(()=>{});
      return;
    }

    if (domain === 'rep' && action === 'send' && fromAdmin) {
      const rep = await get(`reports/${id}`);
      const props = await get('properties') || {};
      const clients = await get('clients') || {};
      const prop = rep ? props[rep.propId] : null;
      const client = prop ? Object.values(clients).find(c => c.id === prop.clientId) : null;
      if (!client || !client.tgChatId) {
        return bot.answerCallbackQuery(q.id, { text: 'У клиента нет Telegram', show_alert: true });
      }
      const lang = client.lang || 'ru';
      const cond = { ok: tr(lang).condOk, warning: tr(lang).condWarning, issue: tr(lang).condIssue };
      const tasks = (rep.tasks || []).map(t => `  ✓ ${t}`).join('\n');
      await bot.sendMessage(client.tgChatId,
        tr(lang).lastReport(prop.address, formatDate(rep.date || rep.createdAt), cond[rep.condition] || '—', tasks, rep.comment || '—'),
        { parse_mode: 'Markdown' }
      ).catch(()=>{});
      await update(`reports/${id}`, { sentToClient: true });
      await bot.answerCallbackQuery(q.id, { text: '✅ Отправлено клиенту' });
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: '✅ Отправлено клиенту', callback_data: 'noop' }]] },
        { chat_id: q.message.chat.id, message_id: q.message.message_id }
      ).catch(()=>{});
      return;
    }

    await bot.answerCallbackQuery(q.id).catch(()=>{});
  } catch (e) {
    console.error('callback_query error:', e.message);
    bot.answerCallbackQuery(q.id, { text: 'Ошибка' }).catch(()=>{});
  }
});

console.log('✅ Bot handlers registered. Waiting for messages…');

// Warm up after a short delay so initial Firebase sync settles first
setTimeout(warmUp, 4000);

// ── 24H VISIT REMINDERS ──────────────────────────────────────
// Checks once per hour for visits happening "tomorrow" and notifies the
// client once (guarded by a _reminded flag). Respects the notifyReminder toggle.
async function checkReminders() {
  try {
    const settings = await get('settings/telegram') || {};
    if (settings.notifyReminder === false) return;
    const token = settings.token;
    if (!token) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ds = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;

    const [visits, props, clients] = await Promise.all([
      get('visits').then(v => v||{}),
      get('properties').then(v => v||{}),
      get('clients').then(v => Object.values(v||{})),
    ]);

    for (const [vid, v] of Object.entries(visits)) {
      if (v.date !== ds || v.status === 'done' || v._reminded) continue;
      const prop = props[v.propId];
      if (!prop) continue;
      const client = clients.find(c => c.id === prop.clientId);
      if (!client || !client.tgChatId) continue;

      const tasks = (v.tasks||[]).map(t => `  • ${t}`).join('\n');
      const msg = `🏛 *CyprusGuard — напоминание*\n\n📅 Завтра запланирован визит на ваш объект:\n📍 ${prop.address}\n\n*Задачи:*\n${tasks || '  • Плановый осмотр'}`;
      await bot.sendMessage(client.tgChatId, msg, { parse_mode: 'Markdown' }).catch(()=>{});
      await update(`visits/${vid}`, { _reminded: true });
      console.log(`⏰ Reminder sent for visit ${vid} → ${client.name}`);
    }
  } catch(e) {
    console.error('Reminder check failed:', e.message);
  }
}

// Run shortly after startup, then hourly
setTimeout(checkReminders, 15000);
setInterval(checkReminders, 60 * 60 * 1000);
