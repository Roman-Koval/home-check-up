// ============================================================
//  firebase-config.js  —  CyprusGuard shared Firebase layer
//  Replace the firebaseConfig values with your own project.
//  Free plan (Spark) is sufficient for up to ~15 properties.
// ============================================================

// ── 1. PASTE YOUR FIREBASE CONFIG HERE ──────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBzfmFdgO_IxZSlcTS7i8U0cktwwkQAUwM",
  authDomain:        "cyprusguard-902a2.firebaseapp.com",
  databaseURL:       "https://cyprusguard-902a2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "cyprusguard-902a2",
  storageBucket:     "cyprusguard-902a2.appspot.com",
  messagingSenderId: "705984427821",
  appId:             "1:705984427821:web:db66a32626d25e6abb45a4"
};

// ── 2. SDK IMPORTS (loaded via CDN in HTML) ──────────────────
//  index.html already imports the compat SDKs, so we just
//  initialise here if not already done.
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db   = firebase.database();
const auth = firebase.auth();
// Storage requires Blaze plan. App works without it — photos stored as base64 in DB.
const storage = (typeof firebase.storage === 'function') ? firebase.storage() : null;

// ── 3. COLLECTIONS HELPER ───────────────────────────────────
const DB = {
  // refs
  ref: (path) => db.ref(path),

  // properties
  properties:   () => db.ref('properties'),
  property:     (id) => db.ref(`properties/${id}`),

  // visits
  visits:       () => db.ref('visits'),
  visit:        (id) => db.ref(`visits/${id}`),

  // reports
  reports:      () => db.ref('reports'),
  report:       (id) => db.ref(`reports/${id}`),

  // clients
  clients:      () => db.ref('clients'),
  client:       (id) => db.ref(`clients/${id}`),

  // requests (from client portal)
  requests:     () => db.ref('requests'),
  request:      (id) => db.ref(`requests/${id}`),

  // notifications
  notifications: () => db.ref('notifications'),

  // settings
  settings:     () => db.ref('settings'),

  // ── helpers ──────────────────────────────────────────────
  push: (path, data) => {
    const ref = db.ref(path).push();
    const id  = ref.key;
    return ref.set({ ...data, id, createdAt: Date.now() }).then(() => id);
  },

  set: (path, data) => db.ref(path).set({ ...data, updatedAt: Date.now() }),

  update: (path, data) => db.ref(path).update({ ...data, updatedAt: Date.now() }),

  remove: (path) => db.ref(path).remove(),

  once: (path) => db.ref(path).once('value').then(s => s.val()),

  on: (path, cb) => {
    const ref = db.ref(path);
    ref.on('value', snap => cb(snap.val()));
    return () => ref.off();   // returns unsubscribe fn
  },

  onList: (path, cb) => {
    const ref = db.ref(path);
    ref.on('value', snap => {
      const raw = snap.val();
      cb(raw ? Object.values(raw) : []);
    });
    return () => ref.off();
  }
};

// ── 4. AUTH HELPERS ─────────────────────────────────────────
const Auth = {
  // Admin login with email/password (set up in Firebase Console)
  loginAdmin: (email, password) =>
    auth.signInWithEmailAndPassword(email, password),

  logout: () => auth.signOut(),

  // Client access via unique token stored in DB
  // token = client.accessToken (UUID generated when client created)
  verifyClientToken: async (token) => {
    const snap = await db.ref('clients')
      .orderByChild('accessToken')
      .equalTo(token)
      .once('value');
    const val = snap.val();
    if (!val) return null;
    const client = Object.values(val)[0];
    return client;
  },

  onAuthChange: (cb) => auth.onAuthStateChanged(cb),

  currentUser: () => auth.currentUser,

  isLoggedIn: () => !!auth.currentUser
};

// ── 5. STORAGE HELPERS ──────────────────────────────────────
// Note: Firebase Storage requires Blaze plan.
// On Spark plan, photos are compressed and stored as base64 in Realtime DB.
// These helpers are no-ops unless storage is available.
const Storage = {
  uploadFile: async (path, file, onProgress) => {
    if (!storage) { console.warn('Storage unavailable (Spark plan)'); return null; }
    const ref = storage.ref(path);
    const task = ref.put(file);
    if (onProgress) {
      task.on('state_changed', snap => {
        onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100));
      });
    }
    await task;
    return ref.getDownloadURL();
  },

  uploadBase64: async (path, dataUrl, mime = 'image/jpeg') => {
    if (!storage) { console.warn('Storage unavailable (Spark plan)'); return dataUrl; }
    const ref = storage.ref(path);
    await ref.putString(dataUrl, 'data_url', { contentType: mime });
    return ref.getDownloadURL();
  },

  deleteFile: (path) => storage ? storage.ref(path).delete().catch(() => {}) : Promise.resolve(),
  getUrl: (path) => storage ? storage.ref(path).getDownloadURL() : Promise.resolve(null)
};

// ── 6. SEED DEMO DATA (run once) ────────────────────────────
// Call seedDemoData() from browser console on first run.
async function seedDemoData() {
  const demo = {
    clients: {
      c1: { id:'c1', name:'Иванов И.И.', country:'🇷🇺 Россия', phone:'+7 916 123 4567', tg:'@ivanov_cyprus', tgChatId:'', accessToken:'demo-token-c1', color:'#4fc3a1', monthly:100, createdAt: Date.now() },
      c2: { id:'c2', name:'Hans Müller', country:'🇩🇪 Германия', phone:'+49 89 1234567', tg:'@hmuller', tgChatId:'', accessToken:'demo-token-c2', color:'#f0a500', monthly:75, createdAt: Date.now() },
      c3: { id:'c3', name:'Anna Schmidt', country:'🇦🇹 Австрия', phone:'+43 1 2345678', tg:'@anna_schmidt_at', tgChatId:'', accessToken:'demo-token-c3', color:'#9b8db0', monthly:50, createdAt: Date.now() },
    },
    properties: {
      p1: { id:'p1', address:'Germasogeia, Limassol', type:'villa', icon:'🏖️', clientId:'c1', tariff:'Premium', price:100, status:'ok', notes:'Бассейн, пальмы', nextVisit:'2026-05-16', createdAt: Date.now() },
      p2: { id:'p2', address:'Coral Bay, Paphos', type:'villa', icon:'🌴', clientId:'c2', tariff:'Standard', price:75, status:'warning', notes:'Проверить крышу', nextVisit:'2026-05-15', createdAt: Date.now() },
      p3: { id:'p3', address:'Old Town, Nicosia', type:'apt', icon:'🏛️', clientId:'c3', tariff:'Basic', price:50, status:'ok', notes:'2-й этаж', nextVisit:'2026-05-19', createdAt: Date.now() },
    },
    settings: {
      agency: { name: 'CyprusGuard Agency', phone: '+357 99 123 456', city: 'Limassol' },
      telegram: { token: '', botActive: false },
      tariffs: {
        basic:    { name:'Basic',    price:50,  visits:2, features:['Проветривание','Фото-отчёт','Telegram'] },
        standard: { name:'Standard', price:75,  visits:4, features:['Проветривание','Фото+Видео','Полив','Счета'] },
        premium:  { name:'Premium',  price:100, visits:8, features:['Еженедельно','Видео-тур','Срочный выезд','Ремонт'] }
      }
    }
  };

  for (const [key, val] of Object.entries(demo)) {
    await db.ref(key).set(val);
  }
  console.log('✅ Demo data seeded!');
}

// expose globally
window.DB = DB;
window.Auth = Auth;
window.Storage = Storage;
window.seedDemoData = seedDemoData;
