# CafeSync - Cafe Management System

## Overview

CafeSync is a full-stack cafe management system that provides a web-based interface and a REST API for managing core cafe operations such as:

- User authentication and role-based access (admin / staff / customer)
- Order management (including order items, QR-based order tracking, and email confirmations)
- Billing & payments (payments + invoices, exports, and invoice email sending)
- Menu & inventory management (menu items with image uploads, stock control, low-stock alerts, exports)
- Table & reservation management (tables, reservations, QR codes, reservation email sending, exports)

The repository contains:
- A **Node.js + Express** backend API in `backend/`
- A **React + Vite** frontend SPA in `frontend/`

Not clearly defined in the repository: business branding guidelines, formal product requirements, and production deployment topology (Docker/CI/CD).

---

## Architecture

### High-level architecture

**Architecture style:** Modular monolith with a separate SPA frontend.

- **Frontend (Vite/React)** runs on port **3000** during development and proxies API requests to the backend.
- **Backend (Express)** runs on port **5000** by default and exposes REST endpoints under `/api/*`.
- **Database:** MySQL via **Sequelize** ORM.

### Component interactions

1. Browser loads the React SPA.
2. Frontend calls backend API endpoints (typically under `/api/...`) using HTTP.
3. Backend validates requests, enforces authentication/authorization, and persists data to MySQL.
4. Certain features produce artifacts:
   - File exports (Excel via `xlsx`, PDFs via `pdfkit`)
   - QR codes (via `qrcode`)
   - Emails (via `nodemailer`)
   - Uploaded images served from `/uploads`

### Data flow (typical)

- **Auth flow:** user logs in → backend issues JWT → frontend stores token (implementation detail in frontend context; not fully confirmed here) → subsequent API calls send `Authorization: Bearer <token>` → middleware attaches `req.user`.
- **Order tracking flow:** order created → backend generates/returns a QR token endpoint → customer can access a tracking page using `/order-tracking/:qrToken` on the frontend, backed by `/api/orders/track/:qrToken` on the API.

---

## Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Auth:** JSON Web Tokens (`jsonwebtoken`)
- **Security:** password hashing via `bcryptjs`
- **Validation:** `express-validator`
- **Database/ORM:** MySQL + Sequelize (`mysql2`, `sequelize`)
- **File uploads:** `multer`
- **Email:** `nodemailer`
- **Documents/exports:** `pdfkit`, `xlsx`
- **QR codes:** `qrcode`
- **Dev tooling:** `nodemon`
- **Config:** `dotenv`

### Frontend
- **Framework:** React (with React Router)
- **Build tool:** Vite
- **Styling:** Tailwind CSS (via `@tailwindcss/vite`, `tailwindcss`, `postcss`, `autoprefixer`)
- **HTTP client:** `axios`
- **UI/UX:** `framer-motion`, `react-icons`
- **Notifications:** `react-hot-toast`, `react-toastify`

---

## Project Structure

```text
.
   ── backend/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   ├── seed.js
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.js
│   ├── common/
│   │   └── user_management/
│   │       ├── controllers/
│   │       ├── models/
│   │       └── routes/
│   │           └── userRoutes.js
│   ├── order_management/
│   │   ├── controllers/
│   │   ├── models/
│   │   └── routes/
│   │       └── orderRoutes.js
│   ├── billing_payment_management/
│   │   ├── controllers/
│   │   └── routes/
│   │       └── paymentRoutes.js
│   ├── menu_inventory_management/
│   │   ├── controllers/
│   │   └── routes/
│   │       └── menuRoutes.js
│   └── table_reservation_management/
│       ├── controllers/
│       └── routes/
│           └── tableRoutes.js
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── package-lock.json
    ├── public/
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── assets/
        ├── components/
        ├── context/
        ├── pages/
        └── services/
```

### Key entry points

- Backend: `backend/server.js`
- Backend DB config: `backend/config/db.js`
- Frontend: `frontend/src/main.jsx` → `frontend/src/App.jsx`
- Frontend dev proxy: `frontend/vite.config.js` (proxies `/api` and `/uploads` to `http://localhost:5000`)

---

## Setup & Installation

### Prerequisites

- Node.js (LTS recommended)
- npm
- MySQL server (local or remote)

### 1) Clone the repository

```bash
git clone <your-repo-url>
cd ITP-IT-22-CafeSync-Cafe-Management-System
```

### 2) Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (not clearly provided as a template in the repository). Minimum variables inferred from code:

```env
# Server
PORT=5000

# Database (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cafesync
DB_USER=root
DB_PASSWORD=your_password

# Sequelize sync mode
# If true: sequelize.sync({ alter: true })
# Else: sequelize.sync()
DB_SYNC_ALTER=false

# Auth
JWT_SECRET=replace_with_a_long_random_secret

# Email (required for email-sending features)
# Not clearly defined in the repository: exact required env var names for Nodemailer transport
```

Start the backend:

```bash
npm run dev
# or
npm start
```

Health check:

- `GET http://localhost:5000/api/health`

### 3) Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

