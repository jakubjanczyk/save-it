# Newsletter Link Manager

Infrastructure scaffold only (no app features implemented yet). See `newsletter-link-manager-plan.md` for the V1 implementation plan.

## Getting Started

Install deps and start the dev server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tooling

- Lint: `pnpm lint` (Biome config extends Ultracite)
- Format: `pnpm format`
- Unit tests: `pnpm test`
- E2E tests: `pnpm e2e` (requires `pnpm dlx playwright install`)
- Convex dev: `pnpm convex:dev` (requires Convex login / setup)

## Env

Copy `.env.example` to `.env.local` and fill values as needed.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
