/* ==========================================================================
   SMATREE SOLAR INVENTORY — Utility Functions
   ID generators, formatters, debounce, CSV export, search/filter helpers
   ========================================================================== */

const Utils = {
  /**
   * Generate unique ID with prefix
   */
  generateId(prefix = 'ID') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  },

  /**
   * Format currency (INR)
   */
  formatCurrency(amount, currency = '₹') {
    const num = parseFloat(amount) || 0;
    return `${currency}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },

  /**
   * Format number with commas
   */
  formatNumber(num) {
    return (parseFloat(num) || 0).toLocaleString('en-IN');
  },

  /**
   * Format date
   */
  formatDate(dateStr, format = 'short') {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date)) return '—';
    const options = format === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
  },

  /**
   * Format date to input value (YYYY-MM-DD)
   */
  formatDateInput(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  },

  /**
   * Get relative time string
   */
  timeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    const intervals = [
      { label: 'year', seconds: 31536000 },
      { label: 'month', seconds: 2592000 },
      { label: 'week', seconds: 604800 },
      { label: 'day', seconds: 86400 },
      { label: 'hour', seconds: 3600 },
      { label: 'minute', seconds: 60 },
    ];
    for (const interval of intervals) {
      const count = Math.floor(seconds / interval.seconds);
      if (count >= 1) return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  },

  /**
   * Debounce function
   */
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Throttle function
   */
  throttle(fn, limit = 250) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Export data to CSV
   */
  exportCSV(data, headers, filename = 'export.csv') {
    if (!data || !data.length) return;
    const headerRow = headers.map(h => h.label).join(',');
    const rows = data.map(item =>
      headers.map(h => {
        let val = item[h.key] ?? '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    );
    const csv = [headerRow, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  /**
   * Search filter — checks if any field contains query
   */
  searchFilter(items, query, fields) {
    if (!query) return items;
    const q = query.toLowerCase().trim();
    return items.filter(item =>
      fields.some(field => {
        const val = item[field];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  },

  /**
   * Sort array of objects
   */
  sortBy(items, key, direction = 'asc') {
    return [...items].sort((a, b) => {
      let valA = a[key], valB = b[key];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  /**
   * Paginate array
   */
  paginate(items, page = 1, perPage = 10) {
    const totalPages = Math.ceil(items.length / perPage);
    const start = (page - 1) * perPage;
    const paginatedItems = items.slice(start, start + perPage);
    return {
      items: paginatedItems,
      page,
      perPage,
      total: items.length,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  },

  /**
   * Animate counter from 0 to target
   */
  animateCounter(element, target, duration = 1000) {
    const start = 0;
    const startTime = performance.now();
    const isFloat = target % 1 !== 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = start + (target - start) * eased;

      if (isFloat) {
        element.textContent = current.toFixed(2);
      } else {
        element.textContent = Math.floor(current).toLocaleString('en-IN');
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  },

  /**
   * Get stock status based on quantity and reorder level
   */
  getStockStatus(quantity, reorderLevel) {
    if (quantity <= 0) return { label: 'Out of Stock', class: 'badge-danger', level: 'critical' };
    if (quantity <= reorderLevel) return { label: 'Low Stock', class: 'badge-danger', level: 'low' };
    if (quantity <= reorderLevel * 2) return { label: 'Medium', class: 'badge-warning', level: 'medium' };
    return { label: 'In Stock', class: 'badge-success', level: 'good' };
  },

  /**
   * Deep clone object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Get today's date string
   */
  today() {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * Simple template rendering
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Download JSON backup
   */
  downloadBackup(data, filename = 'smatree-backup.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  /**
   * Read file as data URL (for image uploads)
   */
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * Get initials from name
   */
  getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
  }
};

// Make available globally
window.Utils = Utils;
