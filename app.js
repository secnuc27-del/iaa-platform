// =============================================
// SUPABASE CONFIG
// =============================================
// IMPORTANTE: Substitua pelos seus valores reais do projeto Supabase
// A URL e a chave abaixo devem ser do seu projeto em https://supabase.com/dashboard
const SUPABASE_URL = 'https://ykmyoaaojauetfgrmauq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrbXlvYWFvamF1ZXRmZ3JtYXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMjQ1NzcsImV4cCI6MjA1OTkwMDU3N30.RmG1EC9fKMpUFYBPJMeuQgjFP5jiQqfjBGvbh-GHFNI';

const { createClient } = supabase;

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
        detectSessionInUrl: false,  // DISABLED - we handle tokens manually to avoid clock skew issues
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

if (state.theme === 'dark') document.documentElement.classList.add('dark');

// =============================================
// SUPABASE AUTH LISTENERS + LOCAL FALLBACK
// =============================================

// Try to detect if Supabase is actually reachable
async function testSupabaseConnection() {
  if (!db) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(SUPABASE_URL + '/rest/v1/', {
      method: 'HEAD',
      headers: { 'apikey': SUPABASE_ANON_KEY },
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response.ok || response.status === 401 || response.status === 400;
  } catch (err) {
    console.warn('Supabase não acessível, usando modo local:', err.message);
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
         hash.includes('error_description');
}

// Check if the hash contains an OAuth error
function getOAuthError() {
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

// Navigate user after successful auth
async function handleAuthSuccess(user) {
  if (_authNavigationDone && state.user) return; // Already handled
  _authNavigationDone = true;
  state.user = user;
  
  // Also save to local for offline fallback
  localDB.setCurrentUser({ id: user.id, email: user.email, user_metadata: user.user_metadata });
  
  updateAvatarUI();
  
  if (!state.profile || !state.profile.profile_type) {
    showPage('profile-selection');
  } else {
    showPage('dashboard');
    showDash('feed');
    showToast('Bem-vindo de volta! 👋');
  }
  
  // Clean URL hash if present
  if (window.location.hash.includes('access_token')) {
    history.replaceState(null, '', window.location.pathname);
  }
  
  hideAppLoading();
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
  }

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
        showPage('dashboard');
        showDash('feed');
      } else {
        showPage('profile-selection');
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

  // Set useLocalMode = false since db exists
  useLocalMode = false;

  // Register auth state change listener FIRST
  db.auth.onAuthStateChange(async (event, session) => {
    console.log('onAuthStateChange:', event, !!session);

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      if (session && session.user) {
        await loadProfile(session.user.id);
        await handleAuthSuccess(session.user);
      }
    } else if (event === 'SIGNED_OUT') {
      state.user = null;
      state.profile = null;
      localDB.setCurrentUser(null);
      if (_authNavigationDone) {
        // Only navigate if we were previously logged in
        showPage('landing');
      }
    }
  });

  // Now process the session
  try {
    // If OAuth callback — handle tokens manually (detectSessionInUrl is disabled to avoid clock skew)
    if (isCallback) {
      console.log('OAuth callback detectado — processando tokens manualmente...');
      
      const tokens = extractTokensFromHash();
      if (tokens) {
        // Try setSession first
        let sessionSet = false;
        try {
          const { data, error } = await db.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          });
          if (!error && data?.session) {
            console.log('setSession com tokens da URL funcionou!');
            sessionSet = true;
            history.replaceState(null, '', window.location.pathname);
            await loadProfile(data.session.user.id);
            await handleAuthSuccess(data.session.user);
            return;
          }
          console.warn('setSession falhou:', error?.message);
        } catch (e) {
          console.warn('setSession error:', e.message);
        }
        
        // If setSession failed (clock skew), try refreshSession with refresh_token
        if (!sessionSet && tokens.refresh_token) {
          try {
            console.log('Tentando refreshSession como fallback para clock skew...');
            const { data: refreshData, error: refreshError } = await db.auth.refreshSession({
              refresh_token: tokens.refresh_token
            });
            if (!refreshError && refreshData?.session) {
              console.log('refreshSession funcionou!');
              history.replaceState(null, '', window.location.pathname);
              await loadProfile(refreshData.session.user.id);
              await handleAuthSuccess(refreshData.session.user);
              return;
            }
            console.warn('refreshSession falhou:', refreshError?.message);
          } catch (e) {
            console.warn('refreshSession error:', e.message);
          }
        }
        
        // Both failed — try one more approach: decode JWT and create user manually for navigation
        // Then use refresh_token to get a valid session in background
        if (!sessionSet && tokens.access_token) {
          try {
            // Decode JWT payload without validation
            const payload = JSON.parse(atob(tokens.access_token.split('.')[1]));
            console.log('JWT payload decodificado:', payload);
            
            if (payload.sub && payload.email) {
              // We have valid user info even though the token timing is off
              // Store tokens in Supabase's storage format for later refresh
              const storageKey = 'iaa-supabase-auth';
              const sessionData = {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_type: 'bearer',
                expires_in: payload.exp ? (payload.exp - Math.floor(Date.now() / 1000)) : 3600,
                expires_at: payload.exp || (Math.floor(Date.now() / 1000) + 3600),
                user: {
                  id: payload.sub,
                  email: payload.email,
                  user_metadata: payload.user_metadata || {},
                  app_metadata: payload.app_metadata || {},
                  aud: payload.aud || 'authenticated',
                  role: payload.role || 'authenticated'
                }
              };
              
              // Force store the session
              localStorage.setItem('sb-' + SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token', JSON.stringify(sessionData));
              
              history.replaceState(null, '', window.location.pathname);
              
              // Load profile and navigate
              await loadProfile(payload.sub);
              const user = sessionData.user;
              await handleAuthSuccess(user);
              
              // Try to refresh in background to get a valid session
              setTimeout(async () => {
                try {
                  if (tokens.refresh_token) {
                    await db.auth.refreshSession({ refresh_token: tokens.refresh_token });
                    console.log('Background refresh succeeded!');
                  }
                } catch (e) { console.warn('Background refresh failed:', e); }
              }, 2000);
              
              return;
            }
          } catch (e) {
            console.warn('JWT decode fallback failed:', e);
          }
        }
      }
      
      // Everything failed
      console.warn('OAuth callback: todos os métodos falharam');
      history.replaceState(null, '', window.location.pathname);
      _authNavigationDone = true;
      showPage('login');
      hideAppLoading();
      showToast('Erro no login com Google. Por favor, tente novamente.');
      return;
    }
    
    // Normal page load — check for existing session
    const { data: { session }, error: sessionError } = await db.auth.getSession();
    console.log('getSession result: session=', !!session, 'error=', sessionError?.message);

    if (session && session.user) {
      await loadProfile(session.user.id);
      await handleAuthSuccess(session.user);
      return;
    }

    // Normal page load (not callback) — no session
    if (!_authNavigationDone) {
      // Check if Supabase is reachable
      const isReachable = await testSupabaseConnection();
      if (!isReachable) {
        fallbackToLocalAuth();
      } else {
        _authNavigationDone = true;
        showPage('landing');
        hideAppLoading();
      }
    }

  } catch (err) {
    console.error('initAuth getSession error:', err);
    
    if (isCallback) {
      // Try manual extraction as last resort
      try {
        const manualOk = await tryManualSessionFromUrl();
        if (manualOk) {
          const { data: { session: s3 } } = await db.auth.getSession();
          if (s3 && s3.user) {
            await loadProfile(s3.user.id);
            await handleAuthSuccess(s3.user);
            return;
          }
        }
      } catch (e2) { console.error('Manual extraction error:', e2); }
      
      history.replaceState(null, '', window.location.pathname);
      _authNavigationDone = true;
      showPage('login');
      hideAppLoading();
      showToast('Erro no login com Google. Tente novamente.');
    } else {
      fallbackToLocalAuth();
    }
  }
})();

