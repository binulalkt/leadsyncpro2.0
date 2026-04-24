# LeadSyncPro
Offline-first CRM for solo B2C EdTech sales operators (Avodha)

## Stack
- React + Vite
- Dexie.js (IndexedDB, offline-first)
- Zustand (state management)
- Recharts (analytics charts)
- IBM Plex Mono/Sans (typography)

## Run locally
```bash
npm install
npm run dev
```

## Deploy to Vercel
```bash
npm install -g vercel
vercel --prod
```
Or connect your GitHub repo to vercel.com for auto-deploy on push.

## Features
- Lead list with priority routing (Enquiries first), real-time search, status/source filters
- Live call sidebar: manual timer, milestone checklist, objection tags, pitch cue card
- Forced post-call modal with validation and ghost lead detection
- Analytics dashboard: source conversion matrix, objection frequency, milestone gap, heatmap
- 100% offline — all data stored in IndexedDB via Dexie.js
