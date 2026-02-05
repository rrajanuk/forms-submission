# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **multi-tenant form submission platform** with both a REST API and a visual form builder. It provides:

- **Multi-tenant SaaS architecture** with organizations, users, and API keys
- **Visual drag-and-drop form builder** (Next.js + shadcn/ui)
- **Dynamic form system** with conditional logic and JSON schema storage
- **JWT + API key authentication** with role-based access control
- **JavaScript embed SDK** for external websites with auto-save functionality
- **Draft submissions** with automatic expiration and cleanup
- **Advanced spam protection** (honeypot, time validation, CAPTCHA, disposable email detection)
- **Email and webhook notifications** for form submissions

## Implementation Status

**Completed Phases:**
- ✅ Phase 1: Multi-Tenant Foundation (organizations, users, API keys, JWT auth)
- ✅ Phase 2: Dynamic Form System (form builder, conditional logic, validation)
- ✅ Phase 3: Auto-Save System (draft submissions, automatic cleanup)
- ✅ Phase 4: Embed SDK (JavaScript widget for external websites)
- ✅ Phase 5: Visual Form Builder UI (Next.js + shadcn/ui drag-and-drop interface)
- ✅ **Additional Features** (Live Preview, Submissions Viewer, CSV Export, Logic Indicators)

**In Progress:**
- ⏳ Phase 6: Webhooks & Integrations (event-based webhooks with retry logic)

## Development Commands

```bash
# Backend (root directory)
npm run dev              # Start backend dev server (port 3001)
npm run build            # Compile TypeScript
npm run start            # Run production build
npm run migrate          # Run database migrations

# Frontend (frontend/ directory)
cd frontend
npm run dev              # Start frontend dev server (port 3000)
npm run build            # Build for production
npm run start            # Run production build

# Testing
npm test                 # Run tests with coverage
npm run test:watch       # Jest watch mode
npm run lint             # Run ESLint

# Accessing the apps
open http://localhost:3001/health        # Backend health check
open http://localhost:3001/embed/demo.html  # Embed SDK demo
open http://localhost:3000               # Frontend app
open http://localhost:3000/login         # Login page
open http://localhost:3000/forms         # Forms dashboard
open http://localhost:3000/builder       # Form builder
open http://localhost:3000/preview/[id]  # Interactive preview page
```

## Architecture

### Layer Structure

```
Routes (HTTP endpoints) → Middleware (auth/validation) → Models (data) → Database
                                      ↓
                                Services (business logic)
```

### Key Patterns

**Models:** All database models use **static classes** with synchronous operations (Better-SQLite3 feature):
```typescript
export class SomeModel {
  static create(data): Entity
  static findById(id): Entity | undefined
  static findAll(limit?, offset?): Entity[]
  static delete(id): boolean
}
```

**Key Services:**
- `LogicEngine` - Evaluates conditional logic (show/hide/skip/jump fields)
- `AutoSaveService` - Manages draft submissions with expiration
- `WebhookService` - Delivers webhooks with retry logic (Phase 6)

**Key Utilities:**
- `jwt.ts` - JWT token generation and validation
- `password.ts` - Password hashing with bcrypt
- `formValidation.ts` - Dynamic field validation
- `spamProtection.ts` - Multi-layer spam detection
```typescript
export class SomeModel {
  static create(data): Entity
  static findById(id): Entity | undefined
  static findAll(limit?, offset?): Entity[]
  static delete(id): boolean
}
```

**Routes:** Organized by feature with middleware chain:
```typescript
router.get('/', requireJwt, async (req, res) => {
  // req.user is set by requireJwt middleware
  // Business logic here
  res.json(data);
});
```

**Authentication:** Three methods available:
- `requireApiKey` - Legacy single ADMIN_API_KEY
- `requireJwt` - JWT bearer token from Authorization header
- `requireApiKeyMultiTenant` - Database-backed API keys with scopes

### Multi-Tenancy

**Critical:** All data operations MUST be scoped to `organization_id`:

```typescript
// Correct: Filter by organization
static findByOrganization(orgId: string): Form[] {
  return db.prepare('SELECT * FROM forms WHERE organization_id = ?').all(orgId);
}

// Incorrect: No organization scoping
static findAll(): Form[] {
  return db.prepare('SELECT * FROM forms').all();
}
```

**Organization isolation:**
- Every form, submission, and API key belongs to an organization
- Middleware (`requireOrganizationAccess`) validates user/org membership
- API keys are scoped to specific organizations with permission scopes

