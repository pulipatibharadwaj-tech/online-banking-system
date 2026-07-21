# GD Bank - Online Banking Web Application

A full-stack online banking web application built with React, Node.js/Express, PostgreSQL, and Python.

## Tech Stack
- **Frontend**: React
- **Backend**: Node.js with Express
- **Database**: SQL-Lite
- **Python Services**: Notification & Reporting services (Flask)

## User Stories Implemented
| # | Story | Epic |
|---|-------|------|
| US-01 | User Registration | Authentication |
| US-02 | User Login | Authentication |
| US-03 | Forgot Password | Authentication |
| US-04 | Logout | Authentication |
| US-05 | View Account Dashboard | Dashboard |
| US-06 | View Account Balance | Dashboard |
| US-07 | View Recent Transactions | Dashboard |
| US-08 | Transfer Funds | Fund Transfer |
| US-09 | Validate Available Balance | Fund Transfer |
| US-10 | Transaction Confirmation | Fund Transfer |
| US-11 | Add Beneficiary | Beneficiary Mgmt |
| US-12 | Edit Beneficiary | Beneficiary Mgmt |
| US-13 | Delete Beneficiary | Beneficiary Mgmt |
| US-14 | Pay Utility Bills | Bill Payments |
| US-15 | View Payment History | Bill Payments |
| US-16 | Update Profile | Profile Mgmt |
| US-17 | Change Password | Profile Mgmt |
| US-18 | Receive Transaction Notification | Notifications |
| US-19 | Manage Customer Accounts | Admin |
| US-20 | Generate Reports | Admin |

## Setup

### Prerequisites
- Node.js (v18+)
- SQL=Lite
- Python 3.8+

### Database
```bash
psql -U postgres -c "CREATE DATABASE gdbank;"
psql -U postgres -d gdbank -f database/schema.sql
```

### Backend
```bash
cd backend
cp .env.example .env    # edit with your DB credentials
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Python Services (optional)
```bash
cd python-services
pip install -r requirements.txt
python notification_service.py   # port 5001
python report_service.py         # port 5002
```

## Default Admin
- Email: admin@gdbank.com
- Password: Update the hash in database/schema.sql, then use the register flow or seed directly.

## Project Structure
```
GD-Bank/
├── backend/          Node.js/Express API
├── frontend/         React application
├── database/         SQL-lite schema
└── python-services/  Flask notification & report services
```
