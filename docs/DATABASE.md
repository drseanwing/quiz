# REdI Quiz Platform - Database Documentation

## Overview

- **Engine**: PostgreSQL 16
- **ORM**: Prisma 6
- **Migrations**: Prisma Migrate (single init migration)
- **Naming**: snake_case tables/columns, camelCase in application code via `@map()`

---

## Entity Relationship Diagram

```
  ┌──────────┐      ┌───────────────┐      ┌────────────┐
  │  users   │──1:N─│question_banks │──1:N─│ questions  │
  └──────────┘      └───────────────┘      └────────────┘
       │                    │
       │1:N                 │1:N
       ▼                    ▼
  ┌──────────────┐   ┌──────────────┐
  │quiz_attempts │   │invite_tokens │
  └──────────────┘   └──────────────┘
       │
       │1:N
       ▼
  ┌──────────────┐
  │ email_logs   │
  └──────────────┘

  users ──1:N── audit_logs
  users ──1:N── password_resets
```

---

## Enums

### UserRole
| Value    | Description                                  |
| -------- | -------------------------------------------- |
| `USER`   | Standard user — can take quizzes             |
| `EDITOR` | Can create/edit question banks and questions  |
| `ADMIN`  | Full access — user management, system config |

### QuestionBankStatus
| Value      | Description                                  |
| ---------- | -------------------------------------------- |
| `DRAFT`    | Only visible to owner and admins             |
| `OPEN`     | Visible to all authenticated users           |
| `PUBLIC`   | Open to all (future use)                     |
| `ARCHIVED` | Hidden from listings, read-only              |

### FeedbackTiming
| Value       | Description                                |
| ----------- | ------------------------------------------ |
| `IMMEDIATE` | Show feedback after each question          |
| `END`       | Show feedback only on results page         |
| `NONE`      | Never show feedback                        |

### QuestionType
| Value                   | Description                          |
| ----------------------- | ------------------------------------ |
| `MULTIPLE_CHOICE_SINGLE`| Single correct answer from options   |
| `MULTIPLE_CHOICE_MULTI` | Multiple correct answers (checkboxes)|
| `TRUE_FALSE`            | True or false                        |
| `DRAG_ORDER`            | Drag items into correct order        |
| `IMAGE_MAP`             | Click on correct region of an image  |
| `SLIDER`                | Select a numeric value on a range    |

### AttemptStatus
| Value         | Description                              |
| ------------- | ---------------------------------------- |
| `IN_PROGRESS` | Quiz started but not yet submitted       |
| `COMPLETED`   | Quiz submitted and scored                |
| `TIMED_OUT`   | Timer expired, auto-submitted            |
| `ABANDONED`   | Left incomplete (future cleanup target)  |

---

## Tables

### users

Primary user account table. Supports soft-delete via `is_active` flag.

| Column         | Type        | Nullable | Default     | Description                    |
| -------------- | ----------- | -------- | ----------- | ------------------------------ |
| `id`           | UUID        | No       | `uuid()`    | Primary key                    |
| `email`        | VARCHAR     | No       | —           | Unique email address           |
| `password_hash`| VARCHAR     | No       | —           | bcrypt hash (cost 12)          |
| `first_name`   | VARCHAR     | No       | —           | User's first name              |
| `surname`      | VARCHAR     | No       | —           | User's surname                 |
| `id_number`    | VARCHAR     | Yes      | —           | Optional employee ID           |
| `role`         | UserRole    | No       | `USER`      | Authorization role             |
| `is_active`    | BOOLEAN     | No       | `true`      | Soft-delete flag               |
| `created_at`   | TIMESTAMPTZ | No       | `now()`     | Account creation time          |
| `updated_at`   | TIMESTAMPTZ | No       | auto        | Last update time               |
| `last_login_at`| TIMESTAMPTZ | Yes      | —           | Most recent login              |

**Indexes**: `email` (unique), `role`, `is_active`

**Relations**: Has many `question_banks`, `quiz_attempts`, `audit_logs`, `password_resets`

---

### question_banks

Quiz configuration container. Owns questions and tracks quiz settings.

