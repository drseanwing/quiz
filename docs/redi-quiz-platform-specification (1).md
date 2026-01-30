# REdI Quiz Platform
## Comprehensive Specification & Build Plan

**Version:** 1.0  
**Date:** January 2026  
**Project:** Resuscitation EDucation Initiative Online Assessment System

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Requirements](#2-system-requirements)
3. [Architecture Overview](#3-architecture-overview)
4. [Database Schema](#4-database-schema)
5. [API Specification](#5-api-specification)
6. [Question Type Definitions](#6-question-type-definitions)
7. [User Interface Specification](#7-user-interface-specification)
8. [Email Integration](#8-email-integration)
9. [Security Requirements](#9-security-requirements)
10. [Coding Standards](#10-coding-standards)
11. [Build Plan](#11-build-plan)
12. [Granular Task List](#12-granular-task-list)
13. [Example Data Schema](#13-example-data-schema)

---

## 1. Executive Summary

### 1.1 Project Purpose

The REdI Quiz Platform is a web-based assessment system designed for the Resuscitation EDucation Initiative at Metro North Health. The platform enables staff to complete knowledge assessments for resuscitation training programs, with administrative capabilities for content management, user management, and completion tracking.

### 1.2 Key Features

- User authentication with email domain restriction (@health.qld.gov.au)
- Token-based automatic account creation via querystring
- Question bank management with configurable settings
- Multiple question types with rich media support
- Real-time quiz delivery with timer support
- Automated completion notifications
- Administrative dashboard with full audit logging
- JSON import/export for question banks

### 1.3 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| Frontend | React 18 with TypeScript | Type safety, component reusability, ecosystem |
| UI Framework | Custom CSS with REdI Design Tokens | Brand compliance, accessibility |
| Backend | Node.js with Express | JavaScript ecosystem consistency |
| Database | PostgreSQL 16 | Relational integrity, JSON support, performance |
| ORM | Prisma | Type-safe queries, migrations, schema management |
| Authentication | JWT with refresh tokens | Stateless, scalable authentication |
| File Storage | Local filesystem (Docker volume) | Simplicity, cost-effective |
| Container | Docker with Docker Compose | Reproducible deployments, isolation |
| Reverse Proxy | Nginx | SSL termination, static serving, load balancing |

---

## 2. System Requirements

### 2.1 Functional Requirements

#### 2.1.1 User Management

| ID | Requirement |
|----|-------------|
| FR-UM-001 | Users can create accounts with email, password, first name, surname |
| FR-UM-002 | Users can optionally provide an ID number |
| FR-UM-003 | User email serves as the unique identifier |
| FR-UM-004 | Non-admin user emails must end with "@health.qld.gov.au" |
| FR-UM-005 | Admin users can create accounts with any email domain |
| FR-UM-006 | Users can login with email and password |
| FR-UM-007 | Users can request password reset via email |
| FR-UM-008 | Token-based URLs auto-create accounts from querystring parameters |
| FR-UM-009 | Users have roles: user, editor, admin |

#### 2.1.2 Question Bank Management

| ID | Requirement |
|----|-------------|
| FR-QB-001 | Question banks have a title and description |
| FR-QB-002 | Question banks have status: draft, open, public, archived |
| FR-QB-003 | Question banks have configurable time limit (minutes, 0 = unlimited) |
| FR-QB-004 | Question banks support question randomisation toggle |
| FR-QB-005 | Question banks support answer randomisation toggle |
| FR-QB-006 | Question banks have a configurable passing score (percentage) |
| FR-QB-007 | Question banks have feedback timing: immediate, end-of-quiz, none |
| FR-QB-008 | Question banks have a notification email address |
| FR-QB-009 | Question banks have configurable question count per attempt |
| FR-QB-010 | Question banks have configurable maximum attempts (0 = unlimited) |
| FR-QB-011 | Question banks can be imported from JSON |
| FR-QB-012 | Question banks can be exported to JSON |

#### 2.1.3 Question Types

| ID | Requirement |
|----|-------------|
| FR-QT-001 | Multiple choice single answer (2-6 options) |
| FR-QT-002 | Multiple choice multiple answer (2-6 options) |
| FR-QT-003 | True/False questions |
| FR-QT-004 | Drag-and-drop ordering |
| FR-QT-005 | Image map click (hotspot selection) |
| FR-QT-006 | Slider/dial numeric selection |

#### 2.1.4 Question Content

| ID | Requirement |
|----|-------------|
| FR-QC-001 | Question prompts support rich text (HTML subset) |
| FR-QC-002 | Question prompts can include images |
| FR-QC-003 | Answer options support rich text |
| FR-QC-004 | Answer options can include images |
| FR-QC-005 | Each question has feedback for incorrect answers |
| FR-QC-006 | Feedback supports rich text |
| FR-QC-007 | Feedback can include images |
| FR-QC-008 | Feedback can include an optional reference link |
| FR-QC-009 | All questions are weighted equally |

#### 2.1.5 Quiz Delivery

| ID | Requirement |
|----|-------------|
| FR-QD-001 | Users see only question banks with status "public" or "open" |
| FR-QD-002 | Quiz generates configured number of random questions |
| FR-QD-003 | Quiz displays countdown timer if time limit set |
| FR-QD-004 | Quiz supports save/continue functionality |
| FR-QD-005 | Quiz displays score tracker |
| FR-QD-006 | Quiz respects feedback timing settings |
| FR-QD-007 | Quiz prevents attempts beyond maximum limit |
| FR-QD-008 | Quiz auto-submits when timer expires |

#### 2.1.6 Scoring

| ID | Requirement |
|----|-------------|
| FR-SC-001 | Single-answer MCQ scores 1.0 for correct, 0.0 for incorrect |
| FR-SC-002 | Multi-answer MCQ uses fractional scoring |
| FR-SC-003 | Multi-answer: +1/n for each correct selection |
| FR-SC-004 | Multi-answer: -1/n for each incorrect selection |
| FR-SC-005 | Multi-answer: minimum score is 0.0 |
| FR-SC-006 | Ordering questions score 1.0 for fully correct, 0.0 otherwise |
| FR-SC-007 | Image map questions score 1.0 for correct region, 0.0 otherwise |
| FR-SC-008 | Slider questions score 1.0 if within tolerance, 0.0 otherwise |

#### 2.1.7 Notifications

| ID | Requirement |
|----|-------------|
| FR-NT-001 | Email sent to question bank notification address on pass |
| FR-NT-002 | Email includes user name, email, score, date |
| FR-NT-003 | Completion logged in database |
| FR-NT-004 | Email delivery via Power Automate HTTP endpoint |

#### 2.1.8 Administration

| ID | Requirement |
|----|-------------|
| FR-AD-001 | Admins can manage user accounts |
| FR-AD-002 | Admins can assign user roles |
| FR-AD-003 | Admins can reset user passwords |
| FR-AD-004 | Admins can view completion dashboard |
| FR-AD-005 | Admins can filter completions by date range |
| FR-AD-006 | Admins can filter completions by question bank |
| FR-AD-007 | Admins can filter completions by user |
| FR-AD-008 | Admins can export completion data to CSV |
| FR-AD-009 | Admins can view system logs |
| FR-AD-010 | Editors can create question banks |
| FR-AD-011 | Editors can edit their own question banks |
| FR-AD-012 | Admins can edit any question bank |

### 2.2 Non-Functional Requirements

#### 2.2.1 Performance

| ID | Requirement |
|----|-------------|
| NFR-PF-001 | Page load time < 2 seconds on standard connection |
| NFR-PF-002 | API response time < 500ms for standard operations |
| NFR-PF-003 | Support 100 concurrent users |
| NFR-PF-004 | Quiz state auto-saves every 30 seconds |

#### 2.2.2 Security

| ID | Requirement |
|----|-------------|
| NFR-SC-001 | All passwords hashed with bcrypt (cost factor 12) |
| NFR-SC-002 | JWT tokens expire after 1 hour |
| NFR-SC-003 | Refresh tokens expire after 7 days |
| NFR-SC-004 | All API endpoints require authentication except login/register |
| NFR-SC-005 | HTTPS enforced in production |
| NFR-SC-006 | CSRF protection on all forms |
| NFR-SC-007 | Rate limiting on authentication endpoints |
| NFR-SC-008 | SQL injection prevention via parameterised queries |
| NFR-SC-009 | XSS prevention via content sanitisation |

#### 2.2.3 Accessibility

| ID | Requirement |
|----|-------------|
| NFR-AC-001 | WCAG 2.1 Level AA compliance |
| NFR-AC-002 | Keyboard navigation support |
| NFR-AC-003 | Screen reader compatibility |
| NFR-AC-004 | Colour contrast ratios meet AA standards |
| NFR-AC-005 | Focus indicators visible on all interactive elements |

#### 2.2.4 Availability

| ID | Requirement |
|----|-------------|
| NFR-AV-001 | 99.5% uptime target |
| NFR-AV-002 | Graceful degradation on component failure |
| NFR-AV-003 | Database backups every 24 hours |
| NFR-AV-004 | Backup retention for 30 days |

---

## 3. Architecture Overview

### 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Docker Host                                │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        Docker Network                          │ │
│  │                                                                 │ │
│  │   ┌──────────┐     ┌──────────────┐     ┌──────────────────┐  │ │
│  │   │  Nginx   │────▶│   Backend    │────▶│   PostgreSQL     │  │ │
│  │   │  :443    │     │   :3000      │     │   :5432          │  │ │
│  │   │  :80     │     │   (Node.js)  │     │   (Data Volume)  │  │ │
│  │   └──────────┘     └──────────────┘     └──────────────────┘  │ │
│  │        │                  │                                    │ │
│  │        │                  ▼                                    │ │
│  │        │           ┌──────────────┐                           │ │
│  │        │           │   Uploads    │                           │ │
│  │        │           │   (Volume)   │                           │ │
│  │        │           └──────────────┘                           │ │
│  │        ▼                                                       │ │
│  │   ┌──────────┐                                                │ │
│  │   │ Frontend │                                                │ │
│  │   │ (Static) │                                                │ │
│  │   └──────────┘                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Descriptions

#### 3.2.1 Nginx Reverse Proxy

- Handles SSL/TLS termination
- Serves static frontend assets
- Proxies API requests to backend
- Implements rate limiting
- Handles gzip compression

#### 3.2.2 Backend Service (Node.js/Express)

- RESTful API implementation
- JWT authentication management
- Business logic processing
- Database interactions via Prisma
- Email notification dispatch
- File upload handling
- Logging and monitoring

#### 3.2.3 PostgreSQL Database

- User account storage
- Question bank storage
- Quiz attempt tracking
- Completion records
- Audit logging

#### 3.2.4 Frontend (React SPA)

- User interface components
- State management
- API communication
- Real-time quiz interactions

### 3.3 Directory Structure

```
redi-quiz-platform/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   │   ├── index.ts
│   │   │   ├── database.ts
│   │   │   ├── email.ts
│   │   │   └── logger.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── validation.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimiter.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── questionBanks.ts
│   │   │   ├── questions.ts
│   │   │   ├── quizzes.ts
│   │   │   ├── attempts.ts
│   │   │   └── admin.ts
│   │   ├── services/
│   │   │   ├── authService.ts
│   │   │   ├── userService.ts
│   │   │   ├── questionBankService.ts
│   │   │   ├── questionService.ts
│   │   │   ├── quizService.ts
│   │   │   ├── scoringService.ts
│   │   │   ├── emailService.ts
│   │   │   └── importExportService.ts
│   │   ├── validators/
│   │   │   ├── authValidators.ts
│   │   │   ├── questionBankValidators.ts
│   │   │   └── questionValidators.ts
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   ├── auth.ts
│   │   │   ├── question.ts
│   │   │   └── quiz.ts
│   │   └── utils/
│   │       ├── helpers.ts
│   │       ├── sanitiser.ts
│   │       └── tokenGenerator.ts
│   └── logs/
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   └── assets/
│   │       └── redi-logo.svg
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles/
│       │   ├── redi-tokens.css
│       │   ├── global.css
│       │   └── components/
│       ├── components/
│       │   ├── common/
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Alert.tsx
│       │   │   ├── Spinner.tsx
│       │   │   └── GradientBar.tsx
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   ├── Footer.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── Layout.tsx
│       │   ├── auth/
│       │   │   ├── LoginForm.tsx
│       │   │   ├── RegisterForm.tsx
│       │   │   └── ResetPasswordForm.tsx
│       │   ├── quiz/
│       │   │   ├── QuizCard.tsx
│       │   │   ├── QuizPlayer.tsx
│       │   │   ├── Timer.tsx
│       │   │   ├── ProgressBar.tsx
│       │   │   ├── ScoreDisplay.tsx
│       │   │   └── questions/
│       │   │       ├── MultipleChoice.tsx
│       │   │       ├── TrueFalse.tsx
│       │   │       ├── DragOrder.tsx
│       │   │       ├── ImageMap.tsx
│       │   │       └── Slider.tsx
│       │   └── admin/
│       │       ├── UserManager.tsx
│       │       ├── QuestionBankEditor.tsx
│       │       ├── QuestionEditor.tsx
│       │       ├── CompletionDashboard.tsx
│       │       └── LogViewer.tsx
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Dashboard.tsx
│       │   ├── QuizList.tsx
│       │   ├── QuizAttempt.tsx
│       │   ├── QuizResults.tsx
│       │   ├── Profile.tsx
│       │   └── admin/
│       │       ├── AdminDashboard.tsx
│       │       ├── Users.tsx
│       │       ├── QuestionBanks.tsx
│       │       ├── Completions.tsx
│       │       └── Logs.tsx
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useQuiz.ts
│       │   ├── useTimer.ts
│       │   └── useApi.ts
│       ├── context/
│       │   ├── AuthContext.tsx
│       │   └── QuizContext.tsx
│       ├── services/
│       │   └── api.ts
│       ├── types/
│       │   └── index.ts
│       └── utils/
│           ├── constants.ts
│           └── helpers.ts
│
├── nginx/
│   ├── nginx.conf
│   └── ssl/
│
└── scripts/
    ├── backup.sh
    ├── restore.sh
    └── seed.sh
```

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    User      │       │   QuestionBank   │       │    Question      │
├──────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)      │       │ id (PK)          │       │ id (PK)          │
│ email        │◄──────│ createdById (FK) │       │ bankId (FK)      │──────┐
│ passwordHash │       │ title            │◄──────│ type             │      │
│ firstName    │       │ description      │       │ prompt           │      │
│ surname      │       │ status           │       │ promptImage      │      │
│ idNumber     │       │ timeLimit        │       │ options (JSON)   │      │
│ role         │       │ randomQuestions  │       │ correctAnswer    │      │
│ createdAt    │       │ randomAnswers    │       │ feedback         │      │
│ updatedAt    │       │ passingScore     │       │ feedbackImage    │      │
│ lastLoginAt  │       │ feedbackTiming   │       │ referenceLink    │      │
│ isActive     │       │ notificationEmail│       │ order            │      │
└──────────────┘       │ questionCount    │       │ createdAt        │      │
       │               │ maxAttempts      │       │ updatedAt        │      │
       │               │ createdAt        │       └──────────────────┘      │
       │               │ updatedAt        │              │                   │
       │               └──────────────────┘              │                   │
       │                      │                          │                   │
       │                      │                          │                   │
       ▼                      ▼                          ▼                   │
┌──────────────────────────────────────────────────────────────────────────┐│
│                            QuizAttempt                                    ││
├──────────────────────────────────────────────────────────────────────────┤│
│ id (PK)                                                                   ││
│ userId (FK) ──────────────────────────────────────────────────────────────┘│
│ bankId (FK) ───────────────────────────────────────────────────────────────┘
│ status (in_progress, completed, timed_out, abandoned)
│ score
│ maxScore
│ percentage
│ passed
│ startedAt
│ completedAt
│ timeSpent
│ questionOrder (JSON)
│ responses (JSON)
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐
│   AuditLog       │       │   EmailLog       │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ userId (FK)      │       │ attemptId (FK)   │
│ action           │       │ recipient        │
│ entityType       │       │ subject          │
│ entityId         │       │ status           │
│ details (JSON)   │       │ sentAt           │
│ ipAddress        │       │ error            │
│ userAgent        │       └──────────────────┘
│ createdAt        │
└──────────────────┘

┌──────────────────┐
│  PasswordReset   │
├──────────────────┤
│ id (PK)          │
│ userId (FK)      │
│ token            │
│ expiresAt        │
│ usedAt           │
│ createdAt        │
└──────────────────┘

┌──────────────────┐
│   InviteToken    │
├──────────────────┤
│ id (PK)          │
│ token            │
│ email            │
│ firstName        │
│ surname          │
│ bankId (FK)      │
│ expiresAt        │
│ usedAt           │
│ createdAt        │
└──────────────────┘
```

### 4.2 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  EDITOR
  ADMIN
}

enum QuestionBankStatus {
  DRAFT
  OPEN
  PUBLIC
  ARCHIVED
}

enum FeedbackTiming {
  IMMEDIATE
  END
  NONE
}

enum QuestionType {
  MULTIPLE_CHOICE_SINGLE
  MULTIPLE_CHOICE_MULTI
  TRUE_FALSE
  DRAG_ORDER
  IMAGE_MAP
  SLIDER
}

enum AttemptStatus {
  IN_PROGRESS
  COMPLETED
  TIMED_OUT
  ABANDONED
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  firstName     String
  surname       String
  idNumber      String?
  role          UserRole  @default(USER)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?
  
  questionBanks QuestionBank[]
  attempts      QuizAttempt[]
  auditLogs     AuditLog[]
  passwordResets PasswordReset[]
  
  @@index([email])
  @@index([role])
}

model QuestionBank {
  id                String              @id @default(uuid())
  title             String
  description       String?
  status            QuestionBankStatus  @default(DRAFT)
  timeLimit         Int                 @default(0)  // minutes, 0 = unlimited
  randomQuestions   Boolean             @default(true)
  randomAnswers     Boolean             @default(true)
  passingScore      Int                 @default(80) // percentage
  feedbackTiming    FeedbackTiming      @default(END)
  notificationEmail String?
  questionCount     Int                 @default(10)
  maxAttempts       Int                 @default(0)  // 0 = unlimited
  createdById       String
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  createdBy         User                @relation(fields: [createdById], references: [id])
  questions         Question[]
  attempts          QuizAttempt[]
  inviteTokens      InviteToken[]
  
  @@index([status])
  @@index([createdById])
}

model Question {
  id            String        @id @default(uuid())
  bankId        String
  type          QuestionType
  prompt        String        // HTML content
  promptImage   String?       // File path
  options       Json          // Question-type specific options
  correctAnswer Json          // Question-type specific correct answer(s)
  feedback      String        // HTML content for incorrect feedback
  feedbackImage String?       // File path
  referenceLink String?
  order         Int           @default(0)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  bank          QuestionBank  @relation(fields: [bankId], references: [id], onDelete: Cascade)
  
  @@index([bankId])
  @@index([bankId, order])
}

model QuizAttempt {
  id            String        @id @default(uuid())
  userId        String
  bankId        String
  status        AttemptStatus @default(IN_PROGRESS)
  score         Float         @default(0)
  maxScore      Float         @default(0)
  percentage    Float         @default(0)
  passed        Boolean       @default(false)
  startedAt     DateTime      @default(now())
  completedAt   DateTime?
  timeSpent     Int           @default(0) // seconds
  questionOrder Json          // Array of question IDs in order presented
  responses     Json          // Array of response objects
  
  user          User          @relation(fields: [userId], references: [id])
  bank          QuestionBank  @relation(fields: [bankId], references: [id])
  emailLogs     EmailLog[]
  
  @@index([userId])
  @@index([bankId])
  @@index([userId, bankId])
  @@index([status])
  @@index([completedAt])
}

model AuditLog {
  id          String    @id @default(uuid())
  userId      String?
  action      String
  entityType  String
  entityId    String?
  details     Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime  @default(now())
  
  user        User?     @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([action])
  @@index([entityType])
  @@index([createdAt])
}

model EmailLog {
  id          String      @id @default(uuid())
  attemptId   String
  recipient   String
  subject     String
  status      String      // sent, failed
  sentAt      DateTime    @default(now())
  error       String?
  
  attempt     QuizAttempt @relation(fields: [attemptId], references: [id])
  
  @@index([attemptId])
  @@index([status])
}

model PasswordReset {
  id          String    @id @default(uuid())
  userId      String
  token       String    @unique
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime  @default(now())
  
  user        User      @relation(fields: [userId], references: [id])
  
  @@index([token])
  @@index([userId])
}

model InviteToken {
  id          String        @id @default(uuid())
  token       String        @unique
  email       String
  firstName   String?
  surname     String?
  bankId      String?
  expiresAt   DateTime
  usedAt      DateTime?
  createdAt   DateTime      @default(now())
  
  bank        QuestionBank? @relation(fields: [bankId], references: [id])
  
  @@index([token])
  @@index([email])
}
```

---

## 5. API Specification

### 5.1 Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/auth/register | Create new user account | No |
| POST | /api/auth/login | Authenticate user | No |
| POST | /api/auth/refresh | Refresh access token | No (refresh token) |
| POST | /api/auth/logout | Invalidate refresh token | Yes |
| POST | /api/auth/forgot-password | Request password reset | No |
| POST | /api/auth/reset-password | Complete password reset | No (reset token) |
| GET | /api/auth/token-login | Auto-login via invite token | No |

### 5.2 User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/users/me | Get current user profile | Yes |
| PATCH | /api/users/me | Update current user profile | Yes |
| PATCH | /api/users/me/password | Change password | Yes |
| GET | /api/users | List all users (admin) | Admin |
| GET | /api/users/:id | Get user details (admin) | Admin |
| POST | /api/users | Create user (admin) | Admin |
| PATCH | /api/users/:id | Update user (admin) | Admin |
| DELETE | /api/users/:id | Deactivate user (admin) | Admin |
| POST | /api/users/:id/reset-password | Reset user password (admin) | Admin |

### 5.3 Question Bank Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/question-banks | List available question banks | Yes |
| GET | /api/question-banks/:id | Get question bank details | Yes |
| POST | /api/question-banks | Create question bank | Editor |
| PATCH | /api/question-banks/:id | Update question bank | Editor (owner) / Admin |
| DELETE | /api/question-banks/:id | Delete question bank | Admin |
| POST | /api/question-banks/:id/duplicate | Duplicate question bank | Editor |
| GET | /api/question-banks/:id/export | Export to JSON | Editor (owner) / Admin |
| POST | /api/question-banks/import | Import from JSON | Editor |

### 5.4 Question Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/question-banks/:bankId/questions | List questions in bank | Editor (owner) / Admin |
| GET | /api/questions/:id | Get question details | Editor (owner) / Admin |
| POST | /api/question-banks/:bankId/questions | Create question | Editor (owner) / Admin |
| PATCH | /api/questions/:id | Update question | Editor (owner) / Admin |
| DELETE | /api/questions/:id | Delete question | Editor (owner) / Admin |
| POST | /api/questions/:id/duplicate | Duplicate question | Editor (owner) / Admin |
| PATCH | /api/question-banks/:bankId/questions/reorder | Reorder questions | Editor (owner) / Admin |

### 5.5 Quiz Attempt Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/quizzes/:bankId/start | Start new quiz attempt | Yes |
| GET | /api/attempts/:id | Get attempt details | Yes (owner) |
| PATCH | /api/attempts/:id | Save progress | Yes (owner) |
| POST | /api/attempts/:id/submit | Submit attempt | Yes (owner) |
| GET | /api/attempts/:id/results | Get attempt results | Yes (owner) |
| GET | /api/users/me/attempts | List user's attempts | Yes |

### 5.6 Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | /api/admin/completions | List all completions | Admin |
| GET | /api/admin/completions/export | Export completions CSV | Admin |
| GET | /api/admin/logs | View system logs | Admin |
| GET | /api/admin/stats | Get system statistics | Admin |
| POST | /api/admin/invite-tokens | Generate invite token | Admin |

### 5.7 File Upload Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | /api/uploads/images | Upload image | Editor |
| DELETE | /api/uploads/images/:filename | Delete image | Editor (uploader) / Admin |

### 5.8 API Response Format

#### Success Response
```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

---

## 6. Question Type Definitions

### 6.1 Multiple Choice Single Answer

```typescript
interface MultipleChoiceSingleQuestion {
  type: "MULTIPLE_CHOICE_SINGLE";
  prompt: string;           // HTML content
  promptImage?: string;     // File path
  options: {
    id: string;             // UUID
    text: string;           // HTML content
    image?: string;         // File path
  }[];                      // 2-6 options
  correctAnswer: string;    // Option ID
  feedback: string;         // HTML content
  feedbackImage?: string;
  referenceLink?: string;
}
```

**Scoring:** 1.0 if selected option matches correctAnswer, 0.0 otherwise.

### 6.2 Multiple Choice Multiple Answer

```typescript
interface MultipleChoiceMultiQuestion {
  type: "MULTIPLE_CHOICE_MULTI";
  prompt: string;
  promptImage?: string;
  options: {
    id: string;
    text: string;
    image?: string;
  }[];                      // 2-6 options
  correctAnswer: string[];  // Array of option IDs
  feedback: string;
  feedbackImage?: string;
  referenceLink?: string;
}
```

**Scoring:** Fractional based on selections
- Let n = number of correct answers
- For each correct option selected: +1/n
- For each incorrect option selected: -1/n
- Minimum score: 0.0
- Maximum score: 1.0

### 6.3 True/False

```typescript
interface TrueFalseQuestion {
  type: "TRUE_FALSE";
  prompt: string;
  promptImage?: string;
  options: [
    { id: "true", text: "True" },
    { id: "false", text: "False" }
  ];
  correctAnswer: "true" | "false";
  feedback: string;
  feedbackImage?: string;
  referenceLink?: string;
}
```

**Scoring:** 1.0 if correct, 0.0 if incorrect.

### 6.4 Drag-and-Drop Ordering

```typescript
interface DragOrderQuestion {
  type: "DRAG_ORDER";
  prompt: string;
  promptImage?: string;
  options: {
    id: string;
    text: string;
    image?: string;
  }[];                      // Items to order (displayed randomly)
  correctAnswer: string[];  // Array of option IDs in correct order
  feedback: string;
  feedbackImage?: string;
  referenceLink?: string;
}
```

**Scoring:** 1.0 if all items in correct order, 0.0 otherwise.

### 6.5 Image Map (Hotspot)

```typescript
interface ImageMapQuestion {
  type: "IMAGE_MAP";
  prompt: string;
  promptImage: string;      // Required - the image to click on
  options: {
    id: string;
    label: string;          // Label for the region
    shape: "rect" | "circle" | "poly";
    coords: number[];       // Coordinates based on shape
    // rect: [x1, y1, x2, y2]
    // circle: [cx, cy, radius]
    // poly: [x1, y1, x2, y2, x3, y3, ...]
  }[];
  correctAnswer: string;    // Option ID of correct region
  feedback: string;
  feedbackImage?: string;
  referenceLink?: string;
}
```

**Scoring:** 1.0 if click within correct region, 0.0 otherwise.

### 6.6 Slider/Dial

```typescript
interface SliderQuestion {
  type: "SLIDER";
  prompt: string;
  promptImage?: string;
  options: {
    min: number;
    max: number;
    step: number;
    unit?: string;          // e.g., "mmHg", "bpm", "mg"
    displayMarks?: number[];// Values to show as tick marks
  };
  correctAnswer: {
    value: number;
    tolerance: number;      // Acceptable deviation
  };
  feedback: string;
  feedbackImage?: string;
  referenceLink?: string;
}
```

**Scoring:** 1.0 if selected value within tolerance of correct value, 0.0 otherwise.

---

## 7. User Interface Specification

### 7.1 Design System Integration

The application implements the REdI Brand Guidelines with the following design tokens:

#### 7.1.1 Colour Palette

```css
:root {
  /* Primary Colours */
  --redi-coral: #E55B64;
  --redi-coral-dark: #D14A53;
  --redi-navy: #1B3A5F;
  --redi-navy-light: #2A5080;
  --redi-teal: #2B9E9E;
  --redi-teal-dark: #1F7A7A;
  
  /* Secondary Colours */
  --redi-light-teal: #8DD4D4;
  --redi-lime: #B8CC26;
  --redi-sky: #5DADE2;
  --redi-yellow: #F4D03F;
  
  /* Neutral Colours */
  --redi-black: #000000;
  --redi-dark-gray: #333333;
  --redi-medium-gray: #666666;
  --redi-light-gray: #F5F5F5;
  --redi-white: #FFFFFF;
  
  /* Semantic Colours */
  --redi-error: #DC3545;
  --redi-warning: #FFC107;
  --redi-success: #28A745;
  --redi-info: #17A2B8;
}
```

#### 7.1.2 Typography

```css
:root {
  --font-primary: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-display: 'Bebas Neue', Impact, sans-serif;
  
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 2rem;      /* 32px */
  --text-4xl: 2.5rem;    /* 40px */
}
```

### 7.2 Page Layouts

#### 7.2.1 Public Pages (Login, Register, Reset Password)

```
┌──────────────────────────────────────────────────────────────┐
│                      [REdI Logo]                              │
│              Resuscitation EDucation Initiative               │
├──────────────────────────────────────────────────────────────┤
│  ████████████████████████ Gradient Bar ████████████████████  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│                    ┌─────────────────────┐                   │
│                    │                     │                   │
│                    │    Form Card        │                   │
│                    │                     │                   │
│                    │    [Form Fields]    │                   │
│                    │                     │                   │
│                    │    [Submit Btn]     │                   │
│                    │                     │                   │
│                    └─────────────────────┘                   │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                        Footer                                 │
│              © 2026 Metro North Health                        │
└──────────────────────────────────────────────────────────────┘
```

#### 7.2.2 User Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo]  │  Dashboard  │  Quizzes  │  History  │  [Profile] │
├──────────────────────────────────────────────────────────────┤
│  ████████████████████████ Gradient Bar ████████████████████  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Welcome, [First Name]!                                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Available Quizzes                                       │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │ Quiz     │  │ Quiz     │  │ Quiz     │              │ │
│  │  │ Card 1   │  │ Card 2   │  │ Card 3   │              │ │
│  │  │          │  │          │  │          │              │ │
│  │  │ [Start]  │  │ [Start]  │  │ [Start]  │              │ │
│  │  └──────────┘  └──────────┘  └──────────┘              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Recent Activity                                         │ │
│  ├─────────────────────────────────────────────────────────┤ │
│  │  [Table of recent attempts]                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### 7.2.3 Quiz Player

```
┌──────────────────────────────────────────────────────────────┐
│  [Quiz Title]                          Timer: 12:34 │ [Save] │
├──────────────────────────────────────────────────────────────┤
│  Progress: ████████░░░░░░░░░░░░  Question 5 of 20            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                          │ │
│  │  Q5. What is the recommended compression rate for        │ │
│  │      adult CPR?                                          │ │
│  │                                                          │ │
│  │      [Image if present]                                  │ │
│  │                                                          │ │
│  │  ○  60-80 compressions per minute                       │ │
│  │  ○  80-100 compressions per minute                      │ │
│  │  ●  100-120 compressions per minute                     │ │
│  │  ○  120-140 compressions per minute                     │ │
│  │                                                          │ │
│  │  [Feedback area - shown if immediate feedback enabled]   │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [← Previous]                                   [Next →]      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### 7.2.4 Admin Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  [Logo]  │  Admin  │  Users  │  Banks  │  Reports  │ [User] │
├──────────────────────────────────────────────────────────────┤
│  ████████████████████████ Gradient Bar ████████████████████  │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                  │
│  Sidebar   │   Main Content Area                              │
│            │                                                  │
│  • Dashboard│   ┌────────────────────────────────────────┐   │
│  • Users    │   │  Statistics Cards                      │   │
│  • Question │   │  [Total Users] [Active Quizzes] [...]  │   │
│    Banks    │   └────────────────────────────────────────┘   │
│  • Reports  │                                                 │
│  • Logs     │   ┌────────────────────────────────────────┐   │
│             │   │  Recent Completions                     │   │
│             │   │  [Table]                                │   │
│             │   └────────────────────────────────────────┘   │
│             │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

### 7.3 Component Specifications

#### 7.3.1 Quiz Card Component

```
┌─────────────────────────────────────┐
│                                     │
│  [Icon/Badge]                       │
│                                     │
│  ALS Theory Assessment              │  ← Title (H3, Navy)
│                                     │
│  20 questions • 30 minutes          │  ← Meta (Small, Gray)
│  Pass mark: 80%                     │
│                                     │
│  Your attempts: 2/3                 │  ← User stats
│  Best score: 75%                    │
│                                     │
│  [Start Quiz →]                     │  ← Primary Button
│                                     │
└─────────────────────────────────────┘
   ↑
   Card border-top: 4px solid --redi-coral
```

#### 7.3.2 Question Type Components

Each question type has specific UI requirements:

**Multiple Choice (Single/Multi)**
- Radio buttons for single answer
- Checkboxes for multiple answer
- Options display in 1-2 columns based on content length
- Images display inline or below option text
- Selected state uses --redi-coral border/background

**True/False**
- Two large clickable buttons
- Horizontal layout on desktop
- Stacked layout on mobile

**Drag-and-Drop Ordering**
- Draggable cards with grab cursor
- Visual drop zones
- Numbering indicators
- Touch-friendly drag handles

**Image Map**
- Responsive image scaling
- Clickable regions with hover state
- Click indicator dot/marker
- Region highlighting on selection

**Slider/Dial**
- Custom styled range input
- Value display above thumb
- Unit label
- Tick marks at specified intervals

---

## 8. Email Integration

### 8.1 Overview

Email notifications are sent via HTTP POST requests to a Power Automate flow endpoint. This approach provides enterprise-grade email delivery through Microsoft 365 without requiring direct SMTP configuration or credentials management within the application.

### 8.2 Power Automate Endpoint

**URL:** `https://a67592d2e775e14cbb5a6366576198.ca.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/763615b631ce494e82d00f5f75c49245/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=TLzkk5K0eB16pYdi0Rq3bVCuSnryqyKPV3u3FWF4Muw`

**Method:** POST  
**Content-Type:** application/json

### 8.3 Request Schema

```typescript
interface EmailRequest {
  /** Recipient email address(es), semicolon-separated for multiple */
  to: string;
  
  /** Email subject line */
  subject: string;
  
  /** Email body (HTML supported) */
  body: string;
  
  /** CC recipient(s), semicolon-separated (optional) */
  cc?: string;
  
  /** BCC recipient(s), semicolon-separated (optional) */
  bcc?: string;
  
  /** Email importance: Low, Normal, High (default: Normal) */
  importance?: 'Low' | 'Normal' | 'High';
  
  /** Reply-to address (optional, defaults to shared mailbox) */
  replyTo?: string;
}
```

### 8.4 JSON Schema

```json
{
  "type": "object",
  "properties": {
    "to": {
      "type": "string",
      "description": "Recipient email address(es), semicolon-separated for multiple"
    },
    "cc": {
      "type": "string",
      "description": "CC recipient(s), semicolon-separated (optional)"
    },
    "bcc": {
      "type": "string",
      "description": "BCC recipient(s), semicolon-separated (optional)"
    },
    "subject": {
      "type": "string",
      "description": "Email subject line"
    },
    "body": {
      "type": "string",
      "description": "Email body (HTML supported)"
    },
    "importance": {
      "type": "string",
      "description": "Email importance: Low, Normal, High (default: Normal)"
    },
    "replyTo": {
      "type": "string",
      "description": "Reply-to address (optional, defaults to shared mailbox)"
    }
  },
  "required": ["to", "subject", "body"]
}
```

### 8.5 Email Service Implementation

```typescript
// services/emailService.ts

import axios, { AxiosError } from 'axios';
import logger from '../config/logger';

/**
 * Email request payload for Power Automate endpoint.
 */
interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  importance?: 'Low' | 'Normal' | 'High';
  replyTo?: string;
}

/**
 * Email service result.
 */
interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Configuration for the email service.
 */
const EMAIL_CONFIG = {
  endpoint: process.env.POWER_AUTOMATE_EMAIL_URL,
  defaultReplyTo: process.env.EMAIL_REPLY_TO || 'redi@health.qld.gov.au',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

/**
 * Send an email via the Power Automate HTTP endpoint.
 * 
 * @param payload - Email content and recipients
 * @returns Result indicating success or failure
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const { endpoint, defaultReplyTo, timeout, retryAttempts, retryDelay } = EMAIL_CONFIG;
  
  if (!endpoint) {
    logger.error('Email endpoint not configured', {
      envVar: 'POWER_AUTOMATE_EMAIL_URL'
    });
    return { success: false, error: 'Email service not configured' };
  }
  
  const emailData = {
    ...payload,
    replyTo: payload.replyTo || defaultReplyTo,
    importance: payload.importance || 'Normal',
  };
  
  logger.debug('Sending email via Power Automate', {
    to: emailData.to,
    subject: emailData.subject,
    hasCC: !!emailData.cc,
    hasBCC: !!emailData.bcc,
  });
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const response = await axios.post(endpoint, emailData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout,
      });
      
      logger.info('Email sent successfully', {
        to: emailData.to,
        subject: emailData.subject,
        statusCode: response.status,
        attempt,
      });
      
      return { success: true };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status;
      
      logger.warn('Email send attempt failed', {
        to: emailData.to,
        subject: emailData.subject,
        attempt,
        maxAttempts: retryAttempts,
        statusCode,
        error: lastError.message,
      });
      
      // Don't retry on client errors (4xx)
      if (statusCode && statusCode >= 400 && statusCode < 500) {
        break;
      }
      
      // Wait before retrying
      if (attempt < retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
  
  logger.error('Email send failed after all attempts', {
    to: emailData.to,
    subject: emailData.subject,
    error: lastError?.message,
  });
  
  return { 
    success: false, 
    error: lastError?.message || 'Failed to send email' 
  };
}

/**
 * Send quiz completion notification.
 */
export async function sendCompletionNotification(params: {
  recipientEmail: string;
  userName: string;
  userEmail: string;
  quizTitle: string;
  score: number;
  percentage: number;
  passed: boolean;
  completedAt: Date;
}): Promise<EmailResult> {
  const { recipientEmail, userName, userEmail, quizTitle, score, percentage, passed, completedAt } = params;
  
  const statusText = passed ? 'PASSED' : 'DID NOT PASS';
  const statusColour = passed ? '#28A745' : '#DC3545';
  
  const body = `
    <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(90deg, #B8CC26, #2B9E9E, #1B3A5F); height: 8px;"></div>
      <div style="padding: 24px; background: #F5F5F5;">
        <h1 style="color: #1B3A5F; margin: 0 0 16px 0;">Quiz Completion Notification</h1>
        <p style="color: #333; margin: 0 0 24px 0;">
          A user has completed the <strong>${quizTitle}</strong> assessment.
        </p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <h2 style="color: #1B3A5F; font-size: 18px; margin: 0 0 16px 0;">User Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Name:</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600;">${userName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email:</td>
              <td style="padding: 8px 0; color: #333;">${userEmail}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: white; border-radius: 8px; padding: 20px;">
          <h2 style="color: #1B3A5F; font-size: 18px; margin: 0 0 16px 0;">Result</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 120px;">Status:</td>
              <td style="padding: 8px 0;">
                <span style="background: ${statusColour}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 600;">
                  ${statusText}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Score:</td>
              <td style="padding: 8px 0; color: #333; font-weight: 600;">${percentage.toFixed(1)}%</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Completed:</td>
              <td style="padding: 8px 0; color: #333;">${completedAt.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })}</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #666; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
          This is an automated notification from the REdI Quiz Platform.
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: recipientEmail,
    subject: `[REdI Quiz] ${userName} ${passed ? 'passed' : 'completed'} ${quizTitle}`,
    body,
    importance: passed ? 'Normal' : 'High',
  });
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmail(params: {
  recipientEmail: string;
  userName: string;
  resetLink: string;
  expiresIn: string;
}): Promise<EmailResult> {
  const { recipientEmail, userName, resetLink, expiresIn } = params;
  
  const body = `
    <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(90deg, #B8CC26, #2B9E9E, #1B3A5F); height: 8px;"></div>
      <div style="padding: 24px; background: #F5F5F5;">
        <h1 style="color: #1B3A5F; margin: 0 0 16px 0;">Password Reset Request</h1>
        <p style="color: #333; margin: 0 0 24px 0;">
          Hi ${userName},
        </p>
        <p style="color: #333; margin: 0 0 24px 0;">
          We received a request to reset your password for the REdI Quiz Platform. 
          Click the button below to set a new password:
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" 
             style="background: #E55B64; color: white; padding: 12px 32px; border-radius: 8px; 
                    text-decoration: none; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin: 0 0 16px 0;">
          This link will expire in ${expiresIn}.
        </p>
        <p style="color: #666; font-size: 14px; margin: 0;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
        
        <p style="color: #999; font-size: 12px; margin: 0;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${resetLink}" style="color: #2B9E9E;">${resetLink}</a>
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: recipientEmail,
    subject: '[REdI Quiz] Password Reset Request',
    body,
    importance: 'High',
  });
}

/**
 * Send quiz invitation email.
 */
export async function sendInviteEmail(params: {
  recipientEmail: string;
  recipientName?: string;
  quizTitle: string;
  inviteLink: string;
  expiresIn: string;
  senderName?: string;
}): Promise<EmailResult> {
  const { recipientEmail, recipientName, quizTitle, inviteLink, expiresIn, senderName } = params;
  
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
  const fromText = senderName ? ` from ${senderName}` : '';
  
  const body = `
    <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(90deg, #B8CC26, #2B9E9E, #1B3A5F); height: 8px;"></div>
      <div style="padding: 24px; background: #F5F5F5;">
        <h1 style="color: #1B3A5F; margin: 0 0 16px 0;">You're Invited to Complete an Assessment</h1>
        <p style="color: #333; margin: 0 0 24px 0;">
          ${greeting}
        </p>
        <p style="color: #333; margin: 0 0 24px 0;">
          You've been invited${fromText} to complete the <strong>${quizTitle}</strong> 
          assessment on the REdI Quiz Platform.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteLink}" 
             style="background: #E55B64; color: white; padding: 12px 32px; border-radius: 8px; 
                    text-decoration: none; font-weight: 600; display: inline-block;">
            Start Assessment
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin: 0 0 16px 0;">
          This invitation link will expire in ${expiresIn}.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
        
        <p style="color: #999; font-size: 12px; margin: 0;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${inviteLink}" style="color: #2B9E9E;">${inviteLink}</a>
        </p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: recipientEmail,
    subject: `[REdI Quiz] You're invited to complete: ${quizTitle}`,
    body,
  });
}
```

### 8.6 Error Handling

The email service implements the following error handling strategy:

| Scenario | Behaviour |
|----------|-----------|
| Endpoint not configured | Log error, return failure, do not retry |
| Network timeout | Retry up to 3 times with exponential backoff |
| Server error (5xx) | Retry up to 3 times with exponential backoff |
| Client error (4xx) | Log error, return failure, do not retry |
| All retries exhausted | Log error, return failure |

All email send attempts are logged to the `EmailLog` table regardless of success or failure.

---

## 9. Security Requirements

### 8.1 Authentication Security

| Requirement | Implementation |
|-------------|----------------|
| Password hashing | bcrypt with cost factor 12 |
| Minimum password length | 8 characters |
| Password complexity | At least one uppercase, lowercase, number |
| JWT access token expiry | 1 hour |
| Refresh token expiry | 7 days |
| Refresh token rotation | New refresh token on each use |
| Account lockout | After 5 failed attempts, 15 minute lockout |
| Session invalidation | Logout invalidates all refresh tokens |

### 8.2 Input Validation

| Data Type | Validation |
|-----------|------------|
| Email | RFC 5322 compliant, domain restriction for non-admin |
| Names | 1-100 characters, no script tags |
| Passwords | 8-128 characters, complexity requirements |
| Rich text | HTML sanitisation whitelist |
| File uploads | Type whitelist (jpg, png, gif, webp), max 5MB |
| IDs | UUID v4 format |

### 8.3 HTML Sanitisation Whitelist

Allowed tags for rich text fields:
- Structural: `p`, `br`, `div`, `span`
- Text: `strong`, `em`, `u`, `s`, `sub`, `sup`
- Lists: `ul`, `ol`, `li`
- Links: `a` (href attribute only, rel="noopener")
- Images: `img` (src, alt, width, height attributes)
- Tables: `table`, `thead`, `tbody`, `tr`, `th`, `td`

### 8.4 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| /api/auth/login | 5 requests/minute per IP |
| /api/auth/register | 3 requests/minute per IP |
| /api/auth/forgot-password | 3 requests/hour per email |
| /api/uploads/* | 10 requests/minute per user |
| All other endpoints | 100 requests/minute per user |

### 8.5 Audit Logging

All security-relevant events are logged:
- Login attempts (success/failure)
- Password changes
- Password resets
- Role changes
- Question bank status changes
- Data exports
- Account creation/deactivation

---

## 10. Coding Standards

### 9.1 TypeScript Standards

#### 9.1.1 File Organisation

```typescript
// File header comment template
/**
 * @file        Description of file purpose
 * @module      Module name
 * @description Detailed description of functionality
 * @requires    List of key dependencies
 * @author      Author name
 * @created     Date created
 * @modified    Date last modified
 */
```

#### 9.1.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (components) | PascalCase | `QuizPlayer.tsx` |
| Files (utilities) | camelCase | `scoringService.ts` |
| Classes | PascalCase | `QuestionBankService` |
| Interfaces | PascalCase with I prefix | `IQuizAttempt` |
| Types | PascalCase | `QuestionType` |
| Functions | camelCase | `calculateScore()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| Variables | camelCase | `currentQuestion` |
| Database columns | snake_case | `created_at` |
| API endpoints | kebab-case | `/question-banks` |

#### 9.1.3 Function Documentation

```typescript
/**
 * Calculate the score for a multiple choice question with multiple correct answers.
 * 
 * Uses fractional scoring where:
 * - Each correct selection adds 1/n points (n = total correct answers)
 * - Each incorrect selection subtracts 1/n points
 * - Minimum score is 0
 * 
 * @param selectedIds - Array of option IDs selected by the user
 * @param correctIds - Array of option IDs that are correct
 * @returns Score between 0 and 1 inclusive
 * 
 * @example
 * // 2 of 3 correct answers selected, no incorrect
 * calculateMultiScore(['a', 'b'], ['a', 'b', 'c']) // Returns 0.667
 * 
 * @throws {ValidationError} If arrays are empty
 */
function calculateMultiScore(
  selectedIds: string[],
  correctIds: string[]
): number {
  // Implementation
}
```

### 9.2 Error Handling

#### 9.2.1 Custom Error Classes

```typescript
// Base application error
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Specific error types
class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorisationError extends AppError {
  constructor(message: string = 'Access denied') {
    super('AUTHORISATION_ERROR', message, 403);
    this.name = 'AuthorisationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}
```

#### 9.2.2 Error Handling Pattern

```typescript
// Service layer
async function getQuestionBank(id: string, userId: string): Promise<QuestionBank> {
  logger.debug('Fetching question bank', { bankId: id, userId });
  
  try {
    const bank = await prisma.questionBank.findUnique({
      where: { id },
      include: { questions: true }
    });
    
    if (!bank) {
      logger.warn('Question bank not found', { bankId: id });
      throw new NotFoundError('Question bank');
    }
    
    logger.debug('Question bank retrieved successfully', { 
      bankId: id, 
      questionCount: bank.questions.length 
    });
    
    return bank;
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Database error fetching question bank', { 
      bankId: id, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    throw new AppError(
      'DATABASE_ERROR',
      'Failed to retrieve question bank',
      500
    );
  }
}
```

### 9.3 Logging Standards

#### 9.3.1 Log Levels

| Level | Usage |
|-------|-------|
| ERROR | Errors requiring immediate attention |
| WARN | Unexpected situations that don't prevent operation |
| INFO | Significant business events (login, quiz completion) |
| DEBUG | Detailed diagnostic information |

#### 9.3.2 Logging Configuration

```typescript
// config/logger.ts
import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || './logs';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'redi-quiz-api' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
      tailable: true
    }),
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      silent: process.env.NODE_ENV === 'test'
    })
  ]
});

export default logger;
```

#### 9.3.3 Structured Logging

```typescript
// Always include context in log messages
logger.info('User logged in successfully', {
  userId: user.id,
  email: user.email,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});

logger.error('Failed to submit quiz attempt', {
  attemptId: attempt.id,
  userId: user.id,
  bankId: attempt.bankId,
  error: error.message,
  stack: error.stack
});
```

### 9.4 Database Patterns

#### 9.4.1 Transaction Pattern

```typescript
async function submitQuizAttempt(
  attemptId: string,
  responses: QuizResponse[]
): Promise<QuizAttemptResult> {
  logger.debug('Submitting quiz attempt', { attemptId });
  
  return await prisma.$transaction(async (tx) => {
    // Get attempt with lock
    const attempt = await tx.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { bank: true }
    });
    
    if (!attempt) {
      throw new NotFoundError('Quiz attempt');
    }
    
    // Calculate scores
    const result = await calculateResults(attempt, responses);
    
    // Update attempt
    const updatedAttempt = await tx.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'COMPLETED',
        score: result.score,
        maxScore: result.maxScore,
        percentage: result.percentage,
        passed: result.passed,
        completedAt: new Date(),
        responses: responses as unknown as Prisma.JsonValue
      }
    });
    
    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: attempt.userId,
        action: 'QUIZ_SUBMITTED',
        entityType: 'QuizAttempt',
        entityId: attemptId,
        details: {
          score: result.score,
          percentage: result.percentage,
          passed: result.passed
        }
      }
    });
    
    logger.info('Quiz attempt submitted successfully', {
      attemptId,
      userId: attempt.userId,
      score: result.score,
      passed: result.passed
    });
    
    return updatedAttempt;
  });
}
```

### 9.5 Frontend Patterns

#### 9.5.1 Component Structure

```typescript
// components/quiz/QuizCard.tsx

/**
 * @file        QuizCard component
 * @description Displays a question bank as a selectable card on the dashboard
 * @module      Quiz
 */

import React, { FC, memo } from 'react';
import { Link } from 'react-router-dom';
import { IQuestionBank } from '@/types';
import { formatDuration } from '@/utils/helpers';
import styles from './QuizCard.module.css';

interface QuizCardProps {
  /** The question bank to display */
  bank: IQuestionBank;
  /** User's previous attempts on this bank */
  attempts: number;
  /** User's best score percentage */
  bestScore?: number;
  /** Whether the user can start a new attempt */
  canAttempt: boolean;
}

/**
 * Renders a question bank as an interactive card.
 * Displays bank metadata and user's attempt history.
 */
export const QuizCard: FC<QuizCardProps> = memo(({
  bank,
  attempts,
  bestScore,
  canAttempt
}) => {
  const attemptsText = bank.maxAttempts === 0 
    ? `${attempts} attempts`
    : `${attempts}/${bank.maxAttempts} attempts`;
    
  return (
    <article className={styles.card} data-testid="quiz-card">
      <header className={styles.header}>
        <h3 className={styles.title}>{bank.title}</h3>
        {bank.status === 'PUBLIC' && (
          <span className={styles.badge}>Public</span>
        )}
      </header>
      
      <div className={styles.meta}>
        <span>{bank.questionCount} questions</span>
        {bank.timeLimit > 0 && (
          <span>{formatDuration(bank.timeLimit)}</span>
        )}
        <span>Pass: {bank.passingScore}%</span>
      </div>
      
      <div className={styles.stats}>
        <span>{attemptsText}</span>
        {bestScore !== undefined && (
          <span>Best: {bestScore}%</span>
        )}
      </div>
      
      <footer className={styles.footer}>
        {canAttempt ? (
          <Link 
            to={`/quiz/${bank.id}/start`}
            className="btn btn-primary"
          >
            Start Quiz
          </Link>
        ) : (
          <span className={styles.limitReached}>
            Attempt limit reached
          </span>
        )}
      </footer>
    </article>
  );
});

QuizCard.displayName = 'QuizCard';
```

#### 9.5.2 Custom Hook Pattern

```typescript
// hooks/useQuiz.ts

/**
 * @file        useQuiz hook
 * @description Manages quiz attempt state and API interactions
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { logger } from '@/utils/logger';
import type { IQuizAttempt, IQuizQuestion, IQuizResponse } from '@/types';

interface UseQuizOptions {
  attemptId: string;
  autoSaveInterval?: number;
}

interface UseQuizReturn {
  attempt: IQuizAttempt | null;
  currentQuestion: IQuizQuestion | null;
  currentIndex: number;
  responses: Map<string, IQuizResponse>;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  timeRemaining: number | null;
  goToQuestion: (index: number) => void;
  setResponse: (questionId: string, response: IQuizResponse) => void;
  saveProgress: () => Promise<void>;
  submitQuiz: () => Promise<void>;
}

export function useQuiz({ 
  attemptId, 
  autoSaveInterval = 30000 
}: UseQuizOptions): UseQuizReturn {
  const [attempt, setAttempt] = useState<IQuizAttempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, IQuizResponse>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const navigate = useNavigate();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const timerRef = useRef<NodeJS.Timeout>();
  
  // Load attempt on mount
  useEffect(() => {
    async function loadAttempt() {
      logger.debug('Loading quiz attempt', { attemptId });
      
      try {
        const data = await api.get<IQuizAttempt>(`/attempts/${attemptId}`);
        setAttempt(data);
        
        // Restore responses
        if (data.responses) {
          const responseMap = new Map<string, IQuizResponse>();
          data.responses.forEach(r => responseMap.set(r.questionId, r));
          setResponses(responseMap);
        }
        
        // Calculate time remaining
        if (data.bank.timeLimit > 0) {
          const elapsed = Math.floor(
            (Date.now() - new Date(data.startedAt).getTime()) / 1000
          );
          const remaining = (data.bank.timeLimit * 60) - elapsed;
          setTimeRemaining(Math.max(0, remaining));
        }
        
        logger.debug('Quiz attempt loaded', { 
          attemptId, 
          questionCount: data.questionOrder.length 
        });
        
      } catch (err) {
        logger.error('Failed to load quiz attempt', { attemptId, error: err });
        setError(err instanceof Error ? err : new Error('Failed to load quiz'));
      } finally {
        setIsLoading(false);
      }
    }
    
    loadAttempt();
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [attemptId]);
  
  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          // Time's up - auto submit
          submitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemaining]);
  
  // Auto-save
  useEffect(() => {
    if (!attempt || responses.size === 0) return;
    
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress();
    }, autoSaveInterval);
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [responses, autoSaveInterval]);
  
  const goToQuestion = useCallback((index: number) => {
    if (!attempt) return;
    const maxIndex = attempt.questionOrder.length - 1;
    setCurrentIndex(Math.max(0, Math.min(index, maxIndex)));
  }, [attempt]);
  
  const setResponse = useCallback((questionId: string, response: IQuizResponse) => {
    setResponses(prev => {
      const next = new Map(prev);
      next.set(questionId, response);
      return next;
    });
  }, []);
  
  const saveProgress = useCallback(async () => {
    if (!attempt || isSaving) return;
    
    logger.debug('Saving quiz progress', { attemptId, responseCount: responses.size });
    setIsSaving(true);
    
    try {
      await api.patch(`/attempts/${attemptId}`, {
        responses: Array.from(responses.values())
      });
      logger.debug('Quiz progress saved');
    } catch (err) {
      logger.warn('Failed to save quiz progress', { attemptId, error: err });
      // Don't set error - this is a background save
    } finally {
      setIsSaving(false);
    }
  }, [attempt, attemptId, responses, isSaving]);
  
  const submitQuiz = useCallback(async () => {
    if (!attempt) return;
    
    logger.info('Submitting quiz', { attemptId, responseCount: responses.size });
    setIsSaving(true);
    
    try {
      await api.post(`/attempts/${attemptId}/submit`, {
        responses: Array.from(responses.values())
      });
      
      logger.info('Quiz submitted successfully', { attemptId });
      navigate(`/quiz/${attemptId}/results`);
      
    } catch (err) {
      logger.error('Failed to submit quiz', { attemptId, error: err });
      setError(err instanceof Error ? err : new Error('Failed to submit quiz'));
    } finally {
      setIsSaving(false);
    }
  }, [attempt, attemptId, responses, navigate]);
  
  const currentQuestion = attempt?.questions?.[currentIndex] ?? null;
  
  return {
    attempt,
    currentQuestion,
    currentIndex,
    responses,
    isLoading,
    isSaving,
    error,
    timeRemaining,
    goToQuestion,
    setResponse,
    saveProgress,
    submitQuiz
  };
}
```

---

## 11. Build Plan

### 10.1 Phase Overview

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | 2 weeks | Foundation (Auth, Database, Core API) |
| Phase 2 | 2 weeks | Question Bank Management |
| Phase 3 | 2 weeks | Quiz Delivery |
| Phase 4 | 2 weeks | Admin Features |
| Phase 5 | 1 week | Polish, Testing, Documentation |

### 10.2 Phase 1: Foundation

**Week 1**
- Project scaffolding
- Docker configuration
- Database schema
- Authentication system

**Week 2**
- User management API
- Frontend authentication
- Basic layout components
- Logging infrastructure

### 10.3 Phase 2: Question Bank Management

**Week 3**
- Question bank CRUD API
- Question CRUD API
- Rich text editor integration
- Image upload system

**Week 4**
- Question bank editor UI
- Question type components (editor mode)
- Import/export functionality
- Question reordering

### 10.4 Phase 3: Quiz Delivery

**Week 5**
- Quiz generation logic
- Scoring engine
- Quiz player API
- Auto-save functionality

**Week 6**
- Quiz player UI
- Question type components (player mode)
- Timer system
- Results display

### 10.5 Phase 4: Admin Features

**Week 7**
- User management UI
- Role-based access control
- Completion dashboard
- Notification system

**Week 8**
- Log viewer
- CSV export
- Statistics dashboard
- Token-based invitations

### 10.6 Phase 5: Polish

**Week 9**
- Accessibility audit
- Performance optimisation
- Security hardening
- Documentation completion
- Deployment preparation

---

## 12. Granular Task List

### 11.1 Phase 1: Foundation

#### 11.1.1 Project Setup

| ID | Task | Estimate |
|----|------|----------|
| P1-001 | Create repository structure | 1h |
| P1-002 | Configure TypeScript for backend | 1h |
| P1-003 | Configure TypeScript for frontend | 1h |
| P1-004 | Create Docker Compose development configuration | 2h |
| P1-005 | Create Docker Compose production configuration | 2h |
| P1-006 | Create Nginx configuration | 2h |
| P1-007 | Create environment variable templates | 1h |
| P1-008 | Configure ESLint rules | 1h |
| P1-009 | Configure Prettier | 0.5h |
| P1-010 | Create backend Dockerfile | 1h |
| P1-011 | Create frontend Dockerfile | 1h |

#### 11.1.2 Database Setup

| ID | Task | Estimate |
|----|------|----------|
| P1-012 | Install Prisma dependencies | 0.5h |
| P1-013 | Define User model in schema | 1h |
| P1-014 | Define QuestionBank model in schema | 1h |
| P1-015 | Define Question model in schema | 1.5h |
| P1-016 | Define QuizAttempt model in schema | 1h |
| P1-017 | Define AuditLog model in schema | 0.5h |
| P1-018 | Define EmailLog model in schema | 0.5h |
| P1-019 | Define PasswordReset model in schema | 0.5h |
| P1-020 | Define InviteToken model in schema | 0.5h |
| P1-021 | Create initial migration | 1h |
| P1-022 | Create database seed script | 2h |

#### 11.1.3 Backend Core

| ID | Task | Estimate |
|----|------|----------|
| P1-023 | Create Express application scaffold | 1h |
| P1-024 | Create configuration module | 1h |
| P1-025 | Create logger configuration | 1h |
| P1-026 | Create database connection module | 1h |
| P1-027 | Create error handling middleware | 2h |
| P1-028 | Create request validation middleware | 2h |
| P1-029 | Create rate limiting middleware | 1h |
| P1-030 | Create CORS configuration | 0.5h |
| P1-031 | Create health check endpoint | 0.5h |

#### 11.1.4 Authentication

| ID | Task | Estimate |
|----|------|----------|
| P1-032 | Create JWT utility functions | 2h |
| P1-033 | Create password hashing service | 1h |
| P1-034 | Create auth middleware | 2h |
| P1-035 | Create role authorization middleware | 1h |
| P1-036 | Implement user registration endpoint | 3h |
| P1-037 | Implement email domain validation | 1h |
| P1-038 | Implement user login endpoint | 2h |
| P1-039 | Implement token refresh endpoint | 2h |
| P1-040 | Implement logout endpoint | 1h |
| P1-041 | Implement forgot password endpoint | 2h |
| P1-042 | Implement reset password endpoint | 2h |
| P1-043 | Implement token-based auto-login | 2h |
| P1-044 | Create auth validators | 2h |

#### 11.1.5 User Management API

| ID | Task | Estimate |
|----|------|----------|
| P1-045 | Implement get current user endpoint | 1h |
| P1-046 | Implement update current user endpoint | 2h |
| P1-047 | Implement change password endpoint | 1h |
| P1-048 | Implement list users endpoint (admin) | 2h |
| P1-049 | Implement get user endpoint (admin) | 1h |
| P1-050 | Implement create user endpoint (admin) | 2h |
| P1-051 | Implement update user endpoint (admin) | 2h |
| P1-052 | Implement deactivate user endpoint (admin) | 1h |
| P1-053 | Implement admin password reset endpoint | 1h |
| P1-054 | Create user validators | 2h |

#### 11.1.6 Frontend Foundation

| ID | Task | Estimate |
|----|------|----------|
| P1-055 | Create Vite project configuration | 1h |
| P1-056 | Create REdI design tokens CSS file | 2h |
| P1-057 | Create global styles | 2h |
| P1-058 | Create Button component | 1h |
| P1-059 | Create Input component | 1h |
| P1-060 | Create Card component | 1h |
| P1-061 | Create Alert component | 1h |
| P1-062 | Create Spinner component | 0.5h |
| P1-063 | Create Modal component | 2h |
| P1-064 | Create GradientBar component | 0.5h |
| P1-065 | Create Header component | 2h |
| P1-066 | Create Footer component | 1h |
| P1-067 | Create Layout component | 1h |
| P1-068 | Configure React Router | 1h |
| P1-069 | Create API service module | 2h |
| P1-070 | Create AuthContext | 2h |
| P1-071 | Create useAuth hook | 2h |

#### 11.1.7 Frontend Auth Pages

| ID | Task | Estimate |
|----|------|----------|
| P1-072 | Create LoginForm component | 2h |
| P1-073 | Create RegisterForm component | 2h |
| P1-074 | Create ResetPasswordForm component | 2h |
| P1-075 | Create Login page | 1h |
| P1-076 | Create Register page | 1h |
| P1-077 | Create Forgot Password page | 1h |
| P1-078 | Create Reset Password page | 1h |
| P1-079 | Create protected route wrapper | 1h |

### 11.2 Phase 2: Question Bank Management

#### 11.2.1 Question Bank API

| ID | Task | Estimate |
|----|------|----------|
| P2-001 | Implement list question banks endpoint | 2h |
| P2-002 | Implement get question bank endpoint | 1h |
| P2-003 | Implement create question bank endpoint | 2h |
| P2-004 | Implement update question bank endpoint | 2h |
| P2-005 | Implement delete question bank endpoint | 1h |
| P2-006 | Implement duplicate question bank endpoint | 2h |
| P2-007 | Implement question bank ownership validation | 1h |
| P2-008 | Create question bank validators | 2h |

#### 11.2.2 Question API

| ID | Task | Estimate |
|----|------|----------|
| P2-009 | Implement list questions endpoint | 2h |
| P2-010 | Implement get question endpoint | 1h |
| P2-011 | Implement create question endpoint | 3h |
| P2-012 | Implement update question endpoint | 3h |
| P2-013 | Implement delete question endpoint | 1h |
| P2-014 | Implement duplicate question endpoint | 2h |
| P2-015 | Implement reorder questions endpoint | 2h |
| P2-016 | Create question type validators | 3h |

#### 11.2.3 File Upload

| ID | Task | Estimate |
|----|------|----------|
| P2-017 | Configure multer for file uploads | 1h |
| P2-018 | Implement image upload endpoint | 2h |
| P2-019 | Implement image deletion endpoint | 1h |
| P2-020 | Create file validation middleware | 1h |
| P2-021 | Create image storage service | 2h |

#### 11.2.4 Import/Export

| ID | Task | Estimate |
|----|------|----------|
| P2-022 | Define JSON export schema | 1h |
| P2-023 | Implement question bank export endpoint | 3h |
| P2-024 | Implement question bank import endpoint | 4h |
| P2-025 | Create import validation logic | 3h |

#### 11.2.5 Rich Text Editor

| ID | Task | Estimate |
|----|------|----------|
| P2-026 | Install TipTap editor dependencies | 0.5h |
| P2-027 | Create RichTextEditor component | 4h |
| P2-028 | Configure allowed HTML elements | 1h |
| P2-029 | Add image insertion support | 2h |
| P2-030 | Create HTML sanitisation utility | 2h |

#### 11.2.6 Question Bank Editor UI

| ID | Task | Estimate |
|----|------|----------|
| P2-031 | Create QuestionBankList page | 3h |
| P2-032 | Create QuestionBankEditor component | 4h |
| P2-033 | Create QuestionBankSettings component | 2h |
| P2-034 | Create QuestionList component | 2h |
| P2-035 | Create QuestionEditor component shell | 2h |
| P2-036 | Create import/export UI | 2h |

#### 11.2.7 Question Type Editors

| ID | Task | Estimate |
|----|------|----------|
| P2-037 | Create MultipleChoiceEditor component | 4h |
| P2-038 | Create TrueFalseEditor component | 2h |
| P2-039 | Create DragOrderEditor component | 4h |
| P2-040 | Create ImageMapEditor component | 6h |
| P2-041 | Create SliderEditor component | 3h |
| P2-042 | Create question type selector component | 1h |

### 11.3 Phase 3: Quiz Delivery

#### 11.3.1 Quiz Generation

| ID | Task | Estimate |
|----|------|----------|
| P3-001 | Create quiz generation service | 3h |
| P3-002 | Implement question selection algorithm | 2h |
| P3-003 | Implement question randomisation | 1h |
| P3-004 | Implement answer randomisation | 1h |
| P3-005 | Implement attempt limit validation | 1h |

#### 11.3.2 Scoring Engine

| ID | Task | Estimate |
|----|------|----------|
| P3-006 | Create scoring service module | 1h |
| P3-007 | Implement single-answer MCQ scoring | 1h |
| P3-008 | Implement multi-answer MCQ scoring | 2h |
| P3-009 | Implement true/false scoring | 0.5h |
| P3-010 | Implement drag-order scoring | 1h |
| P3-011 | Implement image-map scoring | 2h |
| P3-012 | Implement slider scoring | 1h |
| P3-013 | Create total score calculation | 1h |

#### 11.3.3 Quiz Attempt API

| ID | Task | Estimate |
|----|------|----------|
| P3-014 | Implement start quiz endpoint | 3h |
| P3-015 | Implement get attempt endpoint | 2h |
| P3-016 | Implement save progress endpoint | 2h |
| P3-017 | Implement submit quiz endpoint | 3h |
| P3-018 | Implement get results endpoint | 2h |
| P3-019 | Implement list user attempts endpoint | 2h |
| P3-020 | Create quiz attempt validators | 2h |

#### 11.3.4 Quiz Player UI

| ID | Task | Estimate |
|----|------|----------|
| P3-021 | Create QuizContext | 2h |
| P3-022 | Create useQuiz hook | 4h |
| P3-023 | Create useTimer hook | 2h |
| P3-024 | Create QuizPlayer component shell | 2h |
| P3-025 | Create Timer component | 2h |
| P3-026 | Create ProgressBar component | 1h |
| P3-027 | Create QuestionNavigation component | 2h |
| P3-028 | Create QuizHeader component | 1h |
| P3-029 | Create QuizFooter component | 1h |

#### 11.3.5 Question Type Players

| ID | Task | Estimate |
|----|------|----------|
| P3-030 | Create MultipleChoicePlayer component | 3h |
| P3-031 | Create TrueFalsePlayer component | 2h |
| P3-032 | Create DragOrderPlayer component | 5h |
| P3-033 | Create ImageMapPlayer component | 5h |
| P3-034 | Create SliderPlayer component | 3h |
| P3-035 | Create FeedbackDisplay component | 2h |

#### 11.3.6 Results Display

| ID | Task | Estimate |
|----|------|----------|
| P3-036 | Create QuizResults page | 3h |
| P3-037 | Create ScoreSummary component | 2h |
| P3-038 | Create QuestionReview component | 3h |
| P3-039 | Create PassFailBanner component | 1h |

#### 11.3.7 Quiz List

| ID | Task | Estimate |
|----|------|----------|
| P3-040 | Create QuizCard component | 2h |
| P3-041 | Create QuizList page | 2h |
| P3-042 | Create QuizStartModal component | 2h |

### 11.4 Phase 4: Admin Features

#### 11.4.1 Email Notifications

| ID | Task | Estimate |
|----|------|----------|
| P4-001 | Create email service module | 2h |
| P4-002 | Configure Power Automate HTTP client | 1h |
| P4-003 | Create completion notification template | 2h |
| P4-004 | Create password reset email template | 1h |
| P4-005 | Create invite email template | 1h |
| P4-006 | Implement notification on quiz pass | 2h |
| P4-007 | Create email logging | 1h |

#### 11.4.2 Admin API

| ID | Task | Estimate |
|----|------|----------|
| P4-008 | Implement list completions endpoint | 3h |
| P4-009 | Implement completions export endpoint | 2h |
| P4-010 | Implement get logs endpoint | 2h |
| P4-011 | Implement get statistics endpoint | 2h |
| P4-012 | Implement generate invite token endpoint | 2h |

#### 11.4.3 Audit Logging

| ID | Task | Estimate |
|----|------|----------|
| P4-013 | Create audit logging service | 2h |
| P4-014 | Implement login attempt logging | 1h |
| P4-015 | Implement password change logging | 1h |
| P4-016 | Implement role change logging | 1h |
| P4-017 | Implement question bank status logging | 1h |
| P4-018 | Implement data export logging | 1h |

#### 11.4.4 Admin Dashboard UI

| ID | Task | Estimate |
|----|------|----------|
| P4-019 | Create AdminLayout component | 2h |
| P4-020 | Create AdminSidebar component | 2h |
| P4-021 | Create StatCard component | 1h |
| P4-022 | Create AdminDashboard page | 3h |

#### 11.4.5 User Management UI

| ID | Task | Estimate |
|----|------|----------|
| P4-023 | Create UserTable component | 3h |
| P4-024 | Create UserEditModal component | 2h |
| P4-025 | Create UserCreateModal component | 2h |
| P4-026 | Create Users page | 2h |
| P4-027 | Create role selector component | 1h |

#### 11.4.6 Completion Dashboard UI

| ID | Task | Estimate |
|----|------|----------|
| P4-028 | Create CompletionTable component | 3h |
| P4-029 | Create CompletionFilters component | 2h |
| P4-030 | Create DateRangePicker component | 2h |
| P4-031 | Create Completions page | 2h |
| P4-032 | Create CSV export button | 1h |

#### 11.4.7 Log Viewer UI

| ID | Task | Estimate |
|----|------|----------|
| P4-033 | Create LogTable component | 2h |
| P4-034 | Create LogFilters component | 2h |
| P4-035 | Create LogDetail modal | 1h |
| P4-036 | Create Logs page | 2h |

#### 11.4.8 Invite System UI

| ID | Task | Estimate |
|----|------|----------|
| P4-037 | Create InviteTokenForm component | 2h |
| P4-038 | Create InviteTokenList component | 2h |
| P4-039 | Add invite management to admin | 1h |

### 11.5 Phase 5: Polish

#### 11.5.1 Accessibility

| ID | Task | Estimate |
|----|------|----------|
| P5-001 | Audit colour contrast ratios | 2h |
| P5-002 | Add ARIA labels to interactive elements | 3h |
| P5-003 | Test keyboard navigation | 2h |
| P5-004 | Test with screen reader | 2h |
| P5-005 | Fix identified accessibility issues | 4h |

#### 11.5.2 Performance

| ID | Task | Estimate |
|----|------|----------|
| P5-006 | Add database query indexes | 2h |
| P5-007 | Implement API response caching | 2h |
| P5-008 | Optimise frontend bundle size | 2h |
| P5-009 | Add lazy loading for routes | 2h |
| P5-010 | Profile and fix slow queries | 3h |

#### 11.5.3 Security

| ID | Task | Estimate |
|----|------|----------|
| P5-011 | Security audit of auth flows | 2h |
| P5-012 | Test rate limiting effectiveness | 1h |
| P5-013 | Verify input sanitisation | 2h |
| P5-014 | Test role-based access control | 2h |
| P5-015 | Configure security headers | 1h |

#### 11.5.4 Testing

| ID | Task | Estimate |
|----|------|----------|
| P5-016 | Write unit tests for scoring service | 3h |
| P5-017 | Write unit tests for auth service | 2h |
| P5-018 | Write integration tests for quiz flow | 4h |
| P5-019 | Write integration tests for admin flow | 3h |
| P5-020 | Set up test coverage reporting | 1h |

#### 11.5.5 Documentation

| ID | Task | Estimate |
|----|------|----------|
| P5-021 | Write README.md | 2h |
| P5-022 | Document API endpoints | 3h |
| P5-023 | Document deployment process | 2h |
| P5-024 | Document backup/restore procedures | 1h |
| P5-025 | Create admin user guide | 2h |

#### 11.5.6 Deployment

| ID | Task | Estimate |
|----|------|----------|
| P5-026 | Create production Docker images | 2h |
| P5-027 | Configure SSL certificates | 1h |
| P5-028 | Set up database backup cron job | 1h |
| P5-029 | Create deployment script | 2h |
| P5-030 | Perform production deployment | 2h |

---

## 13. Example Data Schema

### 12.1 Question Bank JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "REdI Question Bank Export",
  "type": "object",
  "required": ["version", "exportedAt", "bank", "questions"],
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0"
    },
    "exportedAt": {
      "type": "string",
      "format": "date-time"
    },
    "bank": {
      "type": "object",
      "required": ["title", "status", "passingScore"],
      "properties": {
        "title": { "type": "string" },
        "description": { "type": ["string", "null"] },
        "status": { 
          "type": "string",
          "enum": ["DRAFT", "OPEN", "PUBLIC", "ARCHIVED"]
        },
        "timeLimit": { "type": "integer", "minimum": 0 },
        "randomQuestions": { "type": "boolean" },
        "randomAnswers": { "type": "boolean" },
        "passingScore": { "type": "integer", "minimum": 0, "maximum": 100 },
        "feedbackTiming": {
          "type": "string",
          "enum": ["IMMEDIATE", "END", "NONE"]
        },
        "notificationEmail": { "type": ["string", "null"] },
        "questionCount": { "type": "integer", "minimum": 1 },
        "maxAttempts": { "type": "integer", "minimum": 0 }
      }
    },
    "questions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "prompt", "options", "correctAnswer", "feedback"],
        "properties": {
          "type": {
            "type": "string",
            "enum": [
              "MULTIPLE_CHOICE_SINGLE",
              "MULTIPLE_CHOICE_MULTI",
              "TRUE_FALSE",
              "DRAG_ORDER",
              "IMAGE_MAP",
              "SLIDER"
            ]
          },
          "prompt": { "type": "string" },
          "promptImage": { "type": ["string", "null"] },
          "options": { "type": ["array", "object"] },
          "correctAnswer": {},
          "feedback": { "type": "string" },
          "feedbackImage": { "type": ["string", "null"] },
          "referenceLink": { "type": ["string", "null"] },
          "order": { "type": "integer" }
        }
      }
    }
  }
}
```

### 12.2 Sample Question Bank Export

Based on the provided ALS Quiz document:

```json
{
  "version": "1.0",
  "exportedAt": "2026-01-30T10:00:00Z",
  "bank": {
    "title": "ALS Theory Assessment",
    "description": "Advanced Life Support pre-course knowledge assessment covering resuscitation principles, rhythm recognition, and emergency response protocols.",
    "status": "PUBLIC",
    "timeLimit": 30,
    "randomQuestions": true,
    "randomAnswers": false,
    "passingScore": 80,
    "feedbackTiming": "END",
    "notificationEmail": "redi@health.qld.gov.au",
    "questionCount": 20,
    "maxAttempts": 3
  },
  "questions": [
    {
      "type": "TRUE_FALSE",
      "prompt": "<p>You are the first responder to a patient who has collapsed. There are no dangers and the patient is unresponsive. Help has been called. The airway is opened with head-tilt and chin-lift, and it looks clear, but there is no breathing.</p><p>True or false: Two rescue breaths (mask ventilations) should be performed before commencing CPR.</p>",
      "promptImage": null,
      "options": [
        { "id": "true", "text": "True" },
        { "id": "false", "text": "False" }
      ],
      "correctAnswer": "false",
      "feedback": "<p>There is no role for rescue breaths before commencing CPR.</p>",
      "feedbackImage": null,
      "referenceLink": null,
      "order": 1
    },
    {
      "type": "TRUE_FALSE",
      "prompt": "<p>True or false: in a patient who is unresponsive and not breathing, with no signs of life, a pulse check is not recommended.</p>",
      "promptImage": null,
      "options": [
        { "id": "true", "text": "True" },
        { "id": "false", "text": "False" }
      ],
      "correctAnswer": "true",
      "feedback": "<p>If the patient is unresponsive and not breathing normally, a pulse check is not recommended; CPR should be commenced immediately.</p>",
      "feedbackImage": null,
      "referenceLink": null,
      "order": 2
    },
    {
      "type": "TRUE_FALSE",
      "prompt": "<p>True or false: most people become fatigued after performing chest compressions for 60-90 seconds.</p>",
      "promptImage": null,
      "options": [
        { "id": "true", "text": "True" },
        { "id": "false", "text": "False" }
      ],
      "correctAnswer": "true",
      "feedback": "<p>Fit and healthy adults fatigue noticeably after 60-90 seconds. CPR operators should be swapped every two minutes.</p>",
      "feedbackImage": null,
      "referenceLink": null,
      "order": 3
    },
    {
      "type": "MULTIPLE_CHOICE_SINGLE",
      "prompt": "<p>The patient has a pulse. This rhythm is:</p>",
      "promptImage": "images/ecg-vt-with-pulse.png",
      "options": [
        { "id": "opt-a", "text": "Sinus Tachycardia" },
        { "id": "opt-b", "text": "Atrial Fibrillation with rapid ventricular response" },
        { "id": "opt-c", "text": "Supraventricular Tachycardia" },
        { "id": "opt-d", "text": "Ventricular Tachycardia" },
        { "id": "opt-e", "text": "Torsades de Pointes" }
      ],
      "correctAnswer": "opt-d",
      "feedback": "<p>This is Ventricular Tachycardia, fast, wide and regular.</p><p>It is possible for this to be another rhythm, such as an SVT with a bundle branch block. More information is needed to be certain. In the meantime, or if there is doubt, manage the patient as if they are in Ventricular Tachycardia.</p>",
      "feedbackImage": null,
      "referenceLink": null,
      "order": 4
    },
    {
      "type": "MULTIPLE_CHOICE_SINGLE",
      "prompt": "<p>The patient is awake, and has a pulse, but is hypotensive at 70/40, and is pale and clammy. The ECG is shown. What is the most appropriate intervention?</p>",
      "promptImage": "images/ecg-unstable-vt.png",
      "options": [
        { "id": "opt-a", "text": "IV Amiodarone 300mg" },
        { "id": "opt-b", "text": "IV Adenosine 6mg" },
        { "id": "opt-c", "text": "Synchronised Cardioversion at 120-150J" },
        { "id": "opt-d", "text": "Defibrillation at 200J" },
        { "id": "opt-e", "text": "IV Metoprolol 5mg" }
      ],
      "correctAnswer": "opt-c",
      "feedback": "<p>This is an unstable patient in a wide complex tachycardia; the recommended treatment is synchronised cardioversion, at 120-150J.</p>",
      "feedbackImage": null,
      "referenceLink": null,
      "order": 5
    },
    {
      "type": "MULTIPLE_CHOICE_SINGLE",
      "prompt": "<p>What is generally the priority for the second person arriving at the scene of a collapsed patient?</p>",
      "promptImage": null,
      "options": [
        { "id": "opt-a", "text": "Call 333" },
        { "id": "opt-b", "text": "Take over chest compressions" },
        { "id": "opt-c", "text": "Retrieve and apply a defibrillator" },
        { "id": "opt-d", "text": "Prepare IV access equipment" },
        { "id": "opt-e", "text": "Begin bag-valve-mask ventilation" }
      ],
      "correctAnswer": "opt-c",
      "feedback": "<p>Defibrillation is the most time critical intervention, so the second person should retrieve and apply a defibrillator. Other tasks, such as calling 333 and adding mask ventilation, are left for the third responder.</p>",
      "feedbackImage": null,
      "referenceLink": null,
      "order": 6
    },
    {
      "type": "MULTIPLE_CHOICE_SINGLE",
      "prompt": "<p>Your team leader has asked for you to insert an IV cannula, and collect and send a blood gas sample. Which of the following is the best example of closed loop communication?</p>",
      "promptImage": null,
      "options": [
        { "id": "opt-a", "text": "\"Yes, will do\"" },
        { "id": "opt-b", "text": "\"I'll insert an IV cannula and collect a blood gas sample\"" },
        { "id": "opt-c", "text": "\"IV cannula and blood gas - done\"" },
        { "id": "opt-d", "text": "\"I'll insert an IV cannula and collect a blood gas sample\" followed by \"IV cannula inserted and blood gas sent\"" }
      ],
      "correctAnswer": "opt-d",
      "feedback": "<p>Closing the loop includes both repeating back the initial message or instruction; and then confirming when the task has been completed.</p>",
      "feedbackImage": null,
      "referenceLink": null,
      "order": 7
    },
    {
      "type": "MULTIPLE_CHOICE_SINGLE",
      "prompt": "<p>Which size Nasopharyngeal Airway should be used for a large adult?</p>",
      "promptImage": null,
      "options": [
        { "id": "opt-a", "text": "5.0 - 6.0mm" },
        { "id": "opt-b", "text": "6.0 - 7.0mm" },
        { "id": "opt-c", "text": "7.0 - 8.0mm" },
        { "id": "opt-d", "text": "8.0 - 9.0mm" }
      ],
      "correctAnswer": "opt-c",
      "feedback": "<p>When sizing Nasopharyngeal Airways - it is now recommended to use 6.0 - 7.0mm airways for small adults and 7.0 to 8.0mm airways for large adults.</p>",
      "feedbackImage": null,
      "referenceLink": null,
      "order": 8
    }
  ]
}
```

---

## Appendix A: Technology Reference

### A.1 Key Dependencies

#### Backend

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.x | Web framework |
| prisma | ^5.x | Database ORM |
| @prisma/client | ^5.x | Database client |
| jsonwebtoken | ^9.x | JWT handling |
| bcrypt | ^5.x | Password hashing |
| express-validator | ^7.x | Input validation |
| winston | ^3.x | Logging |
| multer | ^1.x | File uploads |
| axios | ^1.x | HTTP client (API, email) |
| dompurify | ^3.x | HTML sanitisation |
| express-rate-limit | ^7.x | Rate limiting |
| cors | ^2.x | CORS handling |
| helmet | ^7.x | Security headers |

#### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.x | UI framework |
| react-dom | ^18.x | DOM rendering |
| react-router-dom | ^6.x | Routing |
| @tanstack/react-query | ^5.x | Data fetching |
| @tiptap/react | ^2.x | Rich text editor |
| @dnd-kit/core | ^6.x | Drag and drop |
| axios | ^1.x | HTTP client |
| date-fns | ^3.x | Date formatting |
| react-hook-form | ^7.x | Form handling |
| zod | ^3.x | Schema validation |

### A.2 Environment Variables

```bash
# Backend
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@db:5432/redi_quiz
JWT_SECRET=your-secure-jwt-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret
POWER_AUTOMATE_EMAIL_URL=https://a67592d2e775e14cbb5a6366576198.ca.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/763615b631ce494e82d00f5f75c49245/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=TLzkk5K0eB16pYdi0Rq3bVCuSnryqyKPV3u3FWF4Muw
EMAIL_REPLY_TO=redi@health.qld.gov.au
UPLOAD_DIR=/app/uploads
LOG_DIR=/app/logs
LOG_LEVEL=info
ALLOWED_EMAIL_DOMAIN=health.qld.gov.au

# Frontend
VITE_API_URL=https://quiz.redi.health.qld.gov.au/api

# Database
POSTGRES_USER=redi_user
POSTGRES_PASSWORD=secure-db-password
POSTGRES_DB=redi_quiz
```

---

**Document End**

*This specification is maintained by the REdI development team. Last updated: January 2026.*
