// DriveEase - Dashboard Operations

async function loadDashboardStats() {
  try {
    const res = await api.getDashboardStats();
    if (res.success) {
      const stats = res.data;
      
      // Update statistics figures
      document.getElementById('stat-total-vehicles').textContent = stats.totalVehicles;
      document.getElementById('stat-available-vehicles').textContent = stats.availableVehicles;
      document.getElementById('stat-active-rentals').textContent = stats.activeRentals;
      
      // Currency formatter (INR)
      const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      });
      document.getElementById('stat-revenue').textContent = formatter.format(stats.revenue);

      // Render category availability summary list
      const fleetSummaryContainer = document.getElementById('dashboard-fleet-summary');
      fleetSummaryContainer.innerHTML = '';

      if (stats.categoryAvailability && stats.categoryAvailability.length > 0) {
        stats.categoryAvailability.forEach(cat => {
          const percentage = cat.total > 0 ? Math.round((cat.available / cat.total) * 100) : 0;
          
          const summaryRow = document.createElement('div');
          summaryRow.innerHTML = `
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 500; margin-bottom: 4px;">
              <span>${cat.category_name}</span>
              <span style="color: var(--text-secondary);">${cat.available} / ${cat.total} Available</span>
            </div>
            <div style="background-color: var(--bg-hover); height: 6px; border-radius: 3px; overflow: hidden; width: 100%;">
              <div style="background-color: ${percentage > 50 ? 'var(--success)' : percentage > 20 ? 'var(--warning)' : 'var(--danger)'}; height: 100%; width: ${percentage}%; transition: width 0.4s ease;"></div>
            </div>
          `;
          fleetSummaryContainer.appendChild(summaryRow);
        });
      } else {
        fleetSummaryContainer.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); text-align: center;">No categories available.</p>';
      }
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showToast('Failed to retrieve dashboard metrics.', 'error');
  }

  // Load Recent bookings table
  await loadRecentBookings();
}

async function loadRecentBookings() {
  const tbody = document.getElementById('dashboard-recent-bookings');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Retrieving booking list...</td></tr>';
  
  try {
    const res = await api.getRecentRentals();
    if (res.success && res.data.length > 0) {
      tbody.innerHTML = '';
      
      const currencyFormatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      });

      res.data.forEach(r => {
        const tr = document.createElement('tr');
        
        // Status formatting classes
        let statusBadgeClass = 'badge-available';
        if (r.status === 'active') statusBadgeClass = 'badge-active';
        else if (r.status === 'completed') statusBadgeClass = 'badge-completed';
        else if (r.status === 'overdue') statusBadgeClass = 'badge-overdue';
        else if (r.status === 'cancelled') statusBadgeClass = 'badge-retired';

        let invoiceBadgeClass = r.invoice_status === 'paid' ? 'badge-available' : 'badge-maintenance';

        const bookingDateStr = new Date(r.booking_date).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short'
        });

        tr.innerHTML = `
          <td style="font-family: monospace; font-weight: 500;">#${r.rental_id}</td>
          <td>
            <div style="font-weight: 500;">${r.customer_name}</div>
            <div style="font-size: 11px; color: var(--text-muted);">Booked: ${bookingDateStr}</div>
          </td>
          <td style="font-weight: 500;">${r.vehicle_info}</td>
          <td style="font-family: monospace; font-weight: 600;">${currencyFormatter.format(r.total_cost)}</td>
          <td><span class="badge ${statusBadgeClass}">${r.status}</span></td>
          <td><span class="badge ${invoiceBadgeClass}">${r.invoice_status}</span></td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No rental transactions registered yet.</td></tr>';
    }
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger);">Failed to retrieve recent bookings.</td></tr>';
  }
}

// Bind loadDashboardStats to window
window.loadDashboardStats = loadDashboardStats;