| Column              | Type               | Nullable | Default  | Description                        |
| ------------------- | ------------------ | -------- | -------- | ---------------------------------- |
| `id`                | UUID               | No       | `uuid()` | Primary key                        |
| `title`             | VARCHAR            | No       | —        | Bank title                         |
| `description`       | VARCHAR            | Yes      | —        | Optional description               |
| `status`            | QuestionBankStatus | No       | `DRAFT`  | Visibility status                  |
| `time_limit`        | INT                | No       | `0`      | Time limit in seconds (0=no limit) |
| `random_questions`  | BOOLEAN            | No       | `true`   | Randomize question order           |
| `random_answers`    | BOOLEAN            | No       | `true`   | Randomize answer options           |
| `passing_score`     | INT                | No       | `80`     | Passing percentage threshold       |
| `feedback_timing`   | FeedbackTiming     | No       | `END`    | When to show feedback              |
| `notification_email`| VARCHAR            | Yes      | —        | Email for completion notifications |
| `question_count`    | INT                | No       | `10`     | Questions per attempt              |
| `max_attempts`      | INT                | No       | `0`      | Max attempts per user (0=unlimited)|
| `created_by_id`     | UUID               | No       | —        | FK to users.id                     |
| `created_at`        | TIMESTAMPTZ        | No       | `now()`  | Creation time                      |
| `updated_at`        | TIMESTAMPTZ        | No       | auto     | Last update time                   |

**Indexes**: `status`, `created_by_id`, `created_at`

**Relations**: Belongs to `users` (creator), has many `questions`, `quiz_attempts`, `invite_tokens`

---

### questions

Individual question within a question bank. Uses JSON columns for type-specific data.

| Column          | Type         | Nullable | Default  | Description                          |
| --------------- | ------------ | -------- | -------- | ------------------------------------ |
| `id`            | UUID         | No       | `uuid()` | Primary key                          |
| `bank_id`       | UUID         | No       | —        | FK to question_banks.id              |
| `type`          | QuestionType | No       | —        | Question type discriminator          |
| `prompt`        | TEXT         | No       | —        | Question text (HTML)                 |
| `prompt_image`  | VARCHAR      | Yes      | —        | Optional image URL for prompt        |
| `options`       | JSONB        | No       | —        | Type-specific options (see below)    |
| `correct_answer`| JSONB        | No       | —        | Type-specific correct answer         |
| `feedback`      | TEXT         | No       | —        | Explanation text (HTML)              |
| `feedback_image`| VARCHAR      | Yes      | —        | Optional image URL for feedback      |
| `reference_link`| VARCHAR      | Yes      | —        | Link to reference material           |
| `order`         | INT          | No       | `0`      | Display order within bank            |
| `created_at`    | TIMESTAMPTZ  | No       | `now()`  | Creation time                        |
| `updated_at`    | TIMESTAMPTZ  | No       | auto     | Last update time                     |

**Indexes**: `bank_id`, `(bank_id, order)` composite

**Relations**: Belongs to `question_banks` (cascade delete)

#### JSON Column Schemas by Question Type

**MULTIPLE_CHOICE_SINGLE / MULTIPLE_CHOICE_MULTI**
```json
// options
[
  { "id": "opt-1", "text": "Option text" },
  { "id": "opt-2", "text": "Option text" }
]
// correctAnswer (SINGLE): "opt-1"
// correctAnswer (MULTI):  ["opt-1", "opt-3"]
```

**TRUE_FALSE**
```json
// options
[
  { "id": "true", "text": "True" },
  { "id": "false", "text": "False" }
]
// correctAnswer: "true" or "false"
```

**DRAG_ORDER**
```json
// options
[
  { "id": "item-1", "text": "First item" },
  { "id": "item-2", "text": "Second item" }
]
// correctAnswer: ["item-1", "item-2"]  (correct order)
```

**IMAGE_MAP**
```json
// options
{
  "imageUrl": "/uploads/image.png",
  "regions": [
    { "id": "r1", "shape": "rect", "coords": [10, 20, 100, 80] }
  ]
}
// correctAnswer: "r1"
```

**SLIDER**
```json
// options
{
  "min": 0,
  "max": 100,
  "step": 1,
  "unit": "%"
}
// correctAnswer: { "value": 42, "tolerance": 5 }
```

---

### quiz_attempts

Records a user's quiz session. Stores responses and scoring results.

| Column          | Type          | Nullable | Default       | Description                      |
| --------------- | ------------- | -------- | ------------- | -------------------------------- |
| `id`            | UUID          | No       | `uuid()`      | Primary key                      |
| `user_id`       | UUID          | No       | —             | FK to users.id                   |
| `bank_id`       | UUID          | No       | —             | FK to question_banks.id          |
| `status`        | AttemptStatus | No       | `IN_PROGRESS` | Current attempt status           |
| `score`         | FLOAT         | No       | `0`           | Earned score                     |
| `max_score`     | FLOAT         | No       | `0`           | Maximum possible score           |
| `percentage`    | FLOAT         | No       | `0`           | Score percentage (0-100)         |
| `passed`        | BOOLEAN       | No       | `false`       | Whether passing threshold met    |
| `started_at`    | TIMESTAMPTZ   | No       | `now()`       | When attempt started             |
| `completed_at`  | TIMESTAMPTZ   | Yes      | —             | When attempt submitted           |
| `time_spent`    | INT           | No       | `0`           | Total seconds spent              |
| `question_order`| JSONB         | No       | —             | Array of question IDs in order   |
| `responses`     | JSONB         | No       | —             | User responses keyed by question |

