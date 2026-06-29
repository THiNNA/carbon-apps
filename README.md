# Carbon Footprint Monorepo 🌿

This is the main application repository for the Carbon Footprint system. It is structured as a TypeScript monorepo using **pnpm workspaces** to manage both the backend API and the frontend web application, along with shared utility and configuration packages.

---

## 📂 Repository Structure

The monorepo contains the following workspace directories:

### 📱 Applications (`apps/`)
- [api](file://apps/api) (Backend API):
  - Framework: **Fastify** + **TypeScript**
  - Database & ORM: **Prisma** + **MySQL**
  - Features: Carbon calculations, organizational management, audit trail logs, and a hardware-locked licensing verification module.
- [web](file://apps/web) (Frontend Web App):
  - Framework: **React** + **Vite** + **TypeScript**
  - Styling: **Tailwind CSS** + **Vanilla CSS**
  - Features: Carbon footprint dashboard, carbon records list/form, licensing activation, user management, and transactional logs viewer.

### 📦 Shared Packages (`packages/`)
- [shared-config](file://packages/shared-config): Shared TypeScript, ESLint, and environment configurations.
- [shared-types](file://packages/shared-types): Shared TypeScript interfaces and DTOs (Data Transfer Objects) used by both front-end and back-end.
- [shared-utils](file://packages/shared-utils): General utilities and helper functions.

---

## 🛠️ Getting Started & Local Setup

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18 or higher recommended)
- **pnpm** (v8 or higher recommended)
- **Docker & Docker Compose** (for running MySQL)

### Setup Steps

1. **Clone the Repository and Navigate to App Root:**
   ```bash
   cd carbon-apps
   ```

2. **Install Dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root of `carbon-apps` by copying the example:
   ```bash
   cp .env.example .env
   ```
   Modify `.env` to configure your MySQL connection details and other settings:
   - `DATABASE_URL`: Connection string for MySQL.
   - `API_PORT`: Port for Backend API (defaults to 3001).
   - `JWT_SECRET`: Secret key for authenticating requests.

4. **Start the Database (MySQL):**
   Run the database container using Docker Compose:
   ```bash
   docker-compose up -d
   ```

5. **Initialize Database Schema and Seed Data:**
   Run Prisma commands to sync database schema and populate standard emission factors:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

---

## 🚀 Running the Development Servers

You can run applications in development mode using the scripts defined in the root `package.json`:

- **Run both Backend API & Web simultaneously (Parallel):**
   ```bash
   pnpm dev:all
   ```
- **Run Backend API only:**
   ```bash
   pnpm dev:api
   ```
- **Run Frontend Web only:**
   ```bash
   pnpm dev:web
   ```

---

## 🔑 Licensing System (Hardware-locked License)

This application has a hardware-locked licensing verification mechanism. To manage licenses:

1. **Generate RSA Keypair (Private & Public Keys):**
   ```bash
   pnpm --filter api generate-keys
   ```
   *Note: `private.pem` must be kept secret and is ignored by git. `public.pem` is committed with the code.*

2. **Generate License File (`license.json`):**
   You can generate a license file for a specific hardware machine (Node UUID) by passing constraints:
   ```bash
   pnpm --filter api generate-license [machineUuid] [expiryDays] [maxUsers] [maxOrganizations]
   ```
   Upload the generated `license.json` to the application via the settings panel to activate the system.

---

## 📦 Building for Production

To compile and build all applications and packages for production:

```bash
pnpm build
```

The compiled bundles will be generated under the `dist` folder of each application.
