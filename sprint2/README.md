# Sprint 2 - Code Reference

## Sprint 2 User Stories (5 stories, 19 story points)

---

### US-17: Change Password (3 points)
**As a customer, I want to change my password so that my account remains secure.**

**Backend** — `backend/src/routes/auth.js:98-115`
- `POST /api/auth/change-password` endpoint
- Validates current password with bcrypt
- Hashes new password and updates database
- Protected by JWT authentication middleware

**Frontend** — `frontend/src/pages/Profile.js:52-70`
- Change Password form with current/new/confirm fields
- Client-side validation (passwords must match, min 6 chars)
- Success/error feedback

---

### US-07: View Recent Transactions (5 points)
**As a customer, I want to view my recent transactions so that I can monitor my account activity.**

**Backend** — `backend/src/routes/transfers.js:10-36`
- `GET /api/transfers` endpoint with filtering (date range, amount, type)
- Returns transactions with source/destination account info and beneficiary names
- Limited to 50 most recent

**Backend** — `backend/src/routes/accounts.js:54-74`
- `GET /api/accounts/dashboard/summary` returns 5 most recent transactions for the dashboard

**Frontend** — `frontend/src/pages/Dashboard.js:48-67`
- Transaction table on dashboard with date, type, description, amount, status
- Color-coded badges for transaction type and status

**Frontend** — `frontend/src/pages/Transfer.js:70-88`
- Full transaction history table with reference numbers

---

### US-11: Add Beneficiary (3 points)
**As a customer, I want to add a beneficiary so that I can transfer money quickly in the future.**

**Backend** — `backend/src/routes/beneficiaries.js:25-40`
- `POST /api/beneficiaries` endpoint
- Validates required fields (nickname, account number)
- Creates beneficiary with UUID, timestamps

**Frontend** — `frontend/src/pages/Beneficiaries.js:30-46`
- Add Beneficiary form with nickname, account number, bank name, sort code
- Success message on creation

---

### US-12: Edit Beneficiary (3 points)
**As a customer, I want to update beneficiary details so that my saved information remains accurate.**

**Backend** — `backend/src/routes/beneficiaries.js:42-60`
- `PUT /api/beneficiaries/:id` endpoint
- Uses COALESCE for partial updates
- Validates ownership (user_id match)

**Frontend** — `frontend/src/pages/Beneficiaries.js:48-52`
- Edit button populates form with existing values
- Cancel button resets form
- Update button sends PUT request

---

### US-13: Delete Beneficiary (3 points)
**As a customer, I want to remove a beneficiary so that I can keep my beneficiary list up to date.**

**Backend** — `backend/src/routes/beneficiaries.js:62-72`
- `DELETE /api/beneficiaries/:id` endpoint
- Confirms ownership before deletion
- Returns confirmation message

**Frontend** — `frontend/src/pages/Beneficiaries.js:54-58`
- Delete button with confirmation dialog
- Removes from list on success

---

## Supporting Code

### Authentication Middleware
`backend/src/middleware/auth.js` — JWT verification and role-based access control

### Database Schema
`database/schema.sql` — Beneficiaries table (lines 24-33), Transactions table (lines 35-47)

### Frontend Auth Context
`frontend/src/context/AuthContext.js` — Login/logout state management, token persistence

### API Client
`frontend/src/api/axios.js` — Axios instance with auth interceptor, auto-redirect on 401/403