By default:
- Frontend runs at `http://localhost:3000`
- API calls to `/api/*` are proxied to `http://localhost:5000`

---

## Usage

### Running locally (recommended dev workflow)

1. Start MySQL and ensure the target database exists.
2. Start backend (`backend/`): `npm run dev`
3. Start frontend (`frontend/`): `npm run dev`
4. Open `http://localhost:3000`

### Seed sample data (optional)

A seed script is provided in `backend/seed.js`. It seeds:
- Users (admin/staff/customer)
- Sri Lankan menu items
- Tables/reservations/orders/order items
- Some stock items

Run (from `backend/`):

```bash
node seed.js
```

Seeded credentials (as printed by the script):

- Customer: `customer@cafesync.lk` / `Customer@123`
- Admin: `admin@cafesync.lk` / `Admin@123`
- Staff: `staff@cafesync.lk` / `Staff@123`

---

## API Documentation

Base URL (dev): `http://localhost:5000`

All routes below are mounted from `backend/server.js`:

- `/api/users`
- `/api/orders`
- `/api/payments`
- `/api/menu`
- `/api/tables`

### Authentication

Protected endpoints require:

```
Authorization: Bearer <JWT>
```

Role enforcement is implemented server-side via middleware:
- `authMiddleware` (JWT required)
- `adminMiddleware` (admin only)
- `staffOrAdminMiddleware` (staff or admin)

### Users — `/api/users`

| Method | Endpoint | Auth | Notes |
|---|---|---:|---|
| POST | `/register` | No | Register customer user (validated fields) |
| POST | `/login` | No | Login and receive JWT (response shape not clearly defined here) |
| GET | `/profile` | Yes | Get current user profile |
| PUT | `/profile` | Yes | Update current user profile |
| DELETE | `/profile` | Yes | Delete own account |
| GET | `/all` | Yes | Admin or staff only (inline role check) |
| POST | `/admin-create` | Yes | Admin only; create user with role |
| PUT | `/:id` | Yes | Admin only; update user |
| DELETE | `/:id` | Yes | Admin only; delete user |

### Orders — `/api/orders`

| Method | Endpoint | Auth | Notes |
|---|---|---:|---|
| POST | `/` | Yes | Create order |
| GET | `/` | Yes | List orders |
| GET | `/:id` | Yes | Get order by id |
| PUT | `/:id` | Yes | Staff/Admin-only update |
| DELETE | `/:id` | Yes | Staff/Admin-only delete |
| GET | `/:id/qr` | Yes | Get QR for order |
| POST | `/:id/send-email` | Yes | Send order confirmation email |
| GET | `/track/:qrToken` | Optional | Customer QR tracking |
| GET | `/export/file` | Yes | Staff/Admin-only export |
| GET | `/export/pdf` | Yes | Staff/Admin-only PDF export |

**Order Items (nested under orders router)**

| Method | Endpoint | Auth | Notes |
|---|---|---:|---|
| POST | `/items` | Yes | Staff/Admin-only add item |
| GET | `/items/:orderId` | Yes | Staff/Admin-only list items |
| PUT | `/items/:id` | Yes | Staff/Admin-only update item |
| DELETE | `/items/:id` | Yes | Staff/Admin-only delete item |

### Billing & Payments — `/api/payments`

**Invoices**

| Method | Endpoint | Auth | Notes |
|---|---|---:|---|
| GET | `/invoices/export/file` | Yes | Staff/Admin-only export |
| GET | `/invoices/export/pdf` | Yes | Staff/Admin-only PDF export |
| POST | `/invoices` | Yes | Staff/Admin-only create |
| GET | `/invoices` | Yes | Staff/Admin-only list |
| GET | `/invoices/:id/pdf` | Yes | Staff/Admin-only download PDF |
| GET | `/invoices/:id` | Yes | Staff/Admin-only get |
| GET | `/invoices/:id/qr` | Yes | Staff/Admin-only QR |
| POST | `/invoices/:id/send-email` | Yes | Staff/Admin-only email invoice |
| PUT | `/invoices/:id` | Yes | Staff/Admin-only update |
| DELETE | `/invoices/:id` | Yes | Staff/Admin-only delete |

**Payments**

| Method | Endpoint | Auth | Notes |
|---|---|---:|---|
| GET | `/order/:orderId` | Yes | Staff/Admin-only; payment lookup by order |
| GET | `/mine` | Yes | Current user's payments |
| GET | `/export/file` | Yes | Staff/Admin-only export |
| GET | `/export/pdf` | Yes | Staff/Admin-only PDF export |
| POST | `/` | Yes | Staff/Admin-only create |
| GET | `/` | Yes | Staff/Admin-only list |
| GET | `/:id` | Yes | Staff/Admin-only get |
| PUT | `/:id` | Yes | Staff/Admin-only update |
| DELETE | `/:id` | Yes | Staff/Admin-only delete |

### Menu & Inventory — `/api/menu`

**Menu Items**