### Database & Migrations

**Migration System:**
- Run migrations with `npm run migrate`
- Migration files in `src/db/migrations/*.sql` executed in filename order
- Tracks executed migrations in `_migrations` table
- Base schema (`schema.sql`) runs first for backward compatibility

**Database connection:**
- Uses Better-SQLite3 with WAL mode enabled
- Synchronous operations only (no async/await needed)
- Foreign keys with CASCADE deletion for data integrity

**Tables (key ones):**
- `organizations` - Tenant organizations with plans (free/pro/enterprise)
- `users` - Organization members (owner/admin/member roles)
- `api_keys` - Multi-tenant API keys with scopes and expiration
- `forms` - Dynamic form definitions (JSON schema in `schema` column)
- `form_submissions` - Dynamic submission data (JSON in `submission_data`)
- `draft_submissions` - Auto-save drafts with expiration
- `submissions` - Legacy form submissions (backward compatibility)

### Validation & Spam Protection

**Multi-layer validation:**
1. Input validation via `validator` library (email format, string lengths)
2. Spam protection in `utils/spamProtection.ts`:
   - Honeypot field detection
   - Form fill time validation (min 2s, max 7 days)
   - Disposable email blocking
   - CAPTCHA verification (Cloudflare Turnstile or reCAPTCHA)
3. Rate limiting per IP (in-memory Map, auto-cleanup)
4. Duplicate detection (same email + message within time window)

**When adding form fields:** Add validation to `utils/validation.ts` AND `utils/spamProtection.ts` if applicable

### Error Handling

**Consistent error responses:**
```typescript
// Validation errors
res.status(400).json({ error: 'Descriptive message' });

// Authentication
res.status(401).json({ error: 'Unauthorized - Reason' });
res.status(403).json({ error: 'Forbidden - Reason' });

// Not found
res.status(404).json({ error: 'Resource not found' });

// Rate limiting
res.status(429).json({ error: 'Too many requests' });
```

### Testing

**Test setup:**
- In-memory SQLite database (`:memory:`)
- Migrations run before tests
- Test environment variables set in `jest.config.js`

**Running specific tests:**
```bash
npm test -- submission.test.ts        # Single test file
npm test -- --testNamePattern="spam"  # Tests matching pattern
```

**Test patterns:**
- Use `beforeAll` for database setup
- Use `describe` blocks to group related tests
- Test both success and failure cases
- Include security tests (auth, validation, spam protection)

## Frontend Application (Visual Form Builder)

The frontend is a **Next.js 15 application** with a drag-and-drop form builder interface.

**Tech Stack:**
- **Next.js 15** - React framework with App Router and Turbopack
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Pre-built accessible components
- **@hello-pangea/dnd** - Drag-and-drop functionality
- **Zustand** - State management
- **Axios** - HTTP client with interceptors
- **Lucide React** - Icon library

**Project Structure:**
```
frontend/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home (redirects to /forms)
│   ├── login/page.tsx            # Authentication
│   ├── forms/
│   │   ├── page.tsx              # Forms dashboard with preview/submissions buttons
│   │   └── [id]/
│   │       └── submissions/
│   │           └── page.tsx      # Submissions viewer with CSV export
│   ├── preview/
│   │   └── [formId]/
│   │       └── page.tsx          # Interactive preview page (works for drafts)
│   ├── builder/page.tsx          # Form builder UI
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── form-builder/             # Builder components
│   │   ├── FormBuilder.tsx       # Main canvas with drag-drop + logic visibility
│   │   ├── FieldLibrary.tsx      # 13 field types palette
│   │   ├── FieldEditor.tsx       # Property editor
│   │   ├── FormPreview.tsx       # Live preview tab (static, disabled)
│   │   ├── LogicBuilder.tsx      # Conditional logic UI
│   │   ├── ThemeBuilder.tsx      # Color/font/layout picker
│   │   └── SettingsBuilder.tsx   # Form configuration
│   └── preview/                  # Preview components
│       └── InteractiveFormPreview.tsx  # Interactive form renderer
├── lib/
│   ├── api.ts                    # Axios client + auth + submissions API
│   ├── config.ts                 # Centralized API URL config
│   ├── store.ts                  # Zustand state store
│   └── utils.ts                  # Utilities
├── types/
│   └── form.ts                   # TypeScript types
└── .env.local                    # Environment variables
```

