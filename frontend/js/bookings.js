// DriveEase - Rental Booking Wizard Operations

let selectedVehicleDetails = null;
let activeVehiclesList = [];

async function loadBookingStepData() {
  // Reset Wizard step to 1
  goToWizardStep(1);
  
  // Reset forms
  document.getElementById('booking-wizard-form').reset();
  document.getElementById('booking-vehicle-preview-card').style.display = 'none';
  selectedVehicleDetails = null;

  const customerSelect = document.getElementById('book-customer-select');
  const vehicleSelect = document.getElementById('book-vehicle-select');

  customerSelect.innerHTML = '<option value="">Loading customer records...</option>';
  vehicleSelect.innerHTML = '<option value="">Loading available fleet...</option>';

  try {
    // Fetch active customers
    const custRes = await api.getCustomers('', 1, 100);
    if (custRes.success) {
      customerSelect.innerHTML = '<option value="">-- Choose active customer --</option>';
      const activeCusts = custRes.data.filter(c => c.status === 'active');
      activeCusts.forEach(c => {
        customerSelect.innerHTML += `<option value="${c.customer_id}">${c.first_name} ${c.last_name} (${c.license_number})</option>`;
      });
    }

    // Fetch vehicles (specifically available vehicles)
    const vehRes = await api.getVehicles({ status: 'available', page: 1, limit: 100 });
    if (vehRes.success) {
      activeVehiclesList = vehRes.data;
      vehicleSelect.innerHTML = '<option value="">-- Choose available vehicle --</option>';
      vehRes.data.forEach(v => {
        vehicleSelect.innerHTML += `<option value="${v.vehicle_id}">${v.make} ${v.model} - ${v.license_plate} (₹${v.daily_rate}/day)</option>`;
      });
    }
  } catch (error) {
    showToast('Failed to retrieve listing options. Check server link.', 'error');
  }
}

function updateBookingVehicleDetails() {
  const select = document.getElementById('book-vehicle-select');
  const previewCard = document.getElementById('booking-vehicle-preview-card');
  const val = select.value;

  if (!val) {
    previewCard.style.display = 'none';
    selectedVehicleDetails = null;
    return;
  }

  const vehicleId = parseInt(val, 10);
  selectedVehicleDetails = activeVehiclesList.find(v => v.vehicle_id === vehicleId);

  if (selectedVehicleDetails) {
    document.getElementById('booking-veh-name').textContent = `${selectedVehicleDetails.make} ${selectedVehicleDetails.model} (${selectedVehicleDetails.year})`;
    
    const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    document.getElementById('booking-veh-rate').textContent = `${fmt.format(selectedVehicleDetails.daily_rate)}`;
    document.getElementById('booking-veh-deposit').textContent = `${fmt.format(selectedVehicleDetails.deposit_amount || 0)}`;

    previewCard.style.display = 'block';
  }
}

function goToWizardStep(stepNum) {
  // Basic validation checks before advancing
  if (stepNum === 2) {
    const cust = document.getElementById('book-customer-select').value;
    const veh = document.getElementById('book-vehicle-select').value;
    if (!cust || !veh) {
      showToast('Please select both a customer and a vehicle to proceed.', 'error');
      return;
    }

    // Default dates (pickup now, drop-off 3 days from now)
    const now = new Date();
    const threeDays = new Date();
    threeDays.setDate(now.getDate() + 3);

    // Format for datetime-local
    const pad = (n) => String(n).padStart(2, '0');
    const formatDT = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    document.getElementById('book-start-date').value = formatDT(now);
    document.getElementById('book-end-date').value = formatDT(threeDays);
    
    calculateBookingInvoiceEstimates();
  }

  // Toggle visible panels
  const panels = document.querySelectorAll('.wizard-panel');
  panels.forEach(p => p.classList.remove('active'));
  
  const target = document.getElementById(`wizard-step-${stepNum}`);
  if (target) target.classList.add('active');

  // Toggle wizard tabs
  const tabs = document.querySelectorAll('.wizard-step');
  tabs.forEach((tab, index) => {
    if (index + 1 === stepNum) {
      tab.className = 'wizard-step active';
    } else if (index + 1 < stepNum) {
      tab.className = 'wizard-step completed';
    } else {
      tab.className = 'wizard-step';
    }
  });
}

function calculateBookingInvoiceEstimates() {
  if (!selectedVehicleDetails) return;

  const startVal = document.getElementById('book-start-date').value;
  const endVal = document.getElementById('book-end-date').value;
  const discountInput = document.getElementById('book-discount');

  if (!startVal || !endVal) return;

  const start = new Date(startVal);
  const end = new Date(endVal);

  if (end < start) {
    document.getElementById('book-end-date').value = startVal;
    showToast('Drop-off date cannot precede pickup date.', 'error');
    return;
  }

  // Calculate rental days
  const diffTime = Math.abs(end - start);
  let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (days === 0) days = 1;

  document.getElementById('book-summary-days').textContent = `${days} Day(s)`;

  const dailyRate = parseFloat(selectedVehicleDetails.daily_rate);
  const deposit = parseFloat(selectedVehicleDetails.deposit_amount || 0);

  const subtotal = (dailyRate * days) + deposit;
  const tax = subtotal * 0.12; // 12% state tax
  
  let discount = parseFloat(discountInput.value) || 0;
  if (discount < 0) {
    discount = 0;
    discountInput.value = 0;
  }

  const total = subtotal + tax - discount;

  // Format currency
  const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
  document.getElementById('book-summary-subtotal').textContent = fmt.format(subtotal);
  document.getElementById('book-summary-tax').textContent = fmt.format(tax);
  document.getElementById('book-summary-discount').textContent = `- ${fmt.format(discount)}`;
  document.getElementById('book-summary-total').textContent = fmt.format(total < 0 ? 0 : total);
}

