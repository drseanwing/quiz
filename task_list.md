# REdI Quiz Platform - Task List

Compiled from comprehensive code review (6 perspectives: frontend, backend, security, workflow, accessibility, brand/spec compliance).

## CRITICAL

- [BLOCKED] **SEC-C1**: Scrub Power Automate webhook URL from `.env.example` (contains live signature). Replace with placeholder. Rotate the webhook in Power Automate portal. *(Requires manual webhook rotation)*
- [x] **SEC-C3**: Password reset token leaked in API response when `NODE_ENV=development`. Ensure production deploys use `NODE_ENV=production`. Add startup guard refusing dev mode on non-localhost.
- [x] **BE-C1**: Hash refresh tokens with SHA-256 before database storage (currently plaintext). Match existing pattern used for password reset and invite tokens. Files: `backend/src/utils/jwt.ts`, `backend/src/services/authService.ts`.
- [x] **BE-C3**: In-memory lockout store (`Map`) does not persist across restarts or scale across processes. Move to database-backed storage. File: `backend/src/utils/lockout.ts`.
- [x] **FE-C2**: Static `id="slider-ticks"` on SliderPlayer datalist causes DOM ID collision when multiple slider questions exist. Use `useId()` for unique IDs. File: `frontend/src/components/quiz/SliderPlayer.tsx`.
- [x] **A11Y-C1**: ImageMapPlayer is mouse-only; completely inaccessible to keyboard/screen reader users. Add `tabIndex`, `role`, `onKeyDown` support. File: `frontend/src/components/quiz/ImageMapPlayer.tsx`.
- [x] **A11Y-C2**: ImageUpload dropzone is a non-focusable click-only `<div>`. Add `tabIndex={0}`, `role="button"`, `onKeyDown`. File: `frontend/src/components/common/ImageUpload.tsx`.
- [x] **A11Y-C4**: No `prefers-reduced-motion` media query anywhere in the codebase. Add global rule to `global.css`.

## HIGH

- [DEFERRED] **SEC-H2**: JWT tokens stored in `localStorage` vulnerable to XSS. Consider moving refresh token to HttpOnly cookie. *(Architectural change, deferred to future sprint)*
- [x] **SEC-H3**: Uploaded files served without authentication via `express.static`. Add auth middleware or signed URLs. File: `backend/src/index.ts:79`.
- [x] **SEC-H5**: `trust proxy` only enabled for production. Enable in all environments behind a reverse proxy. File: `backend/src/index.ts:22-24`.
- [x] **BE-H1**: Missing transaction in `deleteQuestionBank` leaves orphan invite tokens. Add `onDelete: SetNull` or delete in transaction. File: `backend/src/services/questionBankService.ts:333`.
- [x] **BE-H3**: No audit logging for admin user CRUD operations (create, update role, deactivate, reset password). Wire up existing `auditService` functions. Files: `backend/src/routes/users.ts`.
- [x] **BE-H5**: `options` and `correctAnswer` validators accept any type without structural validation per question type. File: `backend/src/validators/questionValidators.ts:57-63`.
- [x] **BE-H6**: `getAttempt` re-shuffles answer options on every load when `randomAnswers=true`. Only shuffle on attempt creation, not on reload. File: `backend/src/services/quizService.ts:350-351`.
- [x] **BE-H8**: Missing `requireEditor` middleware on question create/update/delete/duplicate/reorder routes. File: `backend/src/routes/questions.ts`.
- [x] **FE-H1**: `QuestionEditor.tsx` is 910+ lines with 8 inline components. Extract `DragOrderEditor`, `ImageMapEditor`, `SliderEditor`, `McOptionEditor`, `TfEditor` to separate files.
- [x] **FE-H5**: `uploadApi.ts` return pattern inconsistent with rest of codebase (missing `as unknown as IApiResponse` cast). File: `frontend/src/services/uploadApi.ts`.
- [x] **FE-H6**: `QuizPlayerPage` uses manual `useState`/`useEffect` fetch instead of TanStack Query. Refactor to `useQuery`. File: `frontend/src/pages/quiz/QuizPlayerPage.tsx:52-81`.
- [x] **FE-H8**: No query key factory. Scattered string literal query keys risk cache invalidation bugs. Create `queryKeys.ts`. Files: all query consumers.
- [x] **WF-C1**: Quiz start button not disabled when max attempts exhausted. Add guard check. File: `frontend/src/pages/quiz/QuizListPage.tsx:152-158`.
- [x] **WF-C3**: Timer expiry auto-submit can fire during ongoing submission (race condition). Clear interval once submission begins. File: `frontend/src/pages/quiz/QuizPlayerPage.tsx:84-101`.
- [x] **WF-H1**: No toast/notification system. Success feedback relies on inline alerts. Add a toast provider (e.g., react-hot-toast or sonner).
- [x] **WF-H2**: Admin Create/Edit User modals have no client-side validation (no react-hook-form/zod). Refactor to match auth form patterns. File: `frontend/src/pages/admin/UsersTab.tsx`.
- [x] **WF-H4**: No confirmation dialog for admin question bank status change (immediate on select change). File: `frontend/src/pages/admin/QuestionBanksTab.tsx:132-139`.
- [x] **A11Y-H1**: Quiz progress bar has no `role="progressbar"` or aria value attributes. File: `frontend/src/pages/quiz/QuizPlayerPage.tsx:239-249`.
- [x] **A11Y-H2**: `sr-only` class used in LogsTab but never defined. Should be `visually-hidden`. File: `frontend/src/pages/admin/LogsTab.tsx:86`.
- [x] **A11Y-H3**: FeedbackDisplay has no live region announcement. Add `role="status"` and `aria-live="polite"`. File: `frontend/src/components/quiz/FeedbackDisplay.tsx`.
- [x] **A11Y-C3**: Admin form inputs have no programmatic label association (no `htmlFor`/`id`). File: `frontend/src/pages/admin/UsersTab.tsx`.
- [BLOCKED] **BRAND-H1**: Logo SVG file missing from `public/assets/`. Header uses text instead of logo image. Add `redi-logo.svg`. *(No logo file available)*
- [x] **SPEC-H1**: Completion email sent on ALL results, not just pass as specified in FR-NT-001. Add `if (results.passed)` guard. File: `backend/src/routes/attempts.ts:137-166`.

