# Save It - Newsletter Link Manager

A personal app to extract and triage links from newsletter emails.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui
- **Backend:** Convex (database + serverless functions)
- **Error Handling:** Effect-TS
- **Testing:** Vitest (unit), Playwright (E2E), convex-test (backend)
- **Linting:** Biome via Ultracite preset

## Dev Commands

- `pnpm dev` - Start dev server
- `pnpm lint` - Run Biome linter
- `pnpm typecheck` - TypeScript check
- `pnpm test` - Run unit tests

---

## Project Patterns

### Effect-TS

Custom errors extend `Data.TaggedError()`:
```typescript
export class GmailTokenExpired extends Data.TaggedError("GmailTokenExpired")<{
  message: string;
}> {}
```

Run Effects in Convex actions with `Effect.runPromise()`.

### API Layer Organization

Keep external API calls centralized:
- All Gmail HTTP calls in `lib/gmail.ts`
- All Raindrop HTTP calls in `lib/raindrop.ts`
- Type guards (like `isRecord()`) for parsing untrusted API responses

---

## Testing

- **One behavior per test** - don't test multiple unrelated things in a single test
- After any code change, run `pnpm lint`, `pnpm typecheck`, and `pnpm test`
- For Convex functions, use official Convex testing utilities (`convex-test`), not hand-rolled mocks
- Never use dynamic imports (`await import(...)`) in tests or app code - use static imports
- Test behavior, not just rendering:
  - Assert user-visible outcomes (navigation, error messages, state changes, side effects)
- Do TDD for new work: write a failing test first, run it, then implement to make it pass

---

## Code Style

Biome handles formatting and most lint rules automatically. Run `pnpm lint` to fix issues.
