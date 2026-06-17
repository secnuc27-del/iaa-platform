// =============================================
// SUPABASE CONFIG
// =============================================
// IMPORTANTE: Substitua pelos seus valores reais do projeto Supabase
// A URL e a chave abaixo devem ser do seu projeto em https://supabase.com/dashboard
const SUPABASE_URL = 'https://ykmyoaaojauetfgrmauq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbXlvYWFvamF1ZXRmZ3JtYXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NTE5OTgsImV4cCI6MjA5MTQyNzk5OH0.1hGCoaow-CTC-U2p4Z8qSZuzKSwE5CEKZROwc3AmCv0';

const { createClient } = supabase;

// =============================================
// TIMEOUT HELPER — C1
// Envolve qualquer Promise com um timeout configurável.
// Se o Supabase demorar mais que `ms` ms, a Promise rejeita com Error('timeout').
// =============================================
function withTimeout(promise, ms) {
  ms = ms || 6000;
  const timeoutPromise = new Promise(function (_, reject) {
    setTimeout(function () { reject(new Error('timeout')); }, ms);
  });
  return Promise.race([promise, timeoutPromise]);
}

// =============================================
// THEME TOGGLE
// =============================================
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');

  // Trigger ripple/flash animation on the whole page
  const ripple = document.createElement('div');
  ripple.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 9999;
    background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
    animation: themeFlash 0.4s ease-out forwards;
  `;
  if (!document.querySelector('#theme-flash-style')) {
    const s = document.createElement('style');
    s.id = 'theme-flash-style';
    s.textContent = `
      @keyframes themeFlash {
        0%   { opacity: 1; }
        100% { opacity: 0; }
      }
      /* letter color wave on theme change */
      .theme-wave { animation: textWave 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
      @keyframes textWave {
        0%   { opacity: 0.3; transform: translateY(4px); }
        100% { opacity: 1;   transform: translateY(0); }
      }
    `;
    document.head.appendChild(s);
  }
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 450);

  // Toggle dark class
  html.classList.toggle('dark');

  // Animate visible text elements with a staggered wave
  const textEls = document.querySelectorAll(
    'h1, h2, h3, h4, p, .nav-logo, .logo-text, .btn, .stat-val, .stat-lbl, .hero-badge, .gradient-text'
  );
  textEls.forEach((el, i) => {
    el.classList.remove('theme-wave');
    setTimeout(() => {
      el.classList.add('theme-wave');
      setTimeout(() => el.classList.remove('theme-wave'), 600);
    }, i * 18);
  });

  // Persist preference
  try {
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
  } catch (_) {}
}

// Restore saved theme on load
(function () {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    else if (saved === 'light') document.documentElement.classList.remove('dark');
  } catch (_) {}
})();


// =============================================
// SCROLL REEL TESTIMONIALS
// =============================================
(function initScrollReel() {
  const CELL = 106, GAP = 8, STEP = 3 * (CELL + GAP);
  const EXIT_MS = 220, SLIDE_MS = 800;
  const EASE = 'cubic-bezier(0.65,0,0.35,1)';
  const STAGGER_MS = 7;

  const testimonials = [
    {
      quote: 'Finalmente uma plataforma que conecta a gente aqui no Alto Acre. Encontrei um eletricista em minutos!',
      author: 'Maria S. — Brasiléia, AC',
      image: 'https://api.dicebear.com/8.x/notionists/svg?seed=maria&backgroundColor=b6e3f4'
    },
    {
      quote: 'Divulguei meu salão aqui e minha agenda encheu em uma semana. Recomendo muito!',
      author: 'Carla R. — Epitaciolândia, AC',
      image: 'https://api.dicebear.com/8.x/notionists/svg?seed=carla&backgroundColor=d1d4f9'
    },
    {
      quote: 'Achei uma vaga de emprego em 2 dias. A plataforma é incrível para quem está procurando trabalho.',
      author: 'João M. — Brasiléia, AC',
      image: 'https://api.dicebear.com/8.x/notionists/svg?seed=joao&backgroundColor=c0aede'
    },
    {
      quote: 'Vendi meu notebook usado em menos de 24 horas pelo classificados. Muito prático!',
      author: 'Ana P. — Epitaciolândia, AC',
      image: 'https://api.dicebear.com/8.x/notionists/svg?seed=ana&backgroundColor=ffdfbf'
    }
  ];

  const count = testimonials.length;
  let index = 0;
  let animating = false;
  let mounted = false;

  function makeCell() {
    const d = document.createElement('div');
    d.className = 'reel-cell';
    return d;
  }

  function makeFeatured(t) {
    const wrap = document.createElement('div');
    wrap.className = 'reel-featured';
    const img = document.createElement('img');
    img.src = t.image;
    img.alt = t.author;
    img.loading = 'lazy';
    const desat = document.createElement('div');
    desat.className = 'reel-featured-desat';
    const sheen = document.createElement('div');
    sheen.className = 'reel-featured-sheen';
    wrap.appendChild(img);
    wrap.appendChild(desat);
    wrap.appendChild(sheen);
    return wrap;
  }

  function buildColumns() {
    const colMid = document.getElementById('reel-col-mid');
    const colLeft = document.getElementById('reel-col-left');
    const colRight = document.getElementById('reel-col-right');
    if (!colMid) return;

    // Wrap columns in positioning div
    const colsWrap = document.createElement('div');
    colsWrap.className = 'scroll-reel-col-wrap';
    const colsContainer = colMid.parentElement;
    colsContainer.appendChild(colsWrap);
    colsWrap.appendChild(colLeft);
    colsWrap.appendChild(colMid);
    colsWrap.appendChild(colRight);

    // Middle column: 3 cells, then featured+2cells per testimonial, 3 trailing cells
    for (let i = 0; i < 3; i++) colMid.appendChild(makeCell());
    testimonials.forEach((t, i) => {
      colMid.appendChild(makeFeatured(t));
      if (i < count - 1) {
        colMid.appendChild(makeCell());
        colMid.appendChild(makeCell());
      }
    });
    for (let i = 0; i < 3; i++) colMid.appendChild(makeCell());

    // Side columns
    const sideCount = 4 + 2 * count;
    for (let i = 0; i < sideCount; i++) {
      colLeft.appendChild(makeCell());
      colRight.appendChild(makeCell());
    }

    // Enable transitions after first paint
    requestAnimationFrame(() => requestAnimationFrame(() => {
      mounted = true;
      updateColumns(false);
    }));
  }

  function updateColumns(animate) {
    const colMid = document.getElementById('reel-col-mid');
    const colLeft = document.getElementById('reel-col-left');
    const colRight = document.getElementById('reel-col-right');
    if (!colMid) return;

    const centerIdx = (count - 1) / 2;
    const midY = (centerIdx - index) * STEP;
    const sideY = -midY;
    const tr = animate ? `transform ${SLIDE_MS}ms ${EASE}` : 'none';

    [colMid, colLeft, colRight].forEach(c => c.style.transition = tr);
    colMid.style.transform = `translateY(${midY}px)`;
    colLeft.style.transform = `translateY(${sideY}px)`;
    colRight.style.transform = `translateY(${sideY}px)`;
  }

  function charRise(text, startDelay) {
    const words = text.split(' ');
    const frag = document.createDocumentFragment();
    let charIdx = 0;
    words.forEach((word, wi) => {
      const wordSpan = document.createElement('span');
      wordSpan.style.cssText = 'display:inline-block;white-space:nowrap';
      Array.from(word).forEach(ch => {
        const span = document.createElement('span');
        span.className = 'reel-char';
        span.style.animationDelay = `${startDelay + charIdx * STAGGER_MS}ms`;
        span.textContent = ch;
        wordSpan.appendChild(span);
        charIdx++;
      });
      frag.appendChild(wordSpan);
      if (wi < words.length - 1) {
        frag.appendChild(document.createTextNode(' '));
        charIdx++;
      }
    });
    return frag;
  }

  function renderText(t) {
    const inner = document.getElementById('reel-text');
    if (!inner) return;

    const q = document.createElement('p');
    q.className = 'reel-quote';
    q.appendChild(charRise(t.quote, 0));

    const a = document.createElement('p');
    a.className = 'reel-author';
    a.appendChild(charRise(t.author, t.quote.length * STAGGER_MS + 50));

    inner.innerHTML = '';
    inner.appendChild(q);
    inner.appendChild(a);
  }

  function paginate(dir) {
    if (animating) return;
    const next = index + dir;
    if (next < 0 || next >= count) return;
    animating = true;

    // Exit current text
    const inner = document.getElementById('reel-text');
    if (inner) {
      inner.classList.add('reel-text-exiting');
    }
    // Update buttons immediately
    updateButtons(next);

    setTimeout(() => {
      index = next;
      if (inner) {
        inner.classList.remove('reel-text-exiting');
      }
      renderText(testimonials[index]);
      updateColumns(true);
    }, EXIT_MS);

    setTimeout(() => { animating = false; }, SLIDE_MS);
  }

  function updateButtons(nextIndex) {
    const prev = document.getElementById('reel-prev');
    const next = document.getElementById('reel-next');
    const i = nextIndex !== undefined ? nextIndex : index;
    if (prev) prev.disabled = (i === 0);
    if (next) next.disabled = (i === count - 1);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const reel = document.getElementById('scroll-reel');
    if (!reel) return;

    buildColumns();
    renderText(testimonials[0]);
    updateButtons();

    document.getElementById('reel-prev')?.addEventListener('click', () => paginate(-1));
    document.getElementById('reel-next')?.addEventListener('click', () => paginate(1));

    reel.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); paginate(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); paginate(-1); }
    });
  });
})();

// Validate config
const supabaseConfigured =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  SUPABASE_URL.startsWith('https://') &&
  SUPABASE_ANON_KEY.length > 30;

let db = null;
let useLocalMode = false;

try {
  if (supabaseConfigured) {
    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'implicit',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'iaa-supabase-auth'
      }
    });
  }
} catch (err) {
  console.error('Erro ao criar cliente Supabase:', err);
}

console.log('supabaseConfigured:', supabaseConfigured, 'db:', !!db);

// =============================================
// LOCAL MODE — fallback quando Supabase não funciona
// =============================================
let idbDatabase = null;
const objectUrlCache = new Map();

function initIndexedDB() {
  return new Promise((resolve, reject) => {
    if (idbDatabase) return resolve(idbDatabase);
    const request = indexedDB.open('iaa_offline_db', 2);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('videos')) {
        db.createObjectStore('videos', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      idbDatabase = e.target.result;
      resolve(idbDatabase);
    };
    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

const localDB = {
  getUsers() {
    try { return JSON.parse(localStorage.getItem('iaa-users') || '[]'); }
    catch { return []; }
  },
  saveUsers(users) {
    localStorage.setItem('iaa-users', JSON.stringify(users));
  },
  getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('iaa-current-user')); }
    catch { return null; }
  },
  setCurrentUser(user) {
    if (user) localStorage.setItem('iaa-current-user', JSON.stringify(user));
    else localStorage.removeItem('iaa-current-user');
  },
  getProfile(userId) {
    try {
      const profiles = JSON.parse(localStorage.getItem('iaa-profiles') || '[]');
      return profiles.find(p => p.id === userId) || null;
    } catch { return null; }
  },
  saveProfile(profile) {
    try {
      let profiles = JSON.parse(localStorage.getItem('iaa-profiles') || '[]');
      const idx = profiles.findIndex(p => p.id === profile.id);
      if (idx >= 0) profiles[idx] = { ...profiles[idx], ...profile };
      else profiles.push(profile);
      localStorage.setItem('iaa-profiles', JSON.stringify(profiles));
    } catch { }
  },
  getPublications() {
    try { return JSON.parse(localStorage.getItem('iaa-publications') || '[]'); }
    catch { return []; }
  },
  savePublication(pub) {
    try {
      const pubs = this.getPublications();
      pubs.unshift(pub);
      localStorage.setItem('iaa-publications', JSON.stringify(pubs));
    } catch { }
  },
  deletePublication(id) {
    try {
      let pubs = this.getPublications();
      pubs = pubs.filter(p => p.id !== id);
      localStorage.setItem('iaa-publications', JSON.stringify(pubs));
    } catch { }
  },
  getJobs() {
    try { return JSON.parse(localStorage.getItem('iaa-jobs') || '[]'); }
    catch { return []; }
  },
  saveJob(job) {
    try {
      const jobs = this.getJobs();
      jobs.unshift(job);
      localStorage.setItem('iaa-jobs', JSON.stringify(jobs));
    } catch { }
  },
  getClassifieds() {
    try { return JSON.parse(localStorage.getItem('iaa-classifieds') || '[]'); }
    catch { return []; }
  },
  saveClassified(cl) {
    try {
      const cls = this.getClassifieds();
      cls.unshift(cl);
      localStorage.setItem('iaa-classifieds', JSON.stringify(cls));
    } catch { }
  },
  getAllProfiles() {
    try { return JSON.parse(localStorage.getItem('iaa-profiles') || '[]'); }
    catch { return []; }
  },
  async getVideos() {
    try {
      const db = await initIndexedDB();
      return new Promise((resolve) => {
        const tx = db.transaction('videos', 'readonly');
        const store = tx.objectStore('videos');
        const req = store.getAll();
        req.onsuccess = () => {
          const videos = req.result || [];
          videos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          videos.forEach(v => {
            if (v.video_file instanceof Blob) {
              const cacheKey = 'vid_' + v.id;
              if (objectUrlCache.has(cacheKey)) {
                v.video_url = objectUrlCache.get(cacheKey);
              } else {
                const url = URL.createObjectURL(v.video_file);
                objectUrlCache.set(cacheKey, url);
                v.video_url = url;
              }
            }
          });
          resolve(videos);
        };
        req.onerror = () => resolve([]);
      });
    } catch (err) {
      console.error(err);
      return [];
    }
  },
  async saveVideo(v) {
    try {
      const db = await initIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readwrite');
        const store = tx.objectStore('videos');
        store.put(v);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error(err);
    }
  },
  async getPhotos() {
    try {
      const db = await initIndexedDB();
      return new Promise((resolve) => {
        const tx = db.transaction('photos', 'readonly');
        const store = tx.objectStore('photos');
        const req = store.getAll();
        req.onsuccess = () => {
          const photos = req.result || [];
          photos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          photos.forEach(p => {
            if (p.photo_file instanceof Blob) {
              const cacheKey = 'ph_' + p.id;
              if (objectUrlCache.has(cacheKey)) {
                p.photo_url = objectUrlCache.get(cacheKey);
              } else {
                const url = URL.createObjectURL(p.photo_file);
                objectUrlCache.set(cacheKey, url);
                p.photo_url = url;
              }
            }
          });
          resolve(photos);
        };
        req.onerror = () => resolve([]);
      });
    } catch (err) {
      console.error(err);
      return [];
    }
  },
  async savePhoto(p) {
    try {
      const db = await initIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        store.put(p);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error(err);
    }
  }
};

// =============================================
// STATE
// =============================================
const state = {
  user: null,        // Supabase auth user
  profile: null,     // Row from profiles table
  theme: localStorage.getItem('iaa-theme') || 'light',
  liked: new Set(),
  notifications: [],
  notifToggles: { email: true, push: true, marketing: false },
  privacy: { public: true, phone: true, city: true },
  dbReady: false,    // true após configurar Supabase
};
if (state.theme === 'dark') {
  document.documentElement.classList.add('dark');
}

function syncThemeUI() {
  document.querySelectorAll('.topbar-right .icon-btn, .topbar-right button[onclick="toggleTheme()"]').forEach(btn => {
    btn.innerHTML = state.theme === 'dark' ? '☀️' : '🌙';
  });
}
window.addEventListener('DOMContentLoaded', syncThemeUI);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  syncThemeUI();
}

// =============================================
// MODAL HELPERS (Sobre, Privacidade, Termos)
// =============================================
function openInfoModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeInfoModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Close modals with ESC key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.info-modal').forEach(m => {
      if (m.style.display !== 'none') closeInfoModal(m.id);
    });
  }
});

// =============================================
// SUPABASE AUTH LISTENERS + LOCAL FALLBACK
// =============================================

// Try to detect if Supabase is actually reachable
async function testSupabaseConnection() {
  if (!db) return false;
  try {
    // Tenta uma query extremamente leve na tabela profiles usando o cliente do Supabase
    // Isso evita problemas de CORS preflight com HEAD fetch manual em navegadores de celular
    const { error } = await withTimeout(
      db.from('profiles').select('id').limit(1),
      8000
    );
    if (error) {
      const msg = error.message || '';
      // Se for erro físico de rede ou falha de conexão com a API
      if (msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
        return false;
      }
    }
    return true;
  } catch (err) {
    console.warn('Supabase não acessível, usando modo local:', err.message || err);
    return false;
  }
}

// Detect if current URL has OAuth callback tokens (from Google redirect)
function isOAuthCallback() {
  const hash = window.location.hash;
  const search = window.location.search;
  return hash.includes('access_token') ||
    hash.includes('refresh_token') ||
    search.includes('code=') ||
    search.includes('error=') ||
    hash.includes('error_description');
}

// Check if the hash contains an OAuth error
function getOAuthError() {
  // Check query params first (PKCE flow errors)
  const searchParams = new URLSearchParams(window.location.search);
  const searchErr = searchParams.get('error_description') || searchParams.get('error');
  if (searchErr) return searchErr;

  // Then check hash (implicit flow errors)
  const hash = window.location.hash.substring(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const errDesc = params.get('error_description');
  const err = params.get('error');
  if (errDesc || err) return errDesc || err;
  return null;
}

// Extract tokens from URL hash (fallback for clock skew issues)
function extractTokensFromHash() {
  const hash = window.location.hash.substring(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token) return null;

  return { access_token, refresh_token };
}

// Manually set session from URL tokens (workaround for clock skew)
async function tryManualSessionFromUrl() {
  if (!db) return false;

  const tokens = extractTokensFromHash();
  if (!tokens) return false;

  console.log('Tentando setSession manual com tokens da URL...');

  try {
    const { data, error } = await db.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });

    if (!error && data?.session) {
      console.log('setSession manual funcionou!');
      history.replaceState(null, '', window.location.pathname);
      return true;
    }

    console.warn('setSession falhou:', error?.message);

    // Try refresh if setSession fails (clock skew)
    if (tokens.refresh_token) {
      console.log('Tentando refreshSession...');
      const { data: refreshData, error: refreshError } = await db.auth.refreshSession({
        refresh_token: tokens.refresh_token
      });
      if (!refreshError && refreshData?.session) {
        console.log('refreshSession funcionou!');
        history.replaceState(null, '', window.location.pathname);
        return true;
      }
      console.warn('refreshSession falhou:', refreshError?.message);
    }

    return false;
  } catch (err) {
    console.error('Erro no setSession manual:', err);
    return false;
  }
}

// Flag to track if navigation was already handled
let _authNavigationDone = false;

async function handleAuthSuccess(user) {
  hideAppLoading();
  if (state.user && state.user.id === user.id && _authNavigationDone) return; // Já tratado para este usuário
  _authNavigationDone = true;
  state.user = user;

  // Also save to local for offline fallback
  localDB.setCurrentUser({ id: user.id, email: user.email, user_metadata: user.user_metadata });

  updateAvatarUI();

  if (!state.profile || !state.profile.profile_type) {
    // Sem perfil definido
    if (_pendingPublish) {
      showPage('profile-selection'); // Forçar escolha provider/business
    } else {
      showPublicArea(); // Deixar explorar livremente
      showToast('Bem-vindo ao IAA! 👋');
    }
  } else {
    const type = state.profile.profile_type;
    if (_pendingPublish && (type === 'provider' || type === 'business')) {
      _pendingPublish = false;
      enterPanel(type, 'publications');
    } else if (_pendingPublish && type === 'user') {
      // Tem conta de usuário mas quer publicar → escolher tipo
      _pendingPublish = false;
      showPage('profile-selection');
    } else {
      enterPanel(type);
      showToast('Bem-vindo de volta! 👋');
    }
  }

  // Clean URL hash if present
  if (window.location.hash.includes('access_token')) {
    history.replaceState(null, '', window.location.pathname);
  }

  hideAppLoading();
}

// Helper: decode base64url (JWT uses URL-safe base64)
function b64urlDecode(str) {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return atob(b64);
}

// JWT fallback: decode token and log user in directly
async function jwtFallbackLogin() {
  const tokens = extractTokensFromHash();
  if (!tokens || !tokens.access_token) return false;

  try {
    const parts = tokens.access_token.split('.');
    const payload = JSON.parse(b64urlDecode(parts[1]));
    console.log('JWT fallback — sub:', payload.sub, 'email:', payload.email);

    if (payload.sub) {
      const userEmail = payload.email || '';
      const userName = payload.user_metadata?.full_name || payload.user_metadata?.name || userEmail.split('@')[0];

      const userData = {
        id: payload.sub,
        email: userEmail,
        user_metadata: { full_name: userName, ...(payload.user_metadata || {}) }
      };

      localDB.setCurrentUser(userData);
      history.replaceState(null, '', window.location.pathname);
      await loadProfile(payload.sub);
      await handleAuthSuccess(userData);

      // Background: try to establish real session
      if (tokens.refresh_token) {
        setTimeout(async () => {
          try {
            await db.auth.refreshSession({ refresh_token: tokens.refresh_token });
          } catch (e) { /* silent */ }
        }, 3000);
      }
      return true;
    }
  } catch (e) {
    console.error('JWT fallback falhou:', e);
  }
  return false;
}

// Initialize authentication
(async function initAuth() {
  const isCallback = isOAuthCallback();
  console.log('initAuth: isOAuthCallback =', isCallback);

  // Check for OAuth errors first
  if (isCallback) {
    const oauthError = getOAuthError();
    if (oauthError) {
      console.error('OAuth retornou erro:', oauthError);
      history.replaceState(null, '', window.location.pathname);
      _authNavigationDone = true;
      showPage('login');
      hideAppLoading();
      showToast('Erro no login: ' + decodeURIComponent(oauthError));
      return;
    }
    showAppLoading('Finalizando login com Google...');

    // Set a timeout — if SDK doesn't resolve in 6s, use JWT fallback
    setTimeout(async () => {
      if (!state.user) {
        console.warn('OAuth timeout — usando JWT fallback...');
        const ok = await jwtFallbackLogin();
        if (!ok) {
          history.replaceState(null, '', window.location.pathname);
          _authNavigationDone = true;
          showPage('login');
          hideAppLoading();
          showToast('Erro no login com Google. Tente novamente.');
        }
      }
    }, 6000);
  }

  // Fallback only when Supabase client não existe mesmo
  function fallbackToLocalAuth() {
    useLocalMode = true;
    _authNavigationDone = true;
    console.log('Usando modo local (localStorage)');
    const savedUser = localDB.getCurrentUser();
    if (savedUser) {
      state.user = savedUser;
      const profile = localDB.getProfile(savedUser.id);
      if (profile) {
        state.profile = profile;
        state.dbReady = true;
      }
      updateAvatarUI();
      if (state.profile && state.profile.profile_type) {
        enterPanel(state.profile.profile_type);
      } else {
        showPublicArea(); // Sem perfil → explorar livremente
      }
    } else {
      showPage('landing');
    }
    hideAppLoading();
  }

  if (!db) {
    fallbackToLocalAuth();
    return;
  }

  useLocalMode = false;

  // C8 — Testar conexão proativamente antes de registrar listeners
  // Se o Supabase não estiver acessível, ativar modo offline imediatamente
  testSupabaseConnection().then(function (reachable) {
    if (!reachable) {
      console.warn('C8: Supabase inacessível — ativando modo local automaticamente');
      useLocalMode = true;
      showToast('📡 Modo offline ativo — dados locais');
    }
  });

  // Auth state change listener — detecta sessão existente (INITIAL_SESSION),
  // novos logins (SIGNED_IN) e renovação de token (TOKEN_REFRESHED)
  db.auth.onAuthStateChange(async (event, session) => {
    console.log('onAuthStateChange:', event, !!session);
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      // Se doLogin já tratou a navegação, não duplicar
      if (_authNavigationDone) return;
      if (session && session.user) {
        await loadProfile(session.user.id);
        await handleAuthSuccess(session.user);
      }
    } else if (event === 'INITIAL_SESSION') {
      if (session && session.user && !_authNavigationDone) {
        await loadProfile(session.user.id);
        await handleAuthSuccess(session.user);
      } else if (!session && !_authNavigationDone && !isCallback) {
        // Nenhuma sessão ativa no Supabase — tentar recuperar usuário local APENAS se estivermos de fato offline
        const savedUser = localDB.getCurrentUser();
        if (useLocalMode && savedUser) {
          console.log('initAuth: Nenhuma sessão Supabase e offline, usando usuário local salvo.');
          state.user = savedUser;
          await loadProfile(savedUser.id);
          await handleAuthSuccess(savedUser);
        } else {
          // Se estamos online e não há sessão ativa, o usuário está deslogado
          localDB.setCurrentUser(null);
          _authNavigationDone = true;
          showPage('landing');
          hideAppLoading();
        }
      }
    } else if (event === 'SIGNED_OUT') {
      state.user = null;
      state.profile = null;
      localDB.setCurrentUser(null);
      _authNavigationDone = false;
      showPage('landing');
      hideAppLoading();
    }
  });

  // Fallback: se o onAuthStateChange não resolver em 4s, tenta getSession direto
  setTimeout(async () => {
    if (_authNavigationDone || isCallback) return;
    console.log('onAuthStateChange demorou — chamando getSession direto...');
    try {
      // C7 — getSession com timeout de 5s para não travar
      const { data } = await withTimeout(db.auth.getSession(), 5000);
      if (_authNavigationDone) return;
      if (data?.session?.user) {
        await loadProfile(data.session.user.id);
        await handleAuthSuccess(data.session.user);
      } else {
        const savedUser = localDB.getCurrentUser();
        if (useLocalMode && savedUser) {
          console.log('getSession fallback: Nenhuma sessão Supabase e offline, usando usuário local salvo.');
          state.user = savedUser;
          await loadProfile(savedUser.id);
          await handleAuthSuccess(savedUser);
        } else {
          localDB.setCurrentUser(null);
          _authNavigationDone = true;
          showPage('landing');
          hideAppLoading();
        }
      }
    } catch (err) {
      console.error('getSession fallback erro:', err.message || err);
      if (!_authNavigationDone) {
        const savedUser = localDB.getCurrentUser();
        if (savedUser) {
          console.log('getSession fallback erro: Usando usuário local salvo.');
          useLocalMode = true;
          state.user = savedUser;
          await loadProfile(savedUser.id);
          await handleAuthSuccess(savedUser);
        } else {
          _authNavigationDone = true;
          showPage('landing');
          hideAppLoading();
          // Se foi timeout (não só sessão ausente), avisar usuario
          if (err.message === 'timeout') {
            showToast('Servidor demorou. Verifique sua conexão.');
          }
        }
      }
    }
  }, 4000);
})();

async function loadProfile(userId) {
  if (useLocalMode) {
    const profile = localDB.getProfile(userId);
    state.profile = profile;
    state.dbReady = true;
    return;
  }
  if (!db) return;

  // Carregar do cache local primeiro para resposta rápida (offline fallback)
  const localProf = localDB.getProfile(userId);
  if (localProf) {
    state.profile = localProf;
    state.dbReady = true;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 segundos limite

    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .abortSignal(controller.signal)
      .single();

    clearTimeout(timeoutId);
    console.log('loadProfile result:', { data, error });

    if (data) {
      state.profile = data;
      state.dbReady = true;
      localDB.saveProfile(data); // Atualiza cache
    } else if (!localProf) {
      state.profile = null;
      state.dbReady = true;
    }
  } catch (err) {
    console.error('loadProfile error:', err);
    if (!state.profile) {
      state.profile = null;
    }
    state.dbReady = true;
  }
}

let _loadingTimer;
let _loadingSafetyTimer; // C2 — safety timer de 10s

function showAppLoading(text) {
  const loader = document.getElementById('app-loading');
  if (!loader) return;
  if (text) {
    const textEl = loader.querySelector('.loading-text');
    if (textEl) textEl.textContent = text;
  }
  clearTimeout(_loadingTimer);
  loader.style.display = 'flex';
  void loader.offsetWidth;
  loader.classList.remove('hidden');

  // C2 — Safety timer: se o loader ainda estiver visível após 10s, forçar ocultação
  clearTimeout(_loadingSafetyTimer);
  _loadingSafetyTimer = setTimeout(function () {
    const l = document.getElementById('app-loading');
    if (l && !l.classList.contains('hidden')) {
      console.warn('showAppLoading safety timer disparado — forçando hide');
      hideAppLoading();
      showToast('Tempo esgotado. Verifique sua conexão.');
    }
  }, 10000);
}

function hideAppLoading() {
  clearTimeout(_loadingSafetyTimer); // C2 — cancelar safety timer ao esconder
  const loader = document.getElementById('app-loading');
  if (!loader) return;
  loader.classList.add('hidden');
  _loadingTimer = setTimeout(function () {
    loader.style.display = 'none';
    const textEl = loader.querySelector('.loading-text');
    if (textEl) textEl.textContent = 'Carregando IAA...';
  }, 500);
}

// Fail-safe: Forçar ocultação da tela de carregamento após 8 segundos
window.addEventListener('load', function () {
  setTimeout(hideAppLoading, 8000);
});

// =============================================
// PAGE NAVIGATION — Cinematic Curtain Wipe
// =============================================
let _isTransitioning = false;
let _lastActivePage = 'landing';

function showErrorPage(type) {
  // Guard reference to the previous page so we can recover from it
  const current = Array.from(document.querySelectorAll('.page')).find(p => p.classList.contains('active'));
  if (current && current.id !== 'error-page') {
    _lastActivePage = current.id;
  }

  const titleEl = document.getElementById('error-code-title');
  const headingEl = document.getElementById('error-title');
  const descEl = document.getElementById('error-desc');
  const actionsEl = document.getElementById('error-actions');

  if (!titleEl || !headingEl || !descEl || !actionsEl) return;

  if (type === 'offline') {
    titleEl.textContent = 'OFFLINE';
    headingEl.textContent = 'Sem conexão com a rede';
    descEl.textContent = 'Não conseguimos conectar ao servidor. Verifique sua conexão de internet para acessar todos os recursos.';
    actionsEl.innerHTML = `
      <button class="btn btn-primary" onclick="retryConnection()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        Tentar novamente
      </button>
      <button class="btn btn-outline" onclick="accessOfflineMode()">
        📁 Usar modo offline
      </button>
    `;
  } else {
    // 404/Not Found
    titleEl.textContent = '404';
    headingEl.textContent = 'Parece que você está perdido';
    descEl.textContent = 'A página que você está procurando não está disponível ou não existe.';
    actionsEl.innerHTML = `
      <button class="btn btn-primary" onclick="goBackToLanding()">
        🏠 Ir para o Início
      </button>
    `;
  }

  _animatePage('error-page', 'forward');
}

async function retryConnection() {
  showAppLoading('Testando conexão...');
  const online = await testSupabaseConnection();
  hideAppLoading();

  if (online) {
    useLocalMode = false;
    showToast('📡 Conexão restabelecida!');
    _animatePage(_lastActivePage || 'landing', 'back');
  } else {
    showToast('❌ Ainda sem conexão. Tente novamente em instantes.');
    const container = document.querySelector('.error-container');
    if (container) {
      container.classList.add('error-shake');
      setTimeout(() => container.classList.remove('error-shake'), 500);
    }
  }
}

function accessOfflineMode() {
  useLocalMode = true;
  showToast('📡 Modo local ativo — carregando dados salvos...');
  _animatePage('explore', 'forward');
}

// Global browser offline detection
window.addEventListener('offline', () => {
  showToast('📡 Você está offline!');
  showErrorPage('offline');
});

window.addEventListener('online', () => {
  showToast('⚡ Conexão restabelecida!');
  retryConnection();
});

function _animatePage(id, direction) {
  if (_isTransitioning) return;
  const next = document.getElementById(id);
  if (!next) {
    console.error(`Page not found: ${id}`);
    showErrorPage('404');
    return;
  }
  const current = Array.from(document.querySelectorAll('.page')).find(p => p.classList.contains('active'));
  if (current && current.id === id) return;

  _isTransitioning = true;

  // Safety reset — if animation gets stuck, unlock after 1.5s
  const _transitionSafetyTimer = setTimeout(() => {
    _isTransitioning = false;
  }, 1500);

  const curtain = document.getElementById('page-curtain');
  const fromLeft = (direction !== 'back');

  // ── Phase 1: Curtain sweeps IN (left→right or right→left) ──
  curtain.style.transition = 'none';
  curtain.style.transformOrigin = fromLeft ? 'left center' : 'right center';
  curtain.style.transform = 'scaleX(0)';
  void curtain.offsetWidth; // force reflow
  curtain.style.transition = 'transform 0.38s cubic-bezier(0.77, 0, 0.175, 1)';
  curtain.style.transform = 'scaleX(1)';

  // ── Phase 2: Swap page while curtain covers screen ──
  setTimeout(() => {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
      p.style.display = 'none';
      p.classList.remove('active', 'page-revealed');
    });
    // Show destination
    if (id === 'profile-selection' || 
        id === 'email-verify' || 
        id.startsWith('complete-profile-') || 
        id.startsWith('welcome-')) {
      next.style.display = 'flex';
    } else {
      next.style.display = 'block';
    }
    next.classList.add('active');
    if (id === 'email-verify') setupOtpInputs();
    window.scrollTo(0, 0);
    if (id === 'landing') updateLandingStats();

    // ── Phase 3: Curtain sweeps OUT, revealing the new page ──
    curtain.style.transition = 'none';
    curtain.style.transformOrigin = fromLeft ? 'right center' : 'left center';
    void curtain.offsetWidth; // force reflow
    curtain.style.transition = 'transform 0.42s cubic-bezier(0.77, 0, 0.175, 1)';
    curtain.style.transform = 'scaleX(0)';

    // Add reveal animation to the new page content
    void next.offsetHeight;
    next.classList.add('page-revealed');
    setTimeout(() => {
      next.classList.remove('page-revealed');
      clearTimeout(_transitionSafetyTimer);
      _isTransitioning = false;
    }, 520);
  }, 400);
}

function showPage(id) {
  _animatePage(id, 'forward');
  console.log('showPage:', id);
}

function goBackToLanding() {
  _animatePage('landing', 'back');
}


function goDash(section) {
  if (!state.user) { showPage('login'); return; }
  if (state.profile && state.profile.profile_type) {
    const type = state.profile.profile_type;
    const panelMap = { user: 'panel-usuario', provider: 'panel-prestador', business: 'panel-empresa' };
    const panelEl = document.getElementById(panelMap[type]);
    const isActive = panelEl && panelEl.classList.contains('active');
    if (isActive) {
      if (type === 'user' && typeof PanelUsuario !== 'undefined') { PanelUsuario.navigate(section); return; }
      if (type === 'provider' && typeof PanelPrestador !== 'undefined') { PanelPrestador.navigate(section); return; }
      if (type === 'business' && typeof PanelEmpresa !== 'undefined') { PanelEmpresa.navigate(section); return; }
    }
    enterPanel(type, section);
  } else {
    _pendingPublish = true;
    showPage('profile-selection');
  }
}

// =============================================
// MULTI-TENANT PANEL ROUTING
// =============================================
function enterPanel(type, section) {
  let panelId = 'panel-usuario';
  if (type === 'provider') panelId = 'panel-prestador';
  if (type === 'business') panelId = 'panel-empresa';

  showPage(panelId);

  // Initialize the correct panel logic
  // Nota: init() chama navigate('feed') internamente.
  // Se quisermos ir para outra seção, passamos como argumento para init ou sobrescrevemos depois
  // Para evitar duplo render, usamos initWithSection
  if (type === 'user' && typeof PanelUsuario !== 'undefined') {
    PanelUsuario.initWithSection(section || 'feed');
  } else if (type === 'provider' && typeof PanelPrestador !== 'undefined') {
    PanelPrestador.initWithSection(section || 'feed');
  } else if (type === 'business' && typeof PanelEmpresa !== 'undefined') {
    PanelEmpresa.initWithSection(section || 'feed');
  } else {
    // Panel JS file not loaded — show error
    const contentId = type === 'user' ? 'user-content' : type === 'provider' ? 'prestador-content' : 'empresa-content';
    const c = document.getElementById(contentId);
    if (c) c.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text2)"><div style="font-size:40px;margin-bottom:12px">⚠️</div><p style="font-weight:700">Erro ao carregar painel</p><p style="font-size:13px;margin-top:6px">Verifique se os arquivos da pasta <code>panels/</code> estão no servidor.</p></div>';
  }
}

async function saveCompleteProfile(type) {
  showAppLoading('Salvando informações...');

  // Coletar dados do formulário correto
  let updates = {};
  if (type === 'user') {
    updates = {
      full_name: document.getElementById('cp-user-name').value,
      city: document.getElementById('cp-user-city').value,
      interests: document.getElementById('cp-user-interests').value
    };
  } else if (type === 'provider') {
    updates = {
      full_name: document.getElementById('cp-prov-name').value,
      service_title: document.getElementById('cp-prov-service').value,
      city: document.getElementById('cp-prov-city').value,
      bio: document.getElementById('cp-prov-bio').value,
      phone: document.getElementById('cp-prov-phone').value,
      schedule: document.getElementById('cp-prov-schedule').value
    };
  } else if (type === 'business') {
    updates = {
      full_name: document.getElementById('cp-biz-name').value,
      city: document.getElementById('cp-biz-city').value,
      bio: document.getElementById('cp-biz-bio').value,
      phone: document.getElementById('cp-biz-phone').value,
      schedule: document.getElementById('cp-biz-schedule').value
    };
  }

  // Atualizar estado
  state.profile = { ...state.profile, ...updates };

  // Salvar no DB ou Local
  if (useLocalMode) {
    localDB.saveProfile(state.profile);
  } else if (db) {
    try {
      await db.from('profiles').update(updates).eq('id', state.user.id);
    } catch (err) {
      console.error(err);
    }
  }

  hideAppLoading();
  // Mostrar tela de boas-vindas
  showPage('welcome-' + type);
}

// =============================================
// AUTH — LOGIN (com fallback local)
// =============================================
async function doLogin() {
  console.log('doLogin chamado, useLocalMode:', useLocalMode);
  const emailEl = document.getElementById('login-email');
  const pwdEl = document.getElementById('login-pwd');
  const email = emailEl ? emailEl.value.trim() : '';
  const pwd = pwdEl ? pwdEl.value : '';
  if (!email || !pwd) { showAuthError('login-error', 'Preencha todos os campos'); return; }

  const btn = document.getElementById('login-btn');
  if (btn) { btn.textContent = 'Entrando...'; btn.disabled = true; }
  showAppLoading('Autenticando...');
  showAuthError('login-error', '');

  if (useLocalMode) {
    // Local login
    setTimeout(() => {
      const users = localDB.getUsers();
      const user = users.find(u => u.email === email && u.password === pwd);

      if (btn) { btn.textContent = 'Entrar'; btn.disabled = false; }

      if (!user) {
        hideAppLoading();
        showAuthError('login-error', 'E-mail ou senha incorretos.');
        return;
      }

      // Login success
      const userData = { id: user.id, email: user.email, user_metadata: { full_name: user.full_name } };
      state.user = userData;
      localDB.setCurrentUser(userData);

      const profile = localDB.getProfile(user.id);
      if (profile) {
        state.profile = profile;
        state.dbReady = true;
      }
      updateAvatarUI();
      hideAppLoading();

      if (profile && profile.profile_type) {
        enterPanel(profile.profile_type);
        showToast('Bem-vindo de volta! 👋');
      } else {
        if (_pendingPublish) {
          showPage('profile-selection');
        } else {
          showPublicArea();
          showToast('Bem-vindo! 👋');
        }
      }
    }, 600);
    return;
  }

  // Supabase login
  if (!db) {
    hideAppLoading();
    if (btn) { btn.textContent = 'Entrar'; btn.disabled = false; }
    useLocalMode = true;
    doLogin();
    return;
  }

  // Resetar flag para garantir que a navegação após login funcione
  _authNavigationDone = false;
  // C3 — guard local para evitar dupla navegação se onAuthStateChange disparar
  // antes do signInWithPassword retornar
  var _loginGuardDone = false;

  try {
    // C3 — Timeout de 8s: se o Supabase travar, cair no catch com Error('timeout')
    const { data, error } = await withTimeout(
      db.auth.signInWithPassword({ email, password: pwd }),
      8000
    );
    console.log('doLogin result:', { data, error });
    if (btn) { btn.textContent = 'Entrar'; btn.disabled = false; }

    if (error) {
      hideAppLoading();
      console.error('Login error:', error.message, error);

      if (error.message === 'Email not confirmed') {
        // Redireciona automaticamente o usuário para a página de verificação de e-mail (OTP)
        _pendingVerifyEmail = email;
        _pendingVerifyPwd = pwd;
        const displayEl = document.getElementById('verify-email-display');
        if (displayEl) displayEl.textContent = email;
        
        if (typeof setupOtpInputs === 'function') {
          setupOtpInputs();
        }
        
        showPage('email-verify');
        startResendTimer();
        
        // Reenvia o código de e-mail imediatamente para garantir que ele receba o OTP novo
        resendCode();
        
        showToast('E-mail não confirmado. Código reenviado! 📧');
        return;
      }

      const msgs = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'Invalid API key': 'Erro de configuração do servidor.',
        'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
        'Request rate limit reached': 'Muitas tentativas. Aguarde alguns minutos.',
      };
      showAuthError('login-error', msgs[error.message] || ('Erro: ' + error.message));
      return;
    }

    if (data && data.session) {
      console.log('Login bem-sucedido');
      if (_loginGuardDone) return; // Evita dupla navegação
      _loginGuardDone = true;
      // Navegar diretamente — bloqueia onAuthStateChange de duplicar navegação
      _authNavigationDone = true;
      state.user = data.user;
      localDB.setCurrentUser({ id: data.user.id, email: data.user.email, user_metadata: data.user.user_metadata });
      if (btn) { btn.textContent = 'Entrar'; btn.disabled = false; }
      await loadProfile(data.user.id);
      updateAvatarUI();
      hideAppLoading();
      const ptype = state.profile?.profile_type;
      if (ptype === 'provider' || ptype === 'business' || ptype === 'user') {
        enterPanel(ptype);
        showToast('Bem-vindo de volta! 👋');
      } else if (_pendingPublish) {
        showPage('profile-selection');
      } else {
        showPublicArea();
        showToast('Bem-vindo! 👋');
      }
    } else {
      // session nula (email não confirmado etc) — NUNCA deixar loader preso
      hideAppLoading();
      if (btn) { btn.textContent = 'Entrar'; btn.disabled = false; }
      if (data && data.user && !data.session) {
        _pendingVerifyEmail = email;
        _pendingVerifyPwd = pwd;
        const displayEl = document.getElementById('verify-email-display');
        if (displayEl) displayEl.textContent = email;
        
        if (typeof setupOtpInputs === 'function') {
          setupOtpInputs();
        }
        
        showPage('email-verify');
        startResendTimer();
        resendCode();
        showToast('Confirme seu e-mail para acessar. Código enviado! 📧');
      } else {
        showAuthError('login-error', 'Erro inesperado. Tente novamente.');
      }
    }
  } catch (err) {
    hideAppLoading();
    if (btn) { btn.textContent = 'Entrar'; btn.disabled = false; }
    console.error('Login catch:', err.message || err);

    // C3 — Timeout ou falha de rede: ativar modo local
    useLocalMode = true;
    if (err.message === 'timeout') {
      showToast('Servidor demorou para responder. Usando conta offline.');
    } else {
      showAuthError('login-error', 'Servidor indisponível. Usando modo offline.');
    }
    doLogin();
  }
}

// =============================================
// AUTH — SIGNUP (com fallback local)
// =============================================
async function doSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pwd = document.getElementById('signup-pwd').value;
  const pwd2 = document.getElementById('signup-pwd2').value;

  if (!name || !email || !pwd || !pwd2) { showAuthError('signup-error', 'Preencha todos os campos'); return; }
  if (pwd !== pwd2) { showAuthError('signup-error', 'As senhas não coincidem'); return; }
  if (pwd.length < 6) { showAuthError('signup-error', 'Senha deve ter pelo menos 6 caracteres'); return; }

  const btn = document.getElementById('signup-btn');
  btn.textContent = 'Criando conta...'; btn.disabled = true;
  showAppLoading('Criando sua conta...');
  showAuthError('signup-error', '');

  if (useLocalMode) {
    // Local signup
    setTimeout(() => {
      const users = localDB.getUsers();

      // Check if email already exists
      if (users.find(u => u.email === email)) {
        btn.textContent = 'Criar conta'; btn.disabled = false;
        hideAppLoading();
        showAuthError('signup-error', 'Este e-mail já está cadastrado. Tente fazer login.');
        return;
      }

      // Create user
      const userId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const newUser = { id: userId, email, password: pwd, full_name: name, created_at: new Date().toISOString() };
      users.push(newUser);
      localDB.saveUsers(users);

      // Set current user
      const userData = { id: userId, email, user_metadata: { full_name: name } };
      state.user = userData;
      localDB.setCurrentUser(userData);

      btn.textContent = 'Criar conta'; btn.disabled = false;
      hideAppLoading();
      showPage('profile-selection');
      showToast('Conta criada com sucesso! 🎉');
    }, 800);
    return;
  }

  // Supabase signup
  // Resetar flag para garantir que navegação após cadastro funcione
  _authNavigationDone = false;
  try {
    // C4 — Aumentado timeout para 15s para dar tempo do servidor de e-mail (SMTP) do Supabase responder
    const { data, error } = await withTimeout(
      db.auth.signUp({
        email,
        password: pwd,
        options: {
          data: { full_name: name },
          emailRedirectTo: window.location.href.split('#')[0]
        }
      }),
      15000
    );

    console.log('doSignup result:', { data, error });
    btn.textContent = 'Criar conta'; btn.disabled = false;

    if (error) {
      hideAppLoading();
      console.error('Signup error:', error.message, error);
      const msgs = {
        'User already registered': 'Este e-mail já está cadastrado. Tente fazer login.',
        'Signup requires a valid password': 'Senha inválida. Use pelo menos 6 caracteres.',
        'Invalid API key': 'Erro de configuração do servidor.',
      };
      showAuthError('signup-error', msgs[error.message] || ('Erro: ' + error.message));
      return;
    }

    // If we have a session → auto-confirmed (no email verification needed)
    if (data.session) {
      state.user = data.user;
      hideAppLoading();
      if (_pendingPublish) {
        showPage('profile-selection');
      } else {
        showPublicArea();
      }
      showToast('Conta criada com sucesso! 🎉');
      return;
    }

    // Email verification required → redirect to OTP page
    if (data.user && !data.session) {
      console.log('Verificação de e-mail necessária, redirecionando para OTP...');
      _pendingVerifyEmail = email;
      _pendingVerifyPwd = pwd;
      const displayEl = document.getElementById('verify-email-display');
      if (displayEl) displayEl.textContent = email;
      
      // Inicializa os inputs de código OTP da tela de verificação
      if (typeof setupOtpInputs === 'function') {
        setupOtpInputs();
      }

      hideAppLoading();
      showPage('email-verify');
      startResendTimer();
      showToast('Código de verificação enviado para seu e-mail 📧');
      return;
    }

    hideAppLoading();
    showPage('profile-selection');
  } catch (err) {
    hideAppLoading();
    btn.textContent = 'Criar conta'; btn.disabled = false;
    console.error('Signup catch:', err.message || err);

    if (err.message === 'timeout') {
      showAuthError('signup-error', 'O servidor demorou muito para responder (serviço de e-mail lento). Tente novamente em alguns instantes.');
    } else {
      showAuthError('signup-error', 'Erro de conexão com o servidor. Verifique sua internet.');
    }
  }
}

// =============================================
// AUTH — GOOGLE
// =============================================
async function doGoogleLogin() {
  console.log('doGoogleLogin chamado');

  if (useLocalMode) {
    showToast('Login com Google não disponível no modo offline. Use e-mail e senha.');
    return;
  }

  if (!supabaseConfigured || !db) {
    showToast('Supabase não configurado. Use e-mail e senha para entrar.');
    return;
  }

  if (window.location.protocol === 'file:') {
    alert('ERRO: O Login do Google exige um endereço web válido.\n\nUse a extensão "Live Server" no VSCode ou outro servidor local.');
    return;
  }

  showAppLoading('Conectando ao Google...');

  try {
    // Build clean redirect URL
    let baseUrl = window.location.origin + window.location.pathname;
    // Ensure it ends with / for GitHub Pages
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    // Remove any index.html from the path
    baseUrl = baseUrl.replace(/index\.html\/?$/, '');
    if (!baseUrl.endsWith('/')) baseUrl += '/';

    console.log('OAuth redirectTo:', baseUrl);

    // Reset navigation flag so callback handler works
    _authNavigationDone = false;

    const { data, error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: baseUrl,
        queryParams: { prompt: 'select_account', access_type: 'offline' },
        skipBrowserRedirect: false
      }
    });
    console.log('signInWithOAuth result:', { data, error });
    if (error) {
      hideAppLoading();
      console.error('Google OAuth error:', error);
      showToast('Erro ao entrar com Google: ' + error.message);
    }
    // If successful, browser will redirect to Google
  } catch (err) {
    hideAppLoading();
    console.error('Google OAuth catch:', err);
    showToast('Erro inesperado na autenticação com Google.');
  }
}

// =============================================
// AUTH — EMAIL OTP VERIFICATION
// =============================================
let _pendingVerifyEmail = '';
let _pendingVerifyPwd = '';
let _resendTimerInterval = null;
let _resendCooldown = 0;

function setupOtpInputs() {
  const container = document.getElementById('otp-container');
  if (!container) return;
  const inputs = container.querySelectorAll('.otp-input');

  inputs.forEach((input, idx) => {
    // Clear previous listeners by replacing element
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
  });

  // Re-query after clone
  const freshInputs = container.querySelectorAll('.otp-input');
  freshInputs.forEach((input, idx) => {
    input.value = '';
    input.classList.remove('filled', 'error', 'success');

    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val;
      if (val) {
        e.target.classList.add('filled');
        e.target.classList.remove('error');
        // Move to next input
        if (idx < freshInputs.length - 1) {
          freshInputs[idx + 1].focus();
        }
      } else {
        e.target.classList.remove('filled');
      }
      // Auto-submit if all filled
      const code = getOtpCode();
      if (code.length === 6) {
        verifyEmailCode();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        freshInputs[idx - 1].focus();
        freshInputs[idx - 1].value = '';
        freshInputs[idx - 1].classList.remove('filled');
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '').slice(0, 6);
      paste.split('').forEach((char, i) => {
        if (freshInputs[i]) {
          freshInputs[i].value = char;
          freshInputs[i].classList.add('filled');
        }
      });
      if (paste.length === 6) {
        freshInputs[5].focus();
        verifyEmailCode();
      } else if (paste.length > 0) {
        freshInputs[Math.min(paste.length, 5)].focus();
      }
    });
  });

  // Focus first input
  if (freshInputs[0]) freshInputs[0].focus();
}

function getOtpCode() {
  const inputs = document.querySelectorAll('#otp-container .otp-input');
  return Array.from(inputs).map(i => i.value).join('');
}

function setOtpState(state_class) {
  const inputs = document.querySelectorAll('#otp-container .otp-input');
  inputs.forEach(i => {
    i.classList.remove('error', 'success');
    if (state_class) i.classList.add(state_class);
  });
}

async function verifyEmailCode() {
  const code = getOtpCode();
  if (code.length !== 6) {
    showAuthError('verify-error', 'Digite o código completo de 6 dígitos');
    setOtpState('error');
    return;
  }

  const btn = document.getElementById('verify-btn');
  btn.textContent = 'Verificando...'; btn.disabled = true;
  showAuthError('verify-error', '');
  showAppLoading('Verificando código...');

  // BYPASS DE SEGURANÇA PARA PROTÓTIPO / LIMITE SMTP
  // Permite ao usuário logar imediatamente com o código 123456 caso os e-mails do Supabase estejam esgotados
  if (code === '123456') {
    setTimeout(() => {
      setOtpState('success');
      btn.textContent = 'Verificar código'; btn.disabled = false;
      
      const userData = {
        id: state.user?.id || 'usr_' + Date.now(),
        email: _pendingVerifyEmail || 'teste@iaa.com',
        user_metadata: { full_name: 'Usuário de Teste' }
      };
      state.user = userData;
      localDB.setCurrentUser(userData);

      hideAppLoading();
      showPage('profile-selection');
      showToast('E-mail verificado com sucesso! (Código de Teste) ✅');
    }, 800);
    return;
  }

  if (useLocalMode) {
    // In local mode, accept any 6-digit code
    setTimeout(() => {
      setOtpState('success');
      btn.textContent = 'Verificar código'; btn.disabled = false;
      hideAppLoading();
      showPage('profile-selection');
      showToast('E-mail verificado com sucesso! ✅');
    }, 800);
    return;
  }

  try {
    // Try OTP verification with Supabase
    const { data, error } = await db.auth.verifyOtp({
      email: _pendingVerifyEmail,
      token: code,
      type: 'signup'
    });

    console.log('verifyOtp result:', { data, error });
    btn.textContent = 'Verificar código'; btn.disabled = false;

    if (error) {
      hideAppLoading();
      setOtpState('error');
      const msgs = {
        'Token has expired or is invalid': 'Código expirado ou inválido. Tente reenviar.',
        'Invalid token': 'Código incorreto. Verifique e tente novamente.',
      };
      showAuthError('verify-error', msgs[error.message] || ('Código inválido: ' + error.message));
      return;
    }

    // Success!
    if (data && data.session) {
      setOtpState('success');
      state.user = data.user;
      hideAppLoading();
      if (_pendingPublish) {
        showPage('profile-selection');
      } else {
        showPublicArea();
      }
      showToast('E-mail verificado com sucesso! ✅');
    } else if (data && data.user) {
      // Have user but no session, try logging in
      setOtpState('success');
      const { data: loginData } = await db.auth.signInWithPassword({
        email: _pendingVerifyEmail,
        password: _pendingVerifyPwd
      });
      if (loginData && loginData.session) {
        state.user = loginData.user;
        hideAppLoading();
        if (_pendingPublish) {
          showPage('profile-selection');
        } else {
          showPublicArea();
        }
        showToast('E-mail verificado com sucesso! ✅');
      } else {
        hideAppLoading();
        showPage('login');
        showToast('E-mail verificado! Faça login para continuar.');
      }
    } else {
      hideAppLoading();
      showPage('login');
      showToast('E-mail verificado! Faça login para continuar.');
    }
  } catch (err) {
    hideAppLoading();
    btn.textContent = 'Verificar código'; btn.disabled = false;
    console.error('verifyOtp catch:', err);
    setOtpState('error');
    showAuthError('verify-error', 'Erro ao verificar. Tente novamente.');
  }
}

async function resendCode() {
  if (_resendCooldown > 0) return;

  const btn = document.getElementById('resend-btn');
  if (btn) { btn.textContent = 'Enviando...'; btn.disabled = true; }

  if (useLocalMode) {
    setTimeout(() => {
      if (btn) { btn.textContent = 'Reenviar código'; btn.disabled = false; }
      showToast('Código reenviado! (modo local)');
      startResendTimer();
    }, 500);
    return;
  }

  try {
    const { error } = await db.auth.resend({
      type: 'signup',
      email: _pendingVerifyEmail
    });

    if (btn) { btn.textContent = 'Reenviar código'; btn.disabled = false; }

    if (error) {
      showToast('Erro ao reenviar: ' + error.message);
    } else {
      showToast('Novo código enviado para ' + _pendingVerifyEmail + ' 📧');
      startResendTimer();
    }
  } catch (err) {
    if (btn) { btn.textContent = 'Reenviar código'; btn.disabled = false; }
    showToast('Erro ao reenviar código.');
  }
}

function startResendTimer() {
  _resendCooldown = 60;
  const timerEl = document.getElementById('resend-timer');
  const btn = document.getElementById('resend-btn');
  if (btn) btn.disabled = true;

  if (_resendTimerInterval) clearInterval(_resendTimerInterval);

  _resendTimerInterval = setInterval(() => {
    _resendCooldown--;
    if (timerEl) timerEl.textContent = `Aguarde ${_resendCooldown}s para reenviar`;

    if (_resendCooldown <= 0) {
      clearInterval(_resendTimerInterval);
      if (timerEl) timerEl.textContent = '';
      if (btn) btn.disabled = false;
    }
  }, 1000);
}

// =============================================
// AUTH — PROFILE SELECTION (com fallback local)
// =============================================
async function selectProfile(type) {
  if (!state.user) {
    showToast('Erro: faça login novamente.');
    return;
  }

  showAppLoading('Salvando perfil...');

  const profileData = {
    id: state.user.id,
    email: state.user.email,
    full_name: state.user.user_metadata?.full_name || state.user.email?.split('@')[0] || 'Usuário',
    profile_type: type,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  if (useLocalMode) {
    // Save locally
    localDB.saveProfile(profileData);
    state.profile = profileData;
    state.dbReady = true;
    hideAppLoading();
    updateLandingStats(); // Atualizar contadores
    showPage('complete-profile-' + type);
    return;
  }

  // Supabase
  if (!db) {
    hideAppLoading();
    showToast('Erro de conexão.');
    return;
  }

  try {
    console.log('Saving profile:', profileData);
    const { error } = await db.from('profiles').upsert(profileData);

    if (error) {
      hideAppLoading();
      console.error('selectProfile error:', error);
      showToast('Erro ao salvar perfil: ' + error.message);
      return;
    }

    await loadProfile(state.user.id);
    hideAppLoading();
    showPage('complete-profile-' + type);
  } catch (err) {
    hideAppLoading();
    console.error('selectProfile catch:', err);
    showToast('Erro inesperado: ' + (err.message || ''));
  }
}

// =============================================
// AUTH — LOGOUT
// =============================================
async function doLogout() {
  if (!useLocalMode && db) { try { await db.auth.signOut(); } catch (err) { } }
  localDB.setCurrentUser(null);
  state.user = null;
  state.profile = null;
  _pendingPublish = false;
  _authNavigationDone = false; // Permite novo login na mesma sessão do navegador
  showPage('landing');
  showToast('Sessão encerrada.');
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!msg) { el.classList.remove('show'); el.textContent = ''; return; }
  el.textContent = msg; el.classList.add('show');
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁️'; }
}

// =============================================
// SIDEBAR & THEME
// =============================================
function toggleSidebar() {
  // Legacy: try to find any active sidebar
  const sidebarIds = ['sidebar-usuario', 'sidebar-prestador', 'sidebar-empresa', 'sidebar'];
  for (const id of sidebarIds) {
    const s = document.getElementById(id);
    if (s) {
      if (window.innerWidth <= 768) s.classList.toggle('mobile-open');
      else s.classList.toggle('collapsed');
      return;
    }
  }
}

// Toggle a specific panel sidebar by ID
function toggleSidebarPanel(sidebarId) {
  const s = document.getElementById(sidebarId);
  if (!s) return;
  if (window.innerWidth <= 768) {
    const isOpen = s.classList.toggle('mobile-open');
    // Gerenciar backdrop
    let backdrop = s.parentElement.querySelector('.sidebar-mobile-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-mobile-backdrop';
      backdrop.onclick = () => {
        s.classList.remove('mobile-open');
        backdrop.classList.remove('visible');
        document.body.style.overflow = '';
      };
      s.parentElement.appendChild(backdrop);
    }
    backdrop.classList.toggle('visible', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  } else {
    s.classList.toggle('collapsed');
  }
}

function closeAllMobileSidebars() {
  document.querySelectorAll('.sidebar').forEach(s => s.classList.remove('mobile-open'));
  document.querySelectorAll('.sidebar-mobile-backdrop').forEach(b => b.classList.remove('visible'));
  document.body.style.overflow = '';
}

function toggleTheme() {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      runThemeToggleLogic();
    });
  } else {
    runThemeToggleLogic();
  }
}

function runThemeToggleLogic() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('iaa-theme', state.theme);
  
  // Atualizar apenas os botões de emoji legados do painel
  document.querySelectorAll('.topbar-right .icon-btn, .topbar-right button[onclick="toggleTheme()"]').forEach(btn => {
    btn.innerHTML = state.theme === 'dark' ? '☀️' : '🌙';
  });
}

function setActive(el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
}

// =============================================
// UPDATE AVATAR / UI FROM STATE
// =============================================
function updateAvatarUI() {
  const p = state.profile;
  const name = p?.full_name || state.user?.user_metadata?.full_name || state.user?.email || 'U';
  const avatarEl = document.getElementById('topbar-avatar');
  if (avatarEl) {
    if (p?.avatar_url) {
      avatarEl.innerHTML = `<img src="${p.avatar_url}" alt=""/>`;
    } else {
      avatarEl.textContent = name.charAt(0).toUpperCase();
    }
  }
}

// =============================================
// DASHBOARD SECTION RENDERING
// =============================================
function handleSearch(val) {
  // Could filter current section content
}

// =============================================
// RENDERERS — each receives container el
// =============================================
const renders = {

  // --- FEED ---
  feed: async (c) => {
    c.innerHTML = `<div class="feed-wrap">
    <div class="page-header">
      <div><div class="page-title">Início</div><div class="page-sub">Alto Acre conectado</div></div>
      <button class="btn btn-primary btn-sm" onclick="goDash('publications')">+ Publicar</button>
    </div>
    <div class="quick-links">
      <div class="quick-link" onclick="goDash('services')"><div class="quick-link-icon" style="background:rgba(37,99,235,.1)">🔧</div><span>Serviços</span></div>
      <div class="quick-link" onclick="goDash('businesses')"><div class="quick-link-icon" style="background:rgba(20,184,166,.1)">🏢</div><span>Empresas</span></div>
      <div class="quick-link" onclick="goDash('jobs')"><div class="quick-link-icon" style="background:rgba(245,158,11,.1)">💼</div><span>Vagas</span></div>
      <div class="quick-link" onclick="goDash('classifieds')"><div class="quick-link-icon" style="background:rgba(34,197,94,.1)">🏷️</div><span>Classif.</span></div>
    </div>
    <div id="feed-items"><div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:0 auto"></div></div></div>
  </div>`;
    await loadFeed();
  },

  // --- SERVICES ---
  services: async (c) => {
    c.innerHTML = `<div>
    <div class="page-header"><div><div class="page-title">Serviços</div><div class="page-sub">Encontre prestadores na região</div></div></div>
    <div class="search-bar"><span class="search-bar-icon">🔍</span><input placeholder="Buscar por nome, serviço ou cidade..." oninput="filterCards(this.value,'service-cards')"/></div>
    <div class="cards-grid" id="service-cards"><div style="text-align:center;padding:40px;grid-column:1/-1"><div class="loading-spinner" style="margin:0 auto"></div></div></div>
  </div>`;
    let data = null;
    if (useLocalMode) {
      data = localDB.getAllProfiles().filter(p => p.profile_type === 'provider');
    } else if (db) {
      try {
        const res = await db.from('profiles').select('*').eq('profile_type', 'provider').order('created_at', { ascending: false });
        if (res.error) console.error('Erro ao carregar serviços:', res.error);
        data = res.data || null;
      } catch (err) { console.error('Erro ao carregar serviços:', err); }
    }
    const cont = document.getElementById('service-cards');
    if (cont) {
      if (!data || data.length === 0) {
        cont.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text2)"><div style="font-size:48px;margin-bottom:12px">🔧</div><p>Nenhum prestador cadastrado ainda.</p></div>`;
      } else {
        cont.innerHTML = data.map(p => serviceCard(p)).join('');
      }
    }
  },

  // --- BUSINESSES ---
  businesses: async (c) => {
    c.innerHTML = `<div>
    <div class="page-header"><div><div class="page-title">Empresas</div><div class="page-sub">Descubra comércios da região</div></div></div>
    <div class="search-bar"><span class="search-bar-icon">🔍</span><input placeholder="Buscar empresas, categorias ou cidades..." oninput="filterCards(this.value,'biz-cards')"/></div>
    <div class="cards-grid" id="biz-cards"><div style="text-align:center;padding:40px;grid-column:1/-1"><div class="loading-spinner" style="margin:0 auto"></div></div></div>
  </div>`;
    let data = null;
    if (useLocalMode) {
      data = localDB.getAllProfiles().filter(p => p.profile_type === 'business');
    } else if (db) {
      try {
        const res = await db.from('profiles').select('*').eq('profile_type', 'business').order('created_at', { ascending: false });
        if (res.error) console.error('Erro ao carregar empresas:', res.error);
        data = res.data || null;
      } catch (err) { console.error('Erro ao carregar empresas:', err); }
    }
    const cont = document.getElementById('biz-cards');
    if (cont) {
      if (!data || data.length === 0) {
        cont.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text2)"><div style="font-size:48px;margin-bottom:12px">🏢</div><p>Nenhuma empresa cadastrada ainda.</p></div>`;
      } else {
        cont.innerHTML = data.map(p => bizCard(p)).join('');
      }
    }
  },

  // --- JOBS ---
  jobs: async (c) => {
    c.innerHTML = `<div>
    <div class="page-header">
      <div><div class="page-title">Vagas</div><div class="page-sub">Oportunidades de emprego na região</div></div>
      <button class="btn btn-primary btn-sm" onclick="openNewJob()">+ Anunciar vaga</button>
    </div>
    <div class="search-bar"><span class="search-bar-icon">🔍</span><input placeholder="Buscar vagas, empresas ou cidades..." oninput="filterCards(this.value,'job-cards')"/></div>
    <div style="display:flex;flex-direction:column;gap:10px" id="job-cards"><div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:0 auto"></div></div></div>
  </div>`;
    let data = null;
    if (useLocalMode) {
      const jobs = localDB.getJobs();
      data = jobs.map(j => {
        const profile = localDB.getProfile(j.user_id);
        return { ...j, profiles: profile || { full_name: 'Empresa', phone: '' } };
      });
    } else if (db) {
      try {
        const res = await db.from('jobs').select('*, profiles(full_name,phone,avatar_url)').order('created_at', { ascending: false });
        if (res.error) console.error('Erro ao carregar vagas:', res.error);
        data = res.data || null;
      } catch (err) { console.error('Erro ao carregar vagas:', err); }
    }
    const cont = document.getElementById('job-cards');
    if (cont) {
      if (!data || data.length === 0) {
        cont.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text2)"><div style="font-size:48px;margin-bottom:12px">💼</div><p>Nenhuma vaga publicada ainda.</p></div>`;
      } else {
        cont.innerHTML = data.map(j => jobCard(j)).join('');
      }
    }
  },

  // --- CLASSIFIEDS ---
  classifieds: async (c) => {
    c.innerHTML = `<div>
    <div class="page-header">
      <div><div class="page-title">Classificados</div><div class="page-sub">Compre e venda na região</div></div>
      <button class="btn btn-primary btn-sm" onclick="openNewClassified()">+ Anunciar</button>
    </div>
    <div class="search-bar"><span class="search-bar-icon">🔍</span><input placeholder="Buscar produtos, categorias ou cidades..." oninput="filterCards(this.value,'classified-cards')"/></div>
    <div class="filter-chips" id="classified-chips">
      ${['Todos', 'Móveis', 'Eletrônicos', 'Aluguel', 'Veículos', 'Eletrodomésticos', 'Imóveis'].map((c2, i) => `<div class="chip${i === 0 ? ' active' : ''}" onclick="filterClassified(this,'${c2}')">${c2}</div>`).join('')}
    </div>
    <div class="cards-grid" id="classified-cards"><div style="text-align:center;padding:40px;grid-column:1/-1"><div class="loading-spinner" style="margin:0 auto"></div></div></div>
  </div>`;
    await loadClassifieds('Todos');
  },

  // --- VIDEOS (grid → click → TikTok fullscreen overlay) ---
  videos: async (c) => {
    c.innerHTML = `<div>
      <div class="page-header">
        <div>
          <div class="page-title">Vídeos</div>
          <div class="page-sub">Conteúdo local em vídeo</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openUploadVideo()">+ Novo vídeo</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px" id="video-grid">
        <div style="text-align:center;padding:40px;grid-column:1/-1"><div class="loading-spinner" style="margin:0 auto"></div></div>
      </div>
    </div>`;

    let data = [];
    if (useLocalMode) {
      const localVids = await localDB.getVideos();
      data = localVids.map(v => {
        const profile = localDB.getProfile(v.user_id);
        return { ...v, profiles: profile || { full_name: 'Usuário', avatar_url: null } };
      });
    } else if (db) {
      try {
        const res = await db.from('videos').select('*, profiles(full_name,avatar_url)').order('created_at', { ascending: false });
        data = res.data || [];
      } catch (err) { console.error('Erro ao carregar vídeos:', err); }
    }

    // Store videos globally for the TikTok viewer
    window._tiktokVideos = data;

    const cont = document.getElementById('video-grid');
    if (!cont) return;

    if (!data || data.length === 0) {
      cont.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text2)">
        <div style="font-size:56px;margin-bottom:12px">🎬</div>
        <p style="font-weight:600;font-size:16px;color:var(--text);margin-bottom:8px">Nenhum vídeo ainda</p>
        <p style="font-size:14px;margin-bottom:20px">Seja o primeiro a publicar para a comunidade!</p>
        <button class="btn btn-primary" onclick="openUploadVideo()">+ Publicar vídeo</button>
      </div>`;
      return;
    }

    cont.innerHTML = data.map((v, idx) => videoCard(v, idx)).join('');
  },


  // --- PHOTOS ---
  photos: async (c) => {
    c.innerHTML = `<div>
    <div class="page-header">
      <div><div class="page-title">Fotos</div><div class="page-sub">Galeria de fotos da região</div></div>
      <button class="btn btn-primary btn-sm" onclick="openUploadPhoto()">+ Adicionar fotos</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px" id="photo-grid">
      <div style="text-align:center;padding:40px;grid-column:1/-1"><div class="loading-spinner" style="margin:0 auto"></div></div>
    </div>
  </div>`;
    let data = null;
    if (useLocalMode) {
      const localPhs = await localDB.getPhotos();
      data = localPhs.map(ph => {
        const profile = localDB.getProfile(ph.user_id);
        return { ...ph, profiles: profile || { full_name: 'Usuário' } };
      });
    } else if (db) {
      try {
        const res = await db.from('photos').select('*, profiles(full_name)').order('created_at', { ascending: false });
        if (res.error) console.error('Erro ao carregar fotos:', res.error);
        data = res.data || null;
      } catch (err) { console.error('Erro ao carregar fotos:', err); }
    }
    const cont = document.getElementById('photo-grid');
    if (cont) {
      if (!data || data.length === 0) {
        cont.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text2)"><div style="font-size:48px;margin-bottom:12px">📷</div><p>Nenhuma foto publicada ainda.</p><button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="openUploadPhoto()">+ Adicionar primeira foto</button></div>`;
      } else {
        cont.innerHTML = data.map(p => photoCard(p)).join('');
      }
    }
  },

  // --- PROFILE ---
  profile: (c) => {
    const p = state.profile;
    const name = p?.full_name || state.user?.email?.split('@')[0] || 'Usuário';
    const typeLabel = { provider: 'Prestador de Serviço', business: 'Empresa', user: 'Usuário' }[p?.profile_type] || 'Usuário';
    const roleIcon = p?.profile_type === 'business' ? '🏪' : (p?.profile_type === 'provider' ? '💼' : '👤');

    const detailsList = [
      p?.city ? `<div class="profile-detail">📍 ${p.city}</div>` : '',
      p?.phone ? `<div class="profile-detail">📱 ${p.phone}</div>` : '',
      `<div class="profile-detail">✉️ ${state.user?.email || ''}</div>`
    ].filter(Boolean);
    const detailsHtml = detailsList.join('<div class="profile-details-divider"></div>');

    const statsConfig = [
      { label: 'Visualizações', value: p?.views || 0, color: 'blue', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>` },
      { label: 'Contatos', value: p?.contacts || 0, color: 'purple', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
      { label: 'Avaliações', value: p?.rating_count || 0, color: 'yellow', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
      { label: 'Salvos', value: p?.saves || 0, color: 'red', svg: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>` }
    ];

    c.innerHTML = `<div style="width:100%">
    <div class="page-header">
      <div><div class="page-title">Meu Perfil</div><div class="page-sub">Gerencie suas informações</div></div>
      <button class="btn btn-primary btn-sm" onclick="openEditProfile()" style="display:inline-flex;align-items:center;gap:6px">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        Editar
      </button>
    </div>
    <div class="profile-card">
      <div class="profile-top">
        <div class="profile-avatar-wrap" onclick="document.getElementById('avatar-input').click()" style="cursor:pointer">
          <div class="profile-avatar" id="profile-avatar-display">
            ${p?.avatar_url ? `<img src="${p.avatar_url}" alt=""/>` : name.charAt(0).toUpperCase()}
          </div>
          <div class="profile-role-badge" title="${typeLabel}">${roleIcon}</div>
          <div class="profile-avatar-overlay">📷</div>
        </div>
        <div style="flex:1">
          <div class="profile-name" id="profile-name-display">${name}</div>
          <div class="profile-badges"><span class="badge badge-blue">${typeLabel}</span></div>
          <p class="profile-bio" id="profile-bio-display">${p?.bio || 'Nenhuma descrição adicionada ainda.'}</p>
          <div class="profile-details">
            ${detailsHtml}
          </div>
        </div>
      </div>
    </div>
    <div class="stats-grid">
      ${statsConfig.map(s => `
        <div class="stat-box stat-${s.color}">
          <div class="stat-icon-circle">${s.svg}</div>
          <div class="stat-box-val">${s.value}</div>
          <div class="stat-box-lbl">${s.label}</div>
        </div>
      `).join('')}
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="font-size:15px;font-weight:700">Minhas publicações</h3>
        <button class="btn btn-outline btn-sm" onclick="goDash('publications')">Ver todas</button>
      </div>
      <div id="my-pubs-preview"><div style="text-align:center;padding:20px"><div class="loading-spinner" style="margin:0 auto"></div></div></div>
    </div>
  </div>`;
    loadMyPublications();
  },

  // --- PUBLICATIONS ---
  publications: async (c) => {
    c.innerHTML = `<div style="width:100%">
    <div class="page-header">
      <div><div class="page-title">Publicações</div><div class="page-sub">Gerencie suas publicações</div></div>
      <button class="btn btn-primary btn-sm" onclick="openNewPublication()">+ Nova publicação</button>
    </div>
    <div id="pub-list"><div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:0 auto"></div></div></div>
  </div>`;
    if (!state.user) return;
    if (useLocalMode) {
      const data = localDB.getPublications().filter(p => p.user_id === state.user.id);
      const cont = document.getElementById('pub-list');
      if (!cont) return;
      if (!data || data.length === 0) {
        cont.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:60px;text-align:center"><div style="font-size:48px;margin-bottom:12px">📄</div><h3 style="font-size:16px;font-weight:700;margin-bottom:6px">Nenhuma publicação</h3><p style="font-size:14px;color:var(--text2);margin-bottom:20px">Crie sua primeira publicação para aparecer no feed</p><button class="btn btn-primary btn-sm" onclick="openNewPublication()">+ Criar publicação</button></div>`;
      } else {
        cont.innerHTML = data.map(pub => pubCard(pub)).join('');
      }
      return;
    }
    if (!db) return;
    let data = null; try { const res = await db.from('publications').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }); data = res.data; } catch (err) { }
    const cont = document.getElementById('pub-list');
    if (!cont) return;
    if (!data || data.length === 0) {
      cont.innerHTML = `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:60px;text-align:center"><div style="font-size:48px;margin-bottom:12px">📄</div><h3 style="font-size:16px;font-weight:700;margin-bottom:6px">Nenhuma publicação</h3><p style="font-size:14px;color:var(--text2);margin-bottom:20px">Crie sua primeira publicação para aparecer no feed</p><button class="btn btn-primary btn-sm" onclick="openNewPublication()">+ Criar publicação</button></div>`;
    } else {
      cont.innerHTML = data.map(pub => pubCard(pub)).join('');
    }
  },

  // --- PERFORMANCE ---
  performance: async (c) => {
    const p = state.profile;
    c.innerHTML = `<div style="width:100%">
    <div><div class="page-title">Desempenho</div><div class="page-sub" style="margin-bottom:24px">Acompanhe suas métricas</div></div>
    <div class="stats-grid" style="margin-bottom:16px">
      ${[{ t: 'Visualizações', v: p?.views || 0, i: '👁️', c: 'var(--brand)' }, { t: 'Contatos', v: p?.contacts || 0, i: '📱', c: 'var(--accent)' }, { t: 'Avaliações', v: p?.rating_count || 0, i: '⭐', c: 'var(--warning)' }, { t: 'Curtidas', v: p?.likes || 0, i: '❤️', c: 'var(--danger)' }].map(s => `<div class="stat-box"><div style="font-size:24px;color:${s.c};margin-bottom:4px">${s.i}</div><div class="stat-box-val">${s.v}</div><div class="stat-box-lbl">${s.t}</div></div>`).join('')}
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:48px;text-align:center;margin-bottom:16px">
      <div style="font-size:40px;margin-bottom:12px">📊</div>
      <h3 style="font-weight:700;margin-bottom:6px">${(p?.views || 0) === 0 ? 'Dados insuficientes' : 'Desempenho geral'}</h3>
      <p style="font-size:14px;color:var(--text2)">Complete seu perfil e publique conteúdos para aumentar sua visibilidade</p>
    </div>
    <div style="background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.15);border-radius:var(--radius);padding:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div><p style="font-weight:600;font-size:14px">ℹ️ Como melhorar seu desempenho?</p><p style="font-size:13px;color:var(--text2);margin-top:3px">Adicione foto, descrição completa e contato no perfil.</p></div>
      <button class="btn btn-outline btn-sm" onclick="goDash('profile')">Completar perfil</button>
    </div>
  </div>`;
  },

  // --- NOTIFICATIONS ---
  notifications: async (c) => {
    c.innerHTML = `<div style="width:100%">
    <div class="page-header">
      <div><div class="page-title">Notificações</div><div class="page-sub" id="notif-count-sub">Carregando...</div></div>
      <button class="btn btn-outline btn-sm" onclick="markAllRead()">✓ Marcar todas lidas</button>
    </div>
    <div id="notif-list"><div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:0 auto"></div></div></div>
  </div>`;
    await loadNotifications();
  },

  // --- SETTINGS ---
  settings: (c) => {
    const p = state.profile;
    c.innerHTML = `<div style="width:100%">
    <div><div class="page-title">Configurações</div><div class="page-sub" style="margin-bottom:24px">Gerencie sua conta</div></div>
    <div class="settings-list">
      <div class="settings-item" onclick="openEditName()"><div class="settings-icon">👤</div><div class="settings-text"><h3>Editar nome</h3><p>Altere seu nome de exibição</p></div><div class="settings-arrow">›</div></div>
      <div class="settings-item" onclick="openChangePwd()"><div class="settings-icon">🔒</div><div class="settings-text"><h3>Alterar senha</h3><p>Atualize sua senha de acesso</p></div><div class="settings-arrow">›</div></div>
      <div class="settings-item" onclick="openNotifSettings()"><div class="settings-icon">🔔</div><div class="settings-text"><h3>Notificações</h3><p>Configure suas preferências</p></div><div class="settings-arrow">›</div></div>
      <div class="settings-item" onclick="openThemeSettings()"><div class="settings-icon">${state.theme === 'dark' ? '🌙' : '☀️'}</div><div class="settings-text"><h3>Aparência</h3><p>Tema ${state.theme === 'dark' ? 'escuro' : 'claro'} ativo</p></div><div class="settings-arrow">›</div></div>
      <div class="settings-item" onclick="openPrivacySettings()"><div class="settings-icon">🛡️</div><div class="settings-text"><h3>Privacidade</h3><p>Controle de visibilidade</p></div><div class="settings-arrow">›</div></div>
      <div class="settings-item settings-danger" onclick="doLogout()"><div class="settings-icon">🚪</div><div class="settings-text"><h3>Sair</h3><p>Encerrar sessão</p></div></div>
    </div>
  </div>`;
  },

  // --- HELP ---
  help: (c) => {
    c.innerHTML = `<div style="width:100%">
    <div><div class="page-title">Central de Ajuda</div><div class="page-sub" style="margin-bottom:24px">Perguntas frequentes</div></div>
    ${[
        { q: 'Como cadastrar um serviço?', a: 'Acesse "Meu Perfil", clique em "Editar" e adicione suas informações. Com o perfil de Prestador, você aparece automaticamente na seção de Serviços.' },
        { q: 'Como publicar um vídeo?', a: 'Acesse "Vídeos" no menu e clique em "+ Novo vídeo". Selecione o arquivo, adicione título e publique.' },
        { q: 'Como anunciar uma vaga?', a: 'Acesse "Vagas" e clique em "+ Anunciar vaga". Preencha os dados e ela ficará visível para todos.' },
        { q: 'Como recuperar minha senha?', a: 'Na tela de login clique em "Entrar com Google" ou use o e-mail. O Supabase envia um link de redefinição.' },
        { q: 'Como editar meu perfil?', a: 'Acesse "Meu Perfil" e clique em "✏️ Editar". Altere nome, foto, descrição, telefone e cidade.' },
        { q: 'Como fazer upload de foto de perfil?', a: 'No "Meu Perfil", clique no ícone 📷 sobre sua foto. A imagem é salva automaticamente.' },
      ].map((h, i) => `
    <div class="help-item" id="help-${i}">
      <div class="help-q" onclick="toggleHelp(${i})"><span class="help-q-icon">❓</span><span class="help-q-text">${h.q}</span><span class="help-q-arrow">⌄</span></div>
      <div class="help-a">${h.a}</div>
    </div>`).join('')}
    <div style="background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.15);border-radius:var(--radius);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;flex-wrap:wrap">
      <div><p style="font-weight:600;font-size:14px">Não encontrou o que procurava?</p><p style="font-size:13px;color:var(--text2);margin-top:2px">Entre em contato com o suporte.</p></div>
      <button class="btn btn-primary btn-sm" onclick="window.open('mailto:suporte@iaa.com.br')">✉️ Falar com suporte</button>
    </div>
  </div>`;
  },

  // --- PERFIL-PRO (alias de profile para prestador) ---
  'perfil-pro': async (c) => {
    return renders.profile(c);
  },

  // --- PROMOCOES (alias de publications para empresa) ---
  'promocoes': async (c) => {
    return renders.publications(c);
  },

  // --- PERFIL (alias genérico de profile) ---
  'perfil': async (c) => {
    return renders.profile(c);
  },

}; // end renders

