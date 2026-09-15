# Pooja request integration

The form is on `/ganesh-chaturthi/#pooja-request`. It submits member name, requested date, plot number and phone number through the Worker to tab ID `2009284977` in the supplied spreadsheet. A request does not reserve or confirm a date. Multiple requests for the same date are allowed for committee review.

## Connect Google Sheets

1. Create a **separate** Apps Script project at https://script.google.com (do not replace the existing contact script). Paste `PoojaRequests.gs` into the editor.
2. In Project Settings → Script properties, add `POOJA_WEBHOOK_SECRET` with a long random value.
3. Deploy as a Web app, executing as **Me**, with access **Anyone**. Authorize the script with an account that can edit the target sheet. Copy the production URL ending in `/exec`.
4. Add Worker secrets from the repository root:

```sh
npx wrangler secret put POOJA_SHEET_WEBHOOK_URL
npx wrangler secret put POOJA_WEBHOOK_SECRET
```

Paste the `/exec` URL for the first secret and the identical script secret for the second. Never commit secrets. No change to the spreadsheet’s sharing permissions is needed.

The script initializes an empty target tab with `Member name`, `Requested date`, `Received at`, `Status`, `Plot number`, `Phone number`. An existing four-column pooja layout is upgraded by appending the two new headers without changing existing rows. If the tab already contains different headers it refuses to write; reconcile the column layout first. Existing donations and expenses are untouched.

## Publish and verify

```sh
npm run build
npx wrangler deploy
```

Submit a clearly labeled test request using today’s date or later. Confirm that a row appears in the exact target tab with status `Requested`, and the form shows success only after saving. Update the Apps Script deployment version whenever changing its code.

The spreadsheet is publicly readable: names and requested dates may be visible to anyone with its link. The form collects a phone number for committee follow-up; this can be visible to people with access to the sheet. Review access before collecting member phone numbers. Before the two secrets and script deployment are configured, the endpoint returns 503 and the form reports failure.

## Localhost setup

Create `website/.env.local` (ignored by Git) with:

```dotenv
POOJA_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
POOJA_WEBHOOK_SECRET=YOUR_MATCHING_SCRIPT_SECRET
```

Use the real deployed URL and matching secret, then restart `npm run dev`. Cloudflare secrets are not automatically available to the local Next.js server. Redeploy the updated `PoojaRequests.gs` script before testing the added fields.
