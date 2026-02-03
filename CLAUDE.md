# Claude Code Instructions for REdI Quiz Platform

## Project Overview

You are working on the **REdI Quiz Platform**, a comprehensive web-based assessment system for the Resuscitation EDucation Initiative at Metro North Health. This platform enables healthcare staff to complete knowledge assessments with administrative capabilities for content management, user management, and completion tracking.

## Technology Stack

- **Backend**: Node.js 20, Express, TypeScript, Prisma ORM, PostgreSQL 16
- **Frontend**: React 18, TypeScript, Vite, TanStack Query
- **Infrastructure**: Docker, Docker Compose
- **Testing**: Jest (backend), Vitest (frontend)

## Architecture

**Single-Container Deployment**: The application uses a unified backend container that serves both the API and frontend static files:
- In **production**, the backend container builds and serves the React frontend alongside API routes
- In **development**, frontend and backend run separately (backend in container, frontend with `npm run dev`)
- Host nginx handles SSL termination and proxies to the backend container

## Project Structure

```
quiz/
├── backend/          # Node.js/Express API (serves frontend in production)
│   ├── src/         # Source code
│   │   ├── config/  # Configuration modules
│   │   ├── middleware/
│   │   ├── routes/  # API routes
│   │   ├── services/  # Business logic
│   │   ├── validators/
│   │   └── types/
│   ├── prisma/      # Database schema & migrations
│   └── Dockerfile   # Multi-stage build (backend + frontend)
├── frontend/        # React SPA
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── context/
│       └── services/
└── nginx/          # Legacy configs (not used in current architecture)
```

## Key Guidelines

### Coding Standards

1. **TypeScript**
   - Always use strict type checking
   - No `any` types - use proper typing
   - Use interfaces with `I` prefix (e.g., `IQuestionBank`)
   - Document all functions with JSDoc comments
   - Use path aliases (@/ for imports)

2. **Naming Conventions**
   - Files: PascalCase for components, camelCase for utilities
   - Functions: camelCase with descriptive names
   - Constants: SCREAMING_SNAKE_CASE
   - Database columns: snake_case
   - API endpoints: kebab-case

3. **Error Handling**
   - Use custom error classes (AppError, ValidationError, etc.)
   - Always log errors with context using Winston
   - Return consistent API error responses
   - Never expose sensitive information in errors

4. **Security**
   - Always sanitize HTML input using DOMPurify
   - Use parameterized queries (Prisma handles this)
   - Validate all user input with express-validator
   - Hash passwords with bcrypt (cost factor 12)
   - Use JWT for authentication
   - Enforce email domain restriction (@health.qld.gov.au)

### Development Workflow

1. **Starting Development**
   ```bash
   # Start backend and database in development mode
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

   # Start frontend separately (in a new terminal)
   cd frontend && npm run dev

   # Backend API: http://localhost:9471
   # Frontend: http://localhost:5173
   ```

2. **Production Deployment**
   ```bash
   # Build and start (backend serves frontend)
   docker-compose up -d

   # Backend serves both API and frontend on port 3000
   # Configure host nginx to proxy to backend:3000
   ```

3. **Database Changes**
   ```bash
   # Create migration
   cd backend
   npx prisma migrate dev --name description_of_change

   # Apply migrations
   npx prisma migrate deploy
   ```

4. **Before Committing**
   ```bash
   # Backend
   cd backend
   npm run lint
   npm run typecheck
   npm test

   # Frontend
   cd frontend
   npm run lint
   npm run typecheck
   npm test
   ```

### File Operations

- **ALWAYS** use Read tool before Edit/Write on existing files
- **PREFER** editing existing files over creating new ones
- **NEVER** create markdown documentation files unless explicitly requested
- When creating API endpoints, follow the existing pattern in [backend/src/routes/index.ts](backend/src/routes/index.ts)
- When creating React components, use the pattern in the components directory

### Database Operations

