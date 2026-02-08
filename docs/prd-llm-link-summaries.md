# PRD: Automatic Link Summaries (Gemini)

Date: 2026-02-08  
Owner: TBD  
Status: Draft

## 1. Executive Summary

- **Problem Statement**: Saved links often lack enough context (true title, what it’s about, whether it’s worth reading, and credibility signals), forcing the user to open pages to decide.
- **Proposed Solution**: After a link is saved and its page content is successfully fetched and extracted, call Gemini to generate structured outputs: a short TL;DR plus “worth reading” recommendation with reasons and a credibility/factuality assessment; and (for article-like pages) a longer, information-preserving summary. Show this on the link card via a `Summary` button that opens a modal with clear `pending / failed / retry` states.
- **Success Criteria**:
  - **Completion**: ≥ 95% of saved links reach `summaryStatus="success"` within 90 seconds of saving (excluding paywalls/unfetchable URLs).
  - **Reliability**: ≥ 99% of LLM responses validate against a strict JSON schema (no malformed output stored).
  - **Cost**: Median model cost per summarized link ≤ $0.02 (configurable via `LLM_MODEL`).
  - **UX clarity**: Every saved link shows a deterministic state (`pending|ready|failed`) and supports one-click retry.
  - **Quality (manual rubric)**: On a sampled set, ≥ 80% of summaries are rated “useful” and include the 3–5 key takeaways without sponsor/nav noise.

## 2. User Experience & Functionality

### User Personas

- **Primary**: A single power user triaging many newsletter links quickly on mobile/desktop.

### User Stories

- As a user, I want to open a `Summary` modal for a saved link so I can decide if it’s worth reading without opening the page.
- As a user, I want both a short TL;DR and a longer summary so I can either skim or get the full gist.
- As a user, I want the real page title captured so my saved list is readable and searchable.
- As a user, I want visible failures and a `Retry` action so transient fetch/LLM issues don’t block me.
- As a user, I want non-article links (e.g., GitHub repos) to receive a short description only (no long article-style summary).

### Acceptance Criteria

#### Triggering & States

- Summarization is triggered **only after** page fetch + extraction succeed.
- Each saved link has a summary state machine:
  - `summaryStatus`: `pending` → `running` → (`success` | `failed`)
- The link card shows a `Summary` button and a state indicator:
  - **Pending/Running**: “Generating…”
  - **Failed**: “Failed” + `Retry`
  - **Success**: `Summary` opens modal

#### Modal Content

For **article-like pages** (`contentKind="article"`), the modal shows:

- **Title**: extracted page title (and optionally the “source title” currently stored from extraction/newsletter as secondary text)
- **TL;DR**: 2–4 sentences
- **Worth reading**: `yes|maybe|no` + short explanation (1–3 concrete reasons)
- **Credibility/Factuality**: `high|medium|low|unknown` + explanation based only on signals in the extracted content (not external verification)
- **Long summary**: structured, coverage-focused summary that preserves key points and conclusions (does not require reading the full article)

For **GitHub repos** (`contentKind="github"`), the modal shows:

- **TL;DR**: short description of what it is about (purpose, who it’s for, notable features)
- **Worth reading** and **Credibility/Factuality** still present (but may be `unknown` if not inferable)
- **No long summary** (field omitted)

#### Noise & Safety

- Summaries must be based only on extracted “main content” (exclude nav/ads/sponsors/comments when possible).
- If extraction confidence is below a threshold, do **not** call the LLM; instead set `summaryStatus="failed"` with a user-visible reason such as “Couldn’t confidently extract main content”.
- LLM prompt must treat page text as untrusted and ignore instructions inside it (prompt injection mitigation).

### Non-Goals

- Do not store full article HTML/markdown in Convex (store only LLM outputs + minimal metadata).
- No personalized “relevance to my interests” ranking in v1.
- No automatic push of summaries back into Raindrop in v1.
- No “fact checking against the web” in v1 (credibility is a best-effort assessment from content signals only).

## 3. AI System Requirements

### Tool Requirements

- **Model/provider**: Gemini via the existing AI SDK integration (same as current LLM calls), configured by `LLM_MODEL`.
- **Fetcher**: server-side HTML fetch with timeouts, redirect handling, content-type checks, and size limits.
- **Extractor**:
  - Remove noise elements (scripts/styles/nav/footer/aside/ads, etc.)
  - Extract “main content” into compact text/markdown (token-efficient)
  - Produce `extractionConfidence` and `contentKind`
