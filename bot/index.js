// ================================================================
//  bot/index.js  —  CyprusGuard Telegram Bot
//  Stack: Node.js 18+, node-telegram-bot-api, firebase-admin
//
//  Deploy for FREE:
//  → Railway.app  (connect GitHub → New Project → Deploy)
//  → Render.com   (New Web Service → Free tier)
//
//  ENV VARS required:
//    BOT_TOKEN        — from @BotFather
//    FIREBASE_DB_URL  — https://YOUR-PROJECT-default-rtdb.europe-west1.firebasedatabase.app
//    FIREBASE_SERVICE_ACCOUNT_JSON  — paste the entire service account JSON as one line
//    ADMIN_CHAT_ID    — your personal Telegram chat ID (get from @userinfobot)
// ================================================================

const TelegramBot     = require('node-telegram-bot-api');
const admin           = require('firebase-admin');
const express         = require('express');

// ── FIREBASE INIT ────────────────────────────────────────────
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
} catch(e) {
  console.error('❌ Invalid FIREBASE_SERVICE_ACCOUNT_JSON'); process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
});

const db = admin.database();

// ── BOT INIT ─────────────────────────────────────────────────
const TOKEN      = process.env.BOT_TOKEN;
const ADMIN_ID   = process.env.ADMIN_CHAT_ID;
const PORT       = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL; // e.g. https://your-app.railway.app

if (!TOKEN) { console.error('❌ BOT_TOKEN missing'); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: !WEBHOOK_URL });