1. **Schema Changes**
   - Edit [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
   - Run `npx prisma migrate dev --name change_description`
   - Always test migrations up AND down
   - Update related TypeScript types

2. **Queries**
   - Use Prisma Client (imported from @/config/database)
   - Use transactions for multi-step operations
   - Always handle potential null values
   - Log queries in development for debugging

### API Development

1. **Creating New Endpoints**
   - Add route in appropriate file in `backend/src/routes/`
   - Create service in `backend/src/services/`
   - Add validators in `backend/src/validators/`
   - Document with JSDoc comments
   - Add error handling
   - Add audit logging where appropriate

2. **API Response Format**
   ```typescript
   // Success
   {
     success: true,
     data: { ... },
     meta?: { page, pageSize, totalCount, totalPages }
   }

   // Error
   {
     success: false,
     error: {
       code: "ERROR_CODE",
       message: "Human-readable message",
       details?: { ... }
     }
   }
   ```

### Frontend Development

1. **Component Structure**
   - Use functional components with hooks
   - Extract complex logic to custom hooks
   - Use React Query for server state
   - Use Context for global client state
   - Follow REdI design tokens in CSS

2. **Styling**
   - Use CSS variables from [frontend/src/styles/redi-tokens.css](frontend/src/styles/redi-tokens.css)
   - Mobile-first responsive design
   - Ensure WCAG 2.1 AA accessibility
   - Test keyboard navigation

3. **Forms**
   - Use react-hook-form for form handling
   - Use zod for validation schemas
   - Show clear error messages
   - Disable submit during processing
   - Provide loading states

### Testing

1. **Backend Tests**
   - Unit tests for services and utilities
   - Integration tests for API endpoints
   - Use test database (configured in CI)
   - Mock external services (email, etc.)

2. **Frontend Tests**
   - Unit tests for utilities and hooks
   - Component tests with Testing Library
   - Test user interactions, not implementation
   - Test accessibility features

### Security Considerations

- **Authentication**: JWT with 1-hour expiry, refresh tokens for 7 days
- **Authorization**: Role-based (USER, EDITOR, ADMIN)
- **Email Domain**: Enforce @health.qld.gov.au for non-admin users
- **Rate Limiting**: Applied on all auth endpoints
- **Input Validation**: On both client and server
- **HTML Sanitization**: Use DOMPurify for rich text
- **File Uploads**: Validate type and size, store outside webroot

### Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run lint            # Run linter
npm run lint:fix        # Fix lint issues
npm run typecheck       # Check TypeScript types
npm test                # Run tests
npm run test:coverage   # Test with coverage

# Database
npx prisma generate     # Generate Prisma Client
npx prisma migrate dev  # Create and apply migration
npx prisma studio       # Open Prisma Studio GUI
npx prisma db seed      # Seed database

# Docker
docker-compose up -d                              # Start production
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d  # Start dev
docker-compose down                               # Stop all services
docker-compose logs -f backend                    # View backend logs
docker-compose exec backend sh                    # Shell into backend
```

### Question Bank System

The platform supports 6 question types with specific JSON structures:
1. Multiple Choice Single Answer
2. Multiple Choice Multiple Answer (fractional scoring)
3. True/False
4. Drag-and-Drop Ordering
5. Image Map (Hotspot)
6. Slider/Dial

See the specification document for detailed schemas and scoring algorithms.

### Email Notifications

- Emails sent via Power Automate HTTP endpoint
- Configuration in [backend/src/config/index.ts](backend/src/config/index.ts:email)
- Templates in [backend/src/services/emailService.ts](backend/src/services/emailService.ts)
- Completion notifications sent on passing score
- All emails logged to database

## API Contract Rules (Critical for Orchestrator Agents)

This section documents hard-won lessons from API payload mismatch bugs. Future agents MUST follow these rules when modifying any API endpoint or frontend service.

### Response Envelope Standard

ALL backend API responses MUST follow this exact shape:

```typescript
// Success with single item
{ success: true, data: T }

// Success with paginated list
{ success: true, data: T[], meta: { page, pageSize, totalCount, totalPages } }

// Error
{ success: false, error: { code, message, details? } }
```

The frontend Axios interceptor (`frontend/src/services/api.ts`) automatically strips the outer `response.data` wrapper. So when frontend code does `const body = await api.get(...)`, `body` is already the `{ success, data, meta? }` object.

### Date Serialization Rule

Backend service interfaces that describe API response shapes MUST use `string` (not `Date`) for all date fields. Prisma returns `Date` objects, but JSON serialization converts them to ISO 8601 strings. Always explicitly call `.toISOString()` when mapping Prisma results to response interfaces:

```typescript
// CORRECT
interface IMyRow { createdAt: string; }
const row: IMyRow = { createdAt: prismaResult.createdAt.toISOString() };

// WRONG - type lies about runtime value
interface IMyRow { createdAt: Date; }  // Will be string after JSON.stringify
const row: IMyRow = { createdAt: prismaResult.createdAt };  // Implicit conversion
```

### Frontend API Service Pattern

Every frontend API service function MUST:
1. Cast the response correctly: `as unknown as IApiResponse<ExpectedType>`
2. Extract and return `body.data` (not `body` itself)
3. For paginated endpoints, return `{ data: body.data, meta: body.meta! }` or a named wrapper

```typescript
// Single item
export async function getItem(id: string): Promise<IItem> {
  const body = (await api.get(`/items/${id}`)) as unknown as IApiResponse<IItem>;
  return body.data;
}

// Paginated list
export async function listItems(): Promise<{ data: IItem[]; meta: IPaginationMeta }> {
  const body = (await api.get('/items')) as unknown as IApiResponse<IItem[]>;
  return { data: body.data, meta: body.meta! };
}
```

### Type Alignment Checklist

When adding or modifying an API endpoint, verify ALL of these:

1. **Backend route handler** returns `{ success: true, data: <result> }`
2. **Backend service interface** uses `string` for dates (not `Date`)
3. **Backend validator** includes ALL fields the service accepts (even optional ones)
4. **Frontend type definition** matches the exact shape backend returns
5. **Frontend API service** casts and extracts correctly
6. **Frontend component** destructures the response correctly
7. **Test mocks** simulate the real API response shape (after interceptor)

### Common Pitfalls

| Pitfall | Example | Fix |
|---------|---------|-----|
| Backend returns array, frontend expects wrapper | `data: []` vs `data: { items: [], meta: {} }` | Align frontend to match backend |
| Backend includes relation fields, frontend type missing them | `createdBy`, `_count` | Add optional fields to frontend type |
| Validator missing fields that service accepts | No `options` in update validator | Add `body('field').optional()` |
| Date type mismatch | Backend `Date`, frontend `string` | Use `string` + `.toISOString()` |
| Test mock wrong shape | Mock returns nested `{data: {data: ...}}` | Mock the post-interceptor shape |
| `sanitizeCorrectAnswer` corrupts arrays | `["1","3"]` becomes `{"0":"1","1":"3"}` | Always check `Array.isArray()` before `Object.entries()` |
| correctAnswer shape mismatch | Editor saves `"1"`, scoring expects `{ optionId: "1" }` | Use `toScoringFormat`/`fromScoringFormat` in QuestionEditor |

### Correct Answer Format Contract

The scoring engine (`backend/src/services/scoringService.ts`) defines the authoritative format for `correctAnswer` and user `response` objects. Both MUST use structured objects, not bare primitives:

| Question Type | correctAnswer format | User response format |
|---------------|---------------------|---------------------|
| MC Single | `{ optionId: "id" }` | `{ optionId: "id" }` |
| MC Multi | `{ optionIds: ["id1","id2"] }` | `{ optionIds: ["id1","id2"] }` |
| True/False | `{ value: true }` | `{ value: true }` |
| Drag Order | `{ orderedIds: ["id1","id2","id3"] }` | `{ orderedIds: ["id1","id2","id3"] }` |
| Image Map | `{ regionId: "id" }` | `{ x: number, y: number }` |
| Slider | `{ value: 50, tolerance: 5 }` | `{ value: number }` |

The `QuestionEditor` component uses bare UI values internally (e.g., `"1"` for option ID) and converts at the boundary via `toScoringFormat()` (save) and `fromScoringFormat()` (load).

### Array Sanitization Rule

When sanitizing JSON data (options, correctAnswer), ALWAYS check `Array.isArray()` BEFORE treating as `Record<string, unknown>`. JavaScript arrays are objects, so `typeof [] === 'object'` is true. Using `Object.entries()` on an array converts `["a","b"]` into `{"0":"a","1":"b"}`, silently corrupting the data.

### Files to Check When Modifying API

| Layer | Files |
|-------|-------|
| Backend routes | `backend/src/routes/*.ts` |
| Backend services | `backend/src/services/*.ts` |
| Backend validators | `backend/src/validators/*.ts` |
| Frontend types | `frontend/src/types/index.ts` |
| Frontend API services | `frontend/src/services/*Api.ts` |
| Frontend consumers | `frontend/src/pages/**/*.tsx`, `frontend/src/components/**/*.tsx` |
| Tests | `frontend/src/__tests__/services.test.ts` |

## Important Reminders

1. **Always read files before modifying them**
2. **Follow the existing code patterns and conventions**
3. **Write meaningful commit messages**
4. **Test your changes locally before committing**
5. **Update documentation when adding features**
6. **Consider security implications of all changes**
7. **Use the specification document as the source of truth**

## Getting Help

- Refer to the comprehensive specification in the root directory
- Check existing implementations before creating new patterns
- Review tests for usage examples
- API documentation: `/docs/API.md` (when created)
- Database schema: [backend/prisma/schema.prisma](backend/prisma/schema.prisma)

## Build Phases

The project follows a 5-phase build plan:
1. **Phase 1**: Foundation (Auth, Database, Core API)
2. **Phase 2**: Question Bank Management
3. **Phase 3**: Quiz Delivery
4. **Phase 4**: Admin Features
5. **Phase 5**: Polish, Testing, Documentation

Refer to the specification for the detailed task list for each phase.
