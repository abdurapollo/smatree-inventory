/* ==========================================================================
   SMATREE SOLAR INVENTORY — Sales Stock Module
   Dynamic Solar Panels Catalog Integration, Live Stock Allocation & Sales Recording
   Full CRUD Operations, Live MySQL Inventory Synchronization & Order Management
   ========================================================================== */

const Sales = {
  state: {
    searchQuery: '',
    statusFilter: '',
    productFilter: '',
    currentTab: 'all', // 'all' | 'Reserved' | 'Sold' | 'Cancelled'
    sortKey: 'db_id',
    sortDir: 'desc',
    currentPage: 1,
    perPage: 10,
    products: [],
    sales: [],
    stats: {
      readyToSell: 0,
      reservedUnits: 0,
      soldUnits: 0,
      totalRevenue: 0,
      totalProducts: 0
    },
    loading: false
  },

  async init() {
    if (!App.initPage('sales', 'Sales Stock', [
      { label: 'Home', href: 'dashboard.html' },
      { label: 'Sales Stock' }
    ])) return;

    await this.loadData();
    this.renderStats();
    this.renderTabs();
    this.renderToolbar();
    this.renderTable();
    this.setupEvents();
  },

  /**
   * Dynamically fetch solar panel products and sales records from MySQL backend
   */
  async loadData() {
    this.state.loading = true;

    // 1. Fetch dynamic products (solar panels)
    try {
      const prodResp = await fetch('../api/products/index.php?filter=all');
      const prodJson = await prodResp.json();
      if (prodJson && prodJson.success && Array.isArray(prodJson.data)) {
        this.state.products = prodJson.data;
        const activeProds = prodJson.data.filter(p => !p.isDeleted && p.is_deleted === 0);
        Store._set(Store.keys.finishedGoods, activeProds);
      } else {
        this.state.products = Store.getAll('finishedGoods') || [];
      }
    } catch (e) {
      console.warn('Could not load products from API, falling back to Store:', e);
      this.state.products = Store.getAll('finishedGoods') || [];
    }

    // 2. Fetch dynamic sales records from MySQL
    try {
      const salesResp = await fetch('../api/sales/index.php');
      const salesJson = await salesResp.json();
      if (salesJson && salesJson.success && Array.isArray(salesJson.data)) {
        this.state.sales = salesJson.data;
        if (salesJson.stats) {
          this.state.stats = salesJson.stats;
        } else {
          this.recomputeLocalStats();
        }
        Store._set(Store.keys.sales, salesJson.data);
      } else {
        this.state.sales = Store.getAll('sales') || [];
        this.recomputeLocalStats();
      }
    } catch (e) {
      console.warn('Could not load sales from API, falling back to Store:', e);
      this.state.sales = Store.getAll('sales') || [];
      this.recomputeLocalStats();
    } finally {
      this.state.loading = false;
    }
  },

  recomputeLocalStats() {
    const products = this.state.products.filter(p => !p.isDeleted && p.is_deleted === 0);
    const sales = this.state.sales;

    const readyToSell = products.reduce((sum, p) => sum + (parseInt(p.readyToSell ?? p.quantity) || 0), 0);
    const reservedUnits = sales.filter(s => s.status === 'Reserved').reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
    const soldUnits = sales.filter(s => s.status === 'Sold').reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
    const totalRevenue = sales.filter(s => s.status === 'Sold').reduce((sum, s) => sum + (parseFloat(s.totalAmount || s.total_amount) || 0), 0);

    this.state.stats = {
      readyToSell,
      reservedUnits,
      soldUnits,
      totalRevenue,
      totalProducts: products.length
    };
  },

  /**
   * Filter and sort sales dataset
   */
  getFilteredItems() {
    let items = [...this.state.sales];

    // Filter by Tab
    if (this.state.currentTab && this.state.currentTab !== 'all') {
      items = items.filter(s => (s.status || '').toLowerCase() === this.state.currentTab.toLowerCase());
    }

    // Filter by Status dropdown if set
    if (this.state.statusFilter) {
      items = items.filter(s => (s.status || '').toLowerCase() === this.state.statusFilter.toLowerCase());
    }

    // Filter by Product dropdown if set
    if (this.state.productFilter) {
      items = items.filter(s => {
        const pCode = s.productId || s.product_code || '';
        const pName = s.productName || s.product_name || '';
        return pCode === this.state.productFilter || pName === this.state.productFilter;
      });
    }

    // Filter by search query
    if (this.state.searchQuery) {
      items = Utils.searchFilter(items, this.state.searchQuery, [
        'id', 'sale_code', 'customerName', 'customer_name', 'customerPhone', 'customer_phone',
        'customerEmail', 'customer_email', 'productName', 'product_name', 'productId', 'product_code', 'notes'
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

      // Date comparison
      if (sortKey === 'saleDate' || sortKey === 'sale_date') {
        const timeA = new Date(valA).getTime() || 0;
        const timeB = new Date(valB).getTime() || 0;
        return sortDir === 'asc' ? timeA - timeB : timeB - timeA;
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
   * Render 4 Top Overview Stat Cards
   */
  renderStats() {
    const container = document.getElementById('sales-stats');
    if (!container) return;
    const stats = this.state.stats;

    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-emerald-400)">
        <div class="stat-icon green">🏷️</div>
        <div class="stat-value" id="stat-ready-to-sell">${Utils.formatNumber(stats.readyToSell)}</div>
        <div class="stat-label">Ready to Sell Stock</div>
        <div class="stat-trend" style="color:var(--color-success)">● Available in catalog</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-solar-400)">
        <div class="stat-icon amber">📋</div>
        <div class="stat-value" id="stat-reserved-units">${Utils.formatNumber(stats.reservedUnits)}</div>
        <div class="stat-label">Reserved Units</div>
        <div class="stat-trend" style="color:var(--color-warning)">Awaiting dispatch</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-primary-400)">
        <div class="stat-icon blue">✅</div>
        <div class="stat-value" id="stat-sold-units">${Utils.formatNumber(stats.soldUnits)}</div>
        <div class="stat-label">Sold Units</div>
        <div class="stat-trend" style="color:var(--color-primary-400)">Fulfilled & dispatched</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-4" style="--card-accent:#8b5cf6">
        <div class="stat-icon purple" style="background:rgba(139,92,246,0.12);color:#8b5cf6">💰</div>
        <div class="stat-value" id="stat-total-revenue">${Utils.formatCurrency(stats.totalRevenue || 0)}</div>
        <div class="stat-label">Total Realized Revenue</div>
        <div class="stat-trend" style="color:#8b5cf6">From completed sales</div>
      </div>
    `;
  },

  /**
   * Render Filter Tabs: All Sales, Reserved, Sold, Cancelled
   */
  renderTabs() {
    const container = document.getElementById('sales-tabs-container');
    if (!container) return;

    const allCount = this.state.sales.length;
    const reservedCount = this.state.sales.filter(s => (s.status || '').toLowerCase() === 'reserved').length;
    const soldCount = this.state.sales.filter(s => (s.status || '').toLowerCase() === 'sold').length;
    const cancelledCount = this.state.sales.filter(s => (s.status || '').toLowerCase() === 'cancelled').length;

    container.innerHTML = `
      <div class="tabs" style="border-bottom:1px solid var(--border-color);margin-bottom:var(--space-4)">
        <button type="button" class="tab ${this.state.currentTab === 'all' ? 'active' : ''}" id="tab-sales-all" style="background:none;border:none">
          📋 All Sales Orders <span class="badge ${this.state.currentTab === 'all' ? 'badge-primary' : 'badge-neutral'}" style="margin-left:6px">${allCount}</span>
        </button>
        <button type="button" class="tab ${this.state.currentTab === 'Reserved' ? 'active' : ''}" id="tab-sales-reserved" style="background:none;border:none">
          ⏳ Reserved (Hold) <span class="badge ${this.state.currentTab === 'Reserved' ? 'badge-warning' : 'badge-neutral'}" style="margin-left:6px">${reservedCount}</span>
        </button>
        <button type="button" class="tab ${this.state.currentTab === 'Sold' ? 'active' : ''}" id="tab-sales-sold" style="background:none;border:none">
          ✅ Sold & Dispatched <span class="badge ${this.state.currentTab === 'Sold' ? 'badge-success' : 'badge-neutral'}" style="margin-left:6px">${soldCount}</span>
        </button>
        ${cancelledCount > 0 ? `
          <button type="button" class="tab ${this.state.currentTab === 'Cancelled' ? 'active' : ''}" id="tab-sales-cancelled" style="background:none;border:none">
            ❌ Cancelled <span class="badge badge-neutral" style="margin-left:6px">${cancelledCount}</span>
          </button>
        ` : ''}
      </div>
    `;
  },

  /**
   * Render Search Box, Product Filter, Status Filter & Action Buttons
   */
  renderToolbar() {
    const container = document.getElementById('sales-toolbar');
    if (!container) return;

    // Build unique product options
    const activeProducts = this.state.products.filter(p => !p.isDeleted && p.is_deleted === 0);

    container.innerHTML = `
      <div class="search-box" style="flex:1;max-width:320px">
        <span class="search-icon">🔍</span>
        <input type="text" id="sales-search" placeholder="Search sales by ID, customer, product..." value="${Utils.escapeHtml(this.state.searchQuery || '')}">
      </div>

      <div class="toolbar-actions" style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
        <!-- Filter by Solar Panel Model -->
        <select class="form-control" id="sales-product-filter" style="width:auto;min-width:180px;height:38px;padding:4px 30px 4px 12px;font-size:var(--fs-sm)">
          <option value="">All Solar Panels</option>
          ${activeProducts.map(p => {
            const code = p.product_code || p.id;
            const name = p.name || code;
            return `<option value="${code}" ${this.state.productFilter === code ? 'selected' : ''}>${Utils.escapeHtml(name)}</option>`;
          }).join('')}
        </select>

        <!-- Filter by Status -->
        <select class="form-control" id="sales-status-filter" style="width:auto;min-width:140px;height:38px;padding:4px 30px 4px 12px;font-size:var(--fs-sm)">
          <option value="" ${this.state.statusFilter === '' ? 'selected' : ''}>All Status</option>
          <option value="Reserved" ${this.state.statusFilter === 'Reserved' ? 'selected' : ''}>Reserved</option>
          <option value="Sold" ${this.state.statusFilter === 'Sold' ? 'selected' : ''}>Sold</option>
          <option value="Cancelled" ${this.state.statusFilter === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>

        <button class="btn btn-secondary btn-sm" id="sales-export-btn" title="Export sales orders to CSV">
          📥 Export CSV
        </button>
        <button class="btn btn-primary btn-sm" id="sales-add-btn" style="box-shadow:var(--shadow-md)">
          <span style="font-size:1.1rem;margin-right:2px">+</span> Add Sale Record
        </button>
      </div>
    `;
  },

  /**
   * Render Dynamic Sales Data Table
   */
  renderTable() {
    const container = document.getElementById('sales-table');
    if (!container) return;

    const items = this.getFilteredItems();
    const paginated = Utils.paginate(items, this.state.currentPage, this.state.perPage);

    const columns = [
      {
        label: 'Sale ID',
        key: 'id',
        sortable: true,
        render: (r) => `
          <div>
            <span class="badge badge-neutral" style="font-weight:700;letter-spacing:0.04em">${Utils.escapeHtml(r.id || r.sale_code || '—')}</span>
            <div class="fs-xs text-muted" style="margin-top:2px">${Utils.formatDate(r.saleDate || r.sale_date)}</div>
          </div>
        `
      },
      {
        label: 'Product',
        key: 'productName',
        sortable: true,
        render: (r) => `
          <div class="d-flex align-center gap-2" style="min-width:200px">
            <div class="product-thumb" style="width:34px;height:34px;font-size:1.1rem">☀️</div>
            <div>
              <div class="fw-semibold text-primary" title="${Utils.escapeHtml(r.productName || r.product_name || '—')}">
                ${Utils.escapeHtml(r.productName || r.product_name || '—')}
              </div>
              <div class="fs-xs text-muted">
                <code>${Utils.escapeHtml(r.productId || r.product_code || '')}</code>
              </div>
            </div>
          </div>
        `
      },
      {
        label: 'Customer',
        key: 'customerName',
        sortable: true,
        render: (r) => `
          <div style="min-width:160px">
            <div class="fw-medium text-primary">${Utils.escapeHtml(r.customerName || r.customer_name || '—')}</div>
            ${(r.customerPhone || r.customer_phone) ? `<div class="fs-xs text-muted">📞 ${Utils.escapeHtml(r.customerPhone || r.customer_phone)}</div>` : ''}
          </div>
        `
      },
      {
        label: 'Quantity',
        key: 'quantity',
        sortable: true,
        render: (r) => `
          <div>
            <span class="fw-bold" style="font-size:var(--fs-sm)">${Utils.formatNumber(r.quantity)}</span>
            <span class="fs-xs text-muted">panels</span>
          </div>
        `
      },
      {
        label: 'Unit Price',
        key: 'unitPrice',
        sortable: true,
        render: (r) => {
          const price = r.unitPrice || r.unit_price;
          return price ? `<span class="fw-medium">${Utils.formatCurrency(price)}</span>` : '<span class="text-muted">—</span>';
        }
      },
      {
        label: 'Total Value',
        key: 'totalAmount',
        sortable: true,
        render: (r) => {
          const val = r.totalAmount || r.total_amount || (r.unitPrice ? r.unitPrice * r.quantity : null);
          return val ? `<span class="fw-bold text-primary">${Utils.formatCurrency(val)}</span>` : '<span class="text-muted">—</span>';
        }
      },
      {
        label: 'Status',
        key: 'status',
        sortable: true,
        render: (r) => {
          const st = r.status || 'Reserved';
          let badgeClass = 'badge-warning';
          let label = '● Reserved (Hold)';
          if (st === 'Sold') {
            badgeClass = 'badge-success';
            label = '● Sold (Dispatched)';
          } else if (st === 'Cancelled') {
            badgeClass = 'badge-neutral';
            label = 'Cancelled';
          }
          return `<span class="badge ${badgeClass}" style="font-weight:600">${label}</span>`;
        }
      },
      {
        label: 'Actions',
        key: 'actions',
        sortable: false,
        render: (r) => {
          const saleId = r.id || r.sale_code;
          const isReserved = r.status === 'Reserved';

          return `
            <div class="actions">
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-view-sale="${saleId}" title="View Order Details">👁️</button>
              <button type="button" class="btn btn-ghost btn-sm btn-icon" data-edit-sale="${saleId}" title="Edit Sale Record & Adjust Stock">✏️</button>
              ${isReserved ? `
                <button type="button" class="btn btn-success btn-sm" data-mark-sold="${saleId}" title="Mark as Sold & Dispatch Panels" style="font-size:var(--fs-xs);padding:4px 8px;font-weight:600">
                  Mark Sold
                </button>
              ` : ''}
              <button type="button" class="btn btn-ghost btn-sm btn-icon text-danger" data-delete-sale="${saleId}" title="Delete Record & Restore Stock">🗑️</button>
            </div>
          `;
        }
      }
    ];

    container.innerHTML = Components.renderTable({
      columns,
      data: paginated.items,
      emptyMessage: 'No sales records found'
    });

    // Sort column indicators
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

    // Pagination
    if (paginated.totalPages > 1) {
      container.insertAdjacentHTML('beforeend', Components.renderPagination(paginated));
    }

    window._onPageChange = (page) => {
      this.state.currentPage = page;
      this.renderTable();
    };
  },

  /**
   * Set up Global and Delegated Event Listeners
   */
  setupEvents() {
    document.addEventListener('click', async (e) => {
      // Tab switching
      if (e.target.closest('#tab-sales-all')) {
        this.state.currentTab = 'all';
        this.state.currentPage = 1;
        this.renderTabs();
        this.renderTable();
      }
      if (e.target.closest('#tab-sales-reserved')) {
        this.state.currentTab = 'Reserved';
        this.state.currentPage = 1;
        this.renderTabs();
        this.renderTable();
      }
      if (e.target.closest('#tab-sales-sold')) {
        this.state.currentTab = 'Sold';
        this.state.currentPage = 1;
        this.renderTabs();
        this.renderTable();
      }
      if (e.target.closest('#tab-sales-cancelled')) {
        this.state.currentTab = 'Cancelled';
        this.state.currentPage = 1;
        this.renderTabs();
        this.renderTable();
      }

      // Toolbar Actions
      if (e.target.closest('#sales-add-btn')) {
        this.showForm();
      }
      if (e.target.closest('#sales-export-btn')) {
        this.exportCSV();
      }

      // Row Actions: View Details
      if (e.target.closest('[data-view-sale]')) {
        const id = e.target.closest('[data-view-sale]').dataset.viewSale;
        this.showViewModal(id);
      }

      // Row Actions: Edit Sale
      if (e.target.closest('[data-edit-sale]')) {
        const id = e.target.closest('[data-edit-sale]').dataset.editSale;
        this.showForm(id);
      }

      // Row Actions: Mark Sold
      if (e.target.closest('[data-mark-sold]')) {
        const id = e.target.closest('[data-mark-sold]').dataset.markSold;
        const btn = e.target.closest('[data-mark-sold]');
        await this.handleMarkSold(id, btn);
      }

      // Row Actions: Delete Sale
      if (e.target.closest('[data-delete-sale]')) {
        const id = e.target.closest('[data-delete-sale]').dataset.deleteSale;
        this.confirmDelete(id);
      }

      // Table Header Sorting
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

    // Search input with debounce and change listeners
    const handleSearch = (e) => {
      if (e.target.id === 'sales-search') {
        this.state.searchQuery = e.target.value.trim();
        this.state.currentPage = 1;
        this.renderTable();
      }
    };
    document.addEventListener('input', Utils.debounce(handleSearch, 150));
    document.addEventListener('change', handleSearch);
    document.addEventListener('keyup', (e) => {
      if (e.target.id === 'sales-search' && e.key === 'Enter') handleSearch(e);
    });

    // Status filter dropdown
    document.addEventListener('change', (e) => {
      if (e.target.id === 'sales-status-filter') {
        this.state.statusFilter = e.target.value;
        this.state.currentPage = 1;
        this.renderTable();
      }
      if (e.target.id === 'sales-product-filter') {
        this.state.productFilter = e.target.value;
        this.state.currentPage = 1;
        this.renderTable();
      }
    });
  },

  /**
   * View Sale Order Details Modal
   */
  showViewModal(saleId) {
    const sale = this.state.sales.find(s => (s.id === saleId || s.sale_code === saleId));
    if (!sale) return;

    const isReserved = sale.status === 'Reserved';
    const isSold = sale.status === 'Sold';
    const total = sale.totalAmount || sale.total_amount || (sale.unitPrice ? sale.unitPrice * sale.quantity : 0);

    const content = `
      <div style="padding-top:4px">
        <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-badge);padding:14px 18px;border-radius:var(--radius-lg);margin-bottom:16px;flex-wrap:wrap;gap:8px">
          <div>
            <span class="badge badge-neutral" style="font-size:0.85rem;font-weight:700">${sale.id || sale.sale_code}</span>
            <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:4px">
              Order Date: <strong>${Utils.formatDate(sale.saleDate || sale.sale_date)}</strong>
            </div>
          </div>
          <div>
            <span class="badge ${isSold ? 'badge-success' : (isReserved ? 'badge-warning' : 'badge-neutral')}" style="font-size:0.85rem;font-weight:600">
              ${isSold ? '● Sold & Dispatched' : (isReserved ? '● Reserved (Hold in Stock)' : 'Cancelled')}
            </span>
          </div>
        </div>

        <h4 style="font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:8px">Customer & Delivery Info</h4>
        <div style="background:var(--bg-surface);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:16px">
          <div style="font-size:var(--fs-base);font-weight:700;color:var(--text-primary);margin-bottom:6px">
            👤 ${Utils.escapeHtml(sale.customerName || sale.customer_name || 'Customer')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:8px;font-size:var(--fs-xs)">
            <div><strong>Phone:</strong> ${sale.customerPhone || sale.customer_phone ? Utils.escapeHtml(sale.customerPhone || sale.customer_phone) : '<span class="text-muted">—</span>'}</div>
            <div><strong>Email:</strong> ${sale.customerEmail || sale.customer_email ? Utils.escapeHtml(sale.customerEmail || sale.customer_email) : '<span class="text-muted">—</span>'}</div>
          </div>
        </div>

        <h4 style="font-size:var(--fs-xs);text-transform:uppercase;letter-spacing:0.05em;color:var(--text-tertiary);margin-bottom:8px">Ordered Solar Product & Pricing</h4>
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:14px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div class="product-thumb">☀️</div>
            <div>
              <div style="font-weight:700;font-size:var(--fs-base);color:var(--text-primary)">
                ${Utils.escapeHtml(sale.productName || sale.product_name)}
              </div>
              <div style="font-size:var(--fs-xs);color:var(--text-muted)">
                Catalog ID: <code>${Utils.escapeHtml(sale.productId || sale.product_code)}</code>
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;text-align:center;background:var(--bg-surface);padding:12px;border-radius:var(--radius-md);border:1px solid var(--border-light)">
            <div>
              <div style="font-size:var(--fs-xs);color:var(--text-muted)">Ordered Quantity</div>
              <div style="font-size:var(--fs-lg);font-weight:700;color:var(--color-primary-400)">${Utils.formatNumber(sale.quantity)} <span style="font-size:var(--fs-xs)">panels</span></div>
            </div>
            <div style="border-left:1px solid var(--border-light);border-right:1px solid var(--border-light)">
              <div style="font-size:var(--fs-xs);color:var(--text-muted)">Unit Price</div>
              <div style="font-size:var(--fs-lg);font-weight:700;color:var(--text-primary)">${Utils.formatCurrency(sale.unitPrice || sale.unit_price || 0)}</div>
            </div>
            <div>
              <div style="font-size:var(--fs-xs);color:var(--text-muted)">Total Valuation</div>
              <div style="font-size:var(--fs-lg);font-weight:700;color:var(--color-success)">${Utils.formatCurrency(total)}</div>
            </div>
          </div>
        </div>

        <!-- Inventory Stock Impact Info Banner -->
        <div style="background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.25);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:16px;font-size:var(--fs-xs);line-height:1.5">
          <strong>📦 Live Inventory Synchronization:</strong>
          ${isSold
            ? ` ${sale.quantity} units were deducted from ready inventory and recorded as lifetime fulfilled sales for this product.`
            : ` ${sale.quantity} units are allocated on hold under Reserved status. Ready stock was adjusted accordingly to prevent double-booking.`}
        </div>

        ${sale.notes ? `
          <div style="background:var(--bg-badge);border-radius:var(--radius-md);padding:10px 14px;font-size:var(--fs-xs);color:var(--text-secondary);margin-bottom:12px">
            <strong>Order Notes:</strong> ${Utils.escapeHtml(sale.notes)}
          </div>
        ` : ''}
      </div>
    `;

    const modal = Components.showModal({
      id: 'sale-view-modal',
      title: 'Sales Order Details',
      content,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal>Close</button>
        <button type="button" class="btn btn-primary" id="modal-edit-sale-btn">✏️ Edit Order</button>
      `
    });

    const editBtn = document.getElementById('modal-edit-sale-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        modal.close();
        this.showForm(sale.id || sale.sale_code);
      });
    }
  },

  /**
   * Add or Edit Sale Modal with Live Dynamic Stock Calculations
   */
  async showForm(editId = null) {
    // 1. Refresh products list right before opening modal to ensure up-to-the-minute stock
    try {
      const resp = await fetch('../api/products/index.php?filter=all');
      const json = await resp.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        this.state.products = json.data;
      }
    } catch (e) {
      console.warn('Could not refresh products for modal:', e);
    }

    const item = editId ? this.state.sales.find(s => (s.id === editId || s.sale_code === editId)) : null;
    const isEdit = !!item;

    const activeProducts = this.state.products.filter(p => !p.isDeleted && p.is_deleted === 0);

    // Selected product code
    const selectedProdCode = item ? (item.productId || item.product_code) : '';

    const content = `
      <form id="sales-form" novalidate autocomplete="off" style="padding-top:4px">
        <!-- 1. Dynamic Solar Panel Product Selection -->
        <div class="form-group mb-4">
          <label class="form-label" for="sale-product">Solar Panel Product <span style="color:var(--color-danger)">*</span></label>
          <select class="form-control" id="sale-product" required>
            <option value="">Select product</option>
            ${activeProducts.map(p => {
              const code = p.product_code || p.id;
              const name = p.name || 'Solar Panel';
              let stock = parseInt(p.readyToSell) || 0;
              // If editing and this is the currently selected product, add back this sale's quantity for available calculation
              if (isEdit && code === selectedProdCode && item.status !== 'Cancelled') {
                stock += (parseInt(item.quantity) || 0);
              }
              const price = parseFloat(p.pricePerUnit) || 12500;
              const watt = p.wattCapacity ? `${p.wattCapacity}W` : '';
              const isSelected = code === selectedProdCode;
              const isOut = stock <= 0 && !isSelected;

              return `<option value="${code}" 
                data-db-id="${p.db_id || p.id}" 
                data-name="${Utils.escapeHtml(name)}" 
                data-stock="${stock}" 
                data-price="${price}"
                data-watt="${p.wattCapacity || 400}"
                data-cell="${p.cellType || 'Mono PERC'}"
                ${isSelected ? 'selected' : ''}
                ${isOut ? 'disabled style="color:var(--text-muted)"' : ''}>
                ${Utils.escapeHtml(name)} ${watt ? `(${watt})` : ''} — ${stock} available • ${Utils.formatCurrency(price)}
              </option>`;
            }).join('')}
          </select>
          <div class="form-error" id="sale-product-error" style="display:none"></div>
          
          <!-- Live Product Stock & Spec Info Card -->
          <div id="sale-product-meta" class="mt-2 p-3" style="display:none;background:var(--bg-badge);border-radius:var(--radius-lg);border:1px solid var(--border-color);font-size:var(--fs-xs)">
            <div class="d-flex justify-between align-center flex-wrap gap-2">
              <div><strong>Available Stock:</strong> <span id="meta-stock" class="badge badge-success">0</span></div>
              <div><strong>Unit Price:</strong> <span id="meta-price" class="text-primary fw-bold">₹0.00</span></div>
              <div><strong>Technology:</strong> <span id="meta-cell" class="text-muted">Mono PERC</span></div>
            </div>
          </div>
        </div>

        <!-- 2. Customer Name & Quantity -->
        <div class="form-row">
          <div class="form-group flex-2">
            <label class="form-label" for="sale-customer">Customer Name <span style="color:var(--color-danger)">*</span></label>
            <input type="text" class="form-control" id="sale-customer" placeholder="e.g. Mahesh Industries or Sunrise Hospital" value="${Utils.escapeHtml(item?.customerName || item?.customer_name || '')}" maxlength="150" required>
            <div class="form-error" id="sale-customer-error" style="display:none"></div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="sale-qty">Quantity <span style="color:var(--color-danger)">*</span></label>
            <input type="number" class="form-control" id="sale-qty" min="1" placeholder="e.g. 50" value="${item?.quantity || ''}" required>
            <div class="form-error" id="sale-qty-error" style="display:none"></div>
            <div class="form-text" id="sale-qty-hint" style="font-size:var(--fs-xs);color:var(--text-muted);margin-top:2px">Enter order quantity</div>
          </div>
        </div>

        <!-- Live Total Price Preview Card -->
        <div id="sale-price-preview" class="p-3 mb-4" style="background:linear-gradient(135deg,rgba(14,165,233,0.08),rgba(16,185,129,0.08));border:1px solid rgba(14,165,233,0.25);border-radius:var(--radius-xl);display:none">
          <div class="d-flex justify-between align-center">
            <div>
              <div class="fs-xs text-muted">Order Valuation Preview</div>
              <div class="fw-bold" id="preview-calc-formula" style="font-size:var(--fs-xs);color:var(--text-secondary)">0 panels × ₹0.00</div>
            </div>
            <div class="text-right">
              <div class="fs-xs text-muted">Total Amount</div>
              <div class="fw-bold text-primary" id="preview-total-amount" style="font-size:var(--fs-lg)">₹0.00</div>
            </div>
          </div>
        </div>

        <!-- 3. Customer Contact & Pricing Override -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="sale-phone">Customer Phone</label>
            <input type="tel" class="form-control" id="sale-phone" placeholder="e.g. +91 99887 76655" value="${Utils.escapeHtml(item?.customerPhone || item?.customer_phone || '')}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="sale-email">Customer Email</label>
            <input type="email" class="form-control" id="sale-email" placeholder="e.g. contact@customer.com" value="${Utils.escapeHtml(item?.customerEmail || item?.customer_email || '')}">
            <div class="form-error" id="sale-email-error" style="display:none"></div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="sale-unit-price">Unit Price (₹)</label>
            <input type="number" step="0.01" class="form-control" id="sale-unit-price" placeholder="Auto from product" value="${item?.unitPrice || item?.unit_price || ''}">
          </div>
        </div>

        <!-- 4. Date & Status -->
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="sale-date">Date <span style="color:var(--color-danger)">*</span></label>
            <input type="date" class="form-control" id="sale-date" value="${Utils.formatDateInput(item?.saleDate || item?.sale_date) || Utils.today()}" required>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="sale-status">Status <span style="color:var(--color-danger)">*</span></label>
            <select class="form-control" id="sale-status">
              <option value="Reserved" ${item?.status === 'Reserved' || !item ? 'selected' : ''}>Reserved (Hold in Stock)</option>
              <option value="Sold" ${item?.status === 'Sold' ? 'selected' : ''}>Sold (Fulfilled / Dispatched)</option>
              ${isEdit ? `<option value="Cancelled" ${item?.status === 'Cancelled' ? 'selected' : ''}>Cancelled (Return Stock)</option>` : ''}
            </select>
          </div>
        </div>

        <!-- 5. Notes -->
        <div class="form-group mb-0">
          <label class="form-label" for="sale-notes">Order Notes / Project Reference</label>
          <textarea class="form-control" id="sale-notes" rows="2" placeholder="e.g. Rooftop installation hold, site clearance scheduled...">${Utils.escapeHtml(item?.notes || '')}</textarea>
        </div>
      </form>
    `;

    const modal = Components.showModal({
      id: 'sales-modal',
      title: isEdit ? `Edit Sale Record: ${item.id || item.sale_code}` : 'Add Sale Record',
      size: 'lg',
      content,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal id="sale-cancel">Cancel</button>
        <button type="button" class="btn btn-primary" id="sale-save">${isEdit ? 'Save Changes' : 'Save Record'}</button>
      `
    });

    // Setup Dynamic Live Calculators
    this.setupModalCalculators(isEdit, item);

    // Save click listener
    const saveBtn = document.getElementById('sale-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        await this.handleSaveSale(modal, isEdit, item);
      });
    }
  },

  /**
   * Connect dynamic live price and stock calculators inside Modal
   */
  setupModalCalculators(isEdit, existingItem) {
    const prodSelect = document.getElementById('sale-product');
    const qtyInput = document.getElementById('sale-qty');
    const unitPriceInput = document.getElementById('sale-unit-price');
    const metaCard = document.getElementById('sale-product-meta');
    const metaStock = document.getElementById('meta-stock');
    const metaPrice = document.getElementById('meta-price');
    const metaCell = document.getElementById('meta-cell');
    const previewCard = document.getElementById('sale-price-preview');
    const previewFormula = document.getElementById('preview-calc-formula');
    const previewTotal = document.getElementById('preview-total-amount');
    const qtyHint = document.getElementById('sale-qty-hint');

    const updateCalculator = () => {
      const opt = prodSelect.selectedOptions[0];
      if (!opt || !opt.value) {
        if (metaCard) metaCard.style.display = 'none';
        if (previewCard) previewCard.style.display = 'none';
        return;
      }

      const stock = parseInt(opt.dataset.stock) || 0;
      const defaultPrice = parseFloat(opt.dataset.price) || 0;
      const cell = opt.dataset.cell || 'Mono PERC';

      // Meta info display
      if (metaCard) {
        metaCard.style.display = 'block';
        if (metaStock) {
          metaStock.textContent = `${stock} units`;
          metaStock.className = `badge ${stock > 20 ? 'badge-success' : (stock > 0 ? 'badge-warning' : 'badge-danger')}`;
        }
        if (metaPrice) metaPrice.textContent = Utils.formatCurrency(defaultPrice);
        if (metaCell) metaCell.textContent = cell;
      }

      // Quantity Hint
      if (qtyHint) {
        qtyHint.textContent = `Max available: ${stock} units`;
      }

      // Autofill unit price if empty
      if (unitPriceInput && (!unitPriceInput.value || parseFloat(unitPriceInput.value) <= 0)) {
        unitPriceInput.value = defaultPrice;
      }

      const currentUnitPrice = parseFloat(unitPriceInput?.value) || defaultPrice;
      const qty = parseInt(qtyInput?.value) || 0;

      // Price Preview Display
      if (previewCard) {
        if (qty > 0) {
          previewCard.style.display = 'block';
          const total = qty * currentUnitPrice;
          if (previewFormula) previewFormula.textContent = `${qty} panels × ${Utils.formatCurrency(currentUnitPrice)}`;
          if (previewTotal) previewTotal.textContent = Utils.formatCurrency(total);
        } else {
          previewCard.style.display = 'none';
        }
      }
    };

    if (prodSelect) prodSelect.addEventListener('change', () => {
      // Reset unit price to new product's price on product switch
      const opt = prodSelect.selectedOptions[0];
      if (opt && opt.dataset.price && unitPriceInput) {
        unitPriceInput.value = opt.dataset.price;
      }
      updateCalculator();
    });

    if (qtyInput) qtyInput.addEventListener('input', updateCalculator);
    if (unitPriceInput) unitPriceInput.addEventListener('input', updateCalculator);

    // Initial trigger
    updateCalculator();
  },

  /**
   * Validate and Submit Create / Edit Sale
   */
  async handleSaveSale(modal, isEdit, existingItem) {
    const prodSelect     = document.getElementById('sale-product');
    const customerInput  = document.getElementById('sale-customer');
    const qtyInput       = document.getElementById('sale-qty');
    const phoneInput     = document.getElementById('sale-phone');
    const emailInput     = document.getElementById('sale-email');
    const unitPriceInput = document.getElementById('sale-unit-price');
    const dateInput      = document.getElementById('sale-date');
    const statusSelect   = document.getElementById('sale-status');
    const notesInput     = document.getElementById('sale-notes');
    const saveBtn        = document.getElementById('sale-save');

    // Reset error states
    document.querySelectorAll('#sales-form .form-control').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('#sales-form .form-error').forEach(el => { el.style.display = 'none'; el.textContent = ''; });

    const productId = prodSelect.value.trim();
    const customerName = customerInput.value.trim();
    const quantity = parseInt(qtyInput.value, 10);
    const phone = phoneInput.value.trim();
    const email = emailInput.value.trim();
    const unitPrice = parseFloat(unitPriceInput.value) || 0;
    const saleDate = dateInput.value;
    const status = statusSelect.value;
    const notes = notesInput.value.trim();

    const selectedOpt = prodSelect.selectedOptions[0];
    const availableStock = selectedOpt ? (parseInt(selectedOpt.dataset.stock) || 0) : 0;

    let hasErrors = false;

    // Validate Product
    if (!productId) {
      this.showFieldError('sale-product', 'Please select a solar panel product.');
      hasErrors = true;
    }

    // Validate Customer Name
    if (!customerName || customerName.length < 2) {
      this.showFieldError('sale-customer', 'Customer name is required (minimum 2 characters).');
      hasErrors = true;
    }

    // Validate Quantity & Available Stock
    if (isNaN(quantity) || quantity <= 0) {
      this.showFieldError('sale-qty', 'Quantity must be at least 1 unit.');
      hasErrors = true;
    } else if (status !== 'Cancelled' && quantity > availableStock) {
      this.showFieldError('sale-qty', `Requested ${quantity} units exceeds available stock (${availableStock} units).`);
      hasErrors = true;
    }

    // Validate Email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.showFieldError('sale-email', 'Please enter a valid email address.');
      hasErrors = true;
    }

    if (hasErrors) return;

    // Build payload
    const payload = {
      productId,
      product_id: productId,
      customerName,
      customer_name: customerName,
      customerPhone: phone,
      customer_phone: phone,
      customerEmail: email,
      customer_email: email,
      quantity,
      unitPrice,
      unit_price: unitPrice,
      saleDate,
      sale_date: saleDate,
      status,
      notes
    };

    if (isEdit) {
      payload.id = existingItem.id || existingItem.sale_code;
      payload.sale_code = existingItem.sale_code || existingItem.id;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = isEdit ? 'Saving...' : 'Recording...';

    try {
      const endpoint = isEdit ? '../api/sales/update.php' : '../api/sales/create.php';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await resp.json();

      if (!result.success) {
        if (result.errors) {
          Object.keys(result.errors).forEach(key => {
            const elId = key === 'customer' ? 'sale-customer' : (key === 'product' ? 'sale-product' : `sale-${key}`);
            this.showFieldError(elId, result.errors[key]);
          });
        }
        Components.toast('error', 'Error', result.message || 'Could not record sale.');
        saveBtn.disabled = false;
        saveBtn.textContent = isEdit ? 'Save Changes' : 'Save Record';
        return;
      }

      Components.toast('success', isEdit ? 'Sale Updated' : 'Sale Recorded', result.message || 'Order saved and inventory stock synchronized.');
      modal.close();

      // Refresh data and UI
      await this.loadData();
      this.renderStats();
      this.renderTabs();
      this.renderTable();

    } catch (err) {
      console.error('Save sale failed:', err);
      Components.toast('error', 'Network Error', 'Unable to communicate with the server.');
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Save Changes' : 'Save Record';
    }
  },

  showFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(`${inputId}-error`);
    if (input) input.classList.add('is-invalid');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  },

  /**
   * Fast Status Transition: Mark Reserved Sale as Sold
   */
  async handleMarkSold(saleId, btnEl) {
    const sale = this.state.sales.find(s => (s.id === saleId || s.sale_code === saleId));
    if (!sale) return;

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.textContent = 'Updating...';
    }

    try {
      const resp = await fetch('../api/sales/update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: saleId, status: 'Sold' })
      });
      const res = await resp.json();

      if (!resp.ok || !res.success) {
        throw new Error(res.message || 'Failed to update sale status');
      }

      Components.toast('success', 'Sale Fulfilled', res.message || `Sale ${saleId} marked as Sold and inventory updated.`);

      await this.loadData();
      this.renderStats();
      this.renderTabs();
      this.renderTable();

    } catch (err) {
      console.error('Mark sold error:', err);
      Components.toast('error', 'Error', err.message || 'Failed to update sale status.');
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = 'Mark Sold';
      }
    }
  },

  /**
   * Confirm Delete Sale Record & Restore Inventory Stock
   */
  confirmDelete(saleId) {
    const sale = this.state.sales.find(s => (s.id === saleId || s.sale_code === saleId));
    if (!sale) return;

    const modalContent = `
      <div style="padding:10px 0">
        <div style="background:rgba(239,68,68,0.08);border-left:4px solid var(--color-danger);padding:12px 16px;border-radius:var(--radius-md);margin-bottom:16px">
          <div style="font-weight:700;color:var(--color-danger);margin-bottom:4px">⚠️ Delete Sale Order Confirmation</div>
          <div style="font-size:var(--fs-sm);color:var(--text-secondary);line-height:1.4">
            Are you sure you want to delete order <strong>${Utils.escapeHtml(sale.id || sale.sale_code)}</strong> for <strong>${Utils.escapeHtml(sale.customerName || sale.customer_name)}</strong>?
          </div>
        </div>

        <p style="font-size:var(--fs-sm);color:var(--text-secondary);line-height:1.5;margin-bottom:12px">
          <strong>Inventory Stock Restoration:</strong>
        </p>
        <ul style="font-size:var(--fs-sm);color:var(--text-secondary);padding-left:20px;line-height:1.5">
          <li><strong>${sale.quantity} units</strong> of <em>${Utils.escapeHtml(sale.productName || sale.product_name)}</em> will be returned to ready-to-sell stock.</li>
          <li>This sale record will be removed from customer transaction history.</li>
        </ul>
      </div>
    `;

    const modal = Components.showModal({
      id: 'sales-delete-modal',
      title: 'Delete Sale Record',
      content: modalContent,
      footer: `
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-danger" id="sale-confirm-delete-btn" style="box-shadow:var(--shadow-sm)">
          Delete & Restore Stock
        </button>
      `
    });

    const confirmBtn = document.getElementById('sale-confirm-delete-btn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Restoring stock...';
        try {
          const resp = await fetch('../api/sales/delete.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ id: saleId })
          });
          const res = await resp.json();

          if (!resp.ok || !res.success) {
            throw new Error(res.message || 'Failed to delete sale from database');
          }

          Components.toast('success', 'Sale Deleted', res.message || `Sale record ${saleId} removed and stock restored.`);
          modal.close();

          await this.loadData();
          this.renderStats();
          this.renderTabs();
          this.renderTable();

        } catch (err) {
          console.error('Delete sale error:', err);
          Components.toast('error', 'Error', err.message || 'Failed to delete sale record.');
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Delete & Restore Stock';
        }
      });
    }
  },

  /**
   * Export sales records to CSV spreadsheet
   */
  exportCSV() {
    const items = this.getFilteredItems();
    if (!items.length) {
      return Components.toast('warning', 'No Data', 'No sales records found to export.');
    }

    const headers = [
      { label: 'Sale ID', key: 'sale_code' },
      { label: 'Date', key: 'saleDate' },
      { label: 'Customer Name', key: 'customerName' },
      { label: 'Phone', key: 'customerPhone' },
      { label: 'Email', key: 'customerEmail' },
      { label: 'Product Code', key: 'productId' },
      { label: 'Product Name', key: 'productName' },
      { label: 'Quantity', key: 'quantity' },
      { label: 'Unit Price (INR)', key: 'unitPrice' },
      { label: 'Total Amount (INR)', key: 'totalAmount' },
      { label: 'Status', key: 'status' },
      { label: 'Order Notes', key: 'notes' }
    ];

    const filename = `smatree-sales-orders-${this.state.currentTab}-${Utils.today ? Utils.today() : 'export'}.csv`;
    Utils.exportCSV(items, headers, filename);
    Components.toast('success', 'Export Complete', `${items.length} sales orders exported to CSV.`);
  }
};

window.Sales = Sales;
