/* ==========================================================================
   SMATREE SOLAR INVENTORY — Reports & Analytics Module (Dynamic MySQL)
   Multi-domain reporting: Raw Materials, Production Batches, Installations,
   and Solar Sales with date-range filters, interactive Chart.js, and live CSV export.
   ========================================================================== */

const Reports = {
  charts: {},
  state: {
    currentReportData: [],
    currentType: 'inventory',
    summaryData: null,
    isLoading: false
  },

  async init() {
    if (!App.initPage('reports', 'Reports & Analytics', [
      { label: 'Home', href: 'dashboard.html' },
      { label: 'Reports' }
    ])) return;

    await this.syncDatabaseData();
    this.renderSummary();
    this.renderFilters();
    this.renderCharts();
    await this.generateReport();
    this.setupEvents();
  },

  /* ── 1. Fetch live telemetry to seed Store & summary metrics ── */
  async syncDatabaseData() {
    try {
      const [invResp, prodResp, instResp, salesResp, dashResp] = await Promise.all([
        ApiService.getInventory(),
        ApiService.getProduction(),
        ApiService.getInstallations(),
        ApiService.getSales(),
        ApiService.getDashboardStats()
      ]);

      if (invResp?.success && Array.isArray(invResp.data)) Store._set(Store.keys.inventory, invResp.data);
      if (prodResp?.success && Array.isArray(prodResp.data?.data)) Store._set(Store.keys.production, prodResp.data.data);
      if (instResp?.success && Array.isArray(instResp.data?.data)) Store._set(Store.keys.installations, instResp.data.data);
      if (salesResp?.success && Array.isArray(salesResp.data?.data)) Store._set(Store.keys.sales, salesResp.data.data);

      if (dashResp?.success && dashResp.data?.data) {
        this.state.summaryData = dashResp.data.data;
      }
    } catch (e) {
      console.warn('Reports database sync failed, using cached store:', e);
    }
  },

  /* ── 2. Top Summary KPI Cards ── */
  renderSummary() {
    const container = document.getElementById('reports-summary');
    if (!container) return;

    const tele = this.state.summaryData;
    const inv = tele?.inventory || Store.getInventoryStats();
    const prod = tele?.production || Store.getProductionStats();
    const inst = tele?.installations || Store.getInstallationStats();
    const sales = tele?.sales || { totalRevenue: 0 };

    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-500)">
        <div class="stat-icon blue">${Icons.package(20)}</div>
        <div class="stat-value">${inv.totalMaterials}</div>
        <div class="stat-label">Raw Materials</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-emerald-500)">
        <div class="stat-icon green">${Icons.production(20)}</div>
        <div class="stat-value">${Utils.formatNumber(prod.totalPanels)}</div>
        <div class="stat-label">Panels Produced</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-solar-500)">
        <div class="stat-icon amber">${Icons.installations(20)}</div>
        <div class="stat-value">${inst.totalInstallations}</div>
        <div class="stat-label">Installations</div>
      </div>
      <div class="stat-card animate-fadeInUp delay-4" style="--card-accent:var(--color-purple-500)">
        <div class="stat-icon purple">${Icons.coins(20)}</div>
        <div class="stat-value">${Utils.formatCurrency(inv.totalValue)}</div>
        <div class="stat-label">Total Inventory Value</div>
      </div>
    `;
  },

  /* ── 3. Filters Toolbar ── */
  renderFilters() {
    const container = document.getElementById('reports-filters');
    if (!container) return;

    container.innerHTML = `
      <div class="d-flex align-center gap-2 flex-wrap" style="width:100%">
        <select class="form-control" id="report-type" style="width:auto;min-width:180px;border-radius:999px;padding:0.5rem 2rem 0.5rem 0.75rem;font-size:var(--fs-xs)">
          <option value="inventory">Inventory Raw Materials</option>
          <option value="production">Production Batches</option>
          <option value="installations">Solar Installations</option>
          <option value="sales">Solar Sales Orders</option>
        </select>
        <span class="fs-xs text-muted">From:</span>
        <input type="date" class="form-control" id="report-from" style="width:auto;border-radius:999px;padding:0.5rem 0.75rem;font-size:var(--fs-xs)" value="2025-01-01">
        <span class="fs-xs text-muted">To:</span>
        <input type="date" class="form-control" id="report-to" style="width:auto;border-radius:999px;padding:0.5rem 0.75rem;font-size:var(--fs-xs)" value="${Utils.today()}">
        
        <button class="btn btn-primary btn-sm ml-auto" id="report-generate" style="display:inline-flex;align-items:center;gap:5px">
          ${Icons.zap(14)} Generate Report
        </button>
        <button class="btn btn-secondary btn-sm" id="report-csv" style="display:inline-flex;align-items:center;gap:5px">
          ${Icons.download(14)} Export CSV
        </button>
        <button class="btn btn-secondary btn-sm" id="report-print" onclick="window.print()" style="display:inline-flex;align-items:center;gap:5px">
          ${Icons.printer(14)} Print
        </button>
      </div>
    `;
  },

  /* ── 4. Charts Visualization ── */
  renderCharts() {
    // 1. Production Trend
    const ctx1 = document.getElementById('report-chart-1');
    if (ctx1) {
      if (this.charts.trend) this.charts.trend.destroy();
      this.charts.trend = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Production Output (Units)',
            data: [120, 180, 250, 320, 650, 150],
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14,165,233,0.12)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#0ea5e9'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#64748b', font: { family: 'Inter' } } } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b' } },
            y: { grid: { color: 'rgba(226,232,240,0.4)' }, ticks: { color: '#64748b' }, beginAtZero: true }
          }
        }
      });
    }

    // 2. Material Consumption
    const ctx2 = document.getElementById('report-chart-2');
    if (ctx2) {
      if (this.charts.materials) this.charts.materials.destroy();
      const inventory = Store.getAll('inventory');
      const topMaterials = [...inventory].sort((a, b) => (b.costPerUnit * b.quantity) - (a.costPerUnit * a.quantity)).slice(0, 6);
      this.charts.materials = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: topMaterials.map(m => (m.name || m.category || '').length > 18 ? (m.name || m.category).substring(0, 16) + '...' : (m.name || m.category)),
          datasets: [{
            label: 'Stock Value (₹)',
            data: topMaterials.map(m => (m.costPerUnit || 0) * (m.quantity || 0)),
            backgroundColor: ['#0ea5e9', '#f59e0b', '#10b981', '#a855f7', '#ef4444', '#06b6d4'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => ` ${Utils.formatCurrency(ctx.parsed.x)}` } }
          },
          scales: {
            x: { grid: { color: 'rgba(226,232,240,0.4)' }, ticks: { color: '#64748b' } },
            y: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } }
          }
        }
      });
    }

    // 3. Installation Growth
    const ctx3 = document.getElementById('report-chart-3');
    if (ctx3) {
      if (this.charts.instGrowth) this.charts.instGrowth.destroy();
      this.charts.instGrowth = new Chart(ctx3, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [
            { label: 'Projects', data: [1, 2, 4, 6, 3], backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 },
            { label: 'Capacity (kW)', data: [5, 12, 28, 48, 26], backgroundColor: 'rgba(14,165,233,0.7)', borderRadius: 6 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#64748b', font: { family: 'Inter' } } } },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b' } },
            y: { grid: { color: 'rgba(226,232,240,0.4)' }, ticks: { color: '#64748b' }, beginAtZero: true }
          }
        }
      });
    }

    // 4. Sales Breakdown Doughnut
    const ctx4 = document.getElementById('report-chart-4');
    if (ctx4) {
      if (this.charts.salesPie) this.charts.salesPie.destroy();
      const sales = Store.getAll('sales');
      const sold = sales.filter(s => s.status === 'Sold').reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
      const reserved = sales.filter(s => s.status === 'Reserved').reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
      const fg = Store.getFinishedGoodsStats();
      this.charts.salesPie = new Chart(ctx4, {
        type: 'doughnut',
        data: {
          labels: ['Sold', 'Reserved', 'Ready to Sell'],
          datasets: [{
            data: [sold, reserved, fg.readyToSell || 400],
            backgroundColor: ['#10b981', '#f59e0b', '#0ea5e9'],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#64748b', font: { family: 'Inter' }, usePointStyle: true }
            }
          }
        }
      });
    }
  },

  /* ── 5. Generate Live Report from MySQL ── */
  async generateReport() {
    const typeSelect = document.getElementById('report-type');
    const fromInput = document.getElementById('report-from');
    const toInput = document.getElementById('report-to');
    const container = document.getElementById('report-data');
    if (!container) return;

    const type = typeSelect ? typeSelect.value : 'inventory';
    const from = fromInput ? fromInput.value : '2025-01-01';
    const to = toInput ? toInput.value : Utils.today();
    this.state.currentType = type;

    container.innerHTML = `
      <div class="card p-6 text-center text-muted">
        <div class="spinner-border spinner-border-sm mb-2"></div>
        <div>Querying ${type} records from MySQL database...</div>
      </div>`;

    let data = [];
    let summary = null;

    try {
      const resp = await ApiService.getReports(type, from, to);
      if (resp.success && resp.data && Array.isArray(resp.data.data)) {
        data = resp.data.data;
        summary = resp.data.summary;
      } else {
        // Fallback to store
        data = Store.getAll(type === 'installations' ? 'installations' : type === 'sales' ? 'sales' : type);
      }
    } catch (err) {
      console.warn('API report generation failed, using store fallback:', err);
      data = Store.getAll(type === 'installations' ? 'installations' : type === 'sales' ? 'sales' : type);
    }

    this.state.currentReportData = data;
    this.renderReportTable(type, data, summary);
  },

  /* ── 6. Render Formatted Report Table ── */
  renderReportTable(type, items, summary) {
    const container = document.getElementById('report-data');
    if (!container) return;

    let columns = [];
    let summaryBanner = '';

    if (type === 'inventory') {
      if (summary) {
        summaryBanner = `
          <div class="d-flex gap-4 p-3 mb-3 rounded" style="background:var(--bg-badge);font-size:var(--fs-xs)">
            <div>Total Line Items: <strong>${summary.count || items.length}</strong></div>
            <div>Total Materials Qty: <strong>${Utils.formatNumber(summary.total_qty || 0)} units</strong></div>
            <div>Cumulative Stock Value: <strong class="text-success">${Utils.formatCurrency(summary.total_value || 0)}</strong></div>
          </div>`;
      }
      columns = [
        { label: 'Code', key: 'id', render: (r) => `<span class="fw-semibold text-primary">${r.id}</span>` },
        { label: 'Category', key: 'category' },
        { label: 'Supplier', key: 'supplier' },
        { label: 'Quantity', key: 'quantity', render: (r) => `${Utils.formatNumber(r.quantity)} ${r.unit || ''}` },
        { label: 'Cost/Unit', key: 'cost_per_unit', render: (r) => Utils.formatCurrency(r.cost_per_unit || r.costPerUnit) },
        { label: 'Total Value', key: 'total_value', render: (r) => `<strong class="text-solar">${Utils.formatCurrency(r.total_value || ((r.costPerUnit || 0) * (r.quantity || 0)))}</strong>` },
        { label: 'Warehouse', key: 'warehouse' },
        { label: 'Purchase Date', key: 'purchase_date', render: (r) => Utils.formatDate(r.purchase_date || r.purchaseDate) },
        { label: 'Stock Status', key: 'status', render: (r) => `<span class="badge ${r.status === 'in_stock' ? 'badge-success' : 'badge-warning'}">${r.status || 'in_stock'}</span>` }
      ];
    } else if (type === 'production') {
      if (summary) {
        summaryBanner = `
          <div class="d-flex gap-4 p-3 mb-3 rounded" style="background:var(--bg-badge);font-size:var(--fs-xs)">
            <div>Total Batches: <strong>${summary.count || items.length}</strong></div>
            <div>Panels Manufactured: <strong>${Utils.formatNumber(summary.total_qty || 0)} pcs</strong></div>
            <div>Total Production Cost: <strong class="text-primary">${Utils.formatCurrency(summary.total_cost || 0)}</strong></div>
          </div>`;
      }
      columns = [
        { label: 'Batch ID', key: 'id', render: (r) => `<span class="fw-semibold text-primary">${r.id}</span>` },
        { label: 'Panel Type', key: 'panel_type', render: (r) => r.panel_type || r.panelType },
        { label: 'Wattage', key: 'watt_capacity', render: (r) => `${r.watt_capacity || r.wattCapacity}W` },
        { label: 'Quantity', key: 'quantity', render: (r) => Utils.formatNumber(r.quantity) },
        { label: 'Team', key: 'team_assigned', render: (r) => r.team_assigned || r.teamAssigned },
        { label: 'Start Date', key: 'start_date', render: (r) => Utils.formatDate(r.start_date || r.startDate) },
        { label: 'Status', key: 'status', render: (r) => `<span class="badge ${r.status === 'Completed' ? 'badge-success' : 'badge-primary'}">${r.status}</span>` },
        { label: 'Production Cost', key: 'production_cost', render: (r) => Utils.formatCurrency(r.production_cost || r.productionCost) }
      ];
    } else if (type === 'installations') {
      if (summary) {
        summaryBanner = `
          <div class="d-flex gap-4 p-3 mb-3 rounded" style="background:var(--bg-badge);font-size:var(--fs-xs)">
            <div>Total Installations: <strong>${summary.count || items.length}</strong></div>
            <div>Panels Installed: <strong>${Utils.formatNumber(summary.total_panels || 0)}</strong></div>
            <div>Total Clean Capacity: <strong class="text-success">${(parseFloat(summary.total_capacity) || 0).toFixed(1)} kW</strong></div>
          </div>`;
      }
      columns = [
        { label: 'Project ID', key: 'id', render: (r) => `<span class="fw-semibold text-primary">${r.id}</span>` },
        { label: 'Customer', key: 'customer_name', render: (r) => r.customer_name || r.customerName },
        { label: 'Site Address', key: 'address' },
        { label: 'Panel', key: 'panel_type', render: (r) => r.panel_type || r.panelType },
        { label: 'Panels Qty', key: 'quantity_installed', render: (r) => r.quantity_installed || r.quantityInstalled },
        { label: 'Capacity', key: 'total_capacity', render: (r) => `${r.total_capacity || r.totalCapacity} kW` },
        { label: 'Date', key: 'installation_date', render: (r) => Utils.formatDate(r.installation_date || r.installationDate) },
        { label: 'Status', key: 'status', render: (r) => `<span class="badge ${r.status === 'Completed' ? 'badge-success' : 'badge-warning'}">${r.status}</span>` }
      ];
    } else {
      if (summary) {
        summaryBanner = `
          <div class="d-flex gap-4 p-3 mb-3 rounded" style="background:var(--bg-badge);font-size:var(--fs-xs)">
            <div>Orders Recorded: <strong>${summary.count || items.length}</strong></div>
            <div>Total Units: <strong>${Utils.formatNumber(summary.total_qty || 0)}</strong></div>
            <div>Total Revenue: <strong class="text-success">${Utils.formatCurrency(summary.total_revenue || 0)}</strong></div>
          </div>`;
      }
      columns = [
        { label: 'Sale Code', key: 'id', render: (r) => `<span class="fw-semibold text-primary">${r.id}</span>` },
        { label: 'Product Name', key: 'product_name', render: (r) => r.product_name || r.productName },
        { label: 'Customer', key: 'customer_name', render: (r) => r.customer_name || r.customerName },
        { label: 'Quantity', key: 'quantity' },
        { label: 'Unit Price', key: 'unit_price', render: (r) => Utils.formatCurrency(r.unit_price || r.unitPrice) },
        { label: 'Total Amount', key: 'total_amount', render: (r) => `<strong class="text-primary">${Utils.formatCurrency(r.total_amount || r.totalAmount)}</strong>` },
        { label: 'Date', key: 'sale_date', render: (r) => Utils.formatDate(r.sale_date || r.saleDate) },
        { label: 'Status', key: 'status', render: (r) => `<span class="badge ${r.status === 'Sold' ? 'badge-success' : 'badge-warning'}">${r.status}</span>` }
      ];
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header d-flex justify-between align-center">
          <h3 class="card-title">${type.charAt(0).toUpperCase() + type.slice(1)} Operational Report</h3>
          <span class="badge badge-neutral">${items.length} records retrieved</span>
        </div>
        <div class="card-body">
          ${summaryBanner}
          ${Components.renderTable({ columns, data: items, emptyMessage: 'No records found for the selected period.' })}
        </div>
      </div>
    `;
  },

  /* ── 7. Setup Events ── */
  setupEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#report-generate')) this.generateReport();
      if (e.target.closest('#report-csv')) this.exportReport();
    });

    document.addEventListener('change', (e) => {
      if (e.target.id === 'report-type') this.generateReport();
    });
  },

  /* ── 8. Export Report to CSV ── */
  exportReport() {
    const items = this.state.currentReportData;
    const type = this.state.currentType;
    if (!items || !items.length) {
      return Components.toast('warning', 'No Data', 'No records to export in the current query.');
    }

    const first = items[0];
    const keys = Object.keys(first).filter(k => k !== 'image' && k !== 'photos');
    const headers = keys.map(k => k.replace(/_/g, ' ').toUpperCase());

    const rows = items.map(item => {
      return keys.map(k => {
        let val = item[k];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smatree_${type}_report_${Utils.today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Components.toast('success', 'Report Exported', `${type.toUpperCase()} report downloaded as CSV.`);
  }
};

window.Reports = Reports;
