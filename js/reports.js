/* ==========================================================================
   SMATREE SOLAR INVENTORY — Reports Module
   ========================================================================== */
const Reports = {
  charts: {},

  init() {
    if (!App.initPage('reports', 'Reports & Analytics', [
      { label: 'Home', href: 'dashboard.html' }, { label: 'Reports' }
    ])) return;
    this.renderSummary();
    this.renderFilters();
    this.renderCharts();
    this.renderDataTable();
    this.setupEvents();
  },

  renderSummary() {
    const container = document.getElementById('reports-summary');
    if (!container) return;
    const inv = Store.getInventoryStats();
    const prod = Store.getProductionStats();
    const fg = Store.getFinishedGoodsStats();
    const inst = Store.getInstallationStats();

    container.innerHTML = `
      <div class="stat-card animate-fadeInUp delay-1" style="--card-accent:var(--color-primary-400)">
        <div class="stat-icon blue">📦</div><div class="stat-value">${inv.totalMaterials}</div><div class="stat-label">Raw Materials</div></div>
      <div class="stat-card animate-fadeInUp delay-2" style="--card-accent:var(--color-emerald-400)">
        <div class="stat-icon green">🏭</div><div class="stat-value">${Utils.formatNumber(prod.totalPanels)}</div><div class="stat-label">Panels Produced</div></div>
      <div class="stat-card animate-fadeInUp delay-3" style="--card-accent:var(--color-solar-400)">
        <div class="stat-icon amber">🔧</div><div class="stat-value">${inst.totalInstallations}</div><div class="stat-label">Installations</div></div>
      <div class="stat-card animate-fadeInUp delay-4" style="--card-accent:var(--color-purple-400)">
        <div class="stat-icon purple">💰</div><div class="stat-value">${Utils.formatCurrency(inv.totalValue)}</div><div class="stat-label">Total Value</div></div>`;
  },

  renderFilters() {
    const container = document.getElementById('reports-filters');
    if (!container) return;
    container.innerHTML = `
      <select class="form-control" id="report-type" style="width:auto;min-width:180px;border-radius:999px;padding:0.5rem 2rem 0.5rem 0.75rem;font-size:var(--fs-xs)">
        <option value="inventory">Inventory Report</option>
        <option value="production">Production Report</option>
        <option value="installations">Installation Report</option>
        <option value="sales">Sales Report</option>
      </select>
      <input type="date" class="form-control" id="report-from" style="width:auto;border-radius:999px;padding:0.5rem 0.75rem;font-size:var(--fs-xs)" value="2026-01-01">
      <input type="date" class="form-control" id="report-to" style="width:auto;border-radius:999px;padding:0.5rem 0.75rem;font-size:var(--fs-xs)" value="${Utils.today()}">
      <button class="btn btn-primary btn-sm" id="report-generate">Generate</button>
      <button class="btn btn-secondary btn-sm" id="report-csv">📥 Export CSV</button>
      <button class="btn btn-secondary btn-sm" id="report-print" onclick="window.print()">🖨️ Print</button>`;
  },

  renderCharts() {
    // Production Trend
    const ctx1 = document.getElementById('report-chart-1');
    if (ctx1) {
      this.charts.trend = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Production Output', data: [120, 180, 250, 320, 650, 150],
            borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.1)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#0ea5e9'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#64748b', font: { family: 'Inter' } } } },
          scales: { x: { grid: { display: false }, ticks: { color: '#64748b' } }, y: { grid: { color: 'rgba(226,232,240,0.3)' }, ticks: { color: '#64748b' }, beginAtZero: true } } }
      });
    }

    // Material Consumption
    const ctx2 = document.getElementById('report-chart-2');
    if (ctx2) {
      const inventory = Store.getAll('inventory');
      const topMaterials = inventory.sort((a, b) => (b.costPerUnit * b.quantity) - (a.costPerUnit * a.quantity)).slice(0, 6);
      this.charts.materials = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: topMaterials.map(m => m.name.length > 20 ? m.name.substring(0, 18) + '...' : m.name),
          datasets: [{ label: 'Value (₹)', data: topMaterials.map(m => m.costPerUnit * m.quantity),
            backgroundColor: ['#0ea5e9', '#f59e0b', '#10b981', '#a855f7', '#ef4444', '#06b6d4'],
            borderRadius: 6, borderSkipped: false }]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${Utils.formatCurrency(ctx.parsed.x)}` } } },
          scales: { x: { grid: { color: 'rgba(226,232,240,0.3)' }, ticks: { color: '#64748b' } }, y: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } } } }
      });
    }

    // Installation Growth
    const ctx3 = document.getElementById('report-chart-3');
    if (ctx3) {
      this.charts.instGrowth = new Chart(ctx3, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
          datasets: [
            { label: 'Installations', data: [2, 3, 5, 8, 3], backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 6 },
            { label: 'Capacity (kW)', data: [10, 18, 30, 68, 22], backgroundColor: 'rgba(14,165,233,0.7)', borderRadius: 6 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#64748b', font: { family: 'Inter' } } } },
          scales: { x: { grid: { display: false }, ticks: { color: '#64748b' } }, y: { grid: { color: 'rgba(226,232,240,0.3)' }, ticks: { color: '#64748b' }, beginAtZero: true } } }
      });
    }

    // Sales breakdown
    const ctx4 = document.getElementById('report-chart-4');
    if (ctx4) {
      const sales = Store.getAll('sales');
      const sold = sales.filter(s => s.status === 'Sold').reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
      const reserved = sales.filter(s => s.status === 'Reserved').reduce((sum, s) => sum + (parseInt(s.quantity) || 0), 0);
      const fg = Store.getFinishedGoodsStats();
      this.charts.salesPie = new Chart(ctx4, {
        type: 'doughnut',
        data: {
          labels: ['Sold', 'Reserved', 'Available'],
          datasets: [{ data: [sold, reserved, fg.readyToSell], backgroundColor: ['#10b981', '#f59e0b', '#0ea5e9'], borderWidth: 0, hoverOffset: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { color: '#64748b', font: { family: 'Inter' }, usePointStyle: true } } } }
      });
    }
  },

  renderDataTable() {
    const container = document.getElementById('report-data');
    if (!container) return;
    const type = document.getElementById('report-type')?.value || 'inventory';
    let items, columns;

    if (type === 'inventory') {
      items = Store.getAll('inventory');
      columns = [
        { label: 'ID', key: 'id' }, { label: 'Name', key: 'name' }, { label: 'Category', key: 'category' },
        { label: 'Qty', key: 'quantity' }, { label: 'Cost/Unit', key: 'costPerUnit', render: (r) => Utils.formatCurrency(r.costPerUnit) },
        { label: 'Value', render: (r) => Utils.formatCurrency(r.costPerUnit * r.quantity) },
        { label: 'Status', render: (r) => { const s = Utils.getStockStatus(r.quantity, r.reorderLevel); return `<span class="badge badge-dot ${s.class}">${s.label}</span>`; } },
      ];
    } else if (type === 'production') {
      items = Store.getAll('production');
      columns = [
        { label: 'Batch', key: 'id' }, { label: 'Panel', key: 'panelType' }, { label: 'Watts', key: 'wattCapacity' },
        { label: 'Qty', key: 'quantity' }, { label: 'Status', key: 'status', render: (r) => `<span class="badge badge-dot ${r.status === 'Completed' ? 'badge-success' : 'badge-primary'}">${r.status}</span>` },
        { label: 'Cost', key: 'productionCost', render: (r) => Utils.formatCurrency(r.productionCost) },
      ];
    } else if (type === 'installations') {
      items = Store.getAll('installations');
      columns = [
        { label: 'ID', key: 'id' }, { label: 'Customer', key: 'customerName' }, { label: 'Panel', key: 'panelType' },
        { label: 'Qty', key: 'quantityInstalled' }, { label: 'Capacity', key: 'totalCapacity', render: (r) => `${r.totalCapacity} kW` },
        { label: 'Status', key: 'status', render: (r) => `<span class="badge ${r.status === 'Completed' ? 'badge-success' : 'badge-warning'}">${r.status}</span>` },
      ];
    } else {
      items = Store.getAll('sales');
      columns = [
        { label: 'ID', key: 'id' }, { label: 'Product', key: 'productName' }, { label: 'Customer', key: 'customerName' },
        { label: 'Qty', key: 'quantity' }, { label: 'Date', key: 'saleDate', render: (r) => Utils.formatDate(r.saleDate) },
        { label: 'Status', key: 'status', render: (r) => `<span class="badge ${r.status === 'Sold' ? 'badge-success' : 'badge-warning'}">${r.status}</span>` },
      ];
    }

    container.innerHTML = `<div class="card"><div class="card-header"><h3 class="card-title">${type.charAt(0).toUpperCase() + type.slice(1)} Report Data</h3></div>
      ${Components.renderTable({ columns, data: items, emptyMessage: 'No data' })}</div>`;
  },

  setupEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#report-generate')) this.renderDataTable();
      if (e.target.closest('#report-csv')) this.exportReport();
    });
    document.addEventListener('change', (e) => {
      if (e.target.id === 'report-type') this.renderDataTable();
    });
  },

  exportReport() {
    const type = document.getElementById('report-type')?.value || 'inventory';
    const items = Store.getAll(type === 'installations' ? 'installations' : type === 'sales' ? 'sales' : type);
    if (!items.length) return Components.toast('warning', 'No Data', 'Nothing to export.');
    const headers = Object.keys(items[0]).filter(k => k !== 'image' && k !== 'photos').map(k => ({ key: k, label: k }));
    Utils.exportCSV(items, headers, `${type}-report-${Utils.today()}.csv`);
    Components.toast('success', 'Exported', 'Report exported to CSV.');
  }
};
window.Reports = Reports;
