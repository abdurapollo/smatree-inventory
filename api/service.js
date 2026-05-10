/* ==========================================================================
   SMATREE SOLAR INVENTORY — API Service Layer
   Fetch-based HTTP service for backend communication
   ========================================================================== */

const ApiService = {
  /**
   * Generic fetch wrapper with error handling
   */
  async request(endpoint, options = {}) {
    const url = ApiConfig.getUrl(endpoint);
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    };

    // Add auth token if available
    const session = Store.getSession();
    if (session?.token) {
      config.headers['Authorization'] = `Bearer ${session.token}`;
    }

    // Add body for POST/PUT
    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      return { success: false, error: error.message };
    }
  },

  /* ── Convenience Methods ── */

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  async post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body });
  },

  async put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body });
  },

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  /* ── Entity-Specific Methods ── */
  /* These will be used when ApiConfig.useBackend is true */

  async getInventory() {
    if (!ApiConfig.useBackend) return { success: true, data: Store.getAll('inventory') };
    return this.get('inventory');
  },

  async addInventoryItem(item) {
    if (!ApiConfig.useBackend) { Store.add('inventory', item); return { success: true, data: item }; }
    return this.post('inventoryAdd', item);
  },

  async getProduction() {
    if (!ApiConfig.useBackend) return { success: true, data: Store.getAll('production') };
    return this.get('production');
  },

  async getSuppliers() {
    if (!ApiConfig.useBackend) return { success: true, data: Store.getAll('suppliers') };
    return this.get('suppliers');
  },

  async getDashboardStats() {
    if (!ApiConfig.useBackend) {
      return {
        success: true,
        data: {
          inventory: Store.getInventoryStats(),
          production: Store.getProductionStats(),
          finishedGoods: Store.getFinishedGoodsStats(),
          installations: Store.getInstallationStats(),
        }
      };
    }
    return this.get('dashboardStats');
  },

  async login(email, password) {
    if (!ApiConfig.useBackend) {
      const users = Store.getAll('users');
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) return { success: false, error: 'Invalid credentials' };
      return { success: true, data: user };
    }
    return this.post('login', { email, password });
  }
};

window.ApiService = ApiService;
