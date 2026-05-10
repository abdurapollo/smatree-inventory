/* ==========================================================================
   SMATREE SOLAR INVENTORY — Authentication Module
   Login, session management, role-based access, form validation
   ========================================================================== */

const Auth = {
  init() {
    // Seed data if needed
    SeedData.generate();
    App.applyTheme();

    this.form = document.getElementById('login-form');
    this.emailInput = document.getElementById('login-email');
    this.passwordInput = document.getElementById('login-password');
    this.toggleBtn = document.getElementById('toggle-password');
    this.rememberCheck = document.getElementById('remember-me');
    this.errorEl = document.getElementById('login-error');
    this.submitBtn = document.getElementById('login-submit');

    if (Store.isAuthenticated()) {
      window.location.href = 'dashboard.html';
      return;
    }

    // Load remembered email
    const remembered = localStorage.getItem('smatree_remembered_email');
    if (remembered && this.emailInput) {
      this.emailInput.value = remembered;
      if (this.rememberCheck) this.rememberCheck.checked = true;
    }

    this.setupEvents();
  },

  setupEvents() {
    // Toggle password visibility
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        const type = this.passwordInput.type === 'password' ? 'text' : 'password';
        this.passwordInput.type = type;
        this.toggleBtn.textContent = type === 'password' ? '👁️' : '🙈';
      });
    }

    // Form submit
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Demo account buttons
    document.querySelectorAll('[data-demo]').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.dataset.demo;
        const passwords = {
          'admin@smatree.com': 'admin123',
          'inventory@smatree.com': 'inv123',
          'production@smatree.com': 'prod123',
          'sales@smatree.com': 'sales123',
        };
        this.emailInput.value = email;
        this.passwordInput.value = passwords[email] || '';
      });
    });

    // Theme toggle on login page
    const themeBtn = document.getElementById('login-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => App.toggleTheme());
    }
  },

  handleLogin() {
    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    // Reset errors
    this.clearErrors();

    // Validate
    if (!email) return this.showFieldError(this.emailInput, 'Email is required');
    if (!this.isValidEmail(email)) return this.showFieldError(this.emailInput, 'Enter a valid email');
    if (!password) return this.showFieldError(this.passwordInput, 'Password is required');
    if (password.length < 4) return this.showFieldError(this.passwordInput, 'Password too short');

    // Find user
    const users = Store.getAll('users');
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if (!user) {
      this.showError('Invalid email or password. Try a demo account.');
      this.passwordInput.value = '';
      return;
    }

    // Remember me
    if (this.rememberCheck && this.rememberCheck.checked) {
      localStorage.setItem('smatree_remembered_email', email);
    } else {
      localStorage.removeItem('smatree_remembered_email');
    }

    // Set session
    Store.setSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Show loading on button
    this.submitBtn.innerHTML = '<span class="spinner spinner-sm"></span> Signing in...';
    this.submitBtn.disabled = true;

    // Redirect
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  showFieldError(input, message) {
    input.classList.add('is-invalid');
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
      this.errorEl.textContent = message;
      this.errorEl.style.display = 'block';
    }
  },

  clearErrors() {
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    document.querySelectorAll('.form-error').forEach(el => el.remove());
    if (this.errorEl) this.errorEl.style.display = 'none';
  },
};

window.Auth = Auth;