async function submitBookingOrder() {
  const customer_id = document.getElementById('book-customer-select').value;
  const vehicle_id = document.getElementById('book-vehicle-select').value;
  const start_date = document.getElementById('book-start-date').value;
  const end_date = document.getElementById('book-end-date').value;
  const discount = document.getElementById('book-discount').value || 0;

  try {
    const res = await api.bookRental({
      customer_id, vehicle_id, start_date, end_date, discount
    });
    
    if (res.success) {
      showToast(res.message || 'Rental booked and invoice generated.', 'success');
      await displayGeneratedInvoice(res.rental_id);
      goToWizardStep(3);
    }
  } catch (error) {
    showToast(error.message || 'Error occurred saving rental record.', 'error');
  }
}

async function displayGeneratedInvoice(rentalId) {
  const container = document.getElementById('booking-completed-invoice');
  container.innerHTML = '<p style="text-align: center;">Rendering corporate invoice metadata...</p>';

  try {
    const res = await api.getInvoice(rentalId);
    if (res.success) {
      const data = res.data;
      const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
      
      const issueDateStr = new Date(data.issue_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      const pickupDateStr = new Date(data.due_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

      container.innerHTML = `
        <div class="invoice-header">
          <div>
            <h2 style="font-size: 22px; font-weight: 700; color: var(--primary);">DriveEase Invoice</h2>
            <p style="font-size: 12px; color: var(--text-muted);">Commercial Rental Receipt</p>
          </div>
          <div class="invoice-meta">
            <div>Invoice Number: <strong>${data.invoice_number}</strong></div>
            <div>Generated: ${issueDateStr}</div>
            <div>Billing Status: <span class="badge badge-maintenance">${data.invoice_status}</span></div>
          </div>
        </div>

        <div class="invoice-addresses">
          <div class="invoice-address-col">
            <h5>Operator</h5>
            <strong>DriveEase Fleet Ltd</strong><br>
            Aeronautics Block, MG Road<br>
            Bangalore, KA 560001
          </div>
          <div class="invoice-address-col">
            <h5>Customer Account</h5>
            <strong>${data.customer_name}</strong><br>
            Phone: ${data.customer_phone}<br>
            Email: ${data.customer_email}
          </div>
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th>Line Item & Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Vehicle Rental Charges</strong><br>
                Class allocation: ${data.vehicle_info} (Plate: ${data.license_plate})
              </td>
              <td style="text-align: center;">${data.rental_days} Days</td>
              <td style="text-align: right;">${fmt.format(data.daily_rate)}</td>
              <td style="text-align: right;">${fmt.format(data.daily_rate * data.rental_days)}</td>
            </tr>
            <tr>
              <td>
                <strong>Refundable Security Deposit</strong><br>
                Returned in full upon inspection checklist validation
              </td>
              <td style="text-align: center;">1 Unit</td>
              <td style="text-align: right;">${fmt.format(data.deposit_amount)}</td>
              <td style="text-align: right;">${fmt.format(data.deposit_amount)}</td>
            </tr>
          </tbody>
        </table>

        <div class="invoice-summary">
          <div class="invoice-summary-row">
            <span>Subtotal:</span>
            <span>${fmt.format(data.subtotal)}</span>
          </div>
          <div class="invoice-summary-row">
            <span>Tax (12% Sales):</span>
            <span>${fmt.format(data.tax_amount)}</span>
          </div>
          <div class="invoice-summary-row" style="color: var(--danger);">
            <span>Applied Discount:</span>
            <span>- ${fmt.format(data.discount_amount)}</span>
          </div>
          <div class="invoice-summary-row total">
            <span>Net Total Due:</span>
            <span>${fmt.format(data.total_amount)}</span>
          </div>
        </div>
      `;
    }
  } catch (error) {
    container.innerHTML = '<p style="color: var(--danger); text-align: center;">Failed to render billing invoice details.</p>';
  }
}

function resetBookingWizard() {
  loadBookingStepData();
}

function printBookingInvoice() {
  window.print();
}

// Bind to global scope
window.loadBookingStepData = loadBookingStepData;
window.updateBookingVehicleDetails = updateBookingVehicleDetails;
window.goToWizardStep = goToWizardStep;
window.calculateBookingInvoiceEstimates = calculateBookingInvoiceEstimates;
window.submitBookingOrder = submitBookingOrder;
window.resetBookingWizard = resetBookingWizard;
window.printBookingInvoice = printBookingInvoice;
