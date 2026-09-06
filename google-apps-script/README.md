# Contact form Google Sheet setup

The public form sends messages to the existing Cloudflare Worker. The Worker forwards validated messages to a protected Google Apps Script web app, which writes them to a private `ContactMessages` tab. The Apps Script creates the tab and header row on the first successful submission.

## 1. Add the Apps Script

1. Open the Google Sheet that should receive messages.
2. Select **Extensions → Apps Script**.
3. Replace the editor contents with `ContactForm.gs` from this folder and save it.
4. Open **Project Settings → Script properties** and add:
   - `GOOGLE_SHEET_ID`: the ID between `/d/` and `/edit` in the Sheet URL.
   - `CONTACT_WEBHOOK_SECRET`: a long, random value used only by Apps Script and Cloudflare.

## 2. Deploy the script

1. Select **Deploy → New deployment**.
2. Choose **Web app**.
3. Set **Execute as** to **Me**.
4. Set **Who has access** to **Anyone**.
5. Deploy, authorize access to the Sheet, and copy the URL ending in `/exec`.

Use a production `/exec` URL. The `/dev` test URL only works for accounts with edit access to the script.

## 3. Add Cloudflare secrets

From the repository root, run these commands and paste each value when Wrangler prompts:

```sh
npx wrangler secret put CONTACT_SHEET_WEBHOOK_URL
npx wrangler secret put CONTACT_WEBHOOK_SECRET
```

For `CONTACT_SHEET_WEBHOOK_URL`, paste the `/exec` URL. For `CONTACT_WEBHOOK_SECRET`, paste the exact same random value saved in Apps Script properties. Do not add either value to `wrangler.toml` or commit a `.dev.vars` file.

Rebuild and deploy the Worker after adding the secrets:

```sh
npm run build
npx wrangler deploy
```

Submit a test message from the deployed Contact page. The new row should appear in the `ContactMessages` tab with a timestamp and `New` status.
