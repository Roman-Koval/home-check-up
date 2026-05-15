// ================================================================
//  bot/index.js  —  CyprusGuard Telegram Bot (SIMPLIFIED v2)
//  Only responds to commands. No auto-broadcast. No realtime listeners.
//  This avoids the rate-limit loop entirely.
// ================================================================

const TelegramBot = require('node-telegram-bot-api');
const admin       = require('firebase-admin');

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
const bot = new TelegramBot(TOKEN, { polling: true });
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

// ── KEYBOARDS ────────────────────────────────────────────────
const clientKb = {
  reply_markup: {
    keyboard: [
      ['🏠 Мой объект', '📋 Последний отчёт'],
      ['📅 Следующий визит', '📬 Заявка'],
    ],
    resize_keyboard: true,
  }
};

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
    const props = await getClientProps(client.id);
    const list = props.map(p => `  • ${p.address}`).join('\n') || '  Нет объектов';
    return bot.sendMessage(chatId,
      `🏛 *CyprusGuard*\n\nПривет, *${client.name}*! 👋\n\nВаши объекты:\n${list}`,
      { parse_mode: 'Markdown', ...clientKb }
    );
  }

  // Unknown user
  return bot.sendMessage(chatId,
    `🏛 *CyprusGuard*\n\nПривет, ${name}! 👋\n\nЯ бот агентства по управлению недвижимостью на Кипре.\n\nЧтобы получить доступ, свяжитесь с агентством:\n📞 +357 99 123 456\n\nВаш Telegram: @${tgUser || 'нет username'}\nВаш chat ID: \`${chatId}\``,
    { parse_mode: 'Markdown' }
  );
});

// ── CLIENT COMMANDS ──────────────────────────────────────────

bot.onText(/🏠 Мой объект/, async (msg) => {
  const client = await findClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);

  const props = await getClientProps(client.id);
  if (!props.length) return bot.sendMessage(msg.chat.id, 'У вас нет объектов', clientKb);

  const p = props[0];
  const emoji = { ok:'✅', warning:'⚠️', issue:'❌' };
  const tariff = { basic:'Basic (€50)', standard:'Standard (€75)', premium:'Premium (€100)' };

  return bot.sendMessage(msg.chat.id,
    `🏠 *${p.address}*\n\n` +
    `Статус: ${emoji[p.status]||'✅'}\n` +
    `Тариф: ${tariff[p.tariff]||p.tariff}\n` +
    `Следующий визит: ${p.nextVisit || 'не запланирован'}`,
    { parse_mode: 'Markdown', ...clientKb }
  );
});

bot.onText(/📋 Последний отчёт/, async (msg) => {
  const client = await findClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);

  const props = await getClientProps(client.id);
  const propIds = props.map(p => p.id);
  const all = await get('reports') || {};
  const reports = Object.values(all)
    .filter(r => propIds.includes(r.propId))
    .sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

  if (!reports.length) return bot.sendMessage(msg.chat.id, 'Отчётов пока нет', clientKb);

  const r = reports[0];
  const p = props.find(pr => pr.id === r.propId) || {};
  const cond = { ok:'✅ Всё в порядке', warning:'⚠️ Замечание', issue:'❌ Проблема' };
  const tasks = (r.tasks||[]).map(t => `  ✓ ${t}`).join('\n');

  return bot.sendMessage(msg.chat.id,
    `📋 *Последний отчёт*\n\n📍 ${p.address}\n📅 ${formatDate(r.date||r.createdAt)}\n\n*Состояние:* ${cond[r.condition]||'—'}\n\n*Выполнено:*\n${tasks}\n\n📝 ${r.comment||'—'}`,
    { parse_mode: 'Markdown', ...clientKb }
  );
});

