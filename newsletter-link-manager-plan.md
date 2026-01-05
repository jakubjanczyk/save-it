# Newsletter Link Manager - V1 Implementation Plan

## Overview

A password-protected web app that fetches emails from configured newsletter senders, extracts links using LLM, and allows manual triage (save to Raindrop or discard). Built with Next.js 16, Convex, and deployed on Vercel.

## Tech Stack

- **Frontend:** Next.js 16 (App Router, Turbopack)
- **UI Components:** shadcn/ui (installed via CLI, default configuration)
- **Backend/DB:** Convex
- **Hosting:** Vercel
- **APIs:** Gmail API (OAuth 2.0), Raindrop API
- **LLM:** Gemini 3 Flash via AI SDK (configurable)
- **Auth:** Simple password middleware via `proxy.ts`
- **Error Handling:** Effect-TS (scoped to external API layer)
- **Testing:** Vitest + React Testing Library + Playwright (E2E)

---

## Data Model (Convex)

### Tables

#### senders

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Auto-generated |
| `email` | string | From address pattern (e.g., `*@substack.com` or `newsletter@example.com`) |
| `name` | string \| null | Optional display name |
| `createdAt` | number | Timestamp |

#### emails

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Auto-generated |
| `gmailId` | string | Unique Gmail message ID (prevents duplicates) |
| `senderId` | Id<"senders"> | Reference to sender |
| `from` | string | Actual from address |
| `subject` | string | Email subject |
| `receivedAt` | number | Timestamp from Gmail |
| `processedAt` | number \| null | When all links were handled |
| `markedAsRead` | boolean | Whether marked as read in Gmail |
| `extractionError` | boolean | True if LLM extraction failed |

#### links

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Auto-generated |
| `emailId` | Id<"emails"> | Reference to parent email |
| `url` | string | The link URL |
| `description` | string | LLM-extracted context |
| `status` | "pending" \| "saved" \| "discarded" | Current state |
| `savedAt` | number \| null | Timestamp when saved |
| `raindropId` | string \| null | Raindrop bookmark ID |

#### googleAuth

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Auto-generated |
| `accessToken` | string | Gmail API access token |
| `refreshToken` | string | Gmail API refresh token |
| `expiresAt` | number | Token expiration timestamp |

---

## Authentication

### App Password Protection

- `proxy.ts` checks for session cookie on all routes except `/login`
- Login page: single password field
- Password validated against `APP_PASSWORD` env variable
- On success, set HTTP-only cookie with signed token (use `jose` library for JWT)
- Redirect to main app

### Gmail OAuth

- Google OAuth 2.0 for Gmail API access
- Store tokens in Convex `googleAuth` table
- Implement token refresh flow
- Scopes needed: `gmail.readonly`, `gmail.modify` (for marking as read)
- Single-user app, so just one auth record

### Raindrop API

- API token stored in `RAINDROP_API_TOKEN` env variable
- Used server-side only

---

## Link Extraction

### Strategy: Pattern shortcuts + LLM fallback

#### Step 1: Check for known newsletter patterns

**Substack detection:**
- If email from `*@substack.com`
- Find URL matching `https://substack.com/app-link/post*`
- Use email subject as description
- Skip LLM, return single link

*(Future: add patterns for Beehiiv, ConvertKit, etc.)*

#### Step 2: LLM extraction for everything else

- Strip HTML to reduce tokens (remove styles, scripts, tracking pixels, excessive whitespace)
- Send cleaned content to LLM via AI SDK
- Parse structured JSON response

**LLM Prompt:**

```
Extract content links from this newsletter email. Return only links to articles, blog posts, videos, tools, or other content the reader is meant to consume.

Ignore and exclude:
- Unsubscribe / manage preferences links
- Social media profile links (twitter.com/user, linkedin.com/in/user, etc.)
- "View in browser" or "View online" links
- Company/sender homepage links
- Logo or header image links
- Footer links
- Email client links (mailto:)
- Tracking pixels or analytics URLs
- Share buttons
- App store links unless the newsletter is specifically about that app

For each content link found, provide:
- url: the full href URL
- description: 1-2 sentences describing what this link is about, based on surrounding context in the email

Return as JSON:
{
  "links": [
    { "url": "https://example.com/article", "description": "An article about..." }
  ]
}

If no content links are found, return: { "links": [] }
```

**Model configuration:**
- Default: Gemini 3 Flash (`gemini-3-flash`)
- Configurable via `LLM_MODEL` env variable
- Use AI SDK's `generateObject` for structured output

**Error handling:**
- If LLM returns malformed JSON or call fails:
  - Log the error with email details
  - Set `extractionError: true` on the email record
  - Store email with zero links
  - Email will appear in UI flagged as having extraction error

---

## Effect-TS Integration

### Scope

Effect-TS is used for external API interactions where typed error handling, retries, and composition shine. It is **not** used for:
- Convex functions (they have their own patterns)
- React components
- Simple utilities

### Where Effect is Used

| Module | Why Effect |
|--------|-----------|
| `lib/gmail.ts` | Token refresh, rate limits, network errors, retries |
| `lib/raindrop.ts` | API errors, rate limits, network errors |
| `lib/linkExtractor.ts` | LLM failures, parsing errors, timeouts |

### Error Types

Define typed errors for each external service:

