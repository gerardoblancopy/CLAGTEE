# CLAGTEE 2026 - Website + CMS

Landing page and CMS for the CLAGTEE 2026 conference. The CMS handles paper submissions,
reviews, and chair management. The API lives in `api/` (Vercel Serverless Functions).

## Tech
- Vite + React
- Vercel Serverless Functions (`api/`)
- Firestore + Google Cloud Storage

## Local development
**Prerequisites:** Node.js, Vercel CLI (`npm i -g vercel`)

1. Install deps:
   `npm install`
2. Create `.env.local` with the variables below.
3. Run API locally (serverless functions):
   `vercel dev --listen 3002`
4. Run frontend (Vite):
   `npm run dev`
5. Open `http://localhost:3000` and enter the CMS from "Gestion de Papers".

## Environment variables
Required for CMS + file uploads:
- `GCS_PROJECT_ID`
- `GCS_CLIENT_EMAIL`
- `GCS_PRIVATE_KEY`
- `GCS_BUCKET`

Optional:
- `GCS_PUBLIC_BASE_URL` (public file URL base)
- `GEMINI_API_KEY` (only if used)

Firestore reads from `GCS_*` or `GCP_*` variables, so you can set either set.

## Build / Preview
- `npm run build`
- `npm run preview`

## Deploy
Deploy to Vercel. Configure the environment variables above for Preview/Production.
Add your custom domain in Vercel and update DNS records per Vercel instructions.

