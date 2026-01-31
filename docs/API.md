# REdI Quiz Platform - API Reference

**Base URL**: `/api`
**Version**: 1.0.0
**Content-Type**: `application/json` (unless noted otherwise)

---

## Authentication

All authenticated endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are obtained via login or registration. Access tokens expire after 1 hour;
use the refresh endpoint to obtain a new pair.

### Roles

| Role     | Description                                      |
| -------- | ------------------------------------------------ |
| `USER`   | Standard user — can take quizzes, view own data  |
| `EDITOR` | Can create/manage question banks and questions    |
| `ADMIN`  | Full access including user management and admin panel |

---

## Response Format

All responses follow a consistent envelope:

**Success**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": { ... }
  }
}
```

**Paginated List**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 42,
    "totalPages": 3
  }
}
```

---

## Error Codes

| Code                     | HTTP | Description                          |
| ------------------------ | ---- | ------------------------------------ |
| `VALIDATION_ERROR`       | 400  | Invalid request body or parameters   |
| `AUTHENTICATION_ERROR`   | 401  | Missing or invalid JWT token         |
| `AUTHORIZATION_ERROR`    | 403  | Insufficient permissions             |
| `NOT_FOUND`              | 404  | Resource does not exist              |
| `RATE_LIMIT_EXCEEDED`    | 429  | Too many requests                    |
| `INTERNAL_SERVER_ERROR`  | 500  | Unexpected server error              |
| `ACCOUNT_LOCKED`         | 429  | Account temporarily locked after failed logins |

---

## Endpoints

### Health & Info

#### `GET /health`

Returns server health status. **Public.**

```json
// Response 200
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-30T12:00:00.000Z",
    "version": "1.0.0"
  }
}
```

#### `GET /`

Returns API metadata. **Public.**

```json
// Response 200
{
  "success": true,
  "data": {
    "name": "REdI Quiz Platform API",
    "version": "1.0.0",
    "description": "Resuscitation EDucation Initiative Online Assessment System"
  }
}
```

---

### Authentication (`/auth`)

#### `POST /auth/register`

Register a new user account. **Public.** Rate limited.

```json
// Request
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "firstName": "Jane",
  "surname": "Doe",
  "idNumber": "EMP-001"          // optional
}

// Response 201
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "Jane",
      "surname": "Doe",
      "role": "USER",
      "isActive": true
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
}
```

| Field       | Type   | Required | Constraints                        |
| ----------- | ------ | -------- | ---------------------------------- |
| email       | string | yes      | Valid email, allowed domain        |
| password    | string | yes      | 8–128 chars, complexity rules      |
| firstName   | string | yes      | 1–100 chars, letters/spaces/hyphens/apostrophes |
| surname     | string | yes      | 1–100 chars, letters/spaces/hyphens/apostrophes |
| idNumber    | string | no       | 1–50 chars                         |

#### `POST /auth/login`

Authenticate with email and password. **Public.** Rate limited.

```json
// Request
{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}

// Response 200
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
}
```

After 5 consecutive failed attempts, the account is locked for 15 minutes.

#### `POST /auth/refresh`

Exchange a refresh token for a new token pair. **Public.**

```json
// Request
{ "refreshToken": "eyJ..." }

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
}
```

#### `POST /auth/logout`

Invalidate the current session. **Authenticated.**

```json
// Response 200
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

#### `POST /auth/forgot-password`

Request a password reset email. **Public.** Rate limited.

Always returns 200 regardless of whether the email exists (prevents enumeration).

```json
// Request
{ "email": "user@example.com" }

// Response 200
{
  "success": true,
  "data": { "message": "If this email is registered, a reset link has been sent" }
}
```

#### `POST /auth/reset-password`

Complete a password reset using the emailed token. **Public.**

```json
// Request
{
  "token": "abc123...",
  "password": "NewSecureP@ss456"
}

// Response 200
{
  "success": true,
  "data": { "message": "Password reset successful" }
}
```

#### `POST /auth/token-login`

Login or register via an invite token. **Public.** Rate limited.

```json
// Request
{
  "token": "hex-invite-token-string",
  "password": "OptionalP@ss123"   // required for new users
}

// Response 200
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600
  }
}
```

---

### Users (`/users`)

#### `GET /users/me`

Get current user's profile. **Authenticated.**

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Jane",
    "surname": "Doe",
    "idNumber": "EMP-001",
    "role": "USER",
    "isActive": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-30T00:00:00Z"
  }
}
```