**Indexes**: `user_id`, `bank_id`, `(user_id, bank_id)`, `status`, `completed_at`, `(status, completed_at)`, `(user_id, status)`

**Relations**: Belongs to `users`, `question_banks`. Has many `email_logs`.

#### JSON Column Schema: responses
```json
{
  "question-uuid-1": "opt-1",
  "question-uuid-2": ["opt-2", "opt-3"],
  "question-uuid-3": true,
  "question-uuid-4": ["item-1", "item-2"],
  "question-uuid-5": { "x": 50, "y": 75 },
  "question-uuid-6": 42
}
```

#### JSON Column Schema: question_order
```json
["question-uuid-1", "question-uuid-2", "question-uuid-3"]
```

---

### audit_logs

Immutable security event log for user actions.

| Column       | Type        | Nullable | Default  | Description                |
| ------------ | ----------- | -------- | -------- | -------------------------- |
| `id`         | UUID        | No       | `uuid()` | Primary key                |
| `user_id`    | UUID        | Yes      | —        | FK to users.id (nullable for system events) |
| `action`     | VARCHAR     | No       | —        | Action type (see below)    |
| `entity_type`| VARCHAR     | No       | —        | Entity affected            |
| `entity_id`  | UUID        | Yes      | —        | ID of affected entity      |
| `details`    | JSONB       | Yes      | —        | Action-specific details    |
| `ip_address` | VARCHAR     | Yes      | —        | Client IP address          |
| `user_agent` | VARCHAR     | Yes      | —        | Client user agent string   |
| `created_at` | TIMESTAMPTZ | No       | `now()`  | When event occurred        |

**Indexes**: `user_id`, `action`, `entity_type`, `created_at`

**Relations**: Belongs to `users` (optional)

#### Action Types
| Action                 | Entity Type    | Description                     |
| ---------------------- | -------------- | ------------------------------- |
| `LOGIN_SUCCESS`        | User           | Successful login                |
| `LOGIN_FAILED`         | User           | Failed login attempt            |
| `PASSWORD_CHANGED`     | User           | User changed password           |
| `ROLE_CHANGED`         | User           | Admin changed user role         |
| `USER_CREATED`         | User           | Admin created user              |
| `USER_DEACTIVATED`     | User           | Admin deactivated user          |
| `BANK_STATUS_CHANGED`  | QuestionBank   | Bank status updated             |
| `DATA_EXPORTED`        | QuizAttempt    | Admin exported completions CSV  |
| `INVITE_CREATED`       | InviteToken    | Admin created invite token      |

---

### email_logs

Tracks all email delivery attempts for auditing and debugging.

| Column      | Type        | Nullable | Default  | Description              |
| ----------- | ----------- | -------- | -------- | ------------------------ |
| `id`        | UUID        | No       | `uuid()` | Primary key              |
| `attempt_id`| UUID        | No       | —        | FK to quiz_attempts.id   |
| `recipient` | VARCHAR     | No       | —        | Recipient email          |
| `subject`   | VARCHAR     | No       | —        | Email subject line       |
| `status`    | VARCHAR     | No       | —        | `sent` or `failed`       |
| `sent_at`   | TIMESTAMPTZ | No       | `now()`  | Delivery timestamp       |
| `error`     | TEXT        | Yes      | —        | Error details if failed  |

**Indexes**: `attempt_id`, `status`, `sent_at`

**Relations**: Belongs to `quiz_attempts`

---

### password_resets

Time-limited tokens for the password reset flow. Tokens are SHA-256 hashed before storage.

| Column      | Type        | Nullable | Default  | Description                     |
| ----------- | ----------- | -------- | -------- | ------------------------------- |
| `id`        | UUID        | No       | `uuid()` | Primary key                     |
| `user_id`   | UUID        | No       | —        | FK to users.id                  |
| `token`     | VARCHAR     | No       | —        | SHA-256 hash of the reset token |
| `expires_at`| TIMESTAMPTZ | No       | —        | Token expiry (1 hour from creation) |
| `used_at`   | TIMESTAMPTZ | Yes      | —        | When token was consumed         |
| `created_at`| TIMESTAMPTZ | No       | `now()`  | When token was created          |

**Indexes**: `token` (unique), `user_id`, `expires_at`