```typescript
// lib/errors.ts
import { Data } from "effect"

// Gmail errors
export class GmailTokenExpired extends Data.TaggedError("GmailTokenExpired")<{
  message: string
}> {}

export class GmailTokenRefreshFailed extends Data.TaggedError("GmailTokenRefreshFailed")<{
  message: string
  cause?: unknown
}> {}

export class GmailRateLimited extends Data.TaggedError("GmailRateLimited")<{
  retryAfter?: number
}> {}

export class GmailNetworkError extends Data.TaggedError("GmailNetworkError")<{
  message: string
  cause?: unknown
}> {}

export class GmailMessageNotFound extends Data.TaggedError("GmailMessageNotFound")<{
  messageId: string
}> {}

// Raindrop errors
export class RaindropAuthError extends Data.TaggedError("RaindropAuthError")<{
  message: string
}> {}

export class RaindropRateLimited extends Data.TaggedError("RaindropRateLimited")<{
  retryAfter?: number
}> {}

export class RaindropNetworkError extends Data.TaggedError("RaindropNetworkError")<{
  message: string
  cause?: unknown
}> {}

export class RaindropSaveFailed extends Data.TaggedError("RaindropSaveFailed")<{
  url: string
  message: string
}> {}

// Link extraction errors
export class ExtractionLLMError extends Data.TaggedError("ExtractionLLMError")<{
  message: string
  cause?: unknown
}> {}

export class ExtractionParseError extends Data.TaggedError("ExtractionParseError")<{
  message: string
  rawResponse?: string
}> {}

export class ExtractionTimeout extends Data.TaggedError("ExtractionTimeout")<{
  timeoutMs: number
}> {}
```

### Example: Gmail Service with Effect

```typescript
// lib/gmail.ts
import { Effect, Schedule, pipe } from "effect"
import {
  GmailTokenExpired,
  GmailTokenRefreshFailed,
  GmailRateLimited,
  GmailNetworkError,
} from "./errors"

// Type signature explicitly shows what can fail
export const fetchEmails = (
  accessToken: string,
  senderPatterns: string[]
): Effect.Effect<
  GmailMessage[],
  GmailTokenExpired | GmailRateLimited | GmailNetworkError
> =>
  pipe(
    Effect.tryPromise({
      try: () => callGmailApi(accessToken, senderPatterns),
      catch: (error) => mapGmailError(error),
    }),
    // Retry on rate limit with exponential backoff
    Effect.retry(
      Schedule.exponential("1 second").pipe(
        Schedule.compose(Schedule.recurs(3)),
        Schedule.whileInput((error) => error._tag === "GmailRateLimited")
      )
    )
  )

export const markAsRead = (
  accessToken: string,
  messageId: string
): Effect.Effect<
  void,
  GmailTokenExpired | GmailNetworkError | GmailMessageNotFound
> => // ...

// Token refresh flow
export const withFreshToken = <A, E>(
  getTokens: () => Promise<StoredTokens>,
  saveTokens: (tokens: StoredTokens) => Promise<void>,
  operation: (accessToken: string) => Effect.Effect<A, E>
): Effect.Effect<A, E | GmailTokenExpired | GmailTokenRefreshFailed> =>
  pipe(
    Effect.promise(() => getTokens()),
    Effect.flatMap((tokens) =>
      isTokenExpired(tokens)
        ? refreshAndSave(tokens, saveTokens)
        : Effect.succeed(tokens.accessToken)
    ),
    Effect.flatMap(operation)
  )
```

### Example: Raindrop Service with Effect

```typescript
// lib/raindrop.ts
import { Effect, Schedule, pipe } from "effect"
import {
  RaindropAuthError,
  RaindropRateLimited,
  RaindropNetworkError,
  RaindropSaveFailed,
} from "./errors"

export const saveBookmark = (
  apiToken: string,
  url: string,
  title: string,
  collectionId: number = -1
): Effect.Effect<
  { raindropId: string },
  RaindropAuthError | RaindropRateLimited | RaindropNetworkError | RaindropSaveFailed
> =>
  pipe(
    Effect.tryPromise({
      try: async () => {
        const response = await fetch("https://api.raindrop.io/rest/v1/raindrop", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            link: url,
            title,
            collection: { "$id": collectionId },
          }),
        })
        
        if (!response.ok) {
          throw { status: response.status, body: await response.text() }
        }
        
        return response.json()
      },
      catch: (error) => mapRaindropError(error, url),
    }),
    Effect.map((data) => ({ raindropId: data.item._id })),
    Effect.retry(
      Schedule.exponential("500 millis").pipe(
        Schedule.compose(Schedule.recurs(2)),
        Schedule.whileInput((error) => error._tag === "RaindropRateLimited")
      )
    )
  )
```

### Example: Link Extractor with Effect

```typescript
// lib/linkExtractor.ts
import { Effect, pipe } from "effect"
import { ExtractionLLMError, ExtractionParseError, ExtractionTimeout } from "./errors"

export const extractLinks = (
  emailHtml: string,
  subject: string,
  from: string
): Effect.Effect<
  ExtractedLink[],
  ExtractionLLMError | ExtractionParseError | ExtractionTimeout
> =>
  pipe(
    // Try Substack shortcut first
    checkSubstackPattern(emailHtml, subject, from),
    Effect.orElse(() =>
      // Fall back to LLM extraction
      pipe(
        llmExtract(emailHtml),
        Effect.timeout("30 seconds"),
        Effect.mapError((error) =>
          error._tag === "TimeoutException"
            ? new ExtractionTimeout({ timeoutMs: 30000 })
            : error
        )
      )
    )
  )

const checkSubstackPattern = (
  html: string,
  subject: string,
  from: string
): Effect.Effect<ExtractedLink[], never, never> =>
  Effect.sync(() => {
    if (!from.includes("@substack.com")) {
      return Effect.fail("not substack" as const)
    }
    const match = html.match(/https:\/\/substack\.com\/app-link\/post[^"'\s]+/)
    if (!match) {
      return Effect.fail("no substack link found" as const)
    }
    return Effect.succeed([{ url: match[0], description: subject }])
  }).pipe(Effect.flatten)
```

### Running Effects in Convex Actions

Convex actions can run Effect programs by using `Effect.runPromise`:

```typescript
// convex/emails.ts
import { action } from "./_generated/server"
import { Effect } from "effect"
import { fetchEmails, withFreshToken } from "../lib/gmail"
import { extractLinks } from "../lib/linkExtractor"

export const fetchFromGmail = action({
  handler: async (ctx) => {
    const program = pipe(
      withFreshToken(
        () => ctx.runQuery(internal.googleAuth.getTokens),
        (tokens) => ctx.runMutation(internal.googleAuth.saveTokens, tokens),
        (accessToken) => fetchEmails(accessToken, senderPatterns)
      ),
      Effect.flatMap((messages) =>
        Effect.forEach(messages, (msg) =>
          pipe(
            extractLinks(msg.html, msg.subject, msg.from),
            Effect.map((links) => ({ message: msg, links })),
            // Don't fail the whole batch if one extraction fails
            Effect.catchAll((error) =>
              Effect.succeed({ message: msg, links: [], extractionError: error })
            )
          )
        )
      )
    )

    const result = await Effect.runPromise(program).catch((error) => {
      // Handle unrecoverable errors
      console.error("Gmail fetch failed:", error)
      throw error
    })

    // Store results in Convex
    for (const { message, links, extractionError } of result) {
      await ctx.runMutation(internal.emails.store, {
        gmailId: message.id,
        subject: message.subject,
        // ...
        extractionError: !!extractionError,
      })
      
      for (const link of links) {
        await ctx.runMutation(internal.links.store, {
          emailId,
          url: link.url,
          description: link.description,
        })
      }
    }

    return { fetched: result.length }
  },
})
```

### Testing Effect Code

Effect makes testing easier because errors are values:

```typescript
// lib/gmail.test.ts
import { Effect } from "effect"
import { describe, it, expect } from "vitest"
import { fetchEmails } from "./gmail"
import { GmailRateLimited, GmailTokenExpired } from "./errors"

describe("fetchEmails", () => {
  it("returns emails on success", async () => {
    // Mock the API call
    const result = await Effect.runPromise(
      fetchEmails("valid-token", ["test@example.com"])
    )
    expect(result).toHaveLength(2)
  })

  it("fails with GmailTokenExpired on 401", async () => {
    const result = await Effect.runPromiseExit(
      fetchEmails("expired-token", ["test@example.com"])
    )
    
    expect(result._tag).toBe("Failure")
    if (result._tag === "Failure") {
      const error = Cause.failureOption(result.cause)
      expect(error._tag).toBe("GmailTokenExpired")
    }
  })

  it("retries on rate limit", async () => {
    // Test that retry logic works
    // ...
  })
})
```

---

## Core Features

### 1. Sender Management

**UI:** Settings page (`/settings`)
- Form: email input + optional name input + "Add" button
- List of configured senders with delete button
- Simple table or card layout

**Convex functions:**
- `senders.add({ email, name? })` - mutation
- `senders.list()` - query
- `senders.remove({ id })` - mutation

---

### 2. Gmail Connection

**UI:** Settings page, "Google Account" section
- If not connected: "Connect Gmail" button → OAuth flow
- If connected: show connected email, "Disconnect" button

**OAuth flow:**
1. User clicks "Connect Gmail"
2. Redirect to Google OAuth consent screen
3. Google redirects back to `/api/auth/google/callback`
4. Exchange code for tokens
5. Store tokens in Convex
6. Redirect to settings with success message

**Convex functions:**
- `googleAuth.saveTokens({ accessToken, refreshToken, expiresAt })` - mutation
- `googleAuth.getTokens()` - query
- `googleAuth.clearTokens()` - mutation

**Token refresh:**
- Before any Gmail API call, check if token expired
- If expired, use refresh token to get new access token
- Update stored tokens

---

### 3. Email Fetching

**UI:** Main page (`/`)
- "Fetch new emails" button with loading state
- Shows count of new emails fetched
- Error state if Gmail not connected

**Flow:**
1. Get list of sender email patterns from DB
2. Query Gmail API for recent emails (last 7 days) matching those senders
3. For each email not already in DB:
   - Store email record
   - Run link extraction (pattern or LLM)
   - Store extracted links with status "pending"
   - If extraction fails, set `extractionError: true`
4. Return count of new emails/links

**Gmail API query:**
- Use `from:` operator for each sender
- Example: `from:newsletter@example.com OR from:*@substack.com newer_than:7d`
- Fetch full message to get HTML body

**Convex functions:**
- `emails.fetchFromGmail()` - action
  - Calls Gmail API
  - Runs link extraction
  - Writes emails + links to DB
- `emails.listWithPendingLinks()` - query
  - Returns emails that have at least one pending link OR have extraction errors
  - Includes pending link count per email
  - Includes `extractionError` flag

**Background job:**
- Convex cron: run `emails.fetchFromGmail` daily at configurable time
- Defined in `convex/crons.ts`

---

### 4. Link Triage UI

#### Two View Modes

**List View (default)**
- Left/top: list of emails with pending links
  - Show: sender name, subject, date, pending link count
  - If `extractionError: true`, show warning indicator (⚠️)
  - Click to select/expand
- Right/bottom: links for selected email
  - If extraction error: show message "Link extraction failed for this email. You may need to process it manually." with link to open original email in Gmail
  - Each link shows:
    - URL (truncated, full on hover)
    - "Open" button (new tab)
    - Description from LLM
    - "Save" button (green)
    - "Discard" button (red/gray)
  - Visual state change when actioned (fade out or strikethrough)
- When all links processed OR for emails with extraction errors:
  - "Mark as read" button (discards remaining + marks read)

**Focus View ("Tinder mode")**
- Single link displayed prominently
- Shows:
  - Email subject (context)
  - Sender name
  - Link URL (full, clickable)
  - Description (larger text)
  - Preview button (opens link in new tab to check before deciding)
- Large Save / Discard buttons (styled for easy tap on mobile)
- Progress indicator: "Link 3 of 12" or "5 remaining in this email"
- Auto-advances to next link after action
- When email's links are done, prompt: "All links processed. Mark as read?" with Yes/Skip options
- Skip moves to next email's links

**View toggle:** Button or tab to switch between List View and Focus View

