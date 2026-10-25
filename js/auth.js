/* ==========================================================================
   SMATREE SOLAR INVENTORY — Modern Authentication Module
   Enterprise login, session management, demo accounts, modals & UX polish
   ========================================================================== */

const Auth = {
  init() {
    // Seed demo data if not yet seeded
    if (typeof SeedData !== 'undefined') {
      SeedData.generate();
    }
    
    // Apply current theme
    if (typeof App !== 'undefined') {
      App.applyTheme();
    }

    // Cache DOM Elements
    this.form = document.getElementById('login-form');
    this.emailInput = document.getElementById('login-email');
    this.passwordInput = document.getElementById('login-password');
    this.toggleBtn = document.getElementById('toggle-password');
    this.rememberCheck = document.getElementById('remember-me');
    this.errorEl = document.getElementById('login-error');
    this.errorMsg = document.getElementById('login-error-msg');
    this.submitBtn = document.getElementById('login-submit');
    this.capsWarning = document.getElementById('caps-warning');
    this.roleBanner = document.getElementById('selected-role-banner');
    this.roleLabel = document.getElementById('selected-role-label');
    this.quickLoginBtn = document.getElementById('quick-login-btn');

    // If already authenticated, redirect to dashboard
    if (typeof Store !== 'undefined' && Store.isAuthenticated()) {
      window.location.href = 'dashboard.html';
      return;
    }

    // Restore remembered email
    const remembered = localStorage.getItem('smatree_remembered_email');
    if (remembered && this.emailInput) {
      this.emailInput.value = remembered;
      if (this.rememberCheck) this.rememberCheck.checked = true;
    }

    this.setupEvents();
    this.updateThemeButtonIcon();
  },

  setupEvents() {
    // 1. Password Visibility Toggle with SVG Icon Switch
    if (this.toggleBtn && this.passwordInput) {
      this.toggleBtn.addEventListener('click', () => {
        const isPassword = this.passwordInput.type === 'password';
        this.passwordInput.type = isPassword ? 'text' : 'password';
        this.toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
        
        const eyeOpen = this.toggleBtn.querySelector('.eye-open');
        const eyeOff = this.toggleBtn.querySelector('.eye-off');
        if (eyeOpen && eyeOff) {
          eyeOpen.style.display = isPassword ? 'none' : 'block';
          eyeOff.style.display = isPassword ? 'block' : 'none';
        }
      });
    }

    // 2. Real-time Caps Lock Detection
    if (this.passwordInput && this.capsWarning) {
      const checkCaps = (e) => {
        if (e.getModifierState && e.getModifierState('CapsLock')) {
          this.capsWarning.style.display = 'inline-flex';
        } else {
          this.capsWarning.style.display = 'none';
        }
      };

      this.passwordInput.addEventListener('keydown', checkCaps);
      this.passwordInput.addEventListener('keyup', checkCaps);
      this.passwordInput.addEventListener('blur', () => {
        this.capsWarning.style.display = 'none';
      });
    }

    // 3. Quick Email Domain Chips
    document.querySelectorAll('[data-domain]').forEach(chip => {
      chip.addEventListener('click', () => {
        const domain = chip.dataset.domain;
        let currentVal = this.emailInput.value.trim();
        if (!currentVal) {
          this.emailInput.value = 'admin' + domain;
        } else if (currentVal.includes('@')) {
          this.emailInput.value = currentVal.split('@')[0] + domain;
        } else {
          this.emailInput.value = currentVal + domain;
        }
        this.emailInput.focus();
      });
    });

    // 4. Form Submission
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // 5. Quick Demo Role Selector
    const demoButtons = document.querySelectorAll('.demo-role-btn, [data-demo]');
    const passwords = {
      'admin@smatree.com': 'admin123',
      'inventory@smatree.com': 'inv123',
      'production@smatree.com': 'prod123',
      'sales@smatree.com': 'sales123',
    };

    demoButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.dataset.demo;
        const role = btn.dataset.role || 'Demo User';
        if (!email) return;

        // Clear active classes & set active on this
        demoButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Populate fields
        this.emailInput.value = email;
        this.passwordInput.value = passwords[email] || '';
        this.clearErrors();

        // Show fast 1-click login hint
        if (this.roleBanner && this.roleLabel) {
          this.roleLabel.textContent = role;
          this.roleBanner.style.display = 'flex';
        }
      });
    });

    // 6. Fast 1-Click Login Trigger
    if (this.quickLoginBtn) {
      this.quickLoginBtn.addEventListener('click', () => {
        this.handleLogin();
      });
    }

    // 7. Theme Toggle Synchronization
    const themeBtn = document.getElementById('login-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        if (typeof App !== 'undefined') {
          App.toggleTheme();
          this.updateThemeButtonIcon();
        }
      });
    }

    // 8. Forgot Password Modal Triggers
    const forgotTrigger = document.getElementById('forgot-password-trigger');
    const forgotModal = document.getElementById('forgot-modal');
    const forgotClose = document.getElementById('forgot-modal-close');
    const forgotForm = document.getElementById('forgot-form');
    const forgotAlert = document.getElementById('forgot-success-alert');

    if (forgotTrigger && forgotModal) {
      forgotTrigger.addEventListener('click', () => {
        const email = this.emailInput ? this.emailInput.value.trim() : '';
        const forgotInput = document.getElementById('forgot-email');
        if (forgotInput && email) forgotInput.value = email;
        if (forgotAlert) forgotAlert.style.display = 'none';
        forgotModal.classList.add('active');
      });
    }

    if (forgotClose && forgotModal) {
      forgotClose.addEventListener('click', () => {
        forgotModal.classList.remove('active');
      });
    }

    if (forgotForm && forgotAlert) {
      forgotForm.addEventListener('submit', (e) => {
        e.preventDefault();
        forgotAlert.style.display = 'block';
        setTimeout(() => {
          if (forgotModal) forgotModal.classList.remove('active');
        }, 2200);
      });
    }

    // 9. Help & Credentials Modal
    const helpBtn = document.getElementById('login-help-btn');
    const helpModal = document.getElementById('help-modal');
    const helpClose = document.getElementById('help-modal-close');
    const helpOk = document.getElementById('help-modal-ok');

    if (helpBtn && helpModal) {
      helpBtn.addEventListener('click', () => {
        helpModal.classList.add('active');
      });
    }

    const closeHelp = () => {
      if (helpModal) helpModal.classList.remove('active');
    };
    if (helpClose) helpClose.addEventListener('click', closeHelp);
    if (helpOk) helpOk.addEventListener('click', closeHelp);

    // Close modals on overlay backdrop click
    document.querySelectorAll('.auth-modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });

    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.auth-modal-overlay.active').forEach(m => m.classList.remove('active'));
      }
    });

    // Auto-clear error on input typing
    if (this.emailInput) {
      this.emailInput.addEventListener('input', () => this.clearErrors());
    }
    if (this.passwordInput) {
      this.passwordInput.addEventListener('input', () => this.clearErrors());
    }
  },

  updateThemeButtonIcon() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const btn = document.getElementById('login-theme-toggle');
    if (!btn) return;
    
    // In dark theme, show sun icon to switch to light. In light theme, show moon icon to switch to dark.
    if (theme === 'dark') {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
      btn.setAttribute('title', 'Switch to Light Mode');
    } else {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
      btn.setAttribute('title', 'Switch to Dark Mode');
    }
  },

  async handleLogin() {
    const email = this.emailInput ? this.emailInput.value.trim() : '';
    const password = this.passwordInput ? this.passwordInput.value : '';

    this.clearErrors();

    // Field-level Validation
    if (!email) {
      return this.showFieldError(this.emailInput, 'Work email address is required');
    }
    if (!this.isValidEmail(email)) {
      return this.showFieldError(this.emailInput, 'Please enter a valid email address');
    }
    if (!password) {
      return this.showFieldError(this.passwordInput, 'Password is required');
    }
    if (password.length < 3) {
      return this.showFieldError(this.passwordInput, 'Password is too short');
    }

    // Cache original submit button state
    const originalBtnHtml = this.submitBtn
      ? this.submitBtn.innerHTML
      : 'Sign In to Dashboard <span class="arrow-icon">→</span>';

    // Show loading state
    if (this.submitBtn) {
      this.submitBtn.innerHTML = `
        <span class="spinner spinner-sm" style="display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:8px;vertical-align:middle;"></span>
        <span>Authenticating...</span>
      `;
      this.submitBtn.disabled = true;
    }

    let user = null;
    let loginSuccess = false;
    let errorMsg = 'Invalid email or password. Select a demo role below to try immediately.';

    // 1. Primary: Database Authentication via PHP API
    try {
      const response = await fetch('../api/auth/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        loginSuccess = true;
        user = {
          id: data.user.user_code || data.user.id,
          db_id: data.user.db_id,
          name: data.user.name,
          display_name: data.user.display_name || data.user.name,
          email: data.user.email,
          role: data.user.role,
          role_label: data.user.role_label,
          token: data.token || null
        };
      } else {
        errorMsg = data.message || errorMsg;
      }
    } catch (apiErr) {
      console.warn('Backend database API error/offline, checking local fallback:', apiErr);
    }

    // 2. Fallback: If database is unreachable, check local store
    if (!loginSuccess && typeof Store !== 'undefined') {
      const localUsers = Store.getAll('users');
      const localUser = localUsers.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (localUser) {
        loginSuccess = true;
        user = {
          id: localUser.id,
          name: localUser.name,
          email: localUser.email,
          role: localUser.role
        };
      }
    }

    // Failed authentication
    if (!loginSuccess || !user) {
      if (this.submitBtn) {
        this.submitBtn.innerHTML = originalBtnHtml;
        this.submitBtn.disabled = false;
      }
      this.showError(errorMsg);
      if (this.passwordInput) {
        this.passwordInput.focus();
        this.passwordInput.select();
      }
      return;
    }

    // Remember Me Persistence
    if (this.rememberCheck && this.rememberCheck.checked) {
      localStorage.setItem('smatree_remembered_email', email);
    } else {
      localStorage.removeItem('smatree_remembered_email');
    }

    // Set User Session
    if (typeof Store !== 'undefined') {
      Store.setSession(user);
    }

    // Success State
    if (this.submitBtn) {
      this.submitBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block;margin-right:8px;vertical-align:middle;">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Redirecting...</span>
      `;
    }

    // Seamless redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 450);
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  showFieldError(input, message) {
    if (!input) return;
    input.classList.add('is-invalid');
    input.focus();
    const group = input.closest('.form-group');
    if (group) {
      const existing = group.querySelector('.form-error');
      if (!existing) {
        const err = document.createElement('div');
        err.className = 'form-error';
        err.textContent = message;
        group.appendChild(err);
      }
    }
  },

  showError(message) {
    if (this.errorEl) {
      if (this.errorMsg) {
        this.errorMsg.textContent = message;
      } else {
        this.errorEl.textContent = message;
      }
      this.errorEl.style.display = 'flex';
      // Trigger shake animation again if already displayed
      this.errorEl.style.animation = 'none';
      this.errorEl.offsetHeight; // trigger reflow
      this.errorEl.style.animation = null;
    }
  },

  clearErrors() {
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.form-error').forEach(el => el.remove());
    if (this.errorEl) {
      this.errorEl.style.display = 'none';
    }
  },
};

window.Auth = Auth;
