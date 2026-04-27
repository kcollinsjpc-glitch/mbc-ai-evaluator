# MBC AI Tool Evaluation System

A tool for staff at Moreton Bay College to evaluate AI tools against safety, ethical, and effectiveness criteria.

## Storage note

This version uses browser localStorage. Each visitor sees only their own evaluations. For a shared library across all staff, the storage layer needs to be swapped for a real database (Supabase, Firebase, or similar).

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Admin password

The current admin password is set in `src/App.jsx` near the top of the file (search for `ADMIN_PASSWORD`).