**Features:**
- ✅ Drag-and-drop field reordering
- ✅ 13 field types with configuration
- ✅ Real-time validation
- ✅ Conditional logic builder (show/hide/skip/jump) with visual indicators
- ✅ Live theme customization
- ✅ Form settings (access control, auto-save, etc.)
- ✅ Auto-save with dirty state tracking
- ✅ JWT authentication with token refresh
- ✅ Forms dashboard with CRUD operations
- ✅ **Live Preview tab** - See your form in real-time while editing (static preview)
- ✅ **Interactive Preview** - Test your form functionality before publishing (works for drafts!)
- ✅ **Preview button** - Quick preview from forms dashboard (opens interactive preview)
- ✅ **Submissions viewer** - View all form submissions with CSV export
- ✅ **Logic visibility indicators** - Purple badges show fields with conditional logic

**State Management (Zustand):**
```typescript
// lib/store.ts exports useFormBuilder hook
const {
  form,           // Current form being edited
  fields,         // Form fields array
  logic,          // Conditional logic rules
  theme,          // Form theme settings
  settings,       // Form behavior settings
  isDirty,        // Unsaved changes indicator
  addField,       // Add field to form
  updateField,    // Update field properties
  saveForm,       // Save to backend
  publishForm,    // Publish form
} = useFormBuilder();
```

**API Integration:**
```typescript
// lib/api.ts - All backend communication
import { formsApi, authApi, submissionsApi } from '@/lib/api';

// Forms
const forms = await formsApi.listForms();
const form = await formsApi.createForm(data);
const updated = await formsApi.updateForm(id, data);
const published = await formsApi.publishForm(id);

// Form Preview (works for drafts!)
const formForPreview = await formsApi.getFormForPreview(formId);

// Submissions
const submissions = await submissionsApi.listSubmissions(formId);
const submission = await submissionsApi.getSubmission(formId, submissionId);
await submissionsApi.exportSubmissions(formId, 'csv');  // Export to CSV
await submissionsApi.deleteSubmission(formId, submissionId);
```

**Backend API Endpoints:**
```
GET  /api/forms/:id/preview    # Get form for preview (works for drafts, requires auth)
```

**Adding New Field Types to Builder:**

1. **Add type to frontend/types/form.ts:**
```typescript
export type FieldType = 'short_text' | 'long_text' | ... | 'your_new_type';
```

2. **Add to FieldLibrary palette** (components/form-builder/FieldLibrary.tsx):
```typescript
const FIELD_TYPES = [
  // ... existing types
  { type: 'your_new_type', label: 'Your New Type', icon: YourIcon, description: '...' },
];
```

3. **Add validation in FieldEditor** if needed (components/form-builder/FieldEditor.tsx)

4. **Update backend form validation** (src/utils/formValidation.ts)

**Authentication Flow:**
1. User visits frontend → checks localStorage for `access_token`
2. If no token → redirect to `/login`
3. Login/register → JWT stored in localStorage
4. Axios interceptor adds token to all requests
5. 401 responses → auto-logout and redirect to login

