# REdI Quiz Platform - Admin Guide

## Accessing the Admin Panel

Navigate to `/admin` after logging in with an ADMIN account. The admin panel has six tabs:

- **Dashboard** — system statistics
- **Users** — user account management
- **Question Banks** — all banks across owners
- **Completions** — quiz result tracking and export
- **Logs** — security audit trail
- **Invites** — invite token management

Only users with the `ADMIN` role can access these features.

---

## Dashboard

The dashboard shows real-time system statistics:

- **Total Users** — registered accounts (active + inactive)
- **Active Quizzes** — question banks with OPEN or PUBLIC status
- **Total Attempts** — all quiz attempts across all users
- **Completion Rate** — percentage of started quizzes that were finished
- **Average Score** — mean percentage across completed attempts

---

## User Management

### Viewing Users

The Users tab shows all registered accounts in a paginated table:

| Column     | Description                    |
| ---------- | ------------------------------ |
| Name       | First name and surname         |
| Email      | Login email address            |
| Role       | USER, EDITOR, or ADMIN         |
| Status     | Active or Inactive             |
| Last Login | Most recent login timestamp    |
| Created    | Account creation date          |

### Filtering Users

- **Search** — filters by name or email (press Enter or click Filter)
- **Role** — dropdown to filter by USER / EDITOR / ADMIN
- **Status** — filter by Active / Inactive

### Creating a User

1. Click **Create User**
2. Fill in email, first name, surname, and password
3. Select role (defaults to USER)
4. Click **Create**

The password must meet strength requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

### Editing a User

1. Click **Edit** on a user row
2. Modify first name, surname, ID number, role, or active status
3. Click **Save Changes**

**Restrictions:**
- You cannot change your own role
- You cannot deactivate your own account
- You cannot delete your own account

### Resetting a User's Password

1. Click **Edit** on the target user
2. Click **Reset Password**
3. Enter a new password meeting strength requirements
4. Click **Reset**

### Deactivating a User

1. Click **Delete** on the target user row
2. Confirm the action

Deactivation is a soft delete — the account remains in the database but:
- The user cannot log in
- Their token refresh requests are rejected
- They appear as "Inactive" in the user list

---

## Question Bank Management

### Viewing All Banks

The Question Banks tab shows every question bank regardless of owner:

| Column    | Description                                |
| --------- | ------------------------------------------ |
| Title     | Bank title and description                 |
| Owner     | Creator's name and email                   |
| Status    | DRAFT / OPEN / PUBLIC / ARCHIVED           |
| Questions | Number of questions in the bank            |
| Attempts  | Number of quiz attempts                    |
| Updated   | Last modification date                     |

### Changing Bank Status

Use the status dropdown on any row to change between:

- **DRAFT** — only visible to owner and admins
- **OPEN** — visible to all authenticated users
- **PUBLIC** — open access (future use)
- **ARCHIVED** — hidden from listings

### Deleting a Question Bank

1. Click **Delete** on the target bank
2. Review the confirmation dialog (shows question and attempt counts)
3. Click **Delete** to confirm

**This action permanently removes:**
- The question bank
- All questions within it
- All attempt records

This cannot be undone. Consider archiving instead.

---

## Completions Dashboard

### Viewing Completions

The Completions tab shows all completed quiz attempts with:

| Column    | Description                |
| --------- | -------------------------- |
| Name      | Student name               |
| Email     | Student email              |
| Quiz      | Question bank title        |
| Score     | Points earned / max points |
| %         | Percentage score           |
| Result    | Pass or Fail               |
| Completed | Completion date            |

### Filtering Completions

- **From / To** — date range filter
- **Result** — filter by Passed / Not Passed

### Exporting to CSV

1. Apply any desired filters
2. Click **Export CSV**
3. A CSV file downloads automatically

The export includes up to 50,000 rows and contains:
Name, Email, Quiz, Score, Max Score, Percentage, Passed, Status, Completed At, Time (s)

CSV values are protected against formula injection (leading `=`, `+`, `-`, `@` characters are escaped).

---

## Audit Logs

### Viewing Logs

The Logs tab shows security-relevant events:

| Column  | Description                         |
| ------- | ----------------------------------- |
| Date    | When the event occurred             |
| User    | Who performed the action            |
| Action  | Event type (see table below)        |
| Entity  | What was affected                   |
| IP      | Client IP address                   |

### Log Actions

| Action             | Description                     |
| ------------------ | ------------------------------- |
| LOGIN_SUCCESS      | Successful login                |
| LOGIN_FAILED       | Failed login attempt            |
| PASSWORD_CHANGED   | User changed their password     |
| ROLE_CHANGED       | Admin changed a user's role     |
| USER_CREATED       | Admin created a new user        |
| USER_DEACTIVATED   | Admin deactivated a user        |
| BANK_STATUS_CHANGED| Question bank status updated    |
| DATA_EXPORTED      | Admin exported completions CSV  |
| INVITE_CREATED     | Admin created an invite token   |

### Filtering Logs

- **Action** — filter by specific action type
- **Entity Type** — filter by User, QuestionBank, etc.

### Viewing Log Details

Click any log row to open the detail modal showing the full JSON details including IP address, user agent, and action-specific data.

---

## Invite System

### Creating Invite Tokens

The invite system allows admins to create magic-link tokens that auto-register and/or log in users:

1. Go to the **Invites** tab
2. Fill in the form:
   - **Email** (required) — invitee's email address
   - **First Name** (optional) — for auto-account creation
   - **Surname** (optional) — for auto-account creation
   - **Question Bank** (optional) — link invite to a specific quiz
3. Click **Create Invite**

### How Invite Tokens Work

1. Admin creates a token and shares the link with the invitee
2. The invitee clicks the link and is prompted for a password
3. If the invitee has an existing account, they verify their password
4. If the invitee is new, an account is auto-created with the provided name
5. The token is marked as used and cannot be reused

### Token Properties

- **Expiry**: 7 days from creation
- **Single use**: each token can only be used once
- **Security**: tokens are SHA-256 hashed in the database; the plaintext is shown only once at creation

### Viewing Tokens

The invite list shows all tokens with:

| Column  | Description                     |
| ------- | ------------------------------- |
| Email   | Invitee email                   |
| Bank    | Linked question bank (if any)   |
| Status  | Active / Used / Expired         |
| Created | When the token was created      |
| Expires | When the token expires          |

---

## Security Best Practices

### Account Security

- Change the default admin password immediately after deployment
- Use strong, unique JWT secrets (64+ hex characters)
- Keep `JWT_EXPIRES_IN` short (1 hour recommended)
- Monitor the audit logs regularly for suspicious activity

### Failed Login Protection

The system automatically locks accounts after 5 failed login attempts:
- Lockout duration: 15 minutes
- Lockout is per-email, case-insensitive
- Successful login clears the failure counter

### Email Domain Restriction

Registration is restricted to the configured domain (`ALLOWED_EMAIL_DOMAIN`). By default, only `@health.qld.gov.au` addresses can register. Admin-created users bypass this restriction.

### Regular Maintenance

- **Database backups** — configure automated daily backups (see DEPLOYMENT.md)
- **Log review** — check audit logs weekly for unexpected actions
- **User cleanup** — deactivate accounts of departed staff
- **Token cleanup** — expired invite and reset tokens remain in the database for auditing but pose no security risk (they are SHA-256 hashed and time-expired)
