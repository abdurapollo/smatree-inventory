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
  animateCounter(element, target, duration = 1000, options = {}) {
    const { prefix = '', suffix = '', isCurrency = false } = options;
    const start = 0;
    const startTime = performance.now();
    const isFloat = target % 1 !== 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = start + (target - start) * eased;

      let valStr = '';
      if (isCurrency) {
        valStr = (prefix || '₹') + Math.floor(current).toLocaleString('en-IN') + suffix;
      } else if (isFloat) {
        valStr = prefix + current.toFixed(1) + suffix;
      } else {
        valStr = prefix + Math.floor(current).toLocaleString('en-IN') + suffix;
      }

      element.textContent = valStr;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else if (isCurrency) {
        element.textContent = Utils.formatCurrency(target, prefix || '₹');
      }
    }
    requestAnimationFrame(update);
  },

  /**
   * Get stock status based on quantity and reorder level
   */
  getStockStatus(quantity, reorderLevel) {
    const q = parseFloat(quantity);
    const numQ = isNaN(q) ? 0 : q;
    const r = parseFloat(reorderLevel);
    const numR = isNaN(r) ? 50 : r;
    if (numQ <= 0) return { label: 'Out of Stock', class: 'badge-danger', level: 'critical' };
    if (numQ <= numR) return { label: 'Low Stock', class: 'badge-danger', level: 'low' };
    if (numQ <= numR * 2) return { label: 'Medium', class: 'badge-warning', level: 'medium' };
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
  },

  /**
   * Sanitize string: remove HTML tags, script elements, and dangerous protocols
   */
  sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .replace(/javascript:/gi, '') // Strip javascript: URIs
      .replace(/on\w+\s*=/gi, '') // Strip event handlers like onload=
      .trim();
  },

  /**
   * Industry-Standard Form Validator Engine
   */
  Validator: {
    // Regular Expression Patterns
    patterns: {
      name: /^[\p{L}\s.'-]+$/u,
      company: /^[\p{L}\p{N}\s.,'\-&/()#]+$/u,
      phone: /^\+?[0-9\s\-()]{7,25}$/,
      email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
      gstin: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    },

    /**
     * Check if string is empty
     */
    isEmpty(val) {
      return val === null || val === undefined || String(val).trim() === '';
    },

    /**
     * Validate Contact Person Name
     * Min 2, Max 100, letters/spaces/dots/hyphens/apostrophes only
     */
    validateName(val, fieldName = 'Contact Name') {
      const trimmed = String(val || '').trim();
      if (!trimmed) {
        return `${fieldName} is required.`;
      }
      if (trimmed.length < 2) {
        return `${fieldName} must be at least 2 characters.`;
      }
      if (trimmed.length > 100) {
        return `${fieldName} cannot exceed 100 characters.`;
      }
      if (!this.patterns.name.test(trimmed)) {
        return `${fieldName} can only contain letters, spaces, hyphens, and dots.`;
      }
      return null;
    },

    /**
     * Validate Company / Business Name
     * Min 2, Max 150, alphanumeric and business punctuation
     */
    validateCompany(val, fieldName = 'Company Name') {
      const trimmed = String(val || '').trim();
      if (!trimmed) {
        return `${fieldName} is required.`;
      }
      if (trimmed.length < 2) {
        return `${fieldName} must be at least 2 characters.`;
      }
      if (trimmed.length > 150) {
        return `${fieldName} cannot exceed 150 characters.`;
      }
      if (!this.patterns.company.test(trimmed)) {
        return `${fieldName} contains invalid characters.`;
      }
      return null;
    },

    /**
     * Validate Phone Number (ITU E.164: 10-15 digits)
     */
    validatePhone(val, fieldName = 'Phone Number') {
      const trimmed = String(val || '').trim();
      if (!trimmed) {
        return `${fieldName} is required.`;
      }
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        return `${fieldName} must contain 10 to 15 digits (e.g. +91 98765 43210).`;
      }
      if (!this.patterns.phone.test(trimmed)) {
        return `Please enter a valid ${fieldName.toLowerCase()} format.`;
      }
      return null;
    },

    /**
     * Validate Email Address (RFC 5322 compliance)
     */
    validateEmail(val, fieldName = 'Email') {
      const trimmed = String(val || '').trim();
      if (!trimmed) {
        return `${fieldName} is required.`;
      }
      if (trimmed.length > 150) {
        return `${fieldName} cannot exceed 150 characters.`;
      }
      if (!this.patterns.email.test(trimmed)) {
        return `Please enter a valid email address (e.g. contact@company.com).`;
      }
      // Check top-level domain extension length
      const parts = trimmed.split('@');
      if (parts.length === 2) {
        const domainParts = parts[1].split('.');
        const tld = domainParts[domainParts.length - 1];
        if (!tld || tld.length < 2) {
          return `Please enter an email address with a valid domain extension.`;
        }
      }
      return null;
    },

    /**
     * Validate GST Number (GSTIN)
     * Optional if empty, but if entered must match 15-character statutory format
     */
    validateGSTIN(val, fieldName = 'GST Number') {
      const trimmed = String(val || '').trim().toUpperCase();
      if (!trimmed) return null; // Optional
      if (trimmed.length !== 15) {
        return `${fieldName} must be exactly 15 characters (e.g. 27AADCS1234F1ZP).`;
      }
      if (!this.patterns.gstin.test(trimmed)) {
        return `Invalid GSTIN format. Follows 2-digit state code + 10-char PAN + 3-char registration pattern.`;
      }
      return null;
    },

    /**
     * Validate Free Text / Address / Notes
     */
    validateText(val, options = {}) {
      const { min = 0, max = 500, required = false, fieldName = 'Field' } = options;
      const trimmed = String(val || '').trim();
      if (required && !trimmed) {
        return `${fieldName} is required.`;
      }
      if (trimmed && trimmed.length < min) {
        return `${fieldName} must be at least ${min} characters if provided.`;
      }
      if (trimmed && trimmed.length > max) {
        return `${fieldName} cannot exceed ${max} characters (currently ${trimmed.length}).`;
      }
      if (/<[^>]*script/i.test(trimmed) || /javascript:/i.test(trimmed)) {
        return `${fieldName} contains disallowed script or HTML elements.`;
      }
      return null;
    },

    /**
     * UI: Display inline field error
     */
    setError(input, message) {
      if (!input) return;
      input.classList.remove('is-valid');
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');

      const group = input.closest('.form-group') || input.parentElement;
      if (!group) return;

      const errorId = (input.id ? `${input.id}-error` : '') || 'form-field-error';
      input.setAttribute('aria-describedby', errorId);

      let errEl = group.querySelector('.form-error');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.className = 'form-error';
        errEl.id = errorId;
        // Insert right after input or group's direct child
        const insertAfter = input.nextElementSibling?.classList.contains('input-group-addon') 
          ? input.nextElementSibling 
          : input;
        if (insertAfter && insertAfter.nextSibling) {
          group.insertBefore(errEl, insertAfter.nextSibling);
        } else {
          group.appendChild(errEl);
        }
      }
      errEl.style.display = 'flex';
      errEl.innerHTML = `<span class="form-error-icon">⚠️</span><span>${Utils.escapeHtml(message)}</span>`;
    },

    /**
     * UI: Mark field as valid and clear errors
     */
    setValid(input) {
      if (!input) return;
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      input.setAttribute('aria-invalid', 'false');

      const group = input.closest('.form-group') || input.parentElement;
      if (group) {
        const errEl = group.querySelector('.form-error');
        if (errEl) errEl.remove();
      }
    },

    /**
     * UI: Reset a field's validation state
     */
    clearField(input) {
      if (!input) return;
      input.classList.remove('is-invalid', 'is-valid');
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');

      const group = input.closest('.form-group') || input.parentElement;
      if (group) {
        const errEl = group.querySelector('.form-error');
        if (errEl) errEl.remove();
      }
    },

    /**
     * UI: Clear all errors across an entire form
     */
    clearForm(form) {
      if (!form) return;
      form.querySelectorAll('.is-invalid, .is-valid').forEach(el => {
        el.classList.remove('is-invalid', 'is-valid');
        el.removeAttribute('aria-invalid');
        el.removeAttribute('aria-describedby');
      });
      form.querySelectorAll('.form-error').forEach(el => el.remove());
    }
  }
};

// Make available globally
window.Utils = Utils;
window.Validator = Utils.Validator;
