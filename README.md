# Hogward University ERP — Integrated Student & Campus Management System

A production-oriented, full-stack enterprise campus ERP and Student Information System (SIS) designed for modern higher-education governance. Built with React 19, TypeScript, Tailwind CSS, Vite, and Express, the platform enforces strict institutional Role-Based Access Control (RBAC), ACID-validated examination marks processing, bulk Excel/CSV ingestion, 13-digit standard enrollment identity, and a customizable responsibility-oriented dashboard.

---

## 🌟 Key Highlights & Features

### 1. 🎓 Student Records & 13-Digit Enrollment Standard
- **University Standard ID**: Implements a zero-collision 13-digit fixed-width enrollment numbering scheme (`YY | LL | BB | CC | SSSSS`) that preserves numerical and lexicographical sorting order.
- **Comprehensive Dossiers**: Tracks academic progression, cumulative GPA, term credits earned, attendance percentages, fee status, and residential hall assignments.
- **Student Portal**: Self-service portal for enrolled students to review timetables, syllabi, fee challans, official grade sheets, and hostel allotments.

### 2. 🎯 Admissions & Candidate Scrutiny Office
- **Admissions Funnel**: Real-time tracking of applicant counseling, merit verification, and seat acceptances across branches.
- **Quota & Category Validation**: Enforces admissions policy across General, Reserved, Sports, and Sponsored seats.
- **Document Scrutiny**: Document intake checklist (mark sheets, domicile, category certificates) with digital verification stamps.

### 3. 📚 Academic Structure & Learning Resources Pipeline
- **Curriculum & Syllabi**: Dynamic management of departmental course catalogues, lecture-tutorial-practical (L-T-P) credit hours, and subject prerequisites.
- **Bulk Resource Ingestion**: Automated pipeline powered by SheetJS (`xlsx`) for batch uploading syllabi, lecture notes, lab manuals, and official circulars from Excel/CSV spreadsheets.
- **Class Schedules**: Daily and weekly timetable matrices mapping faculty instructors, lecture halls, and divisions.

### 4. 📊 ACID Examination & Marks Sealing Gateway
- **Statutory Validation Gate**: Pre-flight checks prevent score ceiling breaches (e.g. scores exceeding max theory/practical limits).
- **Cryptographic Marks Sealing**: Ensures tamper-evident grade ledger commitments with audit timestamps.
- **Controller of Examinations (COE) Ledger**: Centralized oversight of end-semester grade sheets and official university transcripts.

### 5. ⏱️ Attendance Telemetry & Defaulters Watch
- **Lecture Attendance Tracking**: Daily attendance logging with rapid single-click roll calls.
- **Statutory 75% Cutoff Compliance**: Automated warning triggers and defaulters watchlists for students at risk of hall ticket debarment.

### 6. 💳 Fee Platform & Treasury Reconciliation
- **Term Challan Processing**: Generates digitized fee challans with line-item breakdowns (tuition, laboratory, hostel, library).
- **Payment Verification**: Digital receipt issuance and automated dues clearance reconciliation for the Bursar's Office.

### 7. 🏢 Hostels & Residential Life
- **Bed Occupancy Register**: Real-time room inventory and allocation across residential halls (e.g., Tagore Hall, Ganga Hall).
- **Night Roll Call**: Hostel curfew monitoring, leave passes, and residential student tracking for wardens.

### 8. 🎛️ Responsibility-Driven Dashboard Customizer
- **1-Click Responsibility Presets**:
  - **Admissions Staff Focus**: Prioritizes admissions funnel, candidate scrutiny, and seat allocation quotas.
  - **Academic Staff Focus**: Prioritizes degree curricula, syllabus coverage, lecture attendance thresholds, and teaching rosters.
  - **Examinations Focus**: Prioritizes marks pipelines, pre-flight score validation, and transcripts.
  - **Treasury & Finances Focus**: Prioritizes fee challan reconciliation and audit telemetry.
  - **Balanced Overview**: Displays all authorized widgets in standard institutional order.
- **Inline Quick Reorder & Toggle**: Reorder widgets up/down and toggle visibility directly on the dashboard or via a detailed slide-out drawer, persisted locally per role.

### 9. 🛡️ Institutional RBAC & Audit Telemetry
- **Least-Privilege Authorization**: Granular route guards and backend middleware ensuring staff only access modules within their statutory clearance.
- **Zero-Trust Concurrent Sessions**: Active JWT session telemetry, remote session revocation, and immutable cryptographic audit logging for sensitive actions.

---

## 🏛️ 13-Digit Enrollment Number Specification

The university implements a standardized 13-digit enrollment scheme to prevent collision across departments, colleges, and cohorts:

```
2 6 | 0 1 | 0 3 | 1 8 | 0 0 0 0 1
──┬── ──┬── ──┬── ──┬── ────┬────
  │     │     │     │       └─ Serial Number within intake (5 digits, 00001–99999)
  │     │     │     └───────── College/Campus Code within University (2 digits, 18 = Main Engineering)
  │     │     └─────────────── Department Code (2 digits, 03 = Computer Science & Engineering)
  │     └───────────────────── Degree Level (2 digits: 01 = Bachelors, 02 = Masters, 03 = PhD)
  └─────────────────────────── Admission Year (2 digits, 26 = 2026 Cohort)
```

---