| Method | Endpoint | Auth | Notes |
|---|---|---:|---|
| POST | `/items` | Yes | Staff/Admin-only; supports `multipart/form-data` with `image` |
| GET | `/items` | No | Public list |
| GET | `/items/export/pdf` | Yes | Staff/Admin-only |
| GET | `/items/:id` | No | Public get |
| PUT | `/items/:id` | Yes | Staff/Admin-only; supports image upload |
| DELETE | `/items/:id` | Yes | Staff/Admin-only |

**Stock**

| Method | Endpoint | Auth | Notes |
|---|---|---:|---|
| GET | `/stock/export/file` | Yes | Staff/Admin-only |
| GET | `/stock/export/pdf` | Yes | Staff/Admin-only |
| POST | `/stock/alerts/email` | Yes | Staff/Admin-only; send low-stock email |
| POST | `/stock` | Yes | Staff/Admin-only create |
| GET | `/stock` | Yes | Staff/Admin-only list |
| GET | `/stock/alerts` | Yes | Staff/Admin-only low stock alerts |
| GET | `/stock/:id` | Yes | Staff/Admin-only get |
| PUT | `/stock/:id` | Yes | Staff/Admin-only update |
| DELETE | `/stock/:id` | Yes | Staff/Admin-only delete |

### Tables & Reservations — `/api/tables`

**Tables**

| Method | Endpoint | Auth | Notes |
|---|---|---:|---|
| POST | `/tables` | Yes | Staff/Admin-only create |
| GET | `/tables` | No | Public list |
| GET | `/tables/export/pdf` | Yes | Staff/Admin-only |
| GET | `/tables/:id` | No | Public get |
| PUT | `/tables/:id` | Yes | Staff/Admin-only update |
| DELETE | `/tables/:id` | Yes | Staff/Admin-only delete |

**Reservations**

| Method | Endpoint | Auth | Notes |
|---|---|---:|---|
| GET | `/reservations/export/file` | Yes | Staff/Admin-only |
| GET | `/reservations/export/pdf` | Yes | Staff/Admin-only |
| POST | `/reservations` | Yes | Create reservation (authenticated) |
| GET | `/reservations` | Yes | List reservations |
| GET | `/reservations/:id/qr` | Yes | Staff/Admin-only QR |
| POST | `/reservations/:id/send-email` | Yes | Staff/Admin-only email reservation |
| GET | `/reservations/:id` | Yes | Get reservation |
| PUT | `/reservations/:id` | Yes | Update reservation |
| DELETE | `/reservations/:id` | Yes | Delete reservation |

---

## Configuration

### Backend configuration

- `backend/config/db.js` configures Sequelize with:
  - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
  - `DB_SYNC_ALTER` to choose between safe sync vs `alter: true`
- JWT secret is read from `JWT_SECRET`
- File uploads are served from:
  - `GET /uploads/*` → `backend/uploads` directory (must exist at runtime if uploads are used)

### Frontend configuration

- `frontend/vite.config.js`
  - dev server port: `3000`
  - proxy:
    - `/api` → `http://localhost:5000`
    - `/uploads` → `http://localhost:5000`

Not clearly defined in the repository:
- A formal environment variable strategy for the frontend (e.g., `VITE_*` variables)
- Production build + serving strategy (e.g., Nginx, Node static serving, CDN)

---

## Deployment

Not clearly defined in the repository.

Suggested baseline (derive and adapt):
- Build frontend: `npm run build` in `frontend/`
- Run backend: `npm start` in `backend/`
- Provide production-grade environment variables and MySQL connectivity
- Place a reverse proxy in front (e.g., Nginx) to serve the frontend build and route `/api` to the backend

---

## Testing

Testing is not implemented (backend `npm test` is a placeholder that exits with an error). No test framework configuration is clearly present in the repository.

---

## Limitations & Assumptions

- No Dockerfiles, compose files, or CI/CD pipelines are present in the repository root (not clearly defined).
- Email features exist (Nodemailer dependency and route handlers), but required SMTP environment variables/transport configuration are not clearly defined from the examined files.
- API request/response schemas are not fully documented in-code (requires reading controllers/models end-to-end).
- Frontend-to-backend contract (exact payload shapes) is not fully confirmed from the available excerpts.

---

## Future Improvements

- Add OpenAPI/Swagger documentation and request/response examples for all endpoints.
- Add automated tests:
  - Unit tests for controllers/services
  - Integration tests for routes (with test DB)
  - Frontend component and E2E tests
- Add containerization (Docker + docker-compose) for consistent local and prod deployments.
- Add CI pipeline (lint/test/build) and basic security checks.
- Add `.env.example` files for backend and frontend.
- Add database migrations strategy (rather than relying on `sequelize.sync()` in production).
- Add observability: structured logging, request tracing, and metrics.

---

## Contributing Guidelines

1. Fork the repository and create a feature branch.
2. Keep changes focused and follow the existing module boundaries:
   - `backend/<domain>_management/{routes,controllers,models}`
   - `frontend/src/{components,pages,services,context}`
3. Run the app locally and verify:
   - Backend starts and `/api/health` returns OK
   - Frontend builds and routes work as expected
4. Open a pull request with a clear description and screenshots (for UI changes).

---

## License

MIT License