#### Keyboard Shortcuts

| Action | Shortcut | Notes |
|--------|----------|-------|
| **Save link** | `S` or `→` | Saves current/selected link to Raindrop |
| **Discard link** | `D` or `←` | Discards current/selected link |
| **Open link in new tab** | `O` or `Enter` | Preview before deciding |
| **Mark email as read** | `M` | Discards remaining links + marks read |
| **Next link** | `J` or `↓` | List view: move selection down |
| **Previous link** | `K` or `↑` | List view: move selection up |
| **Next email** | `N` | Jump to next email with pending links |
| **Previous email** | `P` | Jump to previous email |
| **Toggle view mode** | `V` | Switch between List and Focus view |
| **Show shortcuts help** | `?` | Display shortcut overlay |

**Keyboard shortcut implementation notes:**
- Use a keyboard shortcut library (e.g., `react-hotkeys-hook`) or native `useEffect` with `keydown` listener
- Shortcuts only active when not focused on input fields
- Show subtle hint in UI: "Press ? for keyboard shortcuts"
- In Focus View, arrow keys (←/→) feel natural for swipe-like actions
- In List View, vim-style (j/k) for navigation

**Convex functions:**
- `links.listByEmail({ emailId })` - query
- `links.save({ linkId })` - action (calls Raindrop, updates status)
- `links.discard({ linkId })` - mutation
- `emails.markAsRead({ emailId })` - action (discards all pending links + calls Gmail API + updates DB)

---

### 5. Raindrop Integration

**On save action:**
1. POST to `https://api.raindrop.io/rest/v1/raindrop`
2. Headers: `Authorization: Bearer {RAINDROP_API_TOKEN}`
3. Body:
```json
{
  "link": "https://example.com/article",
  "title": "Description from LLM extraction",
  "collection": { "$id": -1 }
}
```
4. Store returned `_id` as `raindropId` on link record
5. Update link status to "saved"

Collection ID `-1` = Unsorted (default)

---

## Project Structure

```
/app
  /login
    page.tsx              # password login form
  /(protected)
    layout.tsx            # wraps protected routes
    page.tsx              # main dashboard - email/link triage
    /settings
      page.tsx            # sender management + gmail connection
  /api
    /auth
      /google
        route.ts          # initiates OAuth
        /callback
          route.ts        # OAuth callback handler

/components
  /triage
    ListView.tsx          # email list + link list view
    ListView.test.tsx
    FocusView.tsx         # single link "Tinder" view
    FocusView.test.tsx
    EmailList.tsx         # list of emails with pending links
    EmailList.test.tsx
    LinkList.tsx          # list of links for selected email
    LinkList.test.tsx
    LinkCard.tsx          # single link display (used in both views)
    LinkCard.test.tsx
    ViewToggle.tsx        # switch between List/Focus
    ViewToggle.test.tsx
    KeyboardShortcuts.tsx # shortcut handler + help overlay
    KeyboardShortcuts.test.tsx
    ProgressIndicator.tsx # "3 of 12 links" display
    ProgressIndicator.test.tsx
  /settings
    SenderForm.tsx        # add sender form
    SenderForm.test.tsx
    SenderList.tsx        # list of senders
    SenderList.test.tsx
    GmailConnection.tsx   # OAuth connect/disconnect UI
    GmailConnection.test.tsx
  /ui                     # shadcn/ui components (auto-generated)
    button.tsx
    input.tsx
    card.tsx
    dialog.tsx
    toast.tsx
    # ... other shadcn components as needed

/convex
  schema.ts               # data model
  senders.ts              # sender CRUD
  senders.test.ts
  emails.ts               # email fetching, listing, mark as read
  emails.test.ts
  links.ts                # link save/discard actions
  links.test.ts
  googleAuth.ts           # OAuth token management
  googleAuth.test.ts
  crons.ts                # daily fetch job

/lib
  errors.ts             # Effect-TS typed errors (Gmail, Raindrop, Extraction)
  errors.test.ts
  gmail.ts              # Gmail API helpers with Effect (fetch, mark read)
  gmail.test.ts
  raindrop.ts           # Raindrop API helper with Effect
  raindrop.test.ts
  linkExtractor.ts      # pattern detection + LLM extraction with Effect
  linkExtractor.test.ts
  auth.ts               # password session helpers (JWT sign/verify)
  auth.test.ts
  hooks/
    useKeyboardShortcuts.ts
    useKeyboardShortcuts.test.ts

/e2e                      # Playwright E2E tests
  auth.spec.ts            # login flow tests
  senders.spec.ts         # sender management tests
  gmail-oauth.spec.ts     # OAuth flow tests (mocked)
  triage-list.spec.ts     # list view triage tests
  triage-focus.spec.ts    # focus view triage tests
  keyboard.spec.ts        # keyboard shortcut tests

proxy.ts                  # password auth check (replaces middleware.ts)

vitest.config.ts          # Vitest configuration
playwright.config.ts      # Playwright configuration
/test
  setup.ts                # test setup (mocks, providers)
  utils.tsx               # test utilities (render helpers, mock factories)
  mocks/
    gmail.ts              # Gmail API mocks
    raindrop.ts           # Raindrop API mocks
    convex.ts             # Convex mock helpers
```

---

## Environment Variables

