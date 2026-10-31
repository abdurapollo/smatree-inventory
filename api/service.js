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

  async getProduction(params = {}) {
    if (!ApiConfig.useBackend) return { success: true, data: Store.getAll('production') };
    const query = new URLSearchParams(params).toString();
    return this.get('production' + (query ? '?' + query : ''));
  },

  async addProduction(batchData) {
    if (!ApiConfig.useBackend) { Store.add('production', batchData); return { success: true, data: batchData }; }
    return this.post('productionAdd', batchData);
  },

  async updateProduction(batchData) {
    if (!ApiConfig.useBackend) { Store.update('production', batchData.id, batchData); return { success: true, data: batchData }; }
    return this.post('productionEdit', batchData);
  },

  async deleteProduction(id) {
    if (!ApiConfig.useBackend) { Store.delete('production', id); return { success: true }; }
    return this.post('productionDel', { id });
  },

  async getInstallations(params = {}) {
    if (!ApiConfig.useBackend) return { success: true, data: Store.getAll('installations') };
    const query = new URLSearchParams(params).toString();
    return this.get('installations' + (query ? '?' + query : ''));
  },

  async addInstallation(instData) {
    if (!ApiConfig.useBackend) { Store.add('installations', instData); return { success: true, data: instData }; }
    return this.post('installationsAdd', instData);
  },

  async updateInstallation(instData) {
    if (!ApiConfig.useBackend) { Store.update('installations', instData.id, instData); return { success: true, data: instData }; }
    return this.post('installationsEdit', instData);
  },

  async deleteInstallation(id) {
    if (!ApiConfig.useBackend) { Store.delete('installations', id); return { success: true }; }
    return this.post('installationsDel', { id });
  },

  async getReports(type = 'inventory', from = '', to = '') {
    if (!ApiConfig.useBackend) return { success: true, data: [] };
    const query = `?type=${encodeURIComponent(type)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    return this.get('reports' + query);
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
  },

  async getUsers() {
    if (!ApiConfig.useBackend) return { success: true, data: Store.getAll('users') };
    return this.get('users');
  },

  async createUser(userData) {
    if (!ApiConfig.useBackend) {
      const nextId = 'USR-' + String(Store.getAll('users').length + 1).padStart(3, '0');
      const newUser = {
        id: nextId,
        user_code: nextId,
        createdAt: new Date().toISOString(),
        status: 'active',
        ...userData
      };
      Store.add('users', newUser);
      return { success: true, data: newUser };
    }
    const resp = await this.post('usersCreate', userData);
    if (resp?.success && resp.data?.data) {
      Store.add('users', resp.data.data);
    }
    return resp;
  },

  async getProducts(filter = 'active') {
    if (!ApiConfig.useBackend) return { success: true, data: Store.getAll('finishedGoods') };
    const query = filter ? `?filter=${encodeURIComponent(filter)}` : '';
    return this.get('products' + query);
  },

  async addProduct(productData) {
    if (!ApiConfig.useBackend) {
      Store.add('finishedGoods', productData);
      return { success: true, data: productData };
    }
    return this.post('productsAdd', productData);
  },

  async updateProduct(productData) {
    if (!ApiConfig.useBackend) {
      Store.update('finishedGoods', productData.id, productData);
      return { success: true, data: productData };
    }
    return this.post('productsEdit', productData);
  },

  async deleteProduct(id) {
    if (!ApiConfig.useBackend) {
      Store.delete('finishedGoods', id);
      return { success: true };
    }
    return this.post('productsDel', { id });
  },

  async restoreProduct(id) {
    if (!ApiConfig.useBackend) {
      return { success: true };
    }
    return this.post('productsRestore', { id });
  },

  async getSales() {
    if (!ApiConfig.useBackend) return { success: true, data: Store.getAll('sales') };
    return this.get('sales');
  },

  async addSale(saleData) {
    if (!ApiConfig.useBackend) {
      Store.add('sales', saleData);
      return { success: true, data: saleData };
    }
    return this.post('salesAdd', saleData);
  },

  async updateSaleStatus(id, status) {
    if (!ApiConfig.useBackend) {
      Store.update('sales', id, { status });
      return { success: true };
    }
    return this.post('salesEdit', { id, status });
  },

  async deleteSale(id) {
    if (!ApiConfig.useBackend) {
      Store.delete('sales', id);
      return { success: true };
    }
    return this.post('salesDel', { id });
  }
};

window.ApiService = ApiService;