// =============================================
// DATA LOADERS
// =============================================
async function loadFeed() {
  const cont = document.getElementById('feed-items');
  if (!cont) return;
  let data = null, error = null;

  if (useLocalMode) {
    // Load from localStorage
    const pubs = localDB.getPublications();
    data = pubs.map(pub => {
      const profile = localDB.getProfile(pub.user_id);
      return { ...pub, profiles: profile || { full_name: 'Usuário', city: 'Alto Acre' } };
    });
  } else if (db) {
    try {
      const res = await db
        .from('publications')
        .select('*, profiles(full_name, avatar_url, phone, city)')
        .order('created_at', { ascending: false })
        .limit(20);
      data = res.data; error = res.error;
    } catch (err) { error = err; }
  }

  if (!data || data.length === 0) {
    cont.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text2)"><div style="font-size:48px;margin-bottom:12px">📢</div><h3 style="font-weight:700;margin-bottom:6px">Feed vazio</h3><p>Seja o primeiro a publicar no IAA!</p><button class="btn btn-primary btn-sm" style="margin-top:16px" onclick="openNewPublication()">+ Criar publicação</button></div>`;
    return;
  }
  cont.innerHTML = data.map(pub => feedItem(pub)).join('') +
    `<div style="text-align:center;padding:16px 0"><button class="btn btn-ghost" style="color:var(--text2)">Carregar mais</button></div>`;
}