if (WEBHOOK_URL) {
  const app = express();
  app.use(express.json());
  app.post(`/webhook/${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  app.get('/', (req, res) => res.send('CyprusGuard Bot is running ✅'));
  app.listen(PORT, () => {
    bot.setWebHook(`${WEBHOOK_URL}/webhook/${TOKEN}`);
    console.log(`🤖 Webhook mode on port ${PORT}`);
  });
} else {
  console.log('🤖 Polling mode');
}

// ── DB HELPERS ───────────────────────────────────────────────
const DB = {
  get:    path => db.ref(path).once('value').then(s => s.val()),
  set:    (path, data) => db.ref(path).set({ ...data, updatedAt: Date.now() }),
  update: (path, data) => db.ref(path).update({ ...data, updatedAt: Date.now() }),
  push:   (path, data) => { const r = db.ref(path).push(); return r.set({ ...data, id: r.key, createdAt: Date.now() }).then(() => r.key); },
  getClientByChatId: async (chatId) => {
    const snap = await db.ref('clients').orderByChild('tgChatId').equalTo(String(chatId)).once('value');
    const val = snap.val();
    return val ? Object.values(val)[0] : null;
  },
  getClientByTg: async (username) => {
    const snap = await db.ref('clients').orderByChild('tg').equalTo('@'+username).once('value');
    const val = snap.val();
    return val ? Object.values(val)[0] : null;
  },
};

// ── KEYBOARDS ────────────────────────────────────────────────
const clientKeyboard = {
  reply_markup: {
    keyboard: [
      ['🏠 Мой объект', '📋 Последний отчёт'],
      ['📬 Оставить заявку', '📅 Следующий визит'],
      ['💬 Написать агенту'],
    ],
    resize_keyboard: true,
  }
};

const adminKeyboard = {
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
  const userId  = msg.from.username;
  const firstName = msg.from.first_name || 'Клиент';

  // Check if this is the admin
  if (String(chatId) === String(ADMIN_ID)) {
    // Save admin chat id to settings
    await DB.update('settings/telegram', { adminChatId: String(chatId) });
    await bot.sendMessage(chatId,
      `🏛 *CyprusGuard Admin Bot*\n\nДобро пожаловать, Администратор!\n\nБот готов к работе. Вы будете получать уведомления о заявках, новых клиентах и экстренных ситуациях.`,
      { parse_mode: 'Markdown', ...adminKeyboard }
    );
    return;
  }

  // Try to find client by Telegram username
  let client = null;
  if (userId) client = await DB.getClientByChatId(chatId);
  if (!client && userId) client = await DB.getClientByTg(userId);

  if (client) {
    // Update chat ID
    await DB.update(`clients/${client.id}`, { tgChatId: String(chatId) });
    const props = await getClientProperties(client.id);
    const propList = props.map(p => `  • ${p.address}`).join('\n') || '  Нет объектов';
    await bot.sendMessage(chatId,
      `🏛 *CyprusGuard — Добро пожаловать!*\n\nПривет, *${client.name}*! 👋\n\nВаши объекты:\n${propList}\n\nИспользуйте меню ниже для управления.`,
      { parse_mode: 'Markdown', ...clientKeyboard }
    );
    notifyAdmin(`✅ Клиент ${client.name} подключился к боту`);
  } else {
    // Unknown user — ask to contact agency
    await bot.sendMessage(chatId,
      `🏛 *CyprusGuard Home Check-up*\n\nПривет, ${firstName}! 👋\n\nЯ бот агентства по управлению недвижимостью на Кипре.\n\nЧтобы получить доступ к вашему личному кабинету, свяжитесь с нашим агентством:\n\n📞 +357 99 123 456\n✉️ info@cyprusguard.com\n\nЕсли вы уже наш клиент — убедитесь, что ваш Telegram (@${userId||'username'}) добавлен в систему.`,
      { parse_mode: 'Markdown' }
    );
  }
});

// ── CLIENT COMMANDS ──────────────────────────────────────────

// My property
bot.onText(/\/property|🏠 Мой объект/, async (msg) => {
  const client = await DB.getClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);

  const props = await getClientProperties(client.id);
  if (!props.length) {
    return bot.sendMessage(msg.chat.id, 'У вас нет прикреплённых объектов.');
  }

  const p = props[0];
  const statusEmoji = { ok:'✅', warning:'⚠️', issue:'❌' };
  const tariffLabel = { basic:'Basic (€50)', standard:'Standard (€75)', premium:'Premium (€100)' };

  await bot.sendMessage(msg.chat.id,
    `🏠 *${p.address}*\n\n` +
    `Статус: ${statusEmoji[p.status]||'✅'} ${p.status==='ok'?'Всё в порядке':p.status==='warning'?'Есть замечания':'Требует внимания'}\n` +
    `Тариф: ${tariffLabel[p.tariff]||p.tariff}\n` +
    `Следующий визит: ${p.nextVisit||'не запланирован'}\n\n` +
    `${p.notes||''}`,
    { parse_mode: 'Markdown', ...clientKeyboard }
  );
});

// Last report
bot.onText(/\/report|📋 Последний отчёт/, async (msg) => {
  const client = await DB.getClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);

  const props = await getClientProperties(client.id);
  if (!props.length) return bot.sendMessage(msg.chat.id, 'Нет объектов.');

  const propIds = props.map(p => p.id);
  const allReports = await DB.get('reports') || {};
  const reports = Object.values(allReports)
    .filter(r => propIds.includes(r.propId))
    .sort((a,b) => (b.createdAt||0)-(a.createdAt||0));

  if (!reports.length) {
    return bot.sendMessage(msg.chat.id, 'Отчётов пока нет.', clientKeyboard);
  }

  const r = reports[0];
  const p = props.find(pr => pr.id === r.propId) || {};
  const condLabel = { ok:'✅ Всё в порядке', warning:'⚠️ Замечание', issue:'❌ Проблема' };
  const taskList = (r.tasks||[]).map(t => `  ✓ ${t}`).join('\n');

  await bot.sendMessage(msg.chat.id,
    `📋 *Последний отчёт*\n\n` +
    `📍 ${p.address}\n` +
    `📅 ${formatDate(r.date||r.createdAt)}\n\n` +
    `*Состояние:* ${condLabel[r.condition]||'—'}\n\n` +
    `*Выполнено:*\n${taskList}\n\n` +
    `📝 ${r.comment||'—'}` +
    (r.bill ? `\n\n💡 Счёт ЖКХ: €${r.bill}` : ''),
    { parse_mode: 'Markdown', ...clientKeyboard }
  );

  // Send photos
  if (r.photoUrls?.length) {
    const media = r.photoUrls.slice(0,9).map((url, i) => ({
      type: 'photo', media: url, ...(i===0 ? { caption: `📷 Фото с визита — ${p.address}` } : {})
    }));
    await bot.sendMediaGroup(msg.chat.id, media).catch(() => {});
  }
});

// Next visit
bot.onText(/\/nextvisit|📅 Следующий визит/, async (msg) => {
  const client = await DB.getClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);

  const props = await getClientProperties(client.id);
  const propIds = props.map(p => p.id);
  const allVisits = await DB.get('visits') || {};
  const upcoming = Object.values(allVisits)
    .filter(v => propIds.includes(v.propId) && v.status !== 'done')
    .sort((a,b) => a.date > b.date ? 1 : -1);

  if (!upcoming.length) {
    return bot.sendMessage(msg.chat.id, '📅 Нет запланированных визитов.', clientKeyboard);
  }

  const v = upcoming[0];
  const p = props.find(pr => pr.id === v.propId) || {};
  const tasks = (v.tasks||[]).map(t => `  • ${t}`).join('\n');

  await bot.sendMessage(msg.chat.id,
    `📅 *Следующий визит*\n\n` +
    `📍 ${p.address}\n` +
    `🗓 ${v.date}\n` +
    `Тип: ${v.type||'Плановый осмотр'}\n\n` +
    `*Задачи:*\n${tasks}\n\n` +
    (v.notes ? `📝 ${v.notes}` : ''),
    { parse_mode: 'Markdown', ...clientKeyboard }
  );
});

// Submit request
bot.onText(/📬 Оставить заявку/, async (msg) => {
  const client = await DB.getClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);

  // Set user state to await description
  userState[msg.chat.id] = { step: 'req_title', clientId: client.id };

  await bot.sendMessage(msg.chat.id,
    `📬 *Новая заявка*\n\nОпишите проблему или пожелание — напишите краткий заголовок:`,
    { parse_mode: 'Markdown', reply_markup: { force_reply: true } }
  );
});

// Write to agent
bot.onText(/💬 Написать агенту/, async (msg) => {
  const client = await DB.getClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);
  userState[msg.chat.id] = { step: 'msg_agent', clientId: client.id };
  await bot.sendMessage(msg.chat.id, '💬 Напишите ваше сообщение агенту:', { reply_markup: { force_reply: true } });
});

// ── ADMIN COMMANDS ───────────────────────────────────────────

// Summary
bot.onText(/\/summary|📊 Сводка/, async (msg) => {
  if (!isAdmin(msg.chat.id)) return;

  const [props, clients, visits, requests] = await Promise.all([
    DB.get('properties').then(v => Object.values(v||{})),
    DB.get('clients').then(v => Object.values(v||{})),
    DB.get('visits').then(v => Object.values(v||{})),
    DB.get('requests').then(v => Object.values(v||{})),
  ]);

  const revenue = props.reduce((s, p) => s + ({'basic':50,'standard':75,'premium':100}[p.tariff]||0), 0);
  const newReqs = requests.filter(r => r.status === 'new').length;
  const issues  = props.filter(p => p.status === 'issue').length;

  await bot.sendMessage(msg.chat.id,
    `📊 *Сводка CyprusGuard*\n\n` +
    `🏠 Объектов: ${props.length}\n` +
    `👥 Клиентов: ${clients.length}\n` +
    `💰 Доход/мес: €${revenue}\n` +
    `📅 Визитов запланировано: ${visits.filter(v=>v.status!=='done').length}\n` +
    `📬 Новых заявок: ${newReqs}\n` +
    `${issues ? `❌ Проблем на объектах: ${issues}` : '✅ Все объекты в норме'}`,
    { parse_mode: 'Markdown', ...adminKeyboard }
  );
});

// List requests
bot.onText(/\/requests|🔔 Заявки/, async (msg) => {
  if (!isAdmin(msg.chat.id)) return;

  const all = await DB.get('requests').then(v => Object.values(v||{}));
  const newReqs = all.filter(r => r.status === 'new');

  if (!newReqs.length) {
    return bot.sendMessage(msg.chat.id, '✅ Новых заявок нет.', adminKeyboard);
  }

  const clients = await DB.get('clients').then(v => v||{});
  const props   = await DB.get('properties').then(v => v||{});

  const text = newReqs.slice(0,5).map(r => {
    const c = clients[props[r.propId]?.clientId||r.clientId] || {};
    return `📬 *${r.title}*\n   Клиент: ${c.name||'—'}\n   Объект: ${props[r.propId]?.address||'—'}\n   ${r.description?.slice(0,60)||''}…`;
  }).join('\n\n');

  await bot.sendMessage(msg.chat.id,
    `🔔 *Новые заявки (${newReqs.length})*\n\n${text}`,
    { parse_mode: 'Markdown', ...adminKeyboard }
  );
});

// List properties
bot.onText(/🏠 Объекты/, async (msg) => {
  if (!isAdmin(msg.chat.id)) return;
  const props = await DB.get('properties').then(v => Object.values(v||{}));
  const clients = await DB.get('clients').then(v => v||{});
  const statusE = { ok:'✅', warning:'⚠️', issue:'❌' };
  const text = props.map(p => `${statusE[p.status]||'✅'} *${p.address}*\n   ${clients[p.clientId]?.name||'—'} · €${{'basic':50,'standard':75,'premium':100}[p.tariff]||0}/мес`).join('\n\n');
  await bot.sendMessage(msg.chat.id, `🏠 *Объекты (${props.length})*\n\n${text}`, { parse_mode:'Markdown', ...adminKeyboard });
});

// ── STATE MACHINE (multi-step flows) ─────────────────────────
const userState = {};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = msg.text || '';
  const state  = userState[chatId];
  if (!state) return;

  // CLIENT: submit request - step 1 (title)
  if (state.step === 'req_title') {
    userState[chatId] = { ...state, step: 'req_desc', title: text };
    return bot.sendMessage(chatId, '📝 Теперь подробно опишите проблему:', { reply_markup: { force_reply: true } });
  }

  // CLIENT: submit request - step 2 (description)
  if (state.step === 'req_desc') {
    delete userState[chatId];
    const client = await DB.get(`clients/${state.clientId}`);
    const props  = await getClientProperties(state.clientId);
    const id = await DB.push('requests', {
      clientId: state.clientId,
      propId:   props[0]?.id || '',
      type:     'other',
      title:    state.title,
      description: text,
      status:   'new',
    });
    // Notify admin
    notifyAdmin(`📬 Новая заявка от *${client?.name||'Клиент'}*\n\n📌 ${state.title}\n${text.slice(0,200)}`);
    // Push notification to DB
    await DB.push('notifications', { message: `📬 Заявка от ${client?.name}: «${state.title}»`, type:'warning' });
    await bot.sendMessage(chatId,
      `✅ *Заявка принята!*\n\nМы ответим в течение 24 часов.\n\nЗаголовок: ${state.title}`,
      { parse_mode:'Markdown', ...clientKeyboard }
    );
    return;
  }

  // CLIENT: message to agent
  if (state.step === 'msg_agent') {
    delete userState[chatId];
    const client = await DB.get(`clients/${state.clientId}`);
    notifyAdmin(`💬 Сообщение от *${client?.name||'Клиент'}*:\n\n${text}`);
    await bot.sendMessage(chatId, '✅ Ваше сообщение передано агенту! Ответим скоро.', clientKeyboard);
    return;
  }
});

// Photo handling (for requests)
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const state  = userState[chatId];
  if (!state) return;
  await bot.sendMessage(chatId, '📷 Фото получено. Напишите описание проблемы:', { reply_markup: { force_reply: true } });
});

// ── REALTIME LISTENERS ───────────────────────────────────────
// Listen for new reports and push to client's Telegram
db.ref('reports').on('child_added', async (snap) => {
  const report = snap.val();
  if (!report || report._notified) return;

  // Find property and client
  const prop   = await DB.get(`properties/${report.propId}`);
  if (!prop) return;
  const client = await DB.get(`clients/${prop.clientId}`);
  if (!client?.tgChatId) return;

  const settings = await DB.get('settings/telegram');
  if (!settings?.notifyAfterVisit) return;

  const condLabel = { ok:'✅ Всё в порядке', warning:'⚠️ Есть замечания', issue:'❌ Проблема' };
  const tasks = (report.tasks||[]).map(t=>`  ✓ ${t}`).join('\n');

  try {
    await bot.sendMessage(client.tgChatId,
      `🏛 *Отчёт о визите — CyprusGuard*\n\n` +
      `📍 *${prop.address}*\n` +
      `📅 ${formatDate(report.date||report.createdAt)}\n\n` +
      `*Состояние:* ${condLabel[report.condition]||'—'}\n\n` +
      `*Выполнено:*\n${tasks}\n\n` +
      `📝 ${report.comment||'—'}` +
      (report.bill ? `\n\n💡 Счёт ЖКХ: €${report.bill}` : ''),
      { parse_mode: 'Markdown' }
    );

    // Send photos
    if (report.photoUrls?.length) {
      const media = report.photoUrls.slice(0,9).map((url, i) => ({
        type: 'photo', media: url,
        ...(i===0 ? { caption: `📷 Фото с визита — ${prop.address}` } : {})
      }));
      await bot.sendMediaGroup(client.tgChatId, media).catch(() => {});
    }

    // Mark as notified
    await DB.update(`reports/${report.id}`, { tgSent: true, _notified: true });
  } catch(e) { console.error('TG send error', e.message); }
});

// Listen for urgent property issues
db.ref('properties').on('child_changed', async (snap) => {
  const prop = snap.val();
  if (!prop || prop.status !== 'issue') return;
  const settings = await DB.get('settings/telegram');
  if (!settings?.notifyUrgent) return;

  const client = await DB.get(`clients/${prop.clientId}`);
  if (client?.tgChatId) {
    await bot.sendMessage(client.tgChatId,
      `🚨 *СРОЧНО — CyprusGuard*\n\nОбнаружена проблема на вашем объекте!\n\n📍 *${prop.address}*\n\nАгент уже занимается решением. Мы вас уведомим о результате.`,
      { parse_mode: 'Markdown' }
    ).catch(() => {});
  }

  notifyAdmin(`🚨 Проблема на объекте: *${prop.address}*\nКлиент: ${client?.name||'—'}`);
});

// ── HELPERS ──────────────────────────────────────────────────
function isAdmin(chatId) { return String(chatId) === String(ADMIN_ID); }

function notRegistered(chatId) {
  return bot.sendMessage(chatId, '❌ Вы не зарегистрированы в системе. Обратитесь в агентство: +357 99 123 456');
}

function notifyAdmin(msg) {
  if (!ADMIN_ID) return;
  return bot.sendMessage(ADMIN_ID, msg, { parse_mode: 'Markdown', ...adminKeyboard }).catch(() => {});
}

async function getClientProperties(clientId) {
  const all = await DB.get('properties') || {};
  return Object.values(all).filter(p => p.clientId === clientId);
}

function formatDate(val) {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  return d.toLocaleDateString('ru', { day:'numeric', month:'long', year:'numeric' });
}

console.log('🤖 CyprusGuard Telegram Bot started');
