/* ==========================================================================
   SMATREE SOLAR INVENTORY — Database-Driven Real-time Notification Engine
   All notifications are stored in and fetched directly from the MySQL database.
   Zero LocalStorage or SessionStorage persistence.
   ========================================================================== */

const Notifications = {
  currentFilter: 'all',
  _audioCtx: null,
  soundEnabled: true,
  _cache: [],
  _unreadCount: 0,
  _isSyncing: false,

  async init() {
    // Aggressively purge any legacy notification keys from browser storage
    try { localStorage.removeItem('smatree_notifications'); } catch (_) {}
    try { sessionStorage.removeItem('smatree_notifications'); } catch (_) {}

    // 1. Initial sync and load from MySQL database
    await this.syncWithDatabase();

    // 2. Render badge
    this.renderBadge();

    // 3. Periodic background sync (checks every 25 seconds for inventory & QC threshold alerts)
    if (this._scanInterval) clearInterval(this._scanInterval);
    this._scanInterval = setInterval(() => {
      this.syncWithDatabase(false);
    }, 25000);

    // 4. Setup event listeners
    this.setupListeners();
  },

  /* ── Database In-Memory Cache Access (Zero LocalStorage) ── */

  /* ── API Endpoint URL Resolution ── */
  _getUrl(endpointName, fallbackRelPath) {
    if (typeof ApiConfig !== 'undefined' && typeof ApiConfig.getUrl === 'function') {
      try {
        return ApiConfig.getUrl(endpointName);
      } catch (_) {}
    }
    return fallbackRelPath;
  },

  /* ── Dual-channel Auth Headers (Cookie + Bearer Token) ── */
  _getHeaders(extra = {}) {
    const headers = {
      'Accept': 'application/json',
      ...extra
    };
    try {
      if (typeof Store !== 'undefined' && typeof Store.getSession === 'function') {
        const session = Store.getSession();
        if (session && session.token) {
          headers['Authorization'] = `Bearer ${session.token}`;
        }
      }
    } catch (_) {}
    return headers;
  },

  _getAuthHeaders(extra = {}) {
    return this._getHeaders(extra);
  },

  getAll() {
    return Array.isArray(this._cache) ? this._cache : [];
  },

  getUnreadCount() {
    if (typeof this._unreadCount === 'number') {
      return this._unreadCount;
    }
    return this.getAll().filter(n => !n.read).length;
  },

  /* ── Fetch & Sync Directly with MySQL Database ── */

  async fetchFromDatabase() {
    try {
      const url = this._getUrl('notifications', '../api/notifications/index.php');
      const resp = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: this._getHeaders()
      });
      const res = await resp.json().catch(() => null);
      if (res && res.success && Array.isArray(res.data)) {
        this._cache = res.data;
        this._unreadCount = typeof res.unread_count === 'number' ? res.unread_count : this._cache.filter(n => !n.read).length;
        this.renderBadge();
        const menu = document.getElementById('notifications-menu');
        if (menu && menu.classList.contains('show')) {
          this.renderDropdown(this.currentFilter);
        }
      }
    } catch (e) {
      console.warn('Notifications fetch error:', e);
    }
  },

  async syncWithDatabase(showChime = false) {
    if (this._isSyncing) return;
    this._isSyncing = true;
    try {
      const url = this._getUrl('notificationsSync', '../api/notifications/sync.php');
      const resp = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: this._getHeaders({ 'Content-Type': 'application/json' })
      });
      const res = await resp.json().catch(() => null);
      if (res && res.success && Array.isArray(res.data)) {
        const prevCount = this._unreadCount;
        this._cache = res.data;
        this._unreadCount = typeof res.unread_count === 'number' ? res.unread_count : this._cache.filter(n => !n.read).length;
        this.renderBadge();

        if (showChime && this._unreadCount > prevCount && this.soundEnabled) {
          this.playChime();
        }

        const menu = document.getElementById('notifications-menu');
        if (menu && menu.classList.contains('show')) {
          this.renderDropdown(this.currentFilter);
        }
      }
    } catch (e) {
      console.warn('Notifications sync error:', e);
    } finally {
      this._isSyncing = false;
    }
  },

  scanAll() {
    return this.syncWithDatabase(false);
  },

  /* ── Manually Trigger Notification into MySQL ── */

  async notify(options = {}, showToast = true, playSound = true) {
    const {
      title = 'System Notification',
      message = '',
      severity = 'info',
      category = 'system',
      link = '#',
      actionLabel = 'View'
    } = options;

    const notifCode = `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newNotif = {
      id: notifCode,
      category,
      severity,
      title,
      message,
      link,
      actionLabel,
      read: false,
      isManual: true,
      timestamp: new Date().toISOString()
    };

    // Optimistic UI update
    this._cache.unshift(newNotif);
    this._unreadCount++;
    this.renderBadge();

    // Persist to MySQL database
    try {
      const url = this._getUrl('notificationsAdd', '../api/notifications/create.php');
      await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: this._getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          id: notifCode,
          category,
          severity,
          title,
          message,
          link,
          actionLabel
        })
      });
    } catch (e) {
      console.error('Failed to save notification to database:', e);
    }

    if (showToast && typeof Components !== 'undefined' && typeof Components.toast === 'function') {
      const toastType = severity === 'critical' ? 'error' : severity;
      Components.toast(toastType, title, message);
    }

    if (playSound && this.soundEnabled) {
      this.playChime();
    }

    this.sendDesktopNotification(title, message);

    const menu = document.getElementById('notifications-menu');
    if (menu && menu.classList.contains('show')) {
      this.renderDropdown(this.currentFilter);
    }

    return newNotif;
  },

  /* ── Audio Chime via Web Audio API ── */

  playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this._audioCtx) {
        this._audioCtx = new AudioCtx();
      }
      if (this._audioCtx.state === 'suspended') {
        this._audioCtx.resume();
      }

      const now = this._audioCtx.currentTime;
      const osc1 = this._audioCtx.createOscillator();
      const osc2 = this._audioCtx.createOscillator();
      const gain = this._audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(783.99, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this._audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.22);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.38);
    } catch (_) {}
  },

  /* ── Native Browser Desktop Notifications ── */

  async requestDesktopPermission() {
    if (!('Notification' in window)) {
      if (typeof Components !== 'undefined') {
        Components.toast('info', 'Not Supported', 'Desktop notifications are not supported in this browser.');
      }
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      if (typeof Components !== 'undefined') {
        Components.toast('success', 'Desktop Alerts Enabled', 'You will receive desktop alerts for solar inventory thresholds.');
      }
      this.sendDesktopNotification('SMAtree Solar Notifications', 'Desktop notification alerts are active!');
    }
  },

  sendDesktopNotification(title, message) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const isPages = window.location.pathname.includes('/pages/');
      const iconPath = isPages ? '../assets/favicon-192x192.png' : 'assets/favicon-192x192.png';
      new Notification(title, {
        body: message,
        icon: iconPath,
        badge: iconPath
      });
    } catch (_) {}
  },

  /* ── Database-Backed Actions: Mark Read, Dismiss, Clear ── */

  async markAsRead(id) {
    if (!id) return;
    const item = this._cache.find(n => n.id === id);
    if (item) {
      item.read = true;
    }
    this._unreadCount = Math.max(0, this._cache.filter(n => !n.read).length);
    this.renderBadge();
    this.renderDropdown(this.currentFilter);

    try {
      const url = this._getUrl('notificationsEdit', '../api/notifications/update.php');
      const resp = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: this._getHeaders({ 'Content-Type': 'application/json' }),
        keepalive: true,
        body: JSON.stringify({ id })
      });
      const data = await resp.json().catch(() => null);
      if (!data || !data.success) {
        console.warn('Failed to update notification read status on server:', data);
      }
    } catch (e) {
      console.error('Failed to update notification read status in DB:', e);
    }
  },

  async markAllAsRead() {
    this._cache.forEach(n => n.read = true);
    this._unreadCount = 0;
    this.renderBadge();
    this.renderDropdown(this.currentFilter);

    if (typeof Components !== 'undefined') {
      Components.toast('success', 'Marked as Read', 'All notifications have been marked as read in database.');
    }

    try {
      const url = this._getUrl('notificationsEdit', '../api/notifications/update.php');
      await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: this._getHeaders({ 'Content-Type': 'application/json' }),
        keepalive: true,
        body: JSON.stringify({ mark_all: true })
      });
    } catch (e) {
      console.error('Failed to mark all as read in DB:', e);
    }
  },

  async dismiss(id) {
    if (!id) return;
    const item = this._cache.find(n => n.id === id);
    if (item && !item.read) {
      this._unreadCount = Math.max(0, this._unreadCount - 1);
    }
    this._cache = this._cache.filter(n => n.id !== id);
    this.renderBadge();
    this.renderDropdown(this.currentFilter);

    try {
      const url = this._getUrl('notificationsDel', '../api/notifications/delete.php');
      await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: this._getHeaders({ 'Content-Type': 'application/json' }),
        keepalive: true,
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error('Failed to delete notification from DB:', e);
    }
  },

  async clearAll() {
    this._cache = [];
    this._unreadCount = 0;
    this.renderBadge();
    this.renderDropdown(this.currentFilter);

    if (typeof Components !== 'undefined') {
      Components.toast('info', 'Notifications Cleared', 'All notification records have been dismissed from database.');
    }

    try {
      const url = this._getUrl('notificationsDel', '../api/notifications/delete.php');
      await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: this._getHeaders({ 'Content-Type': 'application/json' }),
        keepalive: true,
        body: JSON.stringify({ clear_all: true })
      });
    } catch (e) {
      console.error('Failed to clear notifications in DB:', e);
    }
  },

  /* ── Render Navbar Badge ── */

  renderBadge() {
    if (typeof document === 'undefined') return;
    const countEl = document.getElementById('notif-count');
    if (!countEl) return;

    const unread = this.getUnreadCount();
    const hasCritical = this.getAll().some(n => !n.read && n.severity === 'critical');

    if (unread > 0) {
      countEl.style.display = 'flex';
      countEl.textContent = unread > 99 ? '99+' : unread;
      if (hasCritical) {
        countEl.classList.add('pulse');
      } else {
        countEl.classList.remove('pulse');
      }
    } else {
      countEl.style.display = 'none';
      countEl.classList.remove('pulse');
    }
  },

  /* ── Toggle Dropdown ── */

  toggleDropdown() {
    if (typeof document === 'undefined') return;
    const menu = document.getElementById('notifications-menu');
    if (!menu) return;

    const isShown = menu.classList.contains('show');
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));

    if (!isShown) {
      this.renderDropdown(this.currentFilter);
      menu.classList.add('show');
      // Background refresh on open
      this.fetchFromDatabase();
    } else {
      menu.classList.remove('show');
    }
  },

  formatRelativeTime(isoString) {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  },

  /* ── Render Dropdown Menu HTML ── */

  renderDropdown(filter = 'all') {
    if (typeof document === 'undefined') return;
    this.currentFilter = filter;
    const menu = document.getElementById('notifications-menu');
    if (!menu) return;

    const allItems = this.getAll();
    const unreadCount = this.getUnreadCount();

    // Filter items
    let filtered = allItems;
    if (filter === 'unread') {
      filtered = allItems.filter(n => !n.read);
    } else if (filter === 'alerts') {
      filtered = allItems.filter(n => n.severity === 'critical' || n.severity === 'warning');
    } else if (filter === 'production') {
      filtered = allItems.filter(n => n.category === 'production');
    } else if (filter === 'projects') {
      filtered = allItems.filter(n => n.category === 'installations' || n.category === 'sales');
    }

    const counts = {
      all: allItems.length,
      unread: unreadCount,
      alerts: allItems.filter(n => n.severity === 'critical' || n.severity === 'warning').length,
      production: allItems.filter(n => n.category === 'production').length,
      projects: allItems.filter(n => n.category === 'installations' || n.category === 'sales').length
    };

    const getIconSvg = (severity, category) => {
      if (typeof Icons === 'undefined') return '⚡';
      if (severity === 'critical' || severity === 'warning') return Icons.alertTriangle(18);
      if (severity === 'success') return Icons.check(18);
      if (category === 'installations') return Icons.installations ? Icons.installations(18) : Icons.tool(18);
      if (category === 'production') return Icons.production ? Icons.production(18) : Icons.cpu(18);
      return Icons.info(18);
    };

    let itemsHtml = '';
    if (filtered.length === 0) {
      itemsHtml = `
        <div class="notif-empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <h4>All Caught Up!</h4>
          <p>${filter === 'unread' ? 'No unread alerts in database.' : 'No notifications found for this filter.'}</p>
        </div>
      `;
    } else {
      filtered.forEach(item => {
        const iconSvg = getIconSvg(item.severity, item.category);
        const relTime = this.formatRelativeTime(item.timestamp);
        itemsHtml += `
          <div class="notif-card ${item.read ? 'read' : 'unread'}" data-notif-id="${item.id}">
            <div class="notif-icon-box ${item.severity}">
              ${iconSvg}
            </div>
            <div class="notif-card-content">
              <div class="notif-card-header-row">
                <span class="notif-card-title">${item.title}</span>
                ${!item.read ? '<span class="notif-card-dot" title="Unread"></span>' : ''}
              </div>
              <p class="notif-card-desc">${item.message}</p>
              <div class="notif-card-footer">
                <span class="notif-card-time">${relTime}</span>
                <div style="display:inline-flex;align-items:center;">
                  ${item.link && item.link !== '#' ? `<a href="${item.link}" class="notif-action-link" data-notif-action="${item.id}">${item.actionLabel || 'View'} &rarr;</a>` : ''}
                  <button class="notif-dismiss-btn" data-notif-dismiss="${item.id}" title="Dismiss" aria-label="Dismiss">&times;</button>
                </div>
              </div>
            </div>
          </div>
        `;
      });
    }

    const permissionGranted = 'Notification' in window && Notification.permission === 'granted';

    menu.innerHTML = `
      <div class="notif-dropdown-header">
        <div class="notif-dropdown-title">
          <span>Notifications</span>
          ${unreadCount > 0 ? `<span class="notif-count-pill">${unreadCount} New</span>` : ''}
        </div>
        <div class="notif-header-actions">
          ${unreadCount > 0 ? `<button class="notif-header-btn" id="notif-mark-all-read" title="Mark all notifications as read in MySQL">Mark all read</button>` : ''}
          ${allItems.length > 0 ? `<button class="notif-header-btn" id="notif-clear-all" style="color:var(--text-muted);" title="Clear all notifications from MySQL">Clear</button>` : ''}
        </div>
      </div>

      <div class="notif-tabs-bar">
        <button class="notif-tab-pill ${filter === 'all' ? 'active' : ''}" data-filter="all">All (${counts.all})</button>
        <button class="notif-tab-pill ${filter === 'unread' ? 'active' : ''}" data-filter="unread">Unread (${counts.unread})</button>
        <button class="notif-tab-pill ${filter === 'alerts' ? 'active' : ''}" data-filter="alerts">Alerts (${counts.alerts})</button>
        <button class="notif-tab-pill ${filter === 'production' ? 'active' : ''}" data-filter="production">Production (${counts.production})</button>
        <button class="notif-tab-pill ${filter === 'projects' ? 'active' : ''}" data-filter="projects">Projects (${counts.projects})</button>
      </div>

      <div class="notif-items-list">
        ${itemsHtml}
      </div>

      <div class="notif-dropdown-footer">
        <button class="notif-sound-btn" id="notif-desktop-btn" title="Desktop alert notifications">
          ${permissionGranted ? '🔔 Desktop Alerts On' : '⚡ Enable Desktop Alerts'}
        </button>
        <a href="reports.html" class="notif-footer-link">Activity Log &rarr;</a>
      </div>
    `;
  },

  /* ── Setup Event Listeners ── */

  setupListeners() {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', (e) => {
      // Toggle dropdown button
      if (e.target.closest('#notifications-btn')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleDropdown();
        return;
      }

      // Filter tabs inside dropdown
      const tabBtn = e.target.closest('.notif-tab-pill');
      if (tabBtn) {
        e.preventDefault();
        e.stopPropagation();
        const filter = tabBtn.dataset.filter;
        this.renderDropdown(filter);
        return;
      }

      // Mark all as read button
      if (e.target.closest('#notif-mark-all-read')) {
        e.preventDefault();
        e.stopPropagation();
        this.markAllAsRead();
        return;
      }

      // Clear all button
      if (e.target.closest('#notif-clear-all')) {
        e.preventDefault();
        e.stopPropagation();
        this.clearAll();
        return;
      }

      // Desktop permission button
      if (e.target.closest('#notif-desktop-btn')) {
        e.preventDefault();
        e.stopPropagation();
        this.requestDesktopPermission();
        return;
      }

      // Dismiss single notification
      const dismissBtn = e.target.closest('[data-notif-dismiss]');
      if (dismissBtn) {
        e.preventDefault();
        e.stopPropagation();
        const id = dismissBtn.getAttribute('data-notif-dismiss');
        this.dismiss(id);
        return;
      }

      // Click on action link -> mark as read, THEN navigate
      const actionLink = e.target.closest('[data-notif-action]');
      if (actionLink) {
        e.preventDefault();
        e.stopPropagation();
        const id = actionLink.getAttribute('data-notif-action');
        const href = actionLink.getAttribute('href');
        if (id) {
          this.markAsRead(id).finally(() => {
            if (href && href !== '#') {
              window.location.href = href;
            }
          });
        } else if (href && href !== '#') {
          window.location.href = href;
        }
        return;
      }

      // Click anywhere on notif card -> mark as read in MySQL
      const card = e.target.closest('.notif-card');
      if (card && !e.target.closest('a') && !e.target.closest('button')) {
        const id = card.getAttribute('data-notif-id');
        if (id) {
          this.markAsRead(id);
        }
        return;
      }

      // Click outside -> close notifications dropdown
      if (!e.target.closest('#notifications-dropdown')) {
        const menu = document.getElementById('notifications-menu');
        if (menu && menu.classList.contains('show')) {
          menu.classList.remove('show');
        }
      }
    });
  }
};

window.Notifications = Notifications;
