// DriveEase - Vehicle Return Operations

let selectedReturnDetails = null;

async function loadReturnsStepData() {
  document.getElementById('vehicle-return-form').reset();
  document.getElementById('return-details-form-section').style.display = 'none';
  document.getElementById('return-summary-card').style.display = 'none';
  selectedReturnDetails = null;

  const select = document.getElementById('return-rental-select');
  select.innerHTML = '<option value="">Loading active bookings...</option>';

  try {
    const res = await api.getActiveRentals();
    if (res.success) {
      select.innerHTML = '<option value="">-- Choose active customer rental --</option>';
      if (res.data.length > 0) {
        res.data.forEach(r => {
          select.innerHTML += `<option value="${r.rental_id}">Booking #${r.rental_id} - ${r.customer_name} (Car: ${r.vehicle_info}, Plate: ${r.license_plate})</option>`;
        });
      } else {
        select.innerHTML = '<option value="">No active rentals out at this time.</option>';
      }
    }
  } catch (error) {
    showToast('Failed to load active rentals listing.', 'error');
  }
}

async function handleReturnRentalSelection() {
  const rentalId = document.getElementById('return-rental-select').value;
  const formSection = document.getElementById('return-details-form-section');
  const summaryCard = document.getElementById('return-summary-card');

  if (!rentalId) {
    formSection.style.display = 'none';
    summaryCard.style.display = 'none';
    selectedReturnDetails = null;
    return;
  }

  try {
    const res = await api.calculateLate(rentalId);
    if (res.success) {
      selectedReturnDetails = res.data;
      
      // Update form constraints
      document.getElementById('return-start-mileage').textContent = selectedReturnDetails.current_mileage;
      document.getElementById('return-mileage').min = selectedReturnDetails.current_mileage;
      document.getElementById('return-mileage').placeholder = `e.g. ${selectedReturnDetails.current_mileage + 150}`;
      
      // Default inputs
      document.getElementById('return-mileage').value = selectedReturnDetails.current_mileage;
      document.getElementById('return-damage-charges').value = 0;
      document.getElementById('return-additional-charges').value = 0;
      document.getElementById('return-damage-notes').value = '';

      formSection.style.display = 'block';
      summaryCard.style.display = 'block';
      
      calculateReturnSettlement();
    }
  } catch (error) {
    showToast('Failed to load pricing calculations for this rental.', 'error');
  }
}

function calculateReturnSettlement() {
  if (!selectedReturnDetails) return;

  const inputMileage = parseInt(document.getElementById('return-mileage').value) || selectedReturnDetails.current_mileage;
  const damageCharges = parseFloat(document.getElementById('return-damage-charges').value) || 0;
  const additionalCharges = parseFloat(document.getElementById('return-additional-charges').value) || 0;

  const startMileage = selectedReturnDetails.current_mileage;
  const distanceTraveled = inputMileage - startMileage;

  // Display odometer logs
  document.getElementById('ret-calc-mileage').textContent = `${inputMileage} KM (+${distanceTraveled < 0 ? 0 : distanceTraveled} KM)`;

  // Late fees calculations
  const lateHours = selectedReturnDetails.late_hours;
  const lateFee = selectedReturnDetails.late_fee;
  const deposit = selectedReturnDetails.deposit_amount;

  document.getElementById('ret-calc-late-hours').textContent = `${lateHours} Hr(s)`;
  
  const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
  document.getElementById('ret-calc-late-fee').textContent = fmt.format(lateFee);
  document.getElementById('ret-calc-damage').textContent = fmt.format(damageCharges);
  document.getElementById('ret-calc-misc').textContent = fmt.format(additionalCharges);
  document.getElementById('ret-calc-deposit').textContent = fmt.format(deposit);

  // Math logic: total charges vs deposit
  const totalCharges = lateFee + damageCharges + additionalCharges;
  const balanceRow = document.getElementById('ret-summary-settlement-row');
  const balanceLabel = document.getElementById('ret-calc-type-label');
  const balanceValue = document.getElementById('ret-calc-total-final');

  if (deposit >= totalCharges) {
    // Return refund to customer
    const refund = deposit - totalCharges;
    balanceLabel.textContent = 'Refund Due to Customer:';
    balanceValue.textContent = fmt.format(refund);
    balanceRow.style.color = 'var(--success)';
  } else {
    // Customer owes money
    const dues = totalCharges - deposit;
    balanceLabel.textContent = 'Dues Payable by Customer:';
    balanceValue.textContent = fmt.format(dues);
    balanceRow.style.color = 'var(--danger)';
  }
}

async function submitReturnLog(e) {
  e.preventDefault();

  const rental_id = document.getElementById('return-rental-select').value;
  const mileage_in = document.getElementById('return-mileage').value;
  const fuel_level = document.getElementById('return-fuel').value;
  const damage_notes = document.getElementById('return-damage-notes').value.trim();
  const damage_charges = document.getElementById('return-damage-charges').value || 0;
  const additional_charges = document.getElementById('return-additional-charges').value || 0;

  try {
    const res = await api.returnVehicle({
      rental_id, mileage_in, fuel_level, damage_notes, damage_charges, additional_charges
    });

    if (res.success) {
      showToast(res.message || 'Vehicle returned successfully. Invoice settled.', 'success');
      
      // Reload view
      loadReturnsStepData();
    }
  } catch (error) {
    showToast(error.message || 'Failed to process return. Check input mileage constraints.', 'error');
  }
}

function updateReturnDamageSeverity() {
  const severity = document.getElementById('return-damage-severity').value;
  const dmgInput = document.getElementById('return-damage-charges');
  const notesArea = document.getElementById('return-damage-notes');

  let cost = 0;
  let notes = "";

  switch (severity) {
    case 'none':
      cost = 0;
      notes = "No body damages reported. Vehicle returned in good condition.";
      break;
    case 'minor':
      cost = 2500;
      notes = "Minor scratches / cosmetic paint damage observed.";
      break;
    case 'moderate':
      cost = 6000;
      notes = "Moderate body dent / bumper scrape observed.";
      break;
    case 'major':
      cost = 15000;
      notes = "[CRITICAL] Major accident / body collision damage observed. Sent to mechanic.";
      break;
  }

  dmgInput.value = cost;
  notesArea.value = notes;

  calculateReturnSettlement();
}

// Bind to window
window.loadReturnsStepData = loadReturnsStepData;
window.handleReturnRentalSelection = handleReturnRentalSelection;
window.calculateReturnSettlement = calculateReturnSettlement;
window.updateReturnDamageSeverity = updateReturnDamageSeverity;
window.submitReturnLog = submitReturnLog;
