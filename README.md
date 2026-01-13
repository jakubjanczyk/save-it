# Save It

Your personal newsletter link manager. Fetch emails from your favorite newsletters, let AI extract the interesting links, and quickly triage them to save to Raindrop or discard.

> **Status:** Active Development - core features working, more AI features coming soon!

## Why Save It?

If you subscribe to newsletters, you know the struggle: interesting links pile up in your inbox faster than you can read them. Save It helps you:

- **Extract links automatically** using AI (Gemini) - no more manual copy-pasting
- **Triage fast** with a Tinder-style "Match" mode - swipe right to save, left to discard
- **Stay organized** by sending links straight to your Raindrop bookmarks
- **Work anywhere** with a mobile-friendly interface and keyboard shortcuts for power users

## Features

### Match Mode (Focus View)

The flagship feature! Review links one at a time with big, easy-to-tap Save/Discard buttons. Perfect for quickly processing your newsletter backlog on your phone or with keyboard shortcuts on desktop.

### AI-Powered Link Extraction

Save It intelligently extracts only the content links you care about - articles, videos, tools - while filtering out unsubscribe links, social profiles, and tracking URLs.

Use your preferred LLM provider, defaulting to Gemini Flash 2.5.

For Substack newsletters, we use pattern matching for instant extraction without any AI calls.

### Keyboard Shortcuts

Power through your links with vim-style navigation:
- `S` or `→` - Save link
- `D` or `←` - Discard link
- `O` or `Enter` - Open link in new tab
- `J/K` or `↓/↑` - Navigate links
- `?` - Show all shortcuts

### Mobile Ready

Fully responsive design works great on phones and tablets. Triage your links from anywhere.

### Background Sync

Set up scheduled syncing to automatically fetch new newsletter emails at your preferred time.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **UI Components:** shadcn/ui
- **Backend:** Convex (real-time database & serverless functions), EffectTS
- **AI:** Google Gemini via AI SDK (default)
- **Integrations:** Gmail API, Raindrop API

## Quick Start

```bash
# Clone the repo
git clone https://github.com/jakubjanczyk/save-it.git
cd save-it

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Start Convex (in a separate terminal)
pnpm convex:dev

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and you're off!

But wait - you'll need to set up your OAuth credentials, and Convex first. See the detailed setup below.

## Detailed Setup

### Prerequisites

- Node.js 20+
- pnpm
- A Google account (for Gmail API)
- A Raindrop account (for saving bookmarks)
- A Google Cloud project (for Gemini API), or other LLM provider of your choice

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
# App Authentication
APP_PASSWORD=your-secure-password-here
JWT_SECRET=generate-a-random-32-char-string

# Google OAuth (Gmail access)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Raindrop OAuth (bookmark saving)
RAINDROP_CLIENT_ID=
RAINDROP_CLIENT_SECRET=
RAINDROP_REDIRECT_URI=http://localhost:3000/api/auth/raindrop/callback

# Google AI (Gemini for link extraction)
GOOGLE_GENERATIVE_AI_API_KEY=
LLM_MODEL=gemini-3-flash  # optional, this is the default

# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
```

### 2. Google Cloud Setup (Gmail API)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Gmail API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in app name, user support email, developer contact
   - Add scopes: `gmail.readonly`, `gmail.modify`
   - Add your email as a test user (required for development)
5. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
   - Copy the Client ID and Client Secret to your `.env.local`

### 3. Google AI Setup (Gemini)

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key" and create a new key
3. Copy the API key to `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`

### 4. Raindrop Setup

1. Go to [Raindrop.io Settings > Integrations](https://app.raindrop.io/settings/integrations)
2. Click "Create new app"
3. Fill in:
   - Name: "Save It" (or whatever you like)
   - Redirect URI: `http://localhost:3000/api/auth/raindrop/callback`
4. Copy the Client ID and Client Secret to your `.env.local`

### 5. Convex Setup

Convex is the backend-as-a-service that powers Save It's database, serverless functions, and real-time sync.

**First-time setup:**

1. Create a free account at [convex.dev](https://convex.dev)
2. Run the Convex dev server:
   ```bash
   pnpm convex:dev
   ```
3. The CLI will open your browser to authenticate - log in with your Convex account
4. When prompted, select "Create a new project" and give it a name (e.g., "save-it")
5. The CLI automatically creates `.env.local` entries for:
   - `CONVEX_DEPLOYMENT` - your deployment identifier
   - `NEXT_PUBLIC_CONVEX_URL` - the URL for your Convex backend

**Setting up environment variables in Convex:**

Some features (like Gmail sync and Raindrop saving) run as Convex actions that need access to your API keys. You'll need to add these in the Convex dashboard:

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Navigate to "Settings" > "Environment Variables"
4. Add the following variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `RAINDROP_CLIENT_ID`
   - `RAINDROP_CLIENT_SECRET`

**Note:** Keep `pnpm convex:dev` running in a separate terminal while developing - it syncs your schema and functions to the cloud in real-time.

### 6. Start the App

```bash
# Terminal 1: Convex backend
pnpm convex:dev

# Terminal 2: Next.js frontend
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000), log in with your `APP_PASSWORD`, and you're ready to go!

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local`
4. Update redirect URIs in Google Cloud and Raindrop to use your production domain
5. Deploy!

### Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repo
3. Add environment variables
4. Railway will auto-detect Next.js and deploy

## Development

### Commands

```bash
pnpm dev          # Start dev server with Turbopack
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run Biome linter
pnpm format       # Format code with Biome
pnpm typecheck    # TypeScript type checking
pnpm test         # Run unit tests (Vitest)
pnpm convex:dev   # Start Convex development server
```

### Running Tests

```bash
# Run all unit tests
pnpm test

# Watch mode for development
pnpm test:watch
```

### Project Structure

```
app/                  # Next.js App Router pages
  (app)/              # Protected routes (inbox, match, settings, etc.)
  api/auth/           # OAuth callback routes
  login/              # Login page
components/           # React components
  ui/                 # shadcn/ui components
convex/               # Convex backend (schema, functions, crons)
lib/                  # Utilities (Gmail, Raindrop, AI, auth)
hooks/                # React hooks
e2e/                  # Playwright E2E tests
```

## Roadmap

Here's what's coming next:

- **AI-powered suggestions** - Auto-suggest save/discard based on your history
- **RAG similarity matching** - Find links similar to ones you've saved before and auto save or discard
- **Link previews** - See article summaries before deciding
- **Bookmark manager extensions** - Choose which Raindrop collection to save to, add tags, or even use different Bookmark manager
- **More newsletter patterns** - Faster extraction for Beehiiv, ConvertKit, etc.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Issues & Feedback

Found a bug or have a feature request? [Open an issue on GitHub](https://github.com/jakubjanczyk/save-it/issues).
