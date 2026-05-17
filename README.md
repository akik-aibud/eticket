# BD Railway - Seat Availability

Personal dashboard to check Bangladesh Railway train seat availability across all classes at once.

## Features

- Login with your eticket.railway.gov.bd credentials
- Search trains between any two stations
- See seat availability for ALL classes (S_CHAIR, SHOVAN, SNIGDHA, AC_S, AC_B, etc.) in one view
- Fare and VAT breakdown per class
- Online/offline seat counts
- Station autocomplete (240+ stations)
- Session persistence via localStorage

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

Push to GitHub and import on Vercel - no env vars needed.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Bangladesh Railway Shohoz API