async function loadProfile(userId) {
  if (useLocalMode) {
    const profile = localDB.getProfile(userId);
    state.profile = profile;
    state.dbReady = true;
    return;
  }
  if (!db) return;
  try {
    const { data, error } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    console.log('loadProfile result:', { data, error });
    if (data) {
      state.profile = data;
      state.dbReady = true;
    } else {
      state.profile = null;
      state.dbReady = true;
    }
  } catch (err) {
    console.error('loadProfile error:', err);
    state.profile = null;
    state.dbReady = true;
  }
}

let _loadingTimer;
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
}

function hideAppLoading() {
  const loader = document.getElementById('app-loading');
  if (!loader) return;
  loader.classList.add('hidden');
  _loadingTimer = setTimeout(() => {
    loader.style.display = 'none';
    const textEl = loader.querySelector('.loading-text');
    if (textEl) textEl.textContent = 'Carregando IAA...';
  }, 500);
}

// =============================================
// PAGE NAVIGATION
// =============================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  const el = document.getElementById(id);
  if (!el) return;
  if (id === 'profile-selection' || id === 'email-verify') {
    el.style.display = 'flex';
    el.classList.add('active');
    if (id === 'email-verify') setupOtpInputs();
  } else {
    el.style.display = 'block';
    el.classList.add('active');
  }
  window.scrollTo(0, 0);
  console.log('showPage:', id);
  // Atualizar contadores quando voltar para a landing
  if (id === 'landing') {
    updateLandingStats();
  }
}