#### `PATCH /users/me`

Update current user's profile. **Authenticated.**

```json
// Request (all fields optional)
{
  "firstName": "Janet",
  "surname": "Smith",
  "idNumber": "EMP-002"
}
```

#### `PATCH /users/me/password`

Change current user's password. **Authenticated.**

```json
// Request
{
  "currentPassword": "OldP@ss123",
  "newPassword": "NewP@ss456"
}
```

#### `GET /users`

List all users. **Admin only.**

| Query Parameter | Type    | Default | Description            |
| --------------- | ------- | ------- | ---------------------- |
| page            | integer | 1       | Page number (min: 1)   |
| pageSize        | integer | 20      | Items per page (1–100) |
| search          | string  | —       | Search name/email      |
| role            | string  | —       | USER, EDITOR, or ADMIN |
| isActive        | string  | —       | "true" or "false"      |

#### `GET /users/:id`

Get user by ID. **Admin only.**

#### `POST /users`

Create a new user. **Admin only.**

```json
// Request
{
  "email": "new@example.com",
  "password": "SecureP@ss123",
  "firstName": "New",
  "surname": "User",
  "role": "EDITOR",        // optional, defaults to USER
  "idNumber": "EMP-003"    // optional
}
```

#### `PATCH /users/:id`

Update a user. **Admin only.** Admins cannot deactivate themselves or change their own role through this endpoint.

```json
// Request (all fields optional)
{
  "firstName": "Updated",
  "surname": "Name",
  "role": "ADMIN",
  "isActive": false,
  "idNumber": "EMP-004"
}
```

#### `DELETE /users/:id`

Soft-delete (deactivate) a user. **Admin only.**

#### `POST /users/:id/reset-password`

Admin-initiated password reset. **Admin only.**

```json
// Request
{ "password": "NewP@ss123" }
```

---

### Question Banks (`/question-banks`)

#### `GET /question-banks`

List question banks visible to the current user. **Authenticated.**

- Users: own banks only
- Editors: own banks
- Admins: all banks

| Query Parameter | Type    | Default | Description                 |
| --------------- | ------- | ------- | --------------------------- |
| page            | integer | 1       | Page number                 |
| pageSize        | integer | 20      | Items per page (1–100)      |
| search          | string  | —       | Search title/description    |
| status          | string  | —       | DRAFT, OPEN, PUBLIC, ARCHIVED |

#### `GET /question-banks/:id`

