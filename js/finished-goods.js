/* ==========================================================================
   SMATREE SOLAR INVENTORY — Solar Products & Finished Goods Module
   Complete Dynamic CRUD Operations, Data Table & Card Views, MySQL Integration,
   Real-Time Stock Allocations, Soft-Delete / Restore & Permanent Deletion
   ========================================================================== */

const FinishedGoods = {
  state: {
    searchQuery: '',
    cellTypeFilter: 'all',
    currentTab: 'active', // 'active' | 'archived'
    viewMode: 'table',    // 'table' (default) | 'cards'
    sortKey: 'product_code',
    sortDir: 'asc',
    currentPage: 1,
    perPage: 10,
    products: [],
    stats: {
      totalActive: 0,
      totalArchived: 0,
      totalProduced: 0,
      readyToSell: 0,
      reservedQuantity: 0,
      soldQuantity: 0
    },
    loading: false
  },

  cellTypes: [
    'Mono PERC',
    'Polycrystalline',
    'Bifacial',
    'TopCon N-Type',
    'HJT Bifacial'
  ],

  async init() {
    if (!App.initPage('finished-goods', 'Solar Products & Finished Goods', [
      { label: 'Home', href: 'dashboard.html' },
      { label: 'Solar Products' }
    ])) return;

    await this.loadData();
    this.renderStats();
    this.renderTabs();
    this.renderToolbar();
    this.renderCurrentView();
    this.setupEvents();
  },

  /**
   * Fetch all products (active + archived) and aggregate stats from backend
   */
  async loadData() {
    this.state.loading = true;
    try {
      const resp = await fetch('../api/products/index.php?filter=all');
      const json = await resp.json();
      if (json && json.success && Array.isArray(json.data)) {
        this.state.products = json.data;
        if (json.stats) {
          this.state.stats = json.stats;
        } else {
          this.recomputeStats();
        }
        // Sync active products to local store for offline resilience
        const activeItems = json.data.filter(p => !p.isDeleted && p.is_deleted === 0);
        Store._set(Store.keys.finishedGoods, activeItems);
      } else {
        this.fallbackToStore();
      }
    } catch (err) {
      console.warn('Backend products fetch failed, using local store:', err);
      this.fallbackToStore();
    } finally {
      this.state.loading = false;
    }
  },

  fallbackToStore() {
    const local = Store.getAll('finishedGoods') || [];
    this.state.products = local.map(p => ({
      ...p,
      product_code: p.product_code || p.id,
      is_deleted: p.is_deleted || (p.isDeleted ? 1 : 0),
      isDeleted: !!p.is_deleted || !!p.isDeleted,
      totalProduced: p.quantity || p.totalProduced || 0,
      readyToSell: p.readyToSell || 0,
      reservedQuantity: p.reservedQuantity || 0,
      soldQuantity: p.soldQuantity || 0,
      pricePerUnit: p.pricePerUnit || p.price || 12500,
      cellType: p.cellType || 'Mono PERC',
      warranty: p.warranty || '25 Years'
    }));
    this.recomputeStats();
  },

  recomputeStats() {
    const active = this.state.products.filter(p => !p.isDeleted && p.is_deleted === 0);
    const archived = this.state.products.filter(p => p.isDeleted || p.is_deleted === 1);
    this.state.stats = {
      totalActive: active.length,
      totalArchived: archived.length,
      totalProduced: active.reduce((s, p) => s + (parseInt(p.totalProduced ?? p.quantity) || 0), 0),
      readyToSell: active.reduce((s, p) => s + (parseInt(p.readyToSell) || 0), 0),
      reservedQuantity: active.reduce((s, p) => s + (parseInt(p.reservedQuantity) || 0), 0),
      soldQuantity: active.reduce((s, p) => s + (parseInt(p.soldQuantity) || 0), 0)
    };
  },

  /**
   * Filter and Sort current products dataset
   */
  getFilteredItems() {
    let items = this.state.products.filter(p => {
      const isArchived = p.isDeleted || p.is_deleted === 1;
      return this.state.currentTab === 'archived' ? isArchived : !isArchived;
    });

    if (this.state.cellTypeFilter && this.state.cellTypeFilter !== 'all') {
      items = items.filter(p => (p.cellType || '').toLowerCase() === this.state.cellTypeFilter.toLowerCase());
    }

    if (this.state.searchQuery) {
      items = Utils.searchFilter(items, this.state.searchQuery, [
        'name', 'product_code', 'id', 'modelNumber', 'cellType', 'wattCapacity', 'warranty', 'notes', 'dimensions'
      ]);
    }

    // Sort items
    const { sortKey, sortDir } = this.state;
    items = [...items].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // Handle nulls
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      // Numeric comparison
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'string') {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }

      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortDir === 'asc' ? -1 : 1;
      if (strA > strB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  },

  /**
   * Render Top 4 Overview Stat Cards
   */
  renderStats() {
    const container = document.getElementById('fg-stats');
    if (!container) return;
    const stats = this.state.stats;

    // Estimate ready inventory value
    const readyValue = this.state.products
      .filter(p => !p.isDeleted && p.is_deleted === 0)
      .reduce((sum, p) => sum + ((p.readyToSell || 0) * (p.pricePerUnit || 0)), 0);

    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-500)">
        <div class="stat-card-header">
          <div class="stat-icon blue">${Icons.solarPanel(22)}</div>
          <span class="stat-trend up">Live Catalog</span>
        </div>
        <div class="stat-value" id="stat-fg-active">${stats.totalActive}</div>
        <div class="stat-label">Active Panel Models</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-emerald-500)">
        <div class="stat-card-header">
          <div class="stat-icon green">${Icons.package(22)}</div>
          <span class="stat-trend up">Manufactured</span>
        </div>
        <div class="stat-value" id="stat-fg-produced">${Utils.formatNumber(stats.totalProduced)}</div>
        <div class="stat-label">Total Manufactured</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-solar-500)">
        <div class="stat-card-header">
          <div class="stat-icon amber">${Icons.zap(22)}</div>
          <span class="stat-trend warning">Est. ${Utils.formatCurrency(readyValue)}</span>
        </div>
        <div class="stat-value" id="stat-fg-ready">${Utils.formatNumber(stats.readyToSell)}</div>
        <div class="stat-label">Ready to Sell Stock</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-4" style="--card-accent:#a855f7">
        <div class="stat-card-header">
          <div class="stat-icon purple">${Icons.folder(22)}</div>
          <span class="stat-trend ${stats.totalArchived > 0 ? 'down' : 'up'}">${stats.totalArchived > 0 ? 'Archived' : 'Clean'}</span>
        </div>
        <div class="stat-value" id="stat-fg-archived">${stats.totalArchived}</div>
        <div class="stat-label">Soft-Deleted / Archived</div>
      </div>
    `;
  },

  /**
   * Render Filter Tabs: Active vs Archived
   */
  renderTabs() {
    const container = document.getElementById('fg-tabs-container');
    if (!container) return;

    const activeCount = this.state.products.filter(p => !p.isDeleted && p.is_deleted === 0).length;
    const archivedCount = this.state.products.filter(p => p.isDeleted || p.is_deleted === 1).length;

    container.innerHTML = `
      <div class="tabs" style="border-bottom:1px solid var(--border-color);margin-bottom:var(--space-4)">
        <button type="button" class="tab ${this.state.currentTab === 'active' ? 'active' : ''}" id="tab-active-prods" style="background:none;border:none">
          ${Icons.solarPanel(16)} Active Products <span class="badge ${this.state.currentTab === 'active' ? 'badge-primary' : 'badge-neutral'}" style="margin-left:6px">${activeCount}</span>
        </button>
        <button type="button" class="tab ${this.state.currentTab === 'archived' ? 'active' : ''}" id="tab-archived-prods" style="background:none;border:none">
          ${Icons.folder(16)} Archived / Soft-Deleted <span class="badge ${this.state.currentTab === 'archived' ? 'badge-purple' : 'badge-neutral'}" style="margin-left:6px">${archivedCount}</span>
        </button>
      </div>
    `;
  },

  /**
   * Render Search, Cell Technology Dropdown, View Switcher & Action Buttons
   */
  renderToolbar() {
    const container = document.getElementById('fg-toolbar');
    if (!container) return;

    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px">
        <span class="search-icon">${Icons.search(16)}</span>
        <input type="text" id="fg-search" placeholder="Search solar panels by model, name, watts..." value="${Utils.escapeHtml(this.state.searchQuery)}">
      </div>
      <div class="toolbar-actions" style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
        <select id="fg-cell-filter" class="form-control" style="width:auto;min-width:170px;height:38px;padding:4px 30px 4px 12px;font-size:var(--fs-sm)">
          <option value="all" ${this.state.cellTypeFilter === 'all' ? 'selected' : ''}>All Cell Types</option>
          ${this.cellTypes.map(c => `<option value="${c}" ${this.state.cellTypeFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>

        <!-- View Switcher (Table vs Cards) -->
        <div class="view-toggle" title="Switch between Table and Grid Cards view">
          <button type="button" id="fg-btn-view-table" class="btn btn-sm ${this.state.viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}">
            ${Icons.reports(14)} Table
          </button>
          <button type="button" id="fg-btn-view-cards" class="btn btn-sm ${this.state.viewMode === 'cards' ? 'btn-primary' : 'btn-ghost'}">
            ⊞ Cards
          </button>
        </div>

        <button class="btn btn-secondary btn-sm" id="fg-export-btn" title="Export catalog to CSV spreadsheet">
          ${Icons.download(15)} Export CSV
        </button>
        <button class="btn btn-primary btn-sm" id="fg-add-btn" style="box-shadow:var(--shadow-md)">
          ${Icons.plus(15)} Add Solar Product
        </button>
      </div>
    `;
  },

  /**
   * Render either the Table View or Cards View based on state.viewMode
   */
  renderCurrentView() {
    const tableContainer = document.getElementById('fg-table-container');
    const gridContainer = document.getElementById('fg-grid');

    if (this.state.viewMode === 'table') {
      if (tableContainer) tableContainer.style.display = 'block';
      if (gridContainer) gridContainer.style.display = 'none';
      this.renderTable();
    } else {
      if (tableContainer) tableContainer.style.display = 'none';
      if (gridContainer) gridContainer.style.display = 'block';
      this.renderCards();
    }
  },

  /**
   * Helper to get badge styling based on Cell Technology
   */
  getCellBadge(cellType) {
    let badgeClass = 'badge-primary';
    if (cellType === 'Bifacial') badgeClass = 'badge-purple';
    else if (cellType === 'TopCon N-Type') badgeClass = 'badge-warning';
    else if (cellType === 'HJT Bifacial') badgeClass = 'badge-info';
    else if (cellType === 'Polycrystalline') badgeClass = 'badge-neutral';
    return `<span class="badge ${badgeClass}" style="font-size:0.75rem">${Utils.escapeHtml(cellType || 'Mono PERC')}</span>`;
  },

  /**
   * Helper to get status badge based on stock level or archive flag
   */
  getStatusBadge(product) {
    const isArchived = product.isDeleted || product.is_deleted === 1;
    const ready = parseInt(product.readyToSell) || 0;

    if (isArchived) {
      return `<span class="badge badge-purple" style="font-weight:600;display:inline-flex;align-items:center;gap:4px">${Icons.folder(12)} Archived</span>`;
    } else if (product.status === 'out_of_stock' || ready <= 0) {
      return '<span class="badge badge-danger">● Out of Stock</span>';
    } else if (product.status === 'low_stock' || ready < 20) {
      return '<span class="badge badge-warning">● Low Stock</span>';
    } else {
      return '<span class="badge badge-success">● In Stock</span>';
    }
  },

  /**
   * Render Dynamic Data Table View
   */
  renderTable() {
    const container = document.getElementById('fg-table-container');
    if (!container) return;

    const items = this.getFilteredItems();
    const paginated = Utils.paginate(items, this.state.currentPage, this.state.perPage);

    const isArchivedTab = this.state.currentTab === 'archived';

    const columns = [
      {
        label: 'Solar Panel / Model',
        key: 'name',
        sortable: true,
        render: (row) => `
          <div class="d-flex align-center gap-3">
            <div class="product-thumb">
              ${row.image ? `<img src="${row.image}" alt="">` : Icons.solarPanel(20)}
            </div>
            <div>
              <div class="fw-semibold text-primary" style="display:flex;align-items:center;gap:6px">
                <span class="badge badge-neutral" style="font-size:0.7rem;font-weight:700">${row.product_code || row.id}</span>
                <span>${Utils.escapeHtml(row.name)}</span>
              </div>
              <div class="fs-xs text-muted" style="margin-top:2px">
                ${row.modelNumber ? `Model: ${Utils.escapeHtml(row.modelNumber)} • ` : ''}
                ${row.dimensions || '2008 × 1002 mm'}
              </div>
            </div>
          </div>
        `
      },
      {
        label: 'Cell Technology',
        key: 'cellType',
        sortable: true,
        render: (row) => this.getCellBadge(row.cellType)
      },
      {
        label: 'Power & Eff.',
        key: 'wattCapacity',
        sortable: true,
        render: (row) => `
          <div>
            <span class="fw-bold" style="color:var(--text-primary)">${row.wattCapacity}W</span>
            ${row.efficiency ? `<span class="fs-xs text-muted" style="margin-left:4px">(${row.efficiency}%)</span>` : ''}
          </div>
        `
      },
      {
        label: 'Unit Price',
        key: 'pricePerUnit',
        sortable: true,
        render: (row) => `
          <span class="fw-bold" style="color:var(--color-primary-400)">
            ${Utils.formatCurrency(row.pricePerUnit || 0)}
          </span>
        `
      },
      {
        label: 'Manufactured',
        key: 'totalProduced',
        sortable: true,
        render: (row) => `
          <span class="fw-semibold">${Utils.formatNumber(row.totalProduced || row.quantity || 0)}</span>
          <span class="fs-xs text-muted">units</span>
        `
      },
      {
        label: 'Ready to Sell',
        key: 'readyToSell',
        sortable: true,
        render: (row) => {
          const ready = parseInt(row.readyToSell) || 0;
          let badgeClass = 'badge-success';
          if (ready <= 0) badgeClass = 'badge-danger';
          else if (ready < 20) badgeClass = 'badge-warning';
          return `<span class="badge ${badgeClass}" style="font-weight:700;font-size:0.8rem">${Utils.formatNumber(ready)} units</span>`;
        }
      },
      {
        label: 'Allocated',
        key: 'reservedQuantity',
        sortable: false,
        render: (row) => `
          <div class="fs-xs">
            <span style="color:var(--color-warning);font-weight:600">${row.reservedQuantity || 0} res</span>
            <span class="text-muted" style="margin:0 4px">•</span>
            <span class="text-muted">${row.soldQuantity || 0} sold</span>
          </div>
        `
      },
      {
        label: 'Status',
        key: 'status',
        sortable: true,
        render: (row) => this.getStatusBadge(row)
      },
      {
        label: 'Actions',
        key: 'actions',
        sortable: false,
        render: (row) => {
          const id = row.product_code || row.id;
          const isArchived = row.isDeleted || row.is_deleted === 1;

          if (isArchived) {
            return `
              <div class="actions">
                <button class="btn btn-ghost btn-sm btn-icon" data-view-prod="${id}" title="View Technical Specs">${Icons.eye(15)}</button>
                <button class="btn btn-ghost btn-sm btn-icon" data-edit-prod="${id}" title="Edit Specifications">${Icons.edit(15)}</button>
                <button class="btn btn-ghost btn-sm btn-icon" data-restore-prod="${id}" title="Restore & Re-enable Product" style="color:var(--color-success)">${Icons.refresh(15)}</button>
                <button class="btn btn-ghost btn-sm btn-icon text-danger" data-permanent-delete-prod="${id}" title="Permanently Delete from Database">${Icons.trash(15)}</button>
              </div>
            `;
          }

          return `
            <div class="actions">
              <button class="btn btn-ghost btn-sm btn-icon" data-view-prod="${id}" title="View Technical Specs">${Icons.eye(15)}</button>
              <button class="btn btn-ghost btn-sm btn-icon" data-edit-prod="${id}" title="Edit Specifications">${Icons.edit(15)}</button>
              <button class="btn btn-ghost btn-sm btn-icon text-danger" data-soft-delete-prod="${id}" title="Soft Delete / Archive">${Icons.trash(15)}</button>
            </div>
          `;
        }
      }
    ];

    container.innerHTML = Components.renderTable({
      columns,
      data: paginated.items,
      emptyMessage: isArchivedTab ? 'No archived solar panel products' : 'No solar panel products found'
    });

    // Add sort direction indicator on current sort header
    const headers = container.querySelectorAll('.data-table thead th[data-sort]');
    headers.forEach(th => {
      if (th.dataset.sort === this.state.sortKey) {
        th.classList.add('sorted');
        const icon = th.querySelector('.sort-icon');
        if (icon) {
          icon.textContent = this.state.sortDir === 'asc' ? '▲' : '▼';
        }
      }
    });

    // Render Pagination
    if (paginated.totalPages > 1) {
      const paginationHtml = Components.renderPagination(paginated);
      container.insertAdjacentHTML('beforeend', paginationHtml);
    }

    // Set page change listener for components.js pagination
    window._onPageChange = (page) => {
      this.state.currentPage = page;
      this.renderTable();
    };
  },

  /**
   * Render Product Cards (Grid View)
   */
  renderCards() {
    const container = document.getElementById('fg-grid');
    if (!container) return;

    const items = this.getFilteredItems();

    if (!items.length) {
      if (this.state.currentTab === 'archived') {
        container.innerHTML = `
          <div class="empty-state animate-fadeIn" style="padding:var(--space-12) var(--space-4);text-align:center">
            <div class="empty-state-icon" style="color:var(--color-purple-500);margin-bottom:var(--space-3)">${Icons.folder(44)}</div>
            <div class="empty-state-title" style="font-size:var(--fs-lg);font-weight:var(--fw-bold)">No Archived Products</div>
            <div class="empty-state-text" style="color:var(--text-muted);max-width:440px;margin:0 auto var(--space-4)">
              When you soft-delete any solar panel from active stock, it is safely preserved here. You can re-enable and restore archived products at any time.
            </div>
            <button class="btn btn-secondary btn-sm" id="empty-switch-active">View Active Products</button>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="empty-state animate-fadeIn" style="padding:var(--space-12) var(--space-4);text-align:center">
            <div class="empty-state-icon" style="color:var(--color-primary-500);margin-bottom:var(--space-3)">${Icons.solarPanel(44)}</div>
            <div class="empty-state-title" style="font-size:var(--fs-lg);font-weight:var(--fw-bold)">No Solar Products Found</div>
            <div class="empty-state-text" style="color:var(--text-muted);max-width:440px;margin:0 auto var(--space-4)">
              ${this.state.searchQuery ? 'No solar panels match your current search criteria.' : 'Create your solar panel catalog to manage production batches and sales stock.'}
            </div>
            <button class="btn btn-primary" id="empty-add-btn">${Icons.plus(15)} Add Solar Product</button>
          </div>
        `;
      }
      return;
    }

    const isArchivedTab = this.state.currentTab === 'archived';

    container.innerHTML = `
      <div class="grid-cols-3">
        ${items.map((p, idx) => {
          const total = p.totalProduced || p.quantity || 0;
          const ready = p.readyToSell || 0;
          const reserved = p.reservedQuantity || 0;
          const sold = p.soldQuantity || 0;
          const pct = total > 0 ? Math.min(100, Math.round((ready / total) * 100)) : 0;
          const isArchived = p.isDeleted || p.is_deleted === 1;
          const id = p.product_code || p.id;

          const statusBadge = this.getStatusBadge(p);

          return `
            <div class="card animate-fadeInUp delay-${(idx % 4) + 1}" style="display:flex;flex-direction:column;height:100%;position:relative;border:1px solid ${isArchived ? 'rgba(168,85,247,0.35)' : 'var(--border-color)'};box-shadow:var(--shadow-sm);transition:all var(--transition-base)">
              
              ${isArchived ? `
                <div style="background:rgba(168,85,247,0.08);border-bottom:1px solid rgba(168,85,247,0.2);padding:6px 12px;margin:-1.5rem -1.5rem 1rem -1.5rem;font-size:var(--fs-xs);color:#a855f7;font-weight:600;display:flex;align-items:center;gap:6px">
                  <span>${Icons.info(14)}</span> Archived product — Hidden from active sales orders
                </div>
              ` : ''}

              <!-- Header Badges -->
              <div class="d-flex justify-between align-center mb-3" style="gap:8px;flex-wrap:wrap">
                <div style="display:flex;gap:6px;align-items:center">
                  <span class="badge badge-neutral" style="font-weight:700;letter-spacing:0.04em">${id}</span>
                  ${this.getCellBadge(p.cellType)}
                </div>
                <div>${statusBadge}</div>
              </div>

              <!-- Product Info -->
              <div style="text-align:center;margin-bottom:var(--space-4);padding-top:var(--space-2)">
                <div style="width:58px;height:58px;margin:0 auto var(--space-3);background:linear-gradient(135deg, rgba(245,158,11,0.12), rgba(59,130,246,0.12));border-radius:var(--radius-xl);display:flex;align-items:center;justify-content:center;color:var(--color-primary-500);box-shadow:var(--shadow-xs)">
                  ${Icons.solarPanel(28)}
                </div>
                <h4 class="fs-md fw-semibold" style="margin-bottom:4px;color:var(--text-primary)">${Utils.escapeHtml(p.name)}</h4>
                <div class="d-flex justify-center align-center" style="gap:8px">
                  <span class="badge badge-neutral" style="font-size:0.75rem">${p.wattCapacity}W Capacity</span>
                  ${p.efficiency ? `<span class="badge badge-neutral" style="font-size:0.75rem">${p.efficiency}% Eff</span>` : ''}
                  ${p.modelNumber ? `<span class="fs-xs text-muted">(${Utils.escapeHtml(p.modelNumber)})</span>` : ''}
                </div>
              </div>

              <!-- Key Specs & Pricing -->
              <div style="background:var(--bg-badge);padding:var(--space-3);border-radius:var(--radius-lg);margin-bottom:var(--space-4);font-size:var(--fs-xs)">
                <div class="d-flex justify-between align-center mb-2">
                  <span class="text-muted">Selling Price</span>
                  <span class="fw-bold" style="font-size:var(--fs-base);color:var(--color-primary-400)">
                    ${Utils.formatCurrency(p.pricePerUnit || 0)} <span style="font-size:0.7rem;font-weight:normal;color:var(--text-muted)">/ unit</span>
                  </span>
                </div>
                <div class="d-flex justify-between align-center mb-1">
                  <span class="text-muted">Dimensions / Weight</span>
                  <span class="fw-medium">${p.dimensions || '2008 × 1002 mm'} • ${p.weightKg || '22.5'} kg</span>
                </div>
                <div class="d-flex justify-between align-center">
                  <span class="text-muted">Warranty Guarantee</span>
                  <span class="fw-medium" style="color:var(--color-solar-500);display:inline-flex;align-items:center;gap:4px">${Icons.shield(13)} ${Utils.escapeHtml(p.warranty || '25 Years')}</span>
                </div>
              </div>

              <!-- Inventory Stock Breakdown -->
              <div class="d-flex justify-between py-2" style="border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light);margin-bottom:var(--space-3)">
                <div class="text-center flex-1">
                  <div class="fs-lg fw-bold text-primary">${Utils.formatNumber(total)}</div>
                  <div class="fs-xs text-muted">Total Units</div>
                </div>
                <div class="text-center flex-1" style="border-left:1px solid var(--border-light);border-right:1px solid var(--border-light)">
                  <div class="fs-lg fw-bold text-success">${Utils.formatNumber(ready)}</div>
                  <div class="fs-xs text-muted">Ready to Sell</div>
                </div>
                <div class="text-center flex-1" style="border-right:1px solid var(--border-light)">
                  <div class="fs-lg fw-bold" style="color:var(--color-warning)">${Utils.formatNumber(reserved)}</div>
                  <div class="fs-xs text-muted">Reserved</div>
                </div>
                <div class="text-center flex-1">
                  <div class="fs-lg fw-bold text-muted">${Utils.formatNumber(sold)}</div>
                  <div class="fs-xs text-muted">Sold</div>
                </div>
              </div>

              <!-- Stock Availability Progress -->
              <div style="margin-bottom:var(--space-4)">
                <div class="d-flex justify-between fs-xs mb-1">
                  <span class="text-muted">Availability Rate</span>
                  <span class="fw-semibold ${pct > 25 ? 'text-success' : 'text-danger'}">${pct}% Available</span>
                </div>
                <div style="height:6px;background:var(--bg-badge);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:${pct > 25 ? 'var(--color-success)' : 'var(--color-danger)'};border-radius:3px;transition:width 0.4s ease"></div>
                </div>
              </div>

              <!-- Notes if any -->
              ${p.notes ? `
                <div class="fs-xs text-muted mb-3" style="font-style:italic;line-height:1.3;display:flex;align-items:center;gap:4px">
                  ${Icons.fileText(12)} "${Utils.escapeHtml(p.notes)}"
                </div>
              ` : ''}

              <!-- Actions Section (Pinned to Bottom) -->
              <div style="margin-top:auto;display:flex;gap:var(--space-2);padding-top:var(--space-3);border-top:1px solid var(--border-light);flex-wrap:wrap">
                <button type="button" class="btn btn-ghost btn-sm" data-view-prod="${id}" title="View Technical Specs">
                  ${Icons.eye(14)} Specs
                </button>
                <button type="button" class="btn btn-secondary btn-sm flex-1" data-edit-prod="${id}" title="Edit Specifications">
                  ${Icons.edit(14)} Edit
                </button>
                ${isArchived ? `
                  <button type="button" class="btn btn-success btn-sm flex-1" data-restore-prod="${id}" style="font-weight:600">
                    ${Icons.refresh(14)} Re-enable
                  </button>
                  <button type="button" class="btn btn-danger btn-sm" data-permanent-delete-prod="${id}" title="Delete Permanently" style="padding:6px 10px">
                    ${Icons.x(14)}
                  </button>
                ` : `
                  <button type="button" class="btn btn-danger btn-sm" data-soft-delete-prod="${id}" title="Soft Delete / Archive" style="background:rgba(239,68,68,0.1);color:var(--color-danger);border:1px solid rgba(239,68,68,0.25)">
                    ${Icons.trash(14)} Soft Delete
                  </button>
                `}
              </div>

            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /**
   * Set up Global and Delegated DOM Event Listeners
   */
  setupEvents() {
    // Tab switching
    document.addEventListener('click', (e) => {
      if (e.target.closest('#tab-active-prods')) {
        this.state.currentTab = 'active';
        this.state.currentPage = 1;
        this.renderTabs();
        this.renderCurrentView();
      }
      if (e.target.closest('#tab-archived-prods')) {
        this.state.currentTab = 'archived';
        this.state.currentPage = 1;
        this.renderTabs();
        this.renderCurrentView();
      }
      if (e.target.closest('#empty-switch-active')) {
        this.state.currentTab = 'active';
        this.state.currentPage = 1;
        this.renderTabs();
        this.renderCurrentView();
      }

      // View toggle (Table vs Cards)
      if (e.target.closest('#fg-btn-view-table')) {
        this.state.viewMode = 'table';
        const tblBtn = document.getElementById('fg-btn-view-table');
        const crdBtn = document.getElementById('fg-btn-view-cards');
        if (tblBtn) tblBtn.className = 'btn btn-sm btn-primary';
        if (crdBtn) crdBtn.className = 'btn btn-sm btn-ghost';
        this.renderCurrentView();
      }
      if (e.target.closest('#fg-btn-view-cards')) {
        this.state.viewMode = 'cards';
        const tblBtn = document.getElementById('fg-btn-view-table');
        const crdBtn = document.getElementById('fg-btn-view-cards');
        if (crdBtn) crdBtn.className = 'btn btn-sm btn-primary';
        if (tblBtn) tblBtn.className = 'btn btn-sm btn-ghost';
        this.renderCurrentView();
      }

      // Action buttons
      if (e.target.closest('#fg-add-btn') || e.target.closest('#empty-add-btn')) {
        this.showForm();
      }
      if (e.target.closest('#fg-export-btn')) {
        this.exportCSV();
      }
      if (e.target.closest('[data-view-prod]')) {
        const id = e.target.closest('[data-view-prod]').dataset.viewProd;
        this.showViewModal(id);
      }
      if (e.target.closest('[data-edit-prod]')) {
        const id = e.target.closest('[data-edit-prod]').dataset.editProd;
        this.showForm(id);
      }
      if (e.target.closest('[data-soft-delete-prod]')) {
        const id = e.target.closest('[data-soft-delete-prod]').dataset.softDeleteProd;
        this.confirmSoftDelete(id);
      }
      if (e.target.closest('[data-restore-prod]')) {
        const id = e.target.closest('[data-restore-prod]').dataset.restoreProd;
        this.confirmRestore(id);
      }
      if (e.target.closest('[data-permanent-delete-prod]')) {
        const id = e.target.closest('[data-permanent-delete-prod]').dataset.permanentDeleteProd;
        this.confirmPermanentDelete(id);
      }

      // Table Header Click for Sorting
      const th = e.target.closest('.data-table thead th[data-sort]');
      if (th && th.dataset.sort) {
        const key = th.dataset.sort;
        if (this.state.sortKey === key) {
          this.state.sortDir = this.state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          this.state.sortKey = key;
          this.state.sortDir = 'asc';
        }
        this.renderTable();
      }
    });

    // Search filter input with debounce and change listeners
    const handleSearch = (e) => {
      if (e.target.id === 'fg-search') {
        this.state.searchQuery = e.target.value.trim();
        this.state.currentPage = 1;
        this.renderCurrentView();
      }
    };
    document.addEventListener('input', Utils.debounce(handleSearch, 150));
    document.addEventListener('change', handleSearch);
    document.addEventListener('keyup', (e) => {
      if (e.target.id === 'fg-search' && e.key === 'Enter') handleSearch(e);
    });

    // Cell technology filter change
    document.addEventListener('change', (e) => {
      if (e.target.id === 'fg-cell-filter') {
        this.state.cellTypeFilter = e.target.value;
        this.state.currentPage = 1;
        this.renderCurrentView();
      }
    });
  },

  /**
   * Technical Specifications View Modal
   */
  showViewModal(productId) {
    const p = this.state.products.find(item => item.product_code === productId || item.id === productId);
    if (!p) return;

    const total = p.totalProduced || p.quantity || 0;
    const ready = p.readyToSell || 0;
    const reserved = p.reservedQuantity || 0;
    const sold = p.soldQuantity || 0;
    const estValue = ready * (p.pricePerUnit || 0);
    const isArchived = p.isDeleted || p.is_deleted === 1;

    const content = `
      <div style="padding-top:4px">
        <div style="display:flex;align-items:center;gap:14px;background:var(--bg-badge);padding:14px 18px;border-radius:var(--radius-lg);margin-bottom:16px">
          <div style="width:52px;height:52px;border-radius:var(--radius-md);background:linear-gradient(135deg, rgba(245,158,11,0.15), rgba(59,130,246,0.15));display:flex;align-items:center;justify-content:center;color:var(--color-primary-500)">
            ${Icons.solarPanel(26)}
          </div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge badge-neutral" style="font-weight:700">${p.product_code || p.id}</span>
              ${this.getCellBadge(p.cellType)}
              ${this.getStatusBadge(p)}
            </div>
            <h3 style="margin:4px 0 2px 0;font-size:var(--fs-base);color:var(--text-primary)">${Utils.escapeHtml(p.name)}</h3>
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">
              Model: <strong>${Utils.escapeHtml(p.modelNumber || 'Standard')}</strong> • Warranty: <strong>${Utils.escapeHtml(p.warranty || '25 Years')}</strong>
            </div>
          </div>
        </div>

        <h4 style="font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:8px">Technical & Commercial Specs</h4>
        <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;margin-bottom:16px">
          <div style="background:var(--bg-surface);border:1px solid var(--border-light);padding:10px 14px;border-radius:var(--radius-md)">
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">Rated Power Output</div>
            <div style="font-size:var(--fs-base);font-weight:700;color:var(--color-primary-400)">${p.wattCapacity} Watts</div>
          </div>
          <div style="background:var(--bg-surface);border:1px solid var(--border-light);padding:10px 14px;border-radius:var(--radius-md)">
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">Module Efficiency</div>
            <div style="font-size:var(--fs-base);font-weight:700;color:var(--color-success)">${p.efficiency || 21.0}%</div>
          </div>
          <div style="background:var(--bg-surface);border:1px solid var(--border-light);padding:10px 14px;border-radius:var(--radius-md)">
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">Selling Price (per unit)</div>
            <div style="font-size:var(--fs-base);font-weight:700;color:var(--color-primary-400)">${Utils.formatCurrency(p.pricePerUnit || 0)}</div>
          </div>
          <div style="background:var(--bg-surface);border:1px solid var(--border-light);padding:10px 14px;border-radius:var(--radius-md)">
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">Ready Inventory Valuation</div>
            <div style="font-size:var(--fs-base);font-weight:700;color:var(--color-solar-500)">${Utils.formatCurrency(estValue)}</div>
          </div>
          <div style="background:var(--bg-surface);border:1px solid var(--border-light);padding:10px 14px;border-radius:var(--radius-md)">
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">Dimensions</div>
            <div style="font-size:var(--fs-sm);font-weight:600">${p.dimensions || '2008 × 1002 × 35 mm'}</div>
          </div>
          <div style="background:var(--bg-surface);border:1px solid var(--border-light);padding:10px 14px;border-radius:var(--radius-md)">
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">Weight</div>
            <div style="font-size:var(--fs-sm);font-weight:600">${p.weightKg || '22.5'} kg</div>
          </div>
        </div>

        <h4 style="font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:8px">Inventory & Allocation Breakdown</h4>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:12px;text-align:center;margin-bottom:16px">
          <div>
            <div style="font-size:var(--fs-lg);font-weight:700;color:var(--color-primary-400)">${Utils.formatNumber(total)}</div>
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">Manufactured</div>
          </div>
          <div style="border-left:1px solid var(--border-light);border-right:1px solid var(--border-light)">
            <div style="font-size:var(--fs-lg);font-weight:700;color:var(--color-success)">${Utils.formatNumber(ready)}</div>
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">Ready to Sell</div>
          </div>
          <div style="border-right:1px solid var(--border-light)">
            <div style="font-size:var(--fs-lg);font-weight:700;color:var(--color-warning)">${Utils.formatNumber(reserved)}</div>
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">Reserved</div>
          </div>
          <div>
            <div style="font-size:var(--fs-lg);font-weight:700;color:var(--text-muted)">${Utils.formatNumber(sold)}</div>
            <div style="font-size:var(--fs-xs);color:var(--text-muted)">Sold</div>
          </div>
        </div>

        ${p.notes ? `
          <div style="background:var(--bg-badge);border-radius:var(--radius-md);padding:10px 14px;font-size:var(--fs-xs);color:var(--text-secondary);margin-bottom:12px">
            <strong>Technical Notes:</strong> ${Utils.escapeHtml(p.notes)}
          </div>
        ` : ''}

        <div style="font-size:var(--fs-xs);color:var(--text-muted);display:flex;justify-content:space-between">
          <span>Catalog ID: <code>${p.product_code || p.id}</code> (DB #${p.db_id || p.id})</span>
          <span>Added: ${Utils.formatDate(p.createdAt)}</span>
        </div>
      </div>
    `;

    const modal = Components.showModal({
      id: 'fg-view-modal',
      title: 'Solar Panel Specifications',
      content,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal>Close</button>
        <button type="button" class="btn btn-primary" id="fg-view-edit-btn">${Icons.edit(15)} Edit Product</button>
      `
    });

    const editBtn = document.getElementById('fg-view-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        modal.close();
        this.showForm(p.product_code || p.id);
      });
    }
  },

  /**
   * Add or Edit Product Form Modal with Complete Field Validation
   */
  showForm(editId = null) {
    const item = editId ? this.state.products.find(p => (p.product_code === editId || p.id === editId)) : null;
    const isEdit = !!item;

    const content = `
      <form id="fg-product-form" novalidate autocomplete="off" style="padding-top:4px">
        <div class="form-row">
          <div class="form-group flex-2">
            <label class="form-label" for="fg-name">Solar Panel / Product Name <span style="color:var(--color-danger)">*</span></label>
            <input type="text" class="form-control" id="fg-name" placeholder="e.g. SunMax Mono PERC 450W" value="${Utils.escapeHtml(item?.name || '')}" required>
            <div id="fg-name-error" class="form-error" style="display:none"></div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="fg-model">Model Number</label>
            <input type="text" class="form-control" id="fg-model" placeholder="e.g. SM-450-MP" value="${Utils.escapeHtml(item?.modelNumber || '')}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="fg-cell">Cell Technology <span style="color:var(--color-danger)">*</span></label>
            <select class="form-control" id="fg-cell" required>
              <option value="Mono PERC" ${item?.cellType === 'Mono PERC' ? 'selected' : ''}>Mono PERC (High Efficiency)</option>
              <option value="Polycrystalline" ${item?.cellType === 'Polycrystalline' ? 'selected' : ''}>Polycrystalline (Standard)</option>
              <option value="Bifacial" ${item?.cellType === 'Bifacial' ? 'selected' : ''}>Bifacial (Dual Glass)</option>
              <option value="TopCon N-Type" ${item?.cellType === 'TopCon N-Type' ? 'selected' : ''}>TopCon N-Type (Ultra Efficiency)</option>
              <option value="HJT Bifacial" ${item?.cellType === 'HJT Bifacial' ? 'selected' : ''}>HJT Heterojunction</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="fg-watts">Watt Capacity (W) <span style="color:var(--color-danger)">*</span></label>
            <input type="number" class="form-control" id="fg-watts" min="10" max="2000" placeholder="e.g. 450" value="${item?.wattCapacity || ''}" required>
            <div id="fg-watts-error" class="form-error" style="display:none"></div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="fg-eff">Efficiency (%)</label>
            <input type="number" step="0.1" min="0" max="100" class="form-control" id="fg-eff" placeholder="e.g. 21.5" value="${item?.efficiency || ''}">
            <div id="fg-eff-error" class="form-error" style="display:none"></div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="fg-price">Selling Price per Unit (₹) <span style="color:var(--color-danger)">*</span></label>
            <input type="number" step="0.01" min="1" class="form-control" id="fg-price" placeholder="e.g. 14500" value="${item?.pricePerUnit || ''}" required>
            <div id="fg-price-error" class="form-error" style="display:none"></div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="fg-produced">Total Produced Units <span style="color:var(--color-danger)">*</span></label>
            <input type="number" min="0" class="form-control" id="fg-produced" placeholder="e.g. 100" value="${item ? (item.totalProduced ?? item.quantity) : ''}" required>
            <div id="fg-produced-error" class="form-error" style="display:none"></div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="fg-ready">Ready to Sell Units <span style="color:var(--color-danger)">*</span></label>
            <input type="number" min="0" class="form-control" id="fg-ready" placeholder="e.g. 100" value="${item ? (item.readyToSell ?? item.quantity) : ''}" required>
            <div id="fg-ready-error" class="form-error" style="display:none"></div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="fg-dim">Physical Dimensions</label>
            <input type="text" class="form-control" id="fg-dim" placeholder="e.g. 2008 x 1002 x 35 mm" value="${Utils.escapeHtml(item?.dimensions || '2008 x 1002 x 35 mm')}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="fg-weight">Weight (kg)</label>
            <input type="number" step="0.1" class="form-control" id="fg-weight" placeholder="e.g. 22.5" value="${item?.weightKg || 22.5}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="fg-warranty">Warranty</label>
            <input type="text" class="form-control" id="fg-warranty" placeholder="e.g. 25 Years" value="${Utils.escapeHtml(item?.warranty || '25 Years')}">
          </div>
        </div>

        <div class="form-group mb-0">
          <label class="form-label" for="fg-notes">Technical Specifications / Stock Notes</label>
          <textarea class="form-control" id="fg-notes" rows="2" placeholder="e.g. Anti-reflective coated glass, IP68 junction box, 1500V DC system voltage rated">${Utils.escapeHtml(item?.notes || '')}</textarea>
        </div>
      </form>
    `;

    const modal = Components.showModal({
      id: 'fg-modal',
      title: isEdit ? `Edit Solar Product: ${item.name} (${item.product_code || item.id})` : 'Add New Solar Panel Product',
      content,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-primary" id="fg-save-btn">
          ${isEdit ? 'Save Changes' : 'Create Solar Product'}
        </button>
      `
    });

    // Real-time auto sync for Ready To Sell on Add mode
    if (!isEdit) {
      const prodInp = document.getElementById('fg-produced');
      const readyInp = document.getElementById('fg-ready');
      if (prodInp && readyInp) {
        prodInp.addEventListener('input', () => {
          if (!readyInp.dataset.userEdited) {
            readyInp.value = prodInp.value;
          }
        });
        readyInp.addEventListener('input', () => {
          readyInp.dataset.userEdited = 'true';
        });
      }
    }

    // Save Click Handler
    const saveBtn = document.getElementById('fg-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        await this.handleSaveProduct(modal, isEdit, item);
      });
    }
  },

  /**
   * Validate fields and perform Create/Update API request
   */
  async handleSaveProduct(modal, isEdit, existingItem) {
    const nameEl      = document.getElementById('fg-name');
    const modelEl     = document.getElementById('fg-model');
    const cellEl      = document.getElementById('fg-cell');
    const wattsEl     = document.getElementById('fg-watts');
    const effEl       = document.getElementById('fg-eff');
    const priceEl     = document.getElementById('fg-price');
    const producedEl  = document.getElementById('fg-produced');
    const readyEl     = document.getElementById('fg-ready');
    const dimEl       = document.getElementById('fg-dim');
    const weightEl    = document.getElementById('fg-weight');
    const warrantyEl  = document.getElementById('fg-warranty');
    const notesEl     = document.getElementById('fg-notes');
    const saveBtn     = document.getElementById('fg-save-btn');

    // Reset error states
    document.querySelectorAll('#fg-product-form .form-control').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('#fg-product-form .form-error').forEach(el => { el.style.display = 'none'; el.textContent = ''; });

    const name = nameEl.value.trim();
    const model = modelEl.value.trim();
    const cellType = cellEl.value;
    const wattCapacity = parseInt(wattsEl.value, 10);
    const efficiency = effEl.value ? parseFloat(effEl.value) : 21.0;
    const pricePerUnit = parseFloat(priceEl.value);
    const totalProduced = parseInt(producedEl.value, 10);
    const readyToSell = parseInt(readyEl.value, 10);
    const dimensions = dimEl.value.trim();
    const weightKg = weightEl.value ? parseFloat(weightEl.value) : 22.5;
    const warranty = warrantyEl.value.trim() || '25 Years';
    const notes = notesEl.value.trim();

    let hasErrors = false;

    // Validate Name
    if (!name || name.length < 2) {
      this.showFieldError('fg-name', 'Solar panel / product name is required (min 2 characters).');
      hasErrors = true;
    }

    // Validate Watts
    if (isNaN(wattCapacity) || wattCapacity <= 0 || wattCapacity > 2000) {
      this.showFieldError('fg-watts', 'Watt capacity must be between 10W and 2000W.');
      hasErrors = true;
    }

    // Validate Efficiency
    if (isNaN(efficiency) || efficiency < 0 || efficiency > 100) {
      this.showFieldError('fg-eff', 'Efficiency must be between 0% and 100%.');
      hasErrors = true;
    }

    // Validate Price
    if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
      this.showFieldError('fg-price', 'Valid unit selling price (₹) is required.');
      hasErrors = true;
    }

    // Validate Produced
    if (isNaN(totalProduced) || totalProduced < 0) {
      this.showFieldError('fg-produced', 'Total produced units cannot be negative.');
      hasErrors = true;
    }

    // Validate Ready
    if (isNaN(readyToSell) || readyToSell < 0) {
      this.showFieldError('fg-ready', 'Ready to sell units cannot be negative.');
      hasErrors = true;
    } else if (readyToSell > totalProduced) {
      this.showFieldError('fg-ready', 'Ready to sell units cannot exceed total produced units.');
      hasErrors = true;
    }

    if (hasErrors) return;

    // Build payload
    const payload = {
      name,
      model,
      cellType,
      wattCapacity,
      efficiency,
      pricePerUnit,
      totalProduced,
      quantity: totalProduced,
      readyToSell,
      dimensions,
      weightKg,
      warranty,
      notes
    };

    if (isEdit) {
      payload.id = existingItem.product_code || existingItem.id;
      payload.db_id = existingItem.db_id;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = isEdit ? 'Updating...' : 'Creating...';

    try {
      const endpoint = isEdit ? '../api/products/update.php' : '../api/products/create.php';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await resp.json();

      if (!result.success) {
        if (result.errors) {
          Object.keys(result.errors).forEach(field => {
            const elId = field === 'pricePerUnit' ? 'fg-price' : (field === 'wattCapacity' ? 'fg-watts' : `fg-${field}`);
            this.showFieldError(elId, result.errors[field]);
          });
        }
        Components.toast('error', 'Validation Error', result.message || 'Failed to save product.');
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? 'Save Changes' : 'Create Solar Product';
        return;
      }

      Components.toast('success', isEdit ? 'Product Updated' : 'Product Created', result.message || `${name} saved successfully.`);
      modal.close();

      // Refresh list and views
      await this.loadData();
      this.renderStats();
      this.renderTabs();
      this.renderCurrentView();

    } catch (err) {
      console.error('Save product request failed:', err);
      Components.toast('error', 'Network Error', 'Unable to reach the server. Please check your connection.');
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Save Changes' : 'Create Solar Product';
    }
  },

  showFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(`${inputId}-error`);
    if (input) input.classList.add('is-invalid');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'flex';
    }
  },

  /**
   * Soft Delete Product Confirmation Modal
   */
  confirmSoftDelete(productId) {
    const product = this.state.products.find(p => p.product_code === productId || p.id === productId);
    if (!product) return;

    const modalContent = `
      <div style="padding:10px 0">
        <div style="background:rgba(239,68,68,0.08);border-left:4px solid var(--color-danger);padding:12px 16px;border-radius:var(--radius-md);margin-bottom:16px">
          <div style="font-weight:600;color:var(--color-danger);margin-bottom:4px;display:flex;align-items:center;gap:6px">${Icons.alertTriangle(16)} Soft Delete Confirmation</div>
          <div style="font-size:var(--fs-sm);color:var(--text-secondary);line-height:1.4">
            This will soft-delete <strong>${Utils.escapeHtml(product.name)}</strong> (<code>${product.product_code || product.id}</code>).
          </div>
        </div>

        <p style="font-size:var(--fs-sm);color:var(--text-secondary);line-height:1.5;margin-bottom:12px">
          <strong>What happens when soft deleted?</strong>
        </p>
        <ul style="font-size:var(--fs-sm);color:var(--text-secondary);padding-left:20px;line-height:1.5;margin-bottom:16px">
          <li>The product is marked as archived and hidden from new customer sales orders.</li>
          <li>All existing sales records and production history remain completely intact.</li>
          <li><strong>You can re-enable and restore this product at any time</strong> from the <em>Archived / Soft-Deleted</em> tab.</li>
        </ul>
      </div>
    `;

    const modal = Components.showModal({
      id: 'fg-delete-confirm-modal',
      title: 'Soft Delete Solar Product',
      content: modalContent,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-danger" id="fg-confirm-delete-btn" style="box-shadow:var(--shadow-sm)">
          Confirm Soft Delete
        </button>
      `
    });

    const confirmBtn = document.getElementById('fg-confirm-delete-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Archiving...';
        try {
          const resp = await fetch('../api/products/delete.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: productId })
          });
          const res = await resp.json();

          if (res.success) {
            Components.toast('success', 'Product Soft-Deleted', res.message || `${product.name} has been archived. You can re-enable it at any time.`);
            modal.close();
            await this.loadData();
            this.renderStats();
            this.renderTabs();
            this.renderCurrentView();
          } else {
            Components.toast('error', 'Error', res.message || 'Could not soft-delete product.');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Soft Delete';
          }
        } catch (err) {
          console.error('Delete product error:', err);
          Components.toast('error', 'Error', 'Failed to communicate with database server.');
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Confirm Soft Delete';
        }
      });
    }
  },

  /**
   * Re-enable / Restore Product Confirmation Modal
   */
  confirmRestore(productId) {
    const product = this.state.products.find(p => p.product_code === productId || p.id === productId);
    if (!product) return;

    const modalContent = `
      <div style="padding:10px 0">
        <div style="background:rgba(16,185,129,0.08);border-left:4px solid var(--color-success);padding:12px 16px;border-radius:var(--radius-md);margin-bottom:16px">
          <div style="font-weight:600;color:var(--color-success);margin-bottom:4px;display:flex;align-items:center;gap:6px">${Icons.refresh(16)} Restore & Re-enable Product</div>
          <div style="font-size:var(--fs-sm);color:var(--text-secondary);line-height:1.4">
            Re-enable <strong>${Utils.escapeHtml(product.name)}</strong> (<code>${product.product_code || product.id}</code>)?
          </div>
        </div>

        <p style="font-size:var(--fs-sm);color:var(--text-secondary);line-height:1.5">
          Restoring this solar panel will immediately move it back to the active catalog and re-enable it in the sales stock dropdown for customer orders.
        </p>
      </div>
    `;

    const modal = Components.showModal({
      id: 'fg-restore-confirm-modal',
      title: 'Re-enable Solar Product',
      content: modalContent,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-success" id="fg-confirm-restore-btn" style="box-shadow:var(--shadow-sm)">
          Enable Product Now
        </button>
      `
    });

    const confirmBtn = document.getElementById('fg-confirm-restore-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Enabling...';
        try {
          const resp = await fetch('../api/products/restore.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: productId })
          });
          const res = await resp.json();

          if (res.success) {
            Components.toast('success', 'Product Restored', res.message || `${product.name} is now active and ready for sales.`);
            modal.close();
            // Automatically switch back to active tab to see the restored product
            this.state.currentTab = 'active';
            await this.loadData();
            this.renderStats();
            this.renderTabs();
            this.renderCurrentView();
          } else {
            Components.toast('error', 'Error', res.message || 'Could not restore product.');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Enable Product Now';
          }
        } catch (err) {
          console.error('Restore product error:', err);
          Components.toast('error', 'Error', 'Failed to communicate with database server.');
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Enable Product Now';
        }
      });
    }
  },

  /**
   * Permanent Deletion Confirmation Modal
   */
  confirmPermanentDelete(productId) {
    const product = this.state.products.find(p => p.product_code === productId || p.id === productId);
    if (!product) return;

    const modalContent = `
      <div style="padding:10px 0">
        <div style="background:rgba(239,68,68,0.12);border-left:4px solid var(--color-danger);padding:14px 18px;border-radius:var(--radius-md);margin-bottom:16px">
          <div style="font-weight:700;color:var(--color-danger);margin-bottom:4px;display:flex;align-items:center;gap:6px">${Icons.alertTriangle(16)} Permanent Deletion Warning</div>
          <div style="font-size:var(--fs-sm);color:var(--text-secondary);line-height:1.4">
            Are you sure you want to permanently delete <strong>${Utils.escapeHtml(product.name)}</strong> (<code>${product.product_code || product.id}</code>)?
          </div>
        </div>

        <p style="font-size:var(--fs-sm);color:var(--text-secondary);line-height:1.5;margin-bottom:12px">
          <strong>This action is irreversible:</strong>
        </p>
        <ul style="font-size:var(--fs-sm);color:var(--text-secondary);padding-left:20px;line-height:1.5">
          <li>This solar panel will be completely deleted from the MySQL database.</li>
          <li>It cannot be recovered or restored later.</li>
        </ul>
      </div>
    `;

    const modal = Components.showModal({
      id: 'fg-permanent-delete-modal',
      title: 'Permanent Delete Solar Product',
      content: modalContent,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-danger" id="fg-confirm-perm-delete-btn" style="box-shadow:var(--shadow-sm)">
          Yes, Delete Permanently
        </button>
      `
    });

    const confirmBtn = document.getElementById('fg-confirm-perm-delete-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Deleting...';
        try {
          const resp = await fetch('../api/products/delete.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: productId, permanent: true })
          });
          const res = await resp.json();

          if (res.success) {
            Components.toast('success', 'Product Permanently Deleted', res.message || `${product.name} was removed from the database.`);
            modal.close();
            await this.loadData();
            this.renderStats();
            this.renderTabs();
            this.renderCurrentView();
          } else {
            Components.toast('error', 'Error', res.message || 'Could not permanently delete product.');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Yes, Delete Permanently';
          }
        } catch (err) {
          console.error('Permanent delete product error:', err);
          Components.toast('error', 'Error', 'Failed to communicate with database server.');
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Yes, Delete Permanently';
        }
      });
    }
  },

  /**
   * Export solar products list to CSV
   */
  exportCSV() {
    const items = this.getFilteredItems();
    if (!items.length) {
      return Components.toast('warning', 'No Data', 'There are no solar products to export.');
    }

    const headers = [
      { label: 'Product Code', key: 'product_code' },
      { label: 'Product Name', key: 'name' },
      { label: 'Model Number', key: 'modelNumber' },
      { label: 'Cell Technology', key: 'cellType' },
      { label: 'Watt Capacity (W)', key: 'wattCapacity' },
      { label: 'Efficiency (%)', key: 'efficiency' },
      { label: 'Unit Price (INR)', key: 'pricePerUnit' },
      { label: 'Total Produced', key: 'totalProduced' },
      { label: 'Ready to Sell', key: 'readyToSell' },
      { label: 'Reserved Quantity', key: 'reservedQuantity' },
      { label: 'Sold Quantity', key: 'soldQuantity' },
      { label: 'Dimensions', key: 'dimensions' },
      { label: 'Weight (kg)', key: 'weightKg' },
      { label: 'Warranty', key: 'warranty' },
      { label: 'Status', key: 'status' }
    ];

    const filename = `smatree-solar-products-${this.state.currentTab}-${Utils.today ? Utils.today() : 'export'}.csv`;
    Utils.exportCSV(items, headers, filename);
    Components.toast('success', 'Export Complete', `${items.length} solar products exported to CSV.`);
  }
};

window.FinishedGoods = FinishedGoods;