function goDash(section) {
  if (!state.user) { showPage('login'); return; }
  showPage('dashboard');
  showDash(section);
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
        showPage('dashboard');
        showDash('feed');
        showToast('Bem-vindo de volta! 👋');
      } else {
        showPage('profile-selection');
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

  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password: pwd });
    console.log('doLogin result:', { data, error });
    if (btn) { btn.textContent = 'Entrar'; btn.disabled = false; }

    if (error) {
      hideAppLoading();
      console.error('Login error:', error.message, error);
      const msgs = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'Email not confirmed': 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
        'Invalid API key': 'Erro de configuração do servidor.',
        'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
        'Request rate limit reached': 'Muitas tentativas. Aguarde alguns minutos.',
      };
      showAuthError('login-error', msgs[error.message] || ('Erro: ' + error.message));
      return;
    }

    if (data && data.session) {
      console.log('Login bem-sucedido');
      // Navigate immediately after successful login
      await loadProfile(data.user.id);
      await handleAuthSuccess(data.user);
    }
  } catch (err) {
    hideAppLoading();
    if (btn) { btn.textContent = 'Entrar'; btn.disabled = false; }
    console.error('Login catch:', err);

    // If Supabase failed, try local mode
    useLocalMode = true;
    showAuthError('login-error', 'Servidor indisponível. Usando modo offline.');
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
  try {
    const { data, error } = await db.auth.signUp({
      email,
      password: pwd,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.href.split('#')[0]
      }
    });

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
      showPage('profile-selection');
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
    console.error('Signup catch:', err);

    // If Supabase failed, try local mode
    useLocalMode = true;
    doSignup();
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
        queryParams: { prompt: 'select_account' }
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
      type: 'email'
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
      showPage('profile-selection');
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
        showPage('profile-selection');
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
    showPage('dashboard');
    showDash('feed');
    const firstNav = document.querySelectorAll('.nav-item')[0];
    if (firstNav) firstNav.classList.add('active');
    showToast('Perfil configurado! Bem-vindo ao IAA! 🎉');
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
    showPage('dashboard');
    showDash('feed');
    const firstNav = document.querySelectorAll('.nav-item')[0];
    if (firstNav) firstNav.classList.add('active');
    showToast('Perfil configurado! Bem-vindo ao IAA! 🎉');
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
  const s = document.getElementById('sidebar');
  if (window.innerWidth <= 768) s.classList.toggle('mobile-open');
  else s.classList.toggle('collapsed');
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('iaa-theme', state.theme);
  const btn = document.querySelector('.topbar-right .icon-btn');
  if (btn) btn.textContent = state.theme === 'dark' ? '☀️' : '🌙';
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
function showDash(section) {
  const c = document.getElementById('dash-content');
  if (!c) return;
  const renderer = renders[section];
  if (renderer) {
    renderer(c);
  } else {
    c.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text2)">Em breve</div>';
  }
}

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
      <button class="btn btn-primary btn-sm" onclick="showDash('publications');setActive(document.querySelectorAll('.nav-item')[8])">+ Publicar</button>
    </div>
    <div class="quick-links">
      <div class="quick-link" onclick="setActive(document.querySelectorAll('.nav-item')[1]);showDash('services')"><div class="quick-link-icon" style="background:rgba(37,99,235,.1)">🔧</div><span>Serviços</span></div>
      <div class="quick-link" onclick="setActive(document.querySelectorAll('.nav-item')[2]);showDash('businesses')"><div class="quick-link-icon" style="background:rgba(20,184,166,.1)">🏢</div><span>Empresas</span></div>
      <div class="quick-link" onclick="setActive(document.querySelectorAll('.nav-item')[3]);showDash('jobs')"><div class="quick-link-icon" style="background:rgba(245,158,11,.1)">💼</div><span>Vagas</span></div>
      <div class="quick-link" onclick="setActive(document.querySelectorAll('.nav-item')[4]);showDash('classifieds')"><div class="quick-link-icon" style="background:rgba(34,197,94,.1)">🏷️</div><span>Classif.</span></div>
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
      try { const res = await db.from('profiles').select('*').eq('profile_type', 'provider').order('created_at', { ascending: false }); data = res.data; } catch (err) { }
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
      try { const res = await db.from('profiles').select('*').eq('profile_type', 'business').order('created_at', { ascending: false }); data = res.data; } catch (err) { }
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
      try { const res = await db.from('jobs').select('*, profiles(full_name,phone,avatar_url)').order('created_at', { ascending: false }); data = res.data; } catch (err) { }
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

  // --- VIDEOS ---
  videos: async (c) => {
    c.innerHTML = `<div>
    <div class="page-header">
      <div><div class="page-title">Vídeos</div><div class="page-sub">Conteúdo local em vídeo</div></div>
      <button class="btn btn-primary btn-sm" onclick="openUploadVideo()">+ Novo vídeo</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px" id="video-grid">
      <div style="text-align:center;padding:40px;grid-column:1/-1"><div class="loading-spinner" style="margin:0 auto"></div></div>
    </div>
  </div>`;
    let data = null; if (db) try { const res = await db.from('videos').select('*, profiles(full_name,avatar_url)').order('created_at', { ascending: false }); data = res.data; } catch (err) { }
    const cont = document.getElementById('video-grid');
    if (cont) {
      if (!data || data.length === 0) {
        cont.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text2)"><div style="font-size:48px;margin-bottom:12px">▶️</div><p>Nenhum vídeo publicado ainda.</p><button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="openUploadVideo()">+ Publicar primeiro vídeo</button></div>`;
      } else {
        cont.innerHTML = data.map(v => videoCard(v)).join('');
      }
    }
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
    let data = null; if (db) try { const res = await db.from('photos').select('*, profiles(full_name)').order('created_at', { ascending: false }); data = res.data; } catch (err) { }
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
    c.innerHTML = `<div style="max-width:680px">
    <div class="page-header">
      <div><div class="page-title">Meu Perfil</div><div class="page-sub">Gerencie suas informações</div></div>
      <button class="btn btn-outline btn-sm" onclick="openEditProfile()">✏️ Editar</button>
    </div>
    <div class="profile-card">
      <div class="profile-top">
        <div class="profile-avatar-wrap">
          <div class="profile-avatar" id="profile-avatar-display">
            ${p?.avatar_url ? `<img src="${p.avatar_url}" alt=""/>` : name.charAt(0).toUpperCase()}
          </div>
          <div class="profile-cam-btn" onclick="document.getElementById('avatar-input').click()">📷</div>
        </div>
        <div style="flex:1">
          <div class="profile-name" id="profile-name-display">${name}</div>
          <div class="profile-badges"><span class="badge badge-blue">${typeLabel}</span></div>
          <p class="profile-bio" id="profile-bio-display">${p?.bio || 'Nenhuma descrição adicionada ainda.'}</p>
          <div class="profile-details">
            ${p?.city ? `<div class="profile-detail">📍 ${p.city}</div>` : ''}
            ${p?.phone ? `<div class="profile-detail">📱 ${p.phone}</div>` : ''}
            <div class="profile-detail">✉️ ${state.user?.email || ''}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="stats-grid">
      ${[{ l: 'Visualizações', v: p?.views || 0, i: '👁️' }, { l: 'Contatos', v: p?.contacts || 0, i: '📱' }, { l: 'Avaliações', v: p?.rating_count || 0, i: '⭐' }, { l: 'Salvos', v: p?.saves || 0, i: '🔖' }].map(s => `<div class="stat-box"><div style="font-size:22px;margin-bottom:4px">${s.i}</div><div class="stat-box-val">${s.v}</div><div class="stat-box-lbl">${s.l}</div></div>`).join('')}
    </div>
    <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h3 style="font-size:15px;font-weight:700">Minhas publicações</h3>
        <button class="btn btn-outline btn-sm" onclick="setActive(document.querySelectorAll('.nav-item')[8]);showDash('publications')">Ver todas</button>
      </div>
      <div id="my-pubs-preview"><div style="text-align:center;padding:20px"><div class="loading-spinner" style="margin:0 auto"></div></div></div>
    </div>
  </div>`;
    loadMyPublications();
  },

  // --- PUBLICATIONS ---
  publications: async (c) => {
    c.innerHTML = `<div style="max-width:640px">
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
    c.innerHTML = `<div style="max-width:780px">
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
      <button class="btn btn-outline btn-sm" onclick="setActive(document.querySelectorAll('.nav-item')[7]);showDash('profile')">Completar perfil</button>
    </div>
  </div>`;
  },

  // --- NOTIFICATIONS ---
  notifications: async (c) => {
    c.innerHTML = `<div style="max-width:600px">
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
    c.innerHTML = `<div style="max-width:580px">
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
    c.innerHTML = `<div style="max-width:620px">
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
    cont.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--text2);font-size:14px">Nenhuma publicação ainda.</div>`;
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