**Environment Variables (frontend/.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Building for Production:**
```bash
cd frontend
npm run build
npm start
# Next.js production server runs on port 3000
```

**Toast Notifications:**
- Uses `sonner` library for toast notifications
- **Fixed**: Toaster component uses hardcoded "light" theme (no ThemeProvider needed)
- Add `<Toaster position="top-right" />` to each page that uses `toast()`
- Import from `@/components/ui/sonner`

**When adding builder features:**
- Update Zustand store in `lib/store.ts`
- Add component to `components/form-builder/`
- Wire up API calls in `lib/api.ts`
- Test with real backend data

## Embed SDK

The JavaScript embed SDK allows external websites to display forms with auto-save built-in.

**Files:**
- `public/embed.js` - Main SDK (~800 lines, FormEmbed class)
- `public/embed.css` - Responsive styling with theming
- `public/demo.html` - Live demo and usage examples

**Usage:**
```html
<link rel="stylesheet" href="https://your-domain.com/embed/embed.css">
<script src="https://your-domain.com/embed/embed.js"></script>

<div id="my-form"></div>

<script>
  new FormEmbed({
    formSlug: 'customer-feedback',
    container: document.getElementById('my-form'),
    theme: {
      primaryColor: '#4F46E5',
      backgroundColor: '#ffffff',
      layout: 'classic' // or 'modern', 'minimal'
    },
    onProgress: (data) => console.log('Form progress:', data),
    onComplete: (response) => console.log('Submitted!', response),
    onError: (error) => console.error('Error:', error)
  });
</script>
```

**Features:**
- Auto-save every 30 seconds + 2 seconds after last change (debounced)
- Session-based draft restoration (persists across page refreshes)
- Real-time validation with error messages
- Progress bar with step indicator
- Responsive design (mobile + desktop)
- 12 field types: short_text, long_text, email, phone, number, date, rating, dropdown, multiple_choice, checkboxes, file_upload, signature, hidden
- Theme customization via CSS variables

**Static file serving:** Files are served at `/embed/*` path via Express static middleware in `src/app.ts`

## Auto-Save & Draft System

Draft submissions are automatically saved when users fill out forms via the embed SDK.

**How it works:**
1. User starts filling form → SDK generates unique `session_id`
2. Every 30 seconds or 2 seconds after changes → POST to `/api/public/forms/:slug/draft`
3. Draft stored in `draft_submissions` table with 7-day expiration
4. User refreshes page → SDK loads draft from `/api/public/forms/:slug/draft/:sessionId`
5. User submits form → Draft deleted, complete submission created

**Public API endpoints (no auth required):**
```
GET  /api/public/forms/:slug              # Get published form schema
POST /api/public/forms/:slug/draft        # Save/update draft
GET  /api/public/forms/:slug/draft/:sessionId  # Load draft
DELETE /api/public/forms/:slug/draft/:sessionId  # Delete draft
POST /api/public/forms/:slug/submit       # Submit form (with draft cleanup)
POST /api/public/forms/:slug/draft/submit  # Convert draft to submission
POST /api/public/forms/:slug/schema       # Get schema with evaluated conditional logic
```

**Draft expiration:**
- Default: 7 days (configurable via `DRAFT_EXPIRY_DAYS` env var)
- Automatic cleanup runs on server startup and every 24 hours
- Cleanup via `AutoSaveService.cleanupExpiredDrafts()`

**FormModel methods for public access:**
- `FormModel.findPublishedBySlug(slug)` - Find published form across all orgs
- `FormModel.findAllByStatus(status, limit, offset)` - Find forms by status (all orgs)

**When updating form schema:** Consider backward compatibility with existing drafts

## Important Conventions

### Adding New Routes

1. Create route file in `src/routes/`
2. Use appropriate authentication middleware:
   - Public endpoints: No middleware
   - User endpoints: `requireJwt`
   - Admin endpoints: `requireJwt` + role checks
   - API access: `requireApiKeyMultiTenant`
3. Register in `src/app.ts`
4. Add types to `src/types/` if needed

### Adding New Models

1. Follow existing **static class pattern**
2. Use prepared statements with parameter binding
3. Return `undefined` for "not found" (not null)
4. Use soft delete pattern (`status` column) instead of actual deletion
5. Add indexes for common query patterns

### Form Schema JSON

When working with dynamic forms, the schema structure is:
```typescript
{
  version: '1.0',
  fields: [{
    id, type, label, required, validation, options, properties, order
  }],
  theme: { colors, font, layout },
  settings: { allowAnonymous, autoSaveInterval, ... },
  logic: [{ id, type, targetFieldId, conditions, action }]
}
```

**Field types:** short_text, long_text, email, phone, number, date, rating, dropdown, multiple_choice, checkboxes, file_upload, signature, hidden

### Conditional Logic System

Forms support dynamic field behavior based on user answers:

**Logic types:**
- `show` - Display field when conditions are met
- `hide` - Hide field when conditions are met
- `skip` - Skip field when conditions are met (jump to next)
- `jump` - Jump to specific step when conditions are met

**Logic structure:**
```typescript
{
  id: 'logic_1',
  type: 'show',
  targetFieldId: 'feedback_reason',  // Field to show/hide
  conditions: [
    {
      fieldId: 'rating',
      operator: 'less_than',
      value: 4
    }
  ]
}
```

**Operators:** equals, not_equals, contains, greater_than, less_than, is_empty, is_not_empty, includes_any, includes_all

**Logic evaluation:**
- All conditions in a logic rule use AND logic
- Multiple logic rules can target the same field
- Evaluated by `LogicEngine.getVisibleFields()` for public form rendering

**When adding conditional logic:**
1. Add logic rules to form schema
2. Use `LogicEngine.validateLogic()` to check for circular dependencies
3. Test with various data combinations

### Authentication Flow

**User registration/login:**
1. POST `/api/auth/register` - Creates org + user + returns JWT + API key
2. POST `/api/auth/login` - Returns JWT tokens (access + refresh)
3. POST `/api/auth/refresh` - Exchange refresh token for new access token
4. Use JWT in Authorization header: `Bearer <token>`

**API key usage:**
```
X-API-Key: fp_<base64url-encoded-key>
```
- Keys validated against database
- Scopes: forms:read, forms:write, submissions:read, submissions:write
- Supports expiration and usage tracking

## Environment Variables

**Required:**
- `ADMIN_API_KEY` - Legacy admin authentication
- `JWT_SECRET` - JWT token signing (set in production!)

**Optional (with defaults):**
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - development/production
- `DATABASE_PATH` - SQLite file location (default: ./data/submissions.db)
- `JWT_EXPIRES_IN` - Access token lifetime (default: 15m)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token lifetime (default: 7d)
- `DRAFT_EXPIRY_DAYS` - Draft expiration in days (default: 7)

**Rate limiting:**
- `RATE_LIMIT_WINDOW_MS` - Time window (default: 3600000 = 1 hour)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 5)

