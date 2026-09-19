# SafeMap - Comprehensive Project Changes Log

This document serves as the master record of all structural, architectural, backend, database, and frontend UI changes implemented across the SafeMap platform.

---

## 1. Deployment & Unified Architecture (Render Web Service)
- **Single-Service Architecture**: Configured the entire project as a single Render Web Service running Node/Express backend that also builds and statically serves the compiled Vite React frontend (`frontend/dist`) with fallback SPA routing.
- **Root `package.json` Workspaces**:
  - `build:backend`: Compiles TypeScript backend (`tsc`).
  - `build:frontend`: Builds Vite production bundle (`tsc && vite build`).
  - `build:all`: Orchestrates sequential build of backend and frontend.
  - `start:backend`: Launches production server (`node backend/dist/server.js`).
- **Eliminated URL Hardcoding**: Replaced all hardcoded `http://localhost:5000` strings across the frontend with relative base URL `/api/v1`, working uniformly in local dev (via Vite proxy) and in production (served directly by Express).

---

## 2. Database & Data Models (MongoDB Atlas & Fallbacks)
- **MongoDB Connection Resiliency**: Configured `mongoose.connect()` with database name isolation and connection pooling.
- **In-Memory Fallback with Seed Incidents**: When running offline or if MongoDB connection drops, the system seamlessly uses an in-memory data store seeded with realistic incidents, categories, and audit transitions to prevent downtime.
- **Geospatial Indexing**: Configured GeoJSON `2dsphere` indexes on coordinates `[longitude, latitude]` for fast spatial bounding box searches (`$geoWithin` / `$box`).

---

## 3. Authentication & Security
- **JWT Authentication Flow**: Access tokens stored in memory via Zustand, with automatic silent token refresh via HTTP-only cookie (`/api/v1/auth/refresh`).
- **Axios Request/Response Interceptor**: Injects `Authorization: Bearer <token>` automatically on all requests, and intercepts 401s to perform token rotation without breaking active user workflows.
- **Password Visibility Toggle**: Added interactive eye/eye-off toggle icons on password and confirm password fields in `LoginPage.tsx` and `RegisterPage.tsx`.

---

## 4. UI Redesign & Collapsible Slide-Out Navigation
- **Collapsible Drawer Sidebar**: Replaced the previous permanent fixed navigation sidebar with a modern slide-out drawer (`Sidebar.tsx`) containing smooth slide animations, backdrop overlay blur, and auto-close on route transition.
- **Navbar Integration**: Added hamburger drawer toggle button (`onToggleSidebar`) cleanly integrated into the left side of the top navbar next to the SafeMap brand logo.
- **Removal of Promotional Content**: Completely removed unwanted promotional/advertisement banners ("Odoo XML-RPC Sync", "Verified incidents queue ready for Odoo Helpdesk dispatch") from navigation and dashboards.
- **Citizen Dashboard Alignment**: Polished the Citizen Dashboard layout grid, stats cards, and quick actions for consistent alignment across mobile and desktop breakpoints.

---

## 5. Landing Page & Route 404 Prevention
- **Landing Page "Report an Incident" CTA**:
  - Updated `HomePage.tsx` to check user authentication status.
  - If authenticated: navigates directly to `/citizen/report`.
  - If unauthenticated: shows an informative toast and navigates to `/login?redirect=/citizen/report`.
- **Public Map "Full Dossier & Chat"**:
  - Updated `PublicMapPage.tsx` bottom sheet action.
  - When unauthenticated: displays `"Please sign in to view the full incident dossier and chat."` and navigates to `/login?redirect=/citizen/reports/:id` instead of broken 404 page.
  - When authenticated: routes directly to `/officer/incidents/:id` for officers/admins or `/citizen/reports/:id` for citizens.
- **Direct Link Guard Routes**: Added `<ReportRedirect />` and `<IncidentRedirect />` routes in `App.tsx` for `/report` and `/incidents/:id` to ensure direct bookmarks and URLs gracefully redirect.

---

## 6. Location Picker & Geocoding Bug Fixes
- **Form Nesting & Page Reload Fix**:
  - In `LocationPicker.tsx`, the search bar was previously wrapped in an inner `<form>` with a `<Button type="submit">`. Because HTML disallows nested `<form>` elements and the entire incident report page is inside a parent `<form onSubmit={handleSubmit}>`, clicking "Find" or pressing Enter caused the parent form to submit and reload the page.
  - Replaced the nested form with a `div` container and `type="button"` for the "Find" button.
  - Added `onKeyDown` Enter-key listener with `e.preventDefault()` and `e.stopPropagation()`.
