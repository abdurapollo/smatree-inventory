/* ==========================================================================
   SMATREE SOLAR INVENTORY — Dashboard Logic
   KPI cards, Chart.js charts, activity feed, low stock alerts
   ========================================================================== */

const Dashboard = {
  charts: {},

  init() {
    if (!App.initPage('dashboard', 'Dashboard', [
      { label: 'Home', href: '#' },
      { label: 'Dashboard' }
    ])) return;

    this.renderStats();
    this.renderCharts();
    this.renderActivity();
    this.renderAlerts();

    // Auto-refresh every 30 seconds
    this._interval = setInterval(() => {
      this.renderStats();
      this.renderAlerts();
    }, 30000);
  },

  renderStats() {
    const inv = Store.getInventoryStats();
    const prod = Store.getProductionStats();
    const fg = Store.getFinishedGoodsStats();
    const inst = Store.getInstallationStats();

    const cards = [
      { icon: '📦', iconClass: 'blue', label: 'Total Raw Materials', value: inv.totalMaterials, trend: null },
      { icon: '⚠️', iconClass: 'red', label: 'Low Stock Materials', value: inv.lowStockCount, trend: null },
      { icon: '🏭', iconClass: 'purple', label: 'Panels Manufactured', value: prod.totalPanels, trend: { value: '+12%', up: true } },
      { icon: '🔧', iconClass: 'green', label: 'Total Installed', value: inst.totalPanelsInstalled, trend: { value: '+8%', up: true } },
      { icon: '☀️', iconClass: 'amber', label: 'Ready to Sell', value: fg.readyToSell, trend: null },
      { icon: '📊', iconClass: 'blue', label: 'Monthly Production', value: prod.monthlyProduction, trend: { value: '+15%', up: true } },
      { icon: '💰', iconClass: 'green', label: 'Inventory Value', value: inv.totalValue, isCurrency: true, trend: null },
      { icon: '⚡', iconClass: 'amber', label: 'Installed Capacity', value: inst.totalCapacity, suffix: ' kW', trend: { value: '+5%', up: true } },
    ];

    const container = document.getElementById('stats-grid');
    if (!container) return;

    container.innerHTML = cards.map((card, i) => `
      <div class="stat-card animate-fadeInUp delay-${i % 6 + 1}" style="--card-accent: var(--color-${card.iconClass === 'blue' ? 'primary' : card.iconClass === 'green' ? 'emerald' : card.iconClass === 'amber' ? 'solar' : card.iconClass === 'red' ? 'red' : 'purple'}-400)">
        <div class="stat-icon ${card.iconClass}">${card.icon}</div>
        <div class="stat-value" data-counter="${card.isCurrency ? card.value : card.value}">
          ${card.isCurrency ? Utils.formatCurrency(card.value) : (card.suffix ? card.value + card.suffix : '0')}
        </div>
        <div class="stat-label">${card.label}</div>
        ${card.trend ? `<div class="stat-trend ${card.trend.up ? 'up' : 'down'}">${card.trend.up ? '↑' : '↓'} ${card.trend.value}</div>` : ''}
      </div>
    `).join('');

    // Animate counters
    container.querySelectorAll('[data-counter]').forEach(el => {
      const target = parseFloat(el.dataset.counter);
      if (!isNaN(target) && target > 0) {
        const card = el.closest('.stat-card');
        const isCurrency = card.querySelector('.stat-label').textContent.includes('Value');
        if (isCurrency) {
          Utils.animateCounter(el, target, 1200);
          setTimeout(() => { el.textContent = Utils.formatCurrency(target); }, 1300);
        } else {
          Utils.animateCounter(el, target, 1000);
        }
      }
    });
  },

  renderCharts() {
    this.renderProductionChart();
    this.renderMaterialChart();
    this.renderComparisonChart();
  },

  renderProductionChart() {
    const ctx = document.getElementById('production-chart');
    if (!ctx) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = [120, 180, 250, 320, 650, 150]; // Simulated monthly data

    this.charts.production = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Panels Produced',
          data: data,
          backgroundColor: [
            'rgba(14, 165, 233, 0.7)',
            'rgba(14, 165, 233, 0.7)',
            'rgba(14, 165, 233, 0.7)',
            'rgba(14, 165, 233, 0.7)',
            'rgba(14, 165, 233, 0.9)',
            'rgba(14, 165, 233, 0.5)',
          ],
          borderColor: 'rgba(14, 165, 233, 1)',
          borderWidth: 1,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#e2e8f0',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(51, 65, 85, 0.5)',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 12,
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { family: 'Inter' } },
          },
          y: {
            grid: { color: 'rgba(226, 232, 240, 0.3)' },
            ticks: { color: '#64748b', font: { family: 'Inter' } },
            beginAtZero: true,
          }
        }
      }
    });
  },

  renderMaterialChart() {
    const ctx = document.getElementById('material-chart');
    if (!ctx) return;

    const inventory = Store.getAll('inventory');
    const categories = {};
    inventory.forEach(m => {
      const cat = m.category || 'Other';
      categories[cat] = (categories[cat] || 0) + (parseFloat(m.costPerUnit) * parseFloat(m.quantity) || 0);
    });

    const labels = Object.keys(categories);
    const values = Object.values(categories);
    const colors = [
      '#0ea5e9', '#f59e0b', '#10b981', '#a855f7',
      '#ef4444', '#06b6d4', '#f97316', '#8b5cf6',
      '#ec4899', '#14b8a6'
    ];

    this.charts.material = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
          hoverOffset: 6,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#64748b',
              font: { family: 'Inter', size: 11 },
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8,
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            cornerRadius: 8,
            padding: 12,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${Utils.formatCurrency(ctx.parsed)}`
            }
          }
        }
      }
    });
  },

  renderComparisonChart() {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    this.charts.comparison = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Manufactured',
            data: [120, 180, 250, 320, 650, 150],
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#0ea5e9',
          },
          {
            label: 'Installed',
            data: [80, 120, 170, 200, 170, 40],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#10b981',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#64748b', font: { family: 'Inter' }, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            cornerRadius: 8,
            padding: 12,
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(226,232,240,0.3)' }, ticks: { color: '#64748b' }, beginAtZero: true },
        }
      }
    });
  },

  renderActivity() {
    const container = document.getElementById('activity-list');
    if (!container) return;

    const activities = Store.getActivities(10);
    if (!activities.length) {
      container.innerHTML = '<div class="empty-state"><p class="text-muted">No recent activity</p></div>';
      return;
    }

    container.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.action}"></div>
        <div class="activity-content">
          <div class="activity-text">${a.description}</div>
          <div class="activity-time">${a.user} • ${Utils.timeAgo(a.timestamp)}</div>
        </div>
      </div>
    `).join('');
  },

  renderAlerts() {
    const container = document.getElementById('alerts-list');
    if (!container) return;

    const inventory = Store.getAll('inventory');
    const lowStock = inventory.filter(m => {
      const status = Utils.getStockStatus(m.quantity, m.reorderLevel);
      return status.level === 'low' || status.level === 'critical';
    });

    if (!lowStock.length) {
      container.innerHTML = `
        <div class="empty-state" style="padding:2rem">
          <div class="empty-state-icon">✅</div>
          <div class="empty-state-title">All Stock Healthy</div>
          <p class="text-muted fs-sm">No low stock alerts at this time.</p>
        </div>`;
      return;
    }

    container.innerHTML = lowStock.map(m => {
      const status = Utils.getStockStatus(m.quantity, m.reorderLevel);
      return `
        <div class="alert-item ${status.level === 'low' ? '' : 'warning'}">
          <span style="font-size:1.25rem">${status.level === 'critical' ? '🔴' : '🟡'}</span>
          <div class="alert-item-info">
            <div class="alert-item-name">${m.name}</div>
            <div class="alert-item-qty">${m.quantity} ${m.unit} remaining (Reorder: ${m.reorderLevel})</div>
          </div>
          <a href="inventory.html" class="btn btn-sm btn-ghost">View</a>
        </div>`;
    }).join('');
  },

  destroy() {
    if (this._interval) clearInterval(this._interval);
    Object.values(this.charts).forEach(c => c.destroy());
  }
};

window.Dashboard = Dashboard;
