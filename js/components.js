/* ==========================================================================
   SMATREE SOLAR INVENTORY — Reusable UI Components
   Modal, Toast, Confirm, DataTable, Pagination, Sidebar/Navbar builders
   ========================================================================== */

const Components = {

  /* ══════════════════════════════════════════════════════════════════════
     TOAST NOTIFICATIONS
     ══════════════════════════════════════════════════════════════════════ */

  _toastContainer: null,

  _ensureToastContainer() {
    if (!this._toastContainer) {
      this._toastContainer = document.createElement('div');
      this._toastContainer.className = 'toast-container';
      document.body.appendChild(this._toastContainer);
    }
  },

  toast(type, title, message, duration = 4000) {
    this._ensureToastContainer();
    const icons = {
      success: typeof Icons !== 'undefined' ? Icons.check(18) : '✅',
      error: typeof Icons !== 'undefined' ? Icons.x(18) : '❌',
      warning: typeof Icons !== 'undefined' ? Icons.alertTriangle(18) : '⚠️',
      info: typeof Icons !== 'undefined' ? Icons.info(18) : 'ℹ️'
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || (typeof Icons !== 'undefined' ? Icons.info(18) : 'ℹ️')}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">${typeof Icons !== 'undefined' ? Icons.x(14) : '✕'}</button>
    `;
    this._toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /* ══════════════════════════════════════════════════════════════════════
     MODAL SYSTEM
     ══════════════════════════════════════════════════════════════════════ */

  showModal(options) {
    const { id, title, content, size = '', footer = '', onClose } = options;
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'modal-overlay';
    const closeBtnSvg = typeof Icons !== 'undefined' ? Icons.x(16) : '✕';
    const headerHtml = title ? `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" data-close-modal>${closeBtnSvg}</button>
      </div>` : `
      <button class="modal-close" data-close-modal style="position:absolute;top:1rem;right:1rem;z-index:10">${closeBtnSvg}</button>`;

    overlay.innerHTML = `
      <div class="modal ${size ? 'modal-' + size : ''}">
        ${headerHtml}
        <div class="modal-body">${content}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    // Close handlers
    let isClosing = false;
    const closeModal = () => {
      if (isClosing) return;
      isClosing = true;
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.remove();
        if (onClose) onClose();
      }, 300);
    };

    overlay.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-close-modal]')) {
        e.preventDefault();
        closeModal();
      }
    });

    return { overlay, close: closeModal };
  },

  closeModal(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }
  },

  /* ══════════════════════════════════════════════════════════════════════
     CONFIRM DIALOG
     ══════════════════════════════════════════════════════════════════════ */

  confirm(options) {
    const {
      title = 'Are you sure?',
      message = 'This action cannot be undone.',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'danger',
      onConfirm,
      onCancel,
    } = options;

    const icons = {
      danger: typeof Icons !== 'undefined' ? Icons.trash(24) : '🗑️',
      warning: typeof Icons !== 'undefined' ? Icons.alertTriangle(24) : '⚠️',
      info: typeof Icons !== 'undefined' ? Icons.info(24) : 'ℹ️',
      success: typeof Icons !== 'undefined' ? Icons.check(24) : '✅'
    };
    const bgColors = { danger: 'var(--color-danger-bg)', warning: 'var(--color-warning-bg)', info: 'var(--color-info-bg)', success: 'var(--color-success-bg)' };
    const textColors = { danger: 'var(--color-danger)', warning: 'var(--color-warning)', info: 'var(--color-info)', success: 'var(--color-success)' };

    const modal = this.showModal({
      id: 'confirm-dialog',
      title: '',
      size: 'sm',
      content: `
        <div style="text-align:center; padding: var(--space-4) 0;">
          <div class="confirm-icon" style="background:${bgColors[type]};color:${textColors[type]}">${icons[type]}</div>
          <div class="confirm-title">${title}</div>
          <div class="confirm-message">${message}</div>
          <div class="confirm-actions">
            <button class="btn btn-secondary" id="confirm-cancel">${cancelText}</button>
            <button class="btn btn-${type}" id="confirm-ok">${confirmText}</button>
          </div>
        </div>
      `,
    });

    document.getElementById('confirm-cancel').addEventListener('click', () => {
      modal.close();
      if (onCancel) onCancel();
    });
    document.getElementById('confirm-ok').addEventListener('click', () => {
      modal.close();
      if (onConfirm) onConfirm();
    });
  },

  /* ══════════════════════════════════════════════════════════════════════
     DATA TABLE
     ══════════════════════════════════════════════════════════════════════ */

  renderTable(options) {
    const { columns, data, containerId, onSort, emptyMessage = 'No records found' } = options;

    if (!data || data.length === 0) {
      return `
        <div class="table-container">
          <div class="empty-state">
            <div class="empty-state-icon" style="color:var(--color-primary-500);opacity:0.85;">${typeof Icons !== 'undefined' ? Icons.package(44) : '📦'}</div>
            <div class="empty-state-title">${emptyMessage}</div>
            <div class="empty-state-text">Add new records to see them here.</div>
          </div>
        </div>`;
    }

    let html = `<div class="table-container"><table class="data-table"><thead><tr>`;
    columns.forEach(col => {
      html += `<th data-sort="${col.key || ''}">${col.label}${col.sortable ? ` <span class="sort-icon">${typeof Icons !== 'undefined' ? Icons.chevronDown(11) : '↕'}</span>` : ''}</th>`;
    });
    html += `</tr></thead><tbody>`;

    data.forEach(row => {
      html += `<tr>`;
      columns.forEach(col => {
        if (col.render) {
          html += `<td>${col.render(row)}</td>`;
        } else {
          html += `<td>${row[col.key] ?? '—'}</td>`;
        }
      });
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    return html;
  },

  /* ══════════════════════════════════════════════════════════════════════
     PAGINATION
     ══════════════════════════════════════════════════════════════════════ */

  renderPagination(paginationData, onPageChange) {
    const { page, totalPages, total, perPage } = paginationData;
    if (totalPages <= 1) return '';

    const start = (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);

    let html = `<div class="pagination">
      <div class="pagination-info">Showing ${start}–${end} of ${total} records</div>
      <div class="pagination-controls">
        <button data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹</button>`;

    // Build page buttons with ellipsis
    const pages = this._getPageNumbers(page, totalPages);
    pages.forEach(p => {
      if (p === '...') {
        html += `<button disabled>…</button>`;
      } else {
        html += `<button data-page="${p}" class="${p === page ? 'active' : ''}">${p}</button>`;
      }
    });

    html += `<button data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>›</button>
      </div></div>`;

    return html;
  },

  _getPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [];
    if (current <= 3) {
      pages.push(1, 2, 3, 4, '...', total);
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
  },

  /* ══════════════════════════════════════════════════════════════════════
     SIDEBAR BUILDER
     ══════════════════════════════════════════════════════════════════════ */

  buildSidebar(activePage) {
    const user = Store.getCurrentUser() || { name: 'Admin', role: 'Admin' };
    const getNavIcon = (page) => {
      if (typeof Icons === 'undefined') return '📦';
      switch (page) {
        case 'dashboard': return Icons.dashboard(19);
        case 'inventory': return Icons.inventory(19);
        case 'production': return Icons.production(19);
        case 'finished-goods': return Icons.finishedGoods(19);
        case 'installations': return Icons.installations(19);
        case 'sales': return Icons.sales(19);
        case 'suppliers': return Icons.suppliers(19);
        case 'reports': return Icons.reports(19);
        default: return Icons.package(19);
      }
    };

    const menuItems = [
      { section: 'Overview', items: [
        { page: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
        { page: 'inventory', label: 'Raw Materials', href: 'inventory.html', badge: null },
        { page: 'production', label: 'Manufacturing', href: 'production.html' },
        { page: 'finished-goods', label: 'Finished Goods', href: 'finished-goods.html' },
      ]},
      { section: 'Operations', items: [
        { page: 'installations', label: 'Installations', href: 'installations.html' },
        { page: 'sales', label: 'Sales & Orders', href: 'sales.html' },
        { page: 'suppliers', label: 'Suppliers', href: 'suppliers.html' },
      ]},
      { section: 'Intelligence', items: [
        { page: 'reports', label: 'Analytics & Reports', href: 'reports.html' },
      ]},
    ];

    // Check low stock for badge
    const invStats = Store.getInventoryStats();
    if (invStats.lowStockCount > 0) {
      menuItems[0].items[1].badge = invStats.lowStockCount;
    }

    let html = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">
          ${typeof Icons !== 'undefined' ? Icons.logo(36) : '<img src="../assets/logo-icon.png" width="36" height="36" alt="SMAtree Solar">'}
        </div>
        <div class="brand-text">
          <div class="brand-name">SMAtree <span class="brand-accent">Solar</span></div>
          <div class="brand-sub">Inventory Management</div>
        </div>
      </div>
      <nav class="sidebar-nav">`;

    menuItems.forEach(section => {
      html += `<div class="nav-section">
        <div class="nav-section-title">${section.section}</div>`;
      section.items.forEach(item => {
        const isActive = item.page === activePage;
        html += `
          <a href="${item.href}" class="nav-item ${isActive ? 'active' : ''}" data-nav-page="${item.page}">
            <span class="nav-icon">${getNavIcon(item.page)}</span>
            <span class="nav-label">${item.label}</span>
            <span class="nav-badge" id="nav-badge-${item.page}" data-badge-page="${item.page}" style="${item.badge ? 'display:flex' : 'display:none'}">${item.badge || ''}</span>
          </a>`;
      });
      html += `</div>`;
    });

    html += `</nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebar-user-btn" title="View Profile & Settings">
          <div class="user-avatar">${Utils.getInitials(user.name)}</div>
          <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-role">${user.role || 'Administrator'}</div>
          </div>
          <div class="user-chevron">${typeof Icons !== 'undefined' ? Icons.chevronDown(13) : '▾'}</div>
        </div>
      </div>
    </aside>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>`;

    return html;
  },

  /**
   * Real-time sidebar navigation badges synchronization
   * Immediately updates badge counts to match live inventory
   */
  updateNavBadges(overrideCount = null) {
    let lowStockCount;
    if (overrideCount !== null && overrideCount !== undefined) {
      lowStockCount = parseInt(overrideCount, 10) || 0;
    } else {
      const invStats = Store.getInventoryStats();
      lowStockCount = invStats.lowStockCount;
    }

    const badges = document.querySelectorAll('#nav-badge-inventory, [data-badge-page="inventory"]');
    badges.forEach(invBadge => {
      if (lowStockCount > 0) {
        invBadge.textContent = lowStockCount;
        invBadge.style.display = 'flex';
      } else {
        invBadge.textContent = '';
        invBadge.style.display = 'none';
      }
    });
  },

  /**
   * Directly syncs sidebar badges with MySQL database telemetry
   */
  async syncNavBadgesWithBackend() {
    this.updateNavBadges();
    try {
      const isPagesDir = window.location.pathname.includes('/pages/');
      const statsEndpoint = isPagesDir ? '../api/dashboard/stats.php' : 'api/dashboard/stats.php';
      const resp = await fetch(statsEndpoint);
      if (resp.ok) {
        const json = await resp.json();
        const lowStock = json?.data?.inventory?.lowStockCount;
        if (lowStock !== undefined && lowStock !== null) {
          this.updateNavBadges(lowStock);
        }
      }
    } catch (e) {
      // Non-blocking fallback
      this.updateNavBadges();
    }
  },

  /* ══════════════════════════════════════════════════════════════════════
     NAVBAR BUILDER
     ══════════════════════════════════════════════════════════════════════ */

  buildNavbar(pageTitle, breadcrumbs = []) {
    const user = Store.getCurrentUser() || { name: 'Admin', role: 'Admin' };
    const theme = Store.getSettings().theme || 'light';

    let breadcrumbHtml = '';
    if (breadcrumbs.length) {
      breadcrumbHtml = `<div class="breadcrumb">`;
      breadcrumbs.forEach((b, i) => {
        if (i > 0) breadcrumbHtml += `<span class="breadcrumb-sep">/</span>`;
        breadcrumbHtml += b.href ? `<a href="${b.href}">${b.label}</a>` : `<span>${b.label}</span>`;
      });
      breadcrumbHtml += `</div>`;
    }

    const sunSvg = typeof Icons !== 'undefined' ? Icons.sun(18) : '☀️';
    const moonSvg = typeof Icons !== 'undefined' ? Icons.moon(18) : '🌙';
    const bellSvg = typeof Icons !== 'undefined' ? Icons.bell(18) : '🔔';
    const searchSvg = typeof Icons !== 'undefined' ? Icons.search(16) : '🔍';
    const menuSvg = typeof Icons !== 'undefined' ? Icons.menu(20) : '☰';
    const userSvg = typeof Icons !== 'undefined' ? Icons.user(16) : '👤';
    const settingsSvg = typeof Icons !== 'undefined' ? Icons.settings(16) : '⚙️';
    const dbSvg = typeof Icons !== 'undefined' ? Icons.database(16) : '💾';
    const logoutSvg = typeof Icons !== 'undefined' ? Icons.logout(16) : '🚪';
    const refreshSvg = typeof Icons !== 'undefined' ? Icons.refresh(13) : '⟳';

    const now = new Date();
    const initialTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const initialDate = now.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    return `
    <header class="navbar" id="navbar">
      <div class="navbar-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn" title="Toggle Navigation Menu">${menuSvg}</button>
        <div class="page-title-area">
          <h1>${pageTitle}</h1>
          ${breadcrumbHtml}
        </div>
        <div class="navbar-search hide-mobile">
          <div class="search-box">
            <span class="search-icon">${searchSvg}</span>
            <input type="text" placeholder="Search materials, products, batches..." id="global-search">
          </div>
        </div>
        <div class="navbar-clock-wrap hide-mobile">
          <div class="live-clock-pill">
            <span class="live-clock-time" id="dash-live-clock">${initialTime}</span>
            <span class="live-clock-date" id="dash-live-date">${initialDate}</span>
          </div>
          <button class="navbar-sync-btn btn btn-sm btn-secondary" id="dash-refresh-btn" data-tooltip="Sync Telemetry" data-tooltip-pos="bottom" aria-label="Sync Telemetry">
            ${refreshSvg}
            <span>Sync</span>
          </button>
        </div>
      </div>
      <div class="navbar-right">
        <button class="theme-toggle" id="theme-toggle" data-tooltip="${theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}" data-tooltip-pos="bottom" aria-label="Toggle Theme">
          ${theme === 'dark' ? sunSvg : moonSvg}
        </button>
        <button class="navbar-icon-btn" id="notifications-btn" data-tooltip="Notifications" data-tooltip-pos="bottom" aria-label="Notifications">
          ${bellSvg}
          <span class="notif-badge" id="notif-count">3</span>
        </button>
        <div class="dropdown" id="profile-dropdown">
          <div class="navbar-profile" id="profile-toggle">
            <div class="profile-avatar">${Utils.getInitials(user.name)}</div>
            <span class="profile-name hide-mobile">${user.name}</span>
            <span class="profile-chevron hide-mobile">${typeof Icons !== 'undefined' ? Icons.chevronDown(13) : '▾'}</span>
          </div>
          <div class="dropdown-menu" id="profile-menu">
            <div class="dropdown-header">
              <div class="dropdown-user-name">${user.name}</div>
              <div class="dropdown-user-role">${user.role || 'Admin'}</div>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item">${userSvg} <span>Profile</span></div>
            <div class="dropdown-item" id="settings-btn">${settingsSvg} <span>Settings</span></div>
            <div class="dropdown-item" id="backup-btn">${dbSvg} <span>Backup Data</span></div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" id="logout-btn" style="color:var(--color-danger)">${logoutSvg} <span>Logout</span></div>
          </div>
        </div>
      </div>
    </header>`;
  },

  /* ══════════════════════════════════════════════════════════════════════
     SKELETON LOADER
     ══════════════════════════════════════════════════════════════════════ */

  renderSkeleton(type = 'card', count = 4) {
    let html = '';
    if (type === 'card') {
      for (let i = 0; i < count; i++) {
        html += `<div class="card"><div class="skeleton skeleton-avatar"></div>
          <div class="skeleton skeleton-title" style="margin-top:12px"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div></div>`;
      }
    } else if (type === 'table') {
      html = `<div class="table-container" style="padding:1rem">`;
      for (let i = 0; i < count; i++) {
        html += `<div class="skeleton skeleton-text" style="margin-bottom:16px;height:40px"></div>`;
      }
      html += `</div>`;
    }
    return html;
  }
};

window.Components = Components;
