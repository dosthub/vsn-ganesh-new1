# VSN Community Website

The complete Next.js project is in [website](./website/README.md).

From this directory:

```sh
npm install
npm run dev
```

Open http://localhost:3000. The website includes the three supplied celebration photos. Community and financial records are clearly labeled sample data; configure real details before public use.

See [website/README.md](./website/README.md) for pages, testing, deployment and the live Google Sheets feed.

For Cloudflare, build the static site and deploy the Worker so `/api/finances` can refresh donations and expenses:

```sh
npm run build
npx wrangler deploy
```

For Cloudflare Workers Builds, keep the root directory at the repository root, use `npm run build` as the build command, and use `npx wrangler deploy` as the deploy command. The root npm scripts install and build the app in `website/`, while Wrangler reads `worker.js`, `wrangler.toml` and the generated `website/out/` assets from their existing locations.

Share the Google Sheet as **Anyone with the link can view**, or the site will keep the last saved snapshot.
