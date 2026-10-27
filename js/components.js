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
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">✕</button>
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
    const headerHtml = title ? `
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" data-close-modal>✕</button>
      </div>` : `
      <button class="modal-close" data-close-modal style="position:absolute;top:1rem;right:1rem;z-index:10">✕</button>`;

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

    const icons = { danger: '🗑️', warning: '⚠️', info: 'ℹ️', success: '✅' };
    const bgColors = { danger: 'var(--color-danger-bg)', warning: 'var(--color-warning-bg)', info: 'var(--color-info-bg)', success: 'var(--color-success-bg)' };

    const modal = this.showModal({
      id: 'confirm-dialog',
      title: '',
      size: 'sm',
      content: `
        <div style="text-align:center; padding: var(--space-4) 0;">
          <div class="confirm-icon" style="background:${bgColors[type]}">${icons[type]}</div>
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
            <div class="empty-state-icon">📋</div>
            <div class="empty-state-title">${emptyMessage}</div>
            <div class="empty-state-text">Add new records to see them here.</div>
          </div>
        </div>`;
    }

    let html = `<div class="table-container"><table class="data-table"><thead><tr>`;
    columns.forEach(col => {
      html += `<th data-sort="${col.key || ''}">${col.label}${col.sortable ? ' <span class="sort-icon">↕</span>' : ''}</th>`;
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
    const menuItems = [
      { section: 'Main', items: [
        { icon: '📊', label: 'Dashboard', page: 'dashboard', href: 'dashboard.html' },
        { icon: '📦', label: 'Raw Materials', page: 'inventory', href: 'inventory.html', badge: null },
        { icon: '🏭', label: 'Production', page: 'production', href: 'production.html' },
        { icon: '☀️', label: 'Finished Goods', page: 'finished-goods', href: 'finished-goods.html' },
      ]},
      { section: 'Operations', items: [
        { icon: '🔧', label: 'Installations', page: 'installations', href: 'installations.html' },
        { icon: '💰', label: 'Sales Stock', page: 'sales', href: 'sales.html' },
        { icon: '🤝', label: 'Suppliers', page: 'suppliers', href: 'suppliers.html' },
      ]},
      { section: 'Analytics', items: [
        { icon: '📈', label: 'Reports', page: 'reports', href: 'reports.html' },
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
        <div class="brand-icon">☀️</div>
        <div class="brand-text">
          <span class="brand-name">Smatree Solar</span>
          <span class="brand-sub">Inventory System</span>
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
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
            <span class="nav-badge" id="nav-badge-${item.page}" data-badge-page="${item.page}" style="${item.badge ? 'display:flex' : 'display:none'}">${item.badge || ''}</span>
          </a>`;
      });
      html += `</div>`;
    });

    html += `</nav>
      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebar-user-btn">
          <div class="user-avatar">${Utils.getInitials(user.name)}</div>
          <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-role">${user.role}</div>
          </div>
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

    return `
    <header class="navbar" id="navbar">
      <div class="navbar-left">
        <button class="mobile-menu-btn" id="mobile-menu-btn">☰</button>
        <div class="page-title-area">
          <h1>${pageTitle}</h1>
          ${breadcrumbHtml}
        </div>
        <div class="navbar-search hide-mobile">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" placeholder="Search anything..." id="global-search">
          </div>
        </div>
      </div>
      <div class="navbar-right">
        <button class="theme-toggle" id="theme-toggle" data-tooltip="Toggle theme">
          ${theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button class="navbar-icon-btn" id="notifications-btn" data-tooltip="Notifications">
          🔔
          <span class="notif-badge" id="notif-count">3</span>
        </button>
        <div class="dropdown" id="profile-dropdown">
          <div class="navbar-profile" id="profile-toggle">
            <div class="profile-avatar">${Utils.getInitials(user.name)}</div>
            <span class="profile-name hide-mobile">${user.name}</span>
          </div>
          <div class="dropdown-menu" id="profile-menu">
            <div class="dropdown-item">👤 Profile</div>
            <div class="dropdown-item" id="settings-btn">⚙️ Settings</div>
            <div class="dropdown-item" id="backup-btn">💾 Backup Data</div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-item" id="logout-btn" style="color:var(--color-danger)">🚪 Logout</div>
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
