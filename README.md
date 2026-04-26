# LeadSyncPro v2
Offline-first CRM for solo B2C EdTech sales operators (Avodha)

## Stack
- React + Vite
- Dexie.js (IndexedDB, offline-first, no fake seed leads)
- Zustand (state management)
- Recharts (analytics)
- Papaparse (CSV import)

## Run locally
```bash
npm install
npm run dev      # localhost:5173
npm run build    # production → dist/
```

## Deploy to Vercel
```bash
npx vercel --prod
```
Or drag the `dist/` folder to vercel.com/new.

## Features (v2)
- **Add Lead** — slide-in drawer with full validation
- **Edit Lead** — inline edit mode in detail panel
- **Delete Lead** — with confirmation, cascades to call logs
- **CSV Import** — drag-drop upload, preview table, bulk Dexie write (max 500 rows)
- **WhatsApp templates** — 3 pre-filled message templates with lead name/course substitution
- **Today view** — overdue + today follow-ups with red badge on nav
- **Analytics empty states** — proper prompts when no call data exists
- **Pitch cues in DB** — stored in pitchCues table, editable at runtime
- **Live call sidebar** — timer, milestones, objection tags, pitch cues
- **Forced post-call modal** — validation, ghost lead nudge
- **No demo leads** — clean start, only structure data seeded

## Clearing data
Open DevTools → Application → IndexedDB → LeadSyncPro → Delete database → Refresh
