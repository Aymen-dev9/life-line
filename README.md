# Care Platform

Arabic-first digital healthcare platform for home care, booking, clinical case management, provider operations, laboratory, pharmacy, medications, and follow-up.

The first implemented milestone is a complete Home Nursing journey across patient, dispatcher, provider, and patient timeline experiences. Development mode uses explicit local adapters; production data is designed for PostgreSQL and private object storage.

## Start locally

1. Install Node.js 24 and run `npm install`.
2. Copy `.env.example` to `.env.local` and replace secrets.
3. Run `npm run dev`, then open `http://localhost:3000`.
4. Run `npm run check` before committing.

No external credentials are needed for the development journey. Mock SMS, maps, push, WhatsApp, payment, video, and storage adapters are visibly marked and never presented as live integrations.

## Architecture

The initial product is a responsive installable PWA using a TypeScript modular monolith. Domain modules are independent from Next.js and vendor SDKs. Route handlers expose versioned APIs for future Expo clients. PostgreSQL is the system of record; Redis/BullMQ and S3-compatible private storage are production dependencies.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DECISIONS.md](docs/DECISIONS.md), and [docs/PROGRESS.md](docs/PROGRESS.md).