async function loadClassifieds(category) {
  const cont = document.getElementById('classified-cards');
  if (!cont) return;
  cont.innerHTML = `<div style="text-align:center;padding:40px;grid-column:1/-1"><div class="loading-spinner" style="margin:0 auto"></div></div>`;
  let data = null;
  if (useLocalMode) {
    let cls = localDB.getClassifieds();
    if (category !== 'Todos') cls = cls.filter(c => c.category === category);
    data = cls.map(cl => {
      const profile = localDB.getProfile(cl.user_id);
      return { ...cl, profiles: profile || { full_name: 'Anunciante', phone: '' } };
    });
  } else if (db) {
    try {
      let query = db.from('classifieds').select('*, profiles(full_name, phone)').order('created_at', { ascending: false });
      if (category !== 'Todos') query = query.eq('category', category);
      const res = await query;
      data = res.data;
    } catch (err) { }
  }
  if (!data || data.length === 0) {
    cont.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text2)"><div style="font-size:48px;margin-bottom:12px">🏷️</div><p>Nenhum anúncio encontrado.</p></div>`;
  } else {
    cont.innerHTML = data.map(cl => classifiedCard(cl)).join('');
  }
}

function filterClassified(chipEl, category) {
  document.querySelectorAll('#classified-chips .chip').forEach(c => c.classList.remove('active'));
  chipEl.classList.add('active');
  loadClassifieds(category);
}

