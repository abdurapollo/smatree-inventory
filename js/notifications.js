/* ==========================================================================
   SMATREE SOLAR INVENTORY — Real-time Notification Engine
   Tracks inventory thresholds, production QA, installations, orders & telemetry
   ========================================================================== */

const Notifications = {
  storageKey: 'smatree_notifications',
  currentFilter: 'all',
  _audioCtx: null,
  soundEnabled: true,

  init() {
    // Scan all entities on initialization
    this.scanAll();

    // Render badge
    this.renderBadge();

    // Setup periodic scanner (checks every 25 seconds for inventory threshold changes)
    if (this._scanInterval) clearInterval(this._scanInterval);
    this._scanInterval = setInterval(() => {
      this.scanAll();
    }, 25000);

    // Setup event listeners
    this.setupListeners();
  },

  /* ── Storage Get / Set ── */

  getAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Notifications read error:', e);
      return [];
    }
  },

  saveAll(list) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
      this.renderBadge();
    } catch (e) {
      console.error('Notifications write error:', e);
    }
  },

  getUnreadCount() {
    return this.getAll().filter(n => !n.read).length;
  },

  /* ── Scan All Entities for Alerts & Milestones ── */

  scanAll() {
    if (typeof Store === 'undefined') return;

    const existing = this.getAll();
    const existingMap = new Map();
    existing.forEach(n => existingMap.set(n.id, n));

    const generated = [];

    // 1. Raw Materials Inventory Alerts
    const inventory = Store.getAll('inventory') || [];
    inventory.forEach(mat => {
      const qty = parseFloat(mat.quantity) || 0;
      const reorder = mat.reorderLevel !== undefined && mat.reorderLevel !== null
        ? parseFloat(mat.reorderLevel)
        : (mat.reorder_level !== undefined ? parseFloat(mat.reorder_level) : 50);

      // Out of Stock (Critical)
      if (qty === 0) {
        generated.push({
          id: `stock-out-${mat.id}`,
          category: 'inventory',
          severity: 'critical',
          title: `CRITICAL: ${mat.name} Out of Stock`,
          message: `Stock level has reached 0 ${mat.unit || 'units'}. Solar module fabrication lines may be halted.`,
          link: 'inventory.html',
          actionLabel: 'Restock Material',
          entityId: mat.id
        });
      }
      // Low Stock Alert (Warning)
      else if (qty <= reorder) {
        generated.push({
          id: `stock-low-${mat.id}`,
          category: 'inventory',
          severity: 'warning',
          title: `Low Stock Alert: ${mat.name}`,
          message: `Stock is at ${qty} ${mat.unit || 'units'} (below threshold of ${reorder}). Reorder from ${mat.supplier || 'supplier'}.`,
          link: 'inventory.html',
          actionLabel: 'Inspect Stock',
          entityId: mat.id
        });
      }
    });

    // 2. Production Batches
    const production = Store.getAll('production') || [];
    production.forEach(batch => {
      if (batch.status === 'Quality Check') {
        generated.push({
          id: `prod-qc-${batch.id}`,
          category: 'production',
          severity: 'warning',
          title: `Quality Check Pending: ${batch.id}`,
          message: `${batch.panelType} (${batch.quantity} panels) reached ${batch.progress || 90}% and awaits EL flash test verification.`,
          link: 'production.html',
          actionLabel: 'Inspect Batch',
          entityId: batch.id
        });
      } else if (batch.status === 'In Production') {
        generated.push({
          id: `prod-active-${batch.id}`,
          category: 'production',
          severity: 'info',
          title: `Production Active: ${batch.id}`,
          message: `${batch.panelType} (${batch.quantity} units) under fabrication by ${batch.teamAssigned || 'Assembly Team'} (${batch.progress || 0}%).`,
          link: 'production.html',
          actionLabel: 'View Batch',
          entityId: batch.id
        });
      } else if (batch.status === 'Completed') {
        generated.push({
          id: `prod-done-${batch.id}`,
          category: 'production',
          severity: 'success',
          title: `Batch Completed: ${batch.id}`,
          message: `${batch.quantity} panels of ${batch.panelType} completed & added to ready inventory.`,
          link: 'finished-goods.html',
          actionLabel: 'View Products',
          entityId: batch.id
        });
      }
    });

    // 3. Finished Goods Stock Alerts
    const finishedGoods = Store.getAll('finishedGoods') || [];
    finishedGoods.forEach(fg => {
      const ready = parseInt(fg.readyToSell) || 0;
      if (ready < 160 && ready > 0) {
        generated.push({
          id: `fg-low-${fg.id}`,
          category: 'production',
          severity: 'warning',
          title: `Limited Sales Stock: ${fg.name}`,
          message: `Only ${ready} panels ready for dispatch. Schedule next fabrication run soon.`,
          link: 'finished-goods.html',
          actionLabel: 'Review Stock',
          entityId: fg.id
        });
      }
    });

    // 4. Installations Projects
    const installations = Store.getAll('installations') || [];
    installations.forEach(inst => {
      if (inst.status === 'In Progress') {
        generated.push({
          id: `inst-active-${inst.id}`,
          category: 'installations',
          severity: 'info',
          title: `Installation Active: ${inst.customerName}`,
          message: `${inst.totalCapacity} kW solar project being commissioned by ${inst.installationTeam || 'Team'}.`,
          link: 'installations.html',
          actionLabel: 'View Project',
          entityId: inst.id
        });
      } else if (inst.status === 'Completed') {
        generated.push({
          id: `inst-done-${inst.id}`,
          category: 'installations',
          severity: 'success',
          title: `Commissioned: ${inst.customerName}`,
          message: `${inst.totalCapacity} kW rooftop solar array connected to grid with 25-year warranty.`,
          link: 'installations.html',
          actionLabel: 'View Project',
          entityId: inst.id
        });
      }
    });

    // 5. Sales & Orders
    const sales = Store.getAll('sales') || [];
    sales.forEach(sale => {
      if (sale.status === 'Reserved') {
        generated.push({
          id: `sale-res-${sale.id}`,
          category: 'sales',
          severity: 'info',
          title: `Stock Reserved: ${sale.customerName}`,
          message: `${sale.quantity} panels of ${sale.productName} allocated for upcoming delivery.`,
          link: 'sales.html',
          actionLabel: 'View Order',
          entityId: sale.id
        });
      }
    });

    // 6. Factory Telemetry Grid
    generated.push({
      id: 'telemetry-grid-online',
      category: 'system',
      severity: 'info',
      title: 'Solar Telemetry Grid Active',
      message: 'Automated cell stringing lines #1 - #4 reporting 99.4% EL yield and synchronized telemetry.',
      link: 'dashboard.html',
      actionLabel: 'Open Telemetry'
    });

    // Merge generated with existing preserving user read status & timestamp
    const merged = [];
    const nowIso = new Date().toISOString();

    generated.forEach(item => {
      if (existingMap.has(item.id)) {
        const prev = existingMap.get(item.id);
        merged.push({
          ...item,
          read: prev.read,
          timestamp: prev.timestamp || nowIso
        });
        existingMap.delete(item.id);
      } else {
        merged.push({
          ...item,
          read: false,
          timestamp: nowIso
        });
      }
    });

    // Retain manually added notifications that weren't auto-scanned
    existingMap.forEach(manualItem => {
      if (manualItem.isManual) {
        merged.unshift(manualItem);
      }
    });

    // Sort: unread first, then by timestamp descending
    merged.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    this.saveAll(merged);

    // If dropdown is open, re-render it
    if (typeof document !== 'undefined') {
      const menu = document.getElementById('notifications-menu');
      if (menu && menu.classList.contains('show')) {
        this.renderDropdown(this.currentFilter);
      }
    }
  },

  /* ── Manually Trigger Notification ── */

  notify(options = {}, showToast = true, playSound = true) {
    const {
      title = 'System Notification',
      message = '',
      severity = 'info',
      category = 'system',
      link = '#',
      actionLabel = 'View'
    } = options;

    const id = `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newNotif = {
      id,
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

    const list = this.getAll();
    list.unshift(newNotif);
    if (list.length > 80) list.length = 80;
    this.saveAll(list);

    if (showToast && typeof Components !== 'undefined' && typeof Components.toast === 'function') {
      const toastType = severity === 'critical' ? 'error' : severity;
      Components.toast(toastType, title, message);
    }

    if (playSound && this.soundEnabled) {
      this.playChime();
    }

    // Trigger browser native notification if permitted
    this.sendDesktopNotification(title, message);

    // Re-render dropdown if open
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
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(783.99, now + 0.08); // G5

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this._audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.22);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.38);
    } catch (e) {
      // Audio not permitted without interaction
    }
  },

  /* ── Native Browser Notification API ── */

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
        Components.toast('success', 'Desktop Alerts Enabled', 'You will now receive desktop notifications for solar inventory alerts.');
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
    } catch (e) {}
  },

  /* ── Actions: Mark Read, Dismiss, Clear ── */

  markAsRead(id) {
    const list = this.getAll();
    const item = list.find(n => n.id === id);
    if (item) {
      item.read = true;
      this.saveAll(list);
      this.renderDropdown(this.currentFilter);
    }
  },

  markAllAsRead() {
    const list = this.getAll();
    list.forEach(n => n.read = true);
    this.saveAll(list);
    this.renderDropdown(this.currentFilter);
    if (typeof Components !== 'undefined') {
      Components.toast('success', 'Marked as Read', 'All notifications have been marked as read.');
    }
  },

  dismiss(id) {
    let list = this.getAll();
    list = list.filter(n => n.id !== id);
    this.saveAll(list);
    this.renderDropdown(this.currentFilter);
  },

  clearAll() {
    this.saveAll([]);
    this.renderDropdown(this.currentFilter);
    if (typeof Components !== 'undefined') {
      Components.toast('info', 'Notifications Cleared', 'All notification items have been dismissed.');
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
    // Close other open dropdowns
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));

    if (!isShown) {
      this.renderDropdown(this.currentFilter);
      menu.classList.add('show');
    } else {
      menu.classList.remove('show');
    }
  },

  /* ── Format Relative Time ── */

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
      if (severity === 'critical') return Icons.alertTriangle(18);
      if (severity === 'warning') return Icons.alertTriangle(18);
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
          <p>${filter === 'unread' ? 'No unread alerts at this time.' : 'No notifications found for this filter.'}</p>
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
          ${unreadCount > 0 ? `<button class="notif-header-btn" id="notif-mark-all-read" title="Mark all notifications as read">Mark all read</button>` : ''}
          ${allItems.length > 0 ? `<button class="notif-header-btn" id="notif-clear-all" style="color:var(--text-muted);" title="Clear all notifications">Clear</button>` : ''}
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

      // Mark all as read
      if (e.target.closest('#notif-mark-all-read')) {
        e.preventDefault();
        e.stopPropagation();
        this.markAllAsRead();
        return;
      }

      // Clear all
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

      // Click on action link -> mark as read then navigate
      const actionLink = e.target.closest('[data-notif-action]');
      if (actionLink) {
        const id = actionLink.getAttribute('data-notif-action');
        this.markAsRead(id);
        return;
      }

      // Click anywhere on notif card -> mark as read
      const card = e.target.closest('.notif-card');
      if (card && !e.target.closest('a') && !e.target.closest('button')) {
        const id = card.getAttribute('data-notif-id');
        if (id) this.markAsRead(id);
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