```bash
# App auth
APP_PASSWORD=your-secure-password
JWT_SECRET=random-32-char-string

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback

# Raindrop
RAINDROP_API_TOKEN=

# LLM (optional, defaults to gemini-3-flash)
LLM_MODEL=gemini-3-flash
GOOGLE_GENERATIVE_AI_API_KEY=

# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

---

## Testing Strategy

### Approach: Test-Driven Development (TDD)

For each feature, follow the Red-Green-Refactor cycle:
1. **Red:** Write failing tests first that define expected behavior
2. **Green:** Write minimal code to make tests pass
3. **Refactor:** Clean up code while keeping tests green

### Test Types

#### Unit Tests (Vitest + React Testing Library)

**Library functions (`/lib`):**
- Test pure functions in isolation
- Mock external APIs (Gmail, Raindrop, Gemini)
- Test error handling and edge cases

**Convex functions (`/convex`):**
- Use Convex test utilities
- Test mutations and queries with mock data
- Test action side effects with mocked external calls

**React components (`/components`):**
- Test rendering with various props
- Test user interactions (clicks, keyboard)
- Test integration with hooks
- Use mock Convex provider for data

**Hooks (`/lib/hooks`):**
- Test hook behavior with `@testing-library/react` renderHook
- Test keyboard event handling
- Test state updates

#### Integration Tests (Vitest)

- Test component + Convex integration
- Test multi-step workflows
- Test error propagation

#### E2E Tests (Playwright)

- Test complete user flows
- Test across page navigations
- Test with mocked external APIs
- Run against local dev server

### Test File Conventions

```
ComponentName.tsx       # Component
ComponentName.test.tsx  # Component tests

utilityName.ts          # Utility function
utilityName.test.ts     # Utility tests

/e2e
  feature.spec.ts       # E2E test for feature
```

### Test Granularity

- Keep tests small and focused: **one behavior per test** (avoid asserting multiple unrelated things in a single test).
- Prefer real integration over mocks; avoid module-level mocks unless you’re at a boundary you can’t reasonably exercise in tests.

### Mocking Strategy

**Gmail API (`/test/mocks/gmail.ts`):**
```typescript
export const mockGmailMessages = [
  {
    id: 'msg-1',
    payload: {
      headers: [
        { name: 'From', value: 'newsletter@example.com' },
        { name: 'Subject', value: 'Weekly Digest' },
      ],
      parts: [{ mimeType: 'text/html', body: { data: '...' } }],
    },
  },
];

export const mockFetchEmails = vi.fn().mockResolvedValue(mockGmailMessages);
export const mockMarkAsRead = vi.fn().mockResolvedValue({ success: true });
```

**Raindrop API (`/test/mocks/raindrop.ts`):**
```typescript
export const mockSaveBookmark = vi.fn().mockResolvedValue({
  item: { _id: 'raindrop-123' },
});
```

**LLM/AI SDK (`/test/mocks/ai.ts`):**
```typescript
export const mockGenerateObject = vi.fn().mockResolvedValue({
  object: {
    links: [
      { url: 'https://example.com/article', description: 'An article' },
    ],
  },
});
```

**Convex (`/test/mocks/convex.ts`):**
```typescript
import { ConvexProvider, ConvexReactClient } from 'convex/react';

export const mockConvexClient = {
  // Mock implementation
};

export function TestConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={mockConvexClient as any}>
      {children}
    </ConvexProvider>
  );
}
```

### Test Utilities (`/test/utils.tsx`)

```typescript
import { render } from '@testing-library/react';
import { TestConvexProvider } from './mocks/convex';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <TestConvexProvider>
      {ui}
    </TestConvexProvider>
  );
}

// Factory functions for test data
export function createMockEmail(overrides = {}) {
  return {
    _id: 'email-1',
    gmailId: 'gmail-123',
    subject: 'Test Newsletter',
    from: 'test@example.com',
    receivedAt: Date.now(),
    processedAt: null,
    markedAsRead: false,
    extractionError: false,
    ...overrides,
  };
}

export function createMockLink(overrides = {}) {
  return {
    _id: 'link-1',
    emailId: 'email-1',
    url: 'https://example.com/article',
    description: 'An interesting article',
    status: 'pending' as const,
    savedAt: null,
    raindropId: null,
    ...overrides,
  };
}
```

### Testing Effect Code

Effect-TS makes testing easier because errors are values in the type system. Use these patterns:

**Testing successful Effects:**
```typescript
import { Effect } from "effect"
import { describe, it, expect } from "vitest"

describe("fetchEmails", () => {
  it("returns emails on success", async () => {
    const result = await Effect.runPromise(
      fetchEmails("valid-token", ["test@example.com"])
    )
    expect(result).toHaveLength(2)
  })
})
```

**Testing Effect failures:**
```typescript
import { Effect, Exit, Cause } from "effect"

it("fails with GmailTokenExpired on 401", async () => {
  const exit = await Effect.runPromiseExit(
    fetchEmails("expired-token", ["test@example.com"])
  )
  
  expect(Exit.isFailure(exit)).toBe(true)
  if (Exit.isFailure(exit)) {
    const error = Cause.failureOption(exit.cause)
    expect(Option.isSome(error)).toBe(true)
    if (Option.isSome(error)) {
      expect(error.value._tag).toBe("GmailTokenExpired")
    }
  }
})
```

**Testing retry behavior:**
```typescript
it("retries on rate limit then succeeds", async () => {
  let attempts = 0
  const mockFetch = vi.fn().mockImplementation(() => {
    attempts++
    if (attempts < 3) {
      return Promise.reject({ status: 429 })
    }
    return Promise.resolve({ messages: [] })
  })

  const result = await Effect.runPromise(
    fetchEmailsWithMock(mockFetch, "token", ["test@example.com"])
  )
  
  expect(attempts).toBe(3)
  expect(result).toEqual([])
})
```

**Testing Effect with dependencies (Services):**
```typescript
import { Effect, Layer } from "effect"

// If using Effect Services/Layers
const TestGmailService = Layer.succeed(GmailService, {
  fetchEmails: () => Effect.succeed(mockEmails),
  markAsRead: () => Effect.succeed(undefined),
})

it("uses injected service", async () => {
  const program = pipe(
    fetchAndProcessEmails(),
    Effect.provide(TestGmailService)
  )
  
  const result = await Effect.runPromise(program)
  expect(result).toBeDefined()
})
```

**Mocking Effect modules (`/test/mocks/effect-gmail.ts`):**
```typescript
import { Effect } from "effect"
import type { GmailMessage } from "@/lib/gmail"
import { GmailTokenExpired, GmailRateLimited } from "@/lib/errors"