## MEDIUM

- [x] **BE-M1**: CSV export loads up to 50,000 rows into memory. Use streaming/cursor-based pagination. File: `backend/src/services/adminService.ts:106`.
- [x] **BE-M5**: Password reset token exposed in dev/test response. Only expose in `isTest`, not `isDevelopment`. File: `backend/src/services/authService.ts:488-491`. *(Already correctly implemented)*
- [x] **BE-M9**: Static file serving for uploads has no cache headers. Add `Cache-Control` headers. File: `backend/src/index.ts:79`.
- [x] **BE-M10**: `normalizeEmail()` in validators conflicts with manual `.toLowerCase()` in services. Pick one approach. Files: validators and services.
- [x] **FE-M1**: Duplicated `TYPE_LABELS` maps across 4 files. Extract to shared constant. Files: QuestionEditor, QuestionListItem, QuestionRenderer, QuizResultsPage.
- [x] **FE-M2**: Duplicated pagination UI across 6 admin tab components. Extract `<Pagination>` component.
- [x] **FE-M8**: `ImageUpload.handleRemove` silently swallows deletion errors. Show warning or only clear on success. File: `frontend/src/components/common/ImageUpload.tsx:51`.
- [x] **FE-M12**: `QuestionListItem.stripHtml` creates a new `DOMParser` on every render. Hoist to module scope. File: `frontend/src/components/questionBanks/QuestionListItem.tsx`.
- [x] **WF-M2**: No responsive/mobile-specific CSS. Admin tables overflow on mobile. Add `@media` queries for key breakpoints.
- [x] **WF-M4**: Admin tabs are not URL-driven. All tabs share `/admin` URL. Use URL search params for tab persistence.
- [x] **WF-M8**: QuestionEditor modal has no unsaved-changes guard. Escape/outside click loses all edits silently.
- [x] **A11Y-M1**: Input component uses `:focus` instead of `:focus-visible`. Removes native focus ring. File: `frontend/src/components/common/Input.module.css`.
- [x] **A11Y-M4**: Multiple `role="alert"` elements fire announcement storms. Use `role="status"` for success/info alerts. File: `frontend/src/components/common/Alert.tsx`.
- [x] **A11Y-M5**: Admin page tab panel keyboard navigation incomplete. No arrow-key navigation between tabs. File: `frontend/src/pages/admin/AdminPage.tsx`.
- [x] **BRAND-M1**: Montserrat and Bebas Neue fonts declared but never loaded. Add Google Fonts link to `index.html`.
- [x] **BRAND-M2**: Focus outline is 2px, brand guideline requires 3px. File: `frontend/src/styles/global.css:110-113`.
- [x] **SPEC-M1**: Image map scoring does not handle `poly` shape type. Only `rect` and `circle` implemented. File: `backend/src/services/scoringService.ts`.
- [x] **SPEC-M2**: Profile page missing from frontend. Spec references it in directory structure and UI layout.
- [x] **BE-H2**: `questionCount` default of 10 silently truncates quizzes. Default to 0 meaning "all questions". File: `backend/prisma/schema.prisma:93`.
- [x] **SEC-M5**: CORS allows `localhost` origins alongside production domain. Use separate production config.
- [x] **SPEC-L2**: Completion notification email body omits user email address. Add to template. File: `backend/src/services/emailService.ts`.

## LOW

- [ ] **BE-L1**: Hardcoded version `'1.0.0'` in multiple places. Read from `package.json`. Files: `backend/src/routes/index.ts`, `backend/src/index.ts`.
- [ ] **BE-L2**: Name regex `^[a-zA-Z\s'-]+$` excludes non-Latin characters. Use Unicode-aware pattern. Files: auth/user validators.
- [ ] **BE-L5**: Upload rate limit max hardcoded to 10. Make configurable. File: `backend/src/middleware/rateLimiter.ts:88`.
- [ ] **BE-L7**: Weak password blocklist (only 8 entries). Expand to top 1000 or use `zxcvbn`. File: `backend/src/utils/password.ts`.
- [ ] **FE-L5**: `EditorToolbar` uses `window.prompt()` for URL input. Replace with custom popover. File: `frontend/src/components/editor/EditorToolbar.tsx`.
- [ ] **WF-L1**: NotFoundPage links to `/dashboard` which requires auth. Should be context-aware.
- [ ] **A11Y-L6**: Sort buttons in QuestionList lack `aria-sort` indication. File: `frontend/src/components/questionBanks/QuestionList.tsx`.
- [ ] **BRAND-L1**: All headings use `font-weight: 700`. Spec requires H2/H3=600, H4=500. File: `frontend/src/styles/global.css`.
- [ ] **BRAND-L2**: Footer missing Metro North Health and Queensland Government co-branding logos.
- [ ] **BRAND-L3**: Email templates use solid navy header instead of Lime-Teal-Navy gradient bar.
