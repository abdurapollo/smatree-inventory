/* ==========================================================================
   SMATREE SOLAR INVENTORY — App Initialization
   Theme toggle, sidebar management, session checks, global events
   ========================================================================== */

const App = {
  init() {
    // Purge legacy Service Worker & stale CacheStorage
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      }).catch(() => {});
    }
    if (window.caches) {
      caches.keys().then(keys => {
        keys.forEach(k => caches.delete(k));
      }).catch(() => {});
    }

    // Seed demo data on first load
    SeedData.generate();
    // Apply saved theme
    this.applyTheme();
    // Live navbar clock
    this.initClock();
    // Setup global event listeners
    this.setupGlobalEvents();
  },

  /* ── Live Header Clock ── */
  initClock() {
    const clockEl = document.getElementById('dash-live-clock');
    const dateEl = document.getElementById('dash-live-date');
    if (!clockEl && !dateEl) return;

    const updateClock = () => {
      const now = new Date();
      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
    };

    updateClock();
    if (this._clockInterval) clearInterval(this._clockInterval);
    this._clockInterval = setInterval(updateClock, 1000);
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
    if (btn) {
      btn.innerHTML = typeof Icons !== 'undefined' ? (newTheme === 'dark' ? Icons.sun(18) : Icons.moon(18)) : (newTheme === 'dark' ? '☀️' : '🌙');
      btn.setAttribute('data-tooltip', newTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme');
    }
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

      // Fast Demo Role Switcher toggle
      if (e.target.closest('#rbac-role-toggle-btn')) {
        const menu = document.getElementById('rbac-switch-menu');
        if (menu) menu.classList.toggle('show');
      }

      // Fast Switcher item clicked
      if (e.target.closest('[data-nav-switch]')) {
        const email = e.target.closest('[data-nav-switch]').dataset.navSwitch;
        if (typeof RBAC !== 'undefined') {
          RBAC.switchDemoUser(email);
        }
      }

      // Open RBAC matrix modal from navbar / profile / sidebar user card
      if (e.target.closest('#rbac-open-matrix-btn') || e.target.closest('#rbac-profile-matrix-btn') || e.target.closest('#sidebar-user-btn')) {
        if (typeof RBAC !== 'undefined') {
          RBAC.showMatrixModal();
        }
      }

      // Open Create New User Modal (Super Admin privileged action)
      if (e.target.closest('#rbac-create-user-btn') || e.target.closest('#rbac-switch-create-user-btn') || e.target.closest('#dash-create-user-btn') || e.target.closest('[data-open-create-user]')) {
        const menu1 = document.getElementById('profile-menu');
        if (menu1) menu1.classList.remove('show');
        const menu2 = document.getElementById('rbac-switch-menu');
        if (menu2) menu2.classList.remove('show');
        if (typeof RBAC !== 'undefined') {
          RBAC.showCreateUserModal();
        }
      }

      // Open User Directory Modal (Super Admin)
      if (e.target.closest('#rbac-manage-users-btn') || e.target.closest('#rbac-switch-directory-btn') || e.target.closest('[data-open-user-directory]')) {
        const menu1 = document.getElementById('profile-menu');
        if (menu1) menu1.classList.remove('show');
        const menu2 = document.getElementById('rbac-switch-menu');
        if (menu2) menu2.classList.remove('show');
        if (typeof RBAC !== 'undefined') {
          RBAC.showUserDirectoryModal();
        }
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

      // Header live telemetry sync button
      if (e.target.closest('#dash-refresh-btn')) {
        if (typeof Dashboard !== 'undefined' && typeof Dashboard.refreshData === 'function') {
          Dashboard.refreshData(true);
        } else {
          const syncBtn = document.getElementById('dash-refresh-btn');
          if (syncBtn) {
            syncBtn.classList.add('loading');
            syncBtn.style.opacity = '0.7';
            setTimeout(() => {
              syncBtn.classList.remove('loading');
              syncBtn.style.opacity = '1';
              if (typeof Components !== 'undefined') {
                Components.syncNavBadgesWithBackend();
                Components.toast('success', 'Telemetry Synchronized', 'Live operational telemetry refreshed.');
              }
            }, 450);
          }
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

      // Start common real-time dynamic clock across all pages
      this.initClock();

      if (typeof Components !== 'undefined') {
        Components.updateNavBadges();
        Components.syncNavBadgesWithBackend();
      }

      if (typeof Notifications !== 'undefined') {
        Notifications.init();
      }
    }

    // Role-Based Access Control Page Enforcer
    if (typeof RBAC !== 'undefined') {
      const isAllowed = RBAC.enforcePageAccess(pageName, pageTitle);
      if (!isAllowed) {
        return false;
      }
    }

    return true;
  }
};

window.App = App;