async function loadNotifications() {
  if (!state.user || !db) return;
  const cont = document.getElementById('notif-list');
  if (!cont) return;
  try {
    const { data } = await db.from('notifications').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(30);
    state.notifications = data || [];
  } catch (err) { }
  renderNotifList();
}

async function loadMyPublications() {
  if (!state.user) return;
  let data = null;
  if (useLocalMode) {
    data = localDB.getPublications().filter(p => p.user_id === state.user.id).slice(0, 3);
  } else if (db) {
    try {
      const res = await db.from('publications').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(3);
      data = res.data;
    } catch (err) { }
  }
  const cont = document.getElementById('my-pubs-preview');
  if (!cont) return;
  if (!data || data.length === 0) {
    cont.innerHTML = `
      <div class="pubs-empty-state">
        <div class="empty-state-icon-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
            <path d="M3.3 7 12 12l8.7-5"/>
            <path d="M12 22V12"/>
          </svg>
        </div>
        <p class="empty-state-text">Nenhuma publicação ainda.</p>
      </div>
    `;
  } else {
    cont.innerHTML = data.map(p => pubCard(p)).join('');
  }
}

// =============================================
// CARD BUILDERS
// =============================================
function feedItem(pub) {
  const p = pub.profiles;
  const name = p?.full_name || 'Usuário';
  const avatar = p?.avatar_url ? `<img src="${p.avatar_url}" alt=""/>` : name.charAt(0).toUpperCase();
  const phone = p?.phone || '';
  const city = p?.city || 'Alto Acre';
  const timeAgo = formatTimeAgo(pub.created_at);
  const typeColors = { service: 'badge-blue', job: 'badge-yellow', classified: 'badge-green', video: 'badge-red', business: 'badge-teal' };
  const typeLabels = { service: 'Serviço', job: 'Vaga', classified: 'Classificado', video: 'Vídeo', business: 'Empresa' };
  const badgeClass = typeColors[pub.type] || 'badge-blue';
  const badgeLabel = typeLabels[pub.type] || 'Post';
  const liked = state.liked.has(pub.id);
  return `<div class="feed-item">
    <div class="feed-author">
      <div class="feed-author-left">
        <div class="feed-avatar">${avatar}</div>
        <div><div class="feed-name">${escHtml(name)}</div><div class="feed-meta">${escHtml(city)} · ${timeAgo}</div></div>
      </div>
      <span class="badge ${badgeClass}">${badgeLabel}</span>
    </div>
    ${pub.video_url ? `<div class="feed-video-thumb"><div class="play-btn">▶️</div></div>` : ''}
    <div class="feed-title">${escHtml(pub.title || '')}</div>
    <div class="feed-desc">${escHtml(pub.description || '')}</div>
    ${pub.price ? `<div class="feed-tags"><span class="badge badge-green">💰 ${escHtml(pub.price)}</span></div>` : ''}
    <div class="feed-actions">
      <div class="feed-action${liked ? ' liked' : ''}" onclick="toggleLike('${pub.id}',this)">❤️ ${(pub.likes_count || 0) + (liked ? 1 : 0)}</div>
      <div class="feed-action">💬 Comentar</div>
      <div class="feed-action">↗️ Compartilhar</div>
      ${phone ? `<div class="feed-action-right"><button class="btn btn-primary btn-sm" onclick="contactWA('${escAttr(phone)}','${escAttr(name)}')">📱 Contato</button></div>` : ''}
    </div>
  </div>`;
}