## 👥 Demo Accounts & Pre-configured Personas

The system includes pre-seeded accounts representing various institutional stakeholders. You can log in with any of these credentials or switch between them on the fly:

| Role | Name | Email / Identifier | Staff / Roll ID | Password |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin (Dean of IT)** | Dr. Aris Thorne | `admin@hogwarduni.ac.in` | `DIR-001` | `admin123` |
| **Dean of Academic Affairs** | Prof. Evelyn Vance | `evance.DA@hogwarduni.ac.in` | `FAC-014` | `dean123` |
| **HOD (Computer Science)** | Dr. Rajesh Nair | `rnair.CE@hogwarduni.ac.in` | `FAC-082` | `hod123` |
| **Faculty Member** | Dr. P. Sundaram | `psundaram.CE@hogwarduni.ac.in` | `FAC-099` | `faculty123` |
| **Controller of Examinations** | Dr. S. K. Bhattacharya | `skbhattacharya.coe@hogwarduni.ac.in` | `COE-002` | `exam123` |
| **Bursar / CFO** | Meera Deshmukh | `bursar.FIN@hogwarduni.ac.in` | `FIN-009` | `finance123` |
| **Chief Hostel Warden** | Col. R. S. Rathore | `warden.HW@hogwarduni.ac.in` | `HOS-001` | `warden123` |
| **Undergraduate Student** | Aarav Sharma | `2601031800001@hogwarduni.ac.in` | `2601031800001` | `student123` |
| **Student Representative** | Ananya Iyer | `2301031800160@hogwarduni.ac.in` | `2301031800160` | `student123` |

---

## 🛠️ Technology Stack

- **Frontend**:
  - **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - **Bundler & Dev Server**: [Vite 6](https://vitejs.dev/)
  - **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
  - **Icons**: [Lucide React](https://lucide.dev/) & [Google Material Symbols](https://fonts.google.com/icons)
  - **HTTP Client**: [Axios](https://axios-http.com/)
- **Backend & Middleware**:
  - **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
  - **Server**: [Express](https://expressjs.com/)
  - **Authentication**: JWT ([jsonwebtoken](https://github.com/auth0/node-jsonwebtoken))
  - **Spreadsheet Processing**: [SheetJS (xlsx)](https://sheetjs.com/)
  - **Data Validation**: [Zod](https://zod.dev/)

---

## 📁 Project Directory Structure

```text
college-erp/
├── package.json               # Dependencies and build scripts
├── server.ts                  # Production entry point (Express backend & static asset serving)
├── vite.config.ts             # Vite configuration with Tailwind CSS plugin
├── index.html                 # Primary HTML entry point
├── server/                    # Backend API and services
│   ├── controllers/           # API route handlers (Auth, Students, Marks, Fees, etc.)
│   ├── db/                    # Seed data, repositories, and in-memory transactional store
│   ├── middleware/            # JWT authentication and role-based access control (RBAC)
│   ├── routes/                # RESTful API route declarations (/api/*)
│   ├── services/              # Business logic (ACID marks gate, Excel ingest, audit logs)
│   └── types/                 # Shared TypeScript interfaces & types
└── src/                       # Frontend application
    ├── components/
    │   ├── common/            # PageHeader, Drawer, DashboardModuleCard, StatusBadge
    │   ├── dashboard/         # ResponsibilityWidgetCustomizer
    │   ├── layout/            # Sidebar, TopBar, MainLayout
    │   └── resources/         # Resource upload modals and views
    ├── context/               # React Context (AuthContext, DashboardContext)
    ├── lib/                   # API client configuration and RBAC route definitions
    ├── pages/                 # Full module views (Dashboard, Students, Academic, etc.)
    ├── types.ts               # Client-side UI types
    ├── App.tsx                # Main application component and router
    └── main.tsx               # Client entry point
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/college-erp.git
   cd college-erp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

### Production Build

1. **Compile TypeScript and bundle assets**:
   ```bash
   npm run build
   ```

2. **Launch the production server**:
   ```bash
   npm start
   ```

### Code Quality & Validation

- **Type Check & Lint**:
  ```bash
  npm run lint
  ```

---

## 🌐 API Overview

All backend endpoints are scoped under `/api` and secured via `Bearer` token authentication:

| Method | Endpoint | Description | Clearance |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate with email/rollNo and receive JWT | Public |
| `GET` | `/api/auth/profile` | Retrieve active persona profile and permissions | Authenticated |
| `GET` | `/api/students` | List student directory and enrollment metrics | Admin, Dean, HOD |
| `GET` | `/api/academic/timetable` | Retrieve daily/weekly class schedules | All Roles |
| `GET` | `/api/academic/syllabus` | Fetch department degree courses and curriculum | All Roles |
| `GET` | `/api/examinations/marks` | Query examination marks ledger | Staff / Student (Self) |
| `POST` | `/api/examinations/marks/commit` | ACID transactional mark commit and sealing | COE Officer, Super Admin |
| `GET` | `/api/fees` | Retrieve fee challans and collection ledger | Bursar, Student (Self) |
| `GET` | `/api/hostels` | View room inventory and hostel residents | Warden, Super Admin |
| `GET` | `/api/sessions` | Monitor active concurrent sessions | Super Admin |
| `GET` | `/api/audit-logs` | Cryptographic administrative audit stream | Admin, COE, Bursar |

---