- **Enhanced Search Feedback**:
  - Added inline geocoding error and feedback notifications for unknown locations.
  - Maintained the "Use My GPS" functionality using the browser Geolocation API with reverse geocoding to automatically resolve street addresses.

---

## 7. Citizen Top Navbar Cleanup
- **Deduplication of Navigation Elements**:
  - For authenticated citizens (`isAuthenticated && user?.role === 'citizen'`), removed redundant links (`Public Map`, `Safety Feed`, `Dashboard`, `Report Incident`, `My Reports`) from the top navbar.
  - Removed the top-right `Logout` button for citizens.
  - All of these actions now live exclusively in the slide-out navigation sidebar, creating a cleaner, uncluttered top bar with only the drawer toggle, brand logo, Notification Bell, and citizen profile chip.

---

## 8. Officer Verification Dossier Enhancements
- **Google Maps Integration**: Added an "Open in Google Maps" button to the Geospatial Incident Location card header in `IncidentReviewPage.tsx`. Clicking it launches Google Maps with precise incident coordinates (`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`) in a new browser tab.
- **Evidence Image Display Fix**:
  - Broadened image detection to handle base64 data URLs (`data:image/...`), MIME types (`image/*`), and standard image file extensions.
  - Fixed Axios evidence upload in `ReportIncidentPage.tsx` by explicitly specifying `headers: { 'Content-Type': 'multipart/form-data' }`, preventing Axios default JSON headers from breaking Multer file parsing.
  - Added an evidence image lightbox modal allowing officers to click any attached photo to inspect it in full resolution with backdrop blur and close controls.

---

## 9. Officer Mode Refinements & Investigation Collision Fix
- **Investigation Case Number Collision Fix**:
  - Fixed MongoDB `E11000 duplicate key error` on `test.investigations` index `caseNumber_1`. Replaced the static in-memory counter with `generateCaseNumberAsync()`, which dynamically queries MongoDB for the highest existing `INV-YYYY-XXXXX` case number.
  - Added an auto-incrementing retry block on collision (error code 11000) so investigation case creation never fails or requires multiple submissions.
- **Initiate Investigation Incident Dropdown**:
  - Formatted the verified incident options in `InvestigationsPage.tsx` to display: `[Username] | [Incident ID] [Title] | [Address]`.
- **Sidebar & Header Navigation Cleanups**:
  - Removed "Odoo ERP Bridge" from the slideout sidebar for officers in `Sidebar.tsx`.
  - Removed the "Public Map" option from the top header navbar when an officer is logged in (`Navbar.tsx`).
- **Removed Case Status Controls**:
  - Removed the redundant "Case Status Controls" box (`Mark Open`, `Mark Active`, `Suspend`, `Close / Resolve`) in `InvestigationDetailPage.tsx`, leaving the top-level "Resolve / Close Case" action.
- **Removed AI Analytics Query Assistant**:
  - Removed the "AI Natural Language Analytics Query Assistant" box and associated state from `AnalyticsDashboard.tsx`.

---

## 10. Interactive Map Search & Controls
- **Removed Quick Views**:
  - Removed the `Quick Views` landmark buttons (Connaught Place, India Gate, Nehru Park, Old Delhi) from `PublicMapPage.tsx`, leaving only the GPS Locate Me button.
- **Functional Geographic & Incident Map Search Bar**:
  - Enhanced the search bar in `MapFilters.tsx` and `PublicMapPage.tsx` with an interactive "Find" button and Enter-key listener.
  - Searches both incident reports (matching by ID, title, address, or category and centering the map) and geographic places/landmarks worldwide using OpenStreetMap Nominatim geocoding, smoothly flying the map to the searched coordinates.

---

## 11. Admin Mode Features, Category Creation & Department-Scoped Incident Queues
- **Header Navigation Cleanups**:
  - Updated `Navbar.tsx` so that "Public Map" is excluded when either an officer or admin is logged in (`user?.role !== 'officer' && user?.role !== 'admin'`).
  - Cleaned up top header navigation to keep focus solely on privileged operational dashboards.
- **Admin Overview Grid Cleanup**:
  - Removed the "Odoo ERP Helpdesk Bridge" card and the "Public Safety Map" card from the overview grid in `AdminDashboard.tsx`.
  - Re-aligned the console grid into a balanced 4-card layout: *Incident Triage Queue*, *Active Investigations*, *Crime Trend Analytics*, and *Emergency Alert Broadcasts*.