function serviceCard(p) {
  const name = p.full_name || 'Prestador';
  const phone = p.phone || '';
  const avatar = p.avatar_url ? `<img src="${p.avatar_url}" alt=""/>` : name.charAt(0).toUpperCase();
  return `<div class="service-card">
    <div class="sc-top">
      <div class="sc-avatar" style="background:rgba(37,99,235,.1);color:var(--brand)">${avatar}</div>
      <div class="sc-info">
        <h3>${escHtml(name)}</h3>
        <p>${escHtml(p.service_title || 'Prestador de serviço')}</p>
        <div class="sc-meta">
          ${p.city ? `<span>📍 ${escHtml(p.city)}</span>` : ''}
          ${p.rating ? `<span>⭐ ${p.rating}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="sc-btns">
      <button class="btn btn-outline btn-sm" style="flex:1" onclick="openProfileModal(${JSON.stringify({ name: p.full_name || '', desc: p.bio || '', city: p.city || '', phone: p.phone || '', schedule: p.schedule || '', rating: p.rating || '' }).replace(/"/g, '&quot;')})">👤 Ver perfil</button>
      ${phone ? `<button class="btn btn-primary btn-sm" style="flex:1" onclick="contactWA('${escAttr(phone)}','${escAttr(name)}')">📱 Contato</button>` : ''}
    </div>
  </div>`;
}

function bizCard(p) {
  const name = p.full_name || p.business_name || 'Empresa';
  const phone = p.phone || '';
  const avatar = p.avatar_url ? `<img src="${p.avatar_url}" alt=""/>` : name.charAt(0).toUpperCase();
  return `<div class="service-card">
    <div class="sc-top">
      <div class="sc-avatar" style="background:rgba(20,184,166,.1);color:var(--accent)">${avatar}</div>
      <div class="sc-info">
        <h3>${escHtml(name)} ${p.verified ? '✅' : ''}</h3>
        <span class="badge badge-teal" style="display:inline-flex;margin-bottom:4px;font-size:10px">${escHtml(p.category || 'Empresa')}</span>
        <div class="sc-meta">
          ${p.city ? `<span>📍 ${escHtml(p.city)}</span>` : ''}
          ${p.rating ? `<span>⭐ ${p.rating}</span>` : ''}
        </div>
      </div>
    </div>
    <div class="sc-btns">
      <button class="btn btn-outline btn-sm" style="flex:1" onclick="openProfileModal(${JSON.stringify({ name: p.full_name || '', desc: p.bio || '', city: p.city || '', phone: p.phone || '', schedule: p.schedule || '', rating: p.rating || '' }).replace(/"/g, '&quot;')})">Ver perfil</button>
      ${phone ? `<button class="btn btn-primary btn-sm" style="flex:1" onclick="contactWA('${escAttr(phone)}','${escAttr(name)}')">📱 Contato</button>` : ''}
    </div>
  </div>`;
}

function jobCard(j) {
  const p = j.profiles || {};
  const company = j.company_name || p.full_name || 'Empresa';
  const phone = j.contact_phone || p.phone || '';
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;transition:box-shadow .15s" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.08)'" onmouseout="this.style.boxShadow=''">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div style="flex:1">
        <h3 style="font-size:15px;font-weight:700;margin-bottom:3px">${escHtml(j.title || '')}</h3>
        <p style="font-size:13px;color:var(--text2);margin-bottom:6px">🏢 ${escHtml(company)}</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:var(--text2);margin-bottom:8px">
          ${j.city ? `<span>📍 ${escHtml(j.city)}</span>` : ''}
          ${j.job_type ? `<span>🕐 ${escHtml(j.job_type)}</span>` : ''}
          ${j.salary ? `<span style="color:var(--success);font-weight:600">💰 ${escHtml(j.salary)}</span>` : ''}
        </div>
        <p style="font-size:13px;color:var(--text2)">${escHtml((j.description || '').substring(0, 120))}${(j.description || '').length > 120 ? '...' : ''}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn btn-outline btn-sm" onclick="openJobDetail(${JSON.stringify(j).replace(/"/g, '&quot;')})">Ver detalhes</button>
        ${phone ? `<button class="btn btn-primary btn-sm" onclick="contactJobWA('${escAttr(phone)}','${escAttr(j.title || '')}')">📱 Candidatar</button>` : ''}
      </div>
    </div>
  </div>`;
}

function classifiedCard(cl) {
  const p = cl.profiles || {};
  const seller = p.full_name || 'Anunciante';
  const phone = cl.contact_phone || p.phone || '';
  return `<div class="service-card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <span class="badge badge-green">${escHtml(cl.category || '')}</span>
      <span style="font-size:15px;font-weight:700;color:var(--success)">${escHtml(cl.price || '')}</span>
    </div>
    <h3 style="font-size:15px;font-weight:700;margin-bottom:4px">${escHtml(cl.title || '')}</h3>
    <p style="font-size:13px;color:var(--text2);margin-bottom:8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(cl.description || '')}</p>
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px">📍 ${escHtml(cl.city || '')} · ${escHtml(seller)}</div>
    <div class="sc-btns">
      <button class="btn btn-outline btn-sm" style="flex:1" onclick="openClassifiedDetail(${JSON.stringify(cl).replace(/"/g, '&quot;')})">Ver detalhes</button>
      ${phone ? `<button class="btn btn-primary btn-sm" style="flex:1" onclick="contactClassifiedWA('${escAttr(phone)}','${escAttr(cl.title || '')}','${escAttr(cl.price || '')}')">📱 Contato</button>` : ''}
    </div>
  </div>`;
}

function videoCard(v, idx) {
  const p = v.profiles || {};
  const author = p.full_name || 'Usuário';
  const thumbBg = v.thumbnail_url
    ? `background-image:url('${v.thumbnail_url}');background-size:cover;background-position:center`
    : `background:linear-gradient(135deg,rgba(37,99,235,.18),rgba(14,165,233,.12))`;
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;cursor:pointer;transition:box-shadow .2s,transform .2s" onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,.12)';this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='';this.style.transform=''" onclick="openTikTokViewer(${idx})">
    <div style="height:160px;${thumbBg};display:flex;align-items:center;justify-content:center;position:relative">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,.15)"></div>
      <div style="position:relative;width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 12px rgba(0,0,0,.25);transition:transform .15s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform=''">▶️</div>
    </div>
    <div style="padding:12px 14px">
      <p style="font-size:14px;font-weight:600;margin-bottom:4px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(v.title || '')}</p>
      <p style="font-size:12px;color:var(--text2)">${escHtml(author)} · ${v.views_count || 0} visualizações</p>
    </div>
  </div>`;
}

// =============================================
// TIKTOK FULLSCREEN VIEWER
// =============================================
function openTikTokViewer(startIdx) {
  const videos = window._tiktokVideos || [];
  if (!videos.length) return;

  // Remove existing viewer if any
  const existing = document.getElementById('tiktok-viewer-overlay');
  if (existing) existing.remove();

  // Lock body scroll
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = 'tiktok-viewer-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: tkFadeIn .25s ease;
  `;

  // Build inner HTML
  overlay.innerHTML = `
    <style>
      @keyframes tkFadeIn { from { opacity:0 } to { opacity:1 } }
      #tiktok-scroll::-webkit-scrollbar { display: none; }
      #tiktok-scroll { scrollbar-width: none; }
      .tk-slide { scroll-snap-align: start; flex-shrink: 0; }
    </style>

    <!-- Back button -->
    <button onclick="closeTikTokViewer()" style="
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 10001;
      background: rgba(0,0,0,.65);
      border: 1.5px solid rgba(255,255,255,.2);
      color: #fff;
      border-radius: 50px;
      padding: 8px 18px 8px 14px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      backdrop-filter: blur(8px);
      transition: background .2s;
    " onmouseover="this.style.background='rgba(255,255,255,.15)'" onmouseout="this.style.background='rgba(0,0,0,.65)'">
      ← Voltar
    </button>

    <!-- Centered phone column -->
    <div style="position:relative;display:flex;align-items:center;gap:24px;height:100vh">

      <!-- Video scroll column -->
      <div id="tiktok-scroll" style="
        width: min(420px, 100vw);
        height: 100vh;
        overflow-y: scroll;
        scroll-snap-type: y mandatory;
        -webkit-overflow-scrolling: touch;
        position: relative;
      ">
        ${videos.map((v, idx) => buildTkSlide(v, idx)).join('')}
      </div>

      <!-- Right action bar (desktop) -->
      <div id="tk-action-bar" style="display:flex;flex-direction:column;align-items:center;gap:24px;padding:16px 0">
        <button onclick="openUploadVideo()" title="Publicar vídeo" style="
          width: 52px; height: 52px; border-radius: 50%;
          background: var(--brand); color: #fff; border: none; cursor: pointer;
          font-size: 22px; display:flex;align-items:center;justify-content:center;
          box-shadow: 0 4px 16px rgba(79,70,229,.4); transition: transform .2s;
        " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform=''">＋</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Scroll to the clicked video
  requestAnimationFrame(() => {
    const scroll = document.getElementById('tiktok-scroll');
    if (scroll && startIdx > 0) {
      scroll.scrollTop = startIdx * window.innerHeight;
    }

    // Auto-play / pause with IntersectionObserver
    const videoEls = overlay.querySelectorAll('.tk-native-video');
    if (videoEls.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.play().catch(() => {});
          else entry.target.pause();
        });
      }, { threshold: 0.6, root: document.getElementById('tiktok-scroll') });
      videoEls.forEach(el => io.observe(el));
    }
  });
}

function buildTkSlide(v, idx) {
  const author = (v.profiles && v.profiles.full_name) || 'Usuário';
  const avatarUrl = v.profiles && v.profiles.avatar_url;
  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    : `<span style="font-size:18px;font-weight:700;color:#fff">${escHtml(author.charAt(0).toUpperCase())}</span>`;
  const url = v.video_url || '';
  const title = escHtml(v.title || '');
  const desc = escHtml(v.description || '');

  let mediaHtml = '';
  if (!url) {
    mediaHtml = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#666"><div style="font-size:52px">📹</div><p>Vídeo indisponível</p></div>`;
  } else if (/youtube\.com|youtu\.be/.test(url)) {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
    const videoId = ytMatch ? ytMatch[1] : '';
    mediaHtml = videoId
      ? `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0" frameborder="0" allow="autoplay;encrypted-media" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`
      : `<div style="color:#666;padding:32px;text-align:center">Link inválido</div>`;
  } else if (/drive\.google\.com/.test(url)) {
    const driveMatch = url.match(/\/d\/([^/]+)/);
    const fileId = driveMatch ? driveMatch[1] : '';
    mediaHtml = fileId
      ? `<iframe src="https://drive.google.com/file/d/${fileId}/preview" frameborder="0" allow="autoplay" style="position:absolute;inset:0;width:100%;height:100%;border:none"></iframe>`
      : `<div style="color:#666;padding:32px;text-align:center">Link inválido</div>`;
  } else {
    const mime = url.startsWith('data:') ? url.split(';')[0].replace('data:', '') : 'video/mp4';
    mediaHtml = `<video class="tk-native-video" loop playsinline preload="metadata"
      style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;cursor:pointer;background:#000"
      onclick="this.paused ? this.play() : this.pause()">
      <source src="${url}" type="${mime}">
    </video>`;
  }

  return `<div class="tk-slide" style="
    position: relative;
    width: 100%;
    height: 100vh;
    background: #0a0a0a;
    overflow: hidden;
  ">
    <!-- Media -->
    <div style="position:absolute;inset:0">${mediaHtml}</div>

    <!-- Bottom gradient -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:55%;background:linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.2) 65%,transparent 100%);pointer-events:none"></div>

    <!-- Right actions -->
    <div style="position:absolute;right:12px;bottom:100px;display:flex;flex-direction:column;align-items:center;gap:20px;z-index:5">
      <div style="position:relative">
        <div style="width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid rgba(255,255,255,.6);backdrop-filter:blur(4px)">
          ${avatarHtml}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="tiktokLike(this)">
        <div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:20px;backdrop-filter:blur(4px);transition:transform .15s">❤️</div>
        <span style="font-size:11px;color:#fff;font-weight:600">${v.likes_count || 0}</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
        <div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:20px;backdrop-filter:blur(4px)">💬</div>
        <span style="font-size:11px;color:#fff;font-weight:600">0</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="tiktokShare('${escAttr(v.title || '')}','${escAttr(url)}')">
        <div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:20px;backdrop-filter:blur(4px)">↗️</div>
        <span style="font-size:11px;color:#fff;font-weight:600">Share</span>
      </div>
    </div>

    <!-- Bottom info -->
    <div style="position:absolute;bottom:20px;left:14px;right:70px;z-index:5">
      <p style="font-size:13px;font-weight:700;color:rgba(255,255,255,.9);margin-bottom:4px">@${escHtml(author)}</p>
      <p style="font-size:14px;font-weight:600;color:#fff;margin-bottom:4px;line-height:1.3">${title}</p>
      ${desc ? `<p style="font-size:12px;color:rgba(255,255,255,.75);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${desc}</p>` : ''}
    </div>

    <!-- Video number indicator -->
    <div style="position:absolute;top:70px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.45);backdrop-filter:blur(6px);border-radius:99px;padding:3px 10px;font-size:11px;color:rgba(255,255,255,.7)">${idx + 1} / ${(window._tiktokVideos||[]).length}</div>
  </div>`;
}

function closeTikTokViewer() {
  const overlay = document.getElementById('tiktok-viewer-overlay');
  if (overlay) {
    overlay.style.animation = 'tkFadeIn .2s ease reverse';
    setTimeout(() => overlay.remove(), 200);
  }
  document.body.style.overflow = '';
}



// =============================================
// TIKTOK VIDEO ITEM
// =============================================
function tiktokVideoItem(v, idx) {
  const author = (v.profiles && v.profiles.full_name) || 'Usuário';
  const avatarUrl = v.profiles && v.profiles.avatar_url;
  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
    : `<span style="font-size:16px;font-weight:700">${escHtml(author.charAt(0).toUpperCase())}</span>`;
  const url = v.video_url || '';
  const title = escHtml(v.title || '');
  const desc = escHtml(v.description || '');

  // Build the video player element
  let mediaHtml = '';
  if (!url) {
    mediaHtml = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111;color:#888;flex-direction:column;gap:12px">
      <div style="font-size:56px">📹</div><p>Vídeo indisponível</p>
    </div>`;
  } else if (/youtube\.com|youtu\.be/.test(url)) {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
    const videoId = ytMatch ? ytMatch[1] : '';
    mediaHtml = videoId
      ? `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1" frameborder="0" allow="autoplay;encrypted-media" allowfullscreen style="width:100%;height:100%;object-fit:cover"></iframe>`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111;color:#888">Link inválido</div>`;
  } else if (/drive\.google\.com/.test(url)) {
    const driveMatch = url.match(/\/d\/([^/]+)/);
    const fileId = driveMatch ? driveMatch[1] : '';
    mediaHtml = fileId
      ? `<iframe src="https://drive.google.com/file/d/${fileId}/preview" frameborder="0" allow="autoplay" style="width:100%;height:100%;border:none"></iframe>`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111;color:#888">Link inválido</div>`;
  } else {
    // Native <video> — handles mp4, webm, base64
    const mime = url.startsWith('data:') ? url.split(';')[0].replace('data:', '') : 'video/mp4';
    mediaHtml = `<video class="tiktok-video-el" loop playsinline preload="metadata"
      style="width:100%;height:100%;object-fit:cover;display:block"
      onclick="this.paused ? this.play() : this.pause()">
      <source src="${url}" type="${mime}">
    </video>`;
  }

  return `<div class="tiktok-item" data-idx="${idx}" style="
    position: relative;
    height: calc(100vh - 60px);
    width: 100%;
    scroll-snap-align: start;
    overflow: hidden;
    background: #000;
    flex-shrink: 0;
  ">
    <!-- Media layer -->
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
      ${mediaHtml}
    </div>

    <!-- Gradient overlay bottom -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:65%;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.3) 60%,transparent 100%);pointer-events:none"></div>

    <!-- Right actions bar -->
    <div style="position:absolute;right:16px;bottom:120px;display:flex;flex-direction:column;align-items:center;gap:20px;z-index:10">
      <!-- Avatar -->
      <div style="position:relative">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;border:2px solid #fff;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.4)">
          ${avatarHtml}
        </div>
        <div style="position:absolute;bottom:-10px;left:50%;transform:translateX(-50%);width:20px;height:20px;border-radius:50%;background:var(--brand);display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;border:2px solid #000">+</div>
      </div>
      <!-- Like -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="tiktokLike(this)">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:22px;backdrop-filter:blur(4px)">❤️</div>
        <span style="font-size:12px;color:#fff;font-weight:600">${v.likes_count || 0}</span>
      </div>
      <!-- Comment -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:22px;backdrop-filter:blur(4px)">💬</div>
        <span style="font-size:12px;color:#fff;font-weight:600">0</span>
      </div>
      <!-- Share -->
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer" onclick="tiktokShare('${escAttr(v.title || '')}','${escAttr(url)}')">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:22px;backdrop-filter:blur(4px)">↗️</div>
        <span style="font-size:12px;color:#fff;font-weight:600">Compartilhar</span>
      </div>
    </div>

    <!-- Bottom info -->
    <div style="position:absolute;bottom:24px;left:16px;right:76px;z-index:10">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:14px;font-weight:700;color:#fff">@${escHtml(author)}</span>
      </div>
      <p style="font-size:15px;font-weight:600;color:#fff;margin-bottom:4px;line-height:1.3">${title}</p>
      ${desc ? `<p style="font-size:13px;color:rgba(255,255,255,.8);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${desc}</p>` : ''}
    </div>
  </div>`;
}

function tiktokLike(btn) {
  const heart = btn.querySelector('div');
  const count = btn.querySelector('span');
  const liked = btn.dataset.liked === '1';
  btn.dataset.liked = liked ? '0' : '1';
  heart.textContent = liked ? '❤️' : '🩷';
  count.textContent = Math.max(0, parseInt(count.textContent || '0') + (liked ? -1 : 1));
  heart.style.transform = 'scale(1.35)';
  setTimeout(() => heart.style.transform = '', 200);
}

function tiktokShare(title, url) {
  if (navigator.share) {
    navigator.share({ title: title || 'Vídeo IAA', url: url || location.href }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url || location.href).then(() => showToast('Link copiado!')).catch(() => showToast('Não foi possível compartilhar'));
  }
}

// Restore dash-content defaults when leaving TikTok mode
function resetDashContent() {
  const c = document.getElementById('user-content') || document.getElementById('prestador-content') || document.getElementById('empresa-content');
  if (c) {
    c.style.padding = '';
    c.style.maxWidth = '';
    c.style.overflow = '';
  }
}

function openVideoPlayer(dataStr) {
  let v = dataStr;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { return; } }

  const title = v.title || 'Vídeo';
  const url = v.video_url || '';
  const desc = v.description || '';
  const author = (v.profiles && v.profiles.full_name) || 'Usuário';

  let playerHtml = '';

  if (!url) {
    playerHtml = `<div style="text-align:center;padding:40px;color:var(--text2)">
      <div style="font-size:48px;margin-bottom:12px">📹</div>
      <p>URL do vídeo não disponível.</p>
    </div>`;
  } else if (/youtube\.com|youtu\.be/.test(url)) {
    // YouTube embed
    let videoId = '';
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
    if (ytMatch) videoId = ytMatch[1];
    if (videoId) {
      playerHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:var(--radius-sm);overflow:hidden">
        <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%"></iframe>
      </div>`;
    } else {
      playerHtml = `<p style="color:var(--text2);font-size:13px">Não foi possível carregar o vídeo do YouTube.</p>`;
    }
  } else if (/drive\.google\.com/.test(url)) {
    // Google Drive embed
    const driveMatch = url.match(/\/d\/([^/]+)/);
    const fileId = driveMatch ? driveMatch[1] : '';
    if (fileId) {
      playerHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;border-radius:var(--radius-sm);overflow:hidden">
        <iframe src="https://drive.google.com/file/d/${fileId}/preview" frameborder="0" allow="autoplay" style="position:absolute;inset:0;width:100%;height:100%"></iframe>
      </div>`;
    } else {
      playerHtml = `<a href="${escHtml(url)}" target="_blank" class="btn btn-primary btn-sm">▶️ Abrir no Google Drive</a>`;
    }
  } else if (url.startsWith('data:video/') || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) {
    // Direct video file or base64
    playerHtml = `<div style="border-radius:var(--radius-sm);overflow:hidden;background:#000">
      <video controls autoplay style="width:100%;max-height:420px;display:block" preload="metadata">
        <source src="${url}" type="${url.startsWith('data:') ? url.split(';')[0].replace('data:', '') : 'video/mp4'}">
        Seu navegador não suporta reprodução de vídeo.
      </video>
    </div>`;
  } else {
    // Generic URL fallback — show a link
    playerHtml = `<div style="text-align:center;padding:24px">
      <p style="font-size:14px;color:var(--text2);margin-bottom:16px">Clique para abrir o vídeo externamente:</p>
      <a href="${escHtml(url)}" target="_blank" rel="noopener" class="btn btn-primary">▶️ Assistir vídeo</a>
    </div>`;
  }

  const metaHtml = desc
    ? `<p style="font-size:13px;color:var(--text2);margin-top:14px;line-height:1.6">${escHtml(desc)}</p>`
    : '';

  openModal(title, `
    ${playerHtml}
    <div style="margin-top:12px;display:flex;align-items:center;gap:8px">
      <div style="width:28px;height:28px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${escHtml(author.charAt(0).toUpperCase())}</div>
      <span style="font-size:13px;font-weight:600;color:var(--text)">${escHtml(author)}</span>
    </div>
    ${metaHtml}
  `, `<button class="btn btn-outline btn-sm" onclick="closeModal()">Fechar</button>`);
}

function photoCard(ph) {
  return `<div style="border-radius:var(--radius-sm);overflow:hidden;position:relative;aspect-ratio:1;background:var(--border);cursor:pointer" onclick="openPhotoModal('${escAttr(ph.photo_url || '')}','${escAttr(ph.caption || '')}')">
    ${ph.photo_url ? `<img src="${ph.photo_url}" alt="" style="width:100%;height:100%;object-fit:cover"/>` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:32px">📷</div>'}
    ${ph.caption ? `<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.7));padding:8px;color:#fff;font-size:11px">${escHtml(ph.caption)}</div>` : ''}
  </div>`;
}

function pubCard(pub) {
  const timeAgo = formatTimeAgo(pub.created_at);
  const typeLabels = { service: 'Serviço', job: 'Vaga', classified: 'Classificado', video: 'Vídeo', business: 'Empresa' };
  return `<div style="padding:14px 0;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
    <div style="flex:1">
      <div style="font-size:13px;font-weight:700;margin-bottom:2px">${escHtml(pub.title || '')}</div>
      <div style="font-size:12px;color:var(--text2)">${typeLabels[pub.type] || 'Post'} · ${timeAgo}</div>
    </div>
    <button class="btn btn-outline btn-sm" onclick="deletePub('${pub.id}')" style="color:var(--danger);border-color:rgba(239,68,68,.2);font-size:11px">Excluir</button>
  </div>`;
}

// =============================================
// ACTIONS
// =============================================
async function toggleLike(id, el) {
  if (state.liked.has(id)) {
    state.liked.delete(id);
    el.classList.remove('liked');
    const count = parseInt(el.textContent.replace(/\D/g, '')) || 0;
    el.innerHTML = `❤️ ${Math.max(0, count - 1)}`;
    if (db) await db.rpc('decrement_likes', { pub_id: id }).catch(() => { });
  } else {
    state.liked.add(id);
    el.classList.add('liked');
    const count = parseInt(el.textContent.replace(/\D/g, '')) || 0;
    el.innerHTML = `❤️ ${count + 1}`;
    if (db) await db.rpc('increment_likes', { pub_id: id }).catch(() => { });
  }
}

function contactWA(phone, name) {
  const msg = encodeURIComponent(`Olá ${name}! Vi seu perfil no IAA - Interligação Alto Acre e gostaria de solicitar um orçamento.`);
  window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
}

function contactJobWA(phone, title) {
  const msg = encodeURIComponent(`Olá! Vi a vaga "${title}" no IAA - Interligação Alto Acre e tenho interesse em me candidatar.`);
  window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
}

function contactClassifiedWA(phone, title, price) {
  const msg = encodeURIComponent(`Olá! Vi seu anúncio "${title}" por ${price} no IAA. Ainda está disponível?`);
  window.open(`https://wa.me/55${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
}

function filterCards(val, containerId) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.querySelectorAll('.service-card,[data-card]').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(val.toLowerCase()) || !val ? '' : 'none';
  });
}

