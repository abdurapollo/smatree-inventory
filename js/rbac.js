/* ==========================================================================
   SMATREE SOLAR INVENTORY — Role-Based Access Control (RBAC) Module
   Centralized authorization, role definitions, page guards & action policies
   ========================================================================== */

const RBAC = {

  /* ══════════════════════════════════════════════════════════════════════
     ROLE DEFINITIONS & POLICIES
     ══════════════════════════════════════════════════════════════════════ */

  roles: {
    'Admin': {
      id: 'Admin',
      name: 'Super Admin',
      shortName: 'Super Admin',
      color: '#3b82f6',
      badgeClass: 'badge-primary',
      badgeStyle: 'background: rgba(59, 130, 246, 0.12); color: #2563eb; border: 1px solid rgba(59, 130, 246, 0.3);',
      darkBadgeStyle: 'background: rgba(59, 130, 246, 0.22); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4);',
      icon: 'shield',
      description: 'Master unrestricted administrative access across all factory manufacturing, material supply chains, customer sales, and system governance.',
      scopeSummary: 'Full Master Access (All 8 Modules & Operations)',
      accessiblePages: [
        'dashboard',
        'inventory',
        'production',
        'finished-goods',
        'installations',
        'sales',
        'suppliers',
        'reports'
      ],
      defaultLanding: 'dashboard.html',
      canManageUsers: true,
      canBackup: true,
      permissions: {
        'dashboard.view': true,
        'inventory.view': true,
        'inventory.create': true,
        'inventory.edit': true,
        'inventory.delete': true,
        'inventory.export': true,
        'inventory.adjust': true,
        'production.view': true,
        'production.create': true,
        'production.edit': true,
        'production.delete': true,
        'production.export': true,
        'finishedGoods.view': true,
        'finishedGoods.create': true,
        'finishedGoods.edit': true,
        'finishedGoods.delete': true,
        'finishedGoods.export': true,
        'installations.view': true,
        'installations.create': true,
        'installations.edit': true,
        'installations.delete': true,
        'installations.export': true,
        'sales.view': true,
        'sales.create': true,
        'sales.edit': true,
        'sales.delete': true,
        'sales.export': true,
        'suppliers.view': true,
        'suppliers.create': true,
        'suppliers.edit': true,
        'suppliers.delete': true,
        'suppliers.export': true,
        'reports.view': true,
        'reports.export': true,
        'reports.all': true,
        'rbac.manage': true
      }
    },

    'Inventory Manager': {
      id: 'Inventory Manager',
      name: 'Inventory Lead',
      shortName: 'Inventory Lead',
      color: '#10b981',
      badgeClass: 'badge-success',
      badgeStyle: 'background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.3);',
      darkBadgeStyle: 'background: rgba(16, 185, 129, 0.22); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4);',
      icon: 'package',
      description: 'End-to-end governance of solar cell raw materials, vendor suppliers, stock reorders, catalog pricing, and finished goods warehouse capacity.',
      scopeSummary: 'Raw Materials & Suppliers (Full) • Finished Goods (Read-Only)',
      accessiblePages: [
        'dashboard',
        'inventory',
        'finished-goods',
        'suppliers',
        'reports'
      ],
      defaultLanding: 'inventory.html',
      canManageUsers: false,
      canBackup: false,
      permissions: {
        'dashboard.view': true,
        'inventory.view': true,
        'inventory.create': true,
        'inventory.edit': true,
        'inventory.delete': true,
        'inventory.export': true,
        'inventory.adjust': true,
        'suppliers.view': true,
        'suppliers.create': true,
        'suppliers.edit': true,
        'suppliers.delete': true,
        'suppliers.export': true,
        'finishedGoods.view': true,
        'finishedGoods.readOnly': true, // Read-only warehouse stock check
        'reports.view': true,
        'reports.export': true,
        'reports.inventory': true
      }
    },

    'Production Manager': {
      id: 'Production Manager',
      name: 'Plant Manager',
      shortName: 'Plant Manager',
      color: '#f59e0b',
      badgeClass: 'badge-warning',
      badgeStyle: 'background: rgba(245, 158, 11, 0.12); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3);',
      darkBadgeStyle: 'background: rgba(245, 158, 11, 0.22); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.4);',
      icon: 'factory',
      description: 'Oversight of automated solar fabrication lines, cell stringing & lamination batches, finished panel testing, and rooftop solar field engineering.',
      scopeSummary: 'Manufacturing & Finished Goods (Full) • Raw Materials (Read-Only)',
      accessiblePages: [
        'dashboard',
        'inventory',
        'production',
        'finished-goods',
        'installations',
        'reports'
      ],
      defaultLanding: 'production.html',
      canManageUsers: false,
      canBackup: false,
      permissions: {
        'dashboard.view': true,
        'production.view': true,
        'production.create': true,
        'production.edit': true,
        'production.delete': true,
        'production.export': true,
        'finishedGoods.view': true,
        'finishedGoods.create': true,
        'finishedGoods.edit': true,
        'finishedGoods.delete': true,
        'finishedGoods.export': true,
        'installations.view': true,
        'installations.create': true,
        'installations.edit': true,
        'installations.delete': true,
        'installations.export': true,
        'inventory.view': true,
        'inventory.readOnly': true, // Read-only view for BOM & material availability check
        'reports.view': true,
        'reports.export': true,
        'reports.production': true
      }
    },

    'Sales Manager': {
      id: 'Sales Manager',
      name: 'Sales Director',
      shortName: 'Sales Director',
      color: '#a855f7',
      badgeClass: 'badge-purple',
      badgeStyle: 'background: rgba(168, 85, 247, 0.12); color: #9333ea; border: 1px solid rgba(168, 85, 247, 0.3);',
      darkBadgeStyle: 'background: rgba(168, 85, 247, 0.22); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.4);',
      icon: 'sales',
      description: 'Commercial client orders, customer panel reservations, rooftop solar installations scheduling, and revenue performance analytics.',
      scopeSummary: 'Sales & Orders (Full) • Installations (Full) • Finished Goods (Stock Check)',
      accessiblePages: [
        'dashboard',
        'finished-goods',
        'installations',
        'sales',
        'reports'
      ],
      defaultLanding: 'sales.html',
      canManageUsers: false,
      canBackup: false,
      permissions: {
        'dashboard.view': true,
        'sales.view': true,
        'sales.create': true,
        'sales.edit': true,
        'sales.delete': true,
        'sales.export': true,
        'installations.view': true,
        'installations.create': true,
        'installations.edit': true,
        'installations.delete': true,
        'installations.export': true,
        'finishedGoods.view': true,
        'finishedGoods.readOnly': true, // View ready-to-sell panel stock for client quotes
        'reports.view': true,
        'reports.export': true,
        'reports.sales': true
      }
    }
  },

  /* ══════════════════════════════════════════════════════════════════════
     DEMO HIGHLIGHTED USERS DIRECTORY
     ══════════════════════════════════════════════════════════════════════ */

  demoUsers: [
    {
      id: 'USR-001',
      name: 'Rajesh Kumar',
      displayName: 'Rajesh K.',
      email: 'admin@smatree.com',
      password: 'admin123',
      role: 'Admin',
      roleLabel: 'Super Admin',
      department: 'Executive Operations',
      avatarColor: 'linear-gradient(135deg, #2563eb, #3b82f6)'
    },
    {
      id: 'USR-002',
      name: 'Priya Sharma',
      displayName: 'Priya S.',
      email: 'inventory@smatree.com',
      password: 'inv123',
      role: 'Inventory Manager',
      roleLabel: 'Inventory Lead',
      department: 'Supply Chain & Raw Materials',
      avatarColor: 'linear-gradient(135deg, #059669, #10b981)'
    },
    {
      id: 'USR-003',
      name: 'Amit Patel',
      displayName: 'Amit P.',
      email: 'production@smatree.com',
      password: 'prod123',
      role: 'Production Manager',
      roleLabel: 'Plant Manager',
      department: 'Manufacturing & Engineering',
      avatarColor: 'linear-gradient(135deg, #d97706, #f59e0b)'
    },
    {
      id: 'USR-004',
      name: 'Sneha Reddy',
      displayName: 'Sneha R.',
      email: 'sales@smatree.com',
      password: 'sales123',
      role: 'Sales Manager',
      roleLabel: 'Sales Director',
      department: 'Commercial Sales & Projects',
      avatarColor: 'linear-gradient(135deg, #9333ea, #a855f7)'
    }
  ],

  /**
   * Retrieves all available users (built-in seed users + dynamically created custom users)
   */
  getAvailableUsers() {
    const list = [...this.demoUsers];
    if (typeof Store !== 'undefined') {
      const storeUsers = Store.getAll('users') || [];
      storeUsers.forEach(su => {
        const email = su.email ? su.email.toLowerCase() : '';
        if (email && !list.some(u => u.email && u.email.toLowerCase() === email)) {
          const roleConfig = this.getRoleConfig(su.role);
          list.push({
            id: su.user_code || su.id,
            name: su.name,
            displayName: su.displayName || su.display_name || su.name,
            email: su.email,
            password: su.password || '******',
            role: su.role,
            roleLabel: su.roleLabel || su.role_label || roleConfig.name,
            department: su.department || 'Solar Operations',
            avatarColor: roleConfig.color ? `linear-gradient(135deg, ${roleConfig.color}, #3b82f6)` : 'linear-gradient(135deg, #4b5563, #6b7280)'
          });
        }
      });
    }
    return list;
  },

  /* ══════════════════════════════════════════════════════════════════════
     CORE RBAC METHODS
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Returns current active user object from session store
   */
  getCurrentUser() {
    if (typeof Store === 'undefined') return null;
    return Store.getCurrentUser() || null;
  },

  /**
   * Returns normalized role identifier (defaults to 'Admin' if unauthenticated)
   */
  getCurrentRole() {
    const user = this.getCurrentUser();
    if (!user || !user.role) return 'Admin';
    if (this.roles[user.role]) return user.role;
    // Fallback normalization
    const normalized = Object.keys(this.roles).find(k => k.toLowerCase() === user.role.toLowerCase());
    return normalized || 'Admin';
  },

  /**
   * Returns role metadata configuration
   */
  getRoleConfig(role = null) {
    const targetRole = role || this.getCurrentRole();
    return this.roles[targetRole] || this.roles['Admin'];
  },

  /**
   * Checks if a role is authorized to access a given page/module
   */
  canAccessPage(pageName, role = null) {
    if (!pageName) return true;
    const cleanPage = pageName.replace('.html', '').toLowerCase();
    const config = this.getRoleConfig(role);
    if (!config) return false;
    return config.accessiblePages.includes(cleanPage);
  },

  /**
   * Checks if current role holds a specific granular action permission
   */
  hasPermission(permission, role = null) {
    const config = this.getRoleConfig(role);
    if (!config) return false;
    // Super Admin has all permissions
    if (config.id === 'Admin') return true;
    return !!config.permissions[permission];
  },

  /**
   * Alias for quick check
   */
  can(permission) {
    return this.hasPermission(permission);
  },

  /**
   * Checks if current role has read-only access to a module
   */
  isReadOnly(module, role = null) {
    const config = this.getRoleConfig(role);
    if (!config) return false;
    if (config.id === 'Admin') return false;
    return !!config.permissions[`${module}.readOnly`];
  },

  /**
   * Formats a sleek role badge HTML element
   */
  renderRoleBadge(role = null, size = 'md') {
    const config = this.getRoleConfig(role);
    const theme = (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'light';
    const style = theme === 'dark' ? config.darkBadgeStyle : config.badgeStyle;
    const padding = size === 'sm' ? '2px 8px' : '4px 10px';
    const fontSize = size === 'sm' ? '11px' : '12px';

    return `<span class="rbac-role-pill" style="display:inline-flex;align-items:center;gap:5px;padding:${padding};border-radius:999px;font-size:${fontSize};font-weight:600;letter-spacing:0.01em;${style}">
      <span style="width:6px;height:6px;border-radius:50%;background:${config.color};"></span>
      <span>${config.name}</span>
    </span>`;
  },

  /* ══════════════════════════════════════════════════════════════════════
     PAGE ROUTE GUARD ENFORCER
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Called during App.initPage().
   * If the user is unauthorized for this page, it renders a high-visibility
   * Access Denied UI and returns false to halt any confidential data rendering.
   */
  enforcePageAccess(pageName, pageTitle = '') {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return false;
    }

    const role = this.getCurrentRole();
    const isAllowed = this.canAccessPage(pageName, role);

    if (isAllowed) {
      return true;
    }

    // Access Denied: Render professional Restricted Access UI
    console.warn(`[RBAC] Access Denied: Role "${role}" cannot access "${pageName}".`);
    this.renderAccessDenied(pageName, pageTitle);
    return false;
  },

  /**
   * Renders the enterprise 403 Access Denied experience
   */
  renderAccessDenied(pageName, pageTitle) {
    const user = this.getCurrentUser();
    const currentRoleConfig = this.getRoleConfig();
    const cleanPage = pageName.replace('.html', '');

    // Determine which roles are authorized for this page
    const authorizedRoles = Object.values(this.roles)
      .filter(r => r.accessiblePages.includes(cleanPage))
      .map(r => r.name);

    const friendlyPageNames = {
      'inventory': 'Raw Materials & Procurement',
      'production': 'Manufacturing & Production Batches',
      'finished-goods': 'Finished Goods Catalog',
      'installations': 'Rooftop Solar Installations',
      'sales': 'Sales Orders & Commercial Dispatch',
      'suppliers': 'Solar Component Suppliers',
      'reports': 'Analytics & Reports'
    };

    const displayTitle = friendlyPageNames[cleanPage] || pageTitle || cleanPage;

    // Build the Access Denied DOM
    const pageContent = document.querySelector('.page-content');
    if (!pageContent) return;

    // Clear existing content in page-content
    pageContent.innerHTML = `
      <div class="rbac-access-denied-wrap" style="max-width:760px;margin:2.5rem auto;padding:2.5rem;background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-2xl);box-shadow:var(--shadow-xl);backdrop-filter:blur(16px);text-align:center;">
        
        <!-- Shield Lock Icon -->
        <div style="width:72px;height:72px;border-radius:20px;background:rgba(239, 68, 68, 0.12);color:var(--color-red-500);display:inline-flex;align-items:center;justify-content:center;margin-bottom:1.5rem;border:1px solid rgba(239, 68, 68, 0.25);box-shadow:0 8px 24px rgba(239, 68, 68, 0.15);">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <div style="display:inline-block;padding:4px 12px;border-radius:999px;background:rgba(239,68,68,0.1);color:var(--color-red-500);font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:0.75rem;">
          403 Access Restricted • Role-Based Policy
        </div>

        <h2 style="font-size:1.75rem;font-weight:800;color:var(--text-primary);margin-bottom:0.75rem;line-height:1.2;">
          Access to ${displayTitle} is Restricted
        </h2>

        <p style="font-size:0.9375rem;color:var(--text-secondary);max-width:560px;margin:0 auto 1.75rem;line-height:1.6;">
          You are currently signed in as <strong style="color:var(--text-primary)">${user.name}</strong> (${currentRoleConfig.name}). Your assigned enterprise role does not have authorization to access this workspace module.
        </p>

        <!-- Current User Role vs Required Roles Pill Container -->
        <div style="display:flex;align-items:center;justify-content:center;gap:1.5rem;flex-wrap:wrap;background:var(--bg-badge);padding:1rem 1.5rem;border-radius:var(--radius-xl);border:1px solid var(--border-light);margin-bottom:2rem;">
          <div style="text-align:left;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:4px;">Your Active Role</div>
            ${this.renderRoleBadge(currentRoleConfig.id)}
          </div>
          <div style="width:1px;height:32px;background:var(--border-color);" class="hide-mobile"></div>
          <div style="text-align:left;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:4px;">Authorized Roles for this Workspace</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${authorizedRoles.map(r => `<span class="badge badge-secondary" style="font-size:11px;font-weight:600;">${r}</span>`).join('')}
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;align-items:center;justify-content:center;gap:1rem;flex-wrap:wrap;margin-bottom:2.5rem;">
          <a href="${currentRoleConfig.defaultLanding}" class="btn btn-primary" style="padding:0.75rem 1.5rem;">
            <span>← Return to ${currentRoleConfig.name} Workspace</span>
          </a>
          <button type="button" class="btn btn-secondary" id="rbac-matrix-btn" style="padding:0.75rem 1.5rem;">
            <span>View Full Permissions Matrix</span>
          </button>
        </div>

        <!-- 1-Click Fast Switch to Authorized Account -->
        <div style="border-top:1px solid var(--border-light);padding-top:1.75rem;text-align:left;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">
            <span style="font-size:13px;font-weight:700;color:var(--text-primary);display:inline-flex;align-items:center;gap:6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              <span>1-Click Fast Demo Switch: Sign in as an Authorized User</span>
            </span>
            <span style="font-size:11px;color:var(--text-muted);">Instant Session Switcher</span>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:0.75rem;">
            ${this.getAvailableUsers().map(du => {
              const isDuAllowed = this.canAccessPage(cleanPage, du.role);
              const isCurrent = du.email.toLowerCase() === user.email.toLowerCase();
              return `
                <button type="button" class="demo-switch-card-btn" data-switch-email="${du.email}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-card);border:1px solid ${isDuAllowed ? 'var(--color-primary-300)' : 'var(--border-light)'};border-radius:var(--radius-lg);cursor:pointer;text-align:left;transition:all var(--transition-fast);position:relative;opacity:${isDuAllowed ? '1' : '0.6'};">
                  <div style="width:34px;height:34px;border-radius:8px;background:${du.avatarColor};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">
                    ${Utils.getInitials(du.displayName)}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:4px;">
                      <span>${du.displayName}</span>
                      ${isCurrent ? '<span style="font-size:10px;color:var(--color-primary-500);">(You)</span>' : ''}
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);">${du.roleLabel}</div>
                  </div>
                  ${isDuAllowed ? '<span class="badge badge-success" style="font-size:10px;padding:2px 6px;">Permitted</span>' : '<span style="font-size:10px;color:var(--text-muted);">Locked</span>'}
                </button>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    // Hook up switch demo user buttons on this screen
    document.querySelectorAll('[data-switch-email]').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.dataset.switchEmail;
        this.switchDemoUser(email, cleanPage + '.html');
      });
    });

    const matrixBtn = document.getElementById('rbac-matrix-btn');
    if (matrixBtn) {
      matrixBtn.addEventListener('click', () => this.showMatrixModal());
    }
  },

  /* ══════════════════════════════════════════════════════════════════════
     FAST 1-CLICK DEMO USER SWITCHER
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Switches user session immediately to one of the 4 highlighted roles
   */
  switchDemoUser(email, targetPage = null) {
    const available = this.getAvailableUsers();
    const demo = available.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!demo) {
      if (typeof Components !== 'undefined') {
        Components.toast('error', 'Switch Error', 'User account not found.');
      }
      return;
    }

    const sessionUser = {
      id: demo.id,
      name: demo.name,
      display_name: demo.displayName,
      email: demo.email,
      role: demo.role,
      role_label: demo.roleLabel,
      department: demo.department,
      token: 'demo-token-' + Date.now()
    };

    Store.setSession(sessionUser);

    if (typeof Components !== 'undefined') {
      Components.toast('success', 'Role Switched', `Logged in as ${demo.displayName} (${demo.roleLabel})`);
    }

    // Determine target destination
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    const destination = targetPage || currentPage;

    // Check if new user is allowed on destination
    const cleanDestination = destination.replace('.html', '');
    const isAllowed = this.canAccessPage(cleanDestination, demo.role);

    setTimeout(() => {
      if (isAllowed) {
        window.location.href = destination;
      } else {
        const roleConf = this.getRoleConfig(demo.role);
        window.location.href = roleConf.defaultLanding;
      }
    }, 400);
  },

  /* ══════════════════════════════════════════════════════════════════════
     INTERACTIVE PERMISSIONS MATRIX MODAL
     ══════════════════════════════════════════════════════════════════════ */

  showMatrixModal() {
    if (typeof Components === 'undefined') return;

    const modules = [
      { id: 'dashboard', name: 'Dashboard', desc: 'Operational Telemetry & KPIs' },
      { id: 'inventory', name: 'Raw Materials', desc: 'Solar Cell Inventory & Procurement' },
      { id: 'production', name: 'Manufacturing', desc: 'Fabrication Batches & Assembly Lines' },
      { id: 'finished-goods', name: 'Finished Goods', desc: 'Assembled Solar Panel Stock Catalog' },
      { id: 'installations', name: 'Installations', desc: 'Rooftop Deployments & Field Projects' },
      { id: 'sales', name: 'Sales & Orders', desc: 'Commercial Client Sales & Reservations' },
      { id: 'suppliers', name: 'Suppliers', desc: 'Raw Material Vendors & Component Contracts' },
      { id: 'reports', name: 'Analytics & Reports', desc: 'Executive Yield & Revenue Analytics' }
    ];

    const currentRole = this.getCurrentRole();

    const getAccessStatus = (roleKey, moduleId) => {
      const config = this.roles[roleKey];
      if (!config.accessiblePages.includes(moduleId)) {
        return { label: 'Restricted', class: 'badge-danger', icon: '✕', text: 'No Access' };
      }
      if (config.permissions[`${moduleId}.readOnly`]) {
        return { label: 'Read-Only', class: 'badge-warning', icon: '👁️', text: 'Inspect Only' };
      }
      return { label: 'Full Access', class: 'badge-success', icon: '✓', text: 'Full CRUD' };
    };

    let tableHtml = `
      <div style="overflow-x:auto;">
        <table class="data-table" style="width:100%;font-size:12px;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:10px 14px;text-align:left;background:var(--bg-badge);">System Module</th>
              <th style="padding:10px 14px;text-align:center;background:rgba(59, 130, 246, 0.08);color:#2563eb;">
                <div>Rajesh K.</div>
                <div style="font-size:10px;font-weight:500;">Super Admin</div>
              </th>
              <th style="padding:10px 14px;text-align:center;background:rgba(16, 185, 129, 0.08);color:#059669;">
                <div>Priya S.</div>
                <div style="font-size:10px;font-weight:500;">Inventory Lead</div>
              </th>
              <th style="padding:10px 14px;text-align:center;background:rgba(245, 158, 11, 0.08);color:#d97706;">
                <div>Amit P.</div>
                <div style="font-size:10px;font-weight:500;">Plant Manager</div>
              </th>
              <th style="padding:10px 14px;text-align:center;background:rgba(168, 85, 247, 0.08);color:#9333ea;">
                <div>Sneha R.</div>
                <div style="font-size:10px;font-weight:500;">Sales Director</div>
              </th>
            </tr>
          </thead>
          <tbody>
    `;

    modules.forEach(m => {
      const rAdmin = getAccessStatus('Admin', m.id);
      const rInv = getAccessStatus('Inventory Manager', m.id);
      const rProd = getAccessStatus('Production Manager', m.id);
      const rSales = getAccessStatus('Sales Manager', m.id);

      tableHtml += `
        <tr style="border-bottom:1px solid var(--border-light);">
          <td style="padding:10px 14px;">
            <div style="font-weight:700;color:var(--text-primary);">${m.name}</div>
            <div style="font-size:10px;color:var(--text-muted);">${m.desc}</div>
          </td>
          <td style="padding:10px 14px;text-align:center;">
            <span class="badge ${rAdmin.class}" style="font-size:10px;padding:3px 7px;">${rAdmin.icon} ${rAdmin.label}</span>
          </td>
          <td style="padding:10px 14px;text-align:center;">
            <span class="badge ${rInv.class}" style="font-size:10px;padding:3px 7px;">${rInv.icon} ${rInv.label}</span>
          </td>
          <td style="padding:10px 14px;text-align:center;">
            <span class="badge ${rProd.class}" style="font-size:10px;padding:3px 7px;">${rProd.icon} ${rProd.label}</span>
          </td>
          <td style="padding:10px 14px;text-align:center;">
            <span class="badge ${rSales.class}" style="font-size:10px;padding:3px 7px;">${rSales.icon} ${rSales.label}</span>
          </td>
        </tr>
      `;
    });

    tableHtml += `
          </tbody>
        </table>
      </div>

      <!-- Quick Switch Strip inside Modal -->
      <div style="margin-top:1.5rem;padding:1rem;background:var(--bg-badge);border-radius:var(--radius-lg);border:1px solid var(--border-light);">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted);margin-bottom:8px;">
          Instant Role Tester (Switch Session)
        </div>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;">
          ${this.getAvailableUsers().map(du => {
            const isCurrent = du.role === currentRole;
            return `
              <button type="button" class="btn btn-secondary btn-sm" data-matrix-switch="${du.email}" style="font-size:11px;padding:6px 8px;border-color:${isCurrent ? 'var(--color-primary-500)' : 'var(--border-color)'};background:${isCurrent ? 'var(--color-primary-50)' : 'var(--bg-card)'};">
                <span style="font-weight:700;">${du.displayName}</span>
                <span style="font-size:10px;color:var(--text-muted);margin-left:4px;">(${du.roleLabel ? du.roleLabel.split(' ')[0] : ''})</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const isSuperAdmin = currentRole === 'Admin';

    Components.showModal({
      id: 'rbac-matrix-modal',
      title: 'Enterprise RBAC Permissions Matrix',
      size: 'lg',
      content: tableHtml,
      footer: `
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:12px;color:var(--text-muted);">Current Active Role: <strong>${this.getRoleConfig().name}</strong></span>
            ${isSuperAdmin ? `
              <button type="button" class="btn btn-primary btn-sm" id="matrix-create-user-btn" style="font-size:11px;padding:4px 8px;gap:5px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>+ Create New User</span>
              </button>
            ` : ''}
          </div>
          <button class="btn btn-secondary btn-sm" data-close-modal>Close</button>
        </div>
      `
    });

    // Wire up modal switcher buttons
    document.querySelectorAll('[data-matrix-switch]').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.dataset.matrixSwitch;
        Components.closeModal('rbac-matrix-modal');
        this.switchDemoUser(email);
      });
    });

    const matrixCreateUserBtn = document.getElementById('matrix-create-user-btn');
    if (matrixCreateUserBtn) {
      matrixCreateUserBtn.addEventListener('click', () => {
        Components.closeModal('rbac-matrix-modal');
        this.showCreateUserModal();
      });
    }
  },

  /* ══════════════════════════════════════════════════════════════════════
     SUPER ADMIN USER CREATION & PROVISIONING SYSTEM
     ══════════════════════════════════════════════════════════════════════ */

  /**
   * Opens the Super Admin modal to provision a new enterprise account
   * with role selection, password generation, Bcrypt hashing, and MySQL sync.
   */
  showCreateUserModal() {
    if (this.getCurrentRole() !== 'Admin') {
      if (typeof Components !== 'undefined') {
        Components.toast('error', 'Unauthorized Action', 'Only Super Admin can provision new user accounts.');
      }
      return;
    }
    if (typeof Components === 'undefined') return;

    const modalContent = `
      <div class="create-user-modal-wrap" style="display:flex;flex-direction:column;gap:1.125rem;">

        <!-- Header Summary Banner -->
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;background:linear-gradient(135deg, rgba(59,130,246,0.08), rgba(14,165,233,0.08));border:1px solid rgba(59,130,246,0.2);padding:0.875rem 1.25rem;border-radius:var(--radius-xl);">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg, #2563eb, #3b82f6);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(37,99,235,0.25);flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            </div>
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--text-primary);">Provision Enterprise Account</div>
              <div style="font-size:11px;color:var(--text-secondary);">Direct MySQL database insertion • Bcrypt encryption • Instant role-gated access</div>
            </div>
          </div>
          <span class="badge badge-primary" style="font-size:10px;padding:3px 8px;font-weight:700;">Super Admin Console</span>
        </div>

        <!-- Live Dynamic Identity Preview Card -->
        <div id="new-user-preview-card" style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-badge);border:1px dashed var(--border-color);padding:0.75rem 1rem;border-radius:var(--radius-lg);transition:all var(--transition-fast);">
          <div style="display:flex;align-items:center;gap:10px;">
            <div id="cu-preview-avatar" style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg, #059669, #10b981);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.12);">
              EM
            </div>
            <div>
              <div id="cu-preview-name" style="font-size:13px;font-weight:700;color:var(--text-primary);">Employee Name</div>
              <div id="cu-preview-email" style="font-size:11px;color:var(--text-muted);">employee@smatree.com</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div id="cu-preview-role-badge">
              <span class="badge badge-success" style="font-size:11px;padding:2px 8px;">Inventory Lead</span>
            </div>
            <div id="cu-preview-dept" style="font-size:10px;color:var(--text-muted);margin-top:2px;">Supply Chain & Raw Materials</div>
          </div>
        </div>

        <!-- Validation Error Message Alert -->
        <div id="cu-error-alert" style="display:none;padding:0.75rem 1rem;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--color-red-600);border-radius:var(--radius-lg);font-size:12px;"></div>

        <!-- Form Fields Grid -->
        <form id="cu-form" autocomplete="off" style="display:flex;flex-direction:column;gap:0.875rem;">
          
          <!-- Row 1: Full Name & Short Display Name -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.875rem;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:12px;font-weight:600;margin-bottom:4px;display:block;">Full Name <span style="color:var(--color-red-500)">*</span></label>
              <input type="text" id="cu-fullname" class="form-input" placeholder="e.g. Ramesh Chandra" required style="width:100%;height:38px;padding:0 12px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-input);color:var(--text-primary);font-size:13px;">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:12px;font-weight:600;margin-bottom:4px;display:block;">Display / Short Name</label>
              <input type="text" id="cu-displayname" class="form-input" placeholder="e.g. Ramesh C." style="width:100%;height:38px;padding:0 12px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-input);color:var(--text-primary);font-size:13px;">
            </div>
          </div>

          <!-- Row 2: Corporate Email & Quick Domain Buttons -->
          <div class="form-group" style="margin-bottom:0;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label class="form-label" style="font-size:12px;font-weight:600;margin-bottom:0;">Corporate Email Address <span style="color:var(--color-red-500)">*</span></label>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:11px;color:var(--text-muted);">Quick Domain:</span>
                <button type="button" class="btn btn-secondary btn-sm cu-domain-btn" data-domain="@smatree.com" style="padding:2px 7px;font-size:10px;height:auto;min-height:auto;">@smatree.com</button>
                <button type="button" class="btn btn-secondary btn-sm cu-domain-btn" data-domain="@solartech.in" style="padding:2px 7px;font-size:10px;height:auto;min-height:auto;">@solartech.in</button>
              </div>
            </div>
            <input type="email" id="cu-email" class="form-input" placeholder="e.g. ramesh@smatree.com" required style="width:100%;height:38px;padding:0 12px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-input);color:var(--text-primary);font-size:13px;">
          </div>

          <!-- Row 3: Initial Password & Generator -->
          <div class="form-group" style="margin-bottom:0;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <label class="form-label" style="font-size:12px;font-weight:600;margin-bottom:0;">Initial Login Password <span style="color:var(--color-red-500)">*</span></label>
              <button type="button" class="btn btn-secondary btn-sm" id="cu-generate-pass-btn" style="padding:2px 8px;font-size:11px;height:auto;min-height:auto;display:inline-flex;gap:4px;align-items:center;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                <span>Generate Strong Password</span>
              </button>
            </div>
            <div style="position:relative;display:flex;align-items:center;">
              <input type="password" id="cu-password" class="form-input" placeholder="Minimum 4 characters (e.g. SolarPass@2026)" required style="width:100%;height:38px;padding:0 38px 0 12px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-input);color:var(--text-primary);font-size:13px;">
              <button type="button" id="cu-toggle-pass" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;display:flex;align-items:center;" title="Show/Hide Password">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
            </div>
            <div id="cu-pass-hint" style="font-size:11px;color:var(--text-muted);margin-top:4px;">Hashed with industry-standard Bcrypt in MySQL users table.</div>
          </div>

          <!-- Row 4: Enterprise Role Assignment (Selection Cards) -->
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:12px;font-weight:600;margin-bottom:6px;display:block;">Assign System Role & Scope <span style="color:var(--color-red-500)">*</span></label>
            <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:8px;" id="cu-role-selector">
              
              <!-- Role 1: Super Admin -->
              <label class="cu-role-card" data-role="Admin" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid var(--border-color);border-radius:var(--radius-lg);cursor:pointer;background:var(--bg-card);transition:all var(--transition-fast);">
                <input type="radio" name="cu-role" value="Admin" style="margin-top:3px;">
                <div style="flex:1;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:13px;font-weight:700;color:var(--text-primary);">Super Admin</span>
                    <span class="badge badge-primary" style="font-size:10px;padding:1px 6px;">Admin</span>
                  </div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Full master access: All 8 modules & user governance</div>
                </div>
              </label>

              <!-- Role 2: Inventory Manager -->
              <label class="cu-role-card selected" data-role="Inventory Manager" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid #10b981;border-radius:var(--radius-lg);cursor:pointer;background:rgba(16,185,129,0.06);transition:all var(--transition-fast);">
                <input type="radio" name="cu-role" value="Inventory Manager" checked style="margin-top:3px;">
                <div style="flex:1;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:13px;font-weight:700;color:var(--text-primary);">Inventory Lead</span>
                    <span class="badge badge-success" style="font-size:10px;padding:1px 6px;">Inventory</span>
                  </div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Raw materials, vendor suppliers, stock reorders & warehouse</div>
                </div>
              </label>

              <!-- Role 3: Production Manager -->
              <label class="cu-role-card" data-role="Production Manager" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid var(--border-color);border-radius:var(--radius-lg);cursor:pointer;background:var(--bg-card);transition:all var(--transition-fast);">
                <input type="radio" name="cu-role" value="Production Manager" style="margin-top:3px;">
                <div style="flex:1;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:13px;font-weight:700;color:var(--text-primary);">Plant Manager</span>
                    <span class="badge badge-warning" style="font-size:10px;padding:1px 6px;">Production</span>
                  </div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Fabrication batches, panel assembly line & QC inspection</div>
                </div>
              </label>

              <!-- Role 4: Sales Manager -->
              <label class="cu-role-card" data-role="Sales Manager" style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1.5px solid var(--border-color);border-radius:var(--radius-lg);cursor:pointer;background:var(--bg-card);transition:all var(--transition-fast);">
                <input type="radio" name="cu-role" value="Sales Manager" style="margin-top:3px;">
                <div style="flex:1;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="font-size:13px;font-weight:700;color:var(--text-primary);">Sales Director</span>
                    <span class="badge" style="font-size:10px;padding:1px 6px;background:rgba(168,85,247,0.15);color:#9333ea;">Sales</span>
                  </div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Commercial orders, client dispatches & rooftop installations</div>
                </div>
              </label>

            </div>
          </div>

          <!-- Row 5: Role Title & Department (Auto-synced from role, customizable) -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.875rem;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:12px;font-weight:600;margin-bottom:4px;display:block;">Role Title / Designation</label>
              <input type="text" id="cu-rolelabel" class="form-input" value="Inventory Lead" style="width:100%;height:38px;padding:0 12px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-input);color:var(--text-primary);font-size:13px;">
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label" style="font-size:12px;font-weight:600;margin-bottom:4px;display:block;">Department</label>
              <input type="text" id="cu-department" class="form-input" value="Supply Chain & Raw Materials" style="width:100%;height:38px;padding:0 12px;border:1px solid var(--border-color);border-radius:var(--radius-md);background:var(--bg-input);color:var(--text-primary);font-size:13px;">
            </div>
          </div>

        </form>
      </div>
    `;

    const modalFooter = `
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
        <button type="button" class="btn btn-secondary btn-sm" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-primary btn-sm" id="cu-submit-btn" style="padding:0.6rem 1.4rem;font-weight:700;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Provision Account</span>
        </button>
      </div>
    `;

    Components.showModal({
      id: 'create-user-modal',
      title: 'Create New User Account',
      size: 'lg',
      content: modalContent,
      footer: modalFooter
    });

    // Form element references
    const fullnameInput = document.getElementById('cu-fullname');
    const displaynameInput = document.getElementById('cu-displayname');
    const emailInput = document.getElementById('cu-email');
    const passwordInput = document.getElementById('cu-password');
    const togglePassBtn = document.getElementById('cu-toggle-pass');
    const genPassBtn = document.getElementById('cu-generate-pass-btn');
    const roleLabelInput = document.getElementById('cu-rolelabel');
    const departmentInput = document.getElementById('cu-department');
    const errorAlert = document.getElementById('cu-error-alert');
    const submitBtn = document.getElementById('cu-submit-btn');

    // Live preview elements
    const previewAvatar = document.getElementById('cu-preview-avatar');
    const previewName = document.getElementById('cu-preview-name');
    const previewEmail = document.getElementById('cu-preview-email');
    const previewRoleBadge = document.getElementById('cu-preview-role-badge');
    const previewDept = document.getElementById('cu-preview-dept');

    const roleMeta = {
      'Admin': {
        name: 'Super Admin',
        color: '#3b82f6',
        bg: 'linear-gradient(135deg, #2563eb, #3b82f6)',
        badgeClass: 'badge-primary',
        dept: 'Executive Operations'
      },
      'Inventory Manager': {
        name: 'Inventory Lead',
        color: '#10b981',
        bg: 'linear-gradient(135deg, #059669, #10b981)',
        badgeClass: 'badge-success',
        dept: 'Supply Chain & Raw Materials'
      },
      'Production Manager': {
        name: 'Plant Manager',
        color: '#f59e0b',
        bg: 'linear-gradient(135deg, #d97706, #f59e0b)',
        badgeClass: 'badge-warning',
        dept: 'Manufacturing & Engineering'
      },
      'Sales Manager': {
        name: 'Sales Director',
        color: '#a855f7',
        bg: 'linear-gradient(135deg, #9333ea, #a855f7)',
        badgeClass: 'badge-secondary',
        dept: 'Commercial Sales & Projects'
      }
    };

    let selectedRole = 'Inventory Manager';
    let userHasCustomDisplayName = false;

    // Helper: Refresh live preview card
    const updatePreview = () => {
      const name = fullnameInput.value.trim() || 'Employee Name';
      const email = emailInput.value.trim() || 'employee@smatree.com';
      const meta = roleMeta[selectedRole] || roleMeta['Inventory Manager'];

      if (previewAvatar) {
        previewAvatar.textContent = Utils.getInitials(name);
        previewAvatar.style.background = meta.bg;
      }
      if (previewName) previewName.textContent = name;
      if (previewEmail) previewEmail.textContent = email;
      if (previewRoleBadge) {
        previewRoleBadge.innerHTML = `<span class="badge ${meta.badgeClass}" style="font-size:11px;padding:2px 8px;">${roleLabelInput.value || meta.name}</span>`;
      }
      if (previewDept) {
        previewDept.textContent = departmentInput.value || meta.dept;
      }
    };

    // Full name change handler -> auto-generate display name and update preview
    fullnameInput.addEventListener('input', () => {
      const name = fullnameInput.value.trim();
      if (!userHasCustomDisplayName) {
        const parts = name.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          displaynameInput.value = parts[0] + ' ' + parts[parts.length - 1][0].toUpperCase() + '.';
        } else if (parts.length === 1) {
          displaynameInput.value = parts[0];
        } else {
          displaynameInput.value = '';
        }
      }
      updatePreview();
    });

    displaynameInput.addEventListener('input', () => {
      userHasCustomDisplayName = displaynameInput.value.trim().length > 0;
      updatePreview();
    });

    emailInput.addEventListener('input', updatePreview);
    roleLabelInput.addEventListener('input', updatePreview);
    departmentInput.addEventListener('input', updatePreview);

    // Quick domain pills
    document.querySelectorAll('.cu-domain-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const domain = btn.dataset.domain;
        const currentVal = emailInput.value.trim();
        const username = currentVal.includes('@') ? currentVal.split('@')[0] : currentVal;
        emailInput.value = (username || 'user') + domain;
        emailInput.focus();
        updatePreview();
      });
    });

    // Password visibility toggle
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', () => {
        const isPass = passwordInput.type === 'password';
        passwordInput.type = isPass ? 'text' : 'password';
      });
    }

    // Generate strong password
    if (genPassBtn) {
      genPassBtn.addEventListener('click', () => {
        const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
        let pass = 'Sol@';
        for (let i = 0; i < 7; i++) {
          pass += pool.charAt(Math.floor(Math.random() * pool.length));
        }
        passwordInput.value = pass;
        passwordInput.type = 'text';
        
        const hintEl = document.getElementById('cu-pass-hint');
        if (hintEl) {
          hintEl.innerHTML = `<span style="color:var(--color-emerald-600);font-weight:600;">✓ Generated secure password: <code>${pass}</code></span>`;
        }

        try {
          navigator.clipboard.writeText(pass);
        } catch (e) {}
      });
    }

    // Role card click selection
    const roleCards = document.querySelectorAll('.cu-role-card');
    roleCards.forEach(card => {
      card.addEventListener('click', (e) => {
        const role = card.dataset.role;
        selectedRole = role;

        // Update card borders and styles
        roleCards.forEach(c => {
          c.classList.remove('selected');
          c.style.border = '1.5px solid var(--border-color)';
          c.style.background = 'var(--bg-card)';
        });

        card.classList.add('selected');
        const meta = roleMeta[role] || roleMeta['Admin'];
        card.style.border = `1.5px solid ${meta.color}`;
        card.style.background = `rgba(${meta.color === '#10b981' ? '16,185,129' : (meta.color === '#3b82f6' ? '59,130,246' : (meta.color === '#f59e0b' ? '245,158,11' : '168,85,247'))}, 0.08)`;

        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        // Auto-update designation & department
        roleLabelInput.value = meta.name;
        departmentInput.value = meta.dept;

        updatePreview();
      });
    });

    // Form submission
    submitBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const name = fullnameInput.value.trim();
      const displayName = displaynameInput.value.trim() || name;
      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const role = selectedRole;
      const roleLabel = roleLabelInput.value.trim() || (roleMeta[role]?.name || role);
      const department = departmentInput.value.trim() || (roleMeta[role]?.dept || 'Operations');

      // Validation
      if (!name || name.length < 2) {
        errorAlert.style.display = 'block';
        errorAlert.textContent = 'Please provide full employee name (at least 2 characters).';
        fullnameInput.focus();
        return;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorAlert.style.display = 'block';
        errorAlert.textContent = 'Please enter a valid corporate email address.';
        emailInput.focus();
        return;
      }

      if (!password || password.length < 4) {
        errorAlert.style.display = 'block';
        errorAlert.textContent = 'Initial password must be at least 4 characters long.';
        passwordInput.focus();
        return;
      }

      errorAlert.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span>
        <span>Provisioning Account...</span>
      `;

      try {
        const payload = {
          name,
          display_name: displayName,
          displayName,
          email,
          password,
          role,
          role_label: roleLabel,
          roleLabel,
          department
        };

        const res = await ApiService.createUser(payload);

        if (!res || !res.success) {
          const errMsg = res?.data?.message || res?.error || 'Failed to create user. Please check if email already exists.';
          errorAlert.style.display = 'block';
          errorAlert.textContent = errMsg;
          submitBtn.disabled = false;
          submitBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Provision Account</span>
          `;
          return;
        }

        const createdUser = res.data?.data || res.data || payload;

        // Close creation modal
        Components.closeModal('create-user-modal');

        // Success toast notification
        Components.toast(
          'success',
          'User Created Successfully',
          `Account for ${displayName} (${roleLabel}) has been provisioned.`
        );

        // Prompt Super Admin to switch immediately if desired
        setTimeout(() => {
          Components.confirm({
            title: 'Account Provisioned Successfully',
            message: `User <strong>${displayName}</strong> (${email}) is now active with role <strong>${roleLabel}</strong>.<br><br>Would you like to switch to this account now to test permissions?`,
            confirmText: 'Switch Account Now',
            cancelText: 'Stay as Super Admin',
            type: 'info',
            onConfirm: () => {
              RBAC.switchDemoUser(email);
            }
          });
        }, 350);

      } catch (err) {
        console.error('User creation exception:', err);
        errorAlert.style.display = 'block';
        errorAlert.textContent = 'Network or server error occurred while creating user.';
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Provision Account</span>
        `;
      }
    });
  },

  /**
   * Enterprise User Directory modal for Super Admin
   */
  async showUserDirectoryModal() {
    if (this.getCurrentRole() !== 'Admin') {
      if (typeof Components !== 'undefined') {
        Components.toast('error', 'Unauthorized Action', 'Only Super Admin can access the enterprise user directory.');
      }
      return;
    }
    if (typeof Components === 'undefined') return;

    let users = [];
    try {
      const resp = await ApiService.getUsers();
      if (resp?.success && Array.isArray(resp.data?.data)) {
        users = resp.data.data;
      } else if (resp?.success && Array.isArray(resp.data)) {
        users = resp.data;
      }
    } catch (e) {
      console.warn('Failed to fetch users from API, falling back to local list:', e);
    }

    if (!users || !users.length) {
      users = this.getAvailableUsers();
    }

    const currentEmail = (this.getCurrentUser()?.email || '').toLowerCase();

    let tableRows = users.map(u => {
      const uEmail = (u.email || '').toLowerCase();
      const isCurrent = uEmail === currentEmail;
      const roleConfig = this.getRoleConfig(u.role);
      const initials = Utils.getInitials(u.displayName || u.display_name || u.name);

      return `
        <tr style="border-bottom:1px solid var(--border-light);">
          <td style="padding:10px 12px;font-family:monospace;font-size:11px;color:var(--text-muted);font-weight:700;">
            ${u.user_code || u.id}
          </td>
          <td style="padding:10px 12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;border-radius:8px;background:${roleConfig.color ? `linear-gradient(135deg, ${roleConfig.color}, #3b82f6)` : 'var(--bg-badge)'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">
                ${initials}
              </div>
              <div>
                <div style="font-weight:700;color:var(--text-primary);font-size:12px;display:flex;align-items:center;gap:4px;">
                  <span>${u.name}</span>
                  ${isCurrent ? '<span class="badge badge-primary" style="font-size:9px;padding:1px 5px;">You</span>' : ''}
                </div>
                <div style="font-size:11px;color:var(--text-muted);">${u.displayName || u.display_name || ''}</div>
              </div>
            </div>
          </td>
          <td style="padding:10px 12px;font-size:12px;color:var(--text-secondary);">
            ${u.email}
          </td>
          <td style="padding:10px 12px;">
            ${this.renderRoleBadge(u.role, 'sm')}
          </td>
          <td style="padding:10px 12px;font-size:11px;color:var(--text-muted);">
            <div>${u.roleLabel || u.role_label || roleConfig.name}</div>
            <div style="font-size:10px;opacity:0.8;">${u.department || 'Operations'}</div>
          </td>
          <td style="padding:10px 12px;text-align:right;">
            ${isCurrent ? `
              <span class="badge badge-success" style="font-size:10px;padding:2px 8px;">Active Session</span>
            ` : `
              <button type="button" class="btn btn-secondary btn-sm cu-dir-switch-btn" data-switch-to="${u.email}" style="font-size:11px;padding:3px 8px;">
                <span>Switch</span>
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    const directoryContent = `
      <div style="display:flex;flex-direction:column;gap:1rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text-primary);">Enterprise User Directory</div>
            <div style="font-size:11px;color:var(--text-muted);">${users.length} registered accounts across factory departments</div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="dir-create-new-user-btn" style="gap:5px;font-weight:700;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>+ Create New User</span>
          </button>
        </div>

        <div style="overflow-x:auto;border:1px solid var(--border-light);border-radius:var(--radius-lg);">
          <table class="data-table" style="width:100%;font-size:12px;border-collapse:collapse;">
            <thead>
              <tr style="background:var(--bg-badge);">
                <th style="padding:8px 12px;text-align:left;">Code</th>
                <th style="padding:8px 12px;text-align:left;">Employee</th>
                <th style="padding:8px 12px;text-align:left;">Corporate Email</th>
                <th style="padding:8px 12px;text-align:left;">Assigned Role</th>
                <th style="padding:8px 12px;text-align:left;">Title & Dept</th>
                <th style="padding:8px 12px;text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    Components.showModal({
      id: 'rbac-user-directory-modal',
      title: 'Enterprise User Directory',
      size: 'lg',
      content: directoryContent,
      footer: `
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <span style="font-size:11px;color:var(--text-muted);">Super Admin Management Console</span>
          <button class="btn btn-secondary btn-sm" data-close-modal>Close</button>
        </div>
      `
    });

    // Wire up "+ Create New User" button in directory
    const dirCreateBtn = document.getElementById('dir-create-new-user-btn');
    if (dirCreateBtn) {
      dirCreateBtn.addEventListener('click', () => {
        Components.closeModal('rbac-user-directory-modal');
        this.showCreateUserModal();
      });
    }

    // Wire up switch buttons
    document.querySelectorAll('.cu-dir-switch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.dataset.switchTo;
        Components.closeModal('rbac-user-directory-modal');
        this.switchDemoUser(email);
      });
    });
  }

};

// Expose RBAC globally
window.RBAC = RBAC;