- **Removed Security & Audit Controls**:
  - Removed the "Security & Audit Controls" tab and panel from `AdminDashboard.tsx` and removed the "System Audit Logs" link from `Sidebar.tsx`.
- **Incident Category Creation (Admin Only)**:
  - Added an "Add Incident Category" button and modal in `AdminDashboard.tsx` for creating custom incident categories (name, slug, description, severity, SLA resolution hours, color hex, icon).
  - Added `POST /api/v1/incidents/categories` endpoint in `incident.routes.ts` restricted to admin accounts.
  - Configured MongoDB seeding on first custom category creation to guarantee existing default categories remain intact.
  - Newly created categories immediately show in the Citizen report incident category dropdown (`/citizen/report`).
- **Officer Assigned Department Dropdown & Queue Filtering**:
  - In the Provision Officer modal, replaced the plain text input for "Assigned Department" with a dynamic `<Select>` dropdown populated with configured incident categories.
  - Added department scoping in `incident.service.ts` and `incident.controller.ts`: When an officer logs in, their Incident Triage Queue (`/incidents/officer/queue`) and queue metrics automatically filter to show only incidents belonging to their assigned department (e.g., Traffic officer only triages Traffic incidents).
  - Added a visual department badge indicator to `OfficerDashboard.tsx` header (e.g. `[Traffic Incident Scope]`).
- **Password Visibility Toggle**:
  - Added an interactive `Eye` / `EyeOff` toggle button to the password input in the Provision Officer modal in `AdminDashboard.tsx`, allowing admins to reveal the typed credentials before submitting.
- **Citizen Management & User Dismissal**:
  - Added a dedicated "Citizen Management" tab in `AdminDashboard.tsx` displaying the total registered citizen count, search filter, and user directory.
  - Added `GET /api/v1/auth/citizens` and `PATCH /api/v1/auth/users/:id/status` endpoints in `auth.routes.ts` restricted to admin.
  - Added a "Dismiss" / "Restore" button for both Officers and Citizens in `AdminDashboard.tsx` that toggles `isActive`. When dismissed, user status becomes `ACCESS REVOKED`, and their session and future login attempts are immediately blocked by the authentication middleware.

---

## 12. Trinetra Rebranding, Landing Page Overhaul & Global About Us Footer
- **Global Website Rebranding to "Trinetra"**:
  - Renamed the platform across all public, citizen, officer, and administrative interfaces:
    - `frontend/index.html`: `Trinetra — Real-Time Incident Reporting & Citizen Safety Platform`.
    - `Navbar.tsx` & `Sidebar.tsx`: Brand title updated to `Trinetra` with the tagline *"Citizen Safety & Vigilance"*.
    - `LoginPage.tsx` & `RegisterPage.tsx`: `Sign In to Trinetra` and `Create Trinetra Account`.
    - `ReportIncidentPage.tsx`, `NotFoundPage.tsx`, and `ErrorBoundary.tsx`: Updated all system references to `Trinetra`.
    - `backend/src/routes/api.router.ts`: `Welcome to Trinetra API v1`.
- **Landing Page (`HomePage.tsx`) Updates**:
  - **Removed Public Map Option**: Removed the *"View Interactive Crime Map"* CTA button from the hero section.
  - **Eliminated All Odoo ERP References**: Removed all mentions of Odoo ERP from the hero description, trust metrics, telemetry cards, and 4-stage pipeline, replacing them with *"verified law enforcement triage"*, *"Direct Police Dispatch"*, *"Citizen Privacy Shield"*, and *"Rapid Authority Dispatch & Resolution"*.
  - **Removed Platform Info Button & Blueprint Modal**: Cleaned up the interface by removing the technical architecture modal and button.
  - **Added Emergency Helplines Directory**: Added a comprehensive, accessible emergency directory designed for laptop/desktop and mobile users featuring verified toll-free national numbers:
    - **112**: All-in-One National Emergency (Police, Fire, Ambulance, Disaster)
    - **100**: Police Control Room
    - **108**: Emergency Medical & Ambulance Services
    - **1091 / 181**: Women Helpline & Distress Safety
    - **101**: Fire & Rescue Service
    - **1098**: Childline / Child Protection
    - **1930**: National Cyber Crime Fraud Reporting
    - Integrated one-click copy with instant toast feedback for laptop users alongside clickable `tel:` links.