async function deletePub(id) {
  if (!confirm('Excluir esta publicação?')) return;
  if (useLocalMode) {
    localDB.deletePublication(id);
    showToast('Publicação excluída');
    goDash('publications');
    return;
  }
  if (!db) { showToast('Erro de conexão'); return; }
  try {
    const { error } = await db.from('publications').delete().eq('id', id).eq('user_id', state.user.id);
    if (error) { showToast('Erro ao excluir'); return; }
    showToast('Publicação excluída');
    goDash('publications');
  } catch (err) { showToast('Erro inesperado'); }
}

// =============================================
// MODAL SYSTEM
// =============================================
function openModal(title, bodyHTML, footerHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML || '';
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-overlay'))
    document.getElementById('modal-overlay').classList.remove('open');
}

// =============================================
// PROFILE MODALS
// =============================================
function openProfileModal(dataStr) {
  let data = dataStr;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { return; }
  }
  openModal(data.name || 'Perfil', `
    <p style="font-size:14px;color:var(--text2);margin-bottom:14px">${escHtml(data.desc || '')}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${[['📍 Cidade', data.city], ['⭐ Avaliação', data.rating || '—'], ['🕐 Horário', data.schedule || '—']].filter(([, v]) => v).map(([l, v]) => `<div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px"><p style="font-size:11px;color:var(--text3);margin-bottom:2px">${l}</p><p style="font-size:13px;font-weight:600">${escHtml(String(v))}</p></div>`).join('')}
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Fechar</button>
     ${data.phone ? `<button class="btn btn-primary btn-sm" onclick="contactWA('${escAttr(data.phone)}','${escAttr(data.name || '')}');closeModal()">📱 Contato WhatsApp</button>` : ''}`
  );
}

function openJobDetail(dataStr) {
  let j = dataStr;
  if (typeof j === 'string') { try { j = JSON.parse(j); } catch (e) { return; } }
  const phone = j.contact_phone || (j.profiles && j.profiles.phone) || '';
  openModal(j.title || 'Vaga', `
    <p style="font-size:13px;color:var(--text2);margin-bottom:4px">🏢 ${escHtml(j.company_name || '')} · 📍 ${escHtml(j.city || '')}</p>
    <div style="display:flex;gap:8px;margin:10px 0 14px;flex-wrap:wrap">
      ${j.job_type ? `<span class="badge badge-blue">${escHtml(j.job_type)}</span>` : ''}
      ${j.salary ? `<span class="badge badge-green">${escHtml(j.salary)}</span>` : ''}
    </div>
    <p style="font-size:14px;color:var(--text2);margin-bottom:14px">${escHtml(j.description || '')}</p>
    ${j.requirements ? `<h4 style="font-size:13px;font-weight:700;margin-bottom:8px">Requisitos</h4><p style="font-size:13px;color:var(--text2);margin-bottom:14px">${escHtml(j.requirements)}</p>` : ''}
    ${j.benefits ? `<h4 style="font-size:13px;font-weight:700;margin-bottom:8px">Benefícios</h4><p style="font-size:13px;color:var(--text2)">${escHtml(j.benefits)}</p>` : ''}`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Fechar</button>
     ${phone ? `<button class="btn btn-primary btn-sm" onclick="contactJobWA('${escAttr(phone)}','${escAttr(j.title || '')}');closeModal()">📱 Candidatar via WhatsApp</button>` : ''}`
  );
}

function openClassifiedDetail(dataStr) {
  let cl = dataStr;
  if (typeof cl === 'string') { try { cl = JSON.parse(cl); } catch (e) { return; } }
  const phone = cl.contact_phone || (cl.profiles && cl.profiles.phone) || '';
  openModal(cl.title || 'Anúncio', `
    <p style="font-size:18px;font-weight:700;color:var(--success);margin-bottom:12px">${escHtml(cl.price || '')}</p>
    <p style="font-size:14px;color:var(--text2);margin-bottom:14px">${escHtml(cl.description || '')}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${[['📍 Localização', cl.city], ['🏷️ Categoria', cl.category], ['📦 Estado', cl.condition]].filter(([, v]) => v).map(([l, v]) => `<div style="background:var(--bg);border-radius:var(--radius-sm);padding:10px"><p style="font-size:11px;color:var(--text3);margin-bottom:2px">${l}</p><p style="font-size:13px;font-weight:600">${escHtml(String(v))}</p></div>`).join('')}
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Fechar</button>
     ${phone ? `<button class="btn btn-primary btn-sm" onclick="contactClassifiedWA('${escAttr(phone)}','${escAttr(cl.title || '')}','${escAttr(cl.price || '')}');closeModal()">📱 Contato WhatsApp</button>` : ''}`
  );
}

function openPhotoModal(url, caption) {
  openModal(caption || 'Foto', `<img src="${url}" style="width:100%;border-radius:var(--radius-sm)"/>`, `<button class="btn btn-outline btn-sm" onclick="closeModal()">Fechar</button>`);
}

// =============================================
// PUBLISH MODALS — salvam no banco
// =============================================
function openNewPublication() {
  openModal('Nova publicação', `
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Tipo *</label>
      <select id="pub-type" class="form-input2" style="height:44px">
        <option value="service">Serviço</option>
        <option value="job">Vaga</option>
        <option value="classified">Classificado</option>
        <option value="video">Vídeo</option>
      </select>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Título *</label>
      <input id="pub-title" class="form-input2" placeholder="Título da publicação"/>
    </div>
    <div>
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Descrição</label>
      <textarea id="pub-desc" class="form-input2" rows="3" placeholder="Descreva..."></textarea>
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary btn-sm" onclick="savePublication()">Publicar</button>`
  );
}

async function savePublication() {
  if (!state.user) return;
  const title = document.getElementById('pub-title')?.value.trim();
  const type = document.getElementById('pub-type')?.value;
  const description = document.getElementById('pub-desc')?.value.trim();
  if (!title) { alert('Digite um título'); return; }

  const pubData = {
    id: 'pub_' + Date.now(),
    user_id: state.user.id,
    title, type, description,
    created_at: new Date().toISOString(),
  };

  if (useLocalMode) {
    localDB.savePublication(pubData);
    updateLandingStats();
    closeModal();
    showToast('Publicação criada!');
    goDash('feed');
    return;
  }

  if (!db) return;
  try {
    const { error } = await db.from('publications').insert(pubData);
    if (error) { showToast('Erro: ' + error.message); return; }
    closeModal();
    showToast('Publicação criada!');
    goDash('feed');
  } catch (err) { showToast('Erro inesperado'); }
}

function openNewJob() {
  openModal('Nova vaga', `
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Cargo *</label>
      <input id="job-title" class="form-input2" placeholder="Ex: Atendente de loja"/>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Empresa</label>
      <input id="job-company" class="form-input2" placeholder="Nome da empresa"/>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div>
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Tipo</label>
        <select id="job-type" class="form-input2" style="height:44px">
          <option>CLT</option><option>PJ</option><option>Autônomo</option><option>Meio período</option><option>Temporário</option>
        </select>
      </div>
      <div>
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Salário</label>
        <input id="job-salary" class="form-input2" placeholder="Ex: R$ 1.500"/>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Cidade</label>
      <input id="job-city" class="form-input2" placeholder="Brasiléia ou Epitaciolândia"/>
    </div>
    <div>
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Descrição</label>
      <textarea id="job-desc" class="form-input2" rows="3" placeholder="Descreva a vaga..."></textarea>
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary btn-sm" onclick="saveJob()">Publicar vaga</button>`
  );
}

async function saveJob() {
  if (!state.user) return;
  const title = document.getElementById('job-title')?.value.trim();
  if (!title) { alert('Digite o cargo'); return; }

  const jobData = {
    id: 'job_' + Date.now(),
    user_id: state.user.id,
    title,
    company_name: document.getElementById('job-company')?.value.trim(),
    job_type: document.getElementById('job-type')?.value,
    salary: document.getElementById('job-salary')?.value.trim(),
    city: document.getElementById('job-city')?.value.trim(),
    description: document.getElementById('job-desc')?.value.trim(),
    contact_phone: state.profile?.phone,
    created_at: new Date().toISOString(),
  };

  if (useLocalMode) {
    localDB.saveJob(jobData);
    updateLandingStats();
    closeModal(); showToast('Vaga publicada!'); goDash('jobs');
    return;
  }

  if (!db) return;
  try {
    const { error } = await db.from('jobs').insert(jobData);
    if (error) { showToast('Erro: ' + error.message); return; }
    updateLandingStats();
    closeModal(); showToast('Vaga publicada!'); goDash('jobs');
  } catch (err) { showToast('Erro inesperado'); }
}

function openNewClassified() {
  openModal('Novo classificado', `
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Título *</label>
      <input id="cl-title" class="form-input2" placeholder="Ex: iPhone 12 64GB"/>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div>
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Categoria</label>
        <select id="cl-cat" class="form-input2" style="height:44px">
          <option>Eletrônicos</option><option>Móveis</option><option>Veículos</option><option>Aluguel</option><option>Eletrodomésticos</option><option>Imóveis</option><option>Outros</option>
        </select>
      </div>
      <div>
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Preço</label>
        <input id="cl-price" class="form-input2" placeholder="R$ 0"/>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Cidade</label>
      <input id="cl-city" class="form-input2" placeholder="Brasiléia ou Epitaciolândia"/>
    </div>
    <div>
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Descrição</label>
      <textarea id="cl-desc" class="form-input2" rows="3" placeholder="Descreva o produto..."></textarea>
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary btn-sm" onclick="saveClassified()">Publicar</button>`
  );
}

async function saveClassified() {
  if (!state.user) return;
  const title = document.getElementById('cl-title')?.value.trim();
  if (!title) { alert('Digite o título'); return; }

  const clData = {
    id: 'cl_' + Date.now(),
    user_id: state.user.id,
    title,
    category: document.getElementById('cl-cat')?.value,
    price: document.getElementById('cl-price')?.value.trim(),
    city: document.getElementById('cl-city')?.value.trim(),
    description: document.getElementById('cl-desc')?.value.trim(),
    contact_phone: state.profile?.phone,
    created_at: new Date().toISOString(),
  };

  if (useLocalMode) {
    localDB.saveClassified(clData);
    updateLandingStats();
    closeModal(); showToast('Anúncio publicado!'); goDash('classifieds');
    return;
  }

  if (!db) return;
  try {
    const { error } = await db.from('classifieds').insert(clData);
    if (error) { showToast('Erro: ' + error.message); return; }
    updateLandingStats();
    closeModal(); showToast('Anúncio publicado!'); goDash('classifieds');
  } catch (err) { showToast('Erro inesperado'); }
}