export const createMockGmailModule = (options: {
  emails?: GmailMessage[]
  shouldFailWithExpiredToken?: boolean
  shouldRateLimit?: boolean
  rateLimitAttempts?: number
}) => {
  let attempts = 0
  
  return {
    fetchEmails: vi.fn().mockImplementation((token: string, senders: string[]) => {
      if (options.shouldFailWithExpiredToken) {
        return Effect.fail(new GmailTokenExpired({ message: "Token expired" }))
      }
      
      if (options.shouldRateLimit && attempts < (options.rateLimitAttempts ?? 2)) {
        attempts++
        return Effect.fail(new GmailRateLimited({ retryAfter: 1 }))
      }
      
      return Effect.succeed(options.emails ?? [])
    }),
    
    markAsRead: vi.fn().mockImplementation(() => Effect.succeed(undefined)),
  }
}
```

### Running Tests

```bash
# Run unit/integration tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Coverage Goals

- **Lib functions:** 90%+ coverage
- **Convex functions:** 85%+ coverage  
- **Components:** 80%+ coverage
- **E2E:** Cover all critical user paths

### CI Integration

Tests should run on every PR:
1. Lint check
2. Type check
3. Unit tests
4. E2E tests (against preview deployment)

---

## Implementation Order

### Phase 1: Project Setup

**Scaffold status (done in this repo; no features yet):**
- [x] Next.js 16 + Tailwind scaffold (App Router, Turbopack) using Biome (no ESLint)
- [x] shadcn/ui initialized (zinc, CSS variables) + components: `button`, `input`, `card`, `dialog`, `sonner` (toast is deprecated)
- [x] Dependencies installed: `convex`, `effect`, `vitest`, `playwright`, `@testing-library/*`, `jsdom`
- [x] Vitest configured via `vitest.config.ts` + `vitest.setup.ts`; tests are colocated next to code (example: `lib/utils.test.ts`); test setup keeps `jose` working under `jsdom`
- [x] Playwright configured via `playwright.config.ts` (E2E folder present)
- [x] Convex schema stubbed in `convex/schema.ts` (Convex `dev` not run yet)
- [x] Tests for Convex schema/indexes: `convex/schema.test.ts`
- [x] Effect error types + tests: `lib/errors.ts`, `lib/errors.test.ts`
- [x] Auth utilities + tests: `lib/auth.ts`, `lib/auth.test.ts` (uses `jose`)
- [x] Password middleware scaffold: `proxy.ts` + `middleware.ts` (tests: `proxy.test.ts`)
- [x] Login page + server action scaffold: `app/login/page.tsx`, `app/login/actions.ts` (tests: `app/login/page.test.tsx`)
- [x] Auth E2E spec drafted: `e2e/auth.spec.ts` (run with `pnpm e2e`)
- [x] Biome configured to extend Ultracite (`biome.json`)
- [x] Repo hygiene: `.gitignore`, `.env.example`, `CLAUDE.md`, `AGENTS.md` symlink, updated `README.md`

1. Initialize Next.js 16 project with App Router
   ```bash
   npx create-next-app@latest newsletter-link-manager --typescript --tailwind --no-eslint --biome --app --src-dir=false
   ```
2. Set up shadcn/ui
   ```bash
   npx shadcn@latest init
   # Choose: New York style, Zinc color, CSS variables: yes
   ```
3. Install initial shadcn components
   ```bash
   npx shadcn@latest add button input card dialog sonner
   ```
4. Install Effect-TS
   ```bash
   npm install effect
   ```
5. Set up testing infrastructure
   ```bash
   npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
   npm install -D playwright @playwright/test
   npx playwright install
   ```
6. Configure Vitest (`vitest.config.ts`)
   ```typescript
   import { defineConfig } from 'vitest/config'
   import react from '@vitejs/plugin-react'
   import path from 'path'
   
   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       setupFiles: ['./vitest.setup.ts'],
       globals: true,
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './'),
       },
     },
   })
   ```
7. Create Vitest setup file (`vitest.setup.ts`)
8. Configure Playwright (`playwright.config.ts`)
9. Set up Convex project, connect to Next.js
   ```bash
   npx convex dev
   ```
10. Write tests for Convex schema validation
11. Define Convex schema (all tables)
12. Deploy to Vercel, configure env variables
13. Write tests for Effect error types (`lib/errors.test.ts`)
    - Test error construction
    - Test error tags
    - Test error data
14. Implement Effect error types (`lib/errors.ts`) - make tests pass
15. Write tests for auth utilities (`lib/auth.test.ts`)
    - Test JWT signing
    - Test JWT verification
    - Test password validation
16. Implement auth utilities (`lib/auth.ts`) - make tests pass
17. Write tests for `proxy.ts` behavior
18. Implement `proxy.ts` password check - make tests pass
19. Write tests for login page component
20. Build login page and session handling - make tests pass
21. Write E2E test for auth flow (`e2e/auth.spec.ts`)
22. Test auth flow end-to-end

### Phase 2: Sender Management

**Progress (done in this repo):**
- [x] Steps 23–24: Sender Convex functions + official tests (`convex-test`)
- [x] Step 25: Settings page layout scaffold (`/settings`)
- [x] Step 26: `SenderForm` tests (colocated)
- [x] Step 27: `SenderForm` UI scaffold
- [x] Step 28: `SenderList` tests (colocated)
- [x] Step 29: `SenderList` UI scaffold
- [x] Wire `/senders` page to Convex (requires `NEXT_PUBLIC_CONVEX_URL`)
- [x] Step 30: E2E sender management spec drafted (`e2e/senders.spec.ts`)

23. Write tests for sender Convex functions (`convex/senders.test.ts`)
    - Test add sender
    - Test list senders
    - Test remove sender
    - Test duplicate email handling
