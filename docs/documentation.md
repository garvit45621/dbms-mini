# DriveEase - Vehicle Rental Management System Documentation

DriveEase is a commercial-grade Vehicle Rental Management System built using a classic Node.js + Express backend and a responsive Vanilla HTML/CSS/JavaScript frontend, backed by a robust, normalized MySQL relational database schema.

---

## 1. Project Features

*   **Fixed Sidebar Navigation Dashboard:** Displaying key metrics (Total fleet size, available vehicles, active rentals, and lifetime revenue earnings) along with real-time fleet availability progress indicators.
*   **Vehicle Fleet Management:** CRUD panels for updating and listing vehicles, filter options by class category and operational status, custom searches, and pagination.
*   **Customer Directory:** Quick search filters, new profile registrations, updates, and custom profile pages showing billing and rental transaction history.
*   **Rental Booking Wizard:** 3-step checkout flow (Select Customer & Car ➔ Pick pickup/drop-off dates & discounts ➔ Generate corporate invoice detailing tax math).
*   **Return Vehicle Check-In:** Select active rentals, enter return odometers, inspectors note damage logs, clean fees, and perform real-time calculation of late fees.
*   **Revenue & Utilization Reports:** Fleet analytics displaying revenue distributions by car category and individual car utilization indices.
*   **Dual Offline Fallback Engine:** Runs seamlessly via mockups if a live MySQL server is not configured, facilitating instant review and development.

---

## 2. Technical Stack

*   **Core Backend:** Node.js (v16+) & Express
*   **Database:** MySQL (v8.0+)
*   **Frontend Interface:** Vanilla HTML5, Vanilla CSS3 (Custom design variables, Inter typography), Vanilla JavaScript ES6
*   **Authentication:** JSON Web Tokens (JWT) & BcryptJS password hashing
*   **Icons:** Feather Icons library

---

## 3. Database Schema Overview

The database contains 8 normalized relational tables located inside `database/schema.sql`:

1.  `admins`: Administrative accounts.
2.  `categories`: Fleet categories (Economy/Sedan, SUV, Luxury, Electric) and rate configurations.
3.  `vehicles`: Physical vehicles details (Make, model, plate, status, mileage, color).
4.  `customers`: Driver profiles (DL numbers, status).
5.  `rentals`: Rental contracts.
6.  `invoices`: Corporate invoices generated per rental.
7.  `payments`: Payment transactions.
8.  `returns`: Check-in inspection reports.

### Triggers & Views
*   `tg_after_rental_insert`: Trigger that marks vehicles as `'rented'` automatically upon rental insertion.
*   `tg_after_return_insert`: Trigger that processes returned cars, marks rentals as completed, updates car odometers, and marks vehicle status as `'available'` (or `'maintenance'` if body damages are reported).
*   `vw_rental_details`: Consolidates multi-table joins for fast index listing.
*   `vw_vehicle_utilization`: Aggregate reporting view compiling active rental days and revenue generated per vehicle.

---

## 4. Installation and Setup Instructions

### Prerequisites
*   Node.js (v16 or higher) installed.
*   MySQL Server (v8.0+) installed and running locally (optional, mock mode will auto-run if offline).

### Step 1: Clone and Install Dependencies
Navigate to the root workspace directory in your terminal and run:
```bash
npm run install-all
```
*This installs all required packages (express, mysql2, dotenv, cors, bcryptjs, jsonwebtoken, etc.) in the backend subdirectory.*

### Step 2: Set Up Database (MySQL)
1.  Log in to your MySQL terminal:
    ```sql
    mysql -u root -p
    ```
2.  Import the schema:
    ```sql
    SOURCE database/schema.sql;
    ```
3.  Import the sample seed data:
    ```sql
    SOURCE database/sample_data.sql;
    ```

### Step 3: Configure Environment Variables
Verify or edit the configuration settings in [backend/.env](file:///C:/Users/BMSIT/Desktop/dbms-mini/backend/.env):
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=rental_db
DB_PORT=3306
JWT_SECRET=supersecretkey_vehiclerentalsystem_2026
USE_MOCK_FALLBACK=true
```
*Note: If `USE_MOCK_FALLBACK=true`, the application will run in in-memory mode if the database is unreachable.*

### Step 4: Run the Application
Start the development server from the root directory:
```bash
npm run dev
```
Open your browser and navigate to:
*   **System UI Dashboard:** [http://localhost:5000](http://localhost:5000)
*   **API Root Endpoint:** [http://localhost:5000/api](http://localhost:5000/api)

### Demo Credentials
*   **Username:** `admin`
*   **Password:** `admin123`