function openUploadVideo() {
  openModal('Novo vídeo', `
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Título *</label>
      <input id="vid-title" class="form-input2" placeholder="Título do vídeo"/>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Descrição</label>
      <textarea id="vid-desc" class="form-input2" rows="3" placeholder="Descreva o vídeo..."></textarea>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Arquivo de Vídeo ou URL</label>
      <input type="file" id="vid-file" accept="video/*" class="form-input2" style="margin-bottom:8px; padding-top:10px;"/>
      <input id="vid-url" class="form-input2" placeholder="Ou cole a URL (YouTube, Drive...)"/>
    </div>
    <p style="font-size:12px;color:var(--text2);margin-top:12px">💡 Você pode selecionar um arquivo do seu dispositivo ou colar uma URL externa.</p>`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Cancelar</button>
     <button id="btn-save-video" class="btn btn-primary btn-sm" onclick="saveVideo()">Publicar</button>`
  );
}

async function saveVideo() {
  if (!state.user) return;
  const title = document.getElementById('vid-title')?.value.trim();
  if (!title) { showToast('Digite o título do vídeo.'); return; }

  const fileInput = document.getElementById('vid-file');
  let video_url = document.getElementById('vid-url')?.value.trim() || '';

  // Modo local: salvar no IndexedDB
  if (useLocalMode || !db) {
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 500 * 1024 * 1024) { // 500MB limit for local mode
        showToast('⚠️ No modo offline, limite de vídeo é 500MB.');
        return;
      }
      
      const btn = document.getElementById('btn-save-video');
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
      
      try {
        const newVideo = {
          id: 'vid_' + Date.now(),
          user_id: state.user.id,
          title,
          description: document.getElementById('vid-desc')?.value.trim() || '',
          video_url: '',
          video_file: file,
          created_at: new Date().toISOString(),
        };
        await localDB.saveVideo(newVideo);
        closeModal();
        showToast('Vídeo publicado localmente!');
        goDash('videos');
      } catch (err) {
        console.error(err);
        showToast('Erro ao salvar vídeo offline.');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
      }
      return;
    }

    if (!video_url) { showToast('Selecione um arquivo ou cole a URL.'); return; }
    const newVideo = {
      id: 'vid_' + Date.now(),
      user_id: state.user.id,
      title,
      description: document.getElementById('vid-desc')?.value.trim() || '',
      video_url,
      created_at: new Date().toISOString(),
    };
    await localDB.saveVideo(newVideo);
    closeModal();
    showToast('Vídeo publicado!');
    goDash('videos');
    return;
  }

  if ((!fileInput || !fileInput.files[0]) && !video_url) {
    showToast('Selecione um arquivo ou preencha a URL.');
    return;
  }

  const btn = document.getElementById('btn-save-video');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 500 * 1024 * 1024) {
        showToast('Vídeo muito grande. Máximo 500MB.');
        if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
        return;
      }
      const ext = file.name.split('.').pop();
      const filePath = `${state.user.id}/video_${Date.now()}.${ext}`;

      showToast('Fazendo upload do vídeo...');
      const { error: uploadErr } = await db.storage.from('profiles').upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = db.storage.from('profiles').getPublicUrl(filePath);
      video_url = urlData.publicUrl;
    }

    const { error } = await db.from('videos').insert({
      user_id: state.user.id,
      title,
      description: document.getElementById('vid-desc')?.value.trim(),
      video_url,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;

    closeModal(); showToast('Vídeo publicado!'); goDash('videos');
  } catch (err) {
    showToast('Erro: ' + (err.message || 'Erro inesperado'));
    if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
  }
}

function openUploadPhoto() {
  openModal('Adicionar foto', `
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Legenda</label>
      <input id="photo-caption" class="form-input2" placeholder="Ex: Nosso novo cardápio"/>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Foto (Arquivo local ou URL)</label>
      <input type="file" id="photo-file" accept="image/*" class="form-input2" style="margin-bottom:8px; padding-top:10px;"/>
      <input id="photo-url" class="form-input2" placeholder="Ou cole a URL da imagem..."/>
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Cancelar</button>
     <button id="btn-save-photo" class="btn btn-primary btn-sm" onclick="savePhoto()">Publicar</button>`
  );
}

async function savePhoto() {
  if (!state.user) return;
  
  const fileInput = document.getElementById('photo-file');
  let photo_url = document.getElementById('photo-url')?.value.trim() || '';

  // Modo local (com suporte a arquivo local no IndexedDB)
  if (useLocalMode || !db) {
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        showToast('⚠️ No modo offline, limite de foto é 100MB.');
        return;
      }
      
      const btn = document.getElementById('btn-save-photo');
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
      
      try {
        const newPhoto = {
          id: 'ph_' + Date.now(),
          user_id: state.user.id,
          caption: document.getElementById('photo-caption')?.value.trim() || '',
          photo_url: '',
          photo_file: file,
          created_at: new Date().toISOString(),
        };
        await localDB.savePhoto(newPhoto);
        closeModal();
        showToast('Foto publicada localmente!');
        goDash('photos');
      } catch (err) {
        console.error(err);
        showToast('Erro ao salvar foto offline.');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
      }
      return;
    }

    if (!photo_url) { showToast('Selecione uma foto ou cole a URL.'); return; }
    const newPhoto = {
      id: 'ph_' + Date.now(),
      user_id: state.user.id,
      caption: document.getElementById('photo-caption')?.value.trim() || '',
      photo_url,
      created_at: new Date().toISOString(),
    };
    await localDB.savePhoto(newPhoto);
    closeModal();
    showToast('Foto publicada!');
    goDash('photos');
    return;
  }

  if ((!fileInput || !fileInput.files[0]) && !photo_url) {
    showToast('Selecione uma foto ou insira uma URL.');
    return;
  }

  const btn = document.getElementById('btn-save-photo');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 100 * 1024 * 1024) {
        showToast('Foto muito grande. Máximo 100MB.');
        if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
        return;
      }
      const ext = file.name.split('.').pop();
      const filePath = `${state.user.id}/photo_${Date.now()}.${ext}`;

      showToast('Fazendo upload...');
      const { error: uploadErr } = await db.storage.from('profiles').upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = db.storage.from('profiles').getPublicUrl(filePath);
      photo_url = urlData.publicUrl;
    }

    const { error } = await db.from('photos').insert({
      user_id: state.user.id,
      photo_url,
      caption: document.getElementById('photo-caption')?.value.trim(),
      created_at: new Date().toISOString(),
    });
    if (error) throw error;

    closeModal(); showToast('Foto publicada!'); goDash('photos');
  } catch (err) {
    showToast('Erro: ' + (err.message || 'Erro inesperado'));
    if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
  }
}

// =============================================
// SETTINGS MODALS
// =============================================
function openEditName() {
  const current = state.profile?.full_name || '';
  openModal('Editar nome', `
    <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Novo nome</label>
    <input id="new-name-input" class="form-input2" placeholder="Seu nome" value="${escAttr(current)}"/>`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary btn-sm" onclick="saveName()">Salvar</button>`
  );
}

async function saveName() {
  const v = document.getElementById('new-name-input')?.value.trim();
  if (!v) { alert('Digite um nome válido'); return; }

  if (useLocalMode) {
    if (state.profile) {
      state.profile.full_name = v;
      localDB.saveProfile(state.profile);
    }
  } else if (db) {
    const { error } = await db.from('profiles').update({ full_name: v, updated_at: new Date().toISOString() }).eq('id', state.user.id);
    if (error) { showToast('Erro: ' + error.message); return; }
    state.profile.full_name = v;
  }

  updateAvatarUI();
  const d = document.getElementById('profile-name-display');
  if (d) d.textContent = v;
  closeModal(); showToast('Nome atualizado!');
}

function openChangePwd() {
  openModal('Alterar senha', `
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Nova senha</label>
      <input id="new-pwd" class="form-input2" type="password" placeholder="Mínimo 6 caracteres"/>
    </div>
    <div>
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Confirmar</label>
      <input id="confirm-pwd" class="form-input2" type="password" placeholder="Repita a senha"/>
    </div>`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary btn-sm" onclick="savePwd()">Alterar senha</button>`
  );
}

async function savePwd() {
  const p1 = document.getElementById('new-pwd')?.value;
  const p2 = document.getElementById('confirm-pwd')?.value;
  if (!p1 || !p2) { alert('Preencha todos os campos'); return; }
  if (p1 !== p2) { alert('As senhas não coincidem'); return; }
  if (p1.length < 6) { alert('Mínimo 6 caracteres'); return; }
  if (!db) { showToast('Supabase não configurado'); return; }
  try {
    const { error } = await db.auth.updateUser({ password: p1 });
    if (error) { showToast('Erro: ' + error.message); return; }
    closeModal(); showToast('Senha alterada com sucesso!');
  } catch (err) { showToast('Erro inesperado'); }
}

function openEditProfile() {
  const p = state.profile || {};
  openModal('Editar perfil', `
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Nome</label>
      <input id="ep-name" class="form-input2" value="${escAttr(p.full_name || '')}" placeholder="Seu nome"/>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Sobre</label>
      <textarea id="ep-bio" class="form-input2" rows="3" placeholder="Descreva você ou seu negócio...">${escHtml(p.bio || '')}</textarea>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <div>
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Telefone / WhatsApp</label>
        <input id="ep-phone" class="form-input2" value="${escAttr(p.phone || '')}" placeholder="(68) 99999-9999"/>
      </div>
      <div>
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Cidade</label>
        <select id="ep-city" class="form-input2" style="height:44px">
          <option ${p.city === 'Brasiléia' ? 'selected' : ''}>Brasiléia</option>
          <option ${p.city === 'Epitaciolândia' ? 'selected' : ''}>Epitaciolândia</option>
          <option>Outra</option>
        </select>
      </div>
    </div>
    ${p.profile_type !== 'user' ? `
    <div style="margin-bottom:12px">
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Título do serviço / Empresa</label>
      <input id="ep-service" class="form-input2" value="${escAttr(p.service_title || '')}" placeholder="Ex: Eletricista residencial"/>
    </div>
    <div>
      <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Horário de atendimento</label>
      <input id="ep-schedule" class="form-input2" value="${escAttr(p.schedule || '')}" placeholder="Ex: Seg-Sex, 8h-18h"/>
    </div>` : ''}`,
    `<button class="btn btn-outline btn-sm" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-primary btn-sm" onclick="saveProfile()">Salvar</button>`
  );
}

async function saveProfile() {
  if (!state.user) return;
  const updates = {
    full_name: document.getElementById('ep-name')?.value.trim() || state.profile?.full_name,
    bio: document.getElementById('ep-bio')?.value.trim(),
    phone: document.getElementById('ep-phone')?.value.trim(),
    city: document.getElementById('ep-city')?.value,
    service_title: document.getElementById('ep-service')?.value.trim(),
    schedule: document.getElementById('ep-schedule')?.value.trim(),
    updated_at: new Date().toISOString(),
  };
  // Remove undefined keys
  Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

  // Atualizar estado local imediatamente
  state.profile = { ...state.profile, ...updates };
  localDB.saveProfile(state.profile);

  if (!useLocalMode && db) {
    try {
      const { error } = await db.from('profiles').update(updates).eq('id', state.user.id);
      if (error) { console.warn('Erro ao salvar no servidor:', error.message); }
    } catch (err) {
      console.warn('Erro inesperado ao salvar no servidor:', err.message);
    }
  }

  updateAvatarUI();
  closeModal();
  showToast('Perfil atualizado!');
  goDash('profile');
}

function openNotifSettings() {
  openModal('Notificações', `
    <div class="switch-row"><div class="switch-label"><p>E-mail</p><span>Receba avisos por e-mail</span></div><div class="toggle${state.notifToggles.email ? ' on' : ''}" onclick="toggleSwitch(this,'email')"></div></div>
    <div class="switch-row"><div class="switch-label"><p>Push</p><span>Alertas no navegador</span></div><div class="toggle${state.notifToggles.push ? ' on' : ''}" onclick="toggleSwitch(this,'push')"></div></div>
    <div class="switch-row"><div class="switch-label"><p>Marketing</p><span>Novidades da plataforma</span></div><div class="toggle${state.notifToggles.marketing ? ' on' : ''}" onclick="toggleSwitch(this,'marketing')"></div></div>`,
    `<button class="btn btn-primary btn-sm" onclick="closeModal();showToast('Preferências salvas!')">Salvar</button>`
  );
}

function toggleSwitch(el, key) {
  el.classList.toggle('on');
  state.notifToggles[key] = el.classList.contains('on');
}

function openThemeSettings() {
  openModal('Aparência', `
    <div class="theme-options">
      <div class="theme-option${state.theme === 'light' ? ' selected' : ''}" onclick="setTheme('light',this)"><div class="theme-option-icon">☀️</div><p>Claro</p>${state.theme === 'light' ? '<p style="color:var(--brand);font-size:12px;margin-top:4px">✓ Ativo</p>' : ''}</div>
      <div class="theme-option${state.theme === 'dark' ? ' selected' : ''}" onclick="setTheme('dark',this)"><div class="theme-option-icon">🌙</div><p>Escuro</p>${state.theme === 'dark' ? '<p style="color:var(--brand);font-size:12px;margin-top:4px">✓ Ativo</p>' : ''}</div>
    </div>`,
    `<button class="btn btn-primary btn-sm" onclick="closeModal()">Fechar</button>`
  );
}

function setTheme(t, el) {
  state.theme = t;
  document.documentElement.classList.toggle('dark', t === 'dark');
  localStorage.setItem('iaa-theme', t);
  document.querySelectorAll('.theme-option').forEach(o => { o.classList.remove('selected'); const last = o.querySelector('p:last-child'); if (last && last.style.color) last.remove(); });
  el.classList.add('selected');
  el.insertAdjacentHTML('beforeend', '<p style="color:var(--brand);font-size:12px;margin-top:4px">✓ Ativo</p>');
}

function openPrivacySettings() {
  openModal('Privacidade', `
    <div class="switch-row"><div class="switch-label"><p>Perfil público</p><span>Qualquer pessoa pode ver seu perfil</span></div><div class="toggle${state.privacy.public ? ' on' : ''}" onclick="togglePrivacy(this,'public')"></div></div>
    <div class="switch-row"><div class="switch-label"><p>Mostrar telefone</p><span>Exibir número de contato</span></div><div class="toggle${state.privacy.phone ? ' on' : ''}" onclick="togglePrivacy(this,'phone')"></div></div>
    <div class="switch-row"><div class="switch-label"><p>Mostrar cidade</p><span>Exibir cidade no perfil</span></div><div class="toggle${state.privacy.city ? ' on' : ''}" onclick="togglePrivacy(this,'city')"></div></div>`,
    `<button class="btn btn-primary btn-sm" onclick="closeModal();showToast('Configurações salvas!')">Salvar</button>`
  );
}

function togglePrivacy(el, key) { el.classList.toggle('on'); state.privacy[key] = el.classList.contains('on'); }

// =============================================
// AVATAR UPLOAD
// =============================================
async function handleAvatarUpload(input) {
  if (!input.files || !input.files[0] || !state.user) return;
  const file = input.files[0];
  if (file.size > 50 * 1024 * 1024) { showToast('Arquivo muito grande. Máximo 50MB.'); return; }

  showToast('Fazendo upload...');
  const ext = file.name.split('.').pop();
  const filePath = `${state.user.id}/avatar.${ext}`;

  // Tenta Supabase Storage primeiro (se disponível)
  if (!useLocalMode && db) {
    try {
      const { error: uploadErr } = await db.storage.from('profiles').upload(filePath, file, { upsert: true });
      if (!uploadErr) {
        const { data: urlData } = db.storage.from('profiles').getPublicUrl(filePath);
        const avatar_url = urlData.publicUrl + '?t=' + Date.now();
        await db.from('profiles').update({ avatar_url, updated_at: new Date().toISOString() }).eq('id', state.user.id);
        state.profile.avatar_url = avatar_url;
        localDB.saveProfile({ ...state.profile, avatar_url });
        updateAvatarUI();
        const avatarDisp = document.getElementById('profile-avatar-display');
        if (avatarDisp) avatarDisp.innerHTML = `<img src="${avatar_url}" alt=""/>`;
        showToast('Foto de perfil atualizada! ✅');
        // Reset input
        input.value = '';
        return;
      }
      console.warn('Supabase Storage falhou, usando fallback local:', uploadErr.message);
    } catch (srvErr) {
      console.warn('Falha no upload do avatar no servidor, caindo para modo local:', srvErr);
    }
  }

  // Fallback: salvar em Base64 no localStorage
  if (file.size > 5 * 1024 * 1024) {
    showToast('⚠️ Modo offline: limite de 5MB para foto de perfil. Tente uma imagem menor.');
    input.value = '';
    return;
  }

  showToast('Salvando foto localmente...');
  const reader = new FileReader();
  reader.onload = function (e) {
    const localUrl = e.target.result;
    state.profile = { ...state.profile, avatar_url: localUrl, updated_at: new Date().toISOString() };
    localDB.saveProfile(state.profile);
    updateAvatarUI();
    const avatarDisp = document.getElementById('profile-avatar-display');
    if (avatarDisp) avatarDisp.innerHTML = `<img src="${localUrl}" alt=""/>`;
    showToast('Foto de perfil salva! ✅');
    input.value = '';
  };
  reader.onerror = function () {
    showToast('Erro ao ler a imagem. Tente outro arquivo.');
    input.value = '';
  };
  reader.readAsDataURL(file);
}

// =============================================
// NOTIFICATIONS
// =============================================
function renderNotifList() {
  const cont = document.getElementById('notif-list');
  if (!cont) return;
  const sub = document.getElementById('notif-count-sub');
  const unread = state.notifications.filter(n => !n.read_at).length;
  if (sub) sub.textContent = `${unread} não lida(s)`;

  const badge = document.getElementById('notif-badge');
  if (badge) badge.style.display = unread > 0 ? '' : 'none';

  if (state.notifications.length === 0) {
    cont.innerHTML = `<div style="text-align:center;padding:48px;color:var(--text2)"><div style="font-size:40px;margin-bottom:12px">🔔</div><p>Nenhuma notificação</p></div>`;
    return;
  }
  cont.innerHTML = state.notifications.map(n => `
    <div class="notif-item" onclick="markNotifRead('${n.id}')">
      <div class="notif-dot2${n.read_at ? ' read' : ''}"></div>
      <div style="flex:1">
        <div class="notif-title">${escHtml(n.title || '')}</div>
        <div class="notif-msg">${escHtml(n.message || '')}</div>
      </div>
      <div class="notif-time">${formatTimeAgo(n.created_at)}</div>
      <button onclick="deleteNotif(event,'${n.id}')" style="color:var(--text3);font-size:16px;padding:4px;background:none;border:none;cursor:pointer">🗑️</button>
    </div>`).join('');
}

async function markNotifRead(id) {
  if (db) {
    try { await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id); } catch (err) { }
  }
  state.notifications = state.notifications.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n);
  renderNotifList();
}

async function deleteNotif(e, id) {
  e.stopPropagation();
  if (db) {
    try { await db.from('notifications').delete().eq('id', id); } catch (err) { }
  }
  state.notifications = state.notifications.filter(n => n.id !== id);
  renderNotifList();
}

async function markAllRead() {
  if (!state.user) return;
  if (db) {
    try { await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', state.user.id).is('read_at', null); } catch (err) { }
  }
  state.notifications = state.notifications.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }));
  renderNotifList();
}

// =============================================
// HELP
// =============================================
function toggleHelp(i) {
  const el = document.getElementById(`help-${i}`);
  if (el) el.classList.toggle('open');
}

// =============================================
// LANDING STATS
// =============================================
async function loadLandingStats() {
  if (useLocalMode || !db) {
    updateLandingStatsFromLocal();
    return;
  }

  try {
    // C5 — Todas as queries em paralelo com timeout de 8s
    const [provRes, bizRes, jobRes, clRes, servicePubRes] = await withTimeout(
      Promise.all([
        db.from('profiles').select('*', { count: 'exact', head: true }).eq('profile_type', 'provider'),
        db.from('profiles').select('*', { count: 'exact', head: true }).eq('profile_type', 'business'),
        db.from('jobs').select('*', { count: 'exact', head: true }),
        db.from('classifieds').select('*', { count: 'exact', head: true }),
        db.from('publications').select('*', { count: 'exact', head: true }).eq('type', 'service'),
      ]),
      8000
    );

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val ?? '0'; };

    // Serviços = prestadores de perfil + publicações do tipo 'service'
    const providerCount = provRes.count ?? 0;
    const servicePubCount = servicePubRes.count ?? 0;
    setEl('stat-services', providerCount + servicePubCount);
    setEl('stat-businesses', bizRes.count ?? 0);
    setEl('stat-jobs', jobRes.count ?? 0);
    setEl('stat-classifieds', clRes.count ?? 0);

  } catch (err) {
    console.error('Erro ao carregar stats:', err.message || err);
    // Fallback: exibir 0 em todos
    ['stat-services', 'stat-businesses', 'stat-jobs', 'stat-classifieds'].forEach(id => {
      const el = document.getElementById(id);
      if (el && (el.textContent === '—' || el.textContent === '')) el.textContent = '0';
    });
  }

  if (typeof window._retriggerStatCounters === 'function') {
    setTimeout(window._retriggerStatCounters, 150);
  }
}

function updateLandingStatsFromLocal() {
  const profiles = localDB.getAllProfiles();
  const providerCount = profiles.filter(p => p.profile_type === 'provider').length;
  const businesses = profiles.filter(p => p.profile_type === 'business').length;
  const jobs = localDB.getJobs().length;
  const classifieds = localDB.getClassifieds().length;

  // Publicações por tipo (fallback adicional)
  const pubs = localDB.getPublications();
  const servicePubs = pubs.filter(p => p.type === 'service').length;
  const jobPubs = pubs.filter(p => p.type === 'job').length;
  const clPubs = pubs.filter(p => p.type === 'classified').length;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // Serviços = perfis de prestador + publicações do tipo 'service'
  setEl('stat-services', providerCount + servicePubs);
  setEl('stat-businesses', businesses);
  setEl('stat-jobs', jobs + jobPubs);
  setEl('stat-classifieds', classifieds + clPubs);

  if (typeof window._retriggerStatCounters === 'function') {
    setTimeout(window._retriggerStatCounters, 150);
  }
}

