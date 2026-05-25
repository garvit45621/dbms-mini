// DriveEase - Customer Directory Operations

let currentCustomerPage = 1;

async function loadCustomersList(page = 1) {
  currentCustomerPage = page;
  
  const search = document.getElementById('customer-search').value;
  const tbody = document.getElementById('customer-table-body');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading customer profiles...</td></tr>';

  try {
    const res = await api.getCustomers(search, page, 6);
    if (res.success) {
      tbody.innerHTML = '';
      
      if (res.data.length > 0) {
        res.data.forEach(c => {
          const tr = document.createElement('tr');
          
          let statusClass = 'badge-available';
          if (c.status === 'suspended') statusClass = 'badge-overdue';
          else if (c.status === 'pending') statusClass = 'badge-maintenance';

          tr.innerHTML = `
            <td>
              <div style="font-weight: 600; color: var(--primary); cursor: pointer;" onclick="viewCustomerProfile(${c.customer_id})">
                ${c.first_name} ${c.last_name}
              </div>
            </td>
            <td>${c.email}</td>
            <td>${c.phone}</td>
            <td><code style="font-family: monospace; font-weight: 600; font-size: 13px;">${c.license_number}</code></td>
            <td><span class="badge ${statusClass}">${c.status}</span></td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm" onclick="viewCustomerProfile(${c.customer_id})" title="View Details Profile">
                  <i data-feather="eye" style="width: 14px; height: 14px;"></i>
                </button>
                <button class="btn btn-secondary btn-sm" onclick='openEditCustomerModal(${JSON.stringify(c)})' title="Edit Account Details">
                  <i data-feather="edit-2" style="width: 14px; height: 14px;"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="handleDeleteCustomer(${c.customer_id}, '${c.first_name} ${c.last_name}')" title="Suspend/Delete Customer">
                  <i data-feather="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });

        renderCustomerPagination(res.pagination);
      } else {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No customers match search criteria. Registered users show up here.</td></tr>';
        document.getElementById('customer-pagination-info').textContent = 'Showing 0 of 0 customers';
        document.getElementById('customer-pagination-buttons').innerHTML = '';
      }
    }
  } catch (error) {
    console.error('Error fetching customers:', error);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger);">Failed to retrieve customer profiles.</td></tr>';
  }
  feather.replace();
}

function renderCustomerPagination(p) {
  const info = document.getElementById('customer-pagination-info');
  info.textContent = `Showing page ${p.page} of ${p.pages} (${p.total} total customers)`;

  const container = document.getElementById('customer-pagination-buttons');
  container.innerHTML = '';

  // Prev Button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-secondary btn-sm';
  prevBtn.innerHTML = '<i data-feather="chevron-left" style="width: 12px; height: 12px;"></i>';
  prevBtn.disabled = p.page === 1;
  prevBtn.onclick = () => loadCustomersList(p.page - 1);
  container.appendChild(prevBtn);

  // Page Numbers
  for (let i = 1; i <= p.pages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `btn btn-sm ${p.page === i ? 'btn-primary' : 'btn-secondary'}`;
    pageBtn.textContent = i;
    pageBtn.onclick = () => loadCustomersList(i);
    container.appendChild(pageBtn);
  }

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-secondary btn-sm';
  nextBtn.innerHTML = '<i data-feather="chevron-right" style="width: 12px; height: 12px;"></i>';
  nextBtn.disabled = p.page === p.pages;
  nextBtn.onclick = () => loadCustomersList(p.page + 1);
  container.appendChild(nextBtn);
  
  feather.replace();
}

// Open profile
async function viewCustomerProfile(customerId) {
  try {
    const res = await api.getCustomerProfile(customerId);
    if (res.success) {
      // Toggle views
      document.getElementById('customer-list-panel').style.display = 'none';
      document.getElementById('customer-profile-panel').style.display = 'block';

      const customer = res.customer;
      
      // Update UI elements
      document.getElementById('profile-avatar-letters').textContent = customer.first_name.substring(0, 1) + customer.last_name.substring(0,1);
      document.getElementById('profile-full-name').textContent = `${customer.first_name} ${customer.last_name}`;
      
      const badge = document.getElementById('profile-badge-status');
      badge.textContent = customer.status;
      badge.className = `badge ${customer.status === 'active' ? 'badge-available' : 'badge-overdue'}`;

      document.getElementById('profile-email').textContent = customer.email;
      document.getElementById('profile-phone').textContent = customer.phone;
      document.getElementById('profile-dl').textContent = customer.license_number;

      // History Table
      const historyTbody = document.getElementById('profile-rental-history');
      historyTbody.innerHTML = '';

      if (res.history && res.history.length > 0) {
        const currencyFormatter = new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR'
        });

        res.history.forEach(h => {
          const start = new Date(h.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          const end = h.actual_return_date 
            ? new Date(h.actual_return_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Not Returned';

          let statusClass = 'badge-available';
          if (h.status === 'active') statusClass = 'badge-active';
          else if (h.status === 'completed') statusClass = 'badge-completed';
          else if (h.status === 'overdue') statusClass = 'badge-overdue';
          else if (h.status === 'cancelled') statusClass = 'badge-retired';

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 500;">#${h.rental_id}</td>
            <td>
              <div style="font-weight: 500;">${h.vehicle_info}</div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${h.license_plate}</div>
            </td>
            <td>${start}</td>
            <td>${end}</td>
            <td style="font-weight: 600; font-family: monospace;">${currencyFormatter.format(h.total_cost)}</td>
            <td><span class="badge ${statusClass}">${h.status}</span></td>
          `;
          historyTbody.appendChild(tr);
        });
      } else {
        historyTbody.innerHTML = '<tr><td colspan="6" class="empty-state">No rental transactions recorded for this customer profile yet.</td></tr>';
      }
    }
  } catch (error) {
    showToast('Failed to load profile. Connection or record error.', 'error');
  }
}

