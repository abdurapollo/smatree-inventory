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
            ${this.demoUsers.map(du => {
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
    const demo = this.demoUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!demo) {
      if (typeof Components !== 'undefined') {
        Components.toast('error', 'Switch Error', 'Demo account not found.');
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
          ${this.demoUsers.map(du => {
            const isCurrent = du.role === currentRole;
            return `
              <button type="button" class="btn btn-secondary btn-sm" data-matrix-switch="${du.email}" style="font-size:11px;padding:6px 8px;border-color:${isCurrent ? 'var(--color-primary-500)' : 'var(--border-color)'};background:${isCurrent ? 'var(--color-primary-50)' : 'var(--bg-card)'};">
                <span style="font-weight:700;">${du.displayName}</span>
                <span style="font-size:10px;color:var(--text-muted);margin-left:4px;">(${du.roleLabel.split(' ')[0]})</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    Components.showModal({
      id: 'rbac-matrix-modal',
      title: 'Enterprise RBAC Permissions Matrix',
      size: 'lg',
      content: tableHtml,
      footer: `
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <span style="font-size:12px;color:var(--text-muted);">Current Active Role: <strong>${this.getRoleConfig().name}</strong></span>
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
  }

};

// Expose RBAC globally
window.RBAC = RBAC;
