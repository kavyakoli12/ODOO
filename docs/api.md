# SafeMap — API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

---

## 1. Authentication & RBAC (`/auth`)

### 1.1 Citizen Registration
Register a new citizen account. Public registration is strictly restricted to the `citizen` role.

* **Method:** `POST`
* **Route:** `/auth/register`
* **Authentication:** None (Public)
* **Rate Limit:** 10 requests per hour per IP
* **Request Body:**
```json
{
  "name": "Jane Citizen",
  "email": "citizen@demo.com",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```
* **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Account registered successfully",
  "user": {
    "id": "6aabd905b6c958ad8e35f6d7",
    "name": "Jane Citizen",
    "email": "citizen@demo.com",
    "role": "citizen",
    "isActive": true,
    "isEmailVerified": true,
    "createdAt": "2026-09-17T12:11:49.489Z",
    "updatedAt": "2026-09-17T12:11:49.489Z"
  },
  "accessToken": "eyJhbGciOi..."
}
```
* **Cookie Set:** `refreshToken` (HTTP-only, Secure in prod, SameSite, 7 days)
* **Error Responses:**
  * `400 Bad Request` — Validation error (e.g. passwords do not match, password too short)
  * `409 Conflict` — An account with this email address already exists
  * `429 Too Many Requests` — Rate limit exceeded

---

### 1.2 User Login
Authenticate using email and password.

* **Method:** `POST`
* **Route:** `/auth/login`
* **Authentication:** None (Public)
* **Rate Limit:** 10 requests per 15 minutes per IP
* **Request Body:**
```json
{
  "email": "citizen@demo.com",
  "password": "Demo@1234"
}
```
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "6aabd905b6c958ad8e35f6d7",
    "name": "Jane Citizen",
    "email": "citizen@demo.com",
    "role": "citizen",
    "isActive": true,
    "isEmailVerified": true,
    "lastLogin": "2026-09-17T12:12:00.661Z"
  },
  "accessToken": "eyJhbGciOi..."
}
```
* **Cookie Set:** `refreshToken` (HTTP-only, 7 days)
* **Error Responses:**
  * `400 Bad Request` — Missing or malformed email/password
  * `401 Unauthorized` — Invalid email or password
  * `403 Forbidden` — User account disabled
  * `423 Locked` — Account temporarily locked for 30 minutes due to 5+ failed attempts

---

### 1.3 Refresh Access Token
Silently issue a fresh 15-minute access token using the HTTP-only refresh cookie.

* **Method:** `POST`
* **Route:** `/auth/refresh`
* **Authentication:** Requires `refreshToken` cookie
* **Success Response (200 OK):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOi...",
  "user": {
    "id": "6aabd905b6c958ad8e35f6d7",
    "name": "Jane Citizen",
    "email": "citizen@demo.com",
    "role": "citizen"
  }
}
```
* **Error Responses:**
  * `401 Unauthorized` — Missing, expired, or invalid refresh token

---

### 1.4 User Logout
Clear authentication session and refresh cookie.

* **Method:** `POST`
* **Route:** `/auth/logout`
* **Authentication:** None required
* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

---

### 1.5 Get Current User Profile (`/auth/me`)
Retrieve safe account information for the currently authenticated user.

* **Method:** `GET`
* **Route:** `/auth/me`
* **Authentication:** `Bearer <accessToken>`
* **Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "6aabd905b6c958ad8e35f6d7",
    "name": "Jane Citizen",
    "email": "citizen@demo.com",
    "role": "citizen",
    "isActive": true,
    "isEmailVerified": true
  }
}
```
* **Error Responses:**
  * `401 Unauthorized` — Missing or invalid Bearer token
  * `403 Forbidden` — Account deactivated

---

### 1.6 Provision Officer Account (Admin Only)
Create a law enforcement officer account with badge number and department.

* **Method:** `POST`
* **Route:** `/auth/officers`
* **Authentication:** `Bearer <accessToken>`
* **Role Requirement:** `admin`
* **Request Body:**
```json
{
  "name": "Officer Alex Miller",
  "email": "officer@demo.com",
  "password": "Password123",
  "badgeNumber": "LE-9042",
  "department": "Metropolitan Police Dept"
}
```
* **Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Law enforcement officer account created successfully.",
  "user": {
    "id": "...",
    "name": "Officer Alex Miller",
    "email": "officer@demo.com",
    "role": "officer",
    "badgeNumber": "LE-9042",
    "department": "Metropolitan Police Dept"
  }
}
```
* **Error Responses:**
  * `401 Unauthorized` — Unauthenticated
  * `403 Forbidden` — Requester is not an `admin` (e.g. citizen)
  * `409 Conflict` — Email already in use