24. Implement sender Convex functions - make tests pass
25. Build settings page layout
26. Write tests for `SenderForm` component
    - Test form rendering
    - Test validation (empty email)
    - Test successful submission
27. Build `SenderForm` component - make tests pass
28. Write tests for `SenderList` component
    - Test empty state
    - Test list rendering
    - Test delete action
29. Build `SenderList` component - make tests pass
30. Write E2E test for sender management (`e2e/senders.spec.ts`)
31. Test add/remove flow end-to-end

### Phase 3: Gmail Integration

**Progress (done in this repo):**
- [x] Steps 34–35: `googleauth` Convex functions + tests
- [x] Step 36: Gmail error mapping tests (`lib/gmail.test.ts`)
- [x] Steps 37–38: Gmail Effect helpers + tests (`lib/gmail.ts`, `lib/gmail.test.ts`)
- [x] Steps 39–40: Google OAuth routes scaffolded (`app/api/auth/google/*`)
- [x] Steps 41–43: `GmailConnection` component + settings integration
- [x] Step 44: Mocked OAuth flow integration test (`app/api/auth/google/oauth-flow.test.ts`)

32. Create Google Cloud project, enable Gmail API
33. Configure OAuth consent screen (test mode for personal use)
34. Write tests for googleAuth Convex functions (`convex/googleauth.test.ts`)
    - Test save tokens
    - Test get tokens
    - Test clear tokens
    - Test token expiration check
35. Implement googleAuth Convex functions (`convex/googleauth.ts`) - make tests pass
36. Write tests for Gmail Effect errors (`lib/gmail.test.ts`)
    - Test GmailTokenExpired error mapping
    - Test GmailRateLimited error mapping
    - Test GmailNetworkError error mapping
37. Write tests for Gmail API helpers with Effect (`lib/gmail.test.ts`)
    - Test fetchEmails success case
    - Test fetchEmails with expired token
    - Test fetchEmails with rate limit (retry behavior)
    - Test markAsRead success case
    - Test withFreshToken token refresh flow
38. Implement Gmail API helpers with Effect - make tests pass
39. Implement OAuth initiation route (`/api/auth/google`)
40. Implement OAuth callback route (exchange code, store tokens)
41. Write tests for `GmailConnection` component
    - Test disconnected state
    - Test connected state
    - Test connect button action
    - Test disconnect button action
42. Build `GmailConnection` component - make tests pass
43. Add to settings page
44. Write E2E test for OAuth flow (`app/api/auth/google/oauth-flow.test.ts`) - mocked
45. Test OAuth flow and email fetching

### Phase 4: Link Extraction

**Progress (done in this repo):**
- [x] Step 46: Link extractor error utilities + tests (`lib/link-extractor.ts`, `lib/link-extractor.test.ts`)
- [x] Steps 47–48: Substack detector + tests (`lib/substack-detector.ts`, `lib/substack-detector.test.ts`)

46. Write tests for link extractor Effect errors (`lib/link-extractor.test.ts`)
    - Test ExtractionLLMError error
    - Test ExtractionParseError error
    - Test ExtractionTimeout error
47. Write tests for Substack pattern detector
    - Test Substack email detection
    - Test Substack URL extraction
    - Test non-Substack fallthrough
48. Implement Substack pattern detector with Effect - make tests pass
49. Set up AI SDK with Gemini 3 Flash
50. Write tests for LLM extraction with Effect
    - Test successful extraction
    - Test LLM API error handling
    - Test malformed JSON response
    - Test timeout behavior
51. Implement LLM extraction with Effect - make tests pass
52. Write tests for full link extractor (pattern → LLM fallback)
53. Implement full link extractor module - make tests pass
54. Write tests for emails Convex functions (`convex/emails.test.ts`)
    - Test fetchFromGmail action with Effect integration
    - Test listWithPendingLinks query
    - Test duplicate email handling
    - Test extraction error flag
55. Implement emails Convex functions - make tests pass
56. Add "Fetch emails" button to main page
57. Test full fetch flow including error cases

### Phase 5: Triage UI - List View

58. Write tests for `EmailList` component
    - Test empty state
    - Test list rendering
    - Test extraction error indicator
    - Test selection
59. Build `EmailList` component - make tests pass
60. Write tests for `LinkCard` component
    - Test link display
    - Test save button
    - Test discard button
    - Test open link action
61. Build `LinkCard` component - make tests pass
62. Write tests for `LinkList` component
    - Test empty state
    - Test list rendering
    - Test extraction error message
63. Build `LinkList` component - make tests pass
64. Write tests for links Convex functions (`convex/links.test.ts`)
    - Test listByEmail query
    - Test discard mutation
65. Implement links Convex functions - make tests pass
66. Wire up discard button
67. Add visual feedback for actioned links (fade/strikethrough)
68. Write tests for `ListView` component
    - Test layout
    - Test email selection updates link list
69. Build `ListView` combining EmailList + LinkList - make tests pass
70. Write E2E test for list view triage (`e2e/triage-list.spec.ts`)
71. Test list view navigation and discard flow

### Phase 6: Triage UI - Focus View

72. Write tests for `ProgressIndicator` component
    - Test display format
    - Test various counts
73. Build `ProgressIndicator` component - make tests pass
74. Write tests for `FocusView` component
    - Test single link display
    - Test save action + auto-advance
    - Test discard action + auto-advance
    - Test "all processed" prompt
    - Test empty state
75. Build `FocusView` component - make tests pass
76. Write tests for `ViewToggle` component
    - Test toggle between views
    - Test active state
77. Build `ViewToggle` component - make tests pass
78. Add view toggle to main page
79. Write E2E test for focus view triage (`e2e/triage-focus.spec.ts`)
80. Test Focus View flow

### Phase 7: Keyboard Shortcuts

