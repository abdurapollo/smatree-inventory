/* ==========================================================================
   SMATREE SOLAR INVENTORY — App Initialization
   Theme toggle, sidebar management, session checks, global events
   ========================================================================== */

const App = {
  init() {
    // Seed demo data on first load
    SeedData.generate();
    // Apply saved theme
    this.applyTheme();
    // Setup global event listeners
    this.setupGlobalEvents();
  },

  /* ── Theme Management ── */

  applyTheme() {
    const settings = Store.getSettings();
    const theme = settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  },

  toggleTheme() {
    const settings = Store.getSettings();
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    Store.updateSettings({ theme: newTheme });
    document.documentElement.setAttribute('data-theme', newTheme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  },

  /* ── Sidebar Mobile Toggle ── */

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('show');
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  },

  /* ── Auth Check ── */

  requireAuth() {
    if (!Store.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  logout() {
    Components.confirm({
      title: 'Logout',
      message: 'Are you sure you want to log out?',
      confirmText: 'Logout',
      type: 'warning',
      onConfirm: () => {
        Store.clearSession();
        window.location.href = 'login.html';
      }
    });
  },

  /* ── Global Events ── */

  setupGlobalEvents() {
    document.addEventListener('click', (e) => {
      // Theme toggle
      if (e.target.closest('#theme-toggle')) {
        this.toggleTheme();
      }

      // Mobile menu
      if (e.target.closest('#mobile-menu-btn')) {
        this.toggleSidebar();
      }

      // Sidebar overlay close
      if (e.target.closest('#sidebar-overlay')) {
        this.closeSidebar();
      }

      // Logout
      if (e.target.closest('#logout-btn')) {
        this.logout();
      }

      // Profile dropdown toggle
      if (e.target.closest('#profile-toggle')) {
        const menu = document.getElementById('profile-menu');
        if (menu) menu.classList.toggle('show');
      }

      // Close dropdowns on outside click
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
      }

      // Backup data
      if (e.target.closest('#backup-btn')) {
        const data = Store.exportAllData();
        Utils.downloadBackup(data, `smatree-backup-${Utils.today()}.json`);
        Components.toast('success', 'Backup Created', 'Your data backup has been downloaded.');
      }

      // Pagination clicks
      if (e.target.closest('[data-page]')) {
        const page = parseInt(e.target.closest('[data-page]').dataset.page);
        if (!isNaN(page) && window._onPageChange) {
          window._onPageChange(page);
        }
      }
    });

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
          m.classList.remove('active');
          setTimeout(() => m.remove(), 300);
        });
        this.closeSidebar();
      }
    });
  },

  /* ── Initialize a Page ── */

  initPage(pageName, pageTitle, breadcrumbs = []) {
    if (!this.requireAuth()) return false;
    this.init();

    // Build layout
    const appEl = document.getElementById('app');
    if (!appEl) return false;

    const sidebarHtml = Components.buildSidebar(pageName);
    const navbarHtml = Components.buildNavbar(pageTitle, breadcrumbs);

    // Insert sidebar before main content
    const mainContent = appEl.querySelector('.main-content');
    if (mainContent) {
      appEl.insertAdjacentHTML('afterbegin', sidebarHtml);
      mainContent.insertAdjacentHTML('afterbegin', navbarHtml);
      if (typeof Components !== 'undefined') {
        Components.updateNavBadges();
        Components.syncNavBadgesWithBackend();
      }
    }

    return true;
  }
};

window.App = App;
