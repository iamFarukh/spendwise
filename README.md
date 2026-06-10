# SpendWise — Your Personal Finance OS

A personal ledger for tracking where money comes from, moves, and is spent.

## Project structure

```
.
├── web/                 # Next.js web app (deploy this folder to Vercel)
├── packages/shared/     # Shared types and accounting logic
├── firebase/            # Firestore and Storage security rules
└── docs/                # Product and implementation docs
```

Mobile app (`mobile/`) will be added later, after the web dashboard is ready.

## Prerequisites

- Node.js 20+
- npm 10+
- Firebase project (Spark / free tier)

## Local setup

```bash
# Install all workspace dependencies
npm install

# Configure Firebase for the web app
cp web/.env.example web/.env.local
# Fill in values from Firebase Console → Project settings → Your apps

# Start the web app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel deployment

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Set **Root Directory** to `web`.
4. Add the same `NEXT_PUBLIC_FIREBASE_*` environment variables from `web/.env.local`.
5. Deploy.

Your app will be available at `https://<project-name>.vercel.app` — no custom domain required.

## Firebase setup

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Authentication** → Sign-in method → **Google** and **Email/Password**.
3. Under **Authentication → Settings → Authorized domains**, ensure `localhost` is listed (Vercel adds its domain automatically on deploy).
4. Create a **Firestore** database.
5. Register a **Web app** and copy config into `web/.env.local`.
6. Deploy security rules:

```bash
firebase deploy --only firestore:rules,storage
```

## Docs

- [Product spec](./docs/projectPlan.md)
- [Implementation plan](./docs/implementationPlan.md)
- [Tech stack](./docs/techStack.md)

## Current status

**Phase 0 — Foundation**

- [x] npm workspaces monorepo
- [x] Next.js web app in `web/`
- [x] Shared types package
- [x] Firebase client wiring
- [x] Firestore security rules template
- [x] Firebase project connected
- [x] Auth UI (Google + email)
- [ ] Vercel deployment
