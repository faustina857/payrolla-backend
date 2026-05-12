# Payrolla — Payroll Management System

A production-grade payroll management REST API built with Node.js, Express and MongoDB. Payrolla handles the complete payroll lifecycle for a single company — from employee onboarding to salary calculation, tax deductions, loan management and payslip generation.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Business Logic](#business-logic)
- [Security](#security)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

## Features

### Authentication & Authorization
- JWT authentication via HTTP-only cookies
- Role-based access control (superAdmin, admin, HR, employee)
- Invite-based employee onboarding — no self-registration
- Forgot password and reset password via email
- Login notification emails with IP address and device info
- Rate limiting on login (5 attempts per 15 minutes) and forgot password (3 per hour)

### Employee Management
- Full employee CRUD with Nigerian phone number validation
- Auto-generated employee IDs (PR-0001, PR-0002...)
- Employment status management — active, suspended, on leave, terminated
- Soft deletes — terminated employees are never removed from the database
- Employee self-service — update phone, address and profile photo
- Department management with head of department assignment

### Payroll Processing
- Monthly payroll runs with approval workflow (draft → pending → approved → paid)
- Automatic PAYE tax calculation using Nigerian FIRS tax bands
- Employee pension deduction (8% of basic salary)
- Employer pension contribution (10% of basic salary)
- NHF deduction (2.5% of basic salary)
- Pro-rated salary for mid-month hires (working days calculation)
- Loan deduction processing during payroll runs
- MongoDB transactions — payroll marking and payslip generation are atomic
- Payment file CSV download for bank upload
- Payroll preview before approval

### Loan Management
- Lightweight loan system with automatic monthly deductions
- Loan types: salary advance, personal loan, emergency loan
- Approval workflow (pending → active → completed/cancelled)
- Automatic loan completion when outstanding balance hits zero
- One active loan per employee at a time

### Payslip Generation
- Auto-generated after payroll is marked as paid
- Employee snapshot pattern — payslip data frozen at generation time
- Full payslip details sent via email to each employee
- HTML payslip download
- Payslip email resend for failed deliveries

### Dashboard
- Admin dashboard — workforce overview, payroll summary, loan stats, recent activity
- HR dashboard — workforce focus, pending invites, incomplete profiles
- Employee dashboard — profile, latest payslip, loan progress, leave status

### Audit Logs
- System-wide audit trail for all important actions
- Tracks who did what and when across all modules
- IP address and device info logged on auth actions
- Filterable by action, module, date range and resource

---

## Tech Stack
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (Atlas) |
| ODM | Mongoose |
| Authentication | JWT + HTTP-only cookies |
| Password hashing | bcryptjs |
| Validation | Joi |
| Email | Nodemailer + Mailtrap (dev) / Sendgrid (prod) |
| Rate limiting | express-rate-limit |

## System Architecture
payrolla-backend/
  ├── src/
  │   ├── auth/   
  │   │   ├── authController.js  
  │   │   ├── authModel.js
  │   │   ├── authRoutes.js
  │   │   ├── authService.js
  │   │   └── authValidation.js
  │   ├── audit/   
  │   │   ├── auditController.js  
  │   │   ├── auditModel.js
  │   │   ├── auditRoutes.js
  │   │   └── auditService.js
  │   ├── department/
  │   │   ├── departmentController.js
  │   │   ├── departmentModel.js
  │   │   ├── departmentRoutes.js
  │   │   ├── departmentService.js
  │   │   └── departmentValidation.js
  │   ├── employees/
  │   │   ├── employeeController.js
  │   │   ├── employeeModel.js
  │   │   ├── employeeRoutes.js
  │   │   ├── employeeService.js
  │   │   └── employeeValidation.js
  │   ├── loans/
  │   │   ├── loanController.js
  │   │   ├── loanModel.js
  │   │   ├── loanRoutes.js
  │   │   ├── loanService.js
  │   │   └── loanValidation.js
  │   ├── payroll/
  │   │   ├── payrollController.js
  │   │   ├── payrollModel.js
  │   │   ├── payrollRoutes.js
  │   │   ├── payrollService.js
  │   │   └── payrollValidation.js
  │   ├── payslips/
  │   │   ├── payslipController.js
  │   │   ├── payslipModel.js
  │   │   ├── payslipRoutes.js
  │   │   └── payslipService.js
  │   ├── dashboard/
  │   │   ├── dashboardController.js
  │   │   ├── dashboardRoutes.js
  │   │   └── dashboardService.js
  │   ├── config/
  │   │   ├── db.js
  │   │   └── env.js
  │   └── utils/
  │       ├── email.js
  │       ├── payeCalculator.js
  │       └── validate.js
  ├── .env
  ├── .gitignore
  ├── app.js
  └── package.json

Each module follows a layered architecture:
Routes → Controller → Service → Model

- **Routes** — define endpoints and apply middleware
- **Controller** — handle request/response
- **Service** — business logic
- **Model** — database schema
---

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Mailtrap account (development email)

### Installation

```bash
# clone the repository
git clone https://github.com/yfaustina857/payrolla-backend.git
cd payrolla-backend

# install dependencies
npm install

# create environment file
cp .env.example .env
# fill in your environment variables

# start development server
npm run dev
```

### First time setup

1. Start the server
2. Register the superAdmin account (one time only):
POST /api/v1/auth/register
{
"firstName": "Super",
"lastName": "Admin",
"email": "admin@yourcompany.com",
"password": "YourPassword123",
"confirmPassword": "YourPassword123"
}
3. Login and start adding departments and employees

---

## Environment Variables

Create a `.env` file in the root directory:

```bash
# App
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/payrolla

# JWT
JWT_SECRET=your_long_random_secret_key
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# Email (development — Mailtrap)
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your_mailtrap_username
MAIL_PASS=your_mailtrap_password
MAIL_FROM=noreply@payrolla.com
```

---

## API Documentation

### Base URL
http://localhost:5000/api/v1

### Authentication
All protected routes require a valid JWT cookie set during login. Include cookies in all requests.

---

### Auth endpoints

| Method | Endpoint | Description | Access |
| POST | /auth/register | Create superAdmin (one time) | Public |
| POST | /auth/login | Login | Public |
| POST | /auth/logout | Logout | Protected |
| GET | /auth/me | Get current user | Protected |
| POST | /auth/forgot-password | Send reset email | Public |
| PATCH | /auth/reset-password/:token | Reset password | Public |
| PATCH | /auth/change-password | Change password | Protected |
| POST | /auth/accept-invite | Accept employee invite | Public |
| POST | /auth/resend-invite/:employeeId | Resend invite email | HR/Admin |

---

### Employee endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | /employees | Add employee | HR/Admin |
| GET | /employees | Get all employees | HR/Admin |
| GET | /employees/me | Get own profile | Employee |
| GET | /employees/:id | Get one employee | HR/Admin |
| PATCH | /employees/me | Update own profile | Employee |
| PATCH | /employees/:id | Update employee | HR/Admin |
| PATCH | /employees/:id/terminate | Terminate employee | HR/Admin |
| PATCH | /employees/:id/suspend | Suspend employee | HR/Admin |
| PATCH | /employees/:id/activate | Reactivate employee | HR/Admin |
| PATCH | /employees/:id/leave | Put employee on leave | HR/Admin |

---

### Department endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | /departments | Create department | HR/Admin |
| GET | /departments | Get all departments | Authenticated |
| GET | /departments/:id | Get one department | Authenticated |
| PATCH | /departments/:id | Update department | HR/Admin |
| PATCH | /departments/:id/deactivate | Deactivate department | HR/Admin |

---

### Payroll endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | /payroll | Create payroll run | HR/Admin |
| GET | /payroll | Get all payroll runs | HR/Admin |
| GET | /payroll/:id | Get one payroll run | HR/Admin |
| GET | /payroll/:id/preview | Preview payroll breakdown | HR/Admin |
| PATCH | /payroll/:id | Update draft run | HR/Admin |
| PATCH | /payroll/:id/submit | Submit for approval | HR/Admin |
| PATCH | /payroll/:id/approve | Approve payroll run | Admin/SuperAdmin |
| PATCH | /payroll/:id/pay | Mark as paid | Admin/SuperAdmin |
| PATCH | /payroll/:id/cancel | Cancel payroll run | Admin/SuperAdmin |
| GET | /payroll/:id/payment-file | Download CSV payment file | Admin/SuperAdmin |

---

### Loan endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | /loans | Create loan | HR/Admin |
| GET | /loans | Get all loans | HR/Admin |
| GET | /loans/me | Get own loans | Employee |
| GET | /loans/:id | Get one loan | HR/Admin |
| PATCH | /loans/:id | Update pending loan | HR/Admin |
| PATCH | /loans/:id/approve | Approve loan | Admin/SuperAdmin |
| PATCH | /loans/:id/cancel | Cancel loan | HR/Admin |

---

### Payslip endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | /payslips | Get all payslips | HR/Admin |
| GET | /payslips/me | Get own payslips | Employee |
| GET | /payslips/employee/:employeeId | Get employee payslip history | HR/Admin |
| GET | /payslips/:id | Get one payslip | Authenticated |
| GET | /payslips/:id/download | Download payslip | Authenticated |
| POST | /payslips/:id/resend-email | Resend payslip email | HR/Admin |

---

### Dashboard endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | /dashboard/admin | Admin dashboard data | Admin/SuperAdmin |
| GET | /dashboard/hr | HR dashboard data | HR/Admin |
| GET | /dashboard/me | Employee dashboard data | Employee |

---

### Audit log endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | /audit | Get all audit logs | Admin/SuperAdmin |
| GET | /audit/:id | Get one audit log | Admin/SuperAdmin |
| GET | /audit/resource/:resourceId | Get logs for a resource | Admin/SuperAdmin |

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT stored in HTTP-only cookies — not accessible via JavaScript
- Password reset tokens hashed with SHA256 before storing
- Invite tokens hashed with SHA256 before storing
- Rate limiting on login (5 attempts/15min) and forgot password (3/hour)
- Role-based access control on every endpoint
- Sensitive fields (password, tokens) excluded from all API responses
- Creator cannot approve their own payroll run (segregation of duties)
- MongoDB transactions on payroll payment — atomic operation

---

## Known Limitations

- **Employee ID race condition** — current implementation uses `countDocuments()` which has a potential race condition under high concurrency. Production fix: atomic counter using MongoDB `$inc` operator.
- **PDF generation** — payslip download returns HTML. Production fix: integrate puppeteer or pdfkit for true PDF generation.
- **Payment disbursement** — salaries are not actually disbursed. A CSV payment file is generated for manual bank upload. Production fix: integrate Paystack bulk transfer API.
- **Email rate limiting** — sequential email sending with 2 second delay due to Mailtrap free plan limits. Remove delay in production with Sendgrid.

---

## Future Improvements

- Multi-company (SaaS) support
- Paystack bulk transfer integration for actual salary disbursement
- Loan interest rate calculation (amortization)
- Public holiday handling in pro-rated salary calculation
- Leave balance tracking
- Bulk employee import via CSV
- Email templates customization
- Two-factor authentication
- Mobile app

---

## Author

Built by [Faustina] as a portfolio project demonstrating real-world backend development with Node.js, Express and MongoDB.

---

## License

MIT