- **Title extraction**:
  - Collect candidates from `h1`, `og:title`, `twitter:title`, `<title>`
  - Select one best title + record the source; keep the original stored title as “source title”

### Output Schema (Stored)

Minimum stored summary fields on the link (exact shape to be finalized in implementation):

- `summaryStatus`: `pending | running | success | failed`
- `contentKind`: `article | github | other` (at least `article|github` for v1)
- `extractedTitle`: string (optional)
- `extractedTitleSource`: `h1 | og | twitter | title | llm` (optional)
- `tldr`: string
- `worthReading`: `yes | maybe | no`
- `worthReadingReason`: string
- `credibility`: `high | medium | low | unknown`
- `credibilityReason`: string
- `longSummary`: string (optional; omitted for `github`)
- `model`: string (optional)
- `promptVersion`: string
- `updatedAt`: number (optional)
- `error`: `{ stage: "fetch"|"extract"|"llm"|"parse"; message: string }` (optional)

### Evaluation Strategy

- Build a small evaluation set (30–50 links) covering:
  - clean articles, noisy pages, paywalls, and GitHub repos
- Measure:
  - **Schema validity**: parse + validation pass rate
  - **Noise leakage**: sponsor/nav content appearing in TL;DR/summary
  - **Coverage**: summary includes the most important points (human rubric)
  - **Faithfulness**: summary claims supported by provided extracted content (human spot-check)
  - **Latency**: time from save → success

## 4. Technical Specifications

### Architecture Overview

When a user saves a link:

1. Existing flow updates link status to `saved` (and performs Raindrop sync when enabled).
2. After save succeeds, schedule a new internal job to summarize:
   - Set `summaryStatus="pending"` (or `running`) immediately.
   - Schedule internal action: `links:generateSummary({ linkId })`.
3. In `generateSummary`:
   - Fetch HTML
   - Classify `contentKind` (v1: `github` by hostname `github.com`; everything else defaults to `article`)
   - Extract main content + title candidates + confidence
   - If confidence low: mark failed
   - Else call Gemini with strict JSON-only instructions and a versioned prompt
   - Validate JSON response; patch link with stored outputs and `summaryStatus="success"`
   - On any error: patch `summaryStatus="failed"` with `error.stage` + message

### Integration Points

- **Convex**:
  - New internal action for summarization job.
  - New internal mutations to patch summary fields and state transitions.
  - Scheduler usage for async processing and retries.
- **Next.js UI**:
  - Link card: `Summary` button, state indicator, `Retry` action.
  - Modal: renders summary fields when present; shows helpful empty/failed messages.
- **AI SDK / Gemini**:
  - Reuse existing `createGeminiModel` and model config.

### Security & Privacy

- Do not persist fetched page body; store only generated summaries and metadata.
- Prompt injection hardening:
  - Delimit extracted content; instruct model to ignore any instructions contained in it.
  - Require JSON-only output; reject/mark failed if not valid JSON.
- Retry limits:
  - Cap retries per link (e.g., max 3 attempts) and record last error.

## 5. Risks & Roadmap

### Phased Rollout

- **MVP**
  - Article fetch + extraction → Gemini JSON outputs
  - Store outputs on `links`
  - UI modal + pending/failed/retry
  - GitHub detection: `hostname === "github.com"` → TL;DR-only mode
- **v1.1**
  - Improved extraction confidence scoring and clearer failure reasons
  - Better title selection heuristics; show both extracted + source title consistently
  - Expand “resource” detection (docs sites, PDFs)
- **v2.0**
  - User feedback (thumbs up/down) to measure usefulness
  - Prompt/version A/B testing and quality regression checks
  - Optional lightweight citations (quotes/snippets) to improve trust

### Technical Risks

- **Extraction quality**: dynamic sites and paywalls cause low-confidence extraction; mitigate with clear UX and retry.
- **Credibility output overreach**: avoid “truth claims”; require `unknown` when signals are insufficient.
- **Latency and cost**: enforce timeouts, input size limits, and model configuration.
- **Prompt injection**: page text may contain adversarial instructions; enforce strict schema output and ignore-instructions policy.

### Open Questions

- What is the target length/shape for `longSummary` (e.g., 8–12 bullets vs 3–5 short sections)?
- Title precedence rule: when `h1` conflicts with `<title>`/meta, should we prefer `h1`, or pick via heuristics (length, similarity, presence of site name)?
- Should `contentKind="other"` be treated as TL;DR-only like GitHub in v1?