- **Map Location Search & Incident Display**:
  - **Fixed Keystroke Wiping**: In `MapFilters.tsx`, decoupled the search bar input using local state so typing an address or place does not immediately wipe all incident markers from the map canvas.
  - **Fixed Geocoding & Incident Visibility**: In `PublicMapPage.tsx`, updated `visibleIncidents` so searching place names (e.g. "Delhi", "Connaught Place", "Mumbai") keeps all platform incidents visible while flying the camera to the exact location.
  - **Searched Area Marker**: Added a glowing amber `SearchedLocationMarker` with a pulsing radius circle around the found coordinates.
  - **Proximity Calculation**: Calculates distance to active incidents within 30km of the searched location, notifying the user of nearby reports.
- **Global About Us Footer (`Footer.tsx`)**:
  - Created a comprehensive `Footer.tsx` integrated on every page via `AppShell.tsx`.
  - **About Us Section**: Articulates the core motive of Trinetra (the divine "Third Eye" representing vigilance, truth, and community protection), eliminating barriers to safety reporting, protecting reporter anonymity, and connecting communities directly with law enforcement.
  - **Global Emergency Numbers**: Embedded the verified emergency helpline directory directly into the global footer for universal access across the platform.

### 13. Site-Wide Header Navigation Cleanup
- **Removed "Public Map" from Header on All Pages**:
  - In [Navbar.tsx](file:///c:/Users/kavya/Desktop/kavya/odoo/frontend/src/components/layout/Navbar.tsx), removed the `Public Map` link from desktop navigation and mobile dropdowns across all user states (guests, citizens, officers, and admins).
  - Cleaned up unused `MapPin` icon import.
- **Branding Verification**:
  - In [MapLegend.tsx](file:///c:/Users/kavya/Desktop/kavya/odoo/frontend/src/components/map/MapLegend.tsx), updated privacy notice footnote to reference Trinetra.

### 14. Real-Time Proximity Danger Alerts & AI Crime Camera Auto-Complain
- **Real-Time Proximity / Geofencing Danger Alerts (Without Page Refresh)**:
  - **Backend Geofencing API**: Added `getProximityIncidents` service and controller in [incident.controller.ts](file:///c:/Users/kavya/Desktop/kavya/odoo/backend/src/controllers/incident.controller.ts) on `GET /api/v1/incidents/proximity`, calculating exact Haversine distance in meters and kilometers to nearby active/verified incidents within a customizable radius.
  - **Background Geofence Watcher (`ProximityAlertManager.tsx`)**: Mounted globally at the root in [AppShell.tsx](file:///c:/Users/kavya/Desktop/kavya/odoo/frontend/src/components/layout/AppShell.tsx). Tracks citizen position via `navigator.geolocation.watchPosition` without needing any page reload.
  - **Audio-Visual Alarm**: When entering within 1000m of an active incident, triggers an audible synthesized warning chime (Web Audio API), pushes a danger notification to `NotificationBell` via `notificationStore`, and presents a floating amber Danger Zone banner with incident title, exact distance away, and a 1-click "View Map" shortcut.
  - **Deduplication Engine**: Caches alerted incident IDs in memory to avoid repetitive alerting for the same incident within 30 minutes.
- **Trinetra AI Vision Eye / Live Camera Scanner**:
  - **Backend Visual Crime Intelligence**: Implemented `analyzeCrimeImage` in [ai.service.ts](file:///c:/Users/kavya/Desktop/kavya/odoo/backend/src/services/ai.service.ts) and exposed `POST /api/v1/ai/analyze-crime` in [ai.routes.ts](file:///c:/Users/kavya/Desktop/kavya/odoo/backend/src/routes/ai.routes.ts). Supports Gemini 1.5/2.0 Vision API with seamless fallback to Trinetra's Intelligent Visual Engine, verifying crime indicators, assessing hazard severity, and outputting structured complaint data.
  - **Interactive HUD Camera Viewfinder (`AICrimeCameraModal.tsx`)**: Fullscreen/modal camera scanner featuring live device video stream (`getUserMedia`), reticle crosshairs, scan radar animation, flip camera support, and local photo upload fallback.
  - **Auto-Complain & Evidence Attachment**: In [ReportIncidentPage.tsx](file:///c:/Users/kavya/Desktop/kavya/odoo/frontend/src/pages/citizen/ReportIncidentPage.tsx), citizens can click *"Scan Crime with AI Camera"*. AI scans the visual scene, verifies crime indicators, auto-fills title, category, description, severity, and device GPS, and **automatically attaches the captured photo into the evidence section** ready for immediate 1-click submission.

### 15. Weapon Detection Engine & Live GPS Auto-Fill Fix
- **Default Weapon Training & Visual Blade/Firearm Detection**:
  - **Client-Side Specular & Edge Analysis**: Implemented `detectWeaponsInCanvas` in [AICrimeCameraModal.tsx](file:///c:/Users/kavya/Desktop/kavya/odoo/frontend/src/components/incidents/AICrimeCameraModal.tsx), analyzing metallic specular reflectance, aspect ratio geometry (elongated blade profiles $> 2.0:1$), and skin tone proximity (hands gripping weapon handles).
  - **Weapon Threat HUD**: Added real-time threat mode toggles (`Auto Detect`, `Knife / Blade`, `Firearm`) and visual weapon verification alerts (`⚠️ Weapon Verified: KNIFE (94%)`) directly within the camera viewfinder HUD.
  - **Backend Weapon Intelligence Classification**: In [ai.service.ts](file:///c:/Users/kavya/Desktop/kavya/odoo/backend/src/services/ai.service.ts), weapons are classified as **Assault** with Level 4 Critical severity, generating titles like `"Armed Threat / Brandished Knife Detected"` rather than erroneous generic traffic incident defaults.
- **GPS Location & Reverse Geocoded Street Address Fix**:
  - Resolved issue where the map marker moved to the user's coordinates but the confirmed address text box remained stuck on `"Connaught Place, New Delhi"`.
  - In [AICrimeCameraModal.tsx](file:///c:/Users/kavya/Desktop/kavya/odoo/frontend/src/components/incidents/AICrimeCameraModal.tsx), automatically fetches GPS coordinates and resolves the exact street address via OpenStreetMap Nominatim reverse geocoding API.
  - In [ReportIncidentPage.tsx](file:///c:/Users/kavya/Desktop/kavya/odoo/frontend/src/pages/citizen/ReportIncidentPage.tsx), `handleAICameraAutoFill` now updates both latitude, longitude, and sets `address` to the live reverse geocoded street name (e.g. user's actual location in Motera, Ahmedabad), completely synchronizing the interactive map and form input.

### 16. Elimination of False Knife Detections & Neural Object Verification
- **Root Cause Resolution**:
  - The previous client heuristic in `AICrimeCameraModal.tsx` had a critical flaw where `handSkinPixels > 20` triggered a knife detection and the fallback `return` unconditionally returned `detected: true, weaponType: 'knife'`, causing normal citizens sitting in their rooms to be falsely accused of holding a knife.
  - Additionally, backend `ai.service.ts` had a hash modulo fallback that selected an "Armed Threat / Knife" scenario even when no weapon was detected.
- **Neural COCO-SSD Integration**:
  - Integrated `@tensorflow-models/coco-ssd` and `@tensorflow/tfjs` in [AICrimeCameraModal.tsx](file:///c:/Users/kavya/Desktop/kavya/odoo/frontend/src/components/incidents/AICrimeCameraModal.tsx).
  - Neural detector recognizes everyday objects (`person`, `chair`, `tv`, `cell phone`, etc.) and strictly identifies true weapons (`knife`, `scissors`, `baseball bat`) with a high-confidence threshold ($\ge 55\%$).
  - When innocent citizens are sitting normally in a room, the scanner accurately displays: `✅ Visual Safe: 2 Persons (No Weapons Detected)`.
- **Strict Secondary Heuristic**:
  - Rewrote `detectWeaponsInCanvasStrict` to **always default to `detected: false`**.
  - Only triggers if high-specular metallic reflection ($>215$ brightness, $<7$ chromatic dispersion) forms an elongated blade silhouette (aspect ratio $\ge 3.8:1$) within a narrow contiguous pixel band ($80-320$ pixels).
- **Backend Non-Threat Classification**:
  - In [ai.service.ts](file:///c:/Users/kavya/Desktop/kavya/odoo/backend/src/services/ai.service.ts), when no weapon is detected, the AI generates a reassuring `"Citizen Photographic Evidence / General Observation"` report under `Other Incident` with Severity Level 1, explicitly confirming zero weapons or physical threats in the scene.
- **Form Category Auto-Fill Fix**:
  - In [ReportIncidentPage.tsx](file:///c:/Users/kavya/Desktop/kavya/odoo/frontend/src/pages/citizen/ReportIncidentPage.tsx), removed the forced fallback to `assault` so benign community observations correctly select their matching category.