Get question bank with questions. **Authenticated.**

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Emergency Medicine Quiz",
    "description": "Test your EM knowledge",
    "status": "OPEN",
    "timeLimit": 1800,
    "randomQuestions": true,
    "randomAnswers": true,
    "passingScore": 70,
    "feedbackTiming": "AFTER_COMPLETION",
    "questionCount": 20,
    "maxAttempts": 3,
    "notificationEmail": "admin@hospital.org",
    "questions": [ ... ],
    "createdBy": { "id": "uuid", "firstName": "Dr.", "surname": "Smith" },
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-30T00:00:00Z"
  }
}
```

#### `POST /question-banks`

Create a question bank. **Editor or Admin.**

```json
// Request
{
  "title": "Emergency Medicine Quiz",
  "description": "Test your EM knowledge",
  "status": "DRAFT",
  "timeLimit": 1800,
  "randomQuestions": true,
  "randomAnswers": true,
  "passingScore": 70,
  "feedbackTiming": "AFTER_COMPLETION",
  "questionCount": 20,
  "maxAttempts": 3,
  "notificationEmail": "admin@hospital.org"
}
```

| Field             | Type    | Required | Constraints                              |
| ----------------- | ------- | -------- | ---------------------------------------- |
| title             | string  | yes      | 1–200 chars                              |
| description       | string  | no       | Max 2000 chars                           |
| status            | string  | no       | DRAFT, OPEN, PUBLIC, ARCHIVED            |
| timeLimit         | integer | no       | 0–7200 seconds (0 = no limit)            |
| randomQuestions    | boolean | no       | Shuffle question order                   |
| randomAnswers     | boolean | no       | Shuffle answer options                   |
| passingScore      | integer | no       | 0–100 percent                            |
| feedbackTiming    | string  | no       | IMMEDIATE, AFTER_COMPLETION, NEVER       |
| questionCount     | integer | no       | 1–500 (subset of total)                  |
| maxAttempts       | integer | no       | 0–100 (0 = unlimited)                    |
| notificationEmail | string  | no       | Valid email for completion notifications  |

#### `PATCH /question-banks/:id`

Update a question bank. **Owner or Admin.** Same fields as create (all optional).

#### `DELETE /question-banks/:id`

Delete a question bank and all its questions/attempts. **Editor or Admin, owner or Admin.**

#### `POST /question-banks/:id/duplicate`

Duplicate a question bank with all questions. **Editor or Admin, owner or Admin.**

#### `GET /question-banks/:id/export`

Export a question bank as JSON. **Authenticated with access.**

#### `POST /question-banks/import`

Import a question bank from JSON. **Editor or Admin.**

The request body should be the JSON structure from the export endpoint.

---

### Questions

#### `GET /question-banks/:bankId/questions`

List all questions in a bank. **Authenticated with bank access.**

#### `POST /question-banks/:bankId/questions`

Create a question. **Bank owner or Admin.**

```json
// Example: Multiple Choice (Single)
{
  "type": "MULTIPLE_CHOICE_SINGLE",
  "prompt": "<p>What is the first drug in cardiac arrest?</p>",
  "options": {
    "choices": [
      { "id": "a", "text": "Adrenaline", "isCorrect": true },
      { "id": "b", "text": "Amiodarone", "isCorrect": false },
      { "id": "c", "text": "Atropine", "isCorrect": false }
    ]
  },
  "correctAnswer": { "optionId": "a" },
  "feedback": "<p>Adrenaline 1mg IV is the first-line drug.</p>",
  "referenceLink": "https://www.resus.org.uk/guidelines"
}
```

Supported question types:

| Type                      | Description                           |
| ------------------------- | ------------------------------------- |
| `MULTIPLE_CHOICE_SINGLE`  | Single correct answer from options    |
| `MULTIPLE_CHOICE_MULTI`   | Multiple correct answers, fractional scoring |
| `TRUE_FALSE`              | True or false selection               |
| `DRAG_ORDER`              | Drag items into correct sequence      |
| `IMAGE_MAP`               | Click on correct region of an image   |
| `SLIDER`                  | Select a numeric value with tolerance |

#### `GET /questions/:id`

Get a single question. **Authenticated with bank access.**

#### `PATCH /questions/:id`

Update a question. **Bank owner or Admin.**

#### `DELETE /questions/:id`

Delete a question. **Bank owner or Admin.**

#### `POST /questions/:id/duplicate`

Duplicate a question within the same bank. **Bank owner or Admin.**

#### `PATCH /question-banks/:bankId/questions/reorder`

Reorder questions. **Bank owner or Admin.**

```json
// Request
{
  "questionIds": ["uuid-1", "uuid-3", "uuid-2"]
}
```

---

### File Uploads (`/uploads`)

#### `POST /uploads/images`

Upload an image file. **Editor or Admin.** Rate limited.

**Request:** Multipart form data with `image` field.

Accepted types: JPEG, PNG, GIF, WebP, SVG
Max size: Configured via `MAX_UPLOAD_SIZE_MB` (default 10MB)

```json
// Response 201
{
  "success": true,
  "data": {
    "filename": "1706612345678-abc123.png",
    "url": "/uploads/1706612345678-abc123.png",
    "size": 204800,
    "mimetype": "image/png"
  }
}
```

#### `DELETE /uploads/images/:filename`

Delete an uploaded image. **Editor or Admin.**

---

### Quiz Delivery (`/quizzes`)

#### `POST /quizzes/:bankId/start`

Start a new quiz attempt. **Authenticated.**

Validates: bank exists and is OPEN/PUBLIC, user hasn't exceeded max attempts.

```json
// Response 201
{
  "success": true,
  "data": {
    "attemptId": "uuid",
    "questions": [ ... ],
    "timeLimit": 1800,
    "bankTitle": "Emergency Medicine Quiz"
  }
}
```

---

### Quiz Attempts (`/attempts`)

#### `GET /attempts/mine`

List current user's quiz attempts. **Authenticated.**

| Query Parameter | Type    | Default | Description              |
| --------------- | ------- | ------- | ------------------------ |
| bankId          | UUID    | —       | Filter by question bank  |
| page            | integer | 1       | Page number              |
| pageSize        | integer | 50      | Items per page (1–100)   |

#### `GET /attempts/:id`

Get attempt details with current responses. **Attempt owner.**

#### `PATCH /attempts/:id`

Save progress (auto-save). **Attempt owner.**

```json
// Request
{
  "responses": {
    "question-uuid-1": { "optionId": "a" },
    "question-uuid-2": { "value": true }
  },
  "timeSpent": 120
}
```

#### `POST /attempts/:id/submit`

Submit the attempt for scoring. **Attempt owner.**

```json
// Response 200
{
  "success": true,
  "data": {
    "score": 17,
    "maxScore": 20,
    "percentage": 85,
    "passed": true,
    "bankTitle": "Emergency Medicine Quiz"
  }
}
```

#### `GET /attempts/:id/results`

Get detailed results with feedback. **Attempt owner.** Only available after submission.

---

### Admin (`/admin`)

All admin endpoints require the `ADMIN` role.

#### `GET /admin/stats`

Get platform-wide statistics.

```json
// Response 200
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "activeUsers": 142,
    "totalBanks": 25,
    "activeBanks": 18,
    "totalAttempts": 1200,
    "completedAttempts": 980,
    "completionRate": 82,
    "averageScore": 73.5,
    "passRate": 68
  }
}
```

#### `GET /admin/completions`

List quiz completion records with filtering.

| Query Parameter | Type    | Default | Description              |
| --------------- | ------- | ------- | ------------------------ |
| bankId          | UUID    | —       | Filter by question bank  |
| userId          | UUID    | —       | Filter by user           |
| dateFrom        | ISO8601 | —       | Start date               |
| dateTo          | ISO8601 | —       | End date                 |
| passed          | boolean | —       | Filter pass/fail         |
| page            | integer | 1       | Page number              |
| pageSize        | integer | 20      | Items per page (1–100)   |

#### `GET /admin/completions/export`

Export completions as CSV. Same filters as list endpoint.

Response `Content-Type: text/csv` with formula injection protection.

#### `GET /admin/logs`

List audit log entries.

| Query Parameter | Type    | Default | Description              |
| --------------- | ------- | ------- | ------------------------ |
| action          | string  | —       | Filter by action type    |
| entityType      | string  | —       | Filter by entity type    |
| userId          | UUID    | —       | Filter by user           |
| dateFrom        | ISO8601 | —       | Start date               |
| dateTo          | ISO8601 | —       | End date                 |
| page            | integer | 1       | Page number              |
| pageSize        | integer | 20      | Items per page (1–100)   |

#### `POST /admin/invite-tokens`

Create an invite token and send an email.

```json
// Request
{
  "email": "newuser@hospital.org",
  "firstName": "New",
  "surname": "Doctor",
  "bankId": "uuid",           // optional — links to specific quiz
  "expiresInDays": 14         // optional — 1–90, default 7
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "token": "hex-string",
    "email": "newuser@hospital.org",
    "firstName": "New",
    "surname": "Doctor",
    "bankTitle": "Emergency Medicine Quiz",
    "expiresAt": "2026-02-13T00:00:00Z",
    "usedAt": null,
    "createdAt": "2026-01-30T00:00:00Z"
  }
}
```

The plaintext token is only returned at creation time. It is stored hashed (SHA-256).

#### `GET /admin/invite-tokens`

List invite tokens. Token values are truncated for display.

| Query Parameter | Type    | Default | Description              |
| --------------- | ------- | ------- | ------------------------ |
| page            | integer | 1       | Page number              |
| pageSize        | integer | 20      | Items per page (1–100)   |

---

## Rate Limits

| Endpoint Group      | Limit            | Window  |
| ------------------- | ---------------- | ------- |
| Authentication      | 10 requests      | 15 min  |
| Password Reset      | 3 requests       | 15 min  |
| File Uploads        | 20 requests      | 15 min  |
| General API         | 100 requests     | 15 min  |

Rate limit headers are included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Security Notes

- All passwords are hashed with bcrypt (cost factor 12)
- Invite tokens are hashed with SHA-256 before storage
- Password reset tokens expire after 1 hour
- Account lockout after 5 failed login attempts (15-minute duration)
- HTML content in questions is sanitized server-side with DOMPurify
- CSV exports are protected against formula injection
- CORS is configured to allow only the frontend origin
- Helmet security headers (CSP, HSTS, X-Frame-Options) are applied
- Request bodies are limited to 10MB
