// DriveEase - Analytics & Reports Operations

let activeRevenueChart = null;
let activeUtilizationChart = null;

async function loadReportsData() {
  const revTbody = document.getElementById('reports-category-revenue-body');
  const utilTbody = document.getElementById('reports-utilization-body');
  
  revTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Auditing category ledgers...</td></tr>';
  utilTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Calculating fleet utilization ratios...</td></tr>';

  const fmt = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  });

  try {
    // 1. Load revenue distribution by category
    const revRes = await api.getRevenueByCategory();
    if (revRes.success) {
      revTbody.innerHTML = '';
      if (revRes.data.length > 0) {
        revRes.data.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-weight: 500;">${row.category_name}</td>
            <td style="font-weight: 500;">${row.rental_count} Bookings</td>
            <td style="text-align: right; font-weight: 600; font-family: monospace;">${fmt.format(row.revenue)}</td>
          `;
          revTbody.appendChild(tr);
        });

        // Render Doughnut Chart
        renderRevenueChart(revRes.data);
      } else {
        revTbody.innerHTML = '<tr><td colspan="3" class="empty-state">No transaction logs available.</td></tr>';
      }
    }

    // 2. Load vehicle performance & utilization details
    const utilRes = await api.getUtilizationStats();
    if (utilRes.success) {
      utilTbody.innerHTML = '';
      if (utilRes.data.length > 0) {
        utilRes.data.forEach(row => {
          let statusClass = 'badge-available';
          if (row.current_status === 'rented') statusClass = 'badge-rented';
          else if (row.current_status === 'maintenance') statusClass = 'badge-maintenance';
          else if (row.current_status === 'retired') statusClass = 'badge-retired';

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-family: monospace; font-weight: 500;">#${row.vehicle_id}</td>
            <td style="font-weight: 600;">${row.make} ${row.model}</td>
            <td><span style="font-family: monospace; font-size: 12px; font-weight: 600; padding: 2px 6px; background-color: var(--bg-hover); border-radius: 4px; border: 1px solid var(--border-color);">${row.license_plate}</span></td>
            <td>${row.category_name}</td>
            <td>${row.total_rentals} Booking(s)</td>
            <td>${row.total_rental_days} Active Day(s)</td>
            <td style="font-weight: 600; font-family: monospace;">${fmt.format(row.total_revenue_generated)}</td>
            <td><span class="badge ${statusClass}">${row.current_status}</span></td>
          `;
          utilTbody.appendChild(tr);
        });

        // Render Horizontal Bar Chart
        renderUtilizationChart(utilRes.data);
      } else {
        utilTbody.innerHTML = '<tr><td colspan="8" class="empty-state">No utilization metrics recorded. Add vehicles and create rentals.</td></tr>';
      }
    }

    // 3. Set up the Export button link
    const exportBtn = document.getElementById('report-export-btn');
    const exportUrl = api.getExportUrl();
    exportBtn.href = exportUrl;

  } catch (error) {
    console.error('Error loading reports details:', error);
    revTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--danger);">Failed to retrieve revenues.</td></tr>';
    utilTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--danger);">Failed to retrieve utilization indices.</td></tr>';
  }
}

function renderRevenueChart(data) {
  const canvas = document.getElementById('reports-revenue-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (activeRevenueChart) {
    activeRevenueChart.destroy();
  }

  const labels = data.map(row => row.category_name);
  const revenues = data.map(row => row.revenue);

  activeRevenueChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        label: 'Category Earnings',
        data: revenues,
        backgroundColor: [
          '#2563eb', // Indigo Accent
          '#10b981', // Success Emerald
          '#f59e0b', // Warning Amber
          '#06b6d4'  // Cyan info
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            font: { family: 'Inter', size: 11, weight: 500 },
            color: '#475569'
          }
        }
      }
    }
  });
}

function renderUtilizationChart(data) {
  const canvas = document.getElementById('reports-utilization-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (activeUtilizationChart) {
    activeUtilizationChart.destroy();
  }

  // Render top 5 utilized cars
  const topCars = data.slice(0, 5);
  const labels = topCars.map(c => `${c.make} ${c.model} (${c.license_plate})`);
  const activeDays = topCars.map(c => c.total_rental_days);

  activeUtilizationChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Active Booking Days',
        data: activeDays,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderColor: '#2563eb',
        borderWidth: 1.5,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y', // Horizontal
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            precision: 0,
            font: { family: 'Inter', size: 10 },
            color: '#64748b'
          }
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { family: 'Inter', size: 10, weight: 500 },
            color: '#475569'
          }
        }
      }
    }
  });
}

// Bind to window
window.loadReportsData = loadReportsData;