function closeCustomerProfile() {
  document.getElementById('customer-list-panel').style.display = 'block';
  document.getElementById('customer-profile-panel').style.display = 'none';
}

// CRUD Modals
function openAddCustomerModal() {
  document.getElementById('add-customer-form').reset();
  openModal('modal-add-customer');
}

async function submitAddCustomer(e) {
  e.preventDefault();
  
  const customer = {
    first_name: document.getElementById('add-cust-first-name').value.trim(),
    last_name: document.getElementById('add-cust-last-name').value.trim(),
    email: document.getElementById('add-cust-email').value.trim(),
    phone: document.getElementById('add-cust-phone').value.trim(),
    license_number: document.getElementById('add-cust-dl').value.trim()
  };

  try {
    const res = await api.addCustomer(customer);
    if (res.success) {
      showToast(res.message || 'Customer registered in system database.', 'success');
      closeModal('modal-add-customer');
      loadCustomersList(1);
    }
  } catch (error) {
    showToast(error.message || 'Failed to register customer.', 'error');
  }
}

function openEditCustomerModal(c) {
  document.getElementById('edit-cust-id').value = c.customer_id;
  document.getElementById('edit-cust-first-name').value = c.first_name;
  document.getElementById('edit-cust-last-name').value = c.last_name;
  document.getElementById('edit-cust-email').value = c.email;
  document.getElementById('edit-cust-phone').value = c.phone;
  document.getElementById('edit-cust-dl').value = c.license_number;
  document.getElementById('edit-cust-status').value = c.status;

  openModal('modal-edit-customer');
}

async function submitEditCustomer(e) {
  e.preventDefault();
  
  const id = document.getElementById('edit-cust-id').value;
  const customer = {
    first_name: document.getElementById('edit-cust-first-name').value.trim(),
    last_name: document.getElementById('edit-cust-last-name').value.trim(),
    email: document.getElementById('edit-cust-email').value.trim(),
    phone: document.getElementById('edit-cust-phone').value.trim(),
    license_number: document.getElementById('edit-cust-dl').value.trim(),
    status: document.getElementById('edit-cust-status').value
  };

  try {
    const res = await api.updateCustomer(id, customer);
    if (res.success) {
      showToast(res.message || 'Customer profile successfully updated.', 'success');
      closeModal('modal-edit-customer');
      loadCustomersList(currentCustomerPage);
    }
  } catch (error) {
    showToast(error.message || 'Failed to update customer details.', 'error');
  }
}

async function handleDeleteCustomer(id, customerName) {
  const confirmDelete = confirm(`Are you sure you want to delete profile for ${customerName}?\n\nIf the customer has billing/rental history, they will be suspended to protect financial audit trails. This action is final.`);
  if (!confirmDelete) return;

  try {
    const res = await api.deleteCustomer(id);
    if (res.success) {
      showToast(res.message || 'Customer profile deleted.', 'success');
      loadCustomersList(currentCustomerPage);
    }
  } catch (error) {
    showToast(error.message || 'Error deleting customer.', 'error');
  }
}

// Bind methods
window.loadCustomersList = loadCustomersList;
window.viewCustomerProfile = viewCustomerProfile;
window.closeCustomerProfile = closeCustomerProfile;
window.openAddCustomerModal = openAddCustomerModal;
window.submitAddCustomer = submitAddCustomer;
window.openEditCustomerModal = openEditCustomerModal;
window.submitEditCustomer = submitEditCustomer;
window.handleDeleteCustomer = handleDeleteCustomer;
