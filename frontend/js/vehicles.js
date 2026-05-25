// DriveEase - Vehicle Fleet Operations

let currentVehiclePage = 1;

async function loadVehiclesList(page = 1) {
  currentVehiclePage = page;
  
  const search = document.getElementById('vehicle-search').value;
  const category = document.getElementById('vehicle-filter-category').value;
  const status = document.getElementById('vehicle-filter-status').value;
  
  const tbody = document.getElementById('vehicle-table-body');
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Loading fleet inventory...</td></tr>';

  try {
    const res = await api.getVehicles({ search, category, status, page, limit: 6 });
    if (res.success) {
      tbody.innerHTML = '';
      
      const currencyFormatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      });

      if (res.data.length > 0) {
        res.data.forEach(v => {
          const tr = document.createElement('tr');
          
          let statusClass = 'badge-available';
          if (v.status === 'rented') statusClass = 'badge-rented';
          else if (v.status === 'maintenance') statusClass = 'badge-maintenance';
          else if (v.status === 'retired') statusClass = 'badge-retired';

          const imageTag = v.image_url 
            ? `<img src="${v.image_url}" alt="${v.make}" style="width: 70px; height: 46px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">`
            : `<div style="width: 70px; height: 46px; background-color: var(--bg-hover); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--text-muted);">No Img</div>`;

          tr.innerHTML = `
            <td>${imageTag}</td>
            <td>
              <div style="font-weight: 600; font-size: 14px;">${v.make} ${v.model}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">${v.year} • ${v.color}</div>
            </td>
            <td><span style="font-family: monospace; font-weight: 600; padding: 4px 8px; background-color: var(--bg-hover); border-radius: 4px; border: 1px solid var(--border-color); font-size: 12px;">${v.license_plate}</span></td>
            <td>
              <div style="font-weight: 500;">${v.category_name}</div>
              <div style="font-size: 11px; color: var(--primary); font-weight: 600;">${currencyFormatter.format(v.daily_rate)}/day</div>
            </td>
            <td>
              <div style="font-size: 12px;">Odo: <strong style="font-weight: 500;">${v.mileage} KM</strong></div>
              <div style="font-size: 11px; color: var(--text-secondary); text-transform: capitalize;">${v.fuel_type} • ${v.transmission}</div>
            </td>
            <td><span class="badge ${statusClass}">${v.status}</span></td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm" onclick='openEditVehicleModal(${JSON.stringify(v)})' title="Edit Specifications">
                  <i data-feather="edit-2" style="width: 14px; height: 14px;"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="handleDeleteVehicle(${v.vehicle_id}, '${v.make} ${v.model}')" title="Retire/Delete Car">
                  <i data-feather="trash-2" style="width: 14px; height: 14px;"></i>
                </button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });

        renderVehiclePagination(res.pagination);
      } else {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No matching fleet vehicles found. Try adjusting filters or register a new vehicle.</td></tr>';
        document.getElementById('vehicle-pagination-info').textContent = 'Showing 0 of 0 vehicles';
        document.getElementById('vehicle-pagination-buttons').innerHTML = '';
      }
    }
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--danger);">Failed to retrieve vehicle details.</td></tr>';
  }
  feather.replace();
}

function renderVehiclePagination(p) {
  const info = document.getElementById('vehicle-pagination-info');
  info.textContent = `Showing page ${p.page} of ${p.pages} (${p.total} total vehicles)`;

  const container = document.getElementById('vehicle-pagination-buttons');
  container.innerHTML = '';

  // Prev Button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-secondary btn-sm';
  prevBtn.innerHTML = '<i data-feather="chevron-left" style="width: 12px; height: 12px;"></i>';
  prevBtn.disabled = p.page === 1;
  prevBtn.onclick = () => loadVehiclesList(p.page - 1);
  container.appendChild(prevBtn);

  // Page Numbers
  for (let i = 1; i <= p.pages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `btn btn-sm ${p.page === i ? 'btn-primary' : 'btn-secondary'}`;
    pageBtn.textContent = i;
    pageBtn.onclick = () => loadVehiclesList(i);
    container.appendChild(pageBtn);
  }

  // Next Button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-secondary btn-sm';
  nextBtn.innerHTML = '<i data-feather="chevron-right" style="width: 12px; height: 12px;"></i>';
  nextBtn.disabled = p.page === p.pages;
  nextBtn.onclick = () => loadVehiclesList(p.page + 1);
  container.appendChild(nextBtn);
  
  feather.replace();
}

// Populate vehicle categories dropdowns in filters and forms
async function loadVehicleCategories() {
  try {
    const res = await api.getCategories();
    if (res.success) {
      // Filter Select
      const filterSelect = document.getElementById('vehicle-filter-category');
      filterSelect.innerHTML = '<option value="">All Categories</option>';
      
      // Form Add Select
      const addSelect = document.getElementById('add-veh-category');
      addSelect.innerHTML = '';

      // Form Edit Select
      const editSelect = document.getElementById('edit-veh-category');
      editSelect.innerHTML = '';

      res.data.forEach(cat => {
        const opt = `<option value="${cat.category_id}">${cat.name} (Rate: ₹${cat.daily_rate}/day)</option>`;
        filterSelect.innerHTML += `<option value="${cat.category_id}">${cat.name}</option>`;
        addSelect.innerHTML += opt;
        editSelect.innerHTML += opt;
      });
    }
  } catch (error) {
    console.error('Error loading vehicle categories:', error);
  }
}

// Modals Handling
async function openAddVehicleModal() {
  await loadVehicleCategories();
  document.getElementById('add-vehicle-form').reset();
  openModal('modal-add-vehicle');
}

async function submitAddVehicle(e) {
  e.preventDefault();
  
  const vehicleData = {
    make: document.getElementById('add-veh-make').value.trim(),
    model: document.getElementById('add-veh-model').value.trim(),
    year: document.getElementById('add-veh-year').value,
    license_plate: document.getElementById('add-veh-plate').value.trim(),
    color: document.getElementById('add-veh-color').value.trim(),
    category_id: document.getElementById('add-veh-category').value,
    mileage: document.getElementById('add-veh-mileage').value,
    fuel_type: document.getElementById('add-veh-fuel').value,
    transmission: document.getElementById('add-veh-transmission').value,
    image_url: document.getElementById('add-veh-image').value.trim()
  };

  try {
    const res = await api.addVehicle(vehicleData);
    if (res.success) {
      showToast(res.message || 'Vehicle added to fleet successfully.', 'success');
      closeModal('modal-add-vehicle');
      loadVehiclesList(1);
    }
  } catch (error) {
    showToast(error.message || 'Failed to save vehicle details.', 'error');
  }
}

async function openEditVehicleModal(vehicle) {
  await loadVehicleCategories();
  
  document.getElementById('edit-veh-id').value = vehicle.vehicle_id;
  document.getElementById('edit-veh-make').value = vehicle.make;
  document.getElementById('edit-veh-model').value = vehicle.model;
  document.getElementById('edit-veh-year').value = vehicle.year;
  document.getElementById('edit-veh-plate').value = vehicle.license_plate;
  document.getElementById('edit-veh-color').value = vehicle.color;
  document.getElementById('edit-veh-category').value = vehicle.category_id;
  document.getElementById('edit-veh-mileage').value = vehicle.mileage;
  document.getElementById('edit-veh-fuel').value = vehicle.fuel_type;
  document.getElementById('edit-veh-transmission').value = vehicle.transmission;
  document.getElementById('edit-veh-status').value = vehicle.status;
  document.getElementById('edit-veh-image').value = vehicle.image_url || '';

  openModal('modal-edit-vehicle');
}

async function submitEditVehicle(e) {
  e.preventDefault();
  
  const id = document.getElementById('edit-veh-id').value;
  const vehicleData = {
    make: document.getElementById('edit-veh-make').value.trim(),
    model: document.getElementById('edit-veh-model').value.trim(),
    year: document.getElementById('edit-veh-year').value,
    license_plate: document.getElementById('edit-veh-plate').value.trim(),
    color: document.getElementById('edit-veh-color').value.trim(),
    category_id: document.getElementById('edit-veh-category').value,
    mileage: document.getElementById('edit-veh-mileage').value,
    fuel_type: document.getElementById('edit-veh-fuel').value,
    transmission: document.getElementById('edit-veh-transmission').value,
    status: document.getElementById('edit-veh-status').value,
    image_url: document.getElementById('edit-veh-image').value.trim()
  };

  try {
    const res = await api.updateVehicle(id, vehicleData);
    if (res.success) {
      showToast(res.message || 'Vehicle specifications updated.', 'success');
      closeModal('modal-edit-vehicle');
      loadVehiclesList(currentVehiclePage);
    }
  } catch (error) {
    showToast(error.message || 'Failed to update vehicle details.', 'error');
  }
}

async function handleDeleteVehicle(id, carName) {
  const confirmDelete = confirm(`Are you sure you want to delete ${carName}?\n\nIf the vehicle has rental history, it will be marked as "Retired" to preserve data records. This action is irreversible.`);
  if (!confirmDelete) return;

  try {
    const res = await api.deleteVehicle(id);
    if (res.success) {
      showToast(res.message || 'Vehicle removed successfully.', 'success');
      loadVehiclesList(currentVehiclePage);
    }
  } catch (error) {
    showToast(error.message || 'Error occurred deleting vehicle.', 'error');
  }
}

// Bind to window scope
window.loadVehiclesList = loadVehiclesList;
window.openAddVehicleModal = openAddVehicleModal;
window.submitAddVehicle = submitAddVehicle;
window.openEditVehicleModal = openEditVehicleModal;
window.submitEditVehicle = submitEditVehicle;
window.handleDeleteVehicle = handleDeleteVehicle;
