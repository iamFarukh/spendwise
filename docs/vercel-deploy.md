# Deploy SpendWise web to Vercel

Production URL: [spendwise-webapp.vercel.app](https://spendwise-webapp.vercel.app)

## Vercel project settings

| Setting | Value |
| ------- | ----- |
| Root Directory | `web` |
| Framework | Next.js (auto-detected) |
| Install Command | `cd .. && npm install` (see `web/vercel.json`) |
| Build Command | `npm run build` |

## Environment variables (Production + Preview)

Add every variable from `web/.env.example` in **Vercel → Project → Settings → Environment Variables**:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (optional)

Redeploy after changing env vars.

## Fix Google sign-in on Vercel (required)

Google login works on `localhost` but fails on Vercel until the deploy domain is allowlisted in Firebase.

### 1. Authorized domains (most common fix)

1. Open [Firebase Console](https://console.firebase.google.com) → project **expense-bb20b**
2. **Authentication** → **Settings** → **Authorized domains**
3. Click **Add domain**
4. Add: `spendwise-webapp.vercel.app`
5. If you use preview URLs, also add: `*.vercel.app` is **not** supported — add each preview hostname or use only production for auth testing

### 2. Enable Google provider

**Authentication** → **Sign-in method** → **Google** → Enable.

### 3. API key restrictions (if sign-in still fails)

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Open the **Browser key** used by Firebase (often named "Browser key (auto created by Firebase)")
3. Under **Application restrictions**:
   - Either set **None** (simplest for personal apps), or
   - **HTTP referrers** and add:
     - `http://localhost:*`
     - `https://spendwise-webapp.vercel.app/*`
     - `https://*.vercel.app/*` (for preview deploys)

### 4. Redeploy

Push to Git or run **Redeploy** in Vercel so env vars are baked into the client bundle.

## Verify

1. Open `/login` — you should **not** see "Firebase is not configured"
2. Click **Continue with Google** — popup opens and returns to `/dashboard`
3. If it fails, the error message now includes the Firebase error code (e.g. `auth/unauthorized-domain`)

## CLI (optional)

```bash
cd web
npx vercel login
npx vercel link
npx vercel env pull .env.local
npx vercel --prod
```
