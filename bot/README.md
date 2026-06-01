# CyprusGuard Telegram Bot

Node.js бот для агентства по управлению недвижимостью на Кипре.

## Возможности

**Для клиентов:**
- `/start` — регистрация, привязка Telegram к аккаунту
- 🏠 Мой объект — адрес, статус, тариф
- 📋 Последний отчёт — текст + фотографии
- 📅 Следующий визит — дата и задачи
- 📬 Оставить заявку — двухшаговый диалог
- 💬 Написать агенту — сообщение администратору

**Для администратора:**
- 📊 Сводка — все KPI одним сообщением
- 🔔 Заявки — список новых заявок
- 🏠 Объекты — все объекты и статусы
- Автоматически получает уведомления о заявках

**Автоматически:**
- Отправляет отчёты клиентам сразу после создания
- Уведомляет о срочных проблемах на объектах

---

## Деплой на Railway (бесплатно, рекомендуется)

1. Зарегистрируйтесь на [railway.app](https://railway.app)
2. **New Project → Deploy from GitHub repo**
3. Выберите ваш репозиторий, укажите папку `bot/` как root
4. Во вкладке **Variables** добавьте переменные (см. ниже)
5. Railway автоматически запустит `npm start`

---

## Деплой на Render (бесплатно)

1. Зарегистрируйтесь на [render.com](https://render.com)
2. **New → Web Service → Connect GitHub**
3. Root Directory: `bot`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Во вкладке **Environment** добавьте переменные

---

## Переменные окружения (обязательные)

| Переменная | Описание | Где взять |
|---|---|---|
| `BOT_TOKEN` | Токен бота | @BotFather → /newbot |
| `FIREBASE_DB_URL` | URL базы данных | Firebase Console → Realtime Database |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON ключ сервисного аккаунта | Firebase Console → Project Settings → Service Accounts → Generate key → скопировать содержимое файла в одну строку |
| `ADMIN_CHAT_ID` | Ваш Telegram chat ID | Напишите @userinfobot |

### Опциональные

| Переменная | Описание |
|---|---|
| `WEBHOOK_URL` | URL вашего деплоя (напр. `https://my-app.railway.app`) — включает webhook вместо polling |
| `FIREBASE_STORAGE_BUCKET` | Bucket для Storage (если нужно) |

---

## Как получить FIREBASE_SERVICE_ACCOUNT_JSON

1. Firebase Console → Project Settings (⚙️) → вкладка **Service accounts**
2. Нажмите **Generate new private key** → скачается JSON файл
3. Откройте файл, скопируйте всё содержимое
4. Вставьте как значение переменной (целиком, одной строкой)

---

## Как найти свой ADMIN_CHAT_ID

1. Напишите в Telegram боту [@userinfobot](https://t.me/userinfobot)
2. Он ответит вашим `Id` — это и есть ADMIN_CHAT_ID
3. Затем напишите своему боту `/start` — он сохранит admin chatId в Firebase

---

## Локальный запуск

```bash
cd bot
npm install

# Создайте .env файл:
BOT_TOKEN=1234567890:AAF...
FIREBASE_DB_URL=https://your-project-default-rtdb.europe-west1.firebasedatabase.app
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
ADMIN_CHAT_ID=123456789

# Запуск
node index.js
```

---

## Структура проекта

```
bot/
├── index.js        — основной файл бота
├── package.json    — зависимости
└── README.md       — эта инструкция
```