**Relations**: Belongs to `users`

**Security**: Plaintext token is returned only to the user (via email). The database stores a SHA-256 hash. On new password reset requests, all previous unused tokens for the user are invalidated.

---

### invite_tokens

Magic-link tokens for inviting users to take a quiz. Tokens are SHA-256 hashed before storage.

| Column      | Type        | Nullable | Default  | Description                      |
| ----------- | ----------- | -------- | -------- | -------------------------------- |
| `id`        | UUID        | No       | `uuid()` | Primary key                      |
| `token`     | VARCHAR     | No       | —        | SHA-256 hash of the invite token |
| `email`     | VARCHAR     | No       | —        | Invitee email address            |
| `first_name`| VARCHAR     | Yes      | —        | Invitee first name (for auto-create) |
| `surname`   | VARCHAR     | Yes      | —        | Invitee surname (for auto-create)|
| `bank_id`   | UUID        | Yes      | —        | FK to question_banks.id          |
| `expires_at`| TIMESTAMPTZ | No       | —        | Token expiry (7 days)            |
| `used_at`   | TIMESTAMPTZ | Yes      | —        | When token was consumed          |
| `created_at`| TIMESTAMPTZ | No       | `now()`  | When token was created           |

**Indexes**: `token` (unique), `email`, `expires_at`

**Relations**: Belongs to `question_banks` (optional)

**Security**: Plaintext token is returned only to the admin who creates it. The database stores a SHA-256 hash. If the invitee doesn't have an account, one is auto-created on first use with the provided name.

---

## Index Strategy

The database uses targeted indexes for common query patterns:

| Table           | Index                      | Purpose                              |
| --------------- | -------------------------- | ------------------------------------ |
| users           | `email` (unique)           | Login lookup                         |
| users           | `role`                     | Admin user listing filters           |
| users           | `is_active`                | Active user filtering                |
| question_banks  | `status`                   | Quiz listing by visibility           |
| question_banks  | `created_by_id`            | Owner's bank listing                 |
| question_banks  | `created_at`               | Chronological sorting                |
| questions       | `bank_id`                  | List questions in bank               |
| questions       | `(bank_id, order)`         | Ordered question retrieval           |
| quiz_attempts   | `user_id`                  | User's attempt history               |
| quiz_attempts   | `bank_id`                  | Bank attempt statistics              |
| quiz_attempts   | `(user_id, bank_id)`       | Attempt count per user per bank      |
| quiz_attempts   | `status`                   | Filter by attempt status             |
| quiz_attempts   | `completed_at`             | Chronological completions            |
| quiz_attempts   | `(status, completed_at)`   | Admin completions listing            |
| quiz_attempts   | `(user_id, status)`        | User's in-progress attempts          |
| audit_logs      | `user_id`                  | User activity trail                  |
| audit_logs      | `action`                   | Filter by action type                |
| audit_logs      | `entity_type`              | Filter by entity                     |
| audit_logs      | `created_at`               | Chronological log viewing            |
| email_logs      | `attempt_id`               | Emails for a specific attempt        |
| email_logs      | `status`                   | Failed email monitoring              |
| email_logs      | `sent_at`                  | Chronological email log              |
| password_resets | `token` (unique)           | Token lookup on reset                |
| password_resets | `user_id`                  | User's reset history                 |
| password_resets | `expires_at`               | Expired token cleanup                |
| invite_tokens   | `token` (unique)           | Token lookup on login                |
| invite_tokens   | `email`                    | User's pending invites               |
| invite_tokens   | `expires_at`               | Expired token cleanup                |

---

## Cascade Rules

| Parent Table    | Child Table     | On Delete |
| --------------- | --------------- | --------- |
| question_banks  | questions       | CASCADE   |
| All others      | —               | RESTRICT  |

Deleting a question bank cascades to all its questions. All other foreign key relationships use the default Prisma behavior (restrict/error on delete of referenced parent).

---

## Migrations

| Migration              | Date       | Description               |
| ---------------------- | ---------- | ------------------------- |
| `20260130132228_init`  | 2026-01-30 | Initial schema — all tables, enums, indexes |

Run migrations:
```bash
# Apply pending migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Reset database (destroys all data)
npx prisma migrate reset
```

---

## Seed Data

The seed script (`prisma/seed.ts`) creates an initial admin user:

| Field    | Value                     |
| -------- | ------------------------- |
| Email    | `admin@health.qld.gov.au` |
| Password | `Admin123!`               |
| Role     | `ADMIN`                   |

**Change the default password immediately after first login.**

```bash
# Development
npx ts-node prisma/seed.ts

# Production
node dist/prisma/seed.js
```