function videoCard(v) {
  const p = v.profiles || {};
  const author = p.full_name || 'Usuário';
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;cursor:pointer;transition:box-shadow .15s" onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'" onmouseout="this.style.boxShadow=''">
    <div style="height:150px;background:linear-gradient(135deg,rgba(37,99,235,.15),rgba(14,165,233,.1));display:flex;align-items:center;justify-content:center;position:relative">
      ${v.thumbnail_url ? `<img src="${v.thumbnail_url}" alt="" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0"/>` : ''}
      <div style="position:relative;width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 2px 8px rgba(0,0,0,.15)">▶️</div>
    </div>
    <div style="padding:12px">
      <p style="font-size:14px;font-weight:600;margin-bottom:4px;line-height:1.4">${escHtml(v.title || '')}</p>
      <p style="font-size:12px;color:var(--text2)">${escHtml(author)} · ${v.views_count || 0} visualizações</p>
    </div>
  </div>`;
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
    showDash('publications');
    return;
  }
  if (!db) { showToast('Erro de conexão'); return; }
  try {
    const { error } = await db.from('publications').delete().eq('id', id).eq('user_id', state.user.id);
    if (error) { showToast('Erro ao excluir'); return; }
    showToast('Publicação excluída');
    showDash('publications');
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
    showDash('feed');
    return;
  }

  if (!db) return;
  try {
    const { error } = await db.from('publications').insert(pubData);
    if (error) { showToast('Erro: ' + error.message); return; }
    closeModal();
    showToast('Publicação criada!');
    showDash('feed');
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
    closeModal(); showToast('Vaga publicada!'); showDash('jobs');
    return;
  }

  if (!db) return;
  try {
    const { error } = await db.from('jobs').insert(jobData);
    if (error) { showToast('Erro: ' + error.message); return; }
    updateLandingStats();
    closeModal(); showToast('Vaga publicada!'); showDash('jobs');
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
    closeModal(); showToast('Anúncio publicado!'); showDash('classifieds');
    return;
  }

  if (!db) return;
  try {
    const { error } = await db.from('classifieds').insert(clData);
    if (error) { showToast('Erro: ' + error.message); return; }
    updateLandingStats();
    closeModal(); showToast('Anúncio publicado!'); showDash('classifieds');
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
  if (!state.user || !db) return;
  const title = document.getElementById('vid-title')?.value.trim();
  if (!title) { alert('Digite o título'); return; }

  const fileInput = document.getElementById('vid-file');
  let video_url = document.getElementById('vid-url')?.value.trim();

  if ((!fileInput || !fileInput.files[0]) && !video_url) {
    showToast('Selecione um arquivo ou preencha a URL.');
    return;
  }

  const btn = document.getElementById('btn-save-video');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 50 * 1024 * 1024) {
        showToast('Vídeo muito grande. Máximo 50MB.');
        if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
        return;
      }
      const ext = file.name.split('.').pop();
      const filePath = `${state.user.id}/videos/${Date.now()}.${ext}`;

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

    closeModal(); showToast('Vídeo publicado!'); showDash('videos');
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
  if (!state.user || !db) return;

  const fileInput = document.getElementById('photo-file');
  let photo_url = document.getElementById('photo-url')?.value.trim();

  if ((!fileInput || !fileInput.files[0]) && !photo_url) {
    showToast('Selecione uma foto ou insira uma URL.');
    return;
  }

  const btn = document.getElementById('btn-save-photo');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      if (file.size > 10 * 1024 * 1024) {
        showToast('Foto muito grande. Máximo 10MB.');
        if (btn) { btn.disabled = false; btn.textContent = 'Publicar'; }
        return;
      }
      const ext = file.name.split('.').pop();
      const filePath = `${state.user.id}/photos/${Date.now()}.${ext}`;

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

    closeModal(); showToast('Foto publicada!'); showDash('photos');
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
  if (!state.user || !db) return;
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

  try {
    const { error } = await db.from('profiles').update(updates).eq('id', state.user.id);
    if (error) { showToast('Erro: ' + error.message); return; }

    state.profile = { ...state.profile, ...updates };
    updateAvatarUI();
    closeModal();
    showToast('Perfil atualizado!');
    showDash('profile');
  } catch (err) {
    showToast('Erro inesperado ao salvar perfil.');
  }
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
  if (!input.files || !input.files[0] || !state.user || !db) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) { showToast('Arquivo muito grande. Máximo 5MB.'); return; }

  showToast('Fazendo upload...');
  const ext = file.name.split('.').pop();
  const filePath = `${state.user.id}/avatar.${ext}`;

  try {
    const { error: uploadErr } = await db.storage.from('profiles').upload(filePath, file, { upsert: true });
    if (uploadErr) { showToast('Erro no upload: ' + uploadErr.message); return; }

    const { data: urlData } = db.storage.from('profiles').getPublicUrl(filePath);
    const avatar_url = urlData.publicUrl + '?t=' + Date.now();

    await db.from('profiles').update({ avatar_url, updated_at: new Date().toISOString() }).eq('id', state.user.id);
    state.profile.avatar_url = avatar_url;

    // Update UI
    const avatarEl = document.getElementById('topbar-avatar');
    if (avatarEl) avatarEl.innerHTML = `<img src="${avatar_url}" alt=""/>`;
    const profileAvatar = document.getElementById('profile-avatar-display');
    if (profileAvatar) profileAvatar.innerHTML = `<img src="${avatar_url}" alt=""/>`;

    showToast('Foto atualizada!');
  } catch (err) { showToast('Erro inesperado no upload'); }
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
    // Contar do localStorage
    updateLandingStatsFromLocal();
    return;
  }
  const tables = [
    { id: 'stat-services', table: 'profiles', filter: { profile_type: 'provider' } },
    { id: 'stat-businesses', table: 'profiles', filter: { profile_type: 'business' } },
    { id: 'stat-jobs', table: 'jobs' },
    { id: 'stat-classifieds', table: 'classifieds' },
  ];
  for (const t of tables) {
    try {
      let query = db.from(t.table).select('*', { count: 'exact', head: true });
      if (t.filter) Object.entries(t.filter).forEach(([k, v]) => { query = query.eq(k, v); });
      const { count } = await query;
      const el = document.getElementById(t.id);
      if (el) el.textContent = count !== null ? count : '0';
    } catch (err) { }
  }
}

function updateLandingStatsFromLocal() {
  const profiles = localDB.getAllProfiles();
  const services = profiles.filter(p => p.profile_type === 'provider').length;
  const businesses = profiles.filter(p => p.profile_type === 'business').length;
  const jobs = localDB.getJobs().length;
  const classifieds = localDB.getClassifieds().length;

  // Also count publications by type as fallback
  const pubs = localDB.getPublications();
  const jobPubs = pubs.filter(p => p.type === 'job').length;
  const clPubs = pubs.filter(p => p.type === 'classified').length;

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl('stat-services', services);
  setEl('stat-businesses', businesses);
  setEl('stat-jobs', jobs + jobPubs);
  setEl('stat-classifieds', classifieds + clPubs);
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
if (!_initAuthHandledNavigation) {
  showPage('landing');
}
loadLandingStats();

// Theme icon
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.topbar-right .icon-btn');
  if (btn && state.theme === 'dark') btn.textContent = '☀️';
});

// Fallback: hide loader — but NOT if OAuth callback is being processed
setTimeout(() => {
  if (isOAuthCallback()) return; // Don't hide loader during OAuth processing
  const loader = document.getElementById('app-loading');
  if (loader && !loader.classList.contains('hidden')) {
    loader.classList.add('hidden');
    setTimeout(() => loader.style.display = 'none', 500);
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
    // Footer
    document.querySelectorAll('footer').forEach(el => el.classList.add('reveal'));
  }

  // 2. Intersection Observer for scroll reveals
  function setupScrollReveal() {
    const observerOptions = {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
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
  function animateStatCounters() {
    const statEls = document.querySelectorAll('.stat-val');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.animated) {
          entry.target.dataset.animated = 'true';
          const text = entry.target.textContent;
          const num = parseInt(text.replace(/[^0-9]/g, ''));
          if (!isNaN(num) && num > 0) {
            const suffix = text.replace(/[0-9]/g, '').trim();
            const duration = 1200;
            const start = performance.now();
            const easeOut = t => 1 - Math.pow(1 - t, 3);
            function tick(now) {
              const progress = Math.min((now - start) / duration, 1);
              const current = Math.round(easeOut(progress) * num);
              entry.target.textContent = current + (suffix ? '' + suffix : '');
              if (progress < 1) requestAnimationFrame(tick);
              else entry.target.classList.add('counting');
            }
            entry.target.textContent = '0';
            requestAnimationFrame(tick);
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    statEls.forEach(el => observer.observe(el));
  }

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