81. Write tests for `useKeyboardShortcuts` hook (`lib/hooks/useKeyboardShortcuts.test.ts`)
    - Test each shortcut triggers correct action
    - Test shortcuts disabled when input focused
    - Test arrow keys in Focus View
    - Test vim keys in List View
82. Create `useKeyboardShortcuts` hook - make tests pass
83. Write tests for `KeyboardShortcuts` component
    - Test help overlay toggle
    - Test overlay content
84. Build `KeyboardShortcuts` component - make tests pass
85. Integrate shortcuts into views
86. Add "Press ? for shortcuts" hint to UI
87. Write E2E test for keyboard shortcuts (`e2e/keyboard.spec.ts`)
88. Test all shortcuts in both views

### Phase 8: Raindrop Integration

89. Write tests for Raindrop Effect errors (`lib/raindrop.test.ts`)
    - Test RaindropAuthError error mapping
    - Test RaindropRateLimited error mapping
    - Test RaindropNetworkError error mapping
    - Test RaindropSaveFailed error mapping
90. Write tests for Raindrop API helper with Effect (`lib/raindrop.test.ts`)
    - Test successful save
    - Test API error handling
    - Test retry on rate limit
    - Test response parsing
91. Implement Raindrop API helper with Effect - make tests pass
92. Write tests for links.save action (`convex/links.test.ts`)
    - Test save updates status
    - Test raindropId stored
    - Test Effect error handling in Convex
93. Create `links.save` action - make tests pass
94. Wire up save button
95. Test full save flow
96. Add error handling for Raindrop API failures (toast notification)

### Phase 9: Email Completion

97. Write tests for emails.markAsRead action (`convex/emails.test.ts`)
    - Test pending links discarded
    - Test Gmail API called (via Effect)
    - Test email record updated
    - Test Effect error handling
98. Implement `emails.markAsRead` action - make tests pass
99. Wire up "Mark as read" button (and `M` shortcut)
100. Update email list to hide fully processed emails
101. Test mark as read flow

### Phase 10: Background Sync

102. Set up Convex cron job in `convex/crons.ts`
103. Configure daily fetch time
104. Test scheduled execution (manual trigger)
105. Add logging for cron job runs

### Phase 11: Polish

106. Add loading states throughout (buttons, lists, views)
107. Add error handling and error UI (toasts via sonner)
    - Surface Effect error types with user-friendly messages
108. Add empty states:
    - No senders configured
    - No emails to process
    - No pending links
    - Gmail not connected
109. Review and polish Tailwind styling
110. Mobile responsiveness testing
111. Run full test suite, fix any failures
112. Run E2E tests, fix any failures
113. Manual end-to-end testing of all flows
114. Performance review (pagination if needed)

---

## API Reference

### Gmail API

**List messages:**
```
GET https://gmail.googleapis.com/gmail/v1/users/me/messages
?q=from:newsletter@example.com newer_than:7d
&maxResults=50
```

**Get message:**
```
GET https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}
?format=full
```

**Mark as read:**
```
POST https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}/modify
Body: { "removeLabelIds": ["UNREAD"] }
```

**Rate limits:** 250 quota units/user/second (plenty for this use case)

### Raindrop API

**Create bookmark:**
```
POST https://api.raindrop.io/rest/v1/raindrop
Headers: Authorization: Bearer {token}
Body: {
  "link": "https://example.com",
  "title": "Description",
  "collection": { "$id": -1 }
}
```

**Rate limits:** 120 requests/minute

### Gemini API (via AI SDK)

```typescript
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: google('gemini-3-flash'),
  schema: z.object({
    links: z.array(z.object({
      url: z.string(),
      description: z.string(),
    })),
  }),
  prompt: `Extract content links from this newsletter...`,
});
```

---

## Notes for Implementation

### Effect-TS Usage Guidelines
- **Scope:** Only use Effect in `/lib/gmail.ts`, `/lib/raindrop.ts`, `/lib/linkExtractor.ts`
- **Don't use Effect for:** Convex function definitions, React components, simple utilities
- **Running Effects in Convex:** Use `Effect.runPromise()` or `Effect.runPromiseExit()` in Convex actions
- **Error handling pattern:** Let Effect handle retries/timeouts, then convert to Convex-friendly errors at the boundary
- **Testing:** Use `Effect.runPromiseExit()` to inspect failures without throwing

### Gmail API
- Use `users.messages.list` with `q` parameter for search
- Use `users.messages.get` with `format=full` to get body
- HTML body is in `payload.parts` - may need to decode base64
- Handle multipart messages (text/html vs text/plain)

### Link Extraction Error Handling
- When LLM call fails or returns unparseable response:
  - Log full error details for debugging
  - Set `extractionError: true` on email
  - Continue processing other emails (don't fail entire batch)
- UI shows these emails with warning icon
- User can manually open in Gmail and process outside the app
- Future enhancement: "Retry extraction" button

### Raindrop
- Rate limit: 120 requests/minute (not a concern for manual use)
- If save fails, show error toast but don't block other actions
- Store `raindropId` for potential future features (delete, update)

### Error Handling
- Gmail token expired → show "Reconnect Google" prompt on settings page
- Network errors → show toast/banner, allow retry
- LLM errors → flag email, surface in UI, allow manual handling

### Mobile Considerations
- Keep UI simple enough to triage links from phone
- Large tap targets for Save/Discard buttons in Focus View
- Consider swipe gestures in future version (left = discard, right = save)

### Performance
- Paginate email list if it grows large
- Consider virtual scrolling for very long link lists
- Debounce rapid keyboard actions

---

## Future Enhancements (Out of Scope for V1)

- AI agent that auto-suggests links based on past saves
- RAG similarity matching against saved Raindrop links
- Link preview/summary using page content parsing
- Resolve tracking redirects to final URLs
- Multiple Raindrop collections (pick when saving)
- Tags for saved links
- "Retry extraction" for failed emails
- Swipe gestures on mobile
- Browser extension for quick save
- Email notifications for new high-priority links
