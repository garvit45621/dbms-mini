// DriveEase - Central SPA Router & Application Controller

document.addEventListener('DOMContentLoaded', () => {
  // Check if session token exists
  checkSession();
  
  // Initialize icons
  feather.replace();
});

// Toast Notifications System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? 'check-circle' : 'alert-circle';
  toast.innerHTML = `
    <i data-feather="${icon}" style="width: 18px; height: 18px;"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  feather.replace();

  // Slide-in animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 50);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Session Management
function checkSession() {
  const token = localStorage.getItem('rental_sys_token');
  const userStr = localStorage.getItem('rental_sys_user');
  
  if (token && userStr) {
    const user = JSON.parse(userStr);
    showAppLayout(user);
  } else {
    showLoginLayout();
  }
}

function showAppLayout(user) {
  document.getElementById('view-login').style.display = 'none';
  document.getElementById('main-app').style.display = 'flex';
  
  // Set User Display details
  document.getElementById('user-display-name').textContent = user.name || user.username;
  document.getElementById('user-display-role').textContent = user.role ? user.role.toUpperCase() : 'STAFF';
  document.getElementById('user-avatar').textContent = (user.name || user.username).substring(0, 1).toUpperCase();
  
  // Route to dashboard by default
  switchView('dashboard');
}

function showLoginLayout() {
  document.getElementById('main-app').style.display = 'none';
  document.getElementById('view-login').style.display = 'flex';
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    const res = await api.login(username, password);
    showToast(res.message || 'Logged in successfully.', 'success');
    
    // Clear forms
    usernameInput.value = '';
    passwordInput.value = '';
    
    showAppLayout(res.user);
  } catch (error) {
    showToast(error.message || 'Authentication failed. Please verify credentials.', 'error');
  }
}

function handleLogout() {
  api.logout();
  showToast('Logged out of system.', 'success');
  showLoginLayout();
}

// Router view-switcher
function switchView(viewName) {
  // Hide all viewports
  const views = document.querySelectorAll('.page-view');
  views.forEach(v => v.classList.remove('active'));
  
  // Show target viewport
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update sidebar active link state
  const navItems = document.querySelectorAll('.sidebar-nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-view') === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Adjust header text based on page
  const headerTitle = document.getElementById('header-page-title');
  const headerSubtitle = document.getElementById('header-page-subtitle');
  
  // Load view data
  switch (viewName) {
    case 'dashboard':
      headerTitle.textContent = 'Dashboard';
      headerSubtitle.textContent = 'Real-time overview of fleet operations';
      loadDashboardStats();
      break;
    case 'vehicles':
      headerTitle.textContent = 'Vehicles Fleet';
      headerSubtitle.textContent = 'Manage, edit, and track fleet availability';
      loadVehiclesList(1);
      break;
    case 'customers':
      headerTitle.textContent = 'Customers Directory';
      headerSubtitle.textContent = 'Browse profile registration and payment histories';
      closeCustomerProfile(); // Go back to directory
      loadCustomersList(1);
      break;
    case 'bookings':
      headerTitle.textContent = 'Rental Booking Wizard';
      headerSubtitle.textContent = 'Issue dynamic booking invoices for rental categories';
      loadBookingStepData();
      break;
    case 'returns':
      headerTitle.textContent = 'Process Returned Vehicle';
      headerSubtitle.textContent = 'Register odometer returns and check damage estimates';
      loadReturnsStepData();
      break;
    case 'reports':
      headerTitle.textContent = 'Analytics Reports';
      headerSubtitle.textContent = 'Fleet utilization metrics and category earning audits';
      loadReportsData();
      break;
  }
  
  // Close mobile sidebar if open
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.remove('open');
  }

  feather.replace();
}

// Mobile sidebar helper
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

// Modal open/close utilities
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

// Make globally accessible
window.switchView = switchView;
window.handleLogout = handleLogout;
window.handleLoginSubmit = handleLoginSubmit;
window.toggleSidebar = toggleSidebar;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
