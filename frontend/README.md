# Frontend

The page where you upload a `.xer` file and see its results. Vite, React and TypeScript.

![Dashboard](dashboard.png)

**What it shows** after an upload:

- **Headline numbers:** activities checked, checks over the limit, broken rows.
- **DCMA checks:** one bar per rule, with DCMA's limit marked. Click a rule to list its activities.
- **Flagged activities:** the activity IDs behind the selected rule.
- **Summary:** the short points, and who wrote them.
- **The file:** broken rows and notes, with line numbers.
- **Recent uploads:** every saved upload, newest first. Click one to open it again; a failed one shows why.

## Run it

```
npm install
npm run dev       # http://localhost:5173
```

The page sends `/api` calls to the backend at http://localhost:8000. Start it first, from `backend/`, with `uvicorn main:app --reload`. To use another address, set `API_URL`.

| Command | What it does |
|---|---|
| `npm test` | Runs the tests. The backend is faked, so it doesn't need to run |
| `npm run lint` | Checks the code with oxlint |
| `npm run build` | Builds the app into `dist/` |

## Files

| File | Its one job |
|---|---|
| `src/App.tsx` | The page: the upload button, then the dashboard or the error |
| `src/api.ts` | Uploads a file, lists saved uploads, opens one; turns errors into plain messages |
| `src/types.ts` | The shape of the backend's answer |
| `src/components/Dashboard.tsx` | Lays out one file's results |
| `src/components/StatTiles.tsx` | The headline numbers |
| `src/components/RuleMeters.tsx` | One bar per DCMA rule, with its limit |
| `src/components/FlaggedActivities.tsx` | The activity IDs behind one rule |
| `src/components/Summary.tsx` | The summary and who wrote it |
| `src/components/FileIssues.tsx` | Broken rows and notes |
| `src/components/RecentUploads.tsx` | The saved uploads, newest first |
| `nginx.conf` | In Docker: serves the app and passes `/api` to the backend |