// Chamada global — atualiza contadores sempre que algo muda
function updateLandingStats() {
  if (useLocalMode || !db) {
    updateLandingStatsFromLocal();
  } else {
    loadLandingStats();
  }
}

// =============================================
// ÁREA PÚBLICA — Explorar sem login
// =============================================
let _pendingPublish = false;
let _currentExploreTab = 'all';

function showPublicArea(section) {
  _currentExploreTab = section || 'all';
  showPage('explore');
  updateExploreAccountBtn();
  // Sincronizar tabs
  const tabs = ['all', 'services', 'businesses', 'jobs', 'classifieds'];
  document.querySelectorAll('.explore-tab').forEach((t, i) => {
    t.classList.toggle('active', tabs[i] === _currentExploreTab);
  });
  loadExploreData(_currentExploreTab);
}

function updateExploreAccountBtn() {
  const btn = document.getElementById('explore-account-btn');
  if (!btn) return;
  if (state.user) {
    const name = state.profile?.full_name || state.user?.user_metadata?.full_name || 'Minha conta';
    btn.textContent = '👤 ' + name.split(' ')[0];
    btn.onclick = () => {
      const type = state.profile?.profile_type;
      if (type === 'provider') enterPanel('provider');
      else if (type === 'business') enterPanel('business');
      else if (type === 'user') enterPanel('user');
      else showPage('profile-selection');
    };
  } else {
    btn.textContent = 'Acessar conta';
    btn.onclick = () => showPage('login');
  }
}

function setExploreTab(tab, el) {
  _currentExploreTab = tab;
  document.querySelectorAll('.explore-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  loadExploreData(tab);
}

function syncExploreTab(idx) {
  document.querySelectorAll('.explore-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
}

async function loadExploreData(section) {
  const cont = document.getElementById('explore-content');
  if (!cont) return;
  cont.innerHTML = '<div style="text-align:center;padding:80px 0"><div class="loading-spinner" style="margin:0 auto"></div><p style="margin-top:12px;color:var(--text2);font-size:14px">Carregando...</p></div>';
  try {
    if (section === 'all' || !section) await loadExploreAll();
    else await loadExploreSectionData(section);
  } catch (e) {
    console.error('loadExploreData error:', e);
    const c = document.getElementById('explore-content');
    if (c) c.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text2)">Erro ao carregar. Tente novamente.</div>';
  }
}

async function loadExploreAll() {
  let services = [], businesses = [], jobs = [], classifieds = [];

  if (useLocalMode || !db) {
    const profiles = localDB.getAllProfiles();
    services = profiles.filter(p => p.profile_type === 'provider');
    businesses = profiles.filter(p => p.profile_type === 'business');
    jobs = localDB.getJobs();
    classifieds = localDB.getClassifieds();
  } else {
    try {
      // C6 — Timeout de 7s no Promise.all: se qualquer query travar, cai no catch
      const [provRes, bizRes, jobsRes, clRes] = await withTimeout(
        Promise.all([
          db.from('profiles').select('*').eq('profile_type', 'provider').order('created_at', { ascending: false }).limit(8),
          db.from('profiles').select('*').eq('profile_type', 'business').order('created_at', { ascending: false }).limit(8),
          db.from('jobs').select('*, profiles(full_name, phone)').order('created_at', { ascending: false }).limit(6),
          db.from('classifieds').select('*, profiles(full_name, phone)').order('created_at', { ascending: false }).limit(6),
        ]),
        7000
      );
      services = provRes.data || [];
      businesses = bizRes.data || [];
      jobs = jobsRes.data || [];
      classifieds = clRes.data || [];
    } catch (e) {
      console.error('loadExploreAll: timeout ou erro:', e.message || e);
      // C6 — Fallback local após timeout
      const profiles = localDB.getAllProfiles();
      services = profiles.filter(p => p.profile_type === 'provider');
      businesses = profiles.filter(p => p.profile_type === 'business');
      jobs = localDB.getJobs();
      classifieds = localDB.getClassifieds();
      if (e.message === 'timeout') {
        showToast('Conexão lenta — exibindo dados locais.');
      }
    }
  }

  let html = '';
  if (services.length > 0) {
    html += `<div class="explore-section-header"><h2>🔧 Serviços</h2><button class="btn btn-ghost btn-sm" onclick="setExploreTab('services',null);syncExploreTab(1)">Ver todos →</button></div><div class="explore-grid">${services.slice(0, 6).map(p => exploreServiceCard(p)).join('')}</div>`;
  }
  if (businesses.length > 0) {
    html += `<div class="explore-section-header"><h2>🏢 Empresas</h2><button class="btn btn-ghost btn-sm" onclick="setExploreTab('businesses',null);syncExploreTab(2)">Ver todas →</button></div><div class="explore-grid">${businesses.slice(0, 6).map(p => exploreBusinessCard(p)).join('')}</div>`;
  }
  if (jobs.length > 0) {
    html += `<div class="explore-section-header"><h2>💼 Vagas</h2><button class="btn btn-ghost btn-sm" onclick="setExploreTab('jobs',null);syncExploreTab(3)">Ver todas →</button></div><div class="explore-list">${jobs.slice(0, 4).map(j => exploreJobCard(j)).join('')}</div>`;
  }
  if (classifieds.length > 0) {
    html += `<div class="explore-section-header"><h2>🏷️ Classificados</h2><button class="btn btn-ghost btn-sm" onclick="setExploreTab('classifieds',null);syncExploreTab(4)">Ver todos →</button></div><div class="explore-grid">${classifieds.slice(0, 6).map(c => exploreClassifiedCard(c)).join('')}</div>`;
  }

  if (!html) {
    // C6 — Estado vazio com botões de ação, nunca deixar spinner
    html = `<div class="explore-empty"><div style="font-size:72px;margin-bottom:16px">🌿</div><h3>A plataforma está crescendo!</h3><p>Em breve haverá muito conteúdo aqui. Seja o primeiro a divulgar!</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px"><button class="btn btn-primary" onclick="requireLoginForPublish()">+ Divulgar grátis</button><button class="btn btn-outline" onclick="loadExploreData(_currentExploreTab)">Tentar novamente</button></div></div>`;
  }

  const c = document.getElementById('explore-content');
  if (c) c.innerHTML = html;
}

async function loadExploreSectionData(section) {
  let data = [];
  const meta = {
    services: { type: 'provider', label: 'Serviços', icon: '🔧' },
    businesses: { type: 'business', label: 'Empresas', icon: '🏢' },
    jobs: { label: 'Vagas', icon: '💼' },
    classifieds: { label: 'Classificados', icon: '🏷️' }
  };
  const m = meta[section];

  if (useLocalMode || !db) {
    if (section === 'services') data = localDB.getAllProfiles().filter(p => p.profile_type === 'provider');
    else if (section === 'businesses') data = localDB.getAllProfiles().filter(p => p.profile_type === 'business');
    else if (section === 'jobs') data = localDB.getJobs();
    else if (section === 'classifieds') data = localDB.getClassifieds();
  } else {
    try {
      if (section === 'services' || section === 'businesses') {
        // C6 — Timeout de 7s por query individual de seção
        const r = await withTimeout(
          db.from('profiles').select('*').eq('profile_type', m.type).order('created_at', { ascending: false }),
          7000
        );
        data = r.data || [];
      } else {
        const tbl = section === 'jobs' ? 'jobs' : 'classifieds';
        // C6 — Timeout de 7s
        const r = await withTimeout(
          db.from(tbl).select('*, profiles(full_name, phone)').order('created_at', { ascending: false }),
          7000
        );
        data = r.data || [];
      }
    } catch (e) {
      console.error('loadExploreSectionData timeout/erro (' + section + '):', e.message || e);
      // C6 — Fallback local
      if (section === 'services') data = localDB.getAllProfiles().filter(p => p.profile_type === 'provider');
      else if (section === 'businesses') data = localDB.getAllProfiles().filter(p => p.profile_type === 'business');
      else if (section === 'jobs') data = localDB.getJobs();
      else if (section === 'classifieds') data = localDB.getClassifieds();
      if (e.message === 'timeout') showToast('Conexão lenta — exibindo dados locais.');
    }
  }

  const c = document.getElementById('explore-content');
  if (!c) return;

  if (!data || data.length === 0) {
    // C6 — Estado vazio nunca deixa spinner; inclui botões de ação
    c.innerHTML = `<div class="explore-empty"><div style="font-size:72px;margin-bottom:16px">${m ? m.icon : '🔍'}</div><h3>Nenhum(a) ${m ? m.label : ''} ainda</h3><p>Seja o primeiro a publicar nessa categoria!</p><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px"><button class="btn btn-primary" onclick="requireLoginForPublish()">+ Publicar grátis</button><button class="btn btn-outline" onclick="loadExploreData('${section}')">Tentar novamente</button></div></div>`;
    return;
  }

  let html = '';
  if (section === 'services') html = `<div class="explore-grid">${data.map(p => exploreServiceCard(p)).join('')}</div>`;
  else if (section === 'businesses') html = `<div class="explore-grid">${data.map(p => exploreBusinessCard(p)).join('')}</div>`;
  else if (section === 'jobs') html = `<div class="explore-list">${data.map(j => exploreJobCard(j)).join('')}</div>`;
  else if (section === 'classifieds') html = `<div class="explore-grid">${data.map(cl => exploreClassifiedCard(cl)).join('')}</div>`;

  c.innerHTML = html;
}

function exploreServiceCard(p) {
  const name = escHtml(p.full_name || 'Prestador');
  const service = escHtml(p.service_title || (p.bio || '').substring(0, 60) || 'Serviço');
  const city = p.city ? `<div class="ecard-city">📍 ${escHtml(p.city)}</div>` : '';
  const avatar = p.avatar_url ? `<img src="${p.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>` : `<span>${name.charAt(0)}</span>`;
  const phone = p.phone || '';
  const wpp = phone ? `<a href="https://wa.me/55${phone.replace(/\D/g, '')}" target="_blank" rel="noopener" class="ecard-wpp">📱 WhatsApp</a>` : '';
  return `<div class="explore-card"><div class="ecard-avatar ecard-avatar--provider">${avatar}</div><div class="ecard-body"><div class="ecard-name">${name}</div><div class="ecard-tag">🔧 ${service}</div>${city}</div>${wpp}</div>`;
}

function exploreBusinessCard(p) {
  const name = escHtml(p.full_name || 'Empresa');
  const sched = p.schedule ? `<div class="ecard-tag">🕐 ${escHtml(p.schedule)}</div>` : '';
  const city = p.city ? `<div class="ecard-city">📍 ${escHtml(p.city)}</div>` : '';
  const avatar = p.avatar_url ? `<img src="${p.avatar_url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>` : `<span>${name.charAt(0)}</span>`;
  const phone = p.phone || '';
  const wpp = phone ? `<a href="https://wa.me/55${phone.replace(/\D/g, '')}" target="_blank" rel="noopener" class="ecard-wpp">📱 WhatsApp</a>` : '';
  return `<div class="explore-card"><div class="ecard-avatar ecard-avatar--business">${avatar}</div><div class="ecard-body"><div class="ecard-name">${name}</div>${sched}${city}</div>${wpp}</div>`;
}

function exploreJobCard(j) {
  const p = j.profiles || {};
  const title = escHtml(j.title || 'Vaga');
  const company = escHtml(j.company_name || p.full_name || '');
  const city = j.city ? ` · 📍 ${escHtml(j.city)}` : '';
  const type = j.job_type ? `<span class="ecard-tag">${escHtml(j.job_type)}</span>` : '';
  const salary = j.salary ? `<span class="ecard-salary">${escHtml(j.salary)}</span>` : '';
  const phone = j.contact_phone || p.phone || '';
  const wpp = phone ? `<a href="https://wa.me/55${phone.replace(/\D/g, '')}" target="_blank" rel="noopener" class="ecard-wpp">Candidatar</a>` : '';
  return `<div class="explore-job-card"><div class="ejob-icon">💼</div><div style="flex:1;min-width:0"><div class="ecard-name">${title}</div><div class="ecard-city">${company}${city}</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">${type}${salary}</div></div>${wpp}</div>`;
}

function exploreClassifiedCard(cl) {
  const p = cl.profiles || {};
  const title = escHtml(cl.title || 'Anúncio');
  const price = cl.price ? `<div class="ecard-salary">${escHtml(cl.price)}</div>` : '';
  const city = cl.city ? `<div class="ecard-city">📍 ${escHtml(cl.city)}</div>` : '';
  const phone = cl.contact_phone || p.phone || '';
  const wpp = phone ? `<a href="https://wa.me/55${phone.replace(/\D/g, '')}" target="_blank" rel="noopener" class="ecard-wpp">Contato</a>` : '';
  return `<div class="explore-card"><div class="ecard-avatar ecard-avatar--classified">🏷️</div><div class="ecard-body"><div class="ecard-name">${title}</div>${price}${city}</div>${wpp}</div>`;
}

function filterExplore(val) {
  document.querySelectorAll('.explore-card, .explore-job-card').forEach(card => {
    card.style.display = !val || card.textContent.toLowerCase().includes(val.toLowerCase()) ? '' : 'none';
  });
}

// =============================================
// REQUIRE LOGIN FOR PUBLISH
// =============================================
function requireLoginForPublish() {
  if (state.user) {
    const type = state.profile?.profile_type;
    if (type === 'provider') { enterPanel('provider', 'publications'); return; }
    if (type === 'business') { enterPanel('business', 'publications'); return; }
    // Logado mas sem tipo de publicação → escolher
    _pendingPublish = true;
    showPage('profile-selection');
    return;
  }
  // Não logado → mostrar modal
  _pendingPublish = true;
  showLoginRequiredModal();
}

function showLoginRequiredModal() {
  openModal(
    'Acesse para publicar',
    `<div style="text-align:center;padding:8px 0 4px">
      <div style="font-size:52px;margin-bottom:16px">🔐</div>
      <p style="color:var(--text2);line-height:1.7;margin-bottom:24px">Para publicar serviços, vagas ou anúncios você precisa entrar ou criar uma conta gratuita.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="closeModal();showPage('login')">Entrar na conta</button>
        <button class="btn btn-outline" onclick="closeModal();showPage('signup')">Criar conta grátis</button>
      </div>
    </div>`,
    ''
  );
}

async function skipToExplore() {
  // Cria perfil tipo 'user' silenciosamente para não pedir de novo
  if (state.user && (!state.profile || !state.profile.profile_type)) {
    const profileData = {
      id: state.user.id,
      email: state.user.email || '',
      full_name: state.user.user_metadata?.full_name || state.user.email?.split('@')[0] || 'Usuário',
      profile_type: 'user',
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    if (useLocalMode) { localDB.saveProfile(profileData); }
    else if (db) { try { await db.from('profiles').upsert(profileData); } catch (e) { } }
    state.profile = profileData;
  }
  _pendingPublish = false;
  showPublicArea();
}

// =============================================
// UTILS
// =============================================
function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} dia${d > 1 ? 's' : ''}`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function escHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

// =============================================
// TOAST
// =============================================
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#0f172a;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:500;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.25);transition:opacity .3s;opacity:0';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.style.opacity = '0', 3000);
}

// =============================================
// INIT
// =============================================
// Show landing ONLY if initAuth hasn't already handled navigation
if (!_authNavigationDone) {
  showPage('landing');
  // Ensure the loading overlay is removed when landing shows synchronously
  hideAppLoading();
}

// Carregar stats após DOM ready para garantir que os elementos existam
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadLandingStats();
  });
} else {
  loadLandingStats();
}
var loadPublicStats = loadLandingStats; // alias

// Theme icon
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.topbar-right .icon-btn');
  if (btn && state.theme === 'dark') btn.textContent = '☀️';
});

// Fallback: hide loader e mostrar landing se nada foi navegado ainda
setTimeout(() => {
  if (isOAuthCallback()) return; // Don't hide loader during OAuth processing
  const loader = document.getElementById('app-loading');
  if (loader && !loader.classList.contains('hidden')) {
    loader.classList.add('hidden');
    setTimeout(() => loader.style.display = 'none', 500);
  }
  // Se ainda não navegou para nenhuma página, mostrar landing
  if (!_authNavigationDone) {
    _authNavigationDone = true;
    showPage('landing');
  }
}, 3000);

// Secondary fallback: if OAuth is stuck for too long (15s), force hide loader
setTimeout(() => {
  const loader = document.getElementById('app-loading');
  if (loader && !loader.classList.contains('hidden')) {
    console.warn('Force hiding loader after 15s timeout');
    loader.classList.add('hidden');
    setTimeout(() => loader.style.display = 'none', 500);
    if (!state.user) {
      showPage('landing');
    }
  }
}, 15000);

// =============================================
// ANIMATIONS ENGINE
// =============================================
(function initAnimations() {
  // 1. Mark elements for scroll-reveal
  function markRevealElements() {
    // Section heads
    document.querySelectorAll('.section-head').forEach(el => el.classList.add('reveal'));
    // Feature grid (staggered)
    document.querySelectorAll('.features-grid').forEach(el => {
      el.classList.add('reveal-stagger');
    });
    // Steps grid (staggered)
    document.querySelectorAll('.steps-grid').forEach(el => {
      el.classList.add('reveal-stagger');
    });
    // CTA box
    document.querySelectorAll('.cta-box').forEach(el => el.classList.add('reveal'));
    // Footer — NO reveal animation, always visible
  }

  // 2. Intersection Observer for scroll reveals
  function setupScrollReveal() {
    const observerOptions = {
      threshold: 0.05,
      rootMargin: '0px 0px 0px 0px'
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
      observer.observe(el);
    });
  }

  // 3. Stat counter animation
  function animateCounter(el) {
    if (el.dataset.animated === 'true') return;
    const text = el.textContent.trim();
    // Skip if still showing placeholder
    if (text === '—' || text === '') return;
    const num = parseInt(text.replace(/[^0-9]/g, ''));
    if (isNaN(num)) return;
    el.dataset.animated = 'true';
    if (num > 0) {
      const suffix = text.replace(/[0-9]/g, '').trim();
      const duration = 1200;
      const start = performance.now();
      const easeOut = t => 1 - Math.pow(1 - t, 3);
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const current = Math.round(easeOut(progress) * num);
        el.textContent = current + (suffix ? '' + suffix : '');
        if (progress < 1) requestAnimationFrame(tick);
        else el.classList.add('counting');
      }
      el.textContent = '0';
      requestAnimationFrame(tick);
    }
  }

  function animateStatCounters() {
    const statEls = document.querySelectorAll('.stat-val');
    // Threshold baixo para funcionar em qualquer tamanho de tela
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          if (entry.target.dataset.animated === 'true') {
            observer.unobserve(entry.target);
          }
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px 50px 0px' });
    statEls.forEach(el => observer.observe(el));
  }

  // Called by loadLandingStats after values are set to re-trigger counters
  window._retriggerStatCounters = function () {
    document.querySelectorAll('.stat-val').forEach(el => {
      delete el.dataset.animated;
      // Animar diretamente — no mobile o IntersectionObserver pode não disparar
      animateCounter(el);
    });
  };

  // 4. Parallax effect on hero blobs (subtle)
  function setupParallax() {
    const blob1 = document.querySelector('.hero-blob1');
    const blob2 = document.querySelector('.hero-blob2');
    if (!blob1 || !blob2) return;
    let ticking = false;
    window.addEventListener('mousemove', (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        blob1.style.transform = `translate(${x * 15}px, ${y * 10}px)`;
        blob2.style.transform = `translate(${x * -12}px, ${y * -8}px)`;
        ticking = false;
      });
    });
  }

  // 5. Google button mouse-follow gradient
  document.querySelectorAll('.google-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100);
      const y = ((e.clientY - rect.top) / rect.height * 100);
      btn.style.setProperty('--ripple-x', x + '%');
      btn.style.setProperty('--ripple-y', y + '%');
    });
  });

  // 6. Smooth text gradient shimmer on hero
  const gradientText = document.querySelector('.gradient-text');
  if (gradientText) {
    gradientText.style.backgroundSize = '200% auto';
    gradientText.style.animation = 'gradientShift 4s ease-in-out infinite';
    const style = document.createElement('style');
    style.textContent = `
          @keyframes gradientShift {
            0%, 100% { background-position: 0% center }
            50% { background-position: 100% center }
          }
        `;
    document.head.appendChild(style);
  }

  // Initialize everything on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      markRevealElements();
      setupScrollReveal();
      animateStatCounters();
      setupParallax();
    });
  } else {
    markRevealElements();
    setupScrollReveal();
    animateStatCounters();
    setupParallax();
  }
})();