# Chittoor District — AP Resurvey Monitoring & Analytics

An officer-focused monitoring application for village-level AP Resurvey progress. The dashboard intentionally starts without demo data: until sources are connected it displays **Not available** rather than fabricated counts.

## Run locally

```powershell
node server.js
```

Open `http://localhost:4173`.

## Google Sheets connection

1. In **Data Sources**, add the spreadsheet ID, tab, purpose, mappings and sync direction.
2. Provide a short-lived OAuth access token to the backend environment before starting it:

```powershell
$env:GOOGLE_SHEETS_ACCESS_TOKEN = "your-access-token"
node server.js
```

The token is never exposed to the browser. `READ ONLY` sources are read with the Google Sheets API. `TWO WAY` updates write only mapped, permitted cells back to the configured source row. For production, inject the token via a secret manager and replace the short-lived-token provider with your district OAuth/service-account integration.

The backend preserves source row traceability, standardizes approved Mandal aliases, keeps the village master universe even when progress is missing, detects workflow conflicts, derives metrics from stored source data, writes audit events, and continues with last synchronized data if an individual source fails.

## Deployment notes

- Persist `data/store.json` in a managed database/object store before multi-instance deployment.
- Run `POST /api/sync` from a protected scheduler every 15 minutes (or configured source cadence).
- Protect application routes with the district SSO/role provider; the API has role-ready authorization boundaries but no identity provider is bundled.
- Use HTTPS and a secret manager for all token handling.