bot.onText(/📅 Следующий визит/, async (msg) => {
  const client = await findClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);

  const props = await getClientProps(client.id);
  const propIds = props.map(p => p.id);
  const all = await get('visits') || {};
  const upcoming = Object.values(all)
    .filter(v => propIds.includes(v.propId) && v.status !== 'done')
    .sort((a,b) => a.date > b.date ? 1 : -1);

  if (!upcoming.length) return bot.sendMessage(msg.chat.id, '📅 Нет запланированных визитов', clientKb);

  const v = upcoming[0];
  const p = props.find(pr => pr.id === v.propId) || {};
  const tasks = (v.tasks||[]).map(t => `  • ${t}`).join('\n');

  return bot.sendMessage(msg.chat.id,
    `📅 *Следующий визит*\n\n📍 ${p.address}\n🗓 ${v.date}\nТип: ${v.type||'Плановый'}\n\n*Задачи:*\n${tasks}`,
    { parse_mode: 'Markdown', ...clientKb }
  );
});

bot.onText(/📬 Заявка/, async (msg) => {
  const client = await findClientByChatId(msg.chat.id);
  if (!client) return notRegistered(msg.chat.id);
  return bot.sendMessage(msg.chat.id,
    `📬 Чтобы оставить заявку — напишите её следующим сообщением, начав со слова «Заявка:»\n\nНапример:\n_Заявка: течёт кран на кухне_`,
    { parse_mode: 'Markdown', ...clientKb }
  );
});

// Catch-all for "Заявка:" messages
bot.on('message', async (msg) => {
  const text = msg.text || '';
  if (!text.toLowerCase().startsWith('заявка:')) return;

  const client = await findClientByChatId(msg.chat.id);
  if (!client) return;

  const props = await getClientProps(client.id);
  const content = text.slice(7).trim();
  const id = 'req_' + Date.now();

  await set(`requests/${id}`, {
    id, clientId: client.id, propId: props[0]?.id || '',
    type: 'other', title: content.slice(0, 50),
    description: content, status: 'new',
    createdAt: Date.now()
  });

  // Notify admin
  if (ADMIN_ID) {
    bot.sendMessage(ADMIN_ID,
      `📬 *Новая заявка*\n\nОт: ${client.name}\nОбъект: ${props[0]?.address||'—'}\n\n${content}`,
      { parse_mode: 'Markdown' }
    ).catch(()=>{});
  }

  return bot.sendMessage(msg.chat.id,
    `✅ Заявка принята! Мы свяжемся с вами в течение 24 часов.`,
    clientKb
  );
});

// ── ADMIN COMMANDS ───────────────────────────────────────────

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
  return bot.sendMessage(chatId,
    `❌ Вы не зарегистрированы.\n\nВаш chat ID: \`${chatId}\`\n\nСообщите его агентству: +357 99 123 456`,
    { parse_mode: 'Markdown' }
  );
}

function formatDate(val) {
  if (!val) return '—';
  const d = typeof val === 'number' ? new Date(val) : new Date(val);
  return d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });
}

// Catch errors
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.code, err.message);
});

// ── SAFE REALTIME: only NEW requests after bot startup ───────
const BOT_START = Date.now();
console.log(`⏰ Bot start time: ${BOT_START}`);

db.ref('requests').on('child_added', async (snap) => {
  const req = snap.val();
  if (!req || !req.createdAt) return;

  // Skip old requests (created before bot started)
  if (req.createdAt < BOT_START) return;

  // Skip already notified
  if (req._adminNotified) return;

  // Mark notified immediately to prevent re-fire
  await snap.ref.update({ _adminNotified: true });

  if (!ADMIN_ID) return;

  const clients = await get('clients') || {};
  const props = await get('properties') || {};
  const client = Object.values(clients).find(c => c.id === req.clientId);
  const prop = props[req.propId];

  const text = `📬 *Новая заявка!*\n\n*${req.title}*\n\n👤 ${client?.name || '—'}\n🏠 ${prop?.address || '—'}\n\n${req.description || ''}`;

  bot.sendMessage(ADMIN_ID, text, { parse_mode: 'Markdown' }).catch(e =>
    console.error('Admin notify failed:', e.message)
  );

  console.log(`📬 New request notified: ${req.title}`);
});

console.log('✅ Bot handlers registered. Waiting for messages…');
