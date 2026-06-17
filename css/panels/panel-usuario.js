// =============================================
// PANEL USUARIO — Usuário Comum
// =============================================
const PanelUsuario = (function () {
  let _currentSection = 'feed';

  const NAV_ITEMS = [
    { id: 'feed',          icon: '🏠', label: 'Início' },
    { id: 'services',      icon: '🔧', label: 'Serviços' },
    { id: 'businesses',    icon: '🏢', label: 'Empresas' },
    { id: 'jobs',          icon: '💼', label: 'Vagas' },
    { id: 'classifieds',   icon: '🏷️',  label: 'Classificados' },
    { id: 'videos',        icon: '▶️',  label: 'Vídeos' },
    { id: 'photos',        icon: '📷', label: 'Fotos' },
    { id: 'profile',       icon: '👤', label: 'Meu Perfil' },
    { id: 'publications',  icon: '📄', label: 'Publicações' },
    { id: 'performance',   icon: '📊', label: 'Desempenho' },
    { id: 'notifications', icon: '🔔', label: 'Notificações' },
    { id: 'settings',      icon: '⚙️', label: 'Configurações' },
    { id: 'help',          icon: '❓', label: 'Ajuda' },
  ];

  function renderSidebar() {
    const sidebar = document.getElementById('sidebar-usuario');
    if (!sidebar) return;
    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <img src="logo-iaa.png" alt="IAA" style="height:32px;width:auto;filter:brightness(0) invert(1)">
        <span class="sidebar-logo-text">IAA</span>
      </div>
      <nav class="sidebar-nav">
        ${NAV_ITEMS.map(item => `
          <div class="nav-item${_currentSection === item.id ? ' active' : ''}"
               data-section="${item.id}"
               onclick="PanelUsuario.navigate('${item.id}')">
            <span class="nav-item-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.id === 'notifications'
              ? '<span id="notif-badge" style="display:none;background:var(--danger);color:#fff;border-radius:999px;font-size:10px;padding:1px 6px;margin-left:auto">●</span>'
              : ''}
          </div>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="nav-item" onclick="doLogout()" style="color:#f87171">
          <span class="nav-item-icon">🚪</span>
          <span>Sair</span>
        </div>
      </div>`;
  }

  function renderTopbar() {
    const topbar = document.getElementById('topbar-usuario');
    if (!topbar) return;
    const name = (state.profile && state.profile.full_name)
      || (state.user && state.user.email && state.user.email.split('@')[0])
      || 'U';
    const avatarContent = (state.profile && state.profile.avatar_url)
      ? `<img src="${state.profile.avatar_url}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
      : name.charAt(0).toUpperCase();
    topbar.innerHTML = `
      <button class="icon-btn" onclick="toggleSidebarPanel('sidebar-usuario')" title="Menu">☰</button>
      <div class="topbar-search">
        <span class="topbar-search-icon">🔍</span>
        <input placeholder="Buscar..." oninput="handleSearch(this.value)"/>
      </div>
      <div class="topbar-right">
        <button class="icon-btn" onclick="toggleTheme()" title="Alternar tema">
          ${state.theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div class="topbar-avatar" id="topbar-avatar"
             onclick="PanelUsuario.navigate('profile')"
             style="cursor:pointer;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--brand);color:#fff;font-weight:700;font-size:14px;overflow:hidden">
          ${avatarContent}
        </div>
      </div>`;
  }

  function updateActiveNav() {
    document.querySelectorAll('#sidebar-usuario .nav-item[data-section]').forEach(el => {
      el.classList.toggle('active', el.dataset.section === _currentSection);
    });
  }

  return {
    init() {
      this.initWithSection('feed');
    },

    initWithSection(section) {
      _currentSection = section || 'feed';
      renderSidebar();
      renderTopbar();
      this.navigate(_currentSection);
    },

    navigate(section) {
      _currentSection = section || 'feed';
      updateActiveNav();
      const content = document.getElementById('user-content');
      if (!content) return;
      // Reset dash-content styles (may have been modified by TikTok video feed)
      if (typeof resetDashContent === 'function') resetDashContent();
      if (typeof renders !== 'undefined' && renders[_currentSection]) {
        Promise.resolve(renders[_currentSection](content)).catch(err => {
          console.error('Erro ao renderizar seção', _currentSection, err);
          if (content) { var _sec = _currentSection; content.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text2)"><div style="font-size:40px;margin-bottom:12px">⚠️</div><p>Erro ao carregar. Verifique sua conexão.</p><button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="PanelUsuario.navigate(this.dataset.sec)" data-sec="' + _sec + '">Tentar novamente</button></div>'; }
        });
      } else {
        content.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text2)"><div style="font-size:48px;margin-bottom:12px">🚧</div><p>Seção em breve</p></div>';
      }
    }
  };
})();