**Notifications:**
- `SMTP_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `WEBHOOK_ENABLED`, `WEBHOOK_URL`, `WEBHOOK_SECRET`

## Common Tasks

### Adding a New Form Field Type

1. Add type to `FieldType` in `src/types/forms.ts`
2. Add validation logic to `utils/formValidation.ts`
3. Update form schema validation if needed
4. Add tests for the new field type

### Creating New Migration

1. Create file `src/db/migrations/NNN_description.sql`
2. Write SQL with CREATE TABLE or ALTER statements
3. Add indexes for performance
4. Test migration: `npm run migrate`
5. **Never modify existing migrations** - create a new one

### Debugging Database Issues

```bash
# View migrations
sqlite3 data/submissions.db "SELECT * FROM _migrations"

# Check tables
sqlite3 data/submissions.db ".schema"

# Query data
sqlite3 data/submissions.db "SELECT * FROM organizations LIMIT 5"
```

### Testing the Embed SDK

**Quick test:**
1. Create and publish a form (see demo.html for curl commands)
2. Open `http://localhost:3001/embed/demo.html` in browser
3. Fill out the form to test auto-save
4. Check browser console for session ID and API calls

**Test auto-save:**
1. Start filling form
2. Wait 30 seconds (or make changes and wait 2 seconds)
3. Refresh page
4. Draft should be restored automatically

**API testing:**
```bash
# Get published form schema
curl http://localhost:3001/api/public/forms/customer-feedback

# Save a draft
curl -X POST http://localhost:3001/api/public/forms/customer-feedback/draft \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test-session","submission_data":{"name":"Test"}}'

# Load a draft
curl http://localhost:3001/api/public/forms/customer-feedback/draft/test-session

# Submit form
curl -X POST http://localhost:3001/api/public/forms/customer-feedback/submit \
  -H "Content-Type: application/json" \
  -d '{"submission_data":{"name":"Test","email":"test@example.com"}}'
```

### Submissions Viewer & Export

View and manage all form submissions with built-in CSV export functionality.

**Accessing submissions:**
1. Go to Forms dashboard at `http://localhost:3000/forms`
2. Click **View Submissions** button on any form card
3. See all submissions with status (Complete/Draft/Abandoned)

**Features:**
- **Statistics cards** - Total submissions, complete, drafts, abandoned counts
- **Filter by status** - View all, complete, draft, or abandoned submissions
- **CSV export** - Download all submissions as CSV file
- **Delete submissions** - Remove individual submissions with confirmation
- **Responsive table** - Shows first 5 fields + submission date
- **Color-coded badges** - Green (complete), Yellow (draft), Gray (abandoned)

**Export format:**
- CSV with field labels as headers
- Submitted date as first column
- All field values in subsequent columns
- Arrays joined with commas
- Empty values as blank cells

**API endpoints:**
```
GET  /api/forms/:formId/submissions          # List all submissions
GET  /api/forms/:formId/submissions/:id      # Get single submission
GET  /api/forms/:formId/submissions/export   # Export as CSV or JSON
DELETE /api/forms/:formId/submissions/:id    # Delete submission
```

### Form Preview System

The platform offers TWO ways to preview your forms:

#### 1. Static Preview Tab (in Builder)
- **Location**: Builder → Preview tab (Monitor icon)
- **Purpose**: Quick visual check of layout and styling
- **Features**:
  - Live updates as you edit (no save needed)
  - All 13 field types rendered correctly
  - Theme colors and styling applied
  - **Disabled state** - Fields are NOT interactive
  - Perfect for checking layout and design

