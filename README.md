# SafeMap — Interactive Real-Time Crime & Incident Reporting Platform

Built for the **Odoo Hackathon**.

SafeMap bridges citizens and law enforcement through an interactive geospatial interface, real-time WebSocket notifications, rigorous 7-stage verification workflow, and seamless Odoo Helpdesk case synchronization.

---

## 🏗️ Architecture & Philosophy

1. **Gated Incident Pipeline**: Submissions are strictly classified as *reported incidents* until verified by an authorized officer.
2. **Geospatial Focus**: OpenStreetMap & Leaflet with 2dsphere MongoDB clustering.
3. **Enterprise Bridge**: Verified incidents sync via XML-RPC to Odoo Helpdesk for administrative triage and SLA tracking.
4. **Security by Design**: Complete IDOR guards, HTTP-only refresh tokens, strict RBAC, and magic-byte file validation.

---

## 🚀 Quick Start (Development)

### 1. Prerequisites
- Node.js v20+ LTS
- MongoDB (local instance on `mongodb://127.0.0.1:27017/safemap` or MongoDB Atlas URI)

### 2. Setup
```bash
# Install root, backend, and frontend dependencies
npm install

# Setup backend environment
cd backend
cp .env.example .env

# Setup frontend environment
cd ../frontend
cp .env.example .env
cd ..
```

### 3. Run Development Servers
```bash
# Start backend on http://localhost:5000
npm run dev:backend

# Start frontend on http://localhost:5173
npm run dev:frontend
```

---

## 📚 Project Structure

```
safemap/
├── backend/          # Express + TypeScript + Socket.IO + Mongoose
│   ├── src/config/   # Zod env validation and DB connector
│   ├── src/models/   # 11 Mongoose schema collections
│   ├── src/routes/   # Health and API route endpoints
│   └── src/server.ts # Main HTTP + WebSocket entry point
├── frontend/         # React 18 + Vite + Tailwind CSS + Lucide Icons
│   ├── src/components/ui/     # Reusable design system foundation
│   ├── src/components/layout/ # Navbar, Sidebar, AppShell
│   ├── src/pages/             # HomePage, NotFound, ErrorBoundary
│   └── src/App.tsx            # Routing & Provider setup
└── docs/             # Full hackathon blueprints & API specs
```

---

## 📡 API Health Endpoint
```
GET http://localhost:5000/api/v1/health
```