#### 2. Interactive Preview Page (NEW!)
- **Location**: Click "Preview" button in dashboard or builder
- **URL**: `http://localhost:3000/preview/[formId]`
- **Purpose**: Test form functionality before publishing
- **Features**:
  - **Fully interactive** - Can fill out, validate, and submit
  - Works for **draft forms** (no publishing needed!)
  - Real-time validation with error messages
  - Conditional logic evaluation (show/hide fields)
  - Mock submission (not saved, just shows success state)
  - Yellow "PREVIEW MODE" banner at top
  - Shows draft/published status

**When to use each:**
- **Static Preview tab**: Quick layout checks while editing
- **Interactive Preview**: Testing form functionality and user experience

**How Interactive Preview Works:**
1. Opens new tab at `/preview/[formId]` (works for drafts!)
2. Fetches form via authenticated API (`GET /api/forms/:id/preview`)
3. Renders form interactively with all field types
4. Validates input in real-time (email, phone, required fields, etc.)
5. Evaluates conditional logic dynamically
6. Mock submission shows success state

**Backend Support:**
- `GET /api/forms/:id/preview` - Returns form for preview (bypasses published check, requires auth)
- Reuses existing form validation logic
- Works with draft, published, and archived forms

### Publishing a Form for Embed

Forms must be published before they can be embedded:

```bash
# 1. Create form (returns draft)
FORM_RESPONSE=$(curl -X POST http://localhost:3001/api/forms \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @form-schema.json)

FORM_ID=$(echo $FORM_RESPONSE | jq -r '.id')

# 2. Publish form
curl -X POST "http://localhost:3001/api/forms/$FORM_ID/publish" \
  -H "Authorization: Bearer <token>"

# 3. Embed using the slug
# Use the form slug in the embed.js code
```

### Using the Visual Form Builder

The visual form builder provides an intuitive drag-and-drop interface for creating forms.

**Access the builder:**
1. Navigate to http://localhost:3000
2. Login or register
3. Click "New Form" or edit an existing form

**Builder Layout:**
- **Left Sidebar** - Field library with 13 field types
- **Center Canvas** - Drag-and-drop form preview with **logic indicators**
- **Right Sidebar** - Field, Logic, Theme, Settings, and **Preview** tabs

**Creating a Form:**
1. Click field types in the left sidebar to add them
2. Drag fields in the canvas to reorder
3. Click a field to edit its properties
4. Configure validation rules (min/max, pattern, etc.)
5. Add options for dropdown/choice fields
6. Set up conditional logic in the Logic tab
7. Customize colors in the Theme tab
8. Configure settings (access control, auto-save, etc.)
9. Click "Save" to save changes
10. Click "Publish" to make form live

**Conditional Logic in Builder:**
1. Go to Logic tab
2. Click "Add Rule"
3. Select action (show/hide/skip/jump)
4. Choose target field
5. Add conditions (field + operator + value)
6. Multiple conditions use AND logic
7. Save form to apply logic

**Visual Logic Indicators:**
- Fields with logic rules show a **purple "Logic (N)" badge** on the card
- Fields used in conditions show a **blue "Trigger" badge**
- Fields with logic have a **purple border** highlighting
- Logic rules are summarized below the field label (e.g., "Show if")
- **Logic tab** shows a badge counter with total number of rules

**Theme Customization:**
- 3 layouts: Classic, Modern, Minimal
- 5 fonts: Inter, Roboto, Open Sans, Lato, Montserrat
- 4 color pickers: Primary, Background, Text, Button
- Live preview panel

**Auto-save Behavior:**
- Unsaved changes indicator in header
- Browser warns before leaving with unsaved changes
- Must save before publishing

**Quick Preview from Dashboard:**
- Each form card has **Edit** and **Preview** buttons
- Preview button opens **interactive preview** at `/preview/[formId]`
- **Works for draft forms** - No publishing needed!
- **View Submissions** button navigates to submissions viewer page
- Both draft and published forms can be previewed

**Important Notes:**
- **Interactive preview** - Users can actually fill out and test the form
- **No slug required** - Preview works even without a slug set
- **Mock submissions** - Preview mode shows success but doesn't save data
- **Perfect for testing** - Try your form before publishing to users
- **Live Preview tab** - Use the Preview tab in builder for quick layout checks